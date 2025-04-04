import time
from typing import Dict, List, Optional
import threading
import logging
from datetime import datetime, timedelta
import pandas as pd
from alpaca.trading.client import TradingClient
from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient
from alpaca.trading.requests import GetAssetsRequest, MarketOrderRequest
from alpaca.trading.enums import AssetClass, OrderSide, TimeInForce
from backend.strategies.supertrend_strategy import SupertrendStrategy
from backend.strategies.macd_strategy import MACDStrategy
from backend.utils.market_data import get_historical_data, get_market_data
from backend.utils.portfolio import calculate_position_size
from backend.models.database import get_session
from backend.models.settings_model import Settings
from backend.models.portfolio_history import PortfolioHistory
from backend.models.trade import Trade
from backend.models.market_data import MarketData
from sqlalchemy import and_
import os

# Strategy type mapping
STRATEGY_TYPES = {
    'supertrend': SupertrendStrategy,
    'macd': MACDStrategy
}

class TradingEngine:
    def __init__(self):
        """Initialize the trading engine."""
        self.logger = logging.getLogger(__name__)
        self.trading_client = None
        self.data_client = None
        self.strategies = {}  # symbol -> list of strategies
        self.running = False
        self.trading_thread = None
        self.settings = None
        
        # Load settings from database
        try:
            session = get_session()
            self.settings = session.query(Settings).first()
            if self.settings:
                self.initialize_clients()
        except Exception as e:
            self.logger.error(f"Error initializing trading engine: {str(e)}")
        finally:
            session.close()
        
        # Trading settings
        if self.settings:
            self.max_position_size = self.settings.max_position_size
            self.risk_per_trade = self.settings.risk_per_trade
            self.stop_loss_percent = self.settings.stop_loss_percent
            self.take_profit_percent = self.settings.take_profit_percent
            self.max_open_trades = self.settings.max_open_trades
            self.trailing_stop_percent = self.settings.trailing_stop_percent
        else:
            # Default values if settings not found
            self.max_position_size = 20.0
            self.risk_per_trade = 2.0
            self.stop_loss_percent = 2.0
            self.take_profit_percent = 4.0
            self.max_open_trades = 3
            self.trailing_stop_percent = 1.0

    def initialize_clients(self):
        """Initialize trading and data clients with API credentials."""
        try:
            if not self.settings:
                return False
                
            api_key = self.settings.get_api_key()
            api_secret = self.settings.get_api_secret()
            
            if not api_key or not api_secret:
                return False
            
            # Check if simulation mode is forced via environment variable
            simulation_mode = os.getenv('SIMULATION_MODE', 'false').lower() == 'true'
            
            # Initialize data client first since we might only have data permissions
            self.data_client = CryptoHistoricalDataClient(api_key, api_secret)
            self.logger.info("Data client initialized successfully")
            
            # Try to initialize trading client, but skip if simulation mode is forced
            if not simulation_mode:
                try:
                    self.trading_client = TradingClient(api_key, api_secret, paper=self.settings.is_paper_trading)
                    self.logger.info("Trading client initialized successfully")
                except Exception as trading_error:
                    self.logger.warning(f"Could not initialize trading client: {str(trading_error)}")
                    self.logger.warning("Running in data-only mode, trading functions will be simulated")
                    self.trading_client = None
            else:
                self.logger.info("Simulation mode is enabled. Trading functions will be simulated.")
                self.trading_client = None
                
                # Initialize simulated positions if in simulation mode
                self._simulated_positions = {}
                
                # Set simulated portfolio value
                self.simulated_portfolio_value = float(os.getenv('SIMULATED_PORTFOLIO', '10000.0'))
                self.logger.info(f"Initialized simulation with portfolio value ${self.simulated_portfolio_value:.2f}")
            
            # Return true if at least data client is available
            return self.data_client is not None
                
        except Exception as e:
            self.logger.error(f"Error initializing clients: {str(e)}")
            return False

    def reload_settings(self):
        """Reload settings and reinitialize clients if needed."""
        old_settings = self.settings
        self.settings = self._load_settings()
        
        # Check if API credentials or trading mode changed
        old_creds = old_settings.get_api_credentials()
        new_creds = self.settings.get_api_credentials()
        
        if (old_creds['api_key'] != new_creds['api_key'] or
            old_creds['api_secret'] != new_creds['api_secret'] or
            old_settings.is_paper_trading != self.settings.is_paper_trading):
            self.initialize_clients()
        
        # Update trading settings
        self.max_position_size = self.settings.max_position_size
        self.risk_per_trade = self.settings.risk_per_trade
        self.stop_loss_percent = self.settings.stop_loss_percent
        self.take_profit_percent = self.settings.take_profit_percent
        self.max_open_trades = self.settings.max_open_trades
        self.trailing_stop_percent = self.settings.trailing_stop_percent

    def is_ready(self) -> bool:
        """Check if trading engine is ready with valid API credentials."""
        # Modified to consider data-only mode as ready
        return self.data_client is not None

    def add_strategy(self, symbol: str, strategy_type: str, parameters: Dict = None) -> bool:
        """Add a new trading strategy."""
        try:
            if strategy_type not in STRATEGY_TYPES:
                raise ValueError(f"Invalid strategy type: {strategy_type}")
            
            # Extract parameters or use empty dict
            params = parameters or {}
            
            # Extract strategy name if provided, otherwise generate default
            strategy_name = params.pop('name', None)
            if not strategy_name:
                # Generate a simple default name if none provided
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                strategy_name = f"{strategy_type.capitalize()} Strategy - {symbol} {timestamp}"
            
            # Extract database ID if provided
            db_id = params.pop('db_id', None)
            
            # Extract capital and risk parameters if provided
            capital = params.pop('capital', 10000.0)  # Default capital
            risk_per_trade = params.pop('risk_per_trade', 1.0)  # Default risk 1%
            
            # Log strategy creation
            self.logger.info(f"Creating new strategy: {strategy_name} ({strategy_type}) for {symbol}")
            
            # Create strategy instance
            strategy_class = STRATEGY_TYPES[strategy_type]
            strategy = strategy_class(
                symbol=symbol,
                trading_client=self.trading_client,
                data_client=self.data_client,
                parameters=params
            )
            
            # Set additional properties
            strategy.name = strategy_name
            strategy.capital = float(capital)
            strategy.risk_per_trade = float(risk_per_trade) / 100.0  # Convert percentage to decimal
            strategy.id = db_id if db_id is not None else self._generate_strategy_id()
            
            # Initialize the strategy with the specified capital and risk
            try:
                strategy.initialize(capital=float(capital), risk_per_trade=float(risk_per_trade) / 100.0)
            except Exception as e:
                self.logger.warning(f"Error initializing strategy {strategy_name}: {str(e)}")
                # Continue anyway, the strategy will use defaults
            
            # Add to strategies dictionary
            if symbol not in self.strategies:
                self.strategies[symbol] = []
            
            self.strategies[symbol].append(strategy)
            self.logger.info(f"Strategy {strategy_name} added successfully with ID: {strategy.id}")
            return True
        except Exception as e:
            self.logger.error(f"Error adding strategy: {str(e)}")
            return False

    def remove_strategy(self, symbol: str, strategy_type: str):
        """Remove a strategy for a symbol"""
        if symbol in self.strategies:
            self.strategies[symbol] = [
                s for s in self.strategies[symbol] 
                if not isinstance(s, eval(f"{strategy_type}Strategy"))
            ]
            if not self.strategies[symbol]:
                del self.strategies[symbol]

    def get_tradable_crypto(self) -> List[str]:
        """Get list of tradable cryptocurrency symbols."""
        # Default popular crypto pairs
        default_symbols = [
            'BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD',  # Popular Layer 1
            'USDT/USD', 'USDC/USD', 'DAI/USD', 'BUSD/USD',  # Stablecoins
            'UNI/USD', 'AAVE/USD', 'MKR/USD', 'SNX/USD', 'COMP/USD',  # DeFi
            'LINK/USD', 'DOT/USD', 'ADA/USD', 'ATOM/USD', 'ALGO/USD'  # Other Major
        ]
        
        try:
            if not self.is_ready():
                self.logger.info("Using default symbols list (limited mode)")
                return default_symbols
                
            assets = self.trading_client.get_all_assets()
            crypto_assets = [asset for asset in assets if asset.status == 'active' and asset.asset_class == 'crypto']
            api_symbols = [asset.symbol for asset in crypto_assets]
            
            # Combine API symbols with defaults, removing duplicates
            all_symbols = list(set(api_symbols + default_symbols))
            return sorted(all_symbols)
            
        except Exception as e:
            self.logger.error(f"Error getting tradable crypto: {str(e)}")
            return default_symbols

    def get_account_info(self) -> dict:
        """Get account information."""
        if not self.is_ready():
            return {
                'cash': 0.0,
                'portfolio_value': 0.0,
                'buying_power': 0.0,
                'equity': 0.0,
                'status': 'not_initialized'
            }
            
        try:
            account = self.trading_client.get_account()
            return {
                'cash': float(account.cash),
                'portfolio_value': float(account.portfolio_value),
                'buying_power': float(account.buying_power),
                'equity': float(account.equity),
                'status': account.status
            }
        except Exception as e:
            self.logger.error(f"Error getting account info: {str(e)}")
            return {
                'cash': 0.0,
                'portfolio_value': 0.0,
                'buying_power': 0.0,
                'equity': 0.0,
                'status': 'error',
                'error': str(e)
            }

    def get_portfolio_history(self, timeframe: str) -> List[Dict]:
        """Get portfolio value history for the specified timeframe."""
        try:
            # Get portfolio history from database
            session = get_session()
            history = session.query(PortfolioHistory).filter(
                PortfolioHistory.timestamp >= self._get_start_time(timeframe)
            ).order_by(PortfolioHistory.timestamp.asc()).all()
            
            return [{
                'timestamp': h.timestamp.isoformat(),
                'value': float(h.value)
            } for h in history]
        except Exception as e:
            self.logger.error(f"Error getting portfolio history: {str(e)}")
            return []
        finally:
            session.close()

    def get_positions(self) -> List[Dict]:
        """Get current open positions."""
        try:
            if not self.is_ready():
                return []
                
            positions = self.trading_client.get_all_positions()
            return [{
                'symbol': pos.symbol,
                'quantity': float(pos.qty),
                'entry_price': float(pos.avg_entry_price),
                'current_price': float(pos.current_price),
                'market_value': float(pos.market_value),
                'pnl': float(pos.unrealized_pl),
                'pnl_percent': float(pos.unrealized_plpc) * 100
            } for pos in positions]
        except Exception as e:
            self.logger.error(f"Error getting positions: {str(e)}")
            return []

    def close_position(self, symbol: str) -> bool:
        """Close a position for the given symbol."""
        try:
            if not self.is_ready():
                return False
                
            # Get current position
            position = self.trading_client.get_position(symbol)
            if not position:
                return False
                
            # Create market order to close position
            side = OrderSide.SELL if float(position.qty) > 0 else OrderSide.BUY
            self.trading_client.submit_order(
                symbol=symbol,
                qty=abs(float(position.qty)),
                side=side,
                type='market',
                time_in_force=TimeInForce.IOC
            )
            return True
        except Exception as e:
            self.logger.error(f"Error closing position: {str(e)}")
            return False

    def get_recent_trades(self, limit: int = 10) -> List[Dict]:
        """Get recent trades."""
        try:
            session = get_session()
            trades = session.query(Trade).order_by(
                Trade.timestamp.desc()
            ).limit(limit).all()
            
            return [{
                'id': trade.id,
                'timestamp': trade.timestamp.isoformat(),
                'symbol': trade.symbol,
                'side': trade.side,
                'quantity': float(trade.quantity),
                'price': float(trade.price),
                'pnl': float(trade.pnl) if trade.pnl else None,
                'strategy': trade.strategy
            } for trade in trades]
        except Exception as e:
            self.logger.error(f"Error getting recent trades: {str(e)}")
            return []
        finally:
            session.close()

    def get_market_data(self, symbols: Optional[List[str]] = None) -> List[Dict]:
        """Get current market data for the specified symbols."""
        try:
            session = get_session()
            query = session.query(MarketData)
            
            if symbols:
                query = query.filter(MarketData.symbol.in_(symbols))
                
            # Get latest data point for each symbol
            subquery = query.distinct(
                MarketData.symbol
            ).order_by(
                MarketData.symbol,
                MarketData.timestamp.desc()
            ).subquery()
            
            market_data = session.query(MarketData).join(
                subquery,
                and_(
                    MarketData.symbol == subquery.c.symbol,
                    MarketData.timestamp == subquery.c.timestamp
                )
            ).all()
            
            return [{
                'symbol': data.symbol,
                'price': float(data.close),
                'change_24h': self._calculate_24h_change(data.symbol),
                'volume_24h': float(data.volume),
                'high_24h': float(data.high),
                'low_24h': float(data.low),
                'market_cap': self._calculate_market_cap(data.symbol, data.close),
                'signal': self._get_trading_signal(data.symbol)
            } for data in market_data]
        except Exception as e:
            self.logger.error(f"Error getting market data: {str(e)}")
            return []
        finally:
            session.close()

    def get_available_symbols(self) -> List[Dict]:
        """Get list of available trading symbols with current prices."""
        try:
            # Default popular crypto pairs
            default_symbols = [
                'BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD',  # Popular Layer 1
                'USDT/USD', 'USDC/USD', 'DAI/USD', 'BUSD/USD',  # Stablecoins
                'UNI/USD', 'AAVE/USD', 'MKR/USD', 'SNX/USD', 'COMP/USD',  # DeFi
                'LINK/USD', 'DOT/USD', 'ADA/USD', 'ATOM/USD', 'ALGO/USD'  # Other Major
            ]
            
            if not self.is_ready():
                self.logger.info("Using default symbols list (limited mode)")
                # Return objects instead of strings
                return [{"symbol": s, "price": 0, "change_24h": 0} for s in default_symbols]
            
            # Get tradable symbols from API
            try:
                assets = self.trading_client.get_all_assets()
                crypto_assets = [asset for asset in assets if asset.status == 'active' and asset.asset_class == 'crypto']
                api_symbols = [asset.symbol for asset in crypto_assets]
                
                # Combine API symbols with defaults, removing duplicates
                all_symbols = list(set(api_symbols + default_symbols))
                
                # Convert to list of objects
                return [{"symbol": s, "price": 0, "change_24h": 0} for s in sorted(all_symbols)]
                
            except Exception as e:
                self.logger.error(f"Error getting symbols from API: {str(e)}")
                # Return objects instead of strings
                return [{"symbol": s, "price": 0, "change_24h": 0} for s in default_symbols]
            
        except Exception as e:
            self.logger.error(f"Error getting available symbols: {str(e)}")
            # Return objects instead of strings
            return [{"symbol": s, "price": 0, "change_24h": 0} for s in default_symbols]

    def get_active_strategies(self) -> List[Dict]:
        """Get list of active trading strategies."""
        try:
            result = []
            for symbol, strategies in self.strategies.items():
                for strategy in strategies:
                    # Get the strategy name, using a default if not set
                    strategy_name = getattr(strategy, 'name', None)
                    if not strategy_name:
                        strategy_name = f"{strategy.__class__.__name__} - {symbol}"
                    
                    # Get strategy ID or generate a temporary one
                    strategy_id = getattr(strategy, 'id', None)
                    if strategy_id is None:
                        strategy_id = id(strategy)  # Use object id as fallback
                    
                    # Get strategy class name without "Strategy" suffix for cleaner display
                    strategy_type = strategy.__class__.__name__
                    if strategy_type.endswith('Strategy'):
                        strategy_type = strategy_type[:-8]  # Remove "Strategy" suffix
                    
                    # Create strategy info dictionary
                    strategy_info = {
                        'id': strategy_id,
                        'name': strategy_name,  # Put name first for better visibility
                        'symbol': symbol,
                        'type': strategy_type,
                        'parameters': strategy.get_parameters() if hasattr(strategy, 'get_parameters') else {},
                        'active': strategy.is_active if hasattr(strategy, 'is_active') else True,
                        'pnl': strategy.get_performance() if hasattr(strategy, 'get_performance') else 0.0
                    }
                    
                    # Add capital and risk if available
                    if hasattr(strategy, 'capital'):
                        strategy_info['capital'] = strategy.capital
                    if hasattr(strategy, 'risk_per_trade'):
                        strategy_info['risk_per_trade'] = strategy.risk_per_trade
                    
                    result.append(strategy_info)
            
            return result
        except Exception as e:
            self.logger.error(f"Error getting active strategies: {str(e)}")
            return []

    def delete_strategy(self, strategy_id: int) -> bool:
        """Delete a trading strategy."""
        try:
            for symbol, strategies in self.strategies.items():
                for i, strategy in enumerate(strategies):
                    if strategy.id == strategy_id:
                        strategies.pop(i)
                        if not strategies:
                            del self.strategies[symbol]
                        return True
            return False
        except Exception as e:
            self.logger.error(f"Error deleting strategy: {str(e)}")
            return False

    def start(self) -> bool:
        """Start the trading engine."""
        try:
            if not self.is_ready():
                return False
                
            self.running = True
            self.trading_thread = threading.Thread(target=self._trading_loop)
            self.trading_thread.daemon = True
            self.trading_thread.start()
            return True
        except Exception as e:
            self.logger.error(f"Error starting trading engine: {str(e)}")
            return False

    def stop(self) -> bool:
        """Stop the trading engine."""
        try:
            self.running = False
            if self.trading_thread:
                self.trading_thread.join(timeout=5)
            return True
        except Exception as e:
            self.logger.error(f"Error stopping trading engine: {str(e)}")
            return False

    def _get_start_time(self, timeframe: str) -> datetime:
        """Get start time based on timeframe."""
        now = datetime.utcnow()
        if timeframe == '1d':
            return now - timedelta(days=1)
        elif timeframe == '1w':
            return now - timedelta(weeks=1)
        elif timeframe == '1m':
            return now - timedelta(days=30)
        elif timeframe == '3m':
            return now - timedelta(days=90)
        else:  # 1y
            return now - timedelta(days=365)

    def _calculate_24h_change(self, symbol: str) -> float:
        """Calculate 24-hour price change percentage."""
        try:
            session = get_session()
            now = datetime.utcnow()
            
            # Get current price
            current = session.query(MarketData).filter(
                MarketData.symbol == symbol
            ).order_by(
                MarketData.timestamp.desc()
            ).first()
            
            # Get price 24 hours ago
            previous = session.query(MarketData).filter(
                MarketData.symbol == symbol,
                MarketData.timestamp <= now - timedelta(days=1)
            ).order_by(
                MarketData.timestamp.desc()
            ).first()
            
            if current and previous:
                return ((current.close - previous.close) / previous.close) * 100
            return 0.0
        except Exception as e:
            self.logger.error(f"Error calculating 24h change: {str(e)}")
            return 0.0
        finally:
            session.close()

    def _calculate_market_cap(self, symbol: str, price: float) -> float:
        """Calculate market cap for the symbol."""
        try:
            # This is a placeholder. In a real implementation,
            # you would need to get the circulating supply from an API
            # or maintain it in your database
            return price * 1000000  # Dummy calculation
        except Exception as e:
            self.logger.error(f"Error calculating market cap: {str(e)}")
            return 0.0

    def _get_trading_signal(self, symbol: str) -> str:
        """Get current trading signal for the symbol."""
        try:
            if symbol not in self.strategies:
                return 'NEUTRAL'
                
            # Combine signals from all strategies
            signals = [strategy.get_signal() for strategy in self.strategies[symbol]]
            buy_signals = signals.count('BUY')
            sell_signals = signals.count('SELL')
            
            if buy_signals > sell_signals:
                return 'BUY'
            elif sell_signals > buy_signals:
                return 'SELL'
            return 'NEUTRAL'
        except Exception as e:
            self.logger.error(f"Error getting trading signal: {str(e)}")
            return 'NEUTRAL'

    def get_strategy_status(self, symbol: str) -> List[Dict]:
        """Get current status of all strategies for a symbol"""
        if symbol not in self.strategies:
            return []
        
        status = []
        for strategy in self.strategies[symbol]:
            # Get latest data and signals
            data = strategy.get_historical_data(limit=100)
            if not data.empty:
                signals = strategy.generate_signals(data)
                strategy.update_position()
                
                status_data = {
                    'strategy_type': strategy.__class__.__name__,
                    'symbol': symbol,
                    'current_signal': signals['signal'],
                    'current_position': strategy.position.qty if strategy.position else 0,
                    'current_price': signals.get('close')
                }
                
                # Add strategy-specific indicators
                if isinstance(strategy, SupertrendStrategy):
                    status_data['supertrend_value'] = signals.get('supertrend')
                elif isinstance(strategy, MACDStrategy):
                    status_data.update({
                        'ema_value': signals.get('ema'),
                        'macd_value': signals.get('macd'),
                        'signal_line': signals.get('signal_line'),
                        'rsi_value': signals.get('rsi')
                    })
                
                status.append(status_data)
        
        return status

    def set_capital_per_strategy(self, amount: float):
        """Set the capital allocation per strategy"""
        self.capital_per_strategy = amount

    def set_risk_per_trade(self, risk: float):
        """Set the risk percentage per trade"""
        self.risk_per_trade = risk 

    def place_market_order(self, symbol: str, side: str, qty: float = None, notional: float = None, 
                          take_profit: Optional[float] = None, stop_loss: Optional[float] = None,
                          commission: Optional[float] = None, commission_type: str = 'notional') -> Dict:
        """Place a market order with optional take profit, stop loss, and commission.
        
        Args:
            symbol: Trading symbol
            side: 'buy' or 'sell'
            qty: Quantity to trade (mutually exclusive with notional)
            notional: Dollar amount to trade (mutually exclusive with qty)
            take_profit: Optional take profit percentage
            stop_loss: Optional stop loss percentage
            commission: Optional commission amount
            commission_type: Commission type ('notional', 'qty', or 'bps')
        """
        if not self.is_ready():
            return {'error': 'Trading engine not initialized with API credentials'}
            
        try:
            # Validate input parameters
            if qty is not None and notional is not None:
                raise ValueError("Cannot specify both qty and notional")
            if qty is None and notional is None:
                raise ValueError("Must specify either qty or notional")
            
            order_data = MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=OrderSide.BUY if side.lower() == 'buy' else OrderSide.SELL,
                time_in_force=TimeInForce.DAY
            )
            
            order = self.trading_client.submit_order(order_data)
            
            # Add take profit and stop loss orders if specified
            if order.status == 'accepted' and side.lower() == 'buy':
                current_price = float(order.filled_avg_price)
                if take_profit:
                    tp_price = current_price * (1 + take_profit/100)
                    self._place_take_profit_order(symbol, qty, tp_price)
                if stop_loss:
                    sl_price = current_price * (1 - stop_loss/100)
                    self._place_stop_loss_order(symbol, qty, sl_price)
                    
            return {
                'status': order.status,
                'filled_qty': order.filled_qty,
                'filled_avg_price': order.filled_avg_price
            }
        except Exception as e:
            self.logger.error(f"Error placing order: {str(e)}")
            return {'error': str(e)}

    def close_all_positions(self) -> Dict:
        """Close all open positions"""
        if not self.is_ready():
            return {'error': 'Trading engine not initialized with API credentials'}
            
        try:
            self.trading_client.close_all_positions(cancel_orders=True)
            return {"message": "All positions closed successfully"}
        except Exception as e:
            self.logger.error(f"Error closing positions: {str(e)}")
            return {'error': str(e)}

    def is_trading(self) -> bool:
        """Check if the trading engine is running"""
        return self.running

    def _trading_loop(self):
        """Main trading loop."""
        last_data_update = datetime.now() - timedelta(minutes=10)  # Force initial update
        last_portfolio_update = datetime.now() - timedelta(minutes=10)
        consecutive_errors = 0
        symbols_with_errors = {}
        
        while self.running:
            try:
                # Get symbols with active strategies
                symbols = list(self.strategies.keys())
                if not symbols:
                    self.logger.info("No active strategies found. Sleeping...")
                    time.sleep(30)
                    continue
                
                current_time = datetime.now()
                
                # Update market data every minute
                if (current_time - last_data_update).total_seconds() >= 60:
                    self.logger.info(f"Updating market data for {len(symbols)} symbols")
                    
                    # Get latest market data for all symbols in batches to avoid rate limits
                    for i in range(0, len(symbols), 5):
                        symbol_batch = symbols[i:i+5]
                        try:
                            market_data = self.get_market_data(symbol_batch)
                            if market_data:
                                # Store market data in database
                                session = get_session()
                                try:
                                    for data in market_data:
                                        market_data_entry = MarketData(
                                            symbol=data['symbol'],
                                            timestamp=datetime.utcnow(),
                                            open=data['price'],
                                            high=data['high_24h'],
                                            low=data['low_24h'],
                                            close=data['price'],
                                            volume=data['volume_24h']
                                        )
                                        session.add(market_data_entry)
                                    session.commit()
                                except Exception as e:
                                    self.logger.error(f"Error storing market data: {str(e)}")
                                    session.rollback()
                                finally:
                                    session.close()
                        except Exception as e:
                            self.logger.error(f"Error getting market data for batch {i}: {str(e)}")
                        
                        # Small delay between batches to avoid rate limits
                        time.sleep(1)
                    
                    last_data_update = current_time
                
                # Update portfolio value every 5 minutes
                if (current_time - last_portfolio_update).total_seconds() >= 300:
                    total_value = self._calculate_portfolio_value()
                    if total_value > 0:
                        session = get_session()
                        try:
                            portfolio_history = PortfolioHistory(
                                timestamp=datetime.utcnow(),
                                value=total_value
                            )
                            session.add(portfolio_history)
                            session.commit()
                            self.logger.info(f"Updated portfolio value: ${total_value:.2f}")
                        except Exception as e:
                            self.logger.error(f"Error storing portfolio history: {str(e)}")
                            session.rollback()
                        finally:
                            session.close()
                    
                    last_portfolio_update = current_time
                
                # Execute strategies for each symbol
                self.logger.info(f"Executing strategies for {len(symbols)} symbols")
                for symbol in symbols:
                    if symbol in symbols_with_errors and symbols_with_errors[symbol] >= 3:
                        self.logger.warning(f"Skipping {symbol} due to multiple errors")
                        continue
                        
                    try:
                        strategies = self.strategies[symbol]
                        for strategy in strategies:
                            if not strategy.is_active:
                                continue
                                
                            try:
                                # Check if it's during trading hours (for crypto we trade 24/7)
                                is_crypto = '/' in symbol
                                can_trade = True
                                
                                if not is_crypto:
                                    # For stocks, check market hours
                                    # This is a simplified check, in production you'd use the Alpaca Calendar API
                                    current_hour = current_time.hour
                                    current_day = current_time.weekday()
                                    is_weekend = current_day >= 5  # Saturday or Sunday
                                    is_market_hours = 9 <= current_hour < 16  # 9:30 AM to 4:00 PM ET
                                    can_trade = not is_weekend and is_market_hours
                                
                                if can_trade:
                                    signal = strategy.get_signal()
                                    if signal == 'BUY':
                                        result = self._execute_buy(symbol, strategy)
                                        if result:
                                            self.logger.info(f"Successfully executed BUY for {symbol}")
                                            # Reset error counter on successful execution
                                            symbols_with_errors[symbol] = 0
                                    elif signal == 'SELL':
                                        result = self._execute_sell(symbol, strategy)
                                        if result:
                                            self.logger.info(f"Successfully executed SELL for {symbol}")
                                            # Reset error counter on successful execution
                                            symbols_with_errors[symbol] = 0
                                else:
                                    self.logger.info(f"Skipping {symbol} - outside trading hours")
                            except Exception as strategy_error:
                                self.logger.error(f"Error in strategy {strategy.__class__.__name__} for {symbol}: {str(strategy_error)}")
                                # Track errors for this symbol
                                symbols_with_errors[symbol] = symbols_with_errors.get(symbol, 0) + 1
                    except Exception as symbol_error:
                        self.logger.error(f"Error processing symbol {symbol}: {str(symbol_error)}")
                        # Track errors for this symbol
                        symbols_with_errors[symbol] = symbols_with_errors.get(symbol, 0) + 1
                
                # Reset consecutive errors counter after successful loop
                consecutive_errors = 0
                
                # Sleep for the update interval
                sleep_time = max(1, self.settings.update_interval)
                self.logger.info(f"Trading loop iteration completed. Sleeping for {sleep_time} seconds")
                time.sleep(sleep_time)
                
            except Exception as e:
                consecutive_errors += 1
                self.logger.error(f"Error in trading loop: {str(e)}")
                
                # If too many consecutive errors, pause to avoid API rate limits
                if consecutive_errors >= 5:
                    self.logger.critical(f"Too many consecutive errors ({consecutive_errors}). Pausing for 5 minutes")
                    time.sleep(300)  # Sleep for 5 minutes on repeated errors
                else:
                    time.sleep(max(5, consecutive_errors * 10))  # Increasing sleep time on errors

    def _calculate_portfolio_value(self) -> float:
        """Calculate total portfolio value."""
        try:
            # Check if we're in simulation mode
            if self.trading_client is None:
                # Use simulated portfolio value and add value of simulated positions
                if hasattr(self, 'simulated_portfolio_value'):
                    base_value = self.simulated_portfolio_value
                else:
                    base_value = 10000.0  # Default simulated portfolio value
                
                # Add value of simulated positions
                if hasattr(self, '_simulated_positions'):
                    for symbol, position in self._simulated_positions.items():
                        try:
                            # Get current price
                            market_data = self.get_market_data([symbol])
                            if market_data:
                                current_price = float(market_data[0]['price'])
                                position_value = position['qty'] * current_price
                                base_value += position_value
                        except Exception as e:
                            self.logger.error(f"Error calculating simulated position value for {symbol}: {str(e)}")
                
                self.logger.info(f"Simulated portfolio value: ${base_value:.2f}")
                return base_value
            
            # Use real account data if trading client is available
            if not self.is_ready():
                return 0.0
                
            account = self.trading_client.get_account()
            return float(account.portfolio_value)
        except Exception as e:
            self.logger.error(f"Error calculating portfolio value: {str(e)}")
            return 0.0
            
    def _execute_buy(self, symbol: str, strategy):
        """Execute a buy order based on strategy signal."""
        try:
            if not self.is_ready():
                self.logger.warning(f"Trading engine not ready to execute buy for {symbol}")
                return
                
            # Check if we're in simulation mode (no trading client)
            is_simulation = self.trading_client is None
            if is_simulation:
                self.logger.info(f"SIMULATION: Processing BUY order for {symbol}")
                
            # Check if we already have a position
            try:
                if not is_simulation:
                    position = self.trading_client.get_position(symbol)
                    if position and float(position.qty) > 0:
                        self.logger.info(f"Skipping buy for {symbol}: already have a long position")
                        return  # Already long
                else:
                    # In simulation, check our simulated positions
                    if hasattr(self, '_simulated_positions') and symbol in self._simulated_positions:
                        self.logger.info(f"SIMULATION: Skipping buy for {symbol}: already have a simulated position")
                        return
            except:
                pass  # No position exists
                
            # Get account information for position sizing
            if not is_simulation:
                account = self.trading_client.get_account()
                portfolio_value = float(account.portfolio_value)
            else:
                # Use a simulated account value of $10,000 if we don't have a trading client
                portfolio_value = 10000.0
                self.logger.info(f"SIMULATION: Using simulated portfolio value of ${portfolio_value}")
            
            # Calculate position size using risk management
            max_position_value = portfolio_value * (self.settings.max_position_size / 100.0)
            
            # Check if we have too many open positions
            if not is_simulation:
                current_positions = self.trading_client.get_all_positions()
                if len(current_positions) >= self.settings.max_open_trades:
                    self.logger.warning(f"Maximum number of positions reached ({self.settings.max_open_trades})")
                    return
            else:
                # In simulation mode, check our simulated positions count
                if hasattr(self, '_simulated_positions') and len(self._simulated_positions) >= self.settings.max_open_trades:
                    self.logger.warning(f"SIMULATION: Maximum number of positions reached ({self.settings.max_open_trades})")
                    return
                
            # Get latest market data for price and volatility info
            market_data = self.get_market_data([symbol])
            if not market_data:
                self.logger.warning(f"No market data available for {symbol}")
                return
                
            latest_price = float(market_data[0]['price'])
            
            # Calculate position size based on risk per trade
            risk_amount = portfolio_value * (self.settings.risk_per_trade / 100.0)
            stop_loss_percent = self.settings.stop_loss_percent / 100.0
            stop_loss_price = latest_price * (1 - stop_loss_percent)
            risk_per_share = latest_price - stop_loss_price
            
            # Calculate shares to buy based on risk
            quantity = risk_amount / risk_per_share if risk_per_share > 0 else 0
            
            # Ensure position size doesn't exceed max position size
            position_value = quantity * latest_price
            if position_value > max_position_value:
                quantity = max_position_value / latest_price
                self.logger.info(f"Reduced position size to respect max position size limit")
            
            # Ensure quantity is at least the minimum tradable amount
            if quantity * latest_price < 10:  # Minimum trade value $10
                self.logger.warning(f"Trade size too small for {symbol}, adjusting to minimum")
                quantity = 10 / latest_price
            
            # Round to appropriate precision for crypto
            quantity = round(quantity, 8)  # BTC can be traded to 8 decimal places
            
            # Calculate take profit price
            take_profit_percent = self.settings.take_profit_percent / 100.0
            take_profit_price = latest_price * (1 + take_profit_percent)
            
            if is_simulation:
                self.logger.info(f"SIMULATION: Executing BUY order for {symbol}: {quantity} @ {latest_price}")
                self.logger.info(f"SIMULATION: Stop loss: {stop_loss_price}, Take profit: {take_profit_price}")
                
                # Create a simulated order object
                class SimulatedOrder:
                    def __init__(self, symbol, qty, price):
                        self.symbol = symbol
                        self.qty = qty
                        self.filled_avg_price = price
                        self.status = 'filled'
                
                order = SimulatedOrder(symbol, quantity, latest_price)
                
                # Store the position in our simulated positions
                if not hasattr(self, '_simulated_positions'):
                    self._simulated_positions = {}
                
                self._simulated_positions[symbol] = {
                    'qty': quantity,
                    'avg_entry_price': latest_price,
                    'entry_time': datetime.utcnow(),
                    'stop_loss': stop_loss_price,
                    'take_profit': take_profit_price
                }
            else:
                self.logger.info(f"Executing BUY order for {symbol}: {quantity} @ {latest_price}")
                self.logger.info(f"Stop loss: {stop_loss_price}, Take profit: {take_profit_price}")
                
                # Place market buy order
                order = self.trading_client.submit_order(
                    symbol=symbol,
                    qty=quantity,
                    side=OrderSide.BUY,
                    type='market',
                    time_in_force=TimeInForce.IOC
                )
                
                # Place stop loss and take profit orders if the main order is filled
                if order and order.status == 'filled':
                    # Place stop loss order
                    self._place_stop_loss_order(symbol, quantity, stop_loss_price)
                    
                    # Place take profit order
                    self._place_take_profit_order(symbol, quantity, take_profit_price)
            
            # Record trade
            if order:
                session = get_session()
                try:
                    trade = Trade(
                        timestamp=datetime.utcnow(),
                        symbol=symbol,
                        side='BUY',
                        quantity=float(order.qty),
                        price=float(order.filled_avg_price) if order.filled_avg_price else latest_price,
                        strategy=strategy.__class__.__name__,
                        stop_loss=stop_loss_price,
                        take_profit=take_profit_price
                    )
                    session.add(trade)
                    session.commit()
                    self.logger.info(f"Trade recorded successfully: BUY {symbol}")
                except Exception as e:
                    self.logger.error(f"Error recording trade: {str(e)}")
                    session.rollback()
                finally:
                    session.close()
                    
            return order
                    
        except Exception as e:
            self.logger.error(f"Error executing buy order for {symbol}: {str(e)}")
            return None
            
    def _execute_sell(self, symbol: str, strategy):
        """Execute a sell order based on strategy signal."""
        try:
            if not self.is_ready():
                self.logger.warning(f"Trading engine not ready to execute sell for {symbol}")
                return
            
            # Check if we're in simulation mode (no trading client)
            is_simulation = self.trading_client is None
            if is_simulation:
                self.logger.info(f"SIMULATION: Processing SELL order for {symbol}")
                
            # Check if we have a position to sell
            try:
                if not is_simulation:
                    position = self.trading_client.get_position(symbol)
                    if not position or float(position.qty) <= 0:
                        self.logger.info(f"No position to sell for {symbol}")
                        return  # No position to sell
                    quantity = abs(float(position.qty))
                    entry_price = float(position.avg_entry_price)
                else:
                    # In simulation, check our simulated positions
                    if not hasattr(self, '_simulated_positions') or symbol not in self._simulated_positions:
                        self.logger.info(f"SIMULATION: No position to sell for {symbol}")
                        return
                    
                    simulated_position = self._simulated_positions[symbol]
                    quantity = simulated_position['qty']
                    entry_price = simulated_position['avg_entry_price']
            except:
                self.logger.info(f"No position exists for {symbol}")
                return  # No position exists
            
            # Get latest market data
            market_data = self.get_market_data([symbol])
            if not market_data:
                self.logger.warning(f"No market data available for {symbol}")
                return
                
            latest_price = float(market_data[0]['price'])
            
            # Calculate potential profit/loss
            pnl_percent = (latest_price - entry_price) / entry_price * 100
            
            if is_simulation:
                self.logger.info(f"SIMULATION: Executing SELL order for {symbol}: {quantity} @ {latest_price} (P&L: {pnl_percent:.2f}%)")
                
                # Create a simulated order object
                class SimulatedOrder:
                    def __init__(self, symbol, qty, price):
                        self.symbol = symbol
                        self.qty = qty
                        self.filled_avg_price = price
                        self.status = 'filled'
                
                order = SimulatedOrder(symbol, quantity, latest_price)
                
                # Remove the position from our simulated positions
                if hasattr(self, '_simulated_positions') and symbol in self._simulated_positions:
                    del self._simulated_positions[symbol]
            else:
                self.logger.info(f"Executing SELL order for {symbol}: {quantity} @ {latest_price} (P&L: {pnl_percent:.2f}%)")
                
                # Place market sell order
                order = self.trading_client.submit_order(
                    symbol=symbol,
                    qty=quantity,
                    side=OrderSide.SELL,
                    type='market',
                    time_in_force=TimeInForce.IOC
                )
                
                # Cancel any existing stop loss or take profit orders
                try:
                    open_orders = self.trading_client.get_orders(status='open')
                    for open_order in open_orders:
                        if open_order.symbol == symbol and open_order.side == 'sell':
                            self.trading_client.cancel_order_by_id(open_order.id)
                            self.logger.info(f"Cancelled existing order {open_order.id} for {symbol}")
                except Exception as e:
                    self.logger.warning(f"Error cancelling existing orders: {str(e)}")
            
            # Record trade
            if order:
                exit_price = float(order.filled_avg_price) if order.filled_avg_price else latest_price
                pnl = (exit_price - entry_price) * quantity
                
                session = get_session()
                try:
                    trade = Trade(
                        timestamp=datetime.utcnow(),
                        symbol=symbol,
                        side='SELL',
                        quantity=quantity,
                        price=exit_price,
                        pnl=pnl,
                        strategy=strategy.__class__.__name__
                    )
                    session.add(trade)
                    session.commit()
                    self.logger.info(f"Trade recorded successfully: SELL {symbol} with P&L: ${pnl:.2f}")
                except Exception as e:
                    self.logger.error(f"Error recording trade: {str(e)}")
                    session.rollback()
                finally:
                    session.close()
                    
            return order
                    
        except Exception as e:
            self.logger.error(f"Error executing sell order for {symbol}: {str(e)}")
            return None

    def _place_take_profit_order(self, symbol: str, qty: float, price: float) -> Dict:
        """Place a take profit limit order"""
        if not self.is_ready():
            return {'error': 'Trading engine not initialized with API credentials'}
            
        try:
            order_data = {
                "symbol": symbol,
                "qty": qty,
                "side": "sell",
                "type": "limit",
                "time_in_force": "gtc",
                "limit_price": price
            }
            order = self.trading_client.submit_order(order_data)
            return {
                'status': order.status,
                'id': order.id
            }
        except Exception as e:
            self.logger.error(f"Error placing take profit order: {str(e)}")
            return {'error': str(e)}
        
    def _place_stop_loss_order(self, symbol: str, qty: float, price: float) -> Dict:
        """Place a stop loss order"""
        if not self.is_ready():
            return {'error': 'Trading engine not initialized with API credentials'}
            
        try:
            order_data = {
                "symbol": symbol,
                "qty": qty,
                "side": "sell",
                "type": "stop",
                "time_in_force": "gtc",
                "stop_price": price
            }
            order = self.trading_client.submit_order(order_data)
            return {
                'status': order.status,
                'id': order.id
            }
        except Exception as e:
            self.logger.error(f"Error placing stop loss order: {str(e)}")
            return {'error': str(e)}

    def _load_settings(self):
        """Load settings from database."""
        try:
            session = get_session()
            settings = session.query(Settings).first()
            return settings
        except Exception as e:
            self.logger.error(f"Error loading settings: {str(e)}")
            return None
        finally:
            session.close()

    def _generate_strategy_id(self):
        """Generate a unique ID for a strategy"""
        # Find the maximum ID across all strategies
        max_id = 0
        for symbol, strategies in self.strategies.items():
            for strategy in strategies:
                if hasattr(strategy, 'id') and strategy.id > max_id:
                    max_id = strategy.id
        
        # Return the next available ID
        return max_id + 1 