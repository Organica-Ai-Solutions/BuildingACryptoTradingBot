# Chapter 5: Building the Trading Engine

## System Architecture Overview

The trading engine is the core component that brings together market data, strategy signals, and order execution. Let's explore its architecture and implementation:

### Core Components
1. Data Management
   - Real-time price feeds
   - Historical data storage
   - Market event handling

2. Strategy Engine
   - Signal generation
   - Position management
   - Risk controls

3. Order Management
   - Order creation and routing
   - Position tracking
   - Execution monitoring

## Data Management System

### Market Data Handler
```python
class MarketDataHandler:
    def __init__(self, symbols: list, timeframes: list):
        self.symbols = symbols
        self.timeframes = timeframes
        self.price_feeds = {}
        self.websocket = None
        
    async def initialize(self):
        """
        Initialize real-time data feeds
        """
        self.websocket = await connect_alpaca_stream()
        for symbol in self.symbols:
            await self.subscribe_to_feeds(symbol)
            
    async def subscribe_to_feeds(self, symbol: str):
        """
        Subscribe to market data feeds
        """
        subscription = {
            "action": "subscribe",
            "bars": [f"{symbol}"],
            "quotes": [f"{symbol}"]
        }
        await self.websocket.send_json(subscription)
```

### Historical Data Cache
```python
class HistoricalDataCache:
    def __init__(self, max_bars: int = 1000):
        self.max_bars = max_bars
        self.data = defaultdict(pd.DataFrame)
        
    def update_cache(self, symbol: str, new_data: pd.DataFrame):
        """
        Update historical data cache
        """
        if symbol not in self.data:
            self.data[symbol] = new_data.tail(self.max_bars)
        else:
            self.data[symbol] = pd.concat([
                self.data[symbol], 
                new_data
            ]).tail(self.max_bars)
```

## Strategy Engine

### Strategy Manager
```python
class StrategyManager:
    def __init__(self):
        self.strategies = {}
        self.active_signals = defaultdict(list)
        
    def register_strategy(self, name: str, strategy: BaseStrategy):
        """
        Register a new trading strategy
        """
        self.strategies[name] = strategy
        
    async def process_market_update(self, market_data: dict):
        """
        Process new market data across all strategies
        """
        for name, strategy in self.strategies.items():
            signals = await strategy.generate_signals(market_data)
            self.active_signals[name].extend(signals)
```

### Position Manager
```python
class PositionManager:
    def __init__(self, risk_manager: RiskManager):
        self.positions = {}
        self.risk_manager = risk_manager
        
    async def execute_signal(self, signal: Signal):
        """
        Execute trading signal with position sizing
        """
        if self.risk_manager.check_risk_limits(signal):
            position_size = self.risk_manager.calculate_position_size(signal)
            order = await self.create_order(signal, position_size)
            return await self.submit_order(order)
        return None
```

## Order Management

### Order Router
```python
class OrderRouter:
    def __init__(self, broker_client: AlpacaClient):
        self.client = broker_client
        self.order_book = {}
        
    async def submit_order(self, order: Order):
        """
        Submit order to broker
        """
        try:
            result = await self.client.submit_order(
                symbol=order.symbol,
                qty=order.quantity,
                side=order.side,
                type=order.type,
                time_in_force='gtc'
            )
            self.order_book[result.id] = order
            return result
        except Exception as e:
            logger.error(f"Order submission failed: {e}")
            return None
```

### Position Tracker
```python
class PositionTracker:
    def __init__(self):
        self.positions = {}
        self.pnl = defaultdict(float)
        
    def update_position(self, fill: OrderFill):
        """
        Update position after order fill
        """
        symbol = fill.symbol
        if symbol not in self.positions:
            self.positions[symbol] = Position(symbol)
        
        self.positions[symbol].update(
            fill.side,
            fill.qty,
            fill.price
        )
```

## Risk Management System

### Risk Controls
```python
class RiskManager:
    def __init__(self, max_position_size: float,
                 max_portfolio_risk: float):
        self.max_position_size = max_position_size
        self.max_portfolio_risk = max_portfolio_risk
        
    def check_risk_limits(self, order: Order) -> bool:
        """
        Check if order meets risk criteria
        """
        # Position size check
        if order.notional_value > self.max_position_size:
            return False
            
        # Portfolio risk check
        portfolio_risk = self.calculate_portfolio_risk()
        if portfolio_risk > self.max_portfolio_risk:
            return False
            
        return True
```

### Performance Monitoring
```python
class PerformanceMonitor:
    def __init__(self):
        self.metrics = defaultdict(dict)
        
    def update_metrics(self, strategy: str):
        """
        Update strategy performance metrics
        """
        returns = self.calculate_returns(strategy)
        self.metrics[strategy] = {
            'sharpe_ratio': self.calculate_sharpe(returns),
            'max_drawdown': self.calculate_drawdown(returns),
            'win_rate': self.calculate_win_rate(strategy)
        }
```

## System Integration

### Main Trading Engine
```python
class TradingEngine:
    def __init__(self, config: dict):
        self.market_data = MarketDataHandler(
            config['symbols'],
            config['timeframes']
        )
        self.strategy_manager = StrategyManager()
        self.risk_manager = RiskManager(
            config['max_position_size'],
            config['max_portfolio_risk']
        )
        self.order_router = OrderRouter(
            config['broker_client']
        )
        
    async def start(self):
        """
        Start the trading engine
        """
        await self.market_data.initialize()
        await self.register_strategies()
        await self.start_trading_loop()
        
    async def trading_loop(self):
        """
        Main trading loop
        """
        while True:
            market_data = await self.market_data.get_update()
            signals = await self.strategy_manager.process_market_update(
                market_data
            )
            for signal in signals:
                if self.risk_manager.check_risk_limits(signal):
                    await self.order_router.submit_order(signal)
```

## Next Steps

In Chapter 6, we'll explore:

- Frontend dashboard development
- Real-time data visualization
- Strategy monitoring interface
- Performance analytics views

Key Takeaways:
- Modular system design enables flexibility
- Robust risk management is critical
- Real-time processing requires careful architecture
- Error handling and logging are essential

Remember that a well-designed trading engine is the foundation of a successful automated trading system. 