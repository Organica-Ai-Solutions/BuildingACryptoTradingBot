import pandas as pd
import numpy as np
from typing import Dict, Optional
from .base_strategy import BaseStrategy
from alpaca.trading.enums import OrderSide

class SupertrendStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str, 
                 atr_period: int = 10, multiplier: float = 3.0):
        super().__init__(trading_client, data_client, symbol)
        self.atr_period = atr_period
        self.multiplier = multiplier

    def calculate_supertrend(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate Supertrend indicator"""
        high = data['high']
        low = data['low']
        close = data['close']
        
        # Calculate True Range
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Calculate ATR
        atr = tr.ewm(alpha=1/self.atr_period).mean()
        
        # Calculate Supertrend
        hl2 = (high + low) / 2
        upperband = hl2 + (self.multiplier * atr)
        lowerband = hl2 - (self.multiplier * atr)
        
        supertrend = pd.Series(index=data.index)
        direction = pd.Series(index=data.index)
        
        for i in range(len(data)):
            if i == 0:
                supertrend.iloc[i] = upperband.iloc[i]
                direction.iloc[i] = 1
            else:
                if close.iloc[i-1] <= supertrend.iloc[i-1]:
                    if lowerband.iloc[i] > supertrend.iloc[i-1]:
                        supertrend.iloc[i] = supertrend.iloc[i-1]
                    else:
                        supertrend.iloc[i] = lowerband.iloc[i]
                    direction.iloc[i] = -1
                else:
                    if upperband.iloc[i] < supertrend.iloc[i-1]:
                        supertrend.iloc[i] = supertrend.iloc[i-1]
                    else:
                        supertrend.iloc[i] = upperband.iloc[i]
                    direction.iloc[i] = 1
        
        return pd.DataFrame({
            'supertrend': supertrend,
            'direction': direction
        })

    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals based on Supertrend indicator"""
        if len(data) < self.atr_period:
            return {
                'signal': 'HOLD',
                'supertrend': None,
                'direction': None,
                'close': data['close'].iloc[-1] if not data.empty else None
            }
        
        # Calculate Supertrend
        st_data = self.calculate_supertrend(data)
        current_close = data['close'].iloc[-1]
        current_direction = st_data['direction'].iloc[-1]
        prev_direction = st_data['direction'].iloc[-2] if len(st_data) > 1 else None
        
        # Generate signal
        signal = 'HOLD'
        if prev_direction is not None:
            if current_direction == 1 and prev_direction == -1:
                signal = 'BUY'
            elif current_direction == -1 and prev_direction == 1:
                signal = 'SELL'
        
        return {
            'signal': signal,
            'supertrend': st_data['supertrend'].iloc[-1],
            'direction': current_direction,
            'close': current_close
        }

    def execute_strategy(self, capital: float = 10000, risk_per_trade: float = 0.02):
        """Execute the Supertrend strategy"""
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
                stop_loss = signals['supertrend']  # Use Supertrend level as stop loss
                take_profit = entry_price + (entry_price - stop_loss) * 2  # 2:1 reward-risk ratio
                
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
            print(f"Error executing Supertrend strategy: {e}")
            return False 