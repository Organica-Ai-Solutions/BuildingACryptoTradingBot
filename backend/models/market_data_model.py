from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class MarketData(Base):
    __tablename__ = 'market_data'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(10), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    
    def __repr__(self):
        return f"<MarketData(symbol='{self.symbol}', timestamp='{self.timestamp}', close={self.close})>" 