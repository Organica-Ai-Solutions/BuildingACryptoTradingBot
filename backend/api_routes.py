from flask import Blueprint, jsonify, request, render_template, redirect, url_for
from flask_cors import CORS
import json
import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError
import logging
import traceback
import os
from dotenv import load_dotenv
import uuid
import requests
import random
from typing import Dict, List, Optional, Union

from trading_engine import TradingEngine
from models.trade import Trade
from models.portfolio_history import PortfolioHistory
from models.market_data import MarketData
from models.database import get_session
from models.settings_model import Settings
from models.trading_model import Strategy
from strategies.supertrend_strategy import SupertrendStrategy
from strategies.macd_strategy import MACDStrategy
from utils.market_data import get_market_data, get_historical_data, generate_mock_data
from utils.indicators import calculate_indicators
from models.order_model import Order
from models.account_model import Account
from models.position_model import Position
from utils.trading_client import TradingClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create API blueprint
api_blueprint = Blueprint('api', __name__)

# Simple root endpoint for testing
@api_blueprint.route('/')
def api_root():
    """Root endpoint for the API"""
    return jsonify({
        'status': 'ok',
        'message': 'API is working'
    })

# Initialize trading engine
trading_engine = None

def initialize_trading_engine():
    """Initialize the trading engine with settings from database"""
    global trading_engine
    try:
        session = get_session()
        settings = session.query(Settings).first()
        
        if settings:
            if trading_engine is None:
                trading_engine = TradingEngine()
            trading_engine.initialize_clients()
            if not trading_engine.is_trading():
                trading_engine.start()
            logger.info("Trading engine initialized successfully")
            return trading_engine
        else:
            logger.error("No settings found in database")
            return None
    except Exception as e:
        logger.error(f"Error initializing trading engine: {str(e)}")
        return None
    finally:
        if session:
            session.close()

def get_trading_engine():
    """Get or initialize the trading engine"""
    global trading_engine
    if trading_engine is None:
        return initialize_trading_engine()
    return trading_engine

@api_blueprint.before_request
def before_request():
    """Ensure trading engine is initialized before each request"""
    if trading_engine is None:
        initialize_trading_engine()

@api_blueprint.teardown_request
def teardown_request(exception):
    """Clean up any database connections"""
    try:
        session = get_session()
        if session:
            session.close()
    except Exception as e:
        logger.error(f"Error in teardown: {str(e)}")

@api_blueprint.route('/health')
def health_check():
    """Check API health."""
    try:
        session = get_session()
        session.execute(text('SELECT 1'))
        return jsonify({'status': 'healthy'})
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

# Account endpoints
@api_blueprint.route('/account', methods=['GET'])
def get_account():
    """Get account information."""
    try:
        if not trading_engine:
            return jsonify({
                'cash': 0.0,
                'portfolio_value': 0.0,
                'buying_power': 0.0,
                'equity': 0.0,
                'status': 'not_initialized'
            }), 200  # Return 200 with default values instead of 500
            
        account_info = trading_engine.get_account_info()
        return jsonify(account_info), 200
        
    except Exception as e:
        # Log the error
        logger.error(f"Error fetching account info: {str(e)}")
        return jsonify({
            'cash': 0.0,
            'portfolio_value': 0.0,
            'buying_power': 0.0,
            'equity': 0.0,
            'status': 'error',
            'error': str(e)
        }), 200  # Return 200 with error status instead of 400

# Trading symbols
@api_blueprint.route('/symbols', methods=['GET'])
def get_symbols():
    """Get available trading symbols"""
    try:
        # If trading engine is not initialized, return an empty array instead of error
        if not trading_engine:
            logger.warning("Trading engine not initialized, returning empty symbols list")
            return jsonify([])
            
        symbols = trading_engine.get_available_symbols()
        
        # Ensure we return a properly formatted array of objects
        if not symbols:
            return jsonify([])
            
        # Validate response format - ensure each item is an object with a symbol property
        validated_symbols = []
        for item in symbols:
            # If it's already an object with a symbol property, use it
            if isinstance(item, dict) and 'symbol' in item:
                validated_symbols.append(item)
            # If it's a string, convert to object
            elif isinstance(item, str):
                validated_symbols.append({
                    'symbol': item,
                    'price': 0,
                    'change_24h': 0
                })
            # Otherwise skip invalid items
        
        return jsonify(validated_symbols)
    except Exception as e:
        logger.error(f"Error fetching symbols: {str(e)}")
        # Return empty array instead of error
        return jsonify([]), 200

@api_blueprint.route('/symbols/<symbol>', methods=['GET'])
def get_symbol_details(symbol):
    """Get detailed information for a specific symbol."""
    try:
        if not trading_engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
            
        # Format symbol for API (remove URL encoding)
        symbol = symbol.replace('%2F', '/')
        
        # Get current market data
        market_data = get_market_data(symbol)
        if not market_data:
            logger.error(f"No market data available for symbol {symbol}")
            return jsonify({"error": f"Resource not found"}), 404
        
        # Get historical price data using trading engine
        historical_data = get_historical_data(symbol, '1H', 50)
        
        # Initialize response data
        candles = []
        signals = []
        indicators = {}
        
        if historical_data is not None and not historical_data.empty:
            # Calculate indicators
            indicators = calculate_indicators(historical_data)
            
            # Format candle data for charting
            for _, row in historical_data.iterrows():
                candles.append({
                    'timestamp': row['timestamp'].isoformat(),
                    'open': row['open'],
                    'high': row['high'],
                    'low': row['low'],
                    'close': row['close'],
                    'volume': row['volume']
                })
            
            # Generate signals
            if market_data.get('price'):
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
            'price': market_data.get('price'),
            'change': market_data.get('change'),
            'volume': market_data.get('volume'),
            'market_cap': market_data.get('market_cap'),
            'high': market_data.get('high'),
            'low': market_data.get('low'),
            'source': market_data.get('source'),
            'candles': candles,
            'signals': signals,
            'indicators': indicators
        })
        
    except Exception as e:
        logger.error(f"Error getting symbol details: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Strategies endpoints
@api_blueprint.route('/strategies', methods=['GET'])
def get_strategies():
    """Get active trading strategies"""
    try:
        strategies = trading_engine.get_active_strategies()
        return jsonify(strategies)
    except Exception as e:
        logger.error(f"Error fetching strategies: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api_blueprint.route('/strategies', methods=['POST'])
def add_strategy():
    """Add a new trading strategy."""
    try:
        # Ensure trading engine is initialized
        if not trading_engine:
            initialize_trading_engine()
        if not trading_engine:
            return jsonify({'error': 'Trading engine not initialized'}), 500

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        required_fields = ['symbol', 'type']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Extract strategy parameters
        symbol = data['symbol']
        strategy_type = data['type']
        parameters = data.get('parameters', {})
        
        # Validate symbol format
        if ',' in symbol:
            return jsonify({'error': 'Invalid symbol format. Please provide a single symbol.'}), 400
        
        # Include optional capital and risk parameters if provided
        capital = 10000.0  # Default capital
        if 'capital' in data:
            try:
                capital = float(data['capital'])
                if capital <= 0:
                    return jsonify({'error': 'Capital must be greater than 0'}), 400
                parameters['capital'] = capital
            except ValueError:
                return jsonify({'error': 'Invalid capital value'}), 400
            
        risk_per_trade = 1.0  # Default risk 1%
        if 'risk_per_trade' in data:
            try:
                risk_per_trade = float(data['risk_per_trade'])
                if risk_per_trade <= 0 or risk_per_trade > 100:
                    return jsonify({'error': 'Risk per trade must be between 0 and 100'}), 400
                parameters['risk_per_trade'] = risk_per_trade
            except ValueError:
                return jsonify({'error': 'Invalid risk per trade value'}), 400
        
        # Extract name if provided, or generate one
        name = data.get('name')
        if not name:
            # Generate a unique name based on strategy type and symbol
            now = datetime.now()
            timestamp = now.strftime('%Y%m%d%H%M%S')
            adjectives = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Rapid', 'Swift', 'Smart', 'Golden', 'Strategic']
            nouns = ['Hunter', 'Trader', 'Eagle', 'Oracle', 'Momentum', 'Navigator', 'Pathfinder', 'Voyager', 'Seeker']
            
            import random
            adjective = random.choice(adjectives)
            noun = random.choice(nouns)
            
            # Format strategy type more nicely
            formatted_type = strategy_type.capitalize()
            if formatted_type == 'Macd': formatted_type = 'MACD'
            if formatted_type == 'Rsi': formatted_type = 'RSI'
            
            # Get symbol base currency (e.g., BTC from BTC/USD)
            base_currency = symbol.split('/')[0] if '/' in symbol else symbol
            
            name = f"{adjective} {noun} {formatted_type} - {base_currency} {timestamp}"
            
        # Save strategy to database
        session = get_session()
        try:
            # Convert parameters to JSON string
            params_json = json.dumps(parameters) if parameters else '{}'
            
            # Create and save strategy
            db_strategy = Strategy(
                name=name,
                symbol=symbol,
                type=strategy_type,
                parameters=params_json,
                capital=capital,
                risk_per_trade=risk_per_trade / 100.0,  # Convert percentage to decimal
                is_active=True
            )
            session.add(db_strategy)
            session.commit()
            logger.info(f"Strategy saved to database: {name} (ID: {db_strategy.id})")
            
            # Now add it to the trading engine with the database ID
            parameters['name'] = name
            parameters['db_id'] = db_strategy.id  # Pass the database ID to the engine
            
            success = trading_engine.add_strategy(
                symbol=symbol,
                strategy_type=strategy_type,
                parameters=parameters
            )
            
            if not success:
                # If adding to trading engine failed, delete from database
                session.delete(db_strategy)
                session.commit()
                return jsonify({
                    'success': False,
                    'message': 'Failed to add strategy to trading engine'
                }), 500
                
            return jsonify({
                'success': True,
                'message': 'Strategy added successfully',
                'strategy': {
                    'id': db_strategy.id,
                    'name': name,
                    'symbol': symbol,
                    'type': strategy_type
                }
            })
        except Exception as e:
            session.rollback()
            logger.error(f"Database error adding strategy: {str(e)}")
            raise
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error adding strategy: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api_blueprint.route('/strategies/<int:strategy_id>', methods=['DELETE'])
def delete_strategy(strategy_id):
    """Delete a trading strategy."""
    try:
        success = trading_engine.delete_strategy(strategy_id)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_blueprint.route('/strategies/<int:strategy_id>/toggle', methods=['POST'])
def toggle_strategy(strategy_id):
    """Toggle a strategy's active state."""
    try:
        data = request.get_json()
        if data is None or 'active' not in data:
            return jsonify({'error': 'Missing active state parameter'}), 400
            
        active = bool(data['active'])
        
        # Update strategy in database first
        session = get_session()
        try:
            # Find strategy in database
            strategy = session.query(Strategy).filter(Strategy.id == strategy_id).first()
            if not strategy:
                return jsonify({'error': f'Strategy with ID {strategy_id} not found'}), 404
                
            # Update active state
            strategy.is_active = active
            session.commit()
            
            logger.info(f"Strategy {strategy_id} ({strategy.name}) active state set to {active}")
            
            # Find and update strategy in trading engine
            success = False
            for symbol, strategies in trading_engine.strategies.items():
                for strat in strategies:
                    if getattr(strat, 'id', None) == strategy_id:
                        strat.is_active = active
                        success = True
                        break
                if success:
                    break
            
            return jsonify({
                'success': True,
                'message': f"Strategy {'activated' if active else 'paused'} successfully",
                'strategy_id': strategy_id,
                'active': active
            })
        except Exception as e:
            session.rollback()
            logger.error(f"Database error toggling strategy: {str(e)}")
            raise
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error toggling strategy: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

# Position endpoints
@api_blueprint.route('/positions', methods=['GET'])
def get_positions():
    """Get open positions."""
    try:
        positions = trading_engine.get_positions()
        return jsonify(positions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_blueprint.route('/positions/close', methods=['POST'])
def close_position():
    """Close a position."""
    try:
        data = request.get_json()
        if not data or 'symbol' not in data:
            return jsonify({'error': 'Symbol is required'}), 400
            
        success = trading_engine.close_position(data['symbol'])
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Trade endpoints
@api_blueprint.route('/trades', methods=['GET'])
def get_trades():
    """Get recent trades."""
    try:
        limit = request.args.get('limit', 10, type=int)
        trades = trading_engine.get_recent_trades(limit)
        return jsonify(trades)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Portfolio history endpoint
@api_blueprint.route('/portfolio/history', methods=['GET'])
def get_portfolio_history():
    """Get portfolio value history."""
    try:
        timeframe = request.args.get('timeframe', '1d')
        data = trading_engine.get_portfolio_history(timeframe)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Market data endpoint
@api_blueprint.route('/market', methods=['GET'])
def get_market():
    """Get market data for all available symbols."""
    try:
        engine = get_trading_engine()
        if not engine:
            logger.warning("Trading engine not initialized, using default symbols")
            # Return default symbols with mock data
            default_symbols = [
                'BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD',
                'USDT/USD', 'USDC/USD', 'DAI/USD', 'BUSD/USD'
            ]
            market_data = []
            for symbol in default_symbols:
                data = get_market_data(symbol)
                if data:
                    market_data.append({
                        'symbol': symbol,
                        'price': data.get('price'),
                        'change': data.get('change'),
                        'volume': data.get('volume'),
                        'market_cap': data.get('market_cap'),
                        'high': data.get('high'),
                        'low': data.get('low'),
                        'source': data.get('source'),
                        'signal': data.get('signal', 'NEUTRAL')
                    })
            return jsonify(market_data)
            
        # Get available symbols from initialized trading engine
        symbols = engine.get_available_symbols()
        if not symbols:
            logger.warning("No symbols available from trading engine")
            return jsonify([])
            
        # Get market data for each symbol
        market_data = []
        for symbol in symbols:
            data = get_market_data(symbol)
            if data:
                market_data.append({
                    'symbol': symbol,
                    'price': data.get('price'),
                    'change': data.get('change'),
                    'volume': data.get('volume'),
                    'market_cap': data.get('market_cap'),
                    'high': data.get('high'),
                    'low': data.get('low'),
                    'source': data.get('source'),
                    'signal': data.get('signal', 'NEUTRAL')
                })
        
        return jsonify(market_data)
    except Exception as e:
        logger.error(f"Error fetching market data: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Backtest endpoint
@api_blueprint.route('/backtest', methods=['POST'])
def run_backtest():
    """Run a backtest for a specific strategy."""
    try:
        if not trading_engine:
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
        bars = trading_engine.get_bars(symbol, timeframe, limit=None, start=start_date, end=end_date)
        
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
        results = trading_engine.run_backtest(symbol, strategy, bars, data.get('capital', 1000))
        
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
        success = trading_engine.start()
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_blueprint.route('/trading/stop', methods=['POST'])
def stop_trading():
    """Stop the trading engine."""
    try:
        success = trading_engine.stop()
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_blueprint.route('/trading/pause', methods=['POST'])
def pause_trading():
    """Pause the trading engine."""
    try:
        if not trading_engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
            
        result = trading_engine.pause_trading()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api_blueprint.route('/settings/trading-status', methods=['GET'])
def get_trading_status():
    """Get trading status."""
    try:
        engine = get_trading_engine()
        if not engine:
            return jsonify({
                'trading_enabled': False,
                'message': 'Trading engine not initialized'
            }), 200
            
        # Get settings
        session = get_session()
        try:
            settings = session.query(Settings).first()
            is_paper = settings.is_paper_trading if settings else True
            
            # Check API credentials
            paper_credentials_valid = False
            live_credentials_valid = False
            
            if settings:
                # Get API credentials without parameters
                creds = settings.get_api_credentials()
                
                # Check if credentials exist (simplified approach)
                credentials_valid = bool(creds['api_key'] and creds['api_secret'])
                
                # Set both paper and live validity to the same value for simplicity
                paper_credentials_valid = credentials_valid
                live_credentials_valid = credentials_valid
            
            return jsonify({
                'trading_enabled': engine.is_ready() and engine.is_trading(),
                'trading_mode': 'paper' if is_paper else 'live',
                'engine_ready': engine.is_ready(),
                'paper_credentials_valid': paper_credentials_valid,
                'live_credentials_valid': live_credentials_valid
            })
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error getting trading status: {str(e)}")
        return jsonify({
            'trading_enabled': False,
            'error': str(e)
        }), 200

@api_blueprint.route('/positions/close-all', methods=['POST'])
def close_all_positions():
    """Close all open positions"""
    try:
        if not trading_engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        result = trading_engine.close_all_positions()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Settings endpoints
@api_blueprint.route('/settings', methods=['GET'])
def get_settings():
    """Get current settings."""
    try:
        session = get_session()
        from models.settings_model import Settings  # Import here to avoid circular imports
        
        settings = session.query(Settings).first()
        if not settings:
            settings = Settings()
            session.add(settings)
            session.commit()
        
        # Get settings as dict
        settings_dict = settings.to_dict()
        
        # Add API credentials status (simplified)
        creds = settings.get_api_credentials()
        has_credentials = bool(creds['api_key'] and creds['api_secret'])
        settings_dict['has_paper_credentials'] = has_credentials
        settings_dict['has_live_credentials'] = has_credentials
        
        return jsonify(settings_dict)
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_blueprint.route('/settings', methods=['POST'])
def update_settings():
    """Update trading settings."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        session = get_session()
        settings = session.query(Settings).first()
        
        if not settings:
            settings = Settings()
            session.add(settings)
        
        # Validate trading environment
        if 'tradingEnvironment' not in data:
            return jsonify({"error": "Trading environment not specified"}), 400
        
        # Update trading environment
        settings.is_paper_trading = data['tradingEnvironment'] == 'paper'
        
        # Validate and update API credentials
        if 'paperTrading' in data:
            paper = data['paperTrading']
            if paper.get('apiKey') and paper.get('apiSecret'):
                if len(paper['apiKey']) < 10 or len(paper['apiSecret']) < 10:
                    return jsonify({"error": "Invalid paper trading API credentials"}), 400
                settings.set_api_credentials(True, paper['apiKey'], paper['apiSecret'])
        
        if 'liveTrading' in data:
            live = data['liveTrading']
            if live.get('apiKey') and live.get('apiSecret'):
                if len(live['apiKey']) < 10 or len(live['apiSecret']) < 10:
                    return jsonify({"error": "Invalid live trading API credentials"}), 400
                settings.set_api_credentials(False, live['apiKey'], live['apiSecret'])
        
        # Validate and update trading settings
        if 'maxPositionSize' in data:
            if not isinstance(data['maxPositionSize'], (int, float)) or data['maxPositionSize'] <= 0 or data['maxPositionSize'] > 100:
                return jsonify({"error": "Max position size must be between 0 and 100"}), 400
            settings.max_position_size = float(data['maxPositionSize'])
            
        if 'riskPerTrade' in data:
            if not isinstance(data['riskPerTrade'], (int, float)) or data['riskPerTrade'] <= 0 or data['riskPerTrade'] > 10:
                return jsonify({"error": "Risk per trade must be between 0 and 10"}), 400
            settings.risk_per_trade = float(data['riskPerTrade'])
            
        if 'stopLossPercent' in data:
            if not isinstance(data['stopLossPercent'], (int, float)) or data['stopLossPercent'] <= 0 or data['stopLossPercent'] > 20:
                return jsonify({"error": "Stop loss percentage must be between 0 and 20"}), 400
            settings.stop_loss_percent = float(data['stopLossPercent'])
            
        if 'takeProfitPercent' in data:
            if not isinstance(data['takeProfitPercent'], (int, float)) or data['takeProfitPercent'] <= 0 or data['takeProfitPercent'] > 50:
                return jsonify({"error": "Take profit percentage must be between 0 and 50"}), 400
            settings.take_profit_percent = float(data['takeProfitPercent'])
            
        if 'maxOpenTrades' in data:
            if not isinstance(data['maxOpenTrades'], (int, float)) or data['maxOpenTrades'] < 1 or data['maxOpenTrades'] > 10:
                return jsonify({"error": "Max open trades must be between 1 and 10"}), 400
            settings.max_open_trades = int(data['maxOpenTrades'])
            
        if 'trailingStopPercent' in data:
            if not isinstance(data['trailingStopPercent'], (int, float)) or data['trailingStopPercent'] <= 0 or data['trailingStopPercent'] > 20:
                return jsonify({"error": "Trailing stop percentage must be between 0 and 20"}), 400
            settings.trailing_stop_percent = float(data['trailingStopPercent'])
            
        # Update notification settings
        if 'emailNotifications' in data:
            settings.email_notifications = bool(data['emailNotifications'])
            
        if 'emailAddress' in data:
            if settings.email_notifications and not data['emailAddress']:
                return jsonify({"error": "Email address is required when notifications are enabled"}), 400
            settings.email_address = data['emailAddress']
            
        if 'notifyTrades' in data:
            settings.notify_trades = bool(data['notifyTrades'])
            
        if 'notifySignals' in data:
            settings.notify_signals = bool(data['notifySignals'])
            
        if 'notifyErrors' in data:
            settings.notify_errors = bool(data['notifyErrors'])
        
        session.commit()
        
        # Reinitialize trading engine with new settings
        global trading_engine
        if trading_engine:
            trading_engine.reload_settings()
        
        return jsonify({
            "status": "success",
            "message": "Settings updated successfully",
            "settings": settings.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@api_blueprint.route('/settings/test_credentials', methods=['POST'])
def test_credentials():
    """Test API credentials."""
    session = get_session()
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        # Get settings from database
        settings = session.query(Settings).first()
        if not settings:
            return jsonify({
                'status': 'error',
                'message': 'Settings not found'
            }), 404
        
        # Determine which environment to test
        is_paper = data.get('tradingEnvironment', 'paper') == 'paper'
        api_key = data.get('apiKey')
        api_secret = data.get('apiSecret')
        
        # If no credentials provided in request, use existing ones
        if not api_key:
            # Get credentials from settings
            creds = settings.get_api_credentials(is_paper)
            api_key = creds['api_key']
            api_secret = creds['api_secret']
        elif api_secret == 'USE_EXISTING':
            # Use existing secret with new key
            if is_paper:
                api_secret = settings.decrypt_value(settings.paper_api_secret)
            else:
                api_secret = settings.decrypt_value(settings.live_api_secret)
        
        # Validate credentials
        if not api_key or not api_secret:
            return jsonify({
                'status': 'error',
                'message': f'No {"paper" if is_paper else "live"} trading API credentials provided or configured'
            }), 400
        
        # Initialize a temporary trading client to test credentials
        try:
            temp_client = TradingClient(api_key, api_secret, paper=is_paper)
            account = temp_client.get_account()
            
            # If we get here, credentials are valid - update settings if this is new information
            if data.get('apiKey') and data.get('apiSecret') and data.get('apiSecret') != 'USE_EXISTING':
                settings.set_api_credentials(is_paper, api_key, api_secret)
                session.commit()
                logger.info(f"Updated {'paper' if is_paper else 'live'} API credentials after successful test")
            
            return jsonify({
                'status': 'success',
                'message': 'API credentials verified successfully',
                'account_info': {
                    'id': account.id,
                    'status': account.status,
                    'currency': account.currency,
                    'buying_power': float(account.buying_power),
                    'cash': float(account.cash),
                    'portfolio_value': float(account.portfolio_value),
                    'trading_mode': 'paper' if is_paper else 'live'
                }
            })
        except Exception as e:
            logger.error(f"Failed to verify {'paper' if is_paper else 'live'} credentials: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Failed to verify credentials: {str(e)}'
            }), 400
            
    except Exception as e:
        logger.error(f"Error in test_credentials: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        session.close()

@api_blueprint.route('/market-data/<symbol>')
def get_market_data(symbol):
    """Get market data for a symbol"""
    try:
        if not trading_engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
        timeframe = request.args.get('timeframe', '1Min')
        limit = int(request.args.get('limit', 100))
        
        data = trading_engine.get_historical_data(symbol, timeframe, limit)
        return jsonify(data.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/orders', methods=['POST'])
def place_order():
    """Place a new order."""
    try:
        if not trading_engine:
            return jsonify({"error": "Trading engine not initialized"}), 500
            
        data = request.get_json()
        
        # Validate required fields
        if 'symbol' not in data or 'side' not in data:
            return jsonify({"error": "Symbol and side are required"}), 400
            
        # Extract order parameters
        symbol = data['symbol']
        side = data['side']
        qty = data.get('qty')
        notional = data.get('notional')
        take_profit = data.get('take_profit')
        stop_loss = data.get('stop_loss')
        commission = data.get('commission')
        commission_type = data.get('commission_type', 'notional')
        
        # Place the order
        result = trading_engine.place_market_order(
            symbol=symbol,
            side=side,
            qty=qty,
            notional=notional,
            take_profit=take_profit,
            stop_loss=stop_loss,
            commission=commission,
            commission_type=commission_type
        )
        
        if 'error' in result:
            return jsonify({"error": result['error']}), 400
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_blueprint.route('/historical/<symbol>', methods=['GET'])
def get_historical_prices(symbol):
    """Simple endpoint to return historical price data"""
    try:
        from datetime import datetime, timedelta
        import sys
        from utils.market_data import get_historical_data, generate_mock_data
        import pandas as pd
        
        # Add detailed logging
        logger.info(f"============================================")
        logger.info(f"Historical data endpoint called for symbol: {symbol}")
        logger.info(f"Request args: {request.args}")
        logger.info(f"Request path: {request.path}")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"============================================")
        
        # Get parameters
        timeframe = request.args.get('timeframe', '1d')
        limit = int(request.args.get('limit', 100))
        
        # Format symbol
        symbol = symbol.replace('%2F', '/')
        logger.info(f"Getting historical data for {symbol}, timeframe {timeframe}, limit {limit}")
        
        # Get historical data using the utility function
        try:
            df = get_historical_data(symbol, timeframe, limit)
            
            if df is None or df.empty:
                logger.warning(f"No historical data available for {symbol}, generating mock data")
                df = generate_mock_data(symbol, timeframe, limit)
                
            # Convert DataFrame to list of dictionaries for JSON response
            result = []
            for _, row in df.iterrows():
                try:
                    data_point = {
                        'timestamp': row['timestamp'].isoformat(),
                        'open': float(row['open']),
                        'high': float(row['high']),
                        'low': float(row['low']),
                        'close': float(row['close']),
                        'volume': float(row['volume'])
                    }
                    result.append(data_point)
                except Exception as e:
                    logger.warning(f"Error formatting data point: {e}")
                    continue
                    
            logger.info(f"Successfully retrieved {len(result)} data points")
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Error retrieving historical data: {str(e)}")
            # Fallback to direct mock data generation
            logger.info("Falling back to direct mock data generation")
            
            # Generate timestamps
            end_time = datetime.now()
            timestamps = [(end_time - timedelta(days=i)).isoformat() for i in range(limit)]
            
            # Set base price based on symbol
            if 'BTC' in symbol:
                base_price = 45000
            elif 'ETH' in symbol:
                base_price = 2000
            else:
                base_price = 100
                
            # Generate price data
            result = []
            for i in range(limit):
                # Create a price with some variation
                close = base_price * (1 + (random.random() - 0.5) * 0.1)
                open_price = close * 0.99
                high = close * 1.02
                low = close * 0.98
                volume = base_price * 1000
                
                result.append({
                    'timestamp': timestamps[i],
                    'open': float(open_price),
                    'high': float(high),
                    'low': float(low),
                    'close': float(close),
                    'volume': float(volume)
                })
                
            logger.info(f"Successfully generated {len(result)} fallback data points")
            return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in historical data endpoint: {str(e)}")
        # Return empty array instead of error
        return jsonify([])

@api_blueprint.route('/trading/status', methods=['GET'])
def get_trading_mode_status():
    """Get detailed trading mode status."""
    try:
        # Check if trading engine is initialized
        if not trading_engine:
            return jsonify({
                'status': 'not_initialized',
                'message': 'Trading engine not initialized',
                'simulation_mode': True,
                'is_ready': False,
                'is_running': False
            })
        
        # Check if trading engine is in simulation mode
        is_simulation = trading_engine.trading_client is None
        
        # Check if trading engine is running
        is_running = hasattr(trading_engine, 'running') and trading_engine.running
        
        # Get number of active strategies
        active_strategies = 0
        if hasattr(trading_engine, 'get_active_strategies'):
            try:
                strategies = trading_engine.get_active_strategies()
                active_strategies = len(strategies)
            except Exception as e:
                logger.error(f"Error getting active strategies: {str(e)}")
        
        # Check if trading engine is ready
        is_ready = trading_engine.is_ready()
        
        return jsonify({
            'status': 'ok',
            'simulation_mode': is_simulation,
            'is_ready': is_ready,
            'is_running': is_running,
            'active_strategies': active_strategies,
            'message': 'Trading engine is running in ' + 
                      ('simulation mode' if is_simulation else 'real trading mode')
        })
        
    except Exception as e:
        logger.error(f"Error getting trading status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'simulation_mode': True,
            'is_ready': False,
            'is_running': False
        }), 500