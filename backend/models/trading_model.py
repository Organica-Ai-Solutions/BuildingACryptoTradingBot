from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Strategy(Base):
    __tablename__ = 'strategies'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200))  # Add a name field for better identification
    symbol = Column(String(20), nullable=False)
    type = Column(String(50), nullable=False)
    parameters = Column(String(1000))  # JSON string of strategy parameters
    capital = Column(Float, nullable=False)
    risk_per_trade = Column(Float, nullable=False)
    current_signal = Column(String(10), default='NEUTRAL')
    position_size = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trades = relationship("Trade", back_populates="strategy")

    def to_dict(self):
        """Convert strategy to dictionary."""
        return {
            'id': self.id,
            'name': self.name or f"{self.type} Strategy - {self.symbol}",
            'symbol': self.symbol,
            'type': self.type,
            'parameters': self.parameters,
            'capital': self.capital,
            'risk_per_trade': self.risk_per_trade,
            'current_signal': self.current_signal,
            'position_size': self.position_size,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Trade(Base):
    __tablename__ = 'trades'
    
    id = Column(Integer, primary_key=True)
    strategy_id = Column(Integer, ForeignKey('strategies.id'))
    symbol = Column(String(20), nullable=False)
    side = Column(String(4), nullable=False)  # 'buy' or 'sell'
    qty = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    pnl = Column(Float)  # Realized profit/loss
    transaction_time = Column(DateTime, default=datetime.utcnow)
    strategy_type = Column(String(50))
    
    # Relationships
    strategy = relationship("Strategy", back_populates="trades")

    def to_dict(self):
        """Convert trade to dictionary."""
        return {
            'id': self.id,
            'strategy_id': self.strategy_id,
            'symbol': self.symbol,
            'side': self.side,
            'qty': self.qty,
            'price': self.price,
            'pnl': self.pnl,
            'transaction_time': self.transaction_time.isoformat()
        }

class PortfolioSnapshot(Base):
    __tablename__ = 'portfolio_snapshots'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    portfolio_value = Column(Float, nullable=False)
    cash = Column(Float, nullable=False)
    positions_value = Column(Float, nullable=False)
    pnl_day = Column(Float)  # Daily profit/loss
    pnl_total = Column(Float)  # Total profit/loss

    # Create index for faster queries
    __table_args__ = (
        Index('idx_timestamp', 'timestamp'),
    )

    def to_dict(self):
        """Convert portfolio snapshot to dictionary."""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'portfolio_value': self.portfolio_value,
            'cash': self.cash,
            'positions_value': self.positions_value,
            'pnl_day': self.pnl_day,
            'pnl_total': self.pnl_total
        } 