from typing import Dict, Optional, List
import requests
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import logging
import os
from base64 import b64encode
from backend.models.database import get_session
from backend.models.market_data_model import MarketData

# Configure logging
logger = logging.getLogger(__name__)

# Cache for market data
market_data_cache = {}
last_update_time = {}

# Alpaca API configuration
def get_api_credentials():
    """Get API credentials from environment variables"""
    api_key = os.getenv('ALPACA_API_KEY')
    api_secret = os.getenv('ALPACA_API_SECRET')
    
    logger.info(f"API Key present: {bool(api_key)}")
    logger.info(f"API Secret present: {bool(api_secret)}")
    
    return api_key, api_secret

def get_auth_headers():
    """Get authentication headers for Alpaca Market Data API."""
    api_key, api_secret = get_api_credentials()
    if not api_key or not api_secret:
        return None
        
    return {
        'APCA-API-KEY-ID': api_key,
        'APCA-API-SECRET-KEY': api_secret
    }

# API URLs
BASE_URL = os.getenv('ALPACA_API_URL', 'https://paper-api.alpaca.markets')
DATA_URL = os.getenv('ALPACA_DATA_API_URL', 'https://data.alpaca.markets')
CRYPTO_DATA_URL = os.getenv('ALPACA_CRYPTO_DATA_API_URL', 'https://data.alpaca.markets/v1beta3')

def get_market_data(symbol: str) -> Dict:
    """Get current market data for a symbol"""
    try:
        # Check cache first
        if symbol in market_data_cache:
            last_update = last_update_time.get(symbol, datetime.min)
            if datetime.now() - last_update < timedelta(minutes=1):
                return market_data_cache[symbol]
        
        # Try to get real market data from Alpaca
        api_key, api_secret = get_api_credentials()
        if not api_key or not api_secret:
            logger.warning("API credentials not found, using mock data")
            mock_data = _generate_mock_market_data(symbol)
            market_data_cache[symbol] = mock_data
            last_update_time[symbol] = datetime.now()
            return mock_data
            
        # Check if it's a crypto pair
        is_crypto = '/' in symbol
        alpaca_symbol = symbol  # Keep the original format for crypto pairs (e.g., "BTC/USD")
        
        # Get latest trade from crypto endpoint for crypto pairs
        if is_crypto:
            # Get latest trade
            url = f"{CRYPTO_DATA_URL}/crypto/latest/trades"
            params = {
                'symbols': alpaca_symbol,
                'feed': 'us'  # Specify the US feed for crypto data
            }
            headers = {
                'APCA-API-KEY-ID': api_key,
                'APCA-API-SECRET-KEY': api_secret
            }
            logger.info(f"Making request to {url} with params: {params}")
            logger.info(f"Using API Key: {api_key[:4]}...{api_key[-4:] if api_key else ''}")
            response = requests.get(url, params=params, headers=headers)
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response content: {response.text}")
            
            if response.ok:
                data = response.json()
                if data and alpaca_symbol in data:
                    trade_data = data[alpaca_symbol]
                    if trade_data:
                        latest_trade = trade_data[0]  # Get the most recent trade
                        market_data = {
                            'price': float(latest_trade['p']),
                            'volume': float(latest_trade['s']),
                            'timestamp': latest_trade['t']
                        }
                        
                        # Get daily bar for high/low
                        url = f"{CRYPTO_DATA_URL}/crypto/bars"
                        params = {
                            'symbols': alpaca_symbol,
                            'timeframe': '1Day',
                            'limit': 1,
                            'feed': 'us'  # Specify the US feed for crypto data
                        }
                        logger.info(f"Making request to {url} with params: {params}")
                        response = requests.get(url, params=params, headers=headers)
                        logger.info(f"Response status: {response.status_code}")
                        logger.info(f"Response content: {response.text}")
                        
                        if response.ok:
                            bar_data = response.json()
                            if bar_data and alpaca_symbol in bar_data:
                                daily_bar = bar_data[alpaca_symbol][0]
                                market_data.update({
                                    'high': float(daily_bar['h']),
                                    'low': float(daily_bar['l']),
                                    'open': float(daily_bar['o']),
                                    'close': float(daily_bar['c']),
                                    'change': ((float(latest_trade['p']) - float(daily_bar['o'])) / float(daily_bar['o'])) * 100,
                                    'source': 'Alpaca'
                                })
                                
                                # Cache the data
                                market_data_cache[symbol] = market_data
                                last_update_time[symbol] = datetime.now()
                                
                                return market_data
            else:
                logger.error(f"API request failed with status {response.status_code}: {response.text}")
        
        logger.error(f"No market data available for {symbol}")
        return None
    except Exception as e:
        logger.error(f"Error getting market data for {symbol}: {str(e)}")
        return None

def get_polygon_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> Optional[pd.DataFrame]:
    """Get historical price data from Polygon.io"""
    try:
        api_key = os.getenv('POLYGON_API_KEY')
        if not api_key:
            logger.error("Polygon API key not found")
            return None
            
        # Format symbol for Polygon (remove '/' for crypto pairs)
        formatted_symbol = symbol.replace('/', '')
        if '/' in symbol:  # It's a crypto pair
            formatted_symbol = 'X:' + formatted_symbol  # Prefix with X: for crypto
            
        # Map timeframe to Polygon format
        timeframe_map = {
            '1m': 'minute',
            '5m': '5/minute',
            '15m': '15/minute',
            '1h': 'hour',
            '4h': '4/hour',
            '1d': 'day',
            # Add uppercase variants
            '1M': 'minute',
            '5M': '5/minute',
            '15M': '15/minute',
            '1H': 'hour',
            '4H': '4/hour',
            '1D': 'day'
        }
        
        polygon_timeframe = timeframe_map.get(timeframe, 'day')
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=limit)
        
        # Construct API URL
        base_url = "https://api.polygon.io/v2"
        endpoint = f"/aggs/ticker/{formatted_symbol}/range/1/{polygon_timeframe}/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
        url = f"{base_url}{endpoint}"
        
        params = {
            'apiKey': api_key,
            'limit': limit
        }
        
        logger.info(f"Making Polygon.io request to {url}")
        response = requests.get(url, params=params)
        
        if response.ok:
            data = response.json()
            if data.get('results'):
                df = pd.DataFrame(data['results'])
                # Rename columns to match our format
                df = df.rename(columns={
                    't': 'timestamp',
                    'o': 'open',
                    'h': 'high',
                    'l': 'low',
                    'c': 'close',
                    'v': 'volume'
                })
                
                # Convert timestamp from milliseconds to datetime
                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                
                # Ensure numeric columns
                numeric_columns = ['open', 'high', 'low', 'close', 'volume']
                df[numeric_columns] = df[numeric_columns].apply(pd.to_numeric)
                
                return df
                
        logger.error(f"Polygon.io request failed: {response.status_code} - {response.text}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting Polygon.io historical data: {str(e)}")
        return None

def get_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> Optional[pd.DataFrame]:
    """Get historical price data for a symbol"""
    try:
        # Try Alpaca first
        api_key = os.getenv('ALPACA_API_KEY')
        api_secret = os.getenv('ALPACA_API_SECRET')
        
        if api_key and api_secret:
            logger.info("Trying Alpaca API first")
            alpaca_data = get_alpaca_historical_data(symbol, timeframe, limit)
            if alpaca_data is not None and not alpaca_data.empty:
                return alpaca_data
                
        # If Alpaca fails or no credentials, try Polygon.io
        logger.info("Trying Polygon.io API as fallback")
        polygon_data = get_polygon_historical_data(symbol, timeframe, limit)
        if polygon_data is not None and not polygon_data.empty:
            return polygon_data
            
        # If both fail, use mock data
        logger.info("Both APIs failed, using mock data")
        return generate_mock_data(symbol, timeframe, limit)
            
    except Exception as e:
        logger.error(f"Error in get_historical_data: {str(e)}")
        return generate_mock_data(symbol, timeframe, limit)

def get_alpaca_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> Optional[pd.DataFrame]:
    """Get historical price data from Alpaca"""
    try:
        api_key = os.getenv('ALPACA_API_KEY')
        api_secret = os.getenv('ALPACA_API_SECRET')
        
        if not api_key or not api_secret:
            logger.info("Alpaca API credentials not found")
            return None
            
        # Format symbol for Alpaca (keep '/' for crypto pairs)
        is_crypto = '/' in symbol
        alpaca_symbol = symbol  # Keep original format for crypto
        
        # Map timeframe to Alpaca format
        timeframe_map = {
            '1m': '1Min',
            '5m': '5Min',
            '15m': '15Min',
            '1h': '1Hour',
            '4h': '4Hour',
            '1d': '1Day',
            # Add uppercase variants
            '1M': '1Min',
            '5M': '5Min',
            '15M': '15Min',
            '1H': '1Hour',
            '4H': '4Hour',
            '1D': '1Day'
        }
        
        alpaca_timeframe = timeframe_map.get(timeframe, '1Day')
        logger.info(f"Using timeframe: {alpaca_timeframe} for input: {timeframe}")
        
        if is_crypto:
            url = f"{CRYPTO_DATA_URL}/crypto/bars"
            params = {
                'symbols': alpaca_symbol,
                'timeframe': alpaca_timeframe,
                'limit': limit
            }
            headers = {
                'APCA-API-KEY-ID': api_key,
                'APCA-API-SECRET-KEY': api_secret
            }
            
            logger.info(f"Making request to {url} with params: {params}")
            response = requests.get(url, params=params, headers=headers)
            logger.info(f"Response status: {response.status_code}")
            
            if response.ok:
                data = response.json()
                if data and alpaca_symbol in data:
                    bars = data[alpaca_symbol]
                    df = pd.DataFrame(bars)
                    if not df.empty:
                        # Rename columns to match expected format
                        df = df.rename(columns={
                            't': 'timestamp',
                            'o': 'open',
                            'h': 'high',
                            'l': 'low',
                            'c': 'close',
                            'v': 'volume'
                        })
                        
                        # Convert timestamp to datetime
                        df['timestamp'] = pd.to_datetime(df['timestamp'])
                        
                        # Ensure numeric columns
                        numeric_columns = ['open', 'high', 'low', 'close', 'volume']
                        df[numeric_columns] = df[numeric_columns].apply(pd.to_numeric)
                        
                        return df
                        
        logger.error(f"No Alpaca data available for {symbol}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting Alpaca historical data: {str(e)}")
        return None

def generate_mock_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> pd.DataFrame:
    """Generate mock historical data for testing"""
    logger.info(f"Generating mock data for {symbol} with timeframe {timeframe}, limit {limit}")
    
    # Generate timestamps
    end_time = pd.Timestamp.now()
    timestamps = []
    
    # Simply generate daily timestamps for now - most reliable approach
    for i in range(limit):
        timestamps.append(end_time - pd.Timedelta(days=i))
    
    # Generate price data
    if 'BTC' in symbol:
        base_price = 45000
    elif 'ETH' in symbol:
        base_price = 2000
    elif 'SOL' in symbol:
        base_price = 150
    else:
        base_price = 100
    
    # Create basic price array
    closes = []
    opens = []
    highs = []
    lows = []
    volumes = []
    
    # Generate price data
    for i in range(limit):
        # Simplest approach - random walk with 2% volatility
        close = base_price * (1 + 0.02 * (i - limit/2) / limit)
        # Add some randomness
        open_price = close * 0.99
        high = close * 1.02
        low = close * 0.98
        volume = base_price * 1000
        
        closes.append(close)
        opens.append(open_price)
        highs.append(high)
        lows.append(low)
        volumes.append(volume)
    
    # Create DataFrame
    data = {
        'timestamp': timestamps,
        'open': opens,
        'high': highs,
        'low': lows,
        'close': closes,
        'volume': volumes
    }
    
    df = pd.DataFrame(data)
    df = df.sort_values('timestamp')
    
    logger.info(f"Successfully generated {len(df)} mock data points for {symbol}")
    return df

def _generate_mock_historical_data(symbol: str, timeframe: str = '1D', limit: int = 100) -> pd.DataFrame:
    """Generate mock historical data for testing."""
    dates = pd.date_range(end=datetime.now(), periods=limit, freq=timeframe)
    base_price = get_mock_market_data(symbol)['price']
    
    # Generate random walk prices
    returns = np.random.normal(0, 0.02, limit)  # 2% daily volatility
    prices = base_price * np.exp(np.cumsum(returns))
    
    data = pd.DataFrame({
        'timestamp': dates,
        'open': prices * (1 + np.random.normal(0, 0.001, limit)),
        'high': prices * (1 + abs(np.random.normal(0, 0.01, limit))),
        'low': prices * (1 - abs(np.random.normal(0, 0.01, limit))),
        'close': prices,
        'volume': base_price * 1000000 * (1 + np.random.normal(0, 0.1, limit))
    })
    
    return data.sort_values('timestamp')

def get_mock_market_data(symbol: str) -> Dict:
    """Generate mock market data for testing."""
    base_prices = {
        'BTC': 65000.0,
        'ETH': 3500.0,
        'SOL': 150.0,
        'AVAX': 35.0,
        'MATIC': 1.2,
        'USDT': 1.0,
        'USDC': 1.0,
        'DAI': 1.0,
        'BUSD': 1.0,
        'UNI': 7.5,
        'AAVE': 95.0,
        'MKR': 1200.0,
        'SNX': 3.0,
        'COMP': 65.0,
        'LINK': 15.0,
        'DOT': 8.0,
        'ADA': 0.6,
        'ATOM': 9.0,
        'ALGO': 0.2
    }
    
    symbol_base = symbol.split('/')[0] if '/' in symbol else symbol
    base_price = base_prices.get(symbol_base, 100.0)  # Default price for unknown symbols
    
    # Add some randomness
    price = base_price * (1 + np.random.normal(0, 0.01))  # 1% standard deviation
    change = np.random.normal(0, 2.0)  # Random change between -6% and +6%
    volume = base_price * 1000000 * (1 + np.random.normal(0, 0.1))  # Random volume
    
    return {
        'symbol': symbol,
        'price': round(price, 2),
        'change': round(change, 2),
        'volume': round(volume, 2),
        'high': round(price * 1.02, 2),
        'low': round(price * 0.98, 2),
        'market_cap': round(price * 1000000, 2),
        'source': 'mock'
    }

def _generate_mock_market_data(symbol: str) -> Dict:
    """Generate mock market data for testing."""
    base_prices = {
        'BTC': 65000.0,
        'ETH': 3500.0,
        'SOL': 150.0,
        'AVAX': 35.0,
        'MATIC': 1.2,
    }
    
    symbol_base = symbol.split('/')[0] if '/' in symbol else symbol
    base_price = base_prices.get(symbol_base, 100.0)  # Default price for unknown symbols
    
    # Add some randomness
    price = base_price * (1 + np.random.normal(0, 0.01))  # 1% standard deviation
    change = np.random.normal(0, 2.0)  # Random change between -6% and +6%
    volume = base_price * 1000000 * (1 + np.random.normal(0, 0.1))  # Random volume
    
    return {
        'symbol': symbol,
        'price': round(price, 2),
        'change': round(change, 2),
        'volume': round(volume, 2),
        'high': round(price * 1.02, 2),
        'low': round(price * 0.98, 2),
        'market_cap': round(price * 1000000, 2),
        'source': 'mock'
    } 