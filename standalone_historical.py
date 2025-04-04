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

@app.route('/historical/<symbol>')
@app.route('/api/historical/<symbol>')
def get_historical_data(symbol):
    """Simple endpoint to return historical price data"""
    try:
        # Log detailed request info
        logger.info(f"Historical data request received for {symbol}")
        logger.info(f"Request path: {request.path}")
        logger.info(f"Request headers: {dict(request.headers)}")
        
        # Get parameters
        timeframe = request.args.get('timeframe', '1d')
        limit = int(request.args.get('limit', 100))
        
        # Format symbol
        symbol = symbol.replace('%2F', '/')
        logger.info(f"Generating historical data for {symbol}, timeframe {timeframe}, limit {limit}")
        
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
            
        logger.info(f"Successfully generated {len(result)} data points")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error generating historical data: {str(e)}")
        return jsonify([])

@app.route('/api/account/history')
def get_account_history():
    """Return portfolio history data"""
    try:
        # Get parameters
        timeframe = request.args.get('timeframe', '1d')
        days = 30  # Default to 30 days of data
        
        # Generate timestamps
        end_time = datetime.now()
        timestamps = [(end_time - timedelta(days=i)).isoformat() for i in range(days)]
        
        # Set base portfolio value
        base_value = 10000.0  # Start with $10,000
        
        # Generate portfolio value data with a general upward trend
        result = []
        current_value = base_value
        
        for i in range(days):
            # Random daily change between -2% and +4% (more positive than negative)
            change = (random.random() * 6.0 - 2.0) / 100.0
            
            # Add some signal data randomly
            signal = None
            if random.random() < 0.1:  # 10% chance of having a signal
                signal = "BUY" if random.random() > 0.5 else "SELL"
            
            # Calculate new value with the random change
            current_value = current_value * (1 + change)
            
            # Add the data point
            result.append({
                'timestamp': timestamps[i],
                'value': round(current_value, 2),
                'signal': signal
            })
        
        # Return in reverse order (oldest to newest)
        result.reverse()
        
        logger.info(f"Generated {len(result)} account history data points for timeframe {timeframe}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error generating account history: {str(e)}")
        return jsonify([])

@app.route('/')
def home():
    return jsonify({
        "message": "Standalone historical data API",
        "endpoints": [
            "/api/historical/<symbol>",
            "/api/account/history"
        ]
    })

if __name__ == '__main__':
    # Run on a different port to avoid conflicts
    logger.info("Starting standalone historical data API on port 5004")
    app.run(host='0.0.0.0', port=5004, debug=True) 