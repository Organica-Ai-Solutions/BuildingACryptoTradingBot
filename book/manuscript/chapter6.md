# Chapter 6: Building the Frontend Dashboard

## Dashboard Architecture

The frontend dashboard provides real-time visibility into trading operations and strategy performance. Let's explore its implementation:

### Core Features
1. Strategy Configuration Panel
   - Symbol selection
   - Strategy parameters
   - Risk settings

2. Active Positions Monitor
   - Current positions
   - P&L tracking
   - Risk metrics

3. Performance Analytics
   - Strategy returns
   - Historical performance
   - Risk-adjusted metrics

## React Components

### Strategy Settings Panel
```typescript
interface StrategyConfig {
    symbol: string;
    strategyType: 'SUPERTREND' | 'MACD';
    parameters: Record<string, number>;
    riskLimit: number;
}

const StrategyPanel: React.FC = () => {
    const [config, setConfig] = useState<StrategyConfig>({
        symbol: 'BTC/USD',
        strategyType: 'SUPERTREND',
        parameters: {
            period: 10,
            multiplier: 3
        },
        riskLimit: 2.0
    });
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/strategy/configure', config);
            toast.success('Strategy configured successfully');
        } catch (error) {
            toast.error('Failed to configure strategy');
        }
    };
    
    return (
        <div className="strategy-panel">
            <form onSubmit={handleSubmit}>
                <SymbolSelector 
                    value={config.symbol}
                    onChange={(symbol) => setConfig({...config, symbol})}
                />
                <StrategyTypeSelector 
                    value={config.strategyType}
                    onChange={(type) => setConfig({...config, strategyType: type})}
                />
                <ParametersInput 
                    parameters={config.parameters}
                    onChange={(params) => setConfig({...config, parameters: params})}
                />
                <RiskLimitInput 
                    value={config.riskLimit}
                    onChange={(limit) => setConfig({...config, riskLimit: limit})}
                />
                <button type="submit">Apply Configuration</button>
            </form>
        </div>
    );
};
```

### Position Monitor
```typescript
interface Position {
    symbol: string;
    side: 'LONG' | 'SHORT';
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    risk: number;
}

const PositionMonitor: React.FC = () => {
    const [positions, setPositions] = useState<Position[]>([]);
    
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:5000/ws/positions');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setPositions(data.positions);
        };
        
        return () => ws.close();
    }, []);
    
    return (
        <div className="position-monitor">
            <table>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Side</th>
                        <th>Quantity</th>
                        <th>Entry Price</th>
                        <th>Current Price</th>
                        <th>P&L</th>
                        <th>Risk</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.map((position) => (
                        <PositionRow key={position.symbol} position={position} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};
```

### Performance Charts
```typescript
interface ChartData {
    timestamp: number;
    value: number;
}

const PerformanceChart: React.FC<{strategyId: string}> = ({ strategyId }) => {
    const [data, setData] = useState<ChartData[]>([]);
    const chartRef = useRef<any>(null);
    
    useEffect(() => {
        // Initialize Chart.js
        const ctx = chartRef.current.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Strategy Performance',
                    data: data,
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Real-time updates
        const ws = new WebSocket(`ws://localhost:5000/ws/performance/${strategyId}`);
        ws.onmessage = (event) => {
            const newData = JSON.parse(event.data);
            setData(current => [...current, newData]);
            chart.update();
        };
        
        return () => {
            chart.destroy();
            ws.close();
        };
    }, [strategyId]);
    
    return (
        <div className="performance-chart">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};
```

## Real-Time Data Management

### WebSocket Handler
```typescript
class WebSocketManager {
    private connections: Map<string, WebSocket>;
    
    constructor() {
        this.connections = new Map();
    }
    
    connect(endpoint: string, onMessage: (data: any) => void): void {
        if (this.connections.has(endpoint)) {
            return;
        }
        
        const ws = new WebSocket(`ws://localhost:5000/ws/${endpoint}`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error(`WebSocket error: ${error}`);
            this.reconnect(endpoint, onMessage);
        };
        
        this.connections.set(endpoint, ws);
    }
    
    private reconnect(endpoint: string, onMessage: (data: any) => void): void {
        setTimeout(() => {
            this.connect(endpoint, onMessage);
        }, 5000);
    }
}
```

### Data Store
```typescript
interface AppState {
    positions: Position[];
    performance: Record<string, ChartData[]>;
    strategies: StrategyConfig[];
}

const store = create<AppState>((set) => ({
    positions: [],
    performance: {},
    strategies: [],
    
    updatePositions: (positions: Position[]) => 
        set({ positions }),
    
    updatePerformance: (strategyId: string, data: ChartData) =>
        set((state) => ({
            performance: {
                ...state.performance,
                [strategyId]: [...(state.performance[strategyId] || []), data]
            }
        })),
    
    addStrategy: (strategy: StrategyConfig) =>
        set((state) => ({
            strategies: [...state.strategies, strategy]
        }))
}));
```

## User Interface Components

### Alert System
```typescript
interface Alert {
    type: 'success' | 'warning' | 'error';
    message: string;
    timestamp: number;
}

const AlertSystem: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:5000/ws/alerts');
        
        ws.onmessage = (event) => {
            const alert = JSON.parse(event.data);
            setAlerts(current => [...current, alert]);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                setAlerts(current => 
                    current.filter(a => a.timestamp !== alert.timestamp)
                );
            }, 5000);
        };
        
        return () => ws.close();
    }, []);
    
    return (
        <div className="alert-container">
            {alerts.map((alert) => (
                <div key={alert.timestamp} className={`alert alert-${alert.type}`}>
                    {alert.message}
                </div>
            ))}
        </div>
    );
};
```

### Navigation Menu
```typescript
const Navigation: React.FC = () => {
    return (
        <nav className="main-nav">
            <ul>
                <li>
                    <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                    <Link to="/strategies">Strategies</Link>
                </li>
                <li>
                    <Link to="/positions">Positions</Link>
                </li>
                <li>
                    <Link to="/performance">Performance</Link>
                </li>
                <li>
                    <Link to="/settings">Settings</Link>
                </li>
            </ul>
        </nav>
    );
};
```

## Next Steps

In Chapter 7, we'll explore:

- Advanced strategy optimization
- Machine learning integration
- Portfolio analytics
- System monitoring and alerts

Key Takeaways:
- Real-time data handling requires careful state management
- Component modularity enables easy maintenance
- WebSocket connections need robust error handling
- User interface should be intuitive and responsive

Remember that a well-designed frontend is crucial for effective trading system monitoring and control. 