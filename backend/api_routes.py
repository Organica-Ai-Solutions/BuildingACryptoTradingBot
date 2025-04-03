from flask import Blueprint, jsonify, request
import json
import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from .trading_engine import TradingEngine
from .models.trading_model import Strategy, Trade, PortfolioSnapshot
from .strategies.supertrend_strategy import SupertrendStrategy
from .strategies.macd_strategy import MACDStrategy
from .utils.market_data import get_market_data, get_historical_data
from .utils.indicators import calculate_indicators
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create API blueprint
api_blueprint = Blueprint('api', __name__)

# Health check endpoint
@api_blueprint.route('/health', methods=['GET'])
def health_check():
    """Check API health status."""
    try:
        # Check database connection
        from .models.database import get_session
        session = get_session()
        session.execute('SELECT 1')
        
        # Check trading engine
        if engine is None:
            return jsonify({
                'status': 'warning',
                'message': 'Trading engine not initialized',
                'timestamp': datetime.utcnow().isoformat()
            })
        
        return jsonify({
            'status': 'healthy',
            'message': 'API is operational',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Initialize trading engine
engine = None

def init_engine():
    global engine
    api_key = os.getenv('ALPACA_API_KEY')
    api_secret = os.getenv('ALPACA_API_SECRET')
    is_paper = os.getenv('ALPACA_IS_PAPER', 'true').lower() == 'true'
    
    if not api_key or not api_secret:
        raise ValueError("Alpaca API credentials not found in environment variables")
        
    engine = TradingEngine(api_key, api_secret, paper=is_paper)
    return engine

# Account endpoints
@api_blueprint.route('/account', methods=['GET'])
def get_account():
    """Get account information."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        account_info = engine.get_account_info()
        return jsonify(account_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Trading symbols
@api_blueprint.route('/symbols', methods=['GET'])
def get_symbols():
    """Get available trading symbols."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        symbols = engine.get_available_symbols()
        return jsonify(symbols)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/symbols/<symbol>', methods=['GET'])
def get_symbol_details(symbol):
    """Get detailed information for a specific symbol."""
    try:
        # Get current market data
        market_data = get_market_data(symbol)
        
        # Get historical price data
        bars = engine.get_bars(symbol, '1H', 50)
        
        # Calculate indicators
        indicators = calculate_indicators(bars)
        
        # Format candle data for charting
        candles = []
        for bar in bars:
            candles.append({
                'timestamp': bar.t.isoformat(),
                'open': bar.o,
                'high': bar.h,
                'low': bar.l,
                'close': bar.c,
                'volume': bar.v
            })
        
        # Generate signals
        signals = []
        
        # Supertrend signal
        if 'supertrend' in indicators:
            signal_value = 'NEUTRAL'
            if indicators['supertrend']['value'] < market_data['price']:
                signal_value = 'BUY'
            elif indicators['supertrend']['value'] > market_data['price']:
                signal_value = 'SELL'
            
            signals.append({
                'name': 'Supertrend',
                'action': signal_value
            })
        
        # MACD signal
        if 'macd' in indicators:
            macd = indicators['macd']
            signal_value = 'NEUTRAL'
            if macd['histogram'] > 0 and macd['histogram'] > macd.get('prev_histogram', 0):
                signal_value = 'BUY'
            elif macd['histogram'] < 0 and macd['histogram'] < macd.get('prev_histogram', 0):
                signal_value = 'SELL'
            
            signals.append({
                'name': 'MACD',
                'action': signal_value
            })
        
        # RSI signal
        if 'rsi' in indicators:
            rsi = indicators['rsi']['value']
            signal_value = 'NEUTRAL'
            if rsi < 30:
                signal_value = 'BUY'  # Oversold
            elif rsi > 70:
                signal_value = 'SELL'  # Overbought
            
            signals.append({
                'name': 'RSI',
                'action': signal_value
            })
        
        return jsonify({
            'symbol': symbol,
            'price': market_data['price'],
            'change': market_data['change'],
            'volume': market_data['volume'],
            'high': market_data['high'],
            'low': market_data['low'],
            'market_cap': market_data.get('market_cap'),
            'candles': candles,
            'indicators': indicators,
            'signals': signals
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Strategies endpoints
@api_blueprint.route('/strategies', methods=['GET'])
def get_strategies():
    """Get all active strategies."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        strategies = engine.list_strategies()
        
        # Format strategy data
        result = []
        for strategy in strategies:
            strategy_data = {
                'id': strategy.id,
                'symbol': strategy.symbol,
                'type': strategy.type,
                'parameters': json.loads(strategy.parameters),
                'current_signal': strategy.current_signal,
                'position_size': strategy.position_size,
                'created_at': strategy.created_at.isoformat()
            }
            
            # Calculate strategy P&L if position exists
            if strategy.position_size:
                position = engine.get_position(strategy.symbol)
                if position:
                    strategy_data['pnl'] = position.unrealized_plpc * 100
            
            result.append(strategy_data)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/strategies', methods=['POST'])
def add_strategy():
    """Add a new trading strategy."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
            
        data = request.get_json()
        symbol = data.get('symbol')
        strategy_type = data.get('strategy_type')
        params = data.get('params', {})
        
        if not symbol or not strategy_type:
            return jsonify({"error": "Symbol and strategy_type are required"}), 400
            
        strategy = engine.add_strategy(symbol, strategy_type, params)
        return jsonify({
            "message": "Strategy added successfully",
            "strategy": {
                "symbol": symbol,
                "type": strategy_type,
                "active": strategy.is_active
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/strategies/<symbol>/<strategy_type>', methods=['DELETE'])
def remove_strategy(symbol, strategy_type):
    """Remove a trading strategy."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
            
        success = engine.remove_strategy(symbol, strategy_type)
        if success:
            return jsonify({"message": "Strategy removed successfully"})
        return jsonify({"error": "Strategy not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Position endpoints
@api_blueprint.route('/positions', methods=['GET'])
def get_positions():
    """Get all open positions."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        positions = engine.get_positions()
        
        result = []
        for position in positions:
            result.append({
                'symbol': position.symbol,
                'qty': position.qty,
                'avg_entry_price': position.avg_entry_price,
                'current_price': position.current_price,
                'market_value': position.market_value,
                'unrealized_pl': position.unrealized_pl,
                'unrealized_plpc': position.unrealized_plpc,
                'strategy': engine.get_strategy_by_symbol(position.symbol)
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/positions/<symbol>', methods=['DELETE'])
def close_position(symbol):
    """Close a specific position."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        success = engine.close_position(symbol)
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Failed to close position'}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Trade endpoints
@api_blueprint.route('/trades', methods=['GET'])
def get_trades():
    """Get recent trades."""
    try:
        # Get limit parameter with default of 20
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        limit = request.args.get('limit', 20, type=int)
        
        trades = Trade.query.order_by(Trade.transaction_time.desc()).limit(limit).all()
        
        result = []
        for trade in trades:
            result.append({
                'id': trade.id,
                'symbol': trade.symbol,
                'side': trade.side,
                'qty': trade.qty,
                'price': trade.price,
                'transaction_time': trade.transaction_time.isoformat(),
                'strategy': trade.strategy_type,
                'pnl': trade.pnl
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Portfolio history endpoint
@api_blueprint.route('/portfolio/history', methods=['GET'])
def get_portfolio_history():
    """Get portfolio value history."""
    try:
        # Get timeframe parameter
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        timeframe = request.args.get('timeframe', '1d')
        
        # Calculate start time based on timeframe
        now = datetime.now()
        if timeframe == '1d':
            start_time = now - timedelta(days=1)
        elif timeframe == '1w':
            start_time = now - timedelta(weeks=1)
        elif timeframe == '1m':
            start_time = now - timedelta(days=30)
        elif timeframe == '3m':
            start_time = now - timedelta(days=90)
        elif timeframe == '1y':
            start_time = now - timedelta(days=365)
        else:
            start_time = now - timedelta(days=1)
        
        # Get portfolio snapshots
        snapshots = PortfolioSnapshot.query.filter(
            PortfolioSnapshot.timestamp >= start_time
        ).order_by(PortfolioSnapshot.timestamp).all()
        
        # If no data is available, generate mock data
        if not snapshots:
            # Mock data for demonstration
            timestamps = []
            values = []
            
            # Generate mock data points
            start_value = 10000.0
            num_points = 48 if timeframe == '1d' else 100
            
            for i in range(num_points):
                if timeframe == '1d':
                    point_time = now - timedelta(hours=num_points-i)
                elif timeframe == '1w':
                    point_time = now - timedelta(days=(7-(i/14)))
                elif timeframe == '1m':
                    point_time = now - timedelta(days=(30-(i/3.3)))
                elif timeframe == '3m':
                    point_time = now - timedelta(days=(90-(i/1.1)))
                else:
                    point_time = now - timedelta(days=(365-(i/0.27)))
                
                # Random variation for mock data
                random_change = np.random.normal(0, 0.0015)
                point_value = start_value * (1 + random_change)
                start_value = point_value
                
                timestamps.append(point_time.strftime('%Y-%m-%d %H:%M:%S'))
                values.append(round(point_value, 2))
            
            return jsonify({
                'timestamps': timestamps,
                'values': values
            })
        
        # Format real data
        timestamps = [snapshot.timestamp.strftime('%Y-%m-%d %H:%M:%S') for snapshot in snapshots]
        values = [snapshot.portfolio_value for snapshot in snapshots]
        
        return jsonify({
            'timestamps': timestamps,
            'values': values
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Market data endpoint
@api_blueprint.route('/market', methods=['GET'])
def get_market_overview():
    """Get market overview data for top assets."""
    try:
        # Get top assets (either from database or using a predefined list)
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        symbols = engine.get_tradable_assets()[:10]  # Limit to top 10 assets
        
        result = []
        for symbol in symbols:
            # Get market data for each symbol
            data = get_market_data(symbol)
            
            # Calculate signal based on indicators
            bars = engine.get_bars(symbol, '1H', 20)
            indicators = calculate_indicators(bars)
            
            signal = 'NEUTRAL'
            if 'supertrend' in indicators and 'macd' in indicators:
                st_signal = indicators['supertrend'].get('signal', 'NEUTRAL')
                macd_signal = indicators['macd'].get('signal', 'NEUTRAL')
                
                if st_signal == 'BUY' and macd_signal == 'BUY':
                    signal = 'BUY'
                elif st_signal == 'SELL' and macd_signal == 'SELL':
                    signal = 'SELL'
            
            result.append({
                'symbol': symbol,
                'price': data['price'],
                'change': data['change'],
                'volume': data['volume'],
                'market_cap': data.get('market_cap'),
                'signal': signal
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Backtest endpoint
@api_blueprint.route('/backtest', methods=['POST'])
def run_backtest():
    """Run a backtest for a specific strategy."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        data = request.json
        
        if not data or 'symbol' not in data or 'type' not in data:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Required parameters
        symbol = data['symbol']
        strategy_type = data['type']
        
        # Get historical data for backtest
        # Default to 30 days of hourly data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        timeframe = data.get('timeframe', '1H')
        
        # Get bars for backtest
        bars = engine.get_bars(symbol, timeframe, limit=None, start=start_date, end=end_date)
        
        # Initialize the appropriate strategy
        strategy = None
        if strategy_type == 'supertrend':
            strategy = SupertrendStrategy(
                atr_period=data.get('atr_period', 10),
                multiplier=data.get('multiplier', 3.0)
            )
        elif strategy_type == 'macd':
            strategy = MACDStrategy(
                ema_period=data.get('ema_period', 9),
                macd_fast=data.get('macd_fast', 12), 
                macd_slow=data.get('macd_slow', 26),
                macd_signal=data.get('macd_signal', 9),
                rsi_period=data.get('rsi_period', 14)
            )
        else:
            return jsonify({'success': False, 'message': 'Unsupported strategy type'}), 400
        
        # Run backtest
        results = engine.run_backtest(symbol, strategy, bars, data.get('capital', 1000))
        
        return jsonify({
            'success': True,
            'pnl': results['pnl'],
            'win_rate': results['win_rate'],
            'total_trades': results['total_trades'],
            'winning_trades': results['winning_trades'],
            'losing_trades': results['losing_trades'],
            'max_drawdown': results['max_drawdown']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Trading control endpoints
@api_blueprint.route('/trading/start', methods=['POST'])
def start_trading():
    """Start the trading engine."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        engine.start_trading()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@api_blueprint.route('/trading/stop', methods=['POST'])
def stop_trading():
    """Stop the trading engine."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        engine.stop_trading()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@api_blueprint.route('/trading/status', methods=['GET'])
def get_trading_status():
    """Get the current trading status."""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        is_trading = engine.is_trading()
        return jsonify({'is_trading': is_trading})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/positions/close-all', methods=['POST'])
def close_all_positions():
    """Close all open positions"""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        result = engine.close_all_positions()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/settings', methods=['GET'])
def get_settings():
    """Get current trading settings"""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        settings = {
            "paper_trading": engine.paper_trading,
            "capital_per_strategy": engine.capital_per_strategy,
            "risk_per_trade": engine.risk_per_trade,
        }
        return jsonify(settings)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/settings', methods=['POST'])
def update_settings():
    """Update trading settings"""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        data = request.get_json()
        
        if 'capital_per_strategy' in data:
            engine.set_capital_per_strategy(float(data['capital_per_strategy']))
            
        if 'risk_per_trade' in data:
            engine.set_risk_per_trade(float(data['risk_per_trade']))
            
        return jsonify({"message": "Settings updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/market-data/<symbol>')
def get_market_data(symbol):
    """Get market data for a symbol"""
    try:
        if not engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        timeframe = request.args.get('timeframe', '1Min')
        limit = int(request.args.get('limit', 100))
        
        data = engine.get_historical_data(symbol, timeframe, limit)
        return jsonify(data.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 400 