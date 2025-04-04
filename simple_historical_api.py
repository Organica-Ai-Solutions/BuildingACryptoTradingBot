from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import logging
import random
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a simple app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/historical/<symbol>')
def get_historical_data(symbol):
    """Return historical price data"""
    try:
        # Log request details
        logger.info(f"Historical data request for {symbol}")
        
        # Get parameters
        timeframe = request.args.get('timeframe', '1d')
        limit = int(request.args.get('limit', 100))
        
        # Format symbol
        symbol = symbol.replace('%2F', '/')
        
        # Generate time series data
        end_time = datetime.now()
        data = []
        
        # Set base price based on symbol
        if 'BTC' in symbol:
            base_price = 45000
        elif 'ETH' in symbol:
            base_price = 2000
        else:
            base_price = 100
            
        # Generate data points
        price = base_price
        for i in range(limit):
            timestamp = end_time - timedelta(days=i)
            # Random price change (-2% to +2%)
            change = random.uniform(-0.02, 0.02)
            price = price * (1 + change)
            
            # Calculate OHLC
            open_price = price * (1 - random.uniform(-0.005, 0.005))
            high = price * (1 + random.uniform(0.005, 0.015))
            low = price * (1 - random.uniform(0.005, 0.015))
            close = price
            volume = base_price * random.uniform(0.5, 1.5) * 10
            
            data.append({
                'timestamp': timestamp.isoformat(),
                'open': round(open_price, 2),
                'high': round(high, 2),
                'low': round(low, 2),
                'close': round(close, 2),
                'volume': round(volume, 2)
            })
        
        # Return data in chronological order (oldest first)
        data.reverse()
        logger.info(f"Generated {len(data)} data points for {symbol}")
        return jsonify(data)
        
    except Exception as e:
        logger.error(f"Error generating historical data: {str(e)}")
        return jsonify([])

@app.route('/api/account/history')
def get_account_history():
    """Return portfolio history data"""
    try:
        # Get timeframe parameter
        timeframe = request.args.get('timeframe', '1m')
        
        # Set the number of days based on timeframe
        days = 30  # Default
        if timeframe == '1d':
            days = 7
        elif timeframe == '1w':
            days = 30
        elif timeframe == '1m':
            days = 90
        elif timeframe == '3m':
            days = 180
        elif timeframe == '1y':
            days = 365
        
        # Generate timestamps
        end_time = datetime.now()
        
        # Generate portfolio value data
        result = []
        base_value = 10000.0  # Start with $10,000
        current_value = base_value
        
        for i in range(days):
            # Create a timestamp
            timestamp = end_time - timedelta(days=i)
            
            # Add some randomness but with a generally upward trend
            # More likely to go up (60%) than down (40%)
            change = random.uniform(-0.02, 0.03)
            current_value = current_value * (1 + change)
            
            # Occasionally add trading signals
            signal = None
            if random.random() < 0.1:  # 10% chance of a signal
                signal = "BUY" if random.random() > 0.5 else "SELL"
            
            # Add data point
            result.append({
                'timestamp': timestamp.isoformat(),
                'value': round(current_value, 2),
                'signal': signal
            })
        
        # Return in chronological order (oldest first)
        result.reverse()
        logger.info(f"Generated {len(result)} portfolio history points")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error generating account history: {str(e)}")
        return jsonify([])

@app.route('/')
def home():
    """Root endpoint for API information"""
    return jsonify({
        "status": "ok",
        "message": "Historical Data API",
        "endpoints": [
            "/api/historical/<symbol>",
            "/api/account/history"
        ]
    })

if __name__ == '__main__':
    port = 5004
    logger.info(f"Starting historical data API on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=True) 