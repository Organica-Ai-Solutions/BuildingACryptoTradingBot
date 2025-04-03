from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Strategy(Base):
    __tablename__ = 'strategies'
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False)
    type = Column(String(50), nullable=False)
    parameters = Column(String, nullable=False)  # JSON string
    capital = Column(Float, nullable=False)
    risk_per_trade = Column(Float, nullable=False)
    current_signal = Column(String(10), default='NEUTRAL')
    position_size = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Trade(Base):
    __tablename__ = 'trades'
    
    id = Column(Integer, primary_key=True)
    strategy_id = Column(Integer, ForeignKey('strategies.id'))
    symbol = Column(String(20), nullable=False)
    side = Column(String(4), nullable=False)  # BUY or SELL
    qty = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    transaction_time = Column(DateTime, default=datetime.utcnow)
    strategy_type = Column(String(50))
    pnl = Column(Float)  # For completed trades
    
class PortfolioSnapshot(Base):
    __tablename__ = 'portfolio_snapshots'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    portfolio_value = Column(Float, nullable=False)
    cash = Column(Float, nullable=False)
    positions_value = Column(Float, nullable=False)
    daily_pnl = Column(Float)
    total_pnl = Column(Float) 