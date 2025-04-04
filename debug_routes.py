from flask import Flask, jsonify
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/')
def index():
    return "Hello, World!"

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/api/historical/<symbol>')
def historical(symbol):
    logger.info(f"Historical data requested for {symbol}")
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
        }
    ]
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, debug=True) 