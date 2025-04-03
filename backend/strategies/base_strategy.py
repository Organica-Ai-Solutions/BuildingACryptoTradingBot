from abc import ABC, abstractmethod
from typing import Dict, Optional
import pandas as pd
from alpaca.trading.client import TradingClient
from alpaca.data.historical import CryptoHistoricalDataClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

class BaseStrategy(ABC):
    def __init__(self, trading_client: TradingClient, data_client: CryptoHistoricalDataClient, symbol: str):
        self.trading_client = trading_client
        self.data_client = data_client
        self.symbol = symbol
        self.position = None
        self.update_position()

    def update_position(self):
        """Update current position information"""
        try:
            self.position = self.trading_client.get_position(self.symbol)
        except Exception:
            self.position = None

    def get_historical_data(self, timeframe: str = '1Min', limit: int = 100) -> pd.DataFrame:
        """Get historical price data"""
        try:
            bars = self.data_client.get_crypto_bars(
                symbol=self.symbol,
                timeframe=timeframe,
                limit=limit
            ).df
            
            return bars
        except Exception as e:
            print(f"Error getting historical data: {e}")
            return pd.DataFrame()

    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals from data"""
        pass

    def calculate_position_size(self, capital: float, risk_per_trade: float) -> float:
        """Calculate position size based on capital and risk"""
        try:
            # Get current price
            current_price = float(self.trading_client.get_latest_trade(self.symbol).price)
            
            # Calculate position size based on risk
            risk_amount = capital * risk_per_trade
            position_size = risk_amount / current_price
            
            return position_size
        except Exception as e:
            print(f"Error calculating position size: {e}")
            return 0.0

    def place_market_order(self, side: OrderSide, qty: float, 
                         take_profit: Optional[float] = None, 
                         stop_loss: Optional[float] = None) -> bool:
        """Place a market order with optional take profit and stop loss"""
        try:
            # Create market order
            order_data = MarketOrderRequest(
                symbol=self.symbol,
                qty=qty,
                side=side,
                time_in_force=TimeInForce.GTC
            )
            
            # Place the order
            order = self.trading_client.submit_order(order_data)
            
            # If take profit or stop loss is specified, place those orders
            if order.filled_qty > 0:
                if take_profit:
                    self.trading_client.submit_order(
                        MarketOrderRequest(
                            symbol=self.symbol,
                            qty=qty,
                            side=OrderSide.SELL if side == OrderSide.BUY else OrderSide.BUY,
                            time_in_force=TimeInForce.GTC,
                            take_profit={"limit_price": take_profit}
                        )
                    )
                
                if stop_loss:
                    self.trading_client.submit_order(
                        MarketOrderRequest(
                            symbol=self.symbol,
                            qty=qty,
                            side=OrderSide.SELL if side == OrderSide.BUY else OrderSide.BUY,
                            time_in_force=TimeInForce.GTC,
                            stop_loss={"stop_price": stop_loss}
                        )
                    )
            
            return True
        except Exception as e:
            print(f"Error placing order: {e}")
            return False

    @abstractmethod
    def execute_strategy(self, capital: float = 10000, risk_per_trade: float = 0.02):
        """Execute the trading strategy"""
        pass 