from sqlalchemy import Column, Integer, Float, DateTime
from .database import Base

class PortfolioHistory(Base):
    """Model for tracking portfolio value history."""
    __tablename__ = 'portfolio_history'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    value = Column(Float, nullable=False)
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'value': float(self.value)
        } 