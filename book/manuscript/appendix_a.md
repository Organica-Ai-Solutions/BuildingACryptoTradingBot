# Appendix A: Technical Implementation Details

## A.1 Environment Setup

### Development Environment
```python
# requirements.txt
alpaca-trade-api==3.0.0
pandas==2.0.0
numpy==1.23.0
scikit-learn==1.2.0
fastapi==0.95.0
uvicorn==0.21.0
pytest==7.3.1
python-dotenv==1.0.0
redis==4.5.4
postgresql==3.0.0
```

### Configuration Management
```python
class Config:
    def __init__(self, env_file: str = ".env"):
        load_dotenv(env_file)
        
        # API Configuration
        self.alpaca_key_id = os.getenv("ALPACA_KEY_ID")
        self.alpaca_secret = os.getenv("ALPACA_SECRET")
        self.alpaca_url = os.getenv("ALPACA_URL")
        
        # Database Configuration
        self.db_host = os.getenv("DB_HOST")
        self.db_port = int(os.getenv("DB_PORT", 5432))
        self.db_name = os.getenv("DB_NAME")
        self.db_user = os.getenv("DB_USER")
        self.db_password = os.getenv("DB_PASSWORD")
        
        # Redis Configuration
        self.redis_host = os.getenv("REDIS_HOST")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        
        # Trading Parameters
        self.risk_per_trade = float(os.getenv("RISK_PER_TRADE", 0.02))
        self.max_position_size = float(os.getenv("MAX_POSITION_SIZE", 0.1))
```

## A.2 Database Schema

### Trading Database
```sql
-- Create tables for trading system

-- Market Data
CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open DECIMAL(10,2) NOT NULL,
    high DECIMAL(10,2) NOT NULL,
    low DECIMAL(10,2) NOT NULL,
    close DECIMAL(10,2) NOT NULL,
    volume INTEGER NOT NULL,
    UNIQUE(symbol, timestamp)
);

-- Trading Signals
CREATE TABLE signals (
    id SERIAL PRIMARY KEY,
    strategy_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    signal_type VARCHAR(10) NOT NULL,
    strength DECIMAL(5,2) NOT NULL,
    parameters JSONB,
    UNIQUE(strategy_id, symbol, timestamp)
);

-- Trades
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP,
    entry_price DECIMAL(10,2) NOT NULL,
    exit_price DECIMAL(10,2),
    quantity INTEGER NOT NULL,
    strategy_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    pnl DECIMAL(10,2),
    metadata JSONB
);
```

## A.3 Testing Framework

### Strategy Testing
```python
class StrategyTester:
    def __init__(self, strategy: BaseStrategy, data: pd.DataFrame):
        self.strategy = strategy
        self.data = data
        self.results = []
        
    def run_backtest(self, 
                     initial_capital: float = 100000.0,
                     commission: float = 0.001) -> dict:
        """
        Run backtest on historical data
        """
        portfolio = Portfolio(initial_capital)
        
        for timestamp, row in self.data.iterrows():
            # Generate signals
            signal = self.strategy.generate_signal(row)
            
            # Execute trades
            if signal.type == SignalType.BUY:
                portfolio.enter_long(
                    symbol=signal.symbol,
                    price=row['close'],
                    size=self._calculate_position_size(portfolio, row)
                )
            elif signal.type == SignalType.SELL:
                portfolio.exit_position(
                    symbol=signal.symbol,
                    price=row['close']
                )
                
            # Update portfolio
            portfolio.update(row['close'], commission)
            
            # Record results
            self.results.append({
                'timestamp': timestamp,
                'portfolio_value': portfolio.value,
                'cash': portfolio.cash,
                'holdings': portfolio.holdings,
                'returns': portfolio.returns
            })
            
        return self._generate_performance_metrics()
        
    def _generate_performance_metrics(self) -> dict:
        """
        Calculate performance metrics
        """
        df = pd.DataFrame(self.results)
        returns = df['returns']
        
        return {
            'total_return': returns.sum(),
            'annual_return': returns.mean() * 252,
            'sharpe_ratio': returns.mean() / returns.std() * np.sqrt(252),
            'max_drawdown': self._calculate_max_drawdown(df['portfolio_value']),
            'win_rate': len(returns[returns > 0]) / len(returns)
        }
```

## A.4 Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes Deployment
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-bot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trading-bot
  template:
    metadata:
      labels:
        app: trading-bot
    spec:
      containers:
      - name: trading-bot
        image: trading-bot:latest
        ports:
        - containerPort: 8000
        env:
        - name: ALPACA_KEY_ID
          valueFrom:
            secretKeyRef:
              name: trading-secrets
              key: alpaca-key-id
        - name: ALPACA_SECRET
          valueFrom:
            secretKeyRef:
              name: trading-secrets
              key: alpaca-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## A.5 Monitoring and Alerting

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'trading-bot'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Trading Bot Dashboard",
    "panels": [
      {
        "title": "Trading Performance",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "trading_pnl_total",
            "legendFormat": "Total P&L"
          }
        ]
      },
      {
        "title": "Active Positions",
        "type": "table",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "trading_positions",
            "legendFormat": "Positions"
          }
        ]
      }
    ]
  }
}
``` 