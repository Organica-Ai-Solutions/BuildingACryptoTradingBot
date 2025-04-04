from sqlalchemy import Column, Integer, Float, String, DateTime
from .database import Base

class Trade(Base):
    """Model for tracking trades."""
    __tablename__ = 'trades'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # BUY or SELL
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    pnl = Column(Float, nullable=True)  # Realized P&L for SELL trades
    strategy = Column(String, nullable=True)  # Strategy that generated the trade
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'symbol': self.symbol,
            'side': self.side,
            'quantity': float(self.quantity),
            'price': float(self.price),
            'pnl': float(self.pnl) if self.pnl is not None else None,
            'strategy': self.strategy
        } 