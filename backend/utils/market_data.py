from typing import Dict, Optional
import requests
from datetime import datetime, timedelta
import pandas as pd
from alpaca.data import CryptoHistoricalDataClient
from alpaca.data.requests import CryptoBarsRequest
from alpaca.data.timeframe import TimeFrame

def get_market_data(symbol: str) -> Dict:
    """Get current market data for a symbol"""
    try:
        # Initialize data client
        client = CryptoHistoricalDataClient()
        
        # Get latest bar
        request = CryptoBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=TimeFrame.Minute,
            start=(datetime.now() - timedelta(minutes=2)),
            end=datetime.now()
        )
        
        bars = client.get_crypto_bars(request)
        if not bars:
            return {
                'price': 0,
                'change': 0,
                'volume': 0,
                'high': 0,
                'low': 0
            }
        
        latest_bar = bars[symbol][0]
        
        # Get 24h data for price change calculation
        day_request = CryptoBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=TimeFrame.Hour,
            start=(datetime.now() - timedelta(days=1)),
            end=datetime.now()
        )
        
        day_bars = client.get_crypto_bars(day_request)
        if day_bars and len(day_bars[symbol]) > 0:
            open_price = day_bars[symbol][0].open
            current_price = latest_bar.close
            price_change = ((current_price - open_price) / open_price) * 100
        else:
            price_change = 0
        
        return {
            'price': latest_bar.close,
            'change': price_change,
            'volume': latest_bar.volume,
            'high': latest_bar.high,
            'low': latest_bar.low
        }
        
    except Exception as e:
        print(f"Error fetching market data: {e}")
        return {
            'price': 0,
            'change': 0,
            'volume': 0,
            'high': 0,
            'low': 0
        }

def get_historical_data(symbol: str, timeframe: str = '1Min', 
                       limit: Optional[int] = None,
                       start: Optional[datetime] = None,
                       end: Optional[datetime] = None) -> pd.DataFrame:
    """Get historical price data"""
    try:
        client = CryptoHistoricalDataClient()
        
        # Convert timeframe string to TimeFrame enum
        tf_map = {
            '1Min': TimeFrame.Minute,
            '5Min': TimeFrame.Minute * 5,
            '15Min': TimeFrame.Minute * 15,
            '1H': TimeFrame.Hour,
            '4H': TimeFrame.Hour * 4,
            '1D': TimeFrame.Day
        }
        
        timeframe_obj = tf_map.get(timeframe, TimeFrame.Minute)
        
        # Set up request parameters
        if start is None:
            if limit:
                if timeframe == '1Min':
                    start = datetime.now() - timedelta(minutes=limit)
                elif timeframe == '1H':
                    start = datetime.now() - timedelta(hours=limit)
                else:
                    start = datetime.now() - timedelta(days=limit)
            else:
                start = datetime.now() - timedelta(days=30)
        
        if end is None:
            end = datetime.now()
        
        # Get historical data
        request = CryptoBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=timeframe_obj,
            start=start,
            end=end
        )
        
        bars = client.get_crypto_bars(request)
        
        if not bars or symbol not in bars:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame([
            {
                'timestamp': bar.timestamp,
                'open': bar.open,
                'high': bar.high,
                'low': bar.low,
                'close': bar.close,
                'volume': bar.volume
            }
            for bar in bars[symbol]
        ])
        
        if not df.empty:
            df.set_index('timestamp', inplace=True)
            df.sort_index(inplace=True)
        
        return df
        
    except Exception as e:
        print(f"Error fetching historical data: {e}")
        return pd.DataFrame() 