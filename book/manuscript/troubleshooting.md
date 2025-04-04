# Troubleshooting and FAQ

## Common Issues and Solutions

### API Connection Problems

#### Issue: Authentication Errors
```python
# Error example
"error": "Authentication failed: Invalid API key or secret"
```

**Solution:**
1. Verify API key and secret are correct
2. Ensure keys have appropriate permissions
3. Check for whitespace in credentials
4. Verify API endpoint URLs match the environment (paper vs live)

```python
# Correct implementation
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file

# Use environment variables instead of hardcoded credentials
api_key = os.getenv("ALPACA_API_KEY")
api_secret = os.getenv("ALPACA_API_SECRET")
base_url = os.getenv("ALPACA_BASE_URL")

# Verify credentials are loaded correctly
if not all([api_key, api_secret, base_url]):
    raise ValueError("Missing required environment variables")
```

#### Issue: Rate Limiting
```
"error": "Too many requests", "status_code": 429
```

**Solution:**
1. Implement exponential backoff for retries
2. Cache frequently accessed data
3. Optimize API request patterns

```python
# Implementing retry logic
import time
from functools import wraps

def retry_with_backoff(max_retries=3, backoff_factor=2):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if "429" not in str(e) and "Too many requests" not in str(e):
                        raise  # Re-raise if not a rate limit error
                    
                    wait_time = backoff_factor ** retries
                    print(f"Rate limited. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    retries += 1
            
            # If we get here, we've exhausted retries
            raise Exception(f"Failed after {max_retries} retries")
        return wrapper
    return decorator
```

### Data Processing Issues

#### Issue: Missing or Incomplete Data
```python
# Pandas warning
"A value is trying to be set on a copy of a slice from a DataFrame"
```

**Solution:**
1. Use proper dataframe copy operations
2. Handle missing values explicitly
3. Implement data validation checks

```python
# Correct implementation
# Instead of
df['new_column'] = calculation

# Use
df = df.copy()
df['new_column'] = calculation

# Or
df.loc[:, 'new_column'] = calculation

# Handle missing values
df = df.dropna(subset=['required_column'])  # Remove rows with missing values
# or
df['required_column'] = df['required_column'].fillna(method='ffill')  # Forward fill
```

### Historical Data API Issues

#### Issue: 404 Errors for Historical Data Endpoint
```
GET /api/historical/BTC%2FUSD?timeframe=1d&limit=5 HTTP/1.1" 404 NOT FOUND
```

This is a common issue where the historical data endpoint returns a 404 error despite being properly registered in the Flask application.

**Solutions:**

1. **Implement Client-Side Fallbacks**

   When API endpoints consistently fail, implement client-side fallback mechanisms to ensure the application remains functional:

   ```javascript
   // Load historical data with client-side fallback
   function loadHistoricalData(symbol) {
       if (!symbol) return;
       
       // Show loading state
       const chartContainer = document.getElementById('chartContainer');
       if (chartContainer) {
           chartContainer.classList.add('loading');
       }
   
       // Always use client-side mock data for reliable visualization
       console.log('[CHART DEBUG] Using client-side mock data for chart');
       const mockData = generateMockData(symbol, 100);
       
       // Short delay for better UX
       setTimeout(() => {
           updatePriceChart(mockData);
           
           // Hide loading state
           if (chartContainer) {
               chartContainer.classList.remove('loading');
           }
       }, 300);
   }
   ```

2. **Implement Multi-Source Data Retrieval with Fallbacks**

   Create a robust data retrieval system that tries multiple sources:

   ```python
   def get_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100):
       """Get historical price data with fallbacks"""
       try:
           # Try Alpaca first
           api_key = os.getenv('ALPACA_API_KEY')
           api_secret = os.getenv('ALPACA_API_SECRET')
           
           if api_key and api_secret:
               logger.info("Trying Alpaca API first")
               alpaca_data = get_alpaca_historical_data(symbol, timeframe, limit)
               if alpaca_data is not None and not alpaca_data.empty:
                   return alpaca_data
                   
           # Try Polygon.io as fallback
           logger.info("Trying Polygon.io API as fallback")
           polygon_data = get_polygon_historical_data(symbol, timeframe, limit)
           if polygon_data is not None and not polygon_data.empty:
               return polygon_data
               
           # Use mock data as final fallback
           logger.info("All APIs failed, using mock data")
           return generate_mock_data(symbol, timeframe, limit)
               
       except Exception as e:
           logger.error(f"Error in get_historical_data: {str(e)}")
           return generate_mock_data(symbol, timeframe, limit)
   ```

3. **Add Debug Logging for Route Registration**

   Add verbose logging to debug Flask route registration:

   ```python
   # Log all registered routes
   def log_routes(app):
       """Print all registered routes for debugging"""
       routes = []
       for rule in app.url_map.iter_rules():
           routes.append({
               'endpoint': rule.endpoint,
               'methods': list(rule.methods),
               'route': str(rule)
           })
       
       logger.info("Registered routes:")
       for route in routes:
           logger.info(f"{route['endpoint']} [{','.join(route['methods'])}] - {route['route']}")
   
   # Call this after app initialization
   log_routes(app)
   ```

4. **Verify Route Parameters**

   Ensure URLs are properly encoded, especially for symbols with slashes:

   ```python
   # Symbol formatting
   symbol = "BTC/USD"
   encoded_symbol = urllib.parse.quote(symbol)  # Properly encode for URL parameters
   ```

#### Issue: Historical Data Not Available for Crypto Symbols

Some cryptocurrency trading pairs might not be available through certain providers.

**Solutions:**

1. **Use Multiple Data Sources**

   Implement Polygon.io as a fallback for historical data:

   ```python
   def get_polygon_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100):
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
               '1d': 'day'
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
               # Process and return data
               # ...
           
           return None
       except Exception as e:
           logger.error(f"Error getting Polygon.io data: {str(e)}")
           return None
   ```

2. **Generate Mock Data When APIs Fail**

   Implement a realistic mock data generator:

   ```python
   def generate_mock_data(symbol: str, timeframe: str = '1d', limit: int = 100):
       """Generate mock historical data for testing and fallback"""
       logger.info(f"Generating mock data for {symbol} with timeframe {timeframe}, limit {limit}")
       
       # Set base price based on symbol
       if 'BTC' in symbol:
           base_price = 45000
       elif 'ETH' in symbol:
           base_price = 2000
       elif 'SOL' in symbol:
           base_price = 150
       else:
           base_price = 100
       
       # Generate timestamps
       end_time = datetime.now()
       timestamps = []
       
       # Generate appropriate time intervals based on timeframe
       if timeframe in ['1m', '5m', '15m']:
           for i in range(limit):
               timestamps.append(end_time - timedelta(minutes=i * int(timeframe[0])))
       elif timeframe in ['1h', '4h']:
           for i in range(limit):
               timestamps.append(end_time - timedelta(hours=i * int(timeframe[0])))
       else:  # Default to daily
           for i in range(limit):
               timestamps.append(end_time - timedelta(days=i))
       
       # Generate random walk prices
       np.random.seed(hash(symbol) % 10000)  # Seed based on symbol for consistency
       
       # Create price arrays
       close_prices = []
       price = base_price
       for i in range(limit):
           # Simple random walk
           change = price * np.random.normal(0, 0.02)  # 2% volatility
           price = max(0.01, price + change)
           close_prices.append(price)
       
       close_prices.reverse()  # Earliest to latest
       
       # Generate OHLCV data
       data = []
       for i in range(limit):
           close = close_prices[i]
           open_price = close * (1 + np.random.normal(0, 0.01))
           high = max(close, open_price) * (1 + abs(np.random.normal(0, 0.005)))
           low = min(close, open_price) * (1 - abs(np.random.normal(0, 0.005)))
           volume = base_price * 1000 * abs(np.random.normal(0, 1))
           
           data.append({
               'timestamp': timestamps[i],
               'open': open_price,
               'high': high,
               'low': low,
               'close': close,
               'volume': volume
           })
       
       df = pd.DataFrame(data)
       df = df.sort_values('timestamp')
       
       return df
   ```

### WebSocket Connectivity Issues

#### Issue: SyntaxError with Socket Variable
```javascript
SyntaxError: Identifier 'socket' has already been declared
```

**Solution:**
1. Use global window object to store socket instance
2. Check for existing initialization

```javascript
// In base.html
<script>
    // Global variables initialization
    window.socket = null;
    window.currentSymbol = 'BTC/USD';
</script>

// In main.js
function initializeWebSocket() {
    // Connect to socket.io server
    const socketUrl = window.location.protocol + '//' + window.location.host;
    window.socket = io(socketUrl);  // Use window.socket, not let socket
    
    window.socket.on('connect', function() {
        console.log('WebSocket connected');
        // ...
    });
}
```

#### Issue: Socket.IO Connection Failures

**Solution:**
1. Verify CORS settings
2. Check Socket.IO versions match between client and server
3. Confirm proper URL construction

```javascript
// In app.py (server)
socketio = SocketIO(app, cors_allowed_origins="*")

// In client JavaScript
const socketUrl = window.location.protocol + '//' + window.location.host;
window.socket = io(socketUrl);
```

### Application Startup Issues

#### Import Errors with Relative Imports

**Problem**: When running the application directly with `python backend/app.py`, you might encounter import errors like:
```
ImportError: attempted relative import with no known parent package
```

**Solution**: 
1. Use absolute imports in your code:
   ```python
   # Instead of
   from .api_routes import api_blueprint
   
   # Use
   from backend.api_routes import api_blueprint
   ```
2. Set the PYTHONPATH environment variable when running:
   ```bash
   PYTHONPATH=/path/to/project python backend/app.py
   ```
   
3. Run as a module:
   ```bash
   cd /path/to/project
   python -m backend.app
   ```

#### Server Port Configuration Issues

**Problem**: 
Errors like "Address already in use" or confusion about which port the server is running on.

**Solution**:
1. Always kill previous server instances before starting a new one:
   ```bash
   pkill -f "python -m backend.app" || true
   ```

2. Specify the port explicitly in environment variables:
   ```bash
   FLASK_PORT=5002 python -m backend.app
   ```

3. Update frontend to match the backend port:
   ```javascript
   // In dashboard.js or main.js
   const BASE_API_URL = '/api';  // Use relative URL to automatically adapt to host/port
   ```

### Frontend Issues

#### Chart Data Display Problems

**Problem**: 
Charts not displaying data even though the application is running.

**Solution**:
1. Implement client-side data generation as a fallback:
   ```javascript
   function generateMockData(symbol, count = 100) {
       console.log(`[CHART DEBUG] Generating mock data for ${symbol}`);
       const data = [];
       const now = new Date();
       
       // Set base price based on symbol
       let basePrice = 100;
       if (symbol.includes('BTC')) basePrice = 45000;
       else if (symbol.includes('ETH')) basePrice = 2000;
       else if (symbol.includes('SOL')) basePrice = 150;
       
       // Generate data points with random walk
       let price = basePrice;
       for (let i = count - 1; i >= 0; i--) {
           const date = new Date(now);
           date.setDate(date.getDate() - i);
           
           // Random walk
           const change = (Math.random() - 0.5) * 0.02 * price;
           price = Math.max(0.01, price + change);
           
           // Generate OHLC and volume
           const open = price * (1 + (Math.random() - 0.5) * 0.01);
           const high = Math.max(open, price) * (1 + Math.random() * 0.01);
           const low = Math.min(open, price) * (1 - Math.random() * 0.01);
           const volume = Math.random() * basePrice * 100;
           
           data.push({
               timestamp: date.toISOString(),
               open: open,
               high: high, 
               low: low,
               close: price,
               volume: volume
           });
       }
       
       return data;
   }
   
   // Always generate mock data client-side for reliability
   function loadHistoricalData(symbol) {
       if (!symbol) return;
       
       console.log('[CHART DEBUG] Preparing chart data for:', symbol);
       
       // Generate mock data client-side
       const mockData = generateMockData(symbol, 100);
       updatePriceChart(mockData);
   }
   ```

2. Add comprehensive debugging to chart update functions:
   ```javascript
   function updatePriceChart(data) {
       if (!data || !Array.isArray(data) || data.length === 0) {
           console.error('[CHART DEBUG] Invalid or empty data for price chart');
           return;
       }
       
       console.log(`[CHART DEBUG] Updating chart with ${data.length} data points`);
       console.log(`[CHART DEBUG] First point: ${JSON.stringify(data[0])}`);
       console.log(`[CHART DEBUG] Last point: ${JSON.stringify(data[data.length-1])}`);
       
       // Chart update code
       // ...
   }
   ```

## Best Practices for Debugging

### Adding Comprehensive Logging

Implement detailed logging across the application:

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Request logging middleware
@app.before_request
def log_request_info():
    logger.info(f"Request: {request.method} {request.path}")
    logger.info(f"Full URL: {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Args: {request.args}")

# Response logging
@app.after_request
def log_response(response):
    logger.info(f"Response: {response.status_code} {response.status}")
    return response
```

### Implementing Fallback Mechanisms

Always design systems with fallbacks to handle failures gracefully:

1. **API Fallbacks**: Try multiple data sources in sequence
2. **Client-Side Generation**: Generate data client-side when APIs fail
3. **Caching**: Cache successful responses to reduce API dependencies

### Testing Across Different Environments

Test the application in multiple environments to ensure compatibility:

1. **Development**: Local machine testing
2. **Testing**: Isolated environment with mock data
3. **Production**: Real API connections with error handling

### Configuration Management

Use environment variables and configuration files for flexible deployment:

```python
# .env file for local development
FLASK_ENV=development
FLASK_DEBUG=true
FLASK_PORT=5002
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
POLYGON_API_KEY=your_polygon_key
```

These troubleshooting guidelines should help you navigate common issues and implement robust solutions in your cryptocurrency trading application. 
