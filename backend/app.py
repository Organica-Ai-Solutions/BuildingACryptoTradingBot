from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from api_routes import api_blueprint
from models.database import init_db, teardown_session, get_session
from trading_engine import TradingEngine
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta
from flask_socketio import SocketIO
from flask_cors import cross_origin
import random
import urllib.parse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize trading engine
trading_engine = TradingEngine()

# Initialize default trading strategies
def initialize_default_strategies():
    """Initialize default trading strategies if none exist"""
    try:
        logger.info("Checking for existing strategies...")
        # Check if the method exists before calling it
        if hasattr(trading_engine, 'get_active_strategies'):
            active_strategies = trading_engine.get_active_strategies()
        else:
            # If the method doesn't exist, assume no active strategies
            logger.info("get_active_strategies method not found, assuming no strategies exist")
            active_strategies = []
        
        if not active_strategies:
            logger.info("No active strategies found. Setting up default strategies for BTC/USD and ETH/USD")
            
            # Add Supertrend strategy for BTC/USD
            trading_engine.add_strategy(
                symbol='BTC/USD',
                strategy_type='supertrend',
                parameters={
                    'name': 'BTC Supertrend',
                    'atr_period': 10,
                    'multiplier': 3.0,
                    'volume_threshold': 1.5,
                    'trends_required': 2
                }
            )
            
            # Add Supertrend strategy for ETH/USD
            trading_engine.add_strategy(
                symbol='ETH/USD',
                strategy_type='supertrend',
                parameters={
                    'name': 'ETH Supertrend',
                    'atr_period': 14,
                    'multiplier': 2.5,
                    'volume_threshold': 1.7,
                    'trends_required': 2
                }
            )
            
            logger.info("Default strategies initialized successfully")
        else:
            logger.info(f"Found {len(active_strategies)} existing strategies, skipping initialization")
    except Exception as e:
        logger.error(f"Error initializing default strategies: {str(e)}")

# Start the trading engine automatically if settings are available
try:
    # Check if engine is ready with proper API credentials
    if trading_engine.is_ready():
        # Initialize default strategies first
        initialize_default_strategies()
        
        logger.info("Starting trading engine automatically...")
        trading_engine.start()
        logger.info("Trading engine started successfully")
    else:
        logger.warning("Trading engine not started automatically: engine not ready or API credentials missing")
except Exception as e:
    logger.error(f"Error starting trading engine: {str(e)}")

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__, 
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
    
    # Enable CORS
    CORS(app)
    
    # Initialize Socket.IO
    socketio = SocketIO(app, cors_allowed_origins="*")
    
    # Add request logging for debugging
    @app.before_request
    def log_request_info():
        logger.info(f"Request: {request.method} {request.path}")
        logger.info(f"Full URL: {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        logger.info(f"Args: {request.args}")
    
    # Add cache-busting headers
    @app.after_request
    def add_header(response):
        logger.info(f"Response: {response.status_code} {response.status}")
        logger.info(f"Response headers: {dict(response.headers)}")
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
    
    # Initialize database
    logger.info("Initializing database...")
    if init_db():
        logger.info("Database initialized successfully")
    else:
        logger.error("Failed to initialize database")
    
    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    # Register teardown function
    app.teardown_appcontext(teardown_session)
    
    @app.route('/')
    def index():
        """Render the main dashboard page"""
        return render_template('index.html', timestamp=datetime.now().timestamp())
        
    @app.route('/dashboard')
    def dashboard():
        """Render the enhanced dashboard page"""
        return render_template('dashboard.html', timestamp=datetime.now().timestamp())
        
    @app.route('/strategies')
    def strategies():
        """Render the strategies page"""
        return render_template('strategies.html', timestamp=datetime.now().timestamp())
        
    @app.route('/settings')
    def settings():
        """Render the settings page"""
        return render_template('settings.html', timestamp=datetime.now().timestamp())
        
    @app.route('/history')
    def history():
        """Render the trade history page"""
        return render_template('history.html')
    
    # Direct health check route
    @app.route('/api/health-direct')
    def direct_health_check():
        """Direct health check endpoint"""
        from flask import jsonify
        return jsonify({
            "status": "ok",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        })
    
    # Direct route for historical data
    @app.route('/api/historical-direct/<symbol>', methods=['GET'])
    def get_historical_data_direct(symbol):
        """Direct route for historical price data"""
        from backend.utils.market_data import generate_mock_data
        import pandas as pd
        from flask import jsonify, request
        
        logger.info(f"Direct historical data endpoint called for symbol: {symbol}")
        
        # Get parameters
        timeframe = request.args.get('timeframe', '1d')
        limit = int(request.args.get('limit', 100))
        
        # Format symbol
        symbol = symbol.replace('%2F', '/')
        
        # Generate mock data directly
        df = generate_mock_data(symbol, timeframe, limit)
        
        # Convert DataFrame to list of dictionaries
        result = []
        for _, row in df.iterrows():
            data_point = {
                'timestamp': row['timestamp'].isoformat(),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': float(row['volume'])
            }
            result.append(data_point)
            
        logger.info(f"Successfully generated {len(result)} direct data points")
        return jsonify(result)
    
    # Super simple historical data route
    @app.route('/api/simple-historical/<symbol>')
    def simple_historical(symbol):
        """Return simple hardcoded historical data"""
        from flask import jsonify
        
        logger.info(f"Simple historical data endpoint called for symbol: {symbol}")
        
        # Fixed data
        data = [
            {
                "timestamp": "2023-01-01T00:00:00",
                "open": 45000.0,
                "high": 46000.0,
                "low": 44000.0,
                "close": 45500.0,
                "volume": 1000000.0
            },
            {
                "timestamp": "2023-01-02T00:00:00",
                "open": 45500.0,
                "high": 47000.0,
                "low": 45000.0,
                "close": 46800.0,
                "volume": 1200000.0
            },
            {
                "timestamp": "2023-01-03T00:00:00",
                "open": 46800.0,
                "high": 48000.0,
                "low": 46500.0,
                "close": 47500.0,
                "volume": 1500000.0
            }
        ]
        
        logger.info("Returning simple historical data")
        return jsonify(data)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return {"error": "Resource not found"}, 404
        
    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error"}, 500
    
    @app.route('/api/account/history', methods=['GET'])
    @cross_origin()
    def get_account_history():
        """
        Get account history data.
        This is a direct endpoint to avoid routing issues.
        """
        try:
            # This would normally fetch account history from a database
            # For now, we'll generate mock data
            now = datetime.now()
            history = []
            
            # Generate 30 days of history
            account_value = 10000.0  # Start with $10,000
            for i in range(30):
                day = now - timedelta(days=29-i)
                # Random daily change between -2% and +3%
                daily_change = random.uniform(-0.02, 0.03)
                account_value *= (1 + daily_change)
                
                history.append({
                    'timestamp': day.isoformat(),
                    'value': account_value,
                    'change': daily_change * 100
                })
            
            logger.info(f"Returning {len(history)} account history records")
            return jsonify(history)
        except Exception as e:
            logger.error(f"Error getting account history: {str(e)}")
            return jsonify({'error': 'Failed to get account history'}), 500
    
    # Debugging route to show all registered routes
    @app.route('/api/debug/routes', methods=['GET'])
    @cross_origin()
    def debug_routes():
        """Show all registered routes for debugging."""
        routes = []
        for rule in app.url_map.iter_rules():
            methods = ','.join(sorted(rule.methods))
            routes.append(f"{rule} ({methods}): {rule.endpoint}")
        return jsonify(routes)
    
    # Add a direct endpoint for specific patterns that might be causing issues
    @app.route('/api/historical/BTC/USD', methods=['GET'])
    @cross_origin()
    def get_btc_usd_historical():
        """Special handling for BTC/USD (non-encoded slash)."""
        logger.info("Accessed special BTC/USD endpoint (non-encoded)")
        logger.info(f"Request URL: {request.url}")
        logger.info(f"Request headers: {request.headers}")
        logger.info(f"Request args: {request.args}")
        return get_historical_data_endpoint("BTC/USD")
    
    # Special literal endpoint for BTC%2FUSD
    @app.route('/api/historical/BTC%2FUSD', methods=['GET'])
    @cross_origin()
    def get_btc_usd_encoded_historical():
        """Special handling for BTC%2FUSD (encoded slash)."""
        logger.info("Accessed special BTC%2FUSD endpoint (encoded)")
        logger.info(f"Request URL: {request.url}")
        logger.info(f"Request headers: {request.headers}")
        logger.info(f"Request args: {request.args}")
        
        try:
            # Parse request parameters
            timeframe = request.args.get('timeframe', '1d')
            limit = int(request.args.get('limit', 100))
            
            # Generate mock data for BTC/USD
            now = datetime.now()
            historical_data = []
            
            # Use the same settings as in get_historical_data_endpoint
            interval_seconds = 86400  # default to 1 day
            if timeframe == '1h':
                interval_seconds = 3600
            elif timeframe == '15m':
                interval_seconds = 900
            elif timeframe == '1m':
                interval_seconds = 60
            
            # BTC price baseline
            base_price = 50000.0 * random.uniform(0.9, 1.1)
            current_price = base_price
            
            # Generate price data with realistic volatility for BTC
            for i in range(limit):
                point_time = now - timedelta(seconds=interval_seconds * (limit - i - 1))
                
                # BTC volatility
                volatility = 0.02
                price_change = random.normalvariate(0, volatility)
                current_price *= (1 + price_change)
                
                # Create OHLC data point
                open_price = current_price
                high_price = open_price * random.uniform(1, 1 + volatility)
                low_price = open_price * random.uniform(1 - volatility, 1)
                close_price = current_price * random.uniform(0.995, 1.005)
                volume = random.uniform(base_price * 10, base_price * 100)
                
                historical_data.append({
                    'timestamp': point_time.isoformat(),
                    'open': round(open_price, 2),
                    'high': round(high_price, 2),
                    'low': round(low_price, 2),
                    'close': round(close_price, 2),
                    'volume': round(volume, 2)
                })
            
            logger.info(f"Returning {len(historical_data)} historical data points for BTC/USD from special handler")
            return jsonify(historical_data)
        except Exception as e:
            logger.error(f"Error in special handler for BTC%2FUSD: {str(e)}")
            return jsonify({'error': 'Failed to get historical data for BTC/USD'}), 500
    
    # Additional raw URL pattern endpoint that Flask won't try to decode
    @app.route('/api/historical/<string:raw_symbol>', methods=['GET'])
    @cross_origin()
    def get_historical_raw_endpoint(raw_symbol):
        """
        Special catch-all endpoint for any symbol that might not be correctly handled
        by the path converter.
        """
        logger.info(f"Raw symbol endpoint accessed with: {raw_symbol}")
        logger.info(f"Full URL: {request.url}")
        
        # Handle specific problematic symbols
        if raw_symbol == 'BTC%2FUSD' or raw_symbol == 'BTC%252FUSD':
            # Use the BTC/USD handler
            return get_btc_usd_encoded_historical()
        
        # Otherwise try to handle normally
        try:
            # Try to URL decode the symbol
            decoded_symbol = urllib.parse.unquote(raw_symbol)
            logger.info(f"Decoded symbol: {decoded_symbol}")
            return get_historical_data_endpoint(decoded_symbol)
        except Exception as e:
            logger.error(f"Error processing raw symbol {raw_symbol}: {str(e)}")
            
            # Return mock data as fallback
            try:
                timeframe = request.args.get('timeframe', '1d')
                limit = int(request.args.get('limit', 100))
                
                # Generate mock data
                now = datetime.now()
                historical_data = []
                
                # Default base price
                base_price = 100.0
                
                # Try to determine symbol type
                if 'BTC' in raw_symbol:
                    base_price = 50000.0
                elif 'ETH' in raw_symbol:
                    base_price = 3000.0
                
                # Add some randomness
                base_price *= random.uniform(0.9, 1.1)
                current_price = base_price
                
                # Generate price data
                for i in range(limit):
                    point_time = now - timedelta(days=limit - i - 1)
                    price_change = random.normalvariate(0, 0.02)
                    current_price *= (1 + price_change)
                    
                    historical_data.append({
                        'timestamp': point_time.isoformat(),
                        'open': round(current_price * 0.99, 2),
                        'high': round(current_price * 1.02, 2),
                        'low': round(current_price * 0.98, 2),
                        'close': round(current_price, 2),
                        'volume': round(base_price * random.uniform(10, 100), 2)
                    })
                
                logger.info(f"Returning {len(historical_data)} fallback data points for {raw_symbol}")
                return jsonify(historical_data)
            except Exception as fallback_error:
                logger.error(f"Even fallback failed for {raw_symbol}: {str(fallback_error)}")
                return jsonify({'error': f'Failed to get historical data for {raw_symbol}'}), 500
    
    @app.route('/api/historical/<path:symbol>', methods=['GET'])
    @cross_origin()
    def get_historical_data_endpoint(symbol):
        """
        Get historical price data for a symbol.
        This is a direct endpoint to avoid routing issues.
        """
        try:
            # Parse request parameters
            timeframe = request.args.get('timeframe', '1d')
            limit = int(request.args.get('limit', 100))
            
            # Log the request for debugging
            logger.info(f"Historical data request - Symbol: {symbol}, Timeframe: {timeframe}, Limit: {limit}")
            logger.info(f"Full URL: {request.url}")
            logger.info(f"Request headers: {dict(request.headers)}")
            logger.info(f"User agent: {request.headers.get('User-Agent', 'Unknown')}")
            
            # Generate mock data
            now = datetime.now()
            historical_data = []
            
            # Determine the time interval based on timeframe
            interval_seconds = 86400  # default to 1 day
            if timeframe == '1h':
                interval_seconds = 3600
            elif timeframe == '15m':
                interval_seconds = 900
            elif timeframe == '1m':
                interval_seconds = 60
            
            # Starting price depends on the symbol
            if 'BTC' in symbol:
                base_price = 50000.0
            elif 'ETH' in symbol:
                base_price = 3000.0
            elif 'SOL' in symbol:
                base_price = 100.0
            else:
                base_price = 100.0  # default for other symbols
            
            # Add some randomness to base price
            base_price *= random.uniform(0.9, 1.1)
            current_price = base_price
            
            # Generate price data with realistic volatility
            for i in range(limit):
                point_time = now - timedelta(seconds=interval_seconds * (limit - i - 1))
                
                # More volatility for crypto
                volatility = 0.02 if 'BTC' in symbol or 'ETH' in symbol else 0.01
                price_change = random.normalvariate(0, volatility)
                current_price *= (1 + price_change)
                
                # Create OHLC data point
                open_price = current_price
                high_price = open_price * random.uniform(1, 1 + volatility)
                low_price = open_price * random.uniform(1 - volatility, 1)
                close_price = current_price * random.uniform(0.995, 1.005)
                volume = random.uniform(base_price * 10, base_price * 100)
                
                historical_data.append({
                    'timestamp': point_time.isoformat(),
                    'open': round(open_price, 2),
                    'high': round(high_price, 2),
                    'low': round(low_price, 2),
                    'close': round(close_price, 2),
                    'volume': round(volume, 2)
                })
            
            logger.info(f"Returning {len(historical_data)} historical data points for {symbol}")
            return jsonify(historical_data)
        except Exception as e:
            logger.error(f"Error getting historical data for {symbol}: {str(e)}")
            return jsonify({'error': f'Failed to get historical data for {symbol}'}), 500
    
    return app, socketio

def main():
    """Main entry point for the application."""
    try:
        # Create and configure the application
        app, socketio = create_app()
        
        # Get configuration from environment
        debug = True  # Force debug mode for troubleshooting
        port = int(os.getenv('FLASK_PORT', 5002))  # Default to port 5002
        host = os.getenv('FLASK_HOST', '0.0.0.0')
        
        # Start the server
        logger.info(f"Starting server on {host}:{port}")
        socketio.run(app, host=host, port=port, debug=debug)
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise e

if __name__ == '__main__':
    main() 