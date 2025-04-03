import pandas as pd
import numpy as np
from typing import Tuple, Dict

def calculate_ema(data: pd.Series, period: int) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return data.ewm(span=period, adjust=False).mean()

def calculate_sma(data: pd.Series, period: int) -> pd.Series:
    """Calculate Simple Moving Average"""
    return data.rolling(window=period).mean()

def calculate_rsi(data: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(data: pd.Series, fast_period: int = 12, 
                  slow_period: int = 26, signal_period: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Calculate MACD (Moving Average Convergence Divergence)"""
    fast_ema = calculate_ema(data, fast_period)
    slow_ema = calculate_ema(data, slow_period)
    
    macd_line = fast_ema - slow_ema
    signal_line = calculate_ema(macd_line, signal_period)
    histogram = macd_line - signal_line
    
    return macd_line, signal_line, histogram

def calculate_supertrend(df: pd.DataFrame, period: int = 10, multiplier: float = 3) -> Dict[str, pd.Series]:
    """Calculate Supertrend indicator"""
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Calculate True Range
    tr1 = pd.DataFrame(high - low)
    tr2 = pd.DataFrame(abs(high - close.shift(1)))
    tr3 = pd.DataFrame(abs(low - close.shift(1)))
    frames = [tr1, tr2, tr3]
    tr = pd.concat(frames, axis=1, join='inner').max(axis=1)
    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    
    # Calculate Supertrend
    upperband = (high + low) / 2 + multiplier * atr
    lowerband = (high + low) / 2 - multiplier * atr
    
    supertrend = pd.Series(0.0, index=df.index)
    direction = pd.Series(1, index=df.index)
    
    for i in range(1, len(df.index)):
        if close[i] > upperband[i-1]:
            direction[i] = 1
        elif close[i] < lowerband[i-1]:
            direction[i] = -1
        else:
            direction[i] = direction[i-1]
            
        if direction[i] == 1 and lowerband[i] < lowerband[i-1]:
            lowerband[i] = lowerband[i-1]
        if direction[i] == -1 and upperband[i] > upperband[i-1]:
            upperband[i] = upperband[i-1]
        
        if direction[i] == 1:
            supertrend[i] = lowerband[i]
        else:
            supertrend[i] = upperband[i]
    
    return {
        'supertrend': supertrend,
        'direction': direction,
        'upperband': upperband,
        'lowerband': lowerband
    }

def calculate_bollinger_bands(data: pd.Series, period: int = 20, 
                            std_dev: int = 2) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Calculate Bollinger Bands"""
    sma = calculate_sma(data, period)
    std = data.rolling(window=period).std()
    
    upper_band = sma + (std * std_dev)
    lower_band = sma - (std * std_dev)
    
    return upper_band, sma, lower_band

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range"""
    high = df['high']
    low = df['low']
    close = df['close']
    
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    
    return atr

def calculate_stochastic(df: pd.DataFrame, k_period: int = 14, 
                        d_period: int = 3) -> Tuple[pd.Series, pd.Series]:
    """Calculate Stochastic Oscillator"""
    low_min = df['low'].rolling(window=k_period).min()
    high_max = df['high'].rolling(window=k_period).max()
    
    k = 100 * ((df['close'] - low_min) / (high_max - low_min))
    d = k.rolling(window=d_period).mean()
    
    return k, d

def calculate_indicators(df: pd.DataFrame) -> Dict:
    """Calculate all technical indicators for a DataFrame"""
    if df.empty:
        return {}
    
    indicators = {}
    close = df['close']
    
    try:
        # Calculate RSI
        rsi = calculate_rsi(close)
        indicators['rsi'] = {
            'value': float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None,
            'data': rsi.tolist()
        }
        
        # Calculate MACD
        macd_line, signal_line, histogram = calculate_macd(close)
        indicators['macd'] = {
            'macd': float(macd_line.iloc[-1]) if not pd.isna(macd_line.iloc[-1]) else None,
            'signal': float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None,
            'histogram': float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None,
            'prev_histogram': float(histogram.iloc[-2]) if len(histogram) > 1 and not pd.isna(histogram.iloc[-2]) else None,
            'data': {
                'macd': macd_line.tolist(),
                'signal': signal_line.tolist(),
                'histogram': histogram.tolist()
            }
        }
        
        # Calculate Supertrend
        supertrend_data = calculate_supertrend(df)
        indicators['supertrend'] = {
            'value': float(supertrend_data['supertrend'].iloc[-1]) if not pd.isna(supertrend_data['supertrend'].iloc[-1]) else None,
            'direction': int(supertrend_data['direction'].iloc[-1]) if not pd.isna(supertrend_data['direction'].iloc[-1]) else None,
            'data': {
                'supertrend': supertrend_data['supertrend'].tolist(),
                'direction': supertrend_data['direction'].tolist(),
                'upperband': supertrend_data['upperband'].tolist(),
                'lowerband': supertrend_data['lowerband'].tolist()
            }
        }
        
        # Calculate Bollinger Bands
        upper_band, middle_band, lower_band = calculate_bollinger_bands(close)
        indicators['bollinger_bands'] = {
            'upper': float(upper_band.iloc[-1]) if not pd.isna(upper_band.iloc[-1]) else None,
            'middle': float(middle_band.iloc[-1]) if not pd.isna(middle_band.iloc[-1]) else None,
            'lower': float(lower_band.iloc[-1]) if not pd.isna(lower_band.iloc[-1]) else None,
            'data': {
                'upper': upper_band.tolist(),
                'middle': middle_band.tolist(),
                'lower': lower_band.tolist()
            }
        }
        
        # Calculate Stochastic
        k, d = calculate_stochastic(df)
        indicators['stochastic'] = {
            'k': float(k.iloc[-1]) if not pd.isna(k.iloc[-1]) else None,
            'd': float(d.iloc[-1]) if not pd.isna(d.iloc[-1]) else None,
            'data': {
                'k': k.tolist(),
                'd': d.tolist()
            }
        }
        
        # Calculate ATR
        atr = calculate_atr(df)
        indicators['atr'] = {
            'value': float(atr.iloc[-1]) if not pd.isna(atr.iloc[-1]) else None,
            'data': atr.tolist()
        }
        
        return indicators
        
    except Exception as e:
        print(f"Error calculating indicators: {e}")
        return {} 