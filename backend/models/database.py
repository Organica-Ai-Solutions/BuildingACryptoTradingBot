from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session
import os
from dotenv import load_dotenv
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create database directory if it doesn't exist
os.makedirs('backend/data', exist_ok=True)

# Database URL
DATABASE_URL = 'sqlite:///backend/data/database.db'

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
db_session = scoped_session(sessionmaker(autocommit=False,
                                       autoflush=False,
                                       bind=engine))

# Base class for all models
Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    """Initialize the database."""
    try:
        # Import all models here
        from .settings_model import Settings
        from .trade import Trade
        from .portfolio_history import PortfolioHistory
        from .market_data import MarketData
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Create default settings if they don't exist
        session = get_session()
        try:
            settings = session.query(Settings).first()
            if not settings:
                logger.info("Creating default settings")
                settings = Settings(
                    is_paper_trading=True,
                    max_position_size=20.0,
                    risk_per_trade=2.0,
                    stop_loss_percent=2.0,
                    take_profit_percent=4.0,
                    max_open_trades=3,
                    trailing_stop_percent=1.0
                )
                session.add(settings)
                session.commit()
                logger.info("Default settings created successfully")
        except Exception as e:
            logger.error(f"Error creating default settings: {str(e)}")
            session.rollback()
        finally:
            session.close()
            
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False

def get_session():
    """Get a new database session."""
    return db_session()

def teardown_session(exception=None):
    """Remove the database session at the end of the request."""
    if exception:
        logger.error(f"Error during request, rolling back session: {exception}")
        db_session.rollback()
    db_session.remove()

# Initialize database on module import
try:
    init_db()
    logger.info("Database initialization completed")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    raise e 