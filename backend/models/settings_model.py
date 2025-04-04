from sqlalchemy import Column, Integer, Float, Boolean, String, DateTime
from .database import Base
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv
import base64
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize encryption key
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    # Generate a 32-byte key and encode it properly for Fernet
    key = base64.urlsafe_b64encode(os.urandom(32))
    ENCRYPTION_KEY = key.decode()
    os.environ['ENCRYPTION_KEY'] = ENCRYPTION_KEY

cipher_suite = Fernet(ENCRYPTION_KEY.encode())

logger = logging.getLogger(__name__)

class Settings(Base):
    __tablename__ = 'settings'
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    
    # Trading Environment
    is_paper_trading = Column(Boolean, default=True)
    
    # API Credentials (encrypted)
    paper_api_key = Column(String(1000))
    paper_api_secret = Column(String(1000))
    live_api_key = Column(String(1000))
    live_api_secret = Column(String(1000))
    
    # Trading Settings
    max_position_size = Column(Float, default=20.0)  # Percentage of portfolio
    risk_per_trade = Column(Float, default=2.0)  # Percentage risk per trade
    stop_loss_percent = Column(Float, default=2.0)  # Default stop loss percentage
    take_profit_percent = Column(Float, default=4.0)  # Default take profit percentage
    max_open_trades = Column(Integer, default=3)  # Maximum number of open trades
    trailing_stop_percent = Column(Float, default=1.0)  # Trailing stop percentage
    update_interval = Column(Integer, default=60)  # Update interval in seconds
    
    # Notification Settings
    email_notifications = Column(Boolean, default=False)
    email_address = Column(String(255))
    notify_trades = Column(Boolean, default=True)
    notify_signals = Column(Boolean, default=True)
    notify_errors = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def encrypt_value(self, value):
        """Encrypt a value."""
        if not value:
            return None
        return cipher_suite.encrypt(value.encode()).decode()

    def decrypt_value(self, encrypted_value):
        """Decrypt a value."""
        if not encrypted_value:
            return None
        try:
            return cipher_suite.decrypt(encrypted_value.encode()).decode()
        except:
            return None

    def get_api_credentials(self, is_paper=None):
        """Get API credentials for the given environment.
        
        Args:
            is_paper: Whether to get paper trading credentials.
                     If None, use the current environment.
        
        Returns:
            Dictionary with api_key and api_secret.
        """
        # If is_paper is not provided, use the current environment setting
        if is_paper is None:
            is_paper = self.is_paper_trading
            
        api_key = None
        api_secret = None
        
        if is_paper:
            api_key = self.paper_api_key
            if self.paper_api_secret:
                api_secret = self.decrypt_value(self.paper_api_secret)
        else:
            api_key = self.live_api_key
            if self.live_api_secret:
                api_secret = self.decrypt_value(self.live_api_secret)
        
        # Check for API key in environment if not found in database
        if not api_key:
            # Try to get from environment variables
            api_key = os.getenv('ALPACA_API_KEY')
            
        if not api_secret:
            # Try to get from environment variables
            api_secret = os.getenv('ALPACA_API_SECRET')
        
        return {
            'api_key': api_key,
            'api_secret': api_secret
        }

    def set_api_credentials(self, is_paper: bool, api_key: str, api_secret: str):
        """Set API credentials with encryption."""
        if is_paper:
            self.paper_api_key = self.encrypt_value(api_key)
            self.paper_api_secret = self.encrypt_value(api_secret)
        else:
            self.live_api_key = self.encrypt_value(api_key)
            self.live_api_secret = self.encrypt_value(api_secret)

    def to_dict(self):
        """Convert settings to dictionary."""
        logger.info("Converting settings to dictionary")
        
        # Get both paper and live credentials
        paper_creds = {
            'api_key': self.decrypt_value(self.paper_api_key),
            'api_secret': self.decrypt_value(self.paper_api_secret)
        }
        
        live_creds = {
            'api_key': self.decrypt_value(self.live_api_key),
            'api_secret': self.decrypt_value(self.live_api_secret)
        }
        
        return {
            'tradingEnvironment': 'paper' if self.is_paper_trading else 'live',
            'paperTrading': {
                'apiKey': paper_creds['api_key'] or '',
                'apiSecret': '********' if paper_creds['api_secret'] else ''
            },
            'liveTrading': {
                'apiKey': live_creds['api_key'] or '',
                'apiSecret': '********' if live_creds['api_secret'] else ''
            },
            'maxPositionSize': self.max_position_size,
            'riskPerTrade': self.risk_per_trade,
            'stopLossPercent': self.stop_loss_percent,
            'takeProfitPercent': self.take_profit_percent,
            'maxOpenTrades': self.max_open_trades,
            'trailingStopPercent': self.trailing_stop_percent,
            'emailNotifications': self.email_notifications,
            'emailAddress': self.email_address,
            'notifyTrades': self.notify_trades,
            'notifySignals': self.notify_signals,
            'notifyErrors': self.notify_errors,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def from_dict(cls, data):
        """Create or update settings from dictionary."""
        logger.info("Creating or updating settings from dictionary")
        settings = cls()
        settings.is_paper_trading = data.get('tradingEnvironment', 'paper') == 'paper'
        
        # Handle API credentials
        paper_trading = data.get('paperTrading', {})
        live_trading = data.get('liveTrading', {})
        
        if paper_trading.get('apiKey'):
            settings.set_api_credentials(
                True,
                paper_trading['apiKey'],
                paper_trading.get('apiSecret') if paper_trading.get('apiSecret') != '********' else None
            )
            
        if live_trading.get('apiKey'):
            settings.set_api_credentials(
                False,
                live_trading['apiKey'],
                live_trading.get('apiSecret') if live_trading.get('apiSecret') != '********' else None
            )
        
        settings.max_position_size = float(data.get('maxPositionSize', 20.0))
        settings.risk_per_trade = float(data.get('riskPerTrade', 2.0))
        settings.stop_loss_percent = float(data.get('stopLossPercent', 2.0))
        settings.take_profit_percent = float(data.get('takeProfitPercent', 4.0))
        settings.max_open_trades = int(data.get('maxOpenTrades', 3))
        settings.trailing_stop_percent = float(data.get('trailingStopPercent', 1.0))
        settings.email_notifications = bool(data.get('emailNotifications', False))
        settings.email_address = data.get('emailAddress', '')
        settings.notify_trades = bool(data.get('notifyTrades', True))
        settings.notify_signals = bool(data.get('notifySignals', True))
        settings.notify_errors = bool(data.get('notifyErrors', True))
        
        return settings 