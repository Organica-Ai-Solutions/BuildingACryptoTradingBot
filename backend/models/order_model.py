from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from .database import Base

class Order(Base):
    """Model for tracking trading orders."""
    __tablename__ = 'orders'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(String, nullable=True)  # Exchange order ID
    timestamp = Column(DateTime, nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # BUY or SELL
    type = Column(String, nullable=False)  # MARKET, LIMIT, etc.
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True)  # For limit orders
    status = Column(String, nullable=False)  # OPEN, FILLED, CANCELED, REJECTED
    filled_qty = Column(Float, nullable=True)
    filled_price = Column(Float, nullable=True)
    strategy = Column(String, nullable=True)  # Strategy that generated the order
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'order_id': self.order_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'symbol': self.symbol,
            'side': self.side,
            'type': self.type,
            'quantity': float(self.quantity) if self.quantity is not None else None,
            'price': float(self.price) if self.price is not None else None,
            'status': self.status,
            'filled_qty': float(self.filled_qty) if self.filled_qty is not None else None,
            'filled_price': float(self.filled_price) if self.filled_price is not None else None,
            'strategy': self.strategy
        } 