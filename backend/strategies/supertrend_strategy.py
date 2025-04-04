import pandas as pd
import numpy as np
from typing import Dict, Optional, List
import logging
from datetime import datetime, timedelta
from backend.strategies.base_strategy import BaseStrategy
from alpaca.trading.enums import OrderSide

class SupertrendStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str, 
                 atr_period: int = 10, multiplier: float = 3.0,
                 volume_threshold: float = 1.5, trends_required: int = 2):
        """
        Initialize the Supertrend strategy with parameters.
        
        Args:
            trading_client: The Alpaca trading client
            data_client: The Alpaca data client
            symbol: The trading symbol
            atr_period: Period for ATR calculation (default: 10)
            multiplier: ATR multiplier for Supertrend bands (default: 3.0)
            volume_threshold: Minimum volume ratio for confirmation (default: 1.5)
            trends_required: Number of consecutive trend direction bars required (default: 2)
        """
        super().__init__(trading_client, data_client, symbol)
        self.atr_period = atr_period
        self.multiplier = multiplier
        self.volume_threshold = volume_threshold
        self.trends_required = trends_required
        self.last_signal_time = None
        self.signal_cooldown = timedelta(hours=1)  # Avoid excessive trading
        self.logger = logging.getLogger(__name__)
        self.performance_tracking = {
            'signals': [],
            'trades': [],
            'win_rate': 0,
            'avg_profit': 0
        }
        
        # Dynamic parameter adjustments
        self.dynamic_params = True
        self.market_regime = 'neutral'  # Can be 'trending', 'volatile', or 'neutral'
        self.optimize_period = 30  # Days between parameter optimization

    def calculate_supertrend(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate Supertrend indicator with optional dynamic adjustments"""
        if self.dynamic_params:
            # Adjust parameters based on market regime
            volatility = data['close'].pct_change().std() * 100
            if volatility > 3.0:  # High volatility
                self.market_regime = 'volatile'
                self.multiplier = max(3.5, self.multiplier)  # Increase multiplier to reduce false signals
            elif volatility < 1.0:  # Low volatility
                self.market_regime = 'trending'
                self.multiplier = min(2.5, self.multiplier)  # Decrease multiplier to be more sensitive
            else:
                self.market_regime = 'neutral'
                self.multiplier = 3.0  # Default value
                
            self.logger.info(f"Market regime: {self.market_regime}, Volatility: {volatility:.2f}%, Multiplier: {self.multiplier}")
            
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
        
        # Calculate trend strength
        trend_strength = pd.Series(index=data.index)
        for i in range(len(data)):
            if i < self.trends_required:
                trend_strength.iloc[i] = 0
            else:
                # Count consecutive same direction
                count = 1
                curr_dir = direction.iloc[i]
                for j in range(i-1, max(0, i-self.atr_period), -1):
                    if direction.iloc[j] == curr_dir:
                        count += 1
                    else:
                        break
                trend_strength.iloc[i] = count
                
        return pd.DataFrame({
            'supertrend': supertrend,
            'direction': direction,
            'trend_strength': trend_strength,
            'atr': atr
        })

    def calculate_volume_ratio(self, data: pd.DataFrame) -> pd.Series:
        """Calculate volume ratio compared to average volume"""
        if len(data) < 20:
            return pd.Series(1.0, index=data.index)
            
        # Calculate average volume over the last 20 periods
        avg_volume = data['volume'].rolling(window=20).mean()
        
        # Calculate volume ratio
        volume_ratio = data['volume'] / avg_volume
        
        return volume_ratio

    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals based on Supertrend indicator with confirmations"""
        if len(data) < self.atr_period:
            return {
                'signal': 'HOLD',
                'supertrend': None,
                'direction': None,
                'close': data['close'].iloc[-1] if not data.empty else None,
                'confidence': 0
            }
        
        # Calculate Supertrend
        st_data = self.calculate_supertrend(data)
        
        # Calculate volume confirmation
        volume_ratio = self.calculate_volume_ratio(data)
        
        current_close = data['close'].iloc[-1]
        current_direction = st_data['direction'].iloc[-1]
        prev_direction = st_data['direction'].iloc[-2] if len(st_data) > 1 else None
        current_trend_strength = st_data['trend_strength'].iloc[-1]
        current_volume_ratio = volume_ratio.iloc[-1] if not volume_ratio.empty else 1.0
        
        # Check for signal cooldown
        current_time = datetime.now()
        if self.last_signal_time and (current_time - self.last_signal_time) < self.signal_cooldown:
            return {
                'signal': 'HOLD',
                'reason': 'Signal cooldown active',
                'supertrend': st_data['supertrend'].iloc[-1],
                'direction': current_direction,
                'close': current_close,
                'confidence': 0
            }
        
        # Generate signal
        signal = 'HOLD'
        confidence = 0
        reason = 'No signal'
        
        if prev_direction is not None:
            # Check for trend direction change with confirmation
            if current_direction == 1 and prev_direction == -1:
                # Potential buy signal
                if current_trend_strength >= self.trends_required and current_volume_ratio >= self.volume_threshold:
                    signal = 'BUY'
                    confidence = min(1.0, (current_trend_strength / 10) * (current_volume_ratio / self.volume_threshold))
                    reason = f"Trend reversal up: strength={current_trend_strength}, volume={current_volume_ratio:.2f}x"
                    
                    # Update last signal time
                    self.last_signal_time = current_time
                    
            elif current_direction == -1 and prev_direction == 1:
                # Potential sell signal
                if current_trend_strength >= self.trends_required and current_volume_ratio >= self.volume_threshold:
                    signal = 'SELL'
                    confidence = min(1.0, (current_trend_strength / 10) * (current_volume_ratio / self.volume_threshold))
                    reason = f"Trend reversal down: strength={current_trend_strength}, volume={current_volume_ratio:.2f}x"
                    
                    # Update last signal time
                    self.last_signal_time = current_time
                    
        # Track the signal for performance monitoring
        self.performance_tracking['signals'].append({
            'timestamp': current_time,
            'signal': signal,
            'price': current_close,
            'confidence': confidence
        })
        
        # Trim signals history
        if len(self.performance_tracking['signals']) > 100:
            self.performance_tracking['signals'] = self.performance_tracking['signals'][-100:]
        
        return {
            'signal': signal,
            'reason': reason,
            'supertrend': st_data['supertrend'].iloc[-1],
            'direction': current_direction,
            'trend_strength': current_trend_strength,
            'volume_ratio': current_volume_ratio,
            'close': current_close,
            'confidence': confidence,
            'regime': self.market_regime
        }

    def execute_strategy(self, capital: float = 10000, risk_per_trade: float = 0.02):
        """Execute the enhanced Supertrend strategy"""
        try:
            # Get historical data with additional length for better indicators
            data = self.get_historical_data(timeframe='5Min', limit=200)
            if data.empty:
                self.logger.warning(f"No historical data available for {self.symbol}")
                return
            
            # Generate signals with enhanced confirmation
            signals = self.generate_signals(data)
            self.logger.info(f"Signal for {self.symbol}: {signals['signal']} ({signals.get('reason', 'No reason')}) - Confidence: {signals.get('confidence', 0):.2f}")
            
            # Update position info
            self.update_position()
            
            # Calculate position size
            position_size = self.calculate_position_size(capital, risk_per_trade)
            
            # Execute trades based on signals with confidence threshold
            if signals['signal'] == 'BUY' and signals.get('confidence', 0) >= 0.5 and (self.position is None or float(self.position.qty) <= 0):
                # Calculate stop loss and take profit
                entry_price = signals['close']
                stop_loss = signals['supertrend']  # Use Supertrend level as stop loss
                
                # Dynamic profit target based on market regime
                if self.market_regime == 'trending':
                    take_profit = entry_price + (entry_price - stop_loss) * 3  # 3:1 reward-risk in trending markets
                elif self.market_regime == 'volatile':
                    take_profit = entry_price + (entry_price - stop_loss) * 1.5  # 1.5:1 in volatile markets
                else:
                    take_profit = entry_price + (entry_price - stop_loss) * 2  # 2:1 in neutral markets
                
                self.logger.info(f"Placing BUY order for {self.symbol}: {position_size} @ {entry_price}")
                self.logger.info(f"Stop loss: {stop_loss}, Take profit: {take_profit}, Risk-Reward: {(take_profit-entry_price)/(entry_price-stop_loss):.2f}")
                
                # Track trade for performance monitoring
                self.performance_tracking['trades'].append({
                    'timestamp': datetime.now(),
                    'symbol': self.symbol,
                    'side': 'BUY',
                    'price': entry_price,
                    'stop_loss': stop_loss,
                    'take_profit': take_profit,
                    'quantity': position_size
                })
                
                return self.place_market_order(
                    side=OrderSide.BUY,
                    qty=position_size,
                    take_profit=take_profit,
                    stop_loss=stop_loss
                )
                
            elif signals['signal'] == 'SELL' and signals.get('confidence', 0) >= 0.5 and self.position is not None and float(self.position.qty) > 0:
                self.logger.info(f"Placing SELL order for {self.symbol}: {float(self.position.qty)} @ {signals['close']}")
                
                # Track trade exit for performance monitoring
                if self.position:
                    entry_price = float(self.position.avg_entry_price)
                    exit_price = signals['close']
                    quantity = float(self.position.qty)
                    pnl = (exit_price - entry_price) * quantity
                    pnl_percent = ((exit_price / entry_price) - 1) * 100
                    
                    self.performance_tracking['trades'].append({
                        'timestamp': datetime.now(),
                        'symbol': self.symbol,
                        'side': 'SELL',
                        'price': exit_price,
                        'quantity': quantity,
                        'pnl': pnl,
                        'pnl_percent': pnl_percent
                    })
                    
                    # Update win/loss statistics
                    all_trades = [t for t in self.performance_tracking['trades'] if t.get('pnl') is not None]
                    if all_trades:
                        wins = sum(1 for t in all_trades if t.get('pnl', 0) > 0)
                        self.performance_tracking['win_rate'] = wins / len(all_trades)
                        self.performance_tracking['avg_profit'] = sum(t.get('pnl_percent', 0) for t in all_trades) / len(all_trades)
                        
                        self.logger.info(f"Trade completed. Win rate: {self.performance_tracking['win_rate']:.2f}, Avg P&L: {self.performance_tracking['avg_profit']:.2f}%")
                
                return self.place_market_order(
                    side=OrderSide.SELL,
                    qty=float(self.position.qty)
                )
            
            # Check if optimization is needed based on performance
            self._check_optimization()
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error executing Supertrend strategy: {e}")
            return False
            
    def _check_optimization(self):
        """Check if strategy parameters need optimization based on performance"""
        # Only optimize if we have enough data
        if len(self.performance_tracking['trades']) < 5:
            return
            
        # Calculate current win rate and average profit
        completed_trades = [t for t in self.performance_tracking['trades'] if t.get('pnl') is not None]
        if not completed_trades:
            return
            
        win_rate = self.performance_tracking['win_rate']
        avg_profit = self.performance_tracking['avg_profit']
        
        # Poor performance triggers optimization
        if win_rate < 0.4 or avg_profit < 0:
            self.logger.info(f"Performance below threshold (Win rate: {win_rate:.2f}, Avg P&L: {avg_profit:.2f}%), adjusting parameters...")
            
            # Adjust multiplier
            if avg_profit < 0:
                # Increase multiplier to reduce false signals
                self.multiplier = min(5.0, self.multiplier + 0.5)
                self.logger.info(f"Adjusted multiplier to {self.multiplier} due to negative average profit")
            
            # Adjust trends required
            if win_rate < 0.4:
                # Increase required trend strength for more reliable signals
                self.trends_required = min(5, self.trends_required + 1)
                self.logger.info(f"Adjusted trends required to {self.trends_required} due to low win rate") 