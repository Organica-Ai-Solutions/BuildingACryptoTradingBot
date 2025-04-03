from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import os

# Get database URL from environment variable or use default SQLite database
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///crypto_trader.db')

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

# Create base class for models
Base = declarative_base()

def init_db():
    """Initialize the database, creating all tables."""
    # Import all models here
    from .trading_model import Strategy, Trade, PortfolioSnapshot
    
    # Create all tables
    Base.metadata.create_all(engine)

def get_session():
    """Get a new database session."""
    return Session() 