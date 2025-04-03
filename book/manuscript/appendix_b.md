# Appendix B: Advanced Trading Concepts

## B.1 Risk Management Formulas

### Position Sizing
The optimal position size can be calculated using various methods:

1. **Fixed Fractional Position Sizing**
\[
Position Size = Account Value \times Risk Percentage
\]

2. **Volatility-Adjusted Position Sizing**
\[
Position Size = \frac{Account Risk}{(Entry Price - Stop Loss) \times ATR Multiplier}
\]

3. **Kelly Criterion**
\[
f^* = \frac{p(b+1) - 1}{b}
\]
where:
- f* is the optimal fraction of the portfolio to risk
- p is the probability of winning
- b is the ratio of average win to average loss

### Risk Metrics

1. **Value at Risk (VaR)**
```python
def calculate_var(returns: np.array, 
                 confidence_level: float = 0.95) -> float:
    """
    Calculate Value at Risk
    """
    return np.percentile(returns, (1 - confidence_level) * 100)
```

2. **Expected Shortfall (ES)**
```python
def calculate_es(returns: np.array, 
                confidence_level: float = 0.95) -> float:
    """
    Calculate Expected Shortfall
    """
    var = calculate_var(returns, confidence_level)
    return returns[returns <= var].mean()
```

## B.2 Advanced Technical Indicators

### Adaptive Moving Average (AMA)
```python
def calculate_ama(prices: np.array, 
                 n: int = 10,
                 fast: int = 2,
                 slow: int = 30) -> np.array:
    """
    Calculate Adaptive Moving Average
    """
    direction = np.abs(prices - np.roll(prices, n))
    volatility = np.sum([np.abs(prices - np.roll(prices, i)) 
                        for i in range(1, n+1)], axis=0)
    
    er = direction / volatility
    fast_sc = 2 / (fast + 1)
    slow_sc = 2 / (slow + 1)
    
    sc = (er * (fast_sc - slow_sc) + slow_sc) ** 2
    
    ama = np.zeros_like(prices)
    ama[0] = prices[0]
    
    for i in range(1, len(prices)):
        ama[i] = ama[i-1] + sc[i] * (prices[i] - ama[i-1])
        
    return ama
```

### Relative Strength Factor (RSF)
```python
def calculate_rsf(prices: np.array, 
                 period: int = 14) -> np.array:
    """
    Calculate Relative Strength Factor
    """
    changes = np.diff(prices)
    gains = np.where(changes > 0, changes, 0)
    losses = np.where(changes < 0, -changes, 0)
    
    avg_gain = np.zeros_like(prices)
    avg_loss = np.zeros_like(prices)
    
    # Initialize
    avg_gain[period] = np.mean(gains[:period])
    avg_loss[period] = np.mean(losses[:period])
    
    # Calculate RSF
    for i in range(period + 1, len(prices)):
        avg_gain[i] = (avg_gain[i-1] * (period-1) + gains[i-1]) / period
        avg_loss[i] = (avg_loss[i-1] * (period-1) + losses[i-1]) / period
    
    rsf = avg_gain / avg_loss
    return rsf
```

## B.3 Machine Learning Models

### Feature Engineering
```python
class FeatureGenerator:
    def __init__(self, data: pd.DataFrame):
        self.data = data
        
    def generate_features(self) -> pd.DataFrame:
        """
        Generate features for ML models
        """
        df = self.data.copy()
        
        # Technical indicators
        df['rsi'] = self.calculate_rsi(df['close'])
        df['macd'] = self.calculate_macd(df['close'])
        df['bb_upper'], df['bb_lower'] = self.calculate_bollinger_bands(df['close'])
        
        # Price patterns
        df['price_momentum'] = self.calculate_momentum(df['close'])
        df['volatility'] = self.calculate_volatility(df['close'])
        
        # Volume indicators
        df['volume_price_trend'] = self.calculate_vpt(df)
        df['money_flow_index'] = self.calculate_mfi(df)
        
        return df
        
    def calculate_momentum(self, prices: pd.Series, 
                         period: int = 10) -> pd.Series:
        """
        Calculate price momentum
        """
        return prices.pct_change(period)
```

### Model Training
```python
class ModelTrainer:
    def __init__(self, features: pd.DataFrame, 
                 target: pd.Series):
        self.features = features
        self.target = target
        self.models = {}
        
    def train_models(self):
        """
        Train multiple ML models
        """
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            self.features, self.target, test_size=0.2
        )
        
        # Train models
        models = {
            'random_forest': RandomForestClassifier(),
            'xgboost': XGBClassifier(),
            'lightgbm': LGBMClassifier()
        }
        
        for name, model in models.items():
            # Train
            model.fit(X_train, y_train)
            
            # Evaluate
            train_score = model.score(X_train, y_train)
            test_score = model.score(X_test, y_test)
            
            self.models[name] = {
                'model': model,
                'train_score': train_score,
                'test_score': test_score
            }
```

## B.4 Market Microstructure

### Order Book Analysis
```python
class OrderBookAnalyzer:
    def __init__(self, order_book: pd.DataFrame):
        self.order_book = order_book
        
    def calculate_market_impact(self, 
                              order_size: float) -> float:
        """
        Calculate potential market impact
        """
        cumulative_volume = 0
        weighted_price = 0
        
        for price, volume in self.order_book.iterrows():
            if cumulative_volume + volume >= order_size:
                remaining = order_size - cumulative_volume
                weighted_price += price * remaining
                break
            
            cumulative_volume += volume
            weighted_price += price * volume
            
        return weighted_price / order_size
        
    def calculate_spread(self) -> float:
        """
        Calculate bid-ask spread
        """
        best_bid = self.order_book['bids'].iloc[0]
        best_ask = self.order_book['asks'].iloc[0]
        return (best_ask - best_bid) / best_bid
```

### Liquidity Analysis
```python
def analyze_liquidity(trades: pd.DataFrame, 
                     timeframe: str = '1H') -> dict:
    """
    Analyze market liquidity
    """
    # Resample trades to timeframe
    resampled = trades.resample(timeframe).agg({
        'volume': 'sum',
        'price': 'mean',
        'trades': 'count'
    })
    
    # Calculate metrics
    metrics = {
        'avg_trade_size': resampled['volume'] / resampled['trades'],
        'volume_profile': resampled['volume'].mean(),
        'trade_frequency': resampled['trades'].mean(),
        'price_impact': calculate_price_impact(trades)
    }
    
    return metrics
``` 