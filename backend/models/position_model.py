from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from .database import Base

class Position(Base):
    """Model for tracking trading positions."""
    __tablename__ = 'positions'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    symbol = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    avg_entry_price = Column(Float, nullable=False)
    market_value = Column(Float, nullable=True)
    unrealized_pl = Column(Float, nullable=True)  # Unrealized profit/loss
    unrealized_plpc = Column(Float, nullable=True)  # Unrealized profit/loss percent
    current_price = Column(Float, nullable=True)
    strategy = Column(String, nullable=True)  # Strategy that generated the position
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'symbol': self.symbol,
            'quantity': float(self.quantity) if self.quantity is not None else 0.0,
            'avg_entry_price': float(self.avg_entry_price) if self.avg_entry_price is not None else 0.0,
            'market_value': float(self.market_value) if self.market_value is not None else 0.0,
            'unrealized_pl': float(self.unrealized_pl) if self.unrealized_pl is not None else 0.0,
            'unrealized_plpc': float(self.unrealized_plpc) if self.unrealized_plpc is not None else 0.0,
            'current_price': float(self.current_price) if self.current_price is not None else 0.0,
            'strategy': self.strategy
        } 