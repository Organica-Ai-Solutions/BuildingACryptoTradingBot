from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from .database import Base

class Account(Base):
    """Model for tracking account information."""
    __tablename__ = 'accounts'
    
    id = Column(Integer, primary_key=True)
    account_id = Column(String, nullable=True)  # Exchange account ID
    timestamp = Column(DateTime, nullable=False)
    cash = Column(Float, nullable=False, default=0.0)
    portfolio_value = Column(Float, nullable=False, default=0.0)
    buying_power = Column(Float, nullable=False, default=0.0)
    equity = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default='ACTIVE')  # ACTIVE, CLOSED, SUSPENDED
    day_trades_remaining = Column(Integer, nullable=True)
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'account_id': self.account_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'cash': float(self.cash) if self.cash is not None else 0.0,
            'portfolio_value': float(self.portfolio_value) if self.portfolio_value is not None else 0.0,
            'buying_power': float(self.buying_power) if self.buying_power is not None else 0.0,
            'equity': float(self.equity) if self.equity is not None else 0.0,
            'status': self.status,
            'day_trades_remaining': self.day_trades_remaining
        } 