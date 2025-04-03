import time
from typing import Dict, List
import threading
from alpaca.trading.client import TradingClient
from alpaca.data.historical import CryptoHistoricalDataClient
from alpaca.trading.requests import GetAssetsRequest
from alpaca.trading.enums import AssetClass
from .strategies.supertrend_strategy import SupertrendStrategy
from .strategies.macd_strategy import MACDStrategy

class TradingEngine:
    def __init__(self, api_key: str, secret_key: str, paper: bool = True):
        """Initialize the trading engine with API credentials"""
        self.trading_client = TradingClient(api_key, secret_key, paper=paper)
        self.data_client = CryptoHistoricalDataClient()
        self.strategies: Dict[str, List] = {}  # symbol -> list of strategies
        self.running = False
        self.trading_thread = None
        self.capital_per_strategy = 10000  # Default capital per strategy
        self.risk_per_trade = 0.02  # Default 2% risk per trade

    def add_strategy(self, symbol: str, strategy_type: str, **kwargs):
        """Add a trading strategy for a symbol"""
        if symbol not in self.strategies:
            self.strategies[symbol] = []
        
        strategy = None
        if strategy_type.lower() == 'supertrend':
            strategy = SupertrendStrategy(
                self.trading_client,
                self.data_client,
                symbol,
                **kwargs
            )
        elif strategy_type.lower() == 'macd':
            strategy = MACDStrategy(
                self.trading_client,
                self.data_client,
                symbol,
                **kwargs
            )
            
        if strategy:
            self.strategies[symbol].append(strategy)

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
        """Get list of tradable cryptocurrency symbols"""
        request_params = GetAssetsRequest(asset_class=AssetClass.CRYPTO)
        assets = self.trading_client.get_all_assets(request_params)
        return [asset.symbol for asset in assets if asset.tradable]

    def get_account_info(self) -> Dict:
        """Get current account information"""
        account = self.trading_client.get_account()
        return {
            'cash': float(account.cash),
            'portfolio_value': float(account.portfolio_value),
            'buying_power': float(account.buying_power),
            'daytrade_count': account.daytrade_count
        }

    def _run_trading_loop(self):
        """Main trading loop"""
        while self.running:
            try:
                # Execute each strategy
                for symbol, strategies in self.strategies.items():
                    for strategy in strategies:
                        strategy.execute_strategy(
                            capital=self.capital_per_strategy,
                            risk_per_trade=self.risk_per_trade
                        )
                
                # Sleep for 1 minute before next iteration
                time.sleep(60)
                
            except Exception as e:
                print(f"Error in trading loop: {e}")
                time.sleep(5)  # Sleep briefly before retrying

    def start_trading(self):
        """Start the trading engine"""
        if not self.running:
            self.running = True
            self.trading_thread = threading.Thread(target=self._run_trading_loop)
            self.trading_thread.start()
            print("Trading engine started")

    def stop_trading(self):
        """Stop the trading engine"""
        if self.running:
            self.running = False
            if self.trading_thread:
                self.trading_thread.join()
            print("Trading engine stopped")

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