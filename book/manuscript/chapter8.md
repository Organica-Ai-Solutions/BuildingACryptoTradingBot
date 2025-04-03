# Chapter 8: Advanced Risk Management and Portfolio Optimization

## Risk Management Framework

### Position Risk Calculator
```python
class PositionRiskCalculator:
    def __init__(self, max_portfolio_risk: float = 0.02,
                 max_correlation: float = 0.7):
        self.max_portfolio_risk = max_portfolio_risk
        self.max_correlation = max_correlation
        
    def calculate_position_risk(self, position: Position,
                              portfolio: Portfolio) -> dict:
        """
        Calculate comprehensive position risk metrics
        """
        return {
            'value_at_risk': self.calculate_var(position),
            'expected_shortfall': self.calculate_es(position),
            'correlation_risk': self.calculate_correlation(position, portfolio),
            'concentration_risk': self.calculate_concentration(position, portfolio)
        }
        
    def calculate_var(self, position: Position,
                     confidence: float = 0.95) -> float:
        """
        Calculate Value at Risk
        """
        returns = position.get_returns()
        var = np.percentile(returns, (1 - confidence) * 100)
        return position.current_value * var
        
    def calculate_correlation(self, position: Position,
                            portfolio: Portfolio) -> float:
        """
        Calculate position correlation with portfolio
        """
        if len(portfolio.positions) == 0:
            return 0.0
            
        portfolio_returns = portfolio.get_returns()
        position_returns = position.get_returns()
        
        return np.corrcoef(portfolio_returns, position_returns)[0, 1]
```

### Portfolio Risk Manager
```python
class PortfolioRiskManager:
    def __init__(self, risk_calculator: PositionRiskCalculator):
        self.calculator = risk_calculator
        self.risk_limits = {
            'position_size': 0.2,  # Max 20% in single position
            'sector_exposure': 0.3,  # Max 30% in single sector
            'total_leverage': 2.0   # Max 2x leverage
        }
        
    def check_portfolio_risk(self, portfolio: Portfolio) -> bool:
        """
        Check if portfolio meets risk criteria
        """
        # Check position concentration
        for position in portfolio.positions:
            if position.value / portfolio.total_value > self.risk_limits['position_size']:
                return False
                
        # Check sector exposure
        sector_exposure = self.calculate_sector_exposure(portfolio)
        if max(sector_exposure.values()) > self.risk_limits['sector_exposure']:
            return False
            
        # Check leverage
        if portfolio.get_leverage() > self.risk_limits['total_leverage']:
            return False
            
        return True
        
    def optimize_position_sizes(self, portfolio: Portfolio) -> dict:
        """
        Optimize position sizes to minimize risk
        """
        current_positions = portfolio.get_positions()
        risk_contributions = self.calculate_risk_contributions(portfolio)
        
        # Target equal risk contribution
        target_risk = 1.0 / len(current_positions)
        
        # Calculate adjustment factors
        adjustments = {
            symbol: target_risk / risk_contributions[symbol]
            for symbol in current_positions.keys()
        }
        
        return adjustments
```

## Portfolio Optimization

### Modern Portfolio Theory
```python
class PortfolioOptimizer:
    def __init__(self, risk_free_rate: float = 0.02):
        self.risk_free_rate = risk_free_rate
        
    def optimize_portfolio(self, returns: pd.DataFrame,
                         target_return: float = None) -> dict:
        """
        Optimize portfolio weights using MPT
        """
        # Calculate expected returns and covariance
        exp_returns = returns.mean()
        cov_matrix = returns.cov()
        
        # Define optimization constraints
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},  # Weights sum to 1
            {'type': 'ineq', 'fun': lambda x: x}  # Non-negative weights
        ]
        
        if target_return is not None:
            constraints.append({
                'type': 'eq',
                'fun': lambda x: np.sum(exp_returns * x) - target_return
            })
        
        # Optimize for minimum volatility
        result = minimize(
            lambda x: self.portfolio_volatility(x, cov_matrix),
            x0=np.array([1/len(returns.columns)] * len(returns.columns)),
            constraints=constraints
        )
        
        return dict(zip(returns.columns, result.x))
        
    def calculate_efficient_frontier(self, returns: pd.DataFrame,
                                   points: int = 100) -> pd.DataFrame:
        """
        Calculate efficient frontier points
        """
        min_ret = returns.mean().min()
        max_ret = returns.mean().max()
        target_returns = np.linspace(min_ret, max_ret, points)
        
        efficient_portfolios = []
        for target in target_returns:
            weights = self.optimize_portfolio(returns, target)
            portfolio_return = self.portfolio_return(weights, returns)
            portfolio_vol = self.portfolio_volatility(
                list(weights.values()),
                returns.cov()
            )
            efficient_portfolios.append({
                'return': portfolio_return,
                'volatility': portfolio_vol,
                'sharpe': (portfolio_return - self.risk_free_rate) / portfolio_vol,
                'weights': weights
            })
            
        return pd.DataFrame(efficient_portfolios)
```

### Risk Parity Strategy
```python
class RiskParityOptimizer:
    def __init__(self, risk_target: float = 0.15):
        self.risk_target = risk_target
        
    def optimize_risk_parity(self, returns: pd.DataFrame) -> dict:
        """
        Calculate risk parity portfolio weights
        """
        cov_matrix = returns.cov()
        assets = returns.columns
        n_assets = len(assets)
        
        def risk_budget_objective(weights):
            portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            risk_contributions = weights * (np.dot(cov_matrix, weights)) / portfolio_vol
            return np.sum((risk_contributions - portfolio_vol/n_assets)**2)
        
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'ineq', 'fun': lambda x: x}
        ]
        
        result = minimize(
            risk_budget_objective,
            x0=np.array([1/n_assets] * n_assets),
            constraints=constraints
        )
        
        return dict(zip(assets, result.x))
```

## System Monitoring

### Performance Monitor
```python
class PerformanceMonitor:
    def __init__(self, portfolio: Portfolio):
        self.portfolio = portfolio
        self.metrics_history = defaultdict(list)
        
    def update_metrics(self):
        """
        Update performance metrics
        """
        metrics = {
            'total_value': self.portfolio.get_total_value(),
            'daily_return': self.portfolio.get_daily_return(),
            'sharpe_ratio': self.calculate_sharpe_ratio(),
            'drawdown': self.calculate_drawdown(),
            'var': self.calculate_var(),
            'positions': len(self.portfolio.positions)
        }
        
        for key, value in metrics.items():
            self.metrics_history[key].append({
                'timestamp': datetime.now(),
                'value': value
            })
            
        return metrics
        
    def generate_report(self, start_date: datetime,
                       end_date: datetime) -> dict:
        """
        Generate performance report
        """
        period_metrics = self.get_period_metrics(start_date, end_date)
        
        return {
            'summary': self.calculate_summary_stats(period_metrics),
            'risk_metrics': self.calculate_risk_metrics(period_metrics),
            'position_analysis': self.analyze_positions(period_metrics)
        }
```

### Alert System
```python
class AlertSystem:
    def __init__(self):
        self.alert_levels = {
            'critical': 1,
            'warning': 2,
            'info': 3
        }
        self.alerts = []
        
    def add_alert(self, message: str, level: str,
                  source: str = None):
        """
        Add new alert to the system
        """
        alert = {
            'timestamp': datetime.now(),
            'message': message,
            'level': level,
            'source': source
        }
        self.alerts.append(alert)
        
        if level == 'critical':
            self.handle_critical_alert(alert)
            
    def handle_critical_alert(self, alert: dict):
        """
        Handle critical alerts
        """
        # Stop trading
        self.portfolio.stop_trading()
        
        # Notify administrators
        self.send_notification(alert)
        
        # Log alert
        logging.critical(f"Critical alert: {alert['message']}")
```

## System Integration

### Risk Management Pipeline
```python
class RiskManagementPipeline:
    def __init__(self, portfolio: Portfolio,
                 risk_manager: PortfolioRiskManager,
                 performance_monitor: PerformanceMonitor,
                 alert_system: AlertSystem):
        self.portfolio = portfolio
        self.risk_manager = risk_manager
        self.monitor = performance_monitor
        self.alert_system = alert_system
        
    async def run_risk_checks(self):
        """
        Run continuous risk management checks
        """
        while True:
            try:
                # Update performance metrics
                metrics = self.monitor.update_metrics()
                
                # Check risk limits
                if not self.risk_manager.check_portfolio_risk(self.portfolio):
                    self.alert_system.add_alert(
                        "Portfolio risk limits exceeded",
                        "warning",
                        "risk_manager"
                    )
                    
                # Check for large drawdowns
                if metrics['drawdown'] > 0.1:  # 10% drawdown
                    self.alert_system.add_alert(
                        f"Large drawdown detected: {metrics['drawdown']:.2%}",
                        "critical",
                        "performance_monitor"
                    )
                    
                # Optimize position sizes
                adjustments = self.risk_manager.optimize_position_sizes(
                    self.portfolio
                )
                await self.apply_adjustments(adjustments)
                
            except Exception as e:
                self.alert_system.add_alert(
                    f"Risk management error: {str(e)}",
                    "critical",
                    "risk_pipeline"
                )
                
            await asyncio.sleep(60)  # Check every minute
```

## Next Steps

In Chapter 9, we'll explore:

- Advanced trading strategies
- Market regime detection
- Machine learning optimization
- System deployment

Key Takeaways:
- Risk management is multi-faceted
- Portfolio optimization improves stability
- Continuous monitoring is essential
- Alert systems enable quick response

Remember that effective risk management is crucial for long-term trading success. 