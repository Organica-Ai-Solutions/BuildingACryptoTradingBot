from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import logging
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a simple app
app = Flask(__name__)

@app.route('/historical/<symbol>')
@app.route('/api/historical/<symbol>')
def get_historical_data(symbol):
    """Simple endpoint to return historical price data"""
    try:
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

@app.route('/')
def home():
    return jsonify({"message": "Standalone historical data API - Use /api/historical/<symbol>"})

if __name__ == '__main__':
    # Run on a different port to avoid conflicts
    app.run(host='0.0.0.0', port=5004, debug=True) 