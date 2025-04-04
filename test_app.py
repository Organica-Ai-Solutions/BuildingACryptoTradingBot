from flask import Flask, jsonify, request
import pandas as pd
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

def generate_mock_data(symbol, timeframe, limit):
    """Generate mock data for testing"""
    timestamps = []
    end_time = datetime.now()
    
    # Generate timestamps
    for i in range(limit):
        timestamps.append(end_time - timedelta(days=i))
    
    # Generate prices
    base_price = 45000 if 'BTC' in symbol else 2000
    prices = [base_price * (1 + 0.01 * (i - limit/2) / limit) for i in range(limit)]
    
    # Generate OHLCV data
    data = []
    for i in range(limit):
        data.append({
            'timestamp': timestamps[i].isoformat(),
            'open': prices[i] * 0.99,
            'high': prices[i] * 1.02,
            'low': prices[i] * 0.98,
            'close': prices[i],
            'volume': base_price * 1000
        })
    
    return data

@app.route('/api/historical/<symbol>')
def get_historical(symbol):
    """Get historical data for a symbol"""
    try:
        timeframe = request.args.get('timeframe', '1d')
        limit = int(request.args.get('limit', 100))
        
        symbol = symbol.replace('%2F', '/')
        logger.info(f"Historical data request for {symbol}, timeframe {timeframe}, limit {limit}")
        
        data = generate_mock_data(symbol, timeframe, limit)
        logger.info(f"Returning {len(data)} data points")
        
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify([]), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, debug=True) 