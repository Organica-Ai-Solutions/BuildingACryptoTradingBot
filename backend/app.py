from flask import Flask, render_template
from flask_cors import CORS
from .api_routes import api_blueprint, init_engine
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__, 
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    # Initialize trading engine
    try:
        init_engine()
    except Exception as e:
        logger.error(f"Failed to initialize trading engine: {str(e)}")
    
    @app.route('/')
    def index():
        """Render the main dashboard page"""
        return render_template('index.html')
        
    @app.route('/dashboard')
    def dashboard():
        """Render the enhanced dashboard page"""
        return render_template('dashboard.html')
        
    @app.route('/strategies')
    def strategies():
        """Render the strategies page"""
        return render_template('strategies.html')
        
    @app.route('/settings')
    def settings():
        """Render the settings page"""
        return render_template('settings.html')
        
    @app.route('/history')
    def history():
        """Render the trade history page"""
        return render_template('history.html')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return {"error": "Resource not found"}, 404
        
    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error"}, 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001, debug=True) 