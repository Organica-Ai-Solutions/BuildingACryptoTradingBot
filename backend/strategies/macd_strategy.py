import pandas as pd
import numpy as np
from typing import Dict
from .base_strategy import BaseStrategy
from alpaca.trading.enums import OrderSide

class MACDStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str,
                 ema_period: int = 9,
                 macd_fast: int = 12,
                 macd_slow: int = 26,
                 macd_signal: int = 9,
                 rsi_period: int = 14):
        super().__init__(trading_client, data_client, symbol)
        self.ema_period = ema_period
        self.macd_fast = macd_fast
        self.macd_slow = macd_slow
        self.macd_signal = macd_signal
        self.rsi_period = rsi_period

    def calculate_ema(self, data: pd.Series, period: int) -> pd.Series:
        """Calculate Exponential Moving Average"""
        return data.ewm(span=period, adjust=False).mean()

    def calculate_macd(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate MACD indicator"""
        close = data['close']
        
        # Calculate MACD line
        fast_ema = self.calculate_ema(close, self.macd_fast)
        slow_ema = self.calculate_ema(close, self.macd_slow)
        macd_line = fast_ema - slow_ema
        
        # Calculate Signal line
        signal_line = self.calculate_ema(macd_line, self.macd_signal)
        
        # Calculate MACD histogram
        histogram = macd_line - signal_line
        
        return pd.DataFrame({
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        })

    def calculate_rsi(self, data: pd.DataFrame) -> pd.Series:
        """Calculate RSI indicator"""
        close = data['close']
        delta = close.diff()
        
        gain = (delta.where(delta > 0, 0)).rolling(window=self.rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.rsi_period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi

    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals based on MACD and RSI"""
        if len(data) < max(self.macd_slow, self.rsi_period):
            return {
                'signal': 'HOLD',
                'macd': None,
                'signal_line': None,
                'histogram': None,
                'rsi': None,
                'close': data['close'].iloc[-1] if not data.empty else None
            }
        
        # Calculate indicators
        macd_data = self.calculate_macd(data)
        rsi = self.calculate_rsi(data)
        
        # Get current values
        current_macd = macd_data['macd'].iloc[-1]
        current_signal = macd_data['signal'].iloc[-1]
        current_hist = macd_data['histogram'].iloc[-1]
        prev_hist = macd_data['histogram'].iloc[-2] if len(macd_data) > 1 else 0
        current_rsi = rsi.iloc[-1]
        
        # Generate signal
        signal = 'HOLD'
        
        # MACD crossover and RSI confirmation
        if current_hist > 0 and current_hist > prev_hist:
            if current_rsi < 70:  # Not overbought
                signal = 'BUY'
        elif current_hist < 0 and current_hist < prev_hist:
            if current_rsi > 30:  # Not oversold
                signal = 'SELL'
        
        return {
            'signal': signal,
            'macd': current_macd,
            'signal_line': current_signal,
            'histogram': current_hist,
            'rsi': current_rsi,
            'close': data['close'].iloc[-1]
        }

    def execute_strategy(self, capital: float = 10000, risk_per_trade: float = 0.02):
        """Execute the MACD strategy"""
        try:
            # Get historical data
            data = self.get_historical_data(timeframe='1Min', limit=100)
            if data.empty:
                return
            
            # Generate signals
            signals = self.generate_signals(data)
            
            # Update position info
            self.update_position()
            
            # Calculate position size
            position_size = self.calculate_position_size(capital, risk_per_trade)
            
            # Execute trades based on signals
            if signals['signal'] == 'BUY' and (self.position is None or float(self.position.qty) <= 0):
                # Calculate stop loss and take profit
                entry_price = signals['close']
                stop_loss = entry_price * 0.98  # 2% stop loss
                take_profit = entry_price * 1.04  # 4% take profit (2:1 reward-risk ratio)
                
                return self.place_market_order(
                    side=OrderSide.BUY,
                    qty=position_size,
                    take_profit=take_profit,
                    stop_loss=stop_loss
                )
                
            elif signals['signal'] == 'SELL' and self.position is not None and float(self.position.qty) > 0:
                return self.place_market_order(
                    side=OrderSide.SELL,
                    qty=float(self.position.qty)
                )
            
            return False
            
        except Exception as e:
            print(f"Error executing MACD strategy: {e}")
            return False 