from sqlalchemy import Column, Integer, Float, String, DateTime
from .database import Base

class MarketData(Base):
    """Model for storing market data."""
    __tablename__ = 'market_data'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    symbol = Column(String, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'symbol': self.symbol,
            'open': float(self.open),
            'high': float(self.high),
            'low': float(self.low),
            'close': float(self.close),
            'volume': float(self.volume)
        } 