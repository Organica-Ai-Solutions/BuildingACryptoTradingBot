# Chapter 7: Advanced Strategy Optimization and Machine Learning

## Strategy Optimization Framework

### Backtesting Engine
```python
class BacktestEngine:
    def __init__(self, strategy: BaseStrategy, data: pd.DataFrame):
        self.strategy = strategy
        self.data = data
        self.results = pd.DataFrame()
        
    def run(self) -> pd.DataFrame:
        """
        Run backtest simulation
        """
        signals = self.strategy.generate_signals(self.data)
        positions = self.calculate_positions(signals)
        self.results = self.calculate_returns(positions)
        return self.results
        
    def calculate_metrics(self) -> dict:
        """
        Calculate performance metrics
        """
        return {
            'sharpe_ratio': self.calculate_sharpe_ratio(),
            'max_drawdown': self.calculate_max_drawdown(),
            'win_rate': self.calculate_win_rate(),
            'profit_factor': self.calculate_profit_factor()
        }
```

### Parameter Optimization
```python
class StrategyOptimizer:
    def __init__(self, strategy_class: Type[BaseStrategy],
                 param_grid: dict, data: pd.DataFrame):
        self.strategy_class = strategy_class
        self.param_grid = param_grid
        self.data = data
        
    def grid_search(self) -> dict:
        """
        Perform grid search optimization
        """
        best_params = None
        best_score = float('-inf')
        
        for params in self._generate_param_combinations():
            strategy = self.strategy_class(**params)
            backtest = BacktestEngine(strategy, self.data)
            results = backtest.run()
            score = self._calculate_score(results)
            
            if score > best_score:
                best_score = score
                best_params = params
                
        return {
            'params': best_params,
            'score': best_score
        }
        
    def _calculate_score(self, results: pd.DataFrame) -> float:
        """
        Calculate optimization score
        """
        sharpe = calculate_sharpe_ratio(results['returns'])
        drawdown = calculate_max_drawdown(results['equity'])
        return sharpe * (1 - drawdown)
```

## Machine Learning Integration

### Feature Engineering
```python
class FeatureEngineer:
    def __init__(self, data: pd.DataFrame):
        self.data = data
        
    def create_features(self) -> pd.DataFrame:
        """
        Create technical features for ML model
        """
        df = self.data.copy()
        
        # Price-based features
        df['returns'] = df['close'].pct_change()
        df['volatility'] = df['returns'].rolling(20).std()
        
        # Volume features
        df['volume_ma'] = df['volume'].rolling(20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_ma']
        
        # Technical indicators
        df['rsi'] = calculate_rsi(df['close'])
        df['macd'], df['signal'] = calculate_macd(df['close'])
        df['bb_upper'], df['bb_lower'] = calculate_bollinger_bands(df['close'])
        
        return df
        
    def normalize_features(self, features: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize features for ML model
        """
        scaler = StandardScaler()
        normalized = pd.DataFrame(
            scaler.fit_transform(features),
            columns=features.columns,
            index=features.index
        )
        return normalized
```

### ML Model Training
```python
class MLModelTrainer:
    def __init__(self, features: pd.DataFrame, labels: pd.Series):
        self.features = features
        self.labels = labels
        self.model = None
        
    def train_model(self, model_type: str = 'xgboost'):
        """
        Train ML model
        """
        if model_type == 'xgboost':
            self.model = XGBClassifier(
                max_depth=3,
                learning_rate=0.1,
                n_estimators=100,
                objective='binary:logistic'
            )
        elif model_type == 'lightgbm':
            self.model = LGBMClassifier(
                num_leaves=31,
                learning_rate=0.1,
                n_estimators=100
            )
            
        self.model.fit(
            self.features,
            self.labels,
            eval_metric=['auc', 'logloss']
        )
        
    def cross_validate(self, cv: int = 5) -> dict:
        """
        Perform cross-validation
        """
        scores = cross_validate(
            self.model,
            self.features,
            self.labels,
            cv=cv,
            scoring=['accuracy', 'precision', 'recall', 'f1']
        )
        return {
            metric: np.mean(values) 
            for metric, values in scores.items()
        }
```

### Signal Generation
```python
class MLSignalGenerator:
    def __init__(self, model, feature_engineer: FeatureEngineer):
        self.model = model
        self.feature_engineer = feature_engineer
        
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """
        Generate trading signals using ML model
        """
        features = self.feature_engineer.create_features(data)
        normalized = self.feature_engineer.normalize_features(features)
        predictions = self.model.predict_proba(normalized)
        
        # Generate signals based on probability threshold
        signals = pd.Series(index=data.index)
        signals[predictions[:, 1] > 0.7] = 1  # Strong buy
        signals[predictions[:, 1] < 0.3] = -1  # Strong sell
        
        return signals
```

## Ensemble Strategies

### Strategy Combination
```python
class EnsembleStrategy:
    def __init__(self, strategies: List[BaseStrategy],
                 weights: Optional[List[float]] = None):
        self.strategies = strategies
        self.weights = weights or [1/len(strategies)] * len(strategies)
        
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """
        Generate combined signals from multiple strategies
        """
        signals = pd.DataFrame()
        
        for strategy, weight in zip(self.strategies, self.weights):
            strategy_signals = strategy.generate_signals(data)
            signals[strategy.__class__.__name__] = strategy_signals
            
        # Combine signals using weights
        combined = (signals * self.weights).sum(axis=1)
        return self._threshold_signals(combined)
        
    def _threshold_signals(self, combined: pd.Series) -> pd.Series:
        """
        Apply thresholds to combined signals
        """
        signals = pd.Series(0, index=combined.index)
        signals[combined > 0.5] = 1
        signals[combined < -0.5] = -1
        return signals
```

### Dynamic Weight Adjustment
```python
class DynamicWeightOptimizer:
    def __init__(self, ensemble: EnsembleStrategy,
                 lookback_period: int = 30):
        self.ensemble = ensemble
        self.lookback_period = lookback_period
        
    def optimize_weights(self, performance_data: pd.DataFrame) -> List[float]:
        """
        Optimize strategy weights based on recent performance
        """
        recent_data = performance_data.tail(self.lookback_period)
        
        # Calculate Sharpe ratios for each strategy
        sharpe_ratios = [
            self._calculate_strategy_sharpe(recent_data, strategy)
            for strategy in self.ensemble.strategies
        ]
        
        # Convert to weights
        total_sharpe = sum(max(0, sr) for sr in sharpe_ratios)
        if total_sharpe == 0:
            return [1/len(sharpe_ratios)] * len(sharpe_ratios)
            
        weights = [max(0, sr)/total_sharpe for sr in sharpe_ratios]
        return weights
```

## Performance Analytics

### Advanced Metrics
```python
class PerformanceAnalytics:
    def __init__(self, returns: pd.Series):
        self.returns = returns
        
    def calculate_metrics(self) -> dict:
        """
        Calculate advanced performance metrics
        """
        return {
            'sharpe_ratio': self.calculate_sharpe_ratio(),
            'sortino_ratio': self.calculate_sortino_ratio(),
            'calmar_ratio': self.calculate_calmar_ratio(),
            'omega_ratio': self.calculate_omega_ratio(),
            'var_95': self.calculate_var(0.95),
            'cvar_95': self.calculate_cvar(0.95),
            'max_drawdown': self.calculate_max_drawdown(),
            'recovery_factor': self.calculate_recovery_factor()
        }
        
    def calculate_drawdown_metrics(self) -> dict:
        """
        Calculate drawdown-related metrics
        """
        drawdowns = self.calculate_drawdowns()
        return {
            'avg_drawdown': drawdowns['drawdown'].mean(),
            'avg_duration': drawdowns['duration'].mean(),
            'max_drawdown': drawdowns['drawdown'].max(),
            'max_duration': drawdowns['duration'].max()
        }
```

## Next Steps

In Chapter 8, we'll explore:

- Advanced risk management techniques
- Portfolio optimization methods
- System monitoring and alerts
- Performance reporting

Key Takeaways:
- Strategy optimization requires robust backtesting
- Machine learning can enhance trading signals
- Ensemble methods improve strategy stability
- Regular performance monitoring is crucial

Remember that successful trading requires continuous optimization and adaptation to changing market conditions. 