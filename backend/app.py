from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
import os
from dotenv import load_dotenv
from .api_routes import api_blueprint, init_engine
from .models.database import init_db

# Load environment variables
load_dotenv()

# Get API keys from environment variables
ALPACA_API_KEY = os.getenv('ALPACA_API_KEY')
ALPACA_SECRET_KEY = os.getenv('ALPACA_SECRET_KEY')
USE_PAPER = os.getenv('USE_PAPER', 'true').lower() == 'true'

# Initialize Flask app
app = Flask(__name__, 
           template_folder='../frontend/templates',
           static_folder='../frontend/static')

# Enable CORS
CORS(app)

# Initialize database
init_db()

# Initialize trading engine with API keys
trading_engine = init_engine(ALPACA_API_KEY, ALPACA_SECRET_KEY, USE_PAPER)

# Register the API blueprint
app.register_blueprint(api_blueprint, url_prefix='/api')

# Dashboard routes
@app.route('/')
def index():
    """Render the main dashboard page."""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Render the enhanced dashboard page."""
    return render_template('dashboard.html')

@app.route('/strategies')
def strategies_page():
    """Render the strategies page."""
    return render_template('strategies.html')

@app.route('/settings')
def settings_page():
    """Render the settings page."""
    return render_template('settings.html')

@app.route('/history')
def history_page():
    """Render the trade history page."""
    return render_template('history.html')

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return jsonify({"error": "Page not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 