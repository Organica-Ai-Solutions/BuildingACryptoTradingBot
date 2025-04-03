# Chapter 9: Advanced Trading Strategies and Market Regime Detection

## Market Regime Analysis

### Regime Detection
```python
class MarketRegimeDetector:
    def __init__(self, lookback_period: int = 60,
                 volatility_window: int = 20):
        self.lookback_period = lookback_period
        self.volatility_window = volatility_window
        
    def detect_regime(self, data: pd.DataFrame) -> str:
        """
        Detect current market regime
        
        Returns:
            str: 'trend', 'mean_reversion', 'high_volatility'
        """
        # Calculate key metrics
        trend_strength = self.calculate_trend_strength(data)
        volatility = self.calculate_volatility(data)
        mean_reversion = self.calculate_mean_reversion(data)
        
        # Determine regime
        if volatility > self.volatility_threshold(data):
            return 'high_volatility'
        elif trend_strength > 0.7:
            return 'trend'
        elif mean_reversion > 0.7:
            return 'mean_reversion'
        else:
            return 'mixed'
            
    def calculate_trend_strength(self, data: pd.DataFrame) -> float:
        """
        Calculate trend strength using multiple indicators
        """
        # ADX for trend strength
        adx = self.calculate_adx(data)
        
        # Price relative to moving averages
        sma_50 = data['close'].rolling(50).mean()
        sma_200 = data['close'].rolling(200).mean()
        price_trend = (data['close'] > sma_50) & (sma_50 > sma_200)
        
        # Combine indicators
        trend_score = (adx / 100 + price_trend.mean()) / 2
        return trend_score
```

### Adaptive Strategy Selection
```python
class AdaptiveStrategyManager:
    def __init__(self, regime_detector: MarketRegimeDetector):
        self.regime_detector = regime_detector
        self.strategies = {
            'trend': [SupertrendStrategy(), MACDStrategy()],
            'mean_reversion': [RSIStrategy(), BollingerBandsStrategy()],
            'high_volatility': [OptionsPairStrategy(), VolumeWeightedStrategy()]
        }
        
    async def select_strategies(self, data: pd.DataFrame) -> List[BaseStrategy]:
        """
        Select appropriate strategies for current regime
        """
        regime = self.regime_detector.detect_regime(data)
        selected_strategies = self.strategies[regime]
        
        # Adjust strategy parameters for regime
        for strategy in selected_strategies:
            await self.optimize_parameters(strategy, data, regime)
            
        return selected_strategies
        
    async def optimize_parameters(self, strategy: BaseStrategy,
                                data: pd.DataFrame,
                                regime: str):
        """
        Optimize strategy parameters for current regime
        """
        param_ranges = self.get_regime_parameters(strategy, regime)
        optimizer = StrategyOptimizer(strategy.__class__, param_ranges)
        optimal_params = await optimizer.optimize(data)
        
        # Update strategy parameters
        strategy.update_parameters(**optimal_params)
```

## Advanced Strategy Components

### Options Integration
```python
class OptionsPairStrategy(BaseStrategy):
    def __init__(self, delta_threshold: float = 0.3,
                 gamma_limit: float = 0.1):
        self.delta_threshold = delta_threshold
        self.gamma_limit = gamma_limit
        
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """
        Generate trading signals using options data
        """
        signals = pd.Series(0, index=data.index)
        
        # Calculate implied volatility
        iv = self.calculate_implied_volatility(data)
        
        # Calculate options Greeks
        delta = self.calculate_delta(data)
        gamma = self.calculate_gamma(data)
        
        # Generate signals based on options metrics
        for i in range(1, len(data)):
            if (abs(delta[i]) < self.delta_threshold and 
                gamma[i] < self.gamma_limit):
                if iv[i] > iv[i-1] * 1.1:  # IV spike
                    signals[i] = -1  # Sell volatility
                elif iv[i] < iv[i-1] * 0.9:  # IV crush
                    signals[i] = 1  # Buy volatility
                    
        return signals
```

### Volume Analysis
```python
class VolumeWeightedStrategy(BaseStrategy):
    def __init__(self, volume_threshold: float = 2.0,
                 price_impact: float = 0.01):
        self.volume_threshold = volume_threshold
        self.price_impact = price_impact
        
    def analyze_volume_profile(self, data: pd.DataFrame) -> dict:
        """
        Analyze volume profile for trading signals
        """
        volume = data['volume']
        close = data['close']
        
        # Calculate volume metrics
        vwap = self.calculate_vwap(data)
        volume_ma = volume.rolling(20).mean()
        relative_volume = volume / volume_ma
        
        # Calculate price impact
        price_impact = abs(close - vwap) / close
        
        return {
            'vwap': vwap,
            'relative_volume': relative_volume,
            'price_impact': price_impact
        }
        
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """
        Generate signals based on volume analysis
        """
        volume_profile = self.analyze_volume_profile(data)
        signals = pd.Series(0, index=data.index)
        
        # Generate signals
        high_volume = volume_profile['relative_volume'] > self.volume_threshold
        low_impact = volume_profile['price_impact'] < self.price_impact
        
        signals[high_volume & low_impact] = 1
        
        return signals
```

## Machine Learning Enhancement

### Feature Engineering
```python
class MLFeatureGenerator:
    def __init__(self, technical_indicators: List[BaseIndicator]):
        self.indicators = technical_indicators
        
    def generate_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate features for ML model
        """
        features = pd.DataFrame(index=data.index)
        
        # Technical indicators
        for indicator in self.indicators:
            indicator_data = indicator.calculate(data)
            features = pd.concat([features, indicator_data], axis=1)
            
        # Price-based features
        features['returns'] = data['close'].pct_change()
        features['volatility'] = features['returns'].rolling(20).std()
        
        # Volume features
        features['volume_ma'] = data['volume'].rolling(20).mean()
        features['relative_volume'] = data['volume'] / features['volume_ma']
        
        # Market regime features
        features['trend_strength'] = self.calculate_trend_strength(data)
        features['regime'] = self.detect_regime(data)
        
        return features
```

### Model Training Pipeline
```python
class MLModelTrainer:
    def __init__(self, model_config: dict):
        self.config = model_config
        self.models = {}
        
    async def train_models(self, features: pd.DataFrame,
                          labels: pd.Series):
        """
        Train multiple ML models
        """
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=0.2
        )
        
        # Train models
        for name, params in self.config.items():
            model = self.initialize_model(name, params)
            await self.train_model(model, X_train, y_train)
            
            # Evaluate model
            performance = self.evaluate_model(model, X_test, y_test)
            self.models[name] = {
                'model': model,
                'performance': performance
            }
            
    def evaluate_model(self, model, X_test: pd.DataFrame,
                      y_test: pd.Series) -> dict:
        """
        Evaluate model performance
        """
        predictions = model.predict(X_test)
        
        return {
            'accuracy': accuracy_score(y_test, predictions),
            'precision': precision_score(y_test, predictions),
            'recall': recall_score(y_test, predictions),
            'f1': f1_score(y_test, predictions)
        }
```

## Strategy Deployment

### Production Pipeline
```python
class ProductionPipeline:
    def __init__(self, strategy_manager: AdaptiveStrategyManager,
                 ml_model: MLModelTrainer,
                 risk_manager: RiskManagementPipeline):
        self.strategy_manager = strategy_manager
        self.ml_model = ml_model
        self.risk_manager = risk_manager
        
    async def execute_trading_cycle(self):
        """
        Execute complete trading cycle
        """
        while True:
            try:
                # Update market data
                data = await self.fetch_market_data()
                
                # Detect regime and select strategies
                strategies = await self.strategy_manager.select_strategies(data)
                
                # Generate ML features
                features = self.ml_model.generate_features(data)
                
                # Generate and combine signals
                signals = await self.combine_signals(strategies, features)
                
                # Execute trades with risk management
                await self.execute_trades(signals)
                
                # Monitor and adjust
                await self.risk_manager.run_risk_checks()
                
            except Exception as e:
                logging.error(f"Trading cycle error: {e}")
                
            await asyncio.sleep(60)  # Run every minute
```

## Next Steps

In Chapter 10, we'll explore:

- System deployment and scaling
- Performance monitoring
- Regulatory compliance
- Future enhancements

Key Takeaways:
- Market regimes require adaptive strategies
- ML enhances signal generation
- Volume analysis provides additional insights
- Production systems need robust monitoring

Remember that successful trading requires continuous adaptation to changing market conditions. 