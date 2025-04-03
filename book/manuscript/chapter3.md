# Chapter 3: Understanding Trading Strategies

## Technical Analysis Fundamentals

Before implementing our trading strategies, it's essential to understand the core concepts of technical analysis that form their foundation.

### Technical Indicators Overview
Our trading bot implements several key technical indicators:

1. **Moving Averages**
   - Simple Moving Average (SMA)
   - Exponential Moving Average (EMA)
   - Used for trend identification

2. **Momentum Indicators**
   - Relative Strength Index (RSI)
   - MACD (Moving Average Convergence Divergence)
   - Stochastic Oscillator

3. **Volatility Indicators**
   - Average True Range (ATR)
   - Bollinger Bands
   - Used for risk management

4. **Trend Indicators**
   - Supertrend
   - Moving Average combinations
   - Trend direction and strength

## Base Strategy Implementation

### Base Strategy Class
```python
from abc import ABC, abstractmethod
from typing import Dict, Optional
import pandas as pd
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide

class BaseStrategy(ABC):
    def __init__(self, trading_client: TradingClient, 
                 data_client, symbol: str):
        """Initialize base strategy"""
        self.trading_client = trading_client
        self.data_client = data_client
        self.symbol = symbol
        self.position = None
        
    def update_position(self):
        """Update current position information"""
        try:
            self.position = self.trading_client.get_position(self.symbol)
        except Exception:
            self.position = None
            
    def get_historical_data(self, timeframe: str = '1Min', 
                           limit: int = 100) -> pd.DataFrame:
        """Get historical price data"""
        try:
            # Implementation in market_data.py
            pass
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return pd.DataFrame()
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals from data"""
        pass
        
    def calculate_position_size(self, capital: float, 
                              risk_per_trade: float,
                              entry_price: float,
                              stop_loss: float) -> float:
        """Calculate position size based on risk"""
        try:
            risk_amount = capital * (risk_per_trade / 100)
            risk_per_share = abs(entry_price - stop_loss)
            if risk_per_share > 0:
                return risk_amount / risk_per_share
            return 0
        except Exception as e:
            print(f"Error calculating position size: {e}")
            return 0
            
    def place_market_order(self, side: OrderSide, 
                          quantity: float,
                          take_profit: Optional[float] = None,
                          stop_loss: Optional[float] = None):
        """Place a market order with optional TP/SL"""
        try:
            # Implementation details
            pass
        except Exception as e:
            print(f"Error placing order: {e}")
            
    @abstractmethod
    def execute_strategy(self):
        """Execute the trading strategy"""
        pass
```

## Supertrend Strategy Implementation

### Supertrend Class
```python
from .base_strategy import BaseStrategy
from ..utils.indicators import calculate_supertrend
from alpaca.trading.enums import OrderSide

class SupertrendStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str,
                 atr_period: int = 10, multiplier: float = 3.0):
        """Initialize Supertrend strategy"""
        super().__init__(trading_client, data_client, symbol)
        self.atr_period = atr_period
        self.multiplier = multiplier
        
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals"""
        if data.empty:
            return {
                'signal': 'HOLD',
                'supertrend': None,
                'direction': None,
                'last_close': None
            }
            
        # Calculate Supertrend
        supertrend_data = calculate_supertrend(
            data, 
            period=self.atr_period,
            multiplier=self.multiplier
        )
        
        last_close = data['close'].iloc[-1]
        supertrend = supertrend_data['supertrend'].iloc[-1]
        direction = supertrend_data['direction'].iloc[-1]
        
        # Generate signal
        if direction == 1 and direction != supertrend_data['direction'].iloc[-2]:
            signal = 'BUY'
        elif direction == -1 and direction != supertrend_data['direction'].iloc[-2]:
            signal = 'SELL'
        else:
            signal = 'HOLD'
            
        return {
            'signal': signal,
            'supertrend': supertrend,
            'direction': direction,
            'last_close': last_close
        }
        
    def execute_strategy(self):
        """Execute the trading strategy"""
        try:
            # Get historical data
            data = self.get_historical_data()
            if data.empty:
                return
                
            # Generate signals
            signals = self.generate_signals(data)
            if signals['signal'] == 'HOLD':
                return
                
            # Update position info
            self.update_position()
            
            # Execute trades
            if signals['signal'] == 'BUY' and not self.position:
                # Calculate position size
                entry_price = signals['last_close']
                stop_loss = signals['supertrend']
                size = self.calculate_position_size(
                    capital=100000,  # Example value
                    risk_per_trade=1.0,
                    entry_price=entry_price,
                    stop_loss=stop_loss
                )
                
                if size > 0:
                    self.place_market_order(
                        side=OrderSide.BUY,
                        quantity=size,
                        stop_loss=stop_loss
                    )
                    
            elif signals['signal'] == 'SELL' and self.position:
                self.place_market_order(
                    side=OrderSide.SELL,
                    quantity=float(self.position.qty)
                )
                
        except Exception as e:
            print(f"Error executing Supertrend strategy: {e}")
```

## MACD Strategy Implementation

### MACD Class
```python
from .base_strategy import BaseStrategy
from ..utils.indicators import calculate_macd, calculate_rsi
from alpaca.trading.enums import OrderSide

class MACDStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str,
                 fast_period: int = 12, slow_period: int = 26,
                 signal_period: int = 9, rsi_period: int = 14):
        """Initialize MACD strategy"""
        super().__init__(trading_client, data_client, symbol)
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.signal_period = signal_period
        self.rsi_period = rsi_period
        
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals"""
        if data.empty:
            return {
                'signal': 'HOLD',
                'macd': None,
                'signal_line': None,
                'histogram': None,
                'rsi': None,
                'last_close': None
            }
            
        # Calculate MACD
        close = data['close']
        macd_line, signal_line, histogram = calculate_macd(
            close,
            self.fast_period,
            self.slow_period,
            self.signal_period
        )
        
        # Calculate RSI
        rsi = calculate_rsi(close, self.rsi_period)
        
        # Get latest values
        current_macd = macd_line.iloc[-1]
        current_signal = signal_line.iloc[-1]
        current_hist = histogram.iloc[-1]
        prev_hist = histogram.iloc[-2]
        current_rsi = rsi.iloc[-1]
        last_close = close.iloc[-1]
        
        # Generate signal
        signal = 'HOLD'
        
        # Buy conditions:
        # 1. MACD crosses above signal line
        # 2. RSI < 70 (not overbought)
        if (current_hist > 0 and prev_hist <= 0 and
            current_rsi < 70):
            signal = 'BUY'
            
        # Sell conditions:
        # 1. MACD crosses below signal line
        # 2. RSI > 30 (not oversold)
        elif (current_hist < 0 and prev_hist >= 0 and
              current_rsi > 30):
            signal = 'SELL'
            
        return {
            'signal': signal,
            'macd': current_macd,
            'signal_line': current_signal,
            'histogram': current_hist,
            'rsi': current_rsi,
            'last_close': last_close
        }
        
    def execute_strategy(self):
        """Execute the trading strategy"""
        try:
            # Get historical data
            data = self.get_historical_data()
            if data.empty:
                return
                
            # Generate signals
            signals = self.generate_signals(data)
            if signals['signal'] == 'HOLD':
                return
                
            # Update position info
            self.update_position()
            
            # Execute trades
            if signals['signal'] == 'BUY' and not self.position:
                # Calculate position size
                entry_price = signals['last_close']
                stop_loss = entry_price * 0.98  # 2% stop loss
                size = self.calculate_position_size(
                    capital=100000,  # Example value
                    risk_per_trade=1.0,
                    entry_price=entry_price,
                    stop_loss=stop_loss
                )
                
                if size > 0:
                    self.place_market_order(
                        side=OrderSide.BUY,
                        quantity=size,
                        stop_loss=stop_loss
                    )
                    
            elif signals['signal'] == 'SELL' and self.position:
                self.place_market_order(
                    side=OrderSide.SELL,
                    quantity=float(self.position.qty)
                )
                
        except Exception as e:
            print(f"Error executing MACD strategy: {e}")
```

## Strategy Comparison

### Key Differences
1. **Supertrend Strategy**
   - Trend-following approach
   - Uses ATR for volatility measurement
   - Clear trend direction signals
   - Dynamic stop-loss levels

2. **MACD Strategy**
   - Momentum-based approach
   - Combines with RSI for confirmation
   - Good for ranging markets
   - Fixed percentage stop-loss

### When to Use Each
- **Supertrend**: Strong trending markets
- **MACD**: Ranging or choppy markets
- Consider combining both for robust trading

## Strategy Combination

### Signal Weighting
```python
class CombinedStrategy(BaseStrategy):
    def __init__(self, supertrend_weight: float = 0.5,
                 macd_weight: float = 0.5):
        self.supertrend = SupertrendStrategy()
        self.macd = MACDStrategy()
        self.weights = {
            'supertrend': supertrend_weight,
            'macd': macd_weight
        }
        
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """
        Generate combined trading signals
        """
        supertrend_signals = self.supertrend.generate_signals(data)
        macd_signals = self.macd.generate_signals(data)
        
        # Combine signals using weights
        combined = (supertrend_signals * self.weights['supertrend'] +
                   macd_signals * self.weights['macd'])
        
        # Threshold for final signals
        signals = pd.Series(0, index=data.index)
        signals[combined > 0.5] = 1
        signals[combined < -0.5] = -1
        
        return signals
```

## Risk Management Integration

### Position Sizing
```python
def calculate_position_size(self, data: pd.DataFrame,
                          capital: float,
                          max_risk: float = 0.02) -> float:
    """
    Calculate position size using both strategies
    """
    # Get individual position sizes
    st_size = self.supertrend.calculate_position_size(
        data, capital, max_risk
    )
    macd_size = self.macd.calculate_position_size(
        data, capital, max_risk
    )
    
    # Use weighted average
    position_size = (st_size * self.weights['supertrend'] +
                    macd_size * self.weights['macd'])
    
    return position_size
```

## Strategy Optimization

### Backtesting Framework
1. Data Requirements
   - Historical price data
   - Volume data
   - Market conditions

2. Performance Metrics
   - Win rate
   - Profit factor
   - Maximum drawdown
   - Sharpe ratio

### Parameter Optimization
1. Grid Search
   ```python
   def optimize_parameters(data: pd.DataFrame, param_grid: dict) -> dict:
       """
       Find optimal strategy parameters
       """
       best_params = {}
       best_performance = 0
       
       for params in itertools.product(*param_grid.values()):
           # Test strategy with these parameters
           performance = backtest_strategy(data, dict(zip(param_grid.keys(), params)))
           if performance > best_performance:
               best_performance = performance
               best_params = dict(zip(param_grid.keys(), params))
       
       return best_params
   ```

2. Walk-Forward Analysis
   - In-sample testing
   - Out-of-sample validation
   - Parameter stability

## Next Steps

In Chapter 4, we'll explore:
- Building the trading engine
- Implementing order management
- Handling real-time data
- Managing multiple strategies

Key Takeaways:
- Technical analysis provides trade signals
- Multiple strategies improve reliability
- Risk management is crucial
- Strategy combination reduces risk

Remember that successful trading requires both technical expertise and disciplined execution. In the next chapter, we'll build upon these concepts to create a more sophisticated trading system. 