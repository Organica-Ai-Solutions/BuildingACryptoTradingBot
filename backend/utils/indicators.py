import pandas as pd
import numpy as np
import ta
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

def calculate_indicators(df, indicators=None):
    """Calculate technical indicators for the given DataFrame.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLCV data
        indicators (dict): Dictionary of indicators to calculate with parameters
        
    Returns:
        pd.DataFrame: DataFrame with calculated indicators
    """
    if indicators is None:
        indicators = {
            'sma': {'periods': [20, 50, 200]},
            'ema': {'periods': [9, 21]},
            'rsi': {'period': 14},
            'macd': {'fast': 12, 'slow': 26, 'signal': 9},
            'supertrend': {'period': 10, 'multiplier': 3},
            'bollinger': {'period': 20, 'std': 2},
            'atr': {'period': 14},
            'stochastic': {'k_period': 14, 'd_period': 3}
        }
    
    try:
        # Ensure we have the required columns
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        df.columns = [col.lower() for col in df.columns]
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Calculate Moving Averages
        if 'sma' in indicators:
            for period in indicators['sma']['periods']:
                df[f'sma_{period}'] = ta.trend.sma_indicator(df['close'], window=period)
                
        if 'ema' in indicators:
            for period in indicators['ema']['periods']:
                df[f'ema_{period}'] = ta.trend.ema_indicator(df['close'], window=period)
        
        # Calculate RSI
        if 'rsi' in indicators:
            period = indicators['rsi']['period']
            df['rsi'] = ta.momentum.rsi(df['close'], window=period)
        
        # Calculate MACD
        if 'macd' in indicators:
            params = indicators['macd']
            df['macd_line'] = ta.trend.macd(df['close'], 
                                          window_slow=params['slow'],
                                          window_fast=params['fast'])
            df['macd_signal'] = ta.trend.macd_signal(df['close'],
                                                    window_slow=params['slow'],
                                                    window_fast=params['fast'],
                                                    window_sign=params['signal'])
            df['macd_hist'] = df['macd_line'] - df['macd_signal']
        
        # Calculate Supertrend
        if 'supertrend' in indicators:
            params = indicators['supertrend']
            df['atr'] = ta.volatility.average_true_range(df['high'], 
                                                       df['low'],
                                                       df['close'],
                                                       window=params['period'])
            
            # Calculate basic upper and lower bands
            hl2 = (df['high'] + df['low']) / 2
            df['basic_upper'] = hl2 + (params['multiplier'] * df['atr'])
            df['basic_lower'] = hl2 - (params['multiplier'] * df['atr'])
            
            # Initialize Supertrend columns
            df['supertrend'] = 0.0
            df['supertrend_direction'] = 0
            
            # Calculate Supertrend
            for i in range(1, len(df)):
                if df['close'].iloc[i] > df['basic_upper'].iloc[i-1]:
                    df.loc[df.index[i], 'supertrend_direction'] = 1
                elif df['close'].iloc[i] < df['basic_lower'].iloc[i-1]:
                    df.loc[df.index[i], 'supertrend_direction'] = -1
                else:
                    df.loc[df.index[i], 'supertrend_direction'] = df['supertrend_direction'].iloc[i-1]
                    
                if df['supertrend_direction'].iloc[i] == 1:
                    df.loc[df.index[i], 'supertrend'] = df['basic_lower'].iloc[i]
                else:
                    df.loc[df.index[i], 'supertrend'] = df['basic_upper'].iloc[i]
        
        # Calculate Bollinger Bands
        if 'bollinger' in indicators:
            params = indicators['bollinger']
            df['bb_middle'] = ta.volatility.bollinger_mavg(df['close'],
                                                         window=params['period'])
            df['bb_upper'] = ta.volatility.bollinger_hband(df['close'],
                                                         window=params['period'],
                                                         window_dev=params['std'])
            df['bb_lower'] = ta.volatility.bollinger_lband(df['close'],
                                                         window=params['period'],
                                                         window_dev=params['std'])
        
        # Calculate ATR
        if 'atr' in indicators:
            period = indicators['atr']['period']
            df['atr'] = ta.volatility.average_true_range(df['high'],
                                                       df['low'],
                                                       df['close'],
                                                       window=period)
        
        # Calculate Stochastic
        if 'stochastic' in indicators:
            params = indicators['stochastic']
            df['stoch_k'] = ta.momentum.stoch(df['high'],
                                            df['low'],
                                            df['close'],
                                            window=params['k_period'])
            df['stoch_d'] = ta.momentum.stoch_signal(df['high'],
                                                   df['low'],
                                                   df['close'],
                                                   window=params['k_period'],
                                                   smooth_window=params['d_period'])
        
        return df
        
    except Exception as e:
        raise Exception(f"Error calculating indicators: {str(e)}")

def generate_signals(df):
    """Generate trading signals based on calculated indicators.
    
    Args:
        df (pd.DataFrame): DataFrame with calculated indicators
        
    Returns:
        pd.DataFrame: DataFrame with trading signals
    """
    try:
        signals = pd.DataFrame(index=df.index)
        signals['signal'] = 0  # 0: no signal, 1: buy, -1: sell
        
        # MACD signals
        if all(col in df.columns for col in ['macd_line', 'macd_signal']):
            signals.loc[df['macd_line'] > df['macd_signal'], 'macd_signal'] = 1
            signals.loc[df['macd_line'] < df['macd_signal'], 'macd_signal'] = -1
        
        # RSI signals
        if 'rsi' in df.columns:
            signals.loc[df['rsi'] < 30, 'rsi_signal'] = 1  # oversold
            signals.loc[df['rsi'] > 70, 'rsi_signal'] = -1  # overbought
        
        # Supertrend signals
        if 'supertrend_direction' in df.columns:
            signals['supertrend_signal'] = df['supertrend_direction']
        
        # Bollinger Bands signals
        if all(col in df.columns for col in ['bb_upper', 'bb_lower']):
            signals.loc[df['close'] < df['bb_lower'], 'bb_signal'] = 1
            signals.loc[df['close'] > df['bb_upper'], 'bb_signal'] = -1
        
        # Stochastic signals
        if all(col in df.columns for col in ['stoch_k', 'stoch_d']):
            signals.loc[(df['stoch_k'] < 20) & (df['stoch_d'] < 20), 'stoch_signal'] = 1
            signals.loc[(df['stoch_k'] > 80) & (df['stoch_d'] > 80), 'stoch_signal'] = -1
        
        return signals
        
    except Exception as e:
        raise Exception(f"Error generating signals: {str(e)}")

def calculate_support_resistance(df, window=20):
    """Calculate support and resistance levels.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLCV data
        window (int): Window size for calculating levels
        
    Returns:
        tuple: (support_levels, resistance_levels)
    """
    try:
        support_levels = []
        resistance_levels = []
        
        for i in range(window, len(df) - window):
            # Get the current window
            window_data = df.iloc[i-window:i+window]
            
            # Find local minimums and maximums
            if df['low'].iloc[i] == window_data['low'].min():
                support_levels.append(df['low'].iloc[i])
            if df['high'].iloc[i] == window_data['high'].max():
                resistance_levels.append(df['high'].iloc[i])
        
        # Remove duplicates and sort
        support_levels = sorted(list(set(support_levels)))
        resistance_levels = sorted(list(set(resistance_levels)))
        
        return support_levels, resistance_levels
        
    except Exception as e:
        raise Exception(f"Error calculating support/resistance levels: {str(e)}")

def calculate_pivot_points(df):
    """Calculate pivot points using the previous day's data.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLCV data
        
    Returns:
        dict: Dictionary containing pivot points
    """
    try:
        prev_high = df['high'].iloc[-2]
        prev_low = df['low'].iloc[-2]
        prev_close = df['close'].iloc[-2]
        
        pivot = (prev_high + prev_low + prev_close) / 3
        r1 = (2 * pivot) - prev_low
        r2 = pivot + (prev_high - prev_low)
        s1 = (2 * pivot) - prev_high
        s2 = pivot - (prev_high - prev_low)
        
        return {
            'pivot': pivot,
            'r1': r1,
            'r2': r2,
            's1': s1,
            's2': s2
        }
        
    except Exception as e:
        raise Exception(f"Error calculating pivot points: {str(e)}")

def calculate_trend_strength(df, period=14):
    """Calculate trend strength using ADX indicator.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLCV data
        period (int): Period for ADX calculation
        
    Returns:
        pd.Series: ADX values
    """
    try:
        adx = ta.trend.adx(df['high'], df['low'], df['close'], window=period)
        return adx
        
    except Exception as e:
        raise Exception(f"Error calculating trend strength: {str(e)}")

def calculate_volatility(df, period=20):
    """Calculate various volatility metrics.
    
    Args:
        df (pd.DataFrame): DataFrame with OHLCV data
        period (int): Period for calculations
        
    Returns:
        dict: Dictionary containing volatility metrics
    """
    try:
        # Calculate daily returns
        returns = df['close'].pct_change()
        
        # Standard deviation of returns
        volatility = returns.std() * np.sqrt(252)  # Annualized
        
        # ATR
        atr = ta.volatility.average_true_range(df['high'],
                                             df['low'],
                                             df['close'],
                                             window=period)
        
        # Bollinger Bands Width
        bb = ta.volatility.bollinger_hband(df['close'], window=period) - \
             ta.volatility.bollinger_lband(df['close'], window=period)
        
        return {
            'volatility': volatility,
            'atr': atr.iloc[-1],
            'bb_width': bb.iloc[-1]
        }
        
    except Exception as e:
        raise Exception(f"Error calculating volatility metrics: {str(e)}") 