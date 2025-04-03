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

#### Issue: Timezone Inconsistencies

**Solution:**
1. Standardize all timestamps to UTC
2. Be explicit about timezone conversions
3. Use timezone-aware datetime objects

```python
# Standardize timestamps to UTC
import pandas as pd
from datetime import datetime
import pytz

# Convert string timestamps to timezone-aware datetime
def standardize_timestamp(ts_str):
    if isinstance(ts_str, str):
        # Parse timestamp string to datetime
        dt = pd.to_datetime(ts_str)
        # If timezone info is missing, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
        # Otherwise convert to UTC
        else:
            dt = dt.astimezone(pytz.UTC)
        return dt
    return ts_str

# Apply to dataframe
df['timestamp'] = df['timestamp'].apply(standardize_timestamp)
```

### Strategy Implementation Issues

#### Issue: Strategy Not Generating Expected Signals

**Solution:**
1. Verify indicator calculations
2. Check parameter values
3. Ensure data timeframes match expectations
4. Implement logging for debugging

```python
# Debug logging for strategy signals
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("strategy_debug.log"),
        logging.StreamHandler()
    ]
)

class SupertrendStrategy:
    def __init__(self, atr_period=10, multiplier=3.0):
        self.atr_period = atr_period
        self.multiplier = multiplier
        logging.info(f"Initialized Supertrend with atr_period={atr_period}, multiplier={multiplier}")
    
    def generate_signal(self, df):
        # Log input data summary
        logging.debug(f"Data input summary: {len(df)} rows, columns: {df.columns.tolist()}")
        logging.debug(f"First timestamp: {df.index[0]}, Last timestamp: {df.index[-1]}")
        
        # Calculate supertrend
        # ...implementation...
        
        # Log signal generation
        signals = df[df['signal'] != 0]
        logging.info(f"Generated {len(signals)} signals: {signals['signal'].value_counts().to_dict()}")
        
        return df
```

#### Issue: Orders Not Executing

**Solution:**
1. Check account balances and buying power
2. Verify order parameters (size, type, etc.)
3. Ensure market hours compatibility
4. Implement proper error handling

```python
# Validate order parameters before submission
def validate_order(symbol, qty, side, order_type):
    errors = []
    
    # Check symbol
    if not isinstance(symbol, str) or len(symbol) == 0:
        errors.append("Invalid symbol")
    
    # Check quantity
    if not isinstance(qty, (int, float)) or qty <= 0:
        errors.append("Quantity must be a positive number")
    
    # Check side
    if side not in ["buy", "sell"]:
        errors.append("Side must be 'buy' or 'sell'")
    
    # Check order type
    if order_type not in ["market", "limit", "stop", "stop_limit"]:
        errors.append("Invalid order type")
    
    if errors:
        raise ValueError(f"Order validation failed: {', '.join(errors)}")
    
    return True
```

## Frequently Asked Questions

### General Questions

#### Q: How much capital do I need to start trading with this bot?
A: While technically you can start with any amount supported by your broker, we recommend starting with at least $5,000 for cryptocurrency trading to account for:
- Minimum position sizes
- Diversification across multiple assets
- Ability to withstand drawdowns
- Meaningful backtest results

Test with paper trading before using real capital.

#### Q: Is this trading bot profitable?
A: The profitability depends on:
- Market conditions
- Strategy configuration
- Risk management settings
- Execution quality
- Costs (commissions, slippage)

No trading system guarantees profits. The book provides strategies with positive historical performance, but past performance doesn't guarantee future results.

### Technical Questions

#### Q: How can I host this trading bot?
A: Several hosting options are available:
1. **Local machine**: Suitable for development and testing
2. **Cloud VPS**: AWS, Google Cloud, DigitalOcean ($5-20/month)
3. **Dedicated server**: For professional operations
4. **Containerized deployment**: Using Docker and Kubernetes

Minimal requirements: 1 CPU, 2GB RAM, reliable internet connection.

#### Q: How can I add my own trading strategy?
A: Implement the strategy interface:

```python
from abc import ABC, abstractmethod

class Strategy(ABC):
    @abstractmethod
    def generate_signals(self, data):
        """
        Process market data and generate trading signals
        
        Args:
            data: DataFrame containing OHLCV data
            
        Returns:
            DataFrame with signals column added
        """
        pass
    
    @abstractmethod
    def get_parameters(self):
        """
        Return strategy parameters for logging/tracking
        
        Returns:
            dict of parameter names and values
        """
        pass

# Example implementation
class MyCustomStrategy(Strategy):
    def __init__(self, param1=10, param2=20):
        self.param1 = param1
        self.param2 = param2
    
    def generate_signals(self, data):
        # Implementation of your strategy logic
        # ...
        return data
    
    def get_parameters(self):
        return {
            "param1": self.param1,
            "param2": self.param2
        }
```

#### Q: How do I handle system outages or crashes?
A: Implement these safeguards:
1. State persistence (save trading state to database)
2. Automatic restart scripts
3. Monitoring and alerting system
4. Position reconciliation on startup
5. Circuit breakers for unusual market conditions

#### Q: How often should I retrain machine learning models?
A: Consider:
- Market regime changes (monthly retraining or event-based)
- Model drift metrics (performance degradation)
- Data availability (enough new data to benefit training)
- Computational resources (balance improvement vs. cost)

Many successful systems use quarterly retraining with monthly validation.

### Strategy Questions

#### Q: How do I determine optimal strategy parameters?
A: Use these techniques:
1. Grid search over parameter ranges
2. Walk-forward optimization
3. Monte Carlo simulations
4. Cross-validation across different market regimes

Avoid overfitting by:
- Using out-of-sample testing
- Favoring simpler models
- Testing robustness with parameter variations
- Validating across multiple symbols

#### Q: How can I combine multiple strategies?
A: Consider these approaches:
1. **Weighted allocation**: Divide capital among strategies
2. **Signal confirmation**: Require agreement from multiple strategies
3. **Strategy switching**: Select best strategy for current market regime
4. **Ensemble methods**: Combine signals using voting or averaging

The book's multi-strategy framework demonstrates these techniques in detail.

### Risk Management Questions

#### Q: How do I set appropriate stop-loss levels?
A: Consider:
1. Volatility-based stops (ATR multiples)
2. Support/resistance levels
3. Maximum drawdown tolerance
4. Time-based exits

Most robust: ATR-based stops (2-3× ATR) combined with maximum loss limits (1-2% per trade).

#### Q: How should I size positions?
A: Key position sizing methods:
1. Fixed percentage of capital (1-2% risk per trade)
2. Volatility-adjusted position sizing
3. Kelly criterion (mathematical optimum with constraints)
4. Portfolio optimization (for multiple positions)

The most consistent approach is risk-based sizing where each position risks the same percentage of capital.

## Debugging Techniques

### Effective Logging
Implement structured logging across your system:

```python
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name, log_file=None, level=logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        # Add console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        self.logger.addHandler(console_handler)
        
        # Add file handler if specified
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(level)
            self.logger.addHandler(file_handler)
    
    def _format_message(self, msg_type, message, data=None):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": msg_type,
            "message": message
        }
        
        if data:
            log_entry["data"] = data
            
        return json.dumps(log_entry)
    
    def info(self, message, data=None):
        self.logger.info(self._format_message("INFO", message, data))
    
    def warning(self, message, data=None):
        self.logger.warning(self._format_message("WARNING", message, data))
    
    def error(self, message, data=None):
        self.logger.error(self._format_message("ERROR", message, data))
    
    def trade(self, action, symbol, quantity, price, data=None):
        trade_data = {
            "action": action,
            "symbol": symbol,
            "quantity": quantity,
            "price": price
        }
        
        if data:
            trade_data.update(data)
            
        self.logger.info(self._format_message("TRADE", f"{action} {quantity} {symbol} @ {price}", trade_data))
```

### Performance Profiling

Identify bottlenecks with simple profiling:

```python
import time
import functools

def timeit(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"Function {func.__name__} took {end_time - start_time:.4f} seconds to run")
        return result
    return wrapper

@timeit
def process_data(data):
    # Process data...
    return result
```

### System Health Checks

Implement regular health checks:

```python
def system_health_check():
    health = {"status": "healthy", "components": {}}
    
    # Check database connection
    try:
        db_start = time.time()
        db_connection = get_db_connection()
        db_connection.execute("SELECT 1")
        health["components"]["database"] = {
            "status": "healthy",
            "response_time": time.time() - db_start
        }
    except Exception as e:
        health["status"] = "unhealthy"
        health["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check API connection
    try:
        api_start = time.time()
        api_client = get_api_client()
        api_client.get_account()
        health["components"]["api"] = {
            "status": "healthy",
            "response_time": time.time() - api_start
        }
    except Exception as e:
        health["status"] = "unhealthy"
        health["components"]["api"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    return health
``` 