# Building a Cryptocurrency Trading Bot
## A Complete Guide

> Dedicated to all crypto enthusiasts who want to automate their trading strategies.

# Preface

This book guides you through the complete process of building a cryptocurrency trading bot from scratch. Whether you're a seasoned developer looking to automate your trading strategies or a crypto enthusiast looking to explore algorithmic trading, this guide provides you with the knowledge and tools to create and deploy your own trading system.

As the cryptocurrency market continues to evolve, automated trading solutions have become increasingly popular among traders seeking to capitalize on the market's volatility and 24/7 nature. This book offers a practical approach to building such solutions, focusing on both the technical aspects of creating a robust trading engine and the strategic considerations necessary for successful trading.

# Chapter 1: Introduction to Cryptocurrency Trading Automation

# Chapter 1: Introduction to Cryptocurrency Trading Automation

## The Evolution of Crypto Trading
The cryptocurrency market has undergone a remarkable transformation since Bitcoin's inception in 2009. What began as a niche digital currency has evolved into a diverse ecosystem of digital assets, trading platforms, and sophisticated trading strategies. This evolution has created unique opportunities for automated trading systems.

### Historical Perspective

The cryptocurrency market evolution can be divided into several key phases:

1. **Genesis Phase (2009-2013)**
   - Bitcoin's creation by Satoshi Nakamoto
   - Limited trading on early exchanges like Mt. Gox
   - Manual trading dominated with basic order books
   - Price volatility was extreme with little liquidity

2. **Early Growth Phase (2014-2016)**
   - Introduction of altcoins (Ethereum, Litecoin, etc.)
   - Development of more sophisticated exchanges
   - First trading bots appeared (mostly proprietary)
   - Market capitalization reached billions

3. **Maturity Phase (2017-Present)**
   - Institutional adoption beginning
   - Advanced exchange APIs enabling automation
   - Regulatory frameworks emerging
   - Derivatives markets (futures, options) developing
   - Decentralized exchanges and DeFi protocols

This evolution has created an environment where algorithmic trading has become not just viable but often necessary to compete effectively.

### Current Market Dynamics

Today's cryptocurrency market presents unique characteristics:

```python
MARKET_CHARACTERISTICS = {
    'trading_hours': '24/7/365',
    'volatility': 'High (often 5-10% daily swings)',
    'liquidity': {
        'major_pairs': 'High (BTC, ETH, etc.)',
        'alt_coins': 'Variable to low'
    },
    'market_inefficiencies': 'Significant arbitrage opportunities across exchanges',
    'barriers_to_entry': 'Low compared to traditional markets',
    'regulatory_landscape': 'Evolving and jurisdiction-dependent'
}
```

These characteristics create both challenges and opportunities:

- **Challenges**: Extreme volatility, potential for flash crashes, liquidity concerns
- **Opportunities**: Price inefficiencies, 24/7 trading potential, emerging market growth

### The Rise of Automated Trading

Traditional manual trading faces several challenges in the cryptocurrency market:
- 24/7 market operation requiring constant attention
- High volatility demanding quick reactions
- Complex market dynamics across multiple exchanges
- Psychological factors affecting decision-making
- Data-intensive analysis requirements

Automated trading systems address these challenges by providing:
- Continuous market monitoring without fatigue
- Consistent strategy execution based on predefined rules
- Emotional discipline removing fear and greed
- Rapid response to market changes in milliseconds
- Ability to process vast amounts of data simultaneously
- Execution across multiple markets and exchanges

#### Example: Emotional Impact on Trading

Manual traders often fall victim to psychological biases:

```python
# Simplified representation of emotional trading behavior
def manual_trading_decision(price, previous_price, portfolio):
    # Fear when prices fall
    if price < previous_price * 0.95:  # 5% drop
        return "SELL"  # Panic selling
    
    # Greed when prices rise
    if price > previous_price * 1.10:  # 10% rise
        return "BUY"  # FOMO buying
    
    # Analysis paralysis otherwise
    return "WAIT"  # Missed opportunities

# Versus algorithmic approach
def algo_trading_decision(price, moving_avg_50, moving_avg_200, rsi):
    # Golden cross strategy with RSI filter
    if moving_avg_50 > moving_avg_200 and rsi < 70:
        return "BUY"
    
    # Death cross strategy with RSI filter
    if moving_avg_50 < moving_avg_200 and rsi > 30:
        return "SELL"
    
    return "HOLD"
```

This simple example illustrates how algorithmic trading removes emotional biases and follows a consistent approach.

## Algorithmic Trading Strategies for Cryptocurrencies

Understanding the landscape of algorithmic trading strategies is essential before developing our own trading system. Different strategies capitalize on various market behaviors and timeframes.

### Strategy Categories and Their Application to Crypto

Algorithmic trading strategies generally fall into several categories, each with unique applications to cryptocurrency markets:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ALGORITHMIC TRADING STRATEGY SPECTRUM                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │             │  │             │  │             │             │
│  │   Trend     │  │  Mean       │  │  Market     │  • • •      │
│  │  Following  │  │ Reversion   │  │  Making     │             │
│  │             │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │             │  │             │  │             │             │
│  │ Statistical │  │  Machine    │  │             │             │
│  │ Arbitrage   │  │  Learning   │  │  TA-Based   │  • • •      │
│  │             │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Let's explore each category with crypto-specific implementations:

#### 1. Trend Following Strategies

Trend following strategies aim to capture directional price movements, assuming that assets tend to continue moving in the same direction.

**Crypto Implementation Example: Supertrend Strategy**

```python
def calculate_supertrend(df, atr_period=10, multiplier=3.0):
    """Calculate Supertrend indicator values for a DataFrame of OHLC data"""
    # Calculate ATR
    df['tr'] = np.maximum(
        np.maximum(
            df['high'] - df['low'],
            abs(df['high'] - df['close'].shift(1))
        ),
        abs(df['low'] - df['close'].shift(1))
    )
    df['atr'] = df['tr'].rolling(atr_period).mean()
    
    # Calculate Upper and Lower Bands
    df['upperband'] = ((df['high'] + df['low']) / 2) + (multiplier * df['atr'])
    df['lowerband'] = ((df['high'] + df['low']) / 2) - (multiplier * df['atr'])
    
    # Initialize Supertrend columns
    df['supertrend'] = None
    df['direction'] = None
    
    # First row values
    df.loc[atr_period, 'supertrend'] = df.loc[atr_period, 'lowerband']
    df.loc[atr_period, 'direction'] = 1
    
    # Calculate Supertrend values
    for i in range(atr_period+1, len(df)):
        # If current close price crosses above upperband
        if df.loc[i-1, 'supertrend'] == df.loc[i-1, 'upperband']:
            if df.loc[i, 'close'] > df.loc[i, 'upperband']:
                df.loc[i, 'supertrend'] = df.loc[i, 'lowerband']
                df.loc[i, 'direction'] = 1
            else:
                df.loc[i, 'supertrend'] = df.loc[i, 'upperband']
                df.loc[i, 'direction'] = -1
        
        # If current close price crosses below lowerband
        elif df.loc[i-1, 'supertrend'] == df.loc[i-1, 'lowerband']:
            if df.loc[i, 'close'] < df.loc[i, 'lowerband']:
                df.loc[i, 'supertrend'] = df.loc[i, 'upperband']
                df.loc[i, 'direction'] = -1
            else:
                df.loc[i, 'supertrend'] = df.loc[i, 'lowerband']
                df.loc[i, 'direction'] = 1
    
    return df
```

The Supertrend strategy performs exceptionally well during strong cryptocurrency trends, which occur frequently in this volatile market. Its adaptive nature (using ATR) accommodates the varying volatility characteristic of crypto markets.

**Performance in Crypto Markets:**
- Strong in parabolic bull markets and sustained downtrends
- Weak during ranging or choppy market conditions
- Typically used on 4-hour or daily timeframes for Bitcoin and major altcoins

#### 2. Mean Reversion Strategies

Mean reversion strategies operate on the principle that prices tend to revert to their historical average over time.

**Crypto Implementation Example: RSI Oscillator Strategy**

```python
def rsi_mean_reversion_strategy(df, rsi_period=14, oversold=30, overbought=70):
    """Generate mean reversion signals based on RSI"""
    # Calculate RSI
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=rsi_period).mean()
    avg_loss = loss.rolling(window=rsi_period).mean()
    
    rs = avg_gain / avg_loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # Generate signals
    df['signal'] = None
    df.loc[df['rsi'] < oversold, 'signal'] = 'BUY'
    df.loc[df['rsi'] > overbought, 'signal'] = 'SELL'
    
    return df
```

Mean reversion works particularly well in cryptocurrency markets during consolidation phases, as these markets often experience extreme price swings followed by periods of normalization.

**Performance in Crypto Markets:**
- Excellent during range-bound markets (common in crypto after high volatility periods)
- Dangerous during strong trends (can lead to catching "falling knives")
- Often employed on shorter timeframes (15min, 1hr) with tight risk management

#### 3. Market Making Strategies

Market making strategies profit from the bid-ask spread by providing liquidity on both sides of the order book.

**Crypto Implementation: Basic Spread Strategy**

```python
def basic_market_making(bid_price, ask_price, order_size, min_spread_pct=0.002):
    """Simple market making strategy placing orders on both sides of the book"""
    current_spread = (ask_price - bid_price) / bid_price
    
    if current_spread < min_spread_pct:
        return None  # Spread too tight to profitably make markets
    
    # Place buy order slightly above current bid
    buy_price = bid_price * 1.0001  # 0.01% improvement
    
    # Place sell order slightly below current ask
    sell_price = ask_price * 0.9999  # 0.01% improvement
    
    return {
        'buy_order': {'price': buy_price, 'size': order_size},
        'sell_order': {'price': sell_price, 'size': order_size}
    }
```

Market making is particularly viable in cryptocurrency markets due to relatively wider spreads compared to traditional markets, especially in altcoins and during volatile periods.

**Performance in Crypto Markets:**
- Profitable during high-volume sideways markets
- Requires sophisticated risk management during news events
- Works best on exchanges with maker-taker fee structures
- Often requires high-frequency capabilities

#### 4. Statistical Arbitrage

Statistical arbitrage exploits price discrepancies between related assets or across different markets.

**Crypto Implementation: Exchange Arbitrage**

```python
def crypto_triangular_arbitrage(prices):
    """
    Triangular arbitrage across three trading pairs
    Example: BTC/USD → ETH/BTC → ETH/USD → BTC/USD
    """
    # Example with BTC, ETH, USD
    btc_usd = prices['BTC/USD']
    eth_btc = prices['ETH/BTC']
    eth_usd = prices['ETH/USD']
    
    # Calculate theoretical rate
    theoretical_eth_usd = btc_usd * eth_btc
    
    # Calculate arbitrage opportunity (%)
    arbitrage_pct = (eth_usd / theoretical_eth_usd - 1) * 100
    
    # If significant arbitrage exists (accounting for fees)
    if abs(arbitrage_pct) > 0.5:  # 0.5% threshold after fees
        if eth_usd > theoretical_eth_usd:
            return {
                'direction': 'FORWARD',
                'steps': ['BUY BTC/USD', 'BUY ETH/BTC', 'SELL ETH/USD'],
                'expected_profit_pct': arbitrage_pct
            }
        else:
            return {
                'direction': 'REVERSE',
                'steps': ['BUY ETH/USD', 'SELL ETH/BTC', 'SELL BTC/USD'],
                'expected_profit_pct': -arbitrage_pct
            }
    
    return None  # No significant arbitrage opportunity
```

The cryptocurrency market's fragmentation across exchanges creates significant arbitrage opportunities, especially during volatile periods when price discovery varies across venues.

**Performance in Crypto Markets:**
- Most profitable during high volatility or market dislocations
- Requires fast execution and multiple exchange accounts
- Transaction costs and withdrawal times can erode profits
- Regulatory arbitrage (different rules across jurisdictions) adds complexity

#### 5. Technical Analysis-Based Strategies

Technical analysis strategies rely on chart patterns and indicators to generate trading signals.

**Crypto Implementation: MACD Strategy**

```python
def macd_strategy(df, fast_period=12, slow_period=26, signal_period=9):
    """MACD-based trading strategy"""
    # Calculate exponential moving averages
    df['ema_fast'] = df['close'].ewm(span=fast_period, adjust=False).mean()
    df['ema_slow'] = df['close'].ewm(span=slow_period, adjust=False).mean()
    
    # Calculate MACD line and signal line
    df['macd'] = df['ema_fast'] - df['ema_slow']
    df['macd_signal'] = df['macd'].ewm(span=signal_period, adjust=False).mean()
    df['macd_histogram'] = df['macd'] - df['macd_signal']
    
    # Generate signals
    df['signal'] = None
    
    # MACD line crosses above signal line: Buy
    df.loc[(df['macd'] > df['macd_signal']) & 
           (df['macd'].shift(1) <= df['macd_signal'].shift(1)), 
           'signal'] = 'BUY'
    
    # MACD line crosses below signal line: Sell
    df.loc[(df['macd'] < df['macd_signal']) & 
           (df['macd'].shift(1) >= df['macd_signal'].shift(1)), 
           'signal'] = 'SELL'
    
    return df
```

Technical analysis indicators work particularly well in cryptocurrency markets due to the significant influence of retail traders who follow these indicators, creating self-fulfilling prophecies.

**Performance in Crypto Markets:**
- Effective across various market conditions when combined correctly
- High adoption rate among crypto traders increases effectiveness through reflexivity
- Requires adaptation of traditional indicator parameters for crypto's higher volatility
- Often combined with volume analysis for better performance

#### 6. Machine Learning Strategies

Machine learning approaches use statistical models to predict price movements or optimize trading decisions.

**Crypto Implementation: Simple Price Prediction Model**

```python
from sklearn.ensemble import RandomForestRegressor

def train_ml_prediction_model(historical_data, prediction_horizon=24):
    """Train a machine learning model to predict future prices"""
    # Feature engineering
    df = historical_data.copy()
    
    # Create lagged features and technical indicators
    for lag in [1, 2, 3, 6, 12, 24]:
        df[f'price_lag_{lag}'] = df['close'].shift(lag)
        
    # Calculate returns at different lags
    for lag in [1, 3, 6, 12]:
        df[f'return_{lag}'] = df['close'].pct_change(lag)
    
    # Add some technical indicators
    df['sma_20'] = df['close'].rolling(20).mean()
    df['sma_50'] = df['close'].rolling(50).mean()
    df['volatility_20'] = df['close'].rolling(20).std()
    
    # Create target variable: future return
    df['target'] = df['close'].shift(-prediction_horizon) / df['close'] - 1
    
    # Drop NaN values
    df = df.dropna()
    
    # Define features and target
    features = [col for col in df.columns if col.startswith(('price_lag', 'return', 'sma', 'volatility'))]
    X = df[features]
    y = df['target']
    
    # Train model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    return model, features
```

Machine learning approaches can capture non-linear relationships in cryptocurrency price movements that traditional strategies might miss. They're particularly effective when incorporating on-chain metrics and sentiment data.

**Performance in Crypto Markets:**
- Can identify subtle patterns invisible to traditional analysis
- Effective at incorporating multiple data sources (price, volume, on-chain metrics, sentiment)
- Requires frequent retraining due to evolving market dynamics
- Data quality and feature engineering are critical for success

### Advantages of Algorithmic Trading in Cryptocurrency Markets

Algorithmic trading offers several advantages that are particularly valuable in the cryptocurrency context:

1. **24/7 Market Presence**
   - Cryptocurrency markets never close, making manual trading exhausting
   - Algorithms can monitor and execute trades around the clock
   - Critical for catching opportunities in different time zones

2. **Reaction Speed**
   - Cryptocurrencies can experience rapid price changes
   - Algorithms react in milliseconds to market events
   - High-frequency strategies can exploit micro-inefficiencies

3. **Emotional Discipline**
   - Crypto's volatility can trigger extreme emotions
   - Algorithms follow rules without fear or greed
   - Consistent execution during stressful market events

4. **Multi-Market Execution**
   - Crypto traders often need to monitor dozens of coins
   - Algorithms can simultaneously track multiple markets
   - Arbitrage opportunities across exchanges can be exploited

5. **Backtesting Capability**
   - Strategies can be historically validated before risking capital
   - Parameter optimization can improve performance
   - Risk metrics can be calculated from historical performance

### Challenges and Limitations

Despite the advantages, several challenges must be addressed in cryptocurrency algorithmic trading:

1. **Technical Challenges**
   - API reliability varies across cryptocurrency exchanges
   - Rate limiting can restrict strategy execution
   - System downtime during high volatility periods

2. **Market-Specific Issues**
   - Liquidity gaps can lead to slippage
   - Flash crashes are more common than in traditional markets
   - Market manipulation is more prevalent in smaller cap coins

3. **Backtesting Limitations**
   - Historical data quality issues
   - Past performance doesn't guarantee future results
   - Difficult to account for market impact in backtests

4. **Regulatory Uncertainty**
   - Evolving global regulations
   - Jurisdictional differences in trading rules
   - Legal concerns with certain strategies (e.g., arbitrage)

5. **Performance Considerations**
   ```
   Common Performance Degradation Factors:
   - Transaction fees (0.1-0.5% per trade)
   - Slippage in volatile markets
   - API latency during high activity
   - Execution delays affecting strategy
   ```

### Strategy Selection for Different Market Conditions

Different strategies perform better in specific market conditions, which is especially relevant in cryptocurrency's cyclical market:

```
Market Phase       |  Recommended Strategies        |  Avoid
-------------------|--------------------------------|----------------
Strong Bull Market | - Trend Following              | - Mean Reversion
                   | - Breakout                     | - Range Trading
-------------------|--------------------------------|----------------
Bear Market        | - Trend Following (Short)      | - Buy and Hold
                   | - Mean Reversion (with tight   | - Breakout
                   |   stops)                       |   (false signals)
-------------------|--------------------------------|----------------
Ranging Market     | - Mean Reversion               | - Trend Following
                   | - Market Making                | - Momentum
                   | - Oscillator Strategies        |
-------------------|--------------------------------|----------------
High Volatility    | - Volatility-based Position    | - Fixed Position
(Any Direction)    |   Sizing                       |   Sizing
                   | - Multi-timeframe Confirmation | - Single Indicator
```

This adaptive approach is essential for cryptocurrency markets, where conditions can change rapidly.

## Goals of This Book

### What You'll Learn
1. **Technical Foundation**
   - Python programming for trading applications
   - API integration with cryptocurrency exchanges
   - Database management for market data
   - Web development for monitoring interfaces

2. **Trading Knowledge**
   - Cryptocurrency market mechanics and dynamics
   - Technical analysis indicators and patterns
   - Strategy development methodology
   - Risk management principles and implementation

3. **System Architecture**
   - Microservices design for trading applications
   - Scalable infrastructure considerations
   - Real-time data processing techniques
   - Performance optimization for critical components

4. **Practical Implementation**
   - Complete trading bot development from scratch
   - Strategy backtesting and optimization
   - Production deployment best practices
   - System monitoring and maintenance

### Learning Path Progression

This book follows a structured learning path designed to build your knowledge progressively:

```
Basic concepts → Environment setup → Strategy design → Implementation → Testing → Deployment
```

Each chapter builds upon previous knowledge, with practical exercises to reinforce learning.

### Target Audience

This book is designed for:

- **Software developers** interested in trading applications
  - Familiar with Python programming
  - Curious about financial markets
  - Looking to build practical systems

- **Traders looking to automate their strategies**
  - Experienced in market analysis
  - Basic programming knowledge
  - Want to eliminate emotional trading

- **Financial technology enthusiasts**
  - Interested in cryptocurrency markets
  - Some technical background
  - Looking to understand automated trading

- **Cryptocurrency market participants**
  - Active in digital asset markets
  - Seeking efficiency in trading
  - Want to leverage technology advantages

## Project Overview

Our project will build a complete cryptocurrency trading bot with the following key features:

### Trading Bot Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Data Sources   │─────▶│  Trading Engine │─────▶│  Order Execution│
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                       │                        │
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Data Storage   │◀────▶│  Web Interface  │◀────▶│  Notifications  │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

This architecture separates concerns while maintaining data flow between components.

### Trading Bot Features

Our trading bot will implement:

1. **Multiple Trading Strategies**
   - Supertrend indicator strategy
   - MACD momentum strategy with RSI filter
   - Custom strategy framework for extension

2. **Risk Management**
   - Position sizing based on volatility
   - Dynamic stop-loss management
   - Portfolio allocation limits
   - Maximum drawdown protection

3. **Market Analysis**
   - Technical indicators library
   - Volume profile analysis
   - Trend detection algorithms
   - Market regime classification

4. **User Interface**
   - Real-time performance dashboard
   - Strategy configuration panel
   - Historical performance analytics
   - Real-time monitoring with alerts

### Technology Stack

```python
# Core Technologies
BACKEND = {
    'language': 'Python 3.9+',
    'framework': 'Flask',
    'database': 'File-based JSON',
    'logging': 'Custom logging system'
}

FRONTEND = {
    'framework': 'HTML/JavaScript',
    'charts': 'TradingView Lightweight Charts',
    'styling': 'Bootstrap 5'
}

INFRASTRUCTURE = {
    'deployment': 'Python module',
    'monitoring': 'Custom logging',
    'logging': 'File-based system'
}

TRADING = {
    'broker': 'Alpaca',
    'assets': 'Cryptocurrencies',
    'data_feeds': ['Alpaca Crypto Data', 'Polygon.io (fallback)']
}
```

The stack is chosen for simplicity, reliability, and ease of deployment while maintaining performance.

### Project Components

#### Backend Structure

```
backend/
├── app.py                 # Main Flask application
├── api_routes.py          # API endpoints
├── trading_engine.py      # Trading engine core
├── strategies/           
│   ├── base_strategy.py   # Base strategy class
│   ├── supertrend_strategy.py
│   └── macd_strategy.py
└── utils/
    ├── market_data.py     # Market data handling
    ├── indicators.py      # Technical indicators
    ├── portfolio.py       # Portfolio management
    └── notifications.py   # Logging system
```

#### Frontend Structure

```

# Chapter 2: Setting Up Your Trading Environment

# Chapter 2: Setting Up Your Trading Environment

## Essential Components

Before diving into strategy implementation, we need to establish a robust development environment. Our trading bot requires several key components working together seamlessly to function properly.

### 1. Python Environment
- Python 3.9 or higher for modern language features
- Virtual environment management for dependency isolation
- Package dependency handling with pip and requirements.txt
- IDE or code editor with debugging capabilities

### 2. Trading API Access
- Alpaca trading account for cryptocurrency access
- API keys for authentication and secure access
- Paper trading setup for safe testing
- Live trading considerations for production

### 3. Development Tools
- Version control (Git) for code management and collaboration
- Code editor (VS Code recommended) with Python extensions
- Terminal/Command line interface for environment management
- Browser for web interface testing and monitoring

## Understanding Cryptocurrency Markets

Before building a trading bot, it's essential to understand the unique characteristics of cryptocurrency markets that differentiate them from traditional financial markets.

### 24/7 Trading and Market Structure

Unlike traditional stock markets with fixed trading hours, cryptocurrency markets operate 24 hours a day, 7 days a week, 365 days a year. This continuous trading has significant implications:

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Traditional Markets          Cryptocurrency Markets       │
│  ─────────────────           ─────────────────────        │
│  ▪ Trading hours:            ▪ Trading hours:              │
│    9:30 AM - 4:00 PM ET        24/7/365                    │
│    Monday-Friday                                           │
│                                                            │
│  ▪ Single centralized         ▪ Multiple exchanges         │
│    exchange                     worldwide                  │
│                                                            │
│  ▪ Regulated circuit          ▪ No circuit breakers        │
│    breakers                     or trading halts           │
│                                                            │
│  ▪ Consistent liquidity       ▪ Variable liquidity         │
│    during market hours          across time zones          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Key implications for your trading bot:
- **Continuous Operation**: Your bot must be designed for 24/7 uptime with proper error handling and recovery mechanisms.
- **Time Zone Considerations**: Market activity varies by global time zones, affecting liquidity and volatility.
- **Infrastructure Requirements**: Requires robust hosting and monitoring solutions.

### Market Fragmentation and Exchange Differences

Cryptocurrency trades across dozens of exchanges globally, each with different:

1. **Available Trading Pairs**: Not all cryptocurrencies are available on all exchanges.
2. **Fee Structures**: Trading fees vary significantly (0.1% to 0.5% typically).
3. **API Limitations**: Rate limits, order types, and data availability differ.
4. **Liquidity Profiles**: Bid-ask spreads and order book depth vary dramatically.

When using Alpaca as our primary broker, we benefit from their aggregation of liquidity across multiple venues, but we should understand their specific cryptocurrency offerings and limitations.

### Volatility and Price Discovery

Cryptocurrencies exhibit significantly higher volatility than traditional assets:

```python
# Example of historical volatility comparison
# 30-day annualized volatility (approximate values)
asset_volatility = {
    "BTC/USD": 65.0,    # Bitcoin
    "ETH/USD": 85.0,    # Ethereum
    "SPY":     15.0,    # S&P 500 ETF
    "AAPL":    25.0,    # Apple stock
    "GLD":     12.0,    # Gold ETF
}
```

Implications for trading strategies:
- **Position Sizing**: Critical to account for extreme volatility
- **Stop Losses**: May need wider stops to avoid premature triggering
- **Testing Requirements**: Strategies must be backtested across different volatility regimes

### Data Considerations for Crypto Trading

#### Market Data Sources and Quality

Our trading bot relies on quality data from multiple sources:

1. **Primary: Alpaca Crypto Data**
   - Real-time and historical data for major cryptocurrencies
   - Direct integration with our trading functionality
   - Limited to major pairs (BTC/USD, ETH/USD, etc.)

2. **Secondary: Polygon.io**
   - More extensive historical data
   - Broader range of cryptocurrency pairs
   - Requires separate API key and integration

3. **Fallback: Mock Data Generation**
   - For testing and development
   - When primary data sources are unavailable
   - For pairs with limited data history

#### Common Data Challenges

Cryptocurrency data presents unique challenges:

1. **Data Gaps**: Periods with missing data due to exchange outages
2. **Price Discrepancies**: Different prices across exchanges
3. **Flash Crashes**: Extreme price movements on individual exchanges
4. **Tick Size Variations**: Different minimum price increments
5. **Volume Reliability**: Some exchanges report inflated trading volumes

Our trading engine implements robust solutions for these challenges:
- Multi-source data retrieval with fallbacks
- Anomaly detection to identify and handle outliers
- Mock data generation when reliable data is unavailable

### Risk Management for Cryptocurrency Trading

Effective risk management is especially critical for crypto trading:

```
┌─────────────────────────────────────────────────────┐
│            CRYPTO RISK MANAGEMENT PYRAMID           │
│                                                     │
│                    ▲  Stop Loss &                   │
│                   ▲ ▲  Take Profit                  │
│                  ▲   ▲                              │
│                 ▲     ▲                             │
│                ▲       ▲  Position Sizing           │
│               ▲         ▲                           │
│              ▲           ▲                          │
│             ▲             ▲  Maximum Drawdown       │
│            ▲               ▲  Limits                │
│           ▲                 ▲                       │
│          ▲                   ▲                      │
│         ▲                     ▲  Diversification    │
│        ▲                       ▲                    │
│       ▲                         ▲                   │
│      ▲                           ▲                  │
│     ▲─────────────────────────────▲                 │
│    ▲                               ▲                │
│   ▲  Capital Allocation & Exposure  ▲               │
│  ▲─────────────────────────────────────▲            │
│ ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲           │
└─────────────────────────────────────────────────────┘
```

Our trading engine implements these risk management principles:
- **Position Sizing**: Based on fixed risk percentage per trade (typically 1-2%)
- **Stop Loss Orders**: Automatic stop losses to limit downside on each trade
- **Maximum Drawdown Limits**: Daily loss limits that halt trading when reached
- **Multiple Timeframe Analysis**: Confirms signals across different timeframes

### Regulatory and Tax Considerations

Cryptocurrency trading has evolving regulatory requirements:
- **Reporting Requirements**: Trading activity may need to be reported for tax purposes
- **Exchange Restrictions**: Some jurisdictions limit access to certain exchanges
- **KYC/AML**: Know Your Customer and Anti-Money Laundering regulations apply
- **Tax Treatment**: Varies by jurisdiction, with complex rules for crypto-to-crypto trades

Our implementation:
- Maintains detailed transaction records for reporting
- Includes timestamp and price data for each trade
- Provides reporting functionality for tax compliance

## Python Setup

### Installing Python

Python forms the foundation of our trading bot. The specific steps for installation vary by operating system:

#### Windows Installation
1. Download Python from python.org
   - Visit https://www.python.org/downloads/windows/
   - Select version 3.9 or higher (3.10+ recommended)
   - Choose the appropriate installer (64-bit recommended)

2. Run the installer with these options:
   - ✓ Add Python to PATH
   - ✓ Install pip
   - ✓ Install for all users (recommended)

3. Verify installation:
   ```bash
   python --version
   pip --version
   ```

#### macOS Installation
1. Using Homebrew (recommended):
   ```bash
   # Install Homebrew if not already installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Python
   brew install python
   ```

2. Or download from python.org:
   - Visit https://www.python.org/downloads/macos/
   - Download and run the macOS installer

3. Verify installation:
   ```bash
   python3 --version
   pip3 --version
   ```

#### Linux Installation
For Ubuntu/Debian:
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

For Fedora/RHEL/CentOS:
```bash
sudo dnf install python3 python3-pip
```

### Setting Up a Virtual Environment

Virtual environments isolate project dependencies, preventing conflicts between different projects:

```bash
# Navigate to your project directory
mkdir crypto_trader
cd crypto_trader

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Your terminal prompt should change to indicate the active environment
```

After activation, all Python packages will be installed within this isolated environment.

### Installing Essential Libraries

Our trading bot requires several Python libraries:

```

### Understanding Key Dependencies

Let's examine the core libraries and their roles:

1. **alpaca-py**: Official Python SDK for Alpaca Markets API
   ```python
   from alpaca.trading.client import TradingClient
   from alpaca.data.historical import CryptoHistoricalDataClient
   
   # Example usage
   trading_client = TradingClient(api_key, secret_key, paper=True)
   data_client = CryptoHistoricalDataClient()
   ```

2. **pandas & numpy**: For data manipulation and analysis
   ```python
   import pandas as pd
   import numpy as np
   
   # Example of data processing
   def calculate_sma(data, window):
       return data.rolling(window=window).mean()
   ```

3. **Flask & extensions**: For web interface and API
   ```python
   from flask import Flask, jsonify
   from flask_cors import CORS
   from flask_socketio import SocketIO
   
   app = Flask(__name__)
   CORS(app)
   socketio = SocketIO(app, cors_allowed_origins="*")
   ```

4. **python-dotenv**: For environment variable management
   ```python
   from dotenv import load_dotenv
   import os
   
   load_dotenv()  # Load variables from .env file
   api_key = os.getenv('ALPACA_API_KEY')
   ```

## Alpaca Trading Account Setup

Alpaca Markets provides commission-free trading API access with excellent crypto support.

### Creating Your Account

1. Visit [Alpaca.markets](https://alpaca.markets/)
2. Click "Get Started" and sign up for a paper trading account
3. Complete the verification process (email confirmation)
4. Access the dashboard at https://app.alpaca.markets/paper

### Understanding Account Types

Alpaca offers different account types:
- **Paper Trading**: Simulated trading with fake money
- **Live Trading**: Real money trading

For this book, we'll primarily use paper trading for safety, but the code works identically with live accounts by changing a single parameter.

### API Configuration

1. Generate API Keys
   - Navigate to Paper Trading section in dashboard
   - Select "API Keys" from the left menu
   - Click "Create New API Key"
   - Note: Store these keys securely; they provide full account access

2. Environment Setup
   Create a `.env` file in your project root:
   ```bash
   # Create .env file
   touch .env
   
   # Add API credentials
   echo "ALPACA_API_KEY='your_api_key_here'" >> .env
   echo "ALPACA_SECRET_KEY='your_secret_key_here'" >> .env
   echo "ALPACA_PAPER=True" >> .env
   ```

3. Testing API Connection
   ```python
   # test_connection.py
   import os
   from dotenv import load_dotenv
   from alpaca.trading.client import TradingClient
   
   # Load credentials
   load_dotenv()
   api_key = os.getenv('ALPACA_API_KEY')
   secret_key = os.getenv('ALPACA_SECRET_KEY')
   
   # Validate credentials exist
   if not api_key or not secret_key:
       raise ValueError("API keys not found in environment variables")
   
   # Create client
   trading_client = TradingClient(api_key, secret_key, paper=True)
   
   # Test connection
   account = trading_client.get_account()
   print(f"Connection successful!")
   print(f"Account ID: {account.id}")
   print(f"Account status: {account.status}")
   print(f"Account equity: ${account.equity}")
   print(f"Account cash: ${account.cash}")
   ```

Run this script to verify your API connection:
```

## Project Structure

A well-organized project structure is crucial for maintainability. Let's create a comprehensive structure for our trading bot.

### Creating the Directory Structure

```

### Directory Organization
```

### Creating Base Files

Let's create some essential files to start with:

1. **backend/__init__.py**
```

2. **backend/app.py**
    __name__, 
    static_folder='../frontend/static',
    template_folder='../frontend/templates'
    return jsonify({"status": "ok", "message": "Service is running"})
    return render_template('index.html')
    return jsonify({"error": "Resource not found"}), 404
    return jsonify({"error": "Internal server error"}), 500
    socketio.run(app, host='0.0.0.0', port=5002, debug=True)
```

3. **.gitignore**
```

4. **run.py**
    print("Starting Crypto Trader...")
    print("Access the web interface at http://localhost:5002")
    socketio.run(app, host='0.0.0.0', port=5002, debug=True)
```

### Key Components

1. **Backend Structure**
   - **strategies/** module contains trading algorithm implementations
   - **utils/** module provides common functionality for data processing, indicators, etc.
   - **trading_engine.py** orchestrates trading operations
   - **api_routes.py** defines API endpoints for frontend communication
   - **app.py** initializes the Flask application

2. **Frontend Organization**
   - **templates/** contains HTML pages for the web interface
   - **static/js/** holds JavaScript for dynamic frontend functionality
   - **static/css/** contains styling for the web interface

3. **Logging System**
   - **trading.log** for general trading activity
   - **error.log** for error tracking
   - **trade_history.json** for structured trade data
   - **portfolio_history.json** for portfolio snapshots

## Security Best Practices

### API Key Management

Security is critical when dealing with trading accounts. Follow these best practices:

1. Store keys in .env file (never in code)
   ```bash
   # .env
   ALPACA_API_KEY=your_api_key_here
   ALPACA_SECRET_KEY=your_secret_key_here
   USE_PAPER=true
   ```

2. Load keys securely in code
   ```python
   from dotenv import load_dotenv
   import os
   
   # Load .env file
   load_dotenv()
   
   # Access environment variables
   api_key = os.getenv('ALPACA_API_KEY')
   secret_key = os.getenv('ALPACA_SECRET_KEY')
   use_paper = os.getenv('USE_PAPER', 'true').lower() == 'true'
   
   # Validate credentials
   if not api_key or not secret_key:
       raise EnvironmentError("API credentials not found")
   ```

3. Add .env to .gitignore
   - Never commit API keys to version control
   - Use environment variables in deployment environments

### System Security

1. CORS configuration for API access
   ```python
   from flask import Flask
   from flask_cors import CORS
   
   app = Flask(__name__)
   
   # Configure CORS
   CORS(
       app,
       resources={
           r"/api/*": {"origins": ["http://localhost:5002", "https://yourdomain.com"]}
       }
   )
   ```

2. Input validation for all API endpoints
   ```python
   from flask import request, jsonify
   
   @app.route('/api/submit_order', methods=['POST'])
   def submit_order():
       # Extract data
       data = request.get_json()
       
       # Validate required fields
       required_fields = ['symbol', 'quantity', 'side']
       for field in required_fields:
           if field not in data:
               return jsonify({'error': f'Missing required field: {field}'}), 400
               
       # Validate data types
       if not isinstance(data['quantity'], (int, float)) or data['quantity'] <= 0:
           return jsonify({'error': 'Quantity must be a positive number'}), 400
           
       # Process valid request
       # ...
   ```

3. Error handling
   ```python
   @app.errorhandler(404)
   def not_found_error(error):
       return jsonify({'error': 'Not found'}), 404
   
   @app.errorhandler(500)
   def internal_error(error):
       # Log the error
       app.logger.error(f"Server error: {error}")
       return jsonify({'error': 'Internal server error'}), 500
   ```

## Testing Environment

### Paper Trading Setup

Alpaca's paper trading environment is perfect for development:

1. Configure paper trading environment
   ```python
   # Set paper trading as default
   paper_trading = True
   
   # Create appropriate client
   trading_client = TradingClient(api_key, secret_key, paper=paper_trading)
   ```

2. Set initial testing capital
   - Default is $100,000 in paper trading
   - Can be reset in the Alpaca dashboard

3. Define risk parameters
   ```python
   RISK_SETTINGS = {
       'max_position_size': 0.05,  # 5% of portfolio per position
       'risk_per_trade': 0.01,     # 1% risk per trade
       'max_open_trades': 5,       # Maximum concurrent positions
       'stop_loss_percentage': 0.02  # 2% stop loss
   }
   ```

### Development Workflow

Establish a consistent development workflow:

1. Local development process
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Create feature branch
   git checkout -b feature/new-strategy
   
   # Make changes and test locally
   
   # Commit changes
   git add .
   git commit -m "Add new trading strategy"
   
   # Push to remote
   git push origin feature/new-strategy
   
   # Create pull request for review
   ```

2. Testing procedures
   - Unit tests for strategy components
   - Integration tests for system parts
   - End-to-end testing with paper trading
   - Performance benchmarking

3. Version control workflow
   - main: production-ready code
   - develop: integration branch
   - feature/xxx: feature development
   - fix/xxx: bug fixes

4. Deployment pipeline
   - Automated testing before deployment
   - Staged deployment to test environments
   - Production deployment with rollback capability

## Troubleshooting Common Issues

### Environment Problems

1. Python version conflicts
   ```bash
   # Check Python version
   python --version
   
   # If multiple versions installed, specify version
   python3.10 --version
   
   # Ensure you're activating the correct virtual environment
   source .venv/bin/activate
   ```

2. Package dependency issues
   ```bash
   # Upgrade pip
   pip install --upgrade pip
   
   # Install specific versions if conflicts arise
   pip install alpaca-py==0.8.2
   
   # Check installed packages
   pip list
   ```

3. Virtual environment errors
   ```bash
   # If venv creation fails, ensure venv module is installed
   # On Ubuntu/Debian:
   sudo apt-get install python3-venv
   
   # Recreate venv if corrupted
   rm -rf .venv
   python -m venv .venv
   ```

4. Path configuration
   ```bash
   # Check Python path
   python -c "import sys; print(sys.path)"
   
   # Set PYTHONPATH if needed
   export PYTHONPATH=$PYTHONPATH:$(pwd)
   ```

### API Connectivity

1. Authentication errors
   ```python
   try:
       trading_client = TradingClient(api_key, secret_key, paper=True)
       account = trading_client.get_account()
   except Exception as e:
       if "authentication failed" in str(e).lower():
           print("API key authentication failed. Check your credentials.")
       else:
           print(f"Unknown error: {e}")
   ```

2. Rate limiting issues
   ```python
   # Implement exponential backoff for API calls
   def api_call_with_retry(func, max_retries=3, initial_delay=1):
       retries = 0
       while retries < max_retries:
           try:
               return func()
           except Exception as e:
               if "rate limit" in str(e).lower():
                   sleep_time = initial_delay * (2 ** retries)
                   print(f"Rate limited. Retrying in {sleep_time} seconds...")
                   time.sleep(sleep_time)
                   retries += 1
               else:
                   raise e
       raise Exception("Maximum retries exceeded")
   ```

3. Data stream interruptions
   ```python
   # Implement reconnection logic
   def connect_data_stream(symbol):
       connected = False
       while not connected:
           try:
               stream = connect_to_stream(symbol)
               connected = True
               return stream
           except Exception as e:
               print(f"Connection failed: {e}. Retrying in 5 seconds...")
               time.sleep(5)
   ```

4. Order execution failures
   ```python
   # Verify order submission
   def submit_order_safely(symbol, qty, side):
       try:
           order = trading_client.submit_order(
               symbol=symbol,
               qty=qty,
               side=side,
               type='market',
               time_in_force='gtc'
           )
           print(f"Order placed: {order.id}")
           return order
       except Exception as e:
           print(f"Order submission failed: {e}")
           return None
   ```

## Implementing a Basic Market Data Utility

Let's create a simple utility to fetch market data from Alpaca:

    def __init__(self):
        # Initialize the historical data client
        self.client = CryptoHistoricalDataClient()
    
    def get_historical_bars(self, symbol, timeframe='1Day', limit=100):
        """Fetch historical bar data for a cryptocurrency
        
        Args:
            symbol (str): The cryptocurrency symbol (e.g., 'BTC/USD')
            timeframe (str): The timeframe for the bars ('1Day', '1Hour', etc.)
            limit (int): Maximum number of bars to retrieve
            
        Returns:
            pd.DataFrame: DataFrame containing the historical bars
        """
        try:
            # Calculate start and end dates
            end = datetime.now()
            start = end - timedelta(days=limit)
            
            # Map string timeframe to TimeFrame enum
            timeframe_map = {
                '1Min': TimeFrame.MINUTE,
                '5Min': TimeFrame.MINUTE_5,
                '15Min': TimeFrame.MINUTE_15,
                '1Hour': TimeFrame.HOUR,
                '4Hour': TimeFrame.HOUR_4,
                '1Day': TimeFrame.DAY
            }
            
            tf = timeframe_map.get(timeframe, TimeFrame.DAY)
            
            # Create the request
            request_params = CryptoBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf,
                start=start,
                end=end
            )
            
            # Get the bars
            bars = self.client.get_crypto_bars(request_params)
            
            # Convert to DataFrame
            df = bars.df
            
            # If multi-index with symbol, remove the symbol level
            if isinstance(df.index, pd.MultiIndex):
                df = df.reset_index(level=0, drop=True)
            
            return df
            
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return pd.DataFrame()
```

Test this utility with a simple script:

```

Run this script to see the data:
```

## Next Steps

Before proceeding to strategy implementation, ensure:

1. Verify all security measures are in place
   - Check that .env is in .gitignore
   - Confirm API keys are loaded securely
   - Test CORS configuration

2. Test API connectivity
   - Verify connection to Alpaca API
   - Test market data retrieval
   - Check account information access

3. Confirm paper trading environment
   - Ensure paper trading flag is set
   - Verify test orders can be placed
   - Check account balance and settings

4. Review access controls
   - Limit API permissions as needed
   - Implement authentication for web interface
   - Set up proper error handling

## Challenge: Add Daily Market Summary

As a practical exercise, try implementing a daily market summary feature:

1. Create a function that retrieves data for major cryptocurrencies
2. Calculate key statistics (daily change, volume, etc.)
3. Store the data for display in the dashboard

    """Get a summary of major cryptocurrency markets"""
    fetcher = MarketDataFetcher()
    symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD']
    summary = {}
    
    for symbol in symbols:
        # Get today's and yesterday's data
        data = fetcher.get_historical_bars(symbol, timeframe='1Day', limit=2)
        
        if len(data) >= 2:
            # Calculate statistics
            today = data.iloc[-1]
            yesterday = data.iloc[-2]
            
            price_change = today['close'] - yesterday['close']
            percent_change = (price_change / yesterday['close']) * 100
            
            summary[symbol] = {
                'price': today['close'],
                'change': price_change,
                'percent_change': percent_change,
                'volume': today['volume'],
                'high': today['high'],
                'low': today['low']
            }
    
    return summary
```

Key Takeaways:
- A proper environment setup is crucial for project success
- Security should be a priority from the beginning
- Testing with paper trading prevents costly mistakes
- A well-organized project structure improves development efficiency
- Proper error handling and logging save debugging time

In the next chapter, we'll leverage this environment to implement trading strategies. 

# Chapter 3: Understanding Trading Strategies

# Chapter 3: Understanding Trading Strategies

## Technical Analysis Fundamentals

Before implementing our trading strategies, it's essential to understand the core concepts of technical analysis that form their foundation. Technical analysis is the study of price and volume data to identify patterns and make trading decisions.

### The Philosophy Behind Technical Analysis

Technical analysis is based on three fundamental principles:

1. **Market action discounts everything**: All known information is already reflected in the price.
2. **Prices move in trends**: Once a trend is established, it's more likely to continue than reverse.
3. **History tends to repeat itself**: Market patterns and reactions tend to recur due to market psychology.

These principles form the basis for the strategies we'll implement in our trading bot.

### Price Action and Chart Patterns

Price action trading focuses on the movement of price across time, often visualized through candlestick charts:

     │
     │  ┌───┐
     │  │   │ Body
     │  │   │
     │      │
     Bullish
     Candle
       
     │  ┌───┐
     │  │   │ Body
     │  │   │
     │
     ┴──────┘
     Bearish
     Candle
```

Common candlestick patterns include:
- **Doji**: Open and close prices are very close, indicating indecision
- **Hammer/Hanging Man**: Small body with long lower shadow, potential reversal signal
- **Engulfing Patterns**: Candle's body completely engulfs previous candle, strong reversal signal
- **Morning/Evening Star**: Three-candle reversal pattern indicating shift in momentum

Our strategies will use candlestick data as the foundation for more complex indicators.

### Technical Indicators Overview

Technical indicators can be categorized based on their function:

1. **Trend Indicators**: Identify and follow market trends
   - Moving Averages (Simple, Exponential, Weighted)
   - Average Directional Index (ADX)
   - Parabolic SAR
   - Supertrend

2. **Momentum Indicators**: Measure the rate of price change
   - Relative Strength Index (RSI)
   - Moving Average Convergence Divergence (MACD)
   - Stochastic Oscillator
   - Rate of Change (ROC)

3. **Volatility Indicators**: Measure the magnitude of price fluctuations
   - Average True Range (ATR)
   - Bollinger Bands
   - Keltner Channels
   - Standard Deviation

4. **Volume Indicators**: Analyze trading volume for confirmation
   - On-Balance Volume (OBV)
   - Volume-Weighted Average Price (VWAP)
   - Accumulation/Distribution Line
   - Money Flow Index (MFI)

Our trading bot implements several key indicators from these categories to identify trading opportunities.

### Moving Averages in Depth

Moving averages smooth price data to identify trends while filtering out noise. They are foundational to many strategies.

#### Simple Moving Average (SMA)

The SMA calculates the average price over a specified period:

    """
    Calculate Simple Moving Average
    
    Args:
        data (pd.Series): Price data series
        window (int): Window size for calculation
        
    Returns:
        pd.Series: Simple Moving Average series
    """
    return data.rolling(window=window).mean()
```

Mathematically:
$$SMA = \frac{P_1 + P_2 + ... + P_n}{n}$$

Where:
- $P_i$ is the price at period $i$
- $n$ is the window size

#### Exponential Moving Average (EMA)

The EMA gives more weight to recent prices, making it more responsive to new information:

    """
    Calculate Exponential Moving Average
    
    Args:
        data (pd.Series): Price data series
        window (int): Window size for calculation
        
    Returns:
        pd.Series: Exponential Moving Average series
    """
    return data.ewm(span=window, adjust=False).mean()
```

Mathematically:
$$EMA_t = \alpha \times P_t + (1 - \alpha) \times EMA_{t-1}$$

Where:
- $P_t$ is the current price
- $EMA_{t-1}$ is the previous EMA
- $\alpha = \frac{2}{n+1}$ is the smoothing factor

#### Using Moving Averages for Trading Signals

Common moving average signals include:

1. **Golden Cross**: When a shorter-term MA crosses above a longer-term MA (bullish)
2. **Death Cross**: When a shorter-term MA crosses below a longer-term MA (bearish)
3. **Price-MA Crossover**: When price crosses above/below a significant MA
4. **Multiple MA Systems**: Using three or more MAs of different periods

    """
    Generate signals based on moving average crossover
    
    Args:
        short_ma (pd.Series): Shorter-term moving average
        long_ma (pd.Series): Longer-term moving average
        
    Returns:
        pd.Series: Signal series (1: Buy, -1: Sell, 0: Hold)
    """
    signal = pd.Series(0, index=short_ma.index)
    
    # Generate crossover signals
    signal[short_ma > long_ma] = 1  # Bullish
    signal[short_ma < long_ma] = -1  # Bearish
    
    # Get signal changes only
    return signal.diff().fillna(0).astype(int)
```

### Oscillators and Momentum Indicators

Oscillators help identify overbought and oversold conditions, as well as potential reversals.

#### Relative Strength Index (RSI)

RSI measures the speed and change of price movements, oscillating between 0 and 100:

    """
    Calculate Relative Strength Index
    
    Args:
        data (pd.Series): Price data series
        window (int): Window size for calculation
        
    Returns:
        pd.Series: RSI values
    """
    # Calculate price changes
    delta = data.diff()
    
    # Separate gains and losses
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    # Calculate average gain and loss
    avg_gain = gain.rolling(window=window).mean()
    avg_loss = loss.rolling(window=window).mean()
    
    # Calculate RS and RSI
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi
```

Mathematically:
$$RSI = 100 - \frac{100}{1 + RS}$$

Where:
$$RS = \frac{\text{Average Gain}}{\text{Average Loss}}$$

Common RSI signals:
- RSI > 70: Potentially overbought
- RSI < 30: Potentially oversold
- Divergence between RSI and price: Potential reversal

#### Moving Average Convergence Divergence (MACD)

MACD is a trend-following momentum indicator showing the relationship between two moving averages:

    """
    Calculate MACD, Signal Line, and Histogram
    
    Args:
        data (pd.Series): Price data series
        fast_period (int): Fast EMA period
        slow_period (int): Slow EMA period
        signal_period (int): Signal line period
        
    Returns:
        tuple: (MACD line, Signal line, Histogram)
    """
    # Calculate EMAs
    fast_ema = calculate_ema(data, fast_period)
    slow_ema = calculate_ema(data, slow_period)
    
    # Calculate MACD line
    macd_line = fast_ema - slow_ema
    
    # Calculate Signal line
    signal_line = calculate_ema(macd_line, signal_period)
    
    # Calculate Histogram
    histogram = macd_line - signal_line
    
    return macd_line, signal_line, histogram
```

Components of MACD:
1. **MACD Line**: Difference between fast and slow EMAs
2. **Signal Line**: EMA of the MACD Line
3. **Histogram**: Difference between MACD Line and Signal Line

Common MACD signals:
- MACD crosses above Signal Line: Bullish
- MACD crosses below Signal Line: Bearish
- Histogram changes direction: Early indication of potential crossover
- Divergence between MACD and price: Potential reversal

### Volatility Indicators

Volatility indicators help measure the magnitude of price fluctuations and adapt strategies accordingly.

#### Average True Range (ATR)

ATR measures market volatility by calculating the average range between high and low prices:

    """
    Calculate Average True Range
    
    Args:
        high (pd.Series): High prices
        low (pd.Series): Low prices
        close (pd.Series): Close prices
        window (int): Window size for calculation
        
    Returns:
        pd.Series: ATR values
    """
    # Calculate True Range
    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Calculate ATR
    atr = tr.rolling(window=window).mean()
    
    return atr
```

Mathematically, True Range (TR) is the greatest of:
- Current High - Current Low
- |Current High - Previous Close|
- |Current Low - Previous Close|

And ATR is the moving average of the TR values.

#### Bollinger Bands

Bollinger Bands consist of a middle band (SMA) with upper and lower bands at a standard deviation distance:

    """
    Calculate Bollinger Bands
    
    Args:
        data (pd.Series): Price data series
        window (int): Window size for calculation
        num_std (float): Number of standard deviations
        
    Returns:
        tuple: (Upper Band, Middle Band, Lower Band)
    """
    # Calculate middle band (SMA)
    middle_band = calculate_sma(data, window)
    
    # Calculate standard deviation
    std = data.rolling(window=window).std()
    
    # Calculate upper and lower bands
    upper_band = middle_band + (std * num_std)
    lower_band = middle_band - (std * num_std)
    
    return upper_band, middle_band, lower_band
```

Bollinger Bands are useful for:
- Identifying volatility expansions and contractions
- Spotting potential price breakouts
- Setting dynamic support and resistance levels
- Gauging overbought/oversold conditions when price touches the bands

### Technical Indicators Overview
Our trading bot implements several key technical indicators:

1. **Moving Averages**
   - Simple Moving Average (SMA)
   - Exponential Moving Average (EMA)
   - Used for trend identification

2. **Momentum Indicators**
   - Relative Strength Index (RSI)
   - MACD (Moving Average Convergence Divergence)
   - Stochastic Oscillator

3. **Volatility Indicators**
   - Average True Range (ATR)
   - Bollinger Bands
   - Used for risk management

4. **Trend Indicators**
   - Supertrend
   - Moving Average combinations
   - Trend direction and strength

## Base Strategy Implementation

### Base Strategy Class
    def __init__(self, trading_client: TradingClient, 
                 data_client, symbol: str):
        """Initialize base strategy"""
        self.trading_client = trading_client
        self.data_client = data_client
        self.symbol = symbol
        self.position = None
        
    def update_position(self):
        """Update current position information"""
        try:
            self.position = self.trading_client.get_position(self.symbol)
        except Exception:
            self.position = None
            
    def get_historical_data(self, timeframe: str = '1Min', 
                           limit: int = 100) -> pd.DataFrame:
        """Get historical price data"""
        try:
            # Implementation in market_data.py
            pass
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return pd.DataFrame()
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals from data"""
        pass
        
    def calculate_position_size(self, capital: float, 
                              risk_per_trade: float,
                              entry_price: float,
                              stop_loss: float) -> float:
        """Calculate position size based on risk"""
        try:
            risk_amount = capital * (risk_per_trade / 100)
            risk_per_share = abs(entry_price - stop_loss)
            if risk_per_share > 0:
                return risk_amount / risk_per_share
            return 0
        except Exception as e:
            print(f"Error calculating position size: {e}")
            return 0
            
    def place_market_order(self, side: OrderSide, 
                          quantity: float,
                          take_profit: Optional[float] = None,
                          stop_loss: Optional[float] = None):
        """Place a market order with optional TP/SL"""
        try:
            # Implementation details
            pass
        except Exception as e:
            print(f"Error placing order: {e}")
            
    @abstractmethod
    def execute_strategy(self):
        """Execute the trading strategy"""
        pass
```

## Supertrend Strategy Implementation

The Supertrend indicator is a popular trend-following tool that helps identify the current market trend direction. It is constructed using ATR to adjust for market volatility.

### Understanding Supertrend

The Supertrend indicator consists of two primary components:
1. A basic trend direction (up or down)
2. A trailing stop line that adapts to price volatility

The indicator generates buy signals when price closes above the Supertrend line, and sell signals when price closes below it. The ATR multiplier determines how sensitive the indicator is to price movements.

    """
    Calculate Supertrend indicator
    
    Args:
        data (pd.DataFrame): DataFrame with OHLC data
        period (int): ATR period
        multiplier (float): ATR multiplier
        
    Returns:
        pd.DataFrame: DataFrame with Supertrend values and direction
    """
    # Calculate ATR
    high = data['high']
    low = data['low']
    close = data['close']
    
    atr = calculate_atr(high, low, close, period)
    
    # Calculate basic upper and lower bands
    hl2 = (high + low) / 2
    
    upper_band = hl2 + (multiplier * atr)
    lower_band = hl2 - (multiplier * atr)
    
    # Initialize Supertrend values
    supertrend = pd.Series(0.0, index=data.index)
    direction = pd.Series(1, index=data.index)  # Initial direction (1: up, -1: down)
    
    # Calculate Supertrend through iterative process
    for i in range(1, len(data)):
        if close.iloc[i] > upper_band.iloc[i-1]:
            direction.iloc[i] = 1  # Uptrend
        elif close.iloc[i] < lower_band.iloc[i-1]:
            direction.iloc[i] = -1  # Downtrend
        else:
            direction.iloc[i] = direction.iloc[i-1]  # Continue previous trend
            
            # Adjust upper/lower bands based on direction
            if direction.iloc[i] == 1 and lower_band.iloc[i] < lower_band.iloc[i-1]:
                lower_band.iloc[i] = lower_band.iloc[i-1]
            if direction.iloc[i] == -1 and upper_band.iloc[i] > upper_band.iloc[i-1]:
                upper_band.iloc[i] = upper_band.iloc[i-1]
        
        # Set Supertrend value based on direction
        if direction.iloc[i] == 1:
            supertrend.iloc[i] = lower_band.iloc[i]
        else:
            supertrend.iloc[i] = upper_band.iloc[i]
    
    # Create result DataFrame
    result = pd.DataFrame(index=data.index)
    result['supertrend'] = supertrend
    result['direction'] = direction
    
    return result
```

### Supertrend Class

Now let's implement our Supertrend strategy using an object-oriented approach:

    def __init__(self, trading_client, data_client, symbol: str,
                 atr_period: int = 10, multiplier: float = 3.0,
                 risk_per_trade: float = 1.0):
        """Initialize Supertrend strategy
        
        Args:
            trading_client: Trading client for order execution
            data_client: Data client for market data
            symbol: Trading symbol
            atr_period: Period for ATR calculation
            multiplier: Multiplier for Supertrend calculation
            risk_per_trade: Percentage risk per trade
        """
        super().__init__(trading_client, data_client, symbol)
        self.atr_period = atr_period
        self.multiplier = multiplier
        self.risk_per_trade = risk_per_trade
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"Initialized Supertrend strategy for {symbol} "
                         f"with period={atr_period}, multiplier={multiplier}")
        
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals based on Supertrend indicator
        
        Args:
            data: DataFrame with OHLC data
            
        Returns:
            Dictionary with signal information
        """
        if data.empty:
            self.logger.warning("Empty data received, unable to generate signals")
            return {
                'signal': 'HOLD',
                'supertrend': None,
                'direction': None,
                'last_close': None,
                'stop_loss': None
            }
            
        try:
            # Calculate Supertrend
            supertrend_data = calculate_supertrend(
                data, 
                period=self.atr_period,
                multiplier=self.multiplier
            )
            
            # Get latest values
            last_close = data['close'].iloc[-1]
            supertrend = supertrend_data['supertrend'].iloc[-1]
            direction = supertrend_data['direction'].iloc[-1]
            prev_direction = supertrend_data['direction'].iloc[-2] if len(data) > 1 else None
            
            # Generate signal based on direction change
            signal = 'HOLD'
            
            # Buy signal: Direction changed from -1 to 1 (price crossed above Supertrend)
            if direction == 1 and prev_direction == -1:
                signal = 'BUY'
                self.logger.info(f"BUY signal generated for {self.symbol} at {last_close}")
                
            # Sell signal: Direction changed from 1 to -1 (price crossed below Supertrend)
            elif direction == -1 and prev_direction == 1:
                signal = 'SELL'
                self.logger.info(f"SELL signal generated for {self.symbol} at {last_close}")
                
            # Calculate stop loss
            stop_loss = supertrend if direction == 1 else None
                
            return {
                'signal': signal,
                'supertrend': supertrend,
                'direction': direction,
                'last_close': last_close,
                'stop_loss': stop_loss
            }
            
        except Exception as e:
            self.logger.error(f"Error generating Supertrend signals: {str(e)}")
            return {
                'signal': 'HOLD',
                'supertrend': None,
                'direction': None,
                'last_close': data['close'].iloc[-1] if not data.empty else None,
                'stop_loss': None
            }
        
    def execute_strategy(self):
        """Execute the Supertrend trading strategy"""
        try:
            # Get historical data
            self.logger.info(f"Fetching historical data for {self.symbol}")
            data = self.get_historical_data()
            
            if data.empty:
                self.logger.warning(f"No historical data available for {self.symbol}")
                return
                
            # Generate signals
            signals = self.generate_signals(data)
            
            if signals['signal'] == 'HOLD':
                self.logger.info(f"No trading signal for {self.symbol}, holding current position")
                return
                
            # Update position info
            self.update_position()
            
            # Execute trades based on signals
            if signals['signal'] == 'BUY' and not self.position:
                # Calculate position size
                entry_price = signals['last_close']
                stop_loss = signals['stop_loss']
                
                if not stop_loss or not entry_price:
                    self.logger.warning("Missing entry price or stop loss, cannot calculate position size")
                    return
                    
                account = self.trading_client.get_account()
                available_capital = float(account.buying_power)
                
                size = self.calculate_position_size(
                    capital=available_capital,
                    risk_per_trade=self.risk_per_trade,
                    entry_price=entry_price,
                    stop_loss=stop_loss
                )
                
                if size <= 0:
                    self.logger.warning(f"Invalid position size calculated: {size}")
                    return
                    
                self.logger.info(f"Placing BUY order for {self.symbol}: "
                               f"size={size:.6f}, entry={entry_price}, stop={stop_loss}")
                
                # Place the order with stop loss
                try:
                    self.place_market_order(
                        side=OrderSide.BUY,
                        quantity=size,
                        stop_loss=stop_loss
                    )
                    self.logger.info(f"Order placed successfully for {self.symbol}")
                except Exception as e:
                    self.logger.error(f"Error placing buy order: {str(e)}")
                    
            elif signals['signal'] == 'SELL' and self.position:
                # Close the position
                self.logger.info(f"Placing SELL order to close position for {self.symbol}, "
                               f"quantity={float(self.position.qty)}")
                
                try:
                    self.place_market_order(
                        side=OrderSide.SELL,
                        quantity=float(self.position.qty)
                    )
                    self.logger.info(f"Position closed successfully for {self.symbol}")
                except Exception as e:
                    self.logger.error(f"Error closing position: {str(e)}")
                
        except Exception as e:
            self.logger.error(f"Error executing Supertrend strategy: {str(e)}")
```python
def backtest_supertrend(data, atr_period=10, multiplier=3.0, initial_capital=10000):
    """
    Backtest Supertrend strategy
    
    Args:
        data (pd.DataFrame): OHLC data
        atr_period (int): ATR period
        multiplier (float): ATR multiplier
        initial_capital (float): Initial capital
        
    Returns:
        pd.DataFrame: Trade results
    """
    # Calculate Supertrend
    supertrend_data = calculate_supertrend(data, atr_period, multiplier)
    
    # Combine with price data
    backtest_data = data.copy()
    backtest_data['supertrend'] = supertrend_data['supertrend']
    backtest_data['direction'] = supertrend_data['direction']
    
    # Initialize columns
    backtest_data['signal'] = 0
    backtest_data['position'] = 0
    backtest_data['entry_price'] = None
    backtest_data['exit_price'] = None
    backtest_data['stop_loss'] = None
    backtest_data['profit_pct'] = 0.0
    
    # Generate signals based on direction changes
    for i in range(1, len(backtest_data)):
        curr_direction = backtest_data['direction'].iloc[i]
        prev_direction = backtest_data['direction'].iloc[i-1]
        
        # Buy signal: Direction changed from -1 to 1
        if curr_direction == 1 and prev_direction == -1:
            backtest_data['signal'].iloc[i] = 1
            
        # Sell signal: Direction changed from 1 to -1
        elif curr_direction == -1 and prev_direction == 1:
            backtest_data['signal'].iloc[i] = -1
    
    # Simulate trades
    position = 0
    entry_price = 0
    stop_loss = 0
    
    for i in range(len(backtest_data)):
        # Update position based on signals
        if backtest_data['signal'].iloc[i] == 1 and position == 0:  # Buy signal
            position = 1
            entry_price = backtest_data['close'].iloc[i]
            stop_loss = backtest_data['supertrend'].iloc[i]
            backtest_data['position'].iloc[i] = position
            backtest_data['entry_price'].iloc[i] = entry_price
            backtest_data['stop_loss'].iloc[i] = stop_loss
            
        elif backtest_data['signal'].iloc[i] == -1 and position == 1:  # Sell signal
            exit_price = backtest_data['close'].iloc[i]
            profit_pct = (exit_price / entry_price - 1) * 100
            backtest_data['exit_price'].iloc[i] = exit_price
            backtest_data['profit_pct'].iloc[i] = profit_pct
            position = 0
            
        # Check for stop loss hit
        elif position == 1 and backtest_data['low'].iloc[i] < stop_loss:
            exit_price = stop_loss  # Assume stop loss was hit
            profit_pct = (exit_price / entry_price - 1) * 100
            backtest_data['exit_price'].iloc[i] = exit_price
            backtest_data['profit_pct'].iloc[i] = profit_pct
            backtest_data['signal'].iloc[i] = -2  # Special signal for stop loss
            position = 0
            
        # Update position column
        backtest_data['position'].iloc[i] = position
    
    # Calculate performance metrics
    trades = backtest_data[backtest_data['signal'] != 0].copy()
    winning_trades = trades[trades['profit_pct'] > 0]
    losing_trades = trades[trades['profit_pct'] < 0]
    
    total_trades = len(trades)
    winning_trades_count = len(winning_trades)
    
    win_rate = winning_trades_count / total_trades if total_trades > 0 else 0
    avg_win = winning_trades['profit_pct'].mean() if not winning_trades.empty else 0
    avg_loss = losing_trades['profit_pct'].mean() if not losing_trades.empty else 0
    
    # Calculate equity curve
    backtest_data['returns'] = 0.0
    backtest_data.loc[backtest_data['profit_pct'] != 0, 'returns'] = backtest_data['profit_pct'] / 100
    backtest_data['equity'] = (1 + backtest_data['returns']).cumprod() * initial_capital
    
    print(f"Backtest Results for Supertrend (Period: {atr_period}, Multiplier: {multiplier}):")
    print(f"Total Trades: {total_trades}")
    print(f"Win Rate: {win_rate:.2%}")
    print(f"Average Win: {avg_win:.2f}%")
    print(f"Average Loss: {avg_loss:.2f}%")
    print(f"Final Equity: ${backtest_data['equity'].iloc[-1]:.2f}")
    
    return backtest_data
```python
def optimize_supertrend(data, atr_periods=range(7, 22, 3), multipliers=np.arange(1.5, 4.1, 0.5)):
    """
    Optimize Supertrend parameters
    
    Args:
        data (pd.DataFrame): OHLC data
        atr_periods (list): List of ATR periods to test
        multipliers (list): List of multipliers to test
        
    Returns:
        pd.DataFrame: Optimization results
    """
    results = []
    
    for period in atr_periods:
        for multiplier in multipliers:
            backtest_result = backtest_supertrend(data, period, multiplier)
            
            # Calculate key metrics
            trades = backtest_result[backtest_result['signal'] != 0]
            total_trades = len(trades)
            winning_trades = trades[trades['profit_pct'] > 0]
            win_rate = len(winning_trades) / total_trades if total_trades > 0 else 0
            
            profit_factor = abs(winning_trades['profit_pct'].sum() / 
                              trades[trades['profit_pct'] < 0]['profit_pct'].sum()) if total_trades > 0 else 0
            
            # Get final equity
            final_equity = backtest_result['equity'].iloc[-1]
            
            results.append({
                'period': period,
                'multiplier': multiplier,
                'total_trades': total_trades,
                'win_rate': win_rate,
                'profit_factor': profit_factor,
                'final_equity': final_equity
            })
    
    # Convert to DataFrame and sort by final equity
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values('final_equity', ascending=False)
    
    return results_df
```python
from .base_strategy import BaseStrategy
from ..utils.indicators import calculate_macd, calculate_rsi
from alpaca.trading.enums import OrderSide

class MACDStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str,
                 fast_period: int = 12, slow_period: int = 26,
                 signal_period: int = 9, rsi_period: int = 14):
        """Initialize MACD strategy"""
        super().__init__(trading_client, data_client, symbol)
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.signal_period = signal_period
        self.rsi_period = rsi_period
        
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals"""
        if data.empty:
            return {
                'signal': 'HOLD',
                'macd': None,
                'signal_line': None,
                'histogram': None,
                'rsi': None,
                'last_close': None
            }
            
        # Calculate MACD
        close = data['close']
        macd_line, signal_line, histogram = calculate_macd(
            close,
            self.fast_period,
            self.slow_period,
            self.signal_period
        )
        
        # Calculate RSI
        rsi = calculate_rsi(close, self.rsi_period)
        
        # Get latest values
        current_macd = macd_line.iloc[-1]
        current_signal = signal_line.iloc[-1]
        current_hist = histogram.iloc[-1]
        prev_hist = histogram.iloc[-2]
        current_rsi = rsi.iloc[-1]
        last_close = close.iloc[-1]
        
        # Generate signal
        signal = 'HOLD'
        
        # Buy conditions:
        # 1. MACD crosses above signal line
        # 2. RSI < 70 (not overbought)
        if (current_hist > 0 and prev_hist <= 0 and
            current_rsi < 70):
            signal = 'BUY'
            
        # Sell conditions:
        # 1. MACD crosses below signal line
        # 2. RSI > 30 (not oversold)
        elif (current_hist < 0 and prev_hist >= 0 and
              current_rsi > 30):
            signal = 'SELL'
            
        return {
            'signal': signal,
            'macd': current_macd,
            'signal_line': current_signal,
            'histogram': current_hist,
            'rsi': current_rsi,
            'last_close': last_close
        }
        
    def execute_strategy(self):
        """Execute the trading strategy"""
        try:
            # Get historical data
            data = self.get_historical_data()
            if data.empty:
                return
                
            # Generate signals
            signals = self.generate_signals(data)
            if signals['signal'] == 'HOLD':
                return
                
            # Update position info
            self.update_position()
            
            # Execute trades
            if signals['signal'] == 'BUY' and not self.position:
                # Calculate position size
                entry_price = signals['last_close']
                stop_loss = entry_price * 0.98  # 2% stop loss
                size = self.calculate_position_size(
                    capital=100000,  # Example value
                    risk_per_trade=1.0,
                    entry_price=entry_price,
                    stop_loss=stop_loss
                )
                
                if size > 0:
                    self.place_market_order(
                        side=OrderSide.BUY,
                        quantity=size,
                        stop_loss=stop_loss
                    )
                    
            elif signals['signal'] == 'SELL' and self.position:
                self.place_market_order(
                    side=OrderSide.SELL,
                    quantity=float(self.position.qty)
                )
                
        except Exception as e:
            print(f"Error executing MACD strategy: {e}")
```python
class CombinedStrategy(BaseStrategy):
    def __init__(self, supertrend_weight: float = 0.5,
                 macd_weight: float = 0.5):
        self.supertrend = SupertrendStrategy()
        self.macd = MACDStrategy()
        self.weights = {
            'supertrend': supertrend_weight,
            'macd': macd_weight
        }
        
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """
        Generate combined trading signals
        """
        supertrend_signals = self.supertrend.generate_signals(data)
        macd_signals = self.macd.generate_signals(data)
        
        # Combine signals using weights
        combined = (supertrend_signals * self.weights['supertrend'] +
                   macd_signals * self.weights['macd'])
        
        # Threshold for final signals
        signals = pd.Series(0, index=data.index)
        signals[combined > 0.5] = 1
        signals[combined < -0.5] = -1
        
        return signals
```python
def calculate_position_size(self, data: pd.DataFrame,
                          capital: float,
                          max_risk: float = 0.02) -> float:
    """
    Calculate position size using both strategies
    """
    # Get individual position sizes
    st_size = self.supertrend.calculate_position_size(
        data, capital, max_risk
    )
    macd_size = self.macd.calculate_position_size(
        data, capital, max_risk
    )
    
    # Use weighted average
    position_size = (st_size * self.weights['supertrend'] +
                    macd_size * self.weights['macd'])
    
    return position_size
       """
       Find optimal strategy parameters
       """
       best_params = {}
       best_performance = 0
       
       for params in itertools.product(*param_grid.values()):
           # Test strategy with these parameters
           performance = backtest_strategy(data, dict(zip(param_grid.keys(), params)))
           if performance > best_performance:
               best_performance = performance
               best_params = dict(zip(param_grid.keys(), params))
       
       return best_params
```python
from abc import ABC, abstractmethod
from typing import Dict, Optional
import pandas as pd

class BaseStrategy(ABC):
    def __init__(self, trading_client, data_client, symbol: str):
        self.trading_client = trading_client
        self.data_client = data_client
        self.symbol = symbol
        self.position = None
        self.update_position()
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate trading signals from data"""
        pass
    
    def update_position(self):
        """Update current position information"""
        try:
            self.position = self.trading_client.get_position(self.symbol)
        except Exception:
            self.position = None
            
    def calculate_position_size(self, capital: float, risk_per_trade: float,
                              entry_price: float, stop_loss: float) -> float:
        """Calculate position size based on risk parameters"""
        risk_amount = capital * (risk_per_trade / 100)
        risk_per_share = abs(entry_price - stop_loss)
        return risk_amount / risk_per_share if risk_per_share > 0 else 0
```python
class SupertrendStrategy(BaseStrategy):
    def __init__(self, trading_client, data_client, symbol: str,
                 atr_period: int = 10, multiplier: float = 3.0):
        super().__init__(trading_client, data_client, symbol)
        self.atr_period = atr_period
        self.multiplier = multiplier
    
    def generate_signals(self, data: pd.DataFrame) -> Dict:
        """Generate Supertrend signals"""
        if data.empty:
            return {'signal': 'HOLD'}
            
        # Calculate Supertrend
        st_data = self.calculate_supertrend(data)
        
        # Generate signal
        signal = 'HOLD'
        if st_data['direction'].iloc[-1] == 1:
            signal = 'BUY'
        elif st_data['direction'].iloc[-1] == -1:
            signal = 'SELL'
            
        return {
            'signal': signal,
            'supertrend': st_data['supertrend'].iloc[-1],
            'direction': st_data['direction'].iloc[-1]
        }
```python
def get_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> Optional[pd.DataFrame]:
    """Get historical price data for a symbol with fallbacks"""
    try:
        # Try Alpaca first
        api_key = os.getenv('ALPACA_API_KEY')
        api_secret = os.getenv('ALPACA_API_SECRET')
        
        if api_key and api_secret:
            logger.info(f"Trying Alpaca API for {symbol}")
            alpaca_data = get_alpaca_historical_data(symbol, timeframe, limit)
            if alpaca_data is not None and not alpaca_data.empty:
                logger.info(f"Successfully retrieved {len(alpaca_data)} data points from Alpaca")
                return alpaca_data
                
        # If Alpaca fails or no credentials, try Polygon.io
        logger.info(f"Trying Polygon.io API as fallback for {symbol}")
        polygon_data = get_polygon_historical_data(symbol, timeframe, limit)
        if polygon_data is not None and not polygon_data.empty:
            logger.info(f"Successfully retrieved {len(polygon_data)} data points from Polygon.io")
            return polygon_data
            
        # If both fail, use mock data
        logger.info(f"All APIs failed, using mock data for {symbol}")
        return generate_mock_data(symbol, timeframe, limit)
            
    except Exception as e:
        logger.error(f"Error in get_historical_data: {str(e)}")
        return generate_mock_data(symbol, timeframe, limit)
```python
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
```python
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
```python
def generate_mock_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> pd.DataFrame:
    """Generate mock historical data as last resort fallback"""
    logger.info(f"Generating mock data for {symbol} with timeframe {timeframe}, limit {limit}")
    
    # Generate timestamps
    end_time = pd.Timestamp.now()
    timestamps = []
    
    # Generate appropriate time intervals based on timeframe
    if timeframe in ['1m', '5m', '15m']:
        for i in range(limit):
            timestamps.append(end_time - pd.Timedelta(minutes=i * int(timeframe[0])))
    elif timeframe in ['1h', '4h']:
        for i in range(limit):
            timestamps.append(end_time - pd.Timedelta(hours=i * int(timeframe[0])))
    else:  # Default to daily
        for i in range(limit):
            timestamps.append(end_time - pd.Timedelta(days=i))
    
    # Set base price based on symbol
    if 'BTC' in symbol:
        base_price = 45000
    elif 'ETH' in symbol:
        base_price = 2000
    elif 'SOL' in symbol:
        base_price = 150
    else:
        base_price = 100
    
    # Generate random walk prices with seed based on symbol for consistency
    import random
    random.seed(hash(symbol) % 10000)
    
    # Create basic price array
    closes = []
    opens = []
    highs = []
    lows = []
    volumes = []
    
    # Generate price data
    price = base_price
    for i in range(limit):
        # Simple random walk
        change = price * (random.random() - 0.5) * 0.04  # 4% volatility
        price = max(0.01, price + change)
        
        # Generate OHLC and volume
        open_price = price * (1 + (random.random() - 0.5) * 0.01)
        high = max(open_price, price) * (1 + random.random() * 0.01)
        low = min(open_price, price) * (1 - random.random() * 0.01)
        volume = random.random() * base_price * 1000
        
        closes.append(price)
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
```python
class TradingEngine:
    def __init__(self, api_key: Optional[str] = None, 
                 secret_key: Optional[str] = None,
                 paper: bool = True):
        self.trading_client = TradingClient(api_key, secret_key, paper=paper)
        self.data_client = CryptoHistoricalDataClient()
        self.strategies = {}
        self.running = False
        
        # Trading settings
        self.max_position_size = 20  # % of portfolio
        self.risk_per_trade = 2.0    # % risk per trade
        self.stop_loss_percent = 2.0  # % stop loss
        self.take_profit_percent = 4.0  # % take profit
        
    def add_strategy(self, symbol: str, strategy_type: str, **params):
        """Add a trading strategy"""
        if symbol not in self.strategies:
            self.strategies[symbol] = []
            
        strategy = self._create_strategy(symbol, strategy_type, **params)
        self.strategies[symbol].append(strategy)
        
    def start_trading(self):
        """Start the trading engine"""
        self.running = True
        while self.running:
            self._process_strategies()
            time.sleep(60)  # Check every minute
            
    def _process_strategies(self):
        """Process all active strategies"""
        for symbol, strategies in self.strategies.items():
            for strategy in strategies:
                try:
                    data = self._get_market_data(symbol)
                    signals = strategy.generate_signals(data)
                    self._execute_signals(strategy, signals)
                except Exception as e:
                    self.logger.error(f"Error processing strategy: {e}")
```python
def _get_market_data(self, symbol: str, timeframe: str = '1Min',
                    limit: int = 100) -> pd.DataFrame:
    """Get real-time market data with fallbacks"""
    try:
        # Try to get data from Alpaca
        try:
            bars = self.data_client.get_crypto_bars(
                symbol=symbol,
                timeframe=timeframe,
                limit=limit
            ).df
            
            if not bars.empty:
                self.logger.info(f"Retrieved {len(bars)} bars from Alpaca for {symbol}")
                return bars
        except Exception as e:
            self.logger.warning(f"Failed to get data from Alpaca: {e}")
            
        # Try Polygon as fallback
        try:
            polygon_data = get_polygon_historical_data(symbol, timeframe, limit)
            if polygon_data is not None and not polygon_data.empty:
                self.logger.info(f"Retrieved {len(polygon_data)} bars from Polygon for {symbol}")
                return polygon_data
        except Exception as e:
            self.logger.warning(f"Failed to get data from Polygon: {e}")
            
        # Generate mock data as final fallback
        self.logger.info(f"Generating mock data for {symbol}")
        return generate_mock_data(symbol, timeframe, limit)
        
    except Exception as e:
        self.logger.error(f"Error getting market data: {e}")
        return pd.DataFrame()
```python
def _execute_signals(self, strategy: BaseStrategy, signals: Dict):
    """Execute trading signals"""
    if signals['signal'] == 'BUY' and not strategy.position:
        # Calculate position size
        entry_price = self._get_current_price(strategy.symbol)
        stop_loss = entry_price * (1 - self.stop_loss_percent/100)
        size = strategy.calculate_position_size(
            capital=self._get_buying_power(),
            risk_per_trade=self.risk_per_trade,
            entry_price=entry_price,
            stop_loss=stop_loss
        )
        
        if size > 0:
            self._place_order(
                symbol=strategy.symbol,
                side='buy',
                qty=size,
                stop_loss=stop_loss,
                take_profit=entry_price * (1 + self.take_profit_percent/100)
            )
            
    elif signals['signal'] == 'SELL' and strategy.position:
        self._place_order(
            symbol=strategy.symbol,
            side='sell',
            qty=float(strategy.position.qty)
        )
```python
def _update_positions(self):
    """Update all position information"""
    try:
        positions = self.trading_client.get_all_positions()
        self.positions = {p.symbol: p for p in positions}
    except Exception as e:
        self.logger.error(f"Error updating positions: {str(e)}")
        self.positions = {}
```python
def _check_risk_limits(self, symbol: str, size: float, 
                      entry_price: float) -> bool:
    """Check if trade meets risk management criteria"""
    # Check position size limit
    portfolio_value = self._get_portfolio_value()
    position_value = size * entry_price
    if position_value / portfolio_value > self.max_position_size / 100:
        return False
        
    # Check maximum open positions
    if len(self.positions) >= self.max_open_trades:
        return False
        
    # Check daily loss limit
    if self._check_daily_loss_limit():
        return False
        
    return True
```python
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from backend.api_routes import api_blueprint
from backend.models.database import init_db, teardown_session, get_session
from backend.trading_engine import TradingEngine
import os
from dotenv import load_dotenv
import logging
from datetime import datetime
from flask_socketio import SocketIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize trading engine
trading_engine = TradingEngine()

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__, 
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
    
    # Enable CORS
    CORS(app)
    
    # Initialize Socket.IO
    socketio = SocketIO(app, cors_allowed_origins="*")
    
    # Add cache-busting headers
    @app.after_request
    def add_header(response):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
    
    # Initialize database
    logger.info("Initializing database...")
    if init_db():
        logger.info("Database initialized successfully")
    else:
        logger.error("Failed to initialize database")
    
    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    # Register teardown function
    app.teardown_appcontext(teardown_session)
    
    return app, socketio
```python
@api_blueprint.route('/historical/<symbol>', methods=['GET'])
def get_historical_prices(symbol):
    """Endpoint to return historical price data with fallbacks"""
    try:
        from datetime import datetime, timedelta
        import sys
        from backend.utils.market_data import get_historical_data, generate_mock_data
        import pandas as pd
        
        # Add detailed logging for debugging
        logger.info(f"Historical data endpoint called for symbol: {symbol}")
        logger.info(f"Request args: {request.args}")
        logger.info(f"Request path: {request.path}")
        
        # Get parameters
        timeframe = request.args.get('timeframe', '1d')
        limit = int(request.args.get('limit', 100))
        
        # Format symbol
        symbol = symbol.replace('%2F', '/')
        logger.info(f"Getting historical data for {symbol}, timeframe {timeframe}, limit {limit}")
        
        # Get historical data using the utility function with fallbacks
        try:
            df = get_historical_data(symbol, timeframe, limit)
            
            if df is None or df.empty:
                logger.warning(f"No historical data available for {symbol}, generating mock data")
                df = generate_mock_data(symbol, timeframe, limit)
                
            # Convert DataFrame to list of dictionaries for JSON response
            result = []
            for _, row in df.iterrows():
                try:
                    data_point = {
                        'timestamp': row['timestamp'].isoformat(),
                        'open': float(row['open']),
                        'high': float(row['high']),
                        'low': float(row['low']),
                        'close': float(row['close']),
                        'volume': float(row['volume'])
                    }
                    result.append(data_point)
                except Exception as e:
                    logger.warning(f"Error formatting data point: {e}")
                    continue
                    
            logger.info(f"Successfully retrieved {len(result)} data points")
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Error retrieving historical data: {str(e)}")
            # Fallback to direct mock data generation
            logger.info("Falling back to direct mock data generation")
            
            # Generate timestamps
            end_time = datetime.now()
            timestamps = [(end_time - timedelta(days=i)).isoformat() for i in range(limit)]
            
            # Set base price based on symbol
            if 'BTC' in symbol:
                base_price = 45000
            elif 'ETH' in symbol:
                base_price = 2000
            else:
                base_price = 100
                
            # Generate price data
            result = []
            for i in range(limit):
                # Create a price with some variation
                close = base_price * (1 + (random.random() - 0.5) * 0.1)
                open_price = close * 0.99
                high = close * 1.02
                low = close * 0.98
                volume = base_price * 1000
                
                result.append({
                    'timestamp': timestamps[i],
                    'open': float(open_price),
                    'high': float(high),
                    'low': float(low),
                    'close': float(close),
                    'volume': float(volume)
                })
                
            logger.info(f"Successfully generated {len(result)} fallback data points")
            return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in historical data endpoint: {str(e)}")
        # Return empty array instead of error
        return jsonify([])
```python
def get_historical_data(symbol: str, timeframe: str = '1d', limit: int = 100) -> Optional[pd.DataFrame]:
    """Get historical price data for a symbol with fallbacks"""
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
```javascript
// Load historical data for a symbol
function loadHistoricalData(symbol) {
    if (!symbol) return;
    
    console.log('[CHART DEBUG] Fetching historical data for:', symbol);
    
    // Show loading state if container exists
    const chartContainer = document.getElementById('chartContainer');
    if (chartContainer) {
        chartContainer.classList.add('loading');
    }

    // Always use client-side mock data for reliable charts
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
```python
def main():
    """Main entry point for the application."""
    try:
        # Create and configure the application
        app, socketio = create_app()
        
        # Get configuration from environment
        debug = True  # Force debug mode for troubleshooting
        port = int(os.getenv('FLASK_PORT', 5002))  # Default to port 5002
        host = os.getenv('FLASK_HOST', '0.0.0.0')
        
        # Start the server
        logger.info(f"Starting server on {host}:{port}")
        socketio.run(app, host=host, port=port, debug=debug)
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise e
```javascript
function initializeWebSocket() {
    // Connect to socket.io server
    const socketUrl = window.location.protocol + '//' + window.location.host;
    window.socket = io(socketUrl);
    
    window.socket.on('connect', function() {
        console.log('WebSocket connected');
        
        // Subscribe to default symbol
        if (window.currentSymbol) {
            window.socket.emit('subscribe', { symbol: window.currentSymbol });
        }
    });
    
    window.socket.on('disconnect', function() {
        console.log('WebSocket disconnected');
    });
    
    // Handle market data updates
    window.socket.on('market_data', function(data) {
        handleMarketData(data);
    });
    
    // Handle order updates
    window.socket.on('order_update', function(data) {
        handleOrderUpdate(data);
    });
}
```python
# Add request logging for debugging
@app.before_request
def log_request_info():
    logger.info(f"Request: {request.method} {request.path}")
    logger.info(f"Full URL: {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Args: {request.args}")

# Add response logging
@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status_code} {response.status}")
    logger.info(f"Response headers: {dict(response.headers)}")
    return response

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return {"error": "Resource not found"}, 404
    
@app.errorhandler(500)
def internal_error(error):
    return {"error": "Internal server error"}, 500
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
```python
class TradingService:
    def __init__(self, config: dict):
        self.services = {
            'market_data': MarketDataService(),
            'strategy': StrategyService(),
            'execution': ExecutionService(),
            'risk': RiskManagementService(),
            'monitoring': MonitoringService()
        }
        self.message_broker = MessageBroker(config['broker_url'])
        
    async def initialize_services(self):
        """
        Initialize all microservices
        """
        for service in self.services.values():
            await service.initialize()
            await self.message_broker.register_service(service)
            
    async def start(self):
        """
        Start trading system
        """
        await self.initialize_services()
        await self.health_check()
        await self.start_trading_cycle()
```python
class MessageBroker:
    def __init__(self, broker_url: str):
        self.url = broker_url
        self.channels = defaultdict(list)
        self.connection = None
        
    async def publish(self, channel: str, message: dict):
        """
        Publish message to channel
        """
        if not self.connection:
            await self.connect()
            
        await self.connection.publish(
            channel,
            json.dumps(message),
            delivery_mode=2  # Persistent message
        )
        
    async def subscribe(self, channel: str, callback: Callable):
        """
        Subscribe to channel
        """
        if not self.connection:
            await self.connect()
            
        self.channels[channel].append(callback)
        await self.connection.subscribe(
            channel,
            self._message_handler
        )
        
    async def _message_handler(self, channel: str, message: bytes):
        """
        Handle incoming messages
        """
        data = json.loads(message)
        for callback in self.channels[channel]:
            try:
                await callback(data)
            except Exception as e:
                logging.error(f"Callback error: {e}")
```python
class LoadBalancer:
    def __init__(self, config: dict):
        self.services = {}
        self.health_checks = {}
        self.strategy = config.get('strategy', 'round_robin')
        
    async def register_service(self, service_type: str,
                             instance: ServiceInstance):
        """
        Register new service instance
        """
        if service_type not in self.services:
            self.services[service_type] = []
        self.services[service_type].append(instance)
        
        # Start health checking
        self.health_checks[instance.id] = asyncio.create_task(
            self._health_check_loop(instance)
        )
        
    async def get_instance(self, service_type: str) -> ServiceInstance:
        """
        Get available service instance
        """
        instances = [i for i in self.services[service_type] 
                    if i.is_healthy]
        
        if not instances:
            raise NoHealthyInstanceError(service_type)
            
        if self.strategy == 'round_robin':
            return self._round_robin_select(instances)
        elif self.strategy == 'least_loaded':
            return self._least_loaded_select(instances)
```python
class TimeseriesDB:
    def __init__(self, config: dict):
        self.write_pool = ConnectionPool(
            config['write_nodes'],
            max_connections=config['max_connections']
        )
        self.read_pool = ConnectionPool(
            config['read_nodes'],
            max_connections=config['max_connections']
        )
        
    async def write_data(self, table: str, data: pd.DataFrame):
        """
        Write data with automatic sharding
        """
        async with self.write_pool.acquire() as conn:
            shard = self._get_shard(data)
            await conn.execute_batch(
                f"INSERT INTO {table}_{shard} VALUES ($1, $2, $3)",
                data.values.tolist()
            )
            
    async def read_data(self, table: str, 
                       start_time: datetime,
                       end_time: datetime) -> pd.DataFrame:
        """
        Read data from appropriate shards
        """
        shards = self._get_time_shards(start_time, end_time)
        results = []
        
        async with self.read_pool.acquire() as conn:
            for shard in shards:
                query = f"""
                SELECT * FROM {table}_{shard}
                WHERE timestamp BETWEEN $1 AND $2
                """
                result = await conn.fetch(query, start_time, end_time)
                results.extend(result)
                
        return pd.DataFrame(results)
```python
class MetricsCollector:
    def __init__(self):
        self.metrics = defaultdict(list)
        self.gauges = {}
        self.counters = defaultdict(int)
        
    async def record_metric(self, name: str, value: float,
                          tags: dict = None):
        """
        Record time-series metric
        """
        timestamp = datetime.now()
        self.metrics[name].append({
            'timestamp': timestamp,
            'value': value,
            'tags': tags or {}
        })
        
        # Prune old metrics
        self._prune_metrics(name)
        
    async def increment_counter(self, name: str, 
                              value: int = 1,
                              tags: dict = None):
        """
        Increment counter metric
        """
        key = self._get_metric_key(name, tags)
        self.counters[key] += value
        
    def get_metrics_report(self) -> dict:
        """
        Generate metrics report
        """
        return {
            'metrics': dict(self.metrics),
            'counters': dict(self.counters),
            'gauges': dict(self.gauges)
        }
```python
class HealthMonitor:
    def __init__(self, config: dict):
        self.checks = {
            'database': self._check_database,
            'message_broker': self._check_message_broker,
            'api': self._check_api,
            'trading_engine': self._check_trading_engine
        }
        self.alert_manager = AlertManager(config['alerts'])
        
    async def run_health_checks(self):
        """
        Run all health checks
        """
        results = {}
        for name, check in self.checks.items():
            try:
                status = await check()
                results[name] = status
                
                if not status['healthy']:
                    await self.alert_manager.send_alert(
                        f"Health check failed: {name}",
                        level='critical',
                        details=status
                    )
            except Exception as e:
                results[name] = {
                    'healthy': False,
                    'error': str(e)
                }
                
        return results
```python
class TradeReporter:
    def __init__(self, config: dict):
        self.report_queue = asyncio.Queue()
        self.reporters = {
            'sec': SECReporter(config['sec']),
            'finra': FINRAReporter(config['finra'])
        }
        
    async def report_trade(self, trade: Trade):
        """
        Report trade to regulatory bodies
        """
        # Add trade to reporting queue
        await self.report_queue.put(trade)
        
        # Generate reports
        reports = {}
        for name, reporter in self.reporters.items():
            try:
                report = await reporter.generate_report(trade)
                reports[name] = report
            except Exception as e:
                logging.error(f"Reporting error for {name}: {e}")
                
        # Store reports
        await self.store_reports(trade.id, reports)
        
    async def process_report_queue(self):
        """
        Process queued trade reports
        """
        while True:
            trade = await self.report_queue.get()
            await self.report_trade(trade)
            self.report_queue.task_done()
```python
class ComplianceMonitor:
    def __init__(self, config: dict):
        self.rules = self.load_compliance_rules(config['rules'])
        self.violations = []
        
    async def check_compliance(self, trade: Trade) -> bool:
        """
        Check trade compliance
        """
        for rule in self.rules:
            if not await rule.check(trade):
                violation = ComplianceViolation(
                    trade=trade,
                    rule=rule,
                    timestamp=datetime.now()
                )
                await self.handle_violation(violation)
                return False
        return True
        
    async def handle_violation(self, violation: ComplianceViolation):
        """
        Handle compliance violation
        """
        self.violations.append(violation)
        
        # Alert compliance team
        await self.alert_compliance_team(violation)
        
        # Store violation record
        await self.store_violation(violation)
```python
# Error example
"error": "Authentication failed: Invalid API key or secret"
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
"error": "Too many requests", "status_code": 429
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
```python
# Pandas warning
"A value is trying to be set on a copy of a slice from a DataFrame"
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
GET /api/historical/BTC%2FUSD?timeframe=1d&limit=5 HTTP/1.1" 404 NOT FOUND
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
```javascript
SyntaxError: Identifier 'socket' has already been declared
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
```javascript
// In app.py (server)
socketio = SocketIO(app, cors_allowed_origins="*")

// In client JavaScript
const socketUrl = window.location.protocol + '//' + window.location.host;
window.socket = io(socketUrl);
```
ImportError: attempted relative import with no known parent package
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
       if (!symbol) return;
       
       console.log('[CHART DEBUG] Preparing chart data for:', symbol);
       
       // Generate mock data client-side
       const mockData = generateMockData(symbol, 100);
       updatePriceChart(mockData);
       if (!data || !Array.isArray(data) || data.length === 0) {
           console.error('[CHART DEBUG] Invalid or empty data for price chart');
           return;
       }
       
       console.log(`[CHART DEBUG] Updating chart with ${data.length} data points`);
       console.log(`[CHART DEBUG] First point: ${JSON.stringify(data[0])}`);
       console.log(`[CHART DEBUG] Last point: ${JSON.stringify(data[data.length-1])}`);
       
       // Chart update code
       // ...
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
```python
# .env file for local development
FLASK_ENV=development
FLASK_DEBUG=true
FLASK_PORT=5002
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
POLYGON_API_KEY=your_polygon_key
```python
PLANNED_STRATEGIES = {
    'sentiment_analysis': {
        'data_sources': ['Twitter API', 'Reddit API', 'News APIs'],
        'techniques': ['NLP sentiment scoring', 'Topic modeling', 'Entity recognition'],
        'integration': 'Signal modifier for existing strategies'
    },
    'volume_profile': {
        'features': ['Volume-at-price analysis', 'Market structure detection'],
        'timeframes': ['Intraday', 'Daily', 'Weekly'],
        'integration': 'Standalone strategy or confirmation filter'
    },
    'orderflow_analysis': {
        'features': ['Tape reading automation', 'Footprint charts', 'Liquidity analysis'],
        'data_requirements': 'High-frequency trade data',
        'integration': 'Advanced entry/exit timing'
    }
}
```python
MARKET_DATA_ENHANCEMENTS = {
    'unified_data_layer': {
        'description': 'A robust data access layer with multiple API sources and fallbacks',
        'components': [
            'Unified API interface for all data sources',
            'Automatic source selection based on availability and quality',
            'Data validation and normalization pipeline',
            'Persistent caching with time-based invalidation'
        ],
        'data_sources': [
            'Alpaca API (primary for US markets)',
            'Polygon.io (comprehensive historical data)',
            'CoinGecko (broad cryptocurrency coverage)',
            'Binance API (global cryptocurrency data)',
            'Alpha Vantage (traditional markets)'
        ],
        'reliability_features': [
            'Circuit breaker patterns for API rate limits',
            'Exponential backoff for retries',
            'Data quality scoring and source ranking',
            'Transparent failover between sources',
            'Configurable freshness requirements'
        ]
    },
    'data_preprocessing': {
        'on_demand_resampling': 'Dynamic timeframe generation from raw data',
        'gap_filling': 'Intelligent handling of missing data points',
        'outlier_detection': 'Automatic detection and handling of anomalous data',
        'normalization': 'Standardization across different data sources'
    },
    'storage_solutions': {
        'time_series_database': 'Specialized storage for historical market data',
        'partitioning_strategy': 'Efficient data organization by symbol and timeframe',
        'compression': 'Optimized storage with minimal precision loss'
    }
}
```python
ML_ROADMAP = {
    'feature_engineering': {
        'market_microstructure': ['Order imbalance', 'Bid-ask spread analysis', 'Trade flow classification'],
        'derivative_metrics': ['Options-based sentiment', 'Futures curve analysis', 'Open interest patterns'],
        'alternative_data': ['On-chain metrics', 'Exchange fund flows', 'Wallet analysis']
    },
    'models': {
        'reinforcement_learning': {
            'framework': 'Ray RLlib',
            'applications': ['Dynamic position sizing', 'Adaptive parameter tuning']
        },
        'ensemble_methods': {
            'techniques': ['Gradient boosting', 'Random forest', 'Neural networks'],
            'applications': 'Regime detection and strategy selection'
        },
        'deep_learning': {
            'architectures': ['LSTM', 'Transformer', 'CNN'],
            'applications': ['Price movement prediction', 'Volatility forecasting']
        }
    },
    'deployment': {
        'model_management': 'MLflow',
        'serving': 'TensorFlow Serving',
        'monitoring': 'Prometheus metrics for model performance'
    }
}
```python
AI_VISION = {
    'autonomous_trading': {
        'goal': 'Self-optimizing trading system',
        'components': [
            'Dynamic strategy creation',
            'Automated parameter tuning',
            'Adaptive risk management'
        ],
        'technologies': [
            'Evolutionary algorithms',
            'Advanced reinforcement learning',
            'Bayesian optimization'
        ]
    },
    'market_understanding': {
        'goal': 'Complex pattern recognition beyond human capability',
        'approaches': [
            'Multi-timeframe analysis',
            'Cross-asset correlation discovery',
            'Regime change prediction'
        ]
    },
    'explainable_ai': {
        'goal': 'Transparent decision-making process',
        'techniques': [
            'SHAP values for feature importance',
            'Decision tree visualization',
            'Natural language explanations'
        ]
    }
}
```python
CONTRIBUTION_FOCUS = {
    'high_priority': [
        'Performance optimization',
        'Risk management enhancements',
        'Data quality improvements',
        'Testing frameworks',
        'Documentation'
    ],
    'medium_priority': [
        'UI/UX improvements',
        'New technical indicators',
        'Additional data sources',
        'Monitoring enhancements'
    ],
    'exploratory': [
        'Experimental strategies',
        'Alternative ML approaches',
        'Novel visualization techniques'
    ]
}
     - Dashboard: `http://localhost:5002/dashboard`
     - Settings: `http://localhost:5002/settings`
     - Strategies: `http://localhost:5002/strategies`
     - History: `http://localhost:5002/history`
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

# Appendix B: Configuration Options

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
                 confidence_level: float = 0.95) -> float:
    """
    Calculate Value at Risk
    """
    return np.percentile(returns, (1 - confidence_level) * 100)
```

2. **Expected Shortfall (ES)**
                confidence_level: float = 0.95) -> float:
    """
    Calculate Expected Shortfall
    """
    var = calculate_var(returns, confidence_level)
    return returns[returns <= var].mean()
```

## B.2 Advanced Technical Indicators

### Adaptive Moving Average (AMA)
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
       'REST API': 'https://alpaca.markets/docs/api-documentation/api-v2/',
       'Market Data': 'https://alpaca.markets/docs/api-documentation/api-v2/market-data/',
       'Trading API': 'https://alpaca.markets/docs/api-documentation/api-v2/trading/'
       'pandas': 'https://pandas.pydata.org/docs/',
       'numpy': 'https://numpy.org/doc/',
       'scikit-learn': 'https://scikit-learn.org/stable/documentation.html',
       'ta-lib': 'https://mrjbq7.github.io/ta-lib/doc_index.html'
```python
DEVELOPMENT_STACK = {
    'IDEs': [
        'Visual Studio Code',
        'PyCharm Professional',
        'Jupyter Lab'
    ],
    'Version Control': [
        'Git',
        'GitHub',
        'GitLab'
    ],
    'Testing': [
        'pytest',
        'unittest',
        'coverage'
    ],
    'Profiling': [
        'cProfile',
        'line_profiler',
        'memory_profiler'
    ]
}
```python
TRADING_TOOLS = {
    'Data Providers': [
        'Alpha Vantage',
        'IEX Cloud',
        'CryptoCompare'
    ],
    'Charting': [
        'TradingView',
        'Plotly',
        'Bokeh'
    ],
    'Backtesting': [
        'Backtrader',
        'Zipline',
        'QuantConnect'
    ]
}
```python
GITHUB_REPOS = {
    'Trading Systems': [
        'https://github.com/topics/trading-bot',
        'https://github.com/topics/algorithmic-trading',
        'https://github.com/topics/quantitative-finance'
    ],
    'Machine Learning': [
        'https://github.com/topics/trading-machine-learning',
        'https://github.com/topics/financial-machine-learning'
    ],
    'Data Analysis': [
        'https://github.com/topics/financial-data',
        'https://github.com/topics/market-data'
    ]
}
```
┌─────────────────────────────────────────────────────────────────┐
│                      Crypto Trading Bot                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│  ┌─────────────┐   ┌──────────▼───────────┐   ┌───────────────┐ │
│  │             │   │                      │   │               │ │
│  │  Data       │   │  Trading Engine      │   │  Dashboard    │ │
│  │  Collection ├──►│                      ├──►│  Frontend     │ │
│  │             │   │                      │   │               │ │
│  └─────────────┘   └──────────┬───────────┘   └───────────────┘ │
│                               │                                  │
│  ┌─────────────┐   ┌──────────▼───────────┐   ┌───────────────┐ │
│  │             │   │                      │   │               │ │
│  │  Strategy   │◄──┤  Risk Management     │◄──┤  API          │ │
│  │  Engine     ├──►│                      ├──►│  Interface    │ │
│  │             │   │                      │   │               │ │
│  └─────────────┘   └──────────────────────┘   └───────┬───────┘ │
│                                                        │         │
└────────────────────────────────────────────────────────┼─────────┘
                                                         │
                                                   ┌─────▼─────┐
                                                   │           │
                                                   │  Alpaca   │
                                                   │  API      │
                                                   │           │
                                                   └───────────┘
```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│           │     │           │     │           │     │           │
│  Market   │────►│ Data      │────►│ Strategy  │────►│ Order     │
│  Data     │     │ Processor │     │ Engine    │     │ Manager   │
│           │     │           │     │           │     │           │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                                         │                  │
                                         │                  │
                                    ┌────▼──────┐     ┌─────▼─────┐
                                    │           │     │           │
                                    │ Position  │◄────┤ Risk      │
                                    │ Manager   │     │ Manager   │
                                    │           │     │           │
                                    └───────────┘     └───────────┘
```
┌───────────────────────────────────────────────────────────────────┐
│  Strategy Implementation Process                                   │
└───────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Define     │────►│  Implement  │────►│  Backtest   │
│  Parameters │     │  Logic      │     │  Strategy   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Deploy     │◄────┤  Optimize   │◄────┤  Analyze    │
│  Strategy   │     │  Parameters │     │  Results    │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```
┌──────────────────────┐
│ Market Data Input    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Calculate ATR        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Calculate Upper Band │
│ = (High+Low)/2 +     │
│   Multiplier * ATR   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Calculate Lower Band │
│ = (High+Low)/2 -     │
│   Multiplier * ATR   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Determine Trend      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Generate Buy/Sell    │
│ Signals on Trend     │
│ Change               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Apply Risk           │
│ Management Rules     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Execute Trade        │
└──────────────────────┘
```
┌─────────────┐
│ Market Data │
└──────┬──────┘
       │
       ▼
┌──────────────────┐  No   ┌─────────────┐
│ Signal Generated?│─────► │ Continue    │
└───────┬──────────┘       │ Monitoring  │
        │ Yes             └─────────────┘
        ▼
┌──────────────────┐  No   ┌─────────────┐
│ Passes Risk      │─────► │ Log &       │
│ Checks?          │       │ Discard     │
└───────┬──────────┘       └─────────────┘
        │ Yes
        ▼
┌──────────────────┐
│ Calculate        │
│ Position Size    │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Submit Order     │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐  No   ┌─────────────┐
│ Order Filled?    │─────► │ Handle      │
└───────┬──────────┘       │ Rejection   │
        │ Yes             └─────────────┘
        ▼
┌──────────────────┐
│ Set Stop Loss    │
│ & Take Profit    │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Monitor Position │◄─────┐
└───────┬──────────┘      │
        │                 │ No
        ▼                 │
┌──────────────────┐  No  │
│ Exit Condition   │──────┘
│ Met?             │
└───────┬──────────┘
        │ Yes
        ▼
┌──────────────────┐
│ Close Position   │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Update Portfolio │
│ & Performance    │
│ Metrics          │
└──────────────────┘
```
                  ┌──────────────────────────────────────┐
                  │           Strategy Manager           │
                  └───┬──────────────────┬──────────┬────┘
                      │                  │          │
                      ▼                  ▼          ▼
┌─────────────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Supertrend Strategy     │  │ MACD Strategy   │  │ Custom Strategy │
└─────────────┬───────────┘  └────────┬────────┘  └────────┬────────┘
              │                       │                    │
              ▼                       ▼                    ▼
┌─────────────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Signal Generator        │  │ Signal Generator│  │ Signal Generator│
└─────────────┬───────────┘  └────────┬────────┘  └────────┬────────┘
              │                       │                    │
              └───────────────┬───────┴────────────────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │  Signal Aggregator    │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Risk Management      │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Order Execution      │
                    └───────────────────────┘
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                            Kubernetes Cluster                      │
│                                                                    │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │
│  │               │   │               │   │               │        │
│  │ Data          │   │ Trading       │   │ API           │        │
│  │ Service       │   │ Service       │   │ Service       │        │
│  │               │   │               │   │               │        │
│  │ Pod 1..n      │   │ Pod 1..n      │   │ Pod 1..n      │        │
│  └───────────────┘   └───────────────┘   └───────────────┘        │
│                                                                    │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │
│  │               │   │               │   │               │        │
│  │ Dashboard     │   │ Monitoring    │   │ Database      │        │
│  │ Service       │   │ Service       │   │ Service       │        │
│  │               │   │               │   │               │        │
│  │ Pod 1..n      │   │ Pod 1..n      │   │ StatefulSet   │        │
│  └───────────────┘   └───────────────┘   └───────────────┘        │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                         External Services                          │
│                                                                    │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │
│  │               │   │               │   │               │        │
│  │ Alpaca API    │   │ Data Vendors  │   │ Cloud Storage │        │
│  │               │   │               │   │               │        │
│  └───────────────┘   └───────────────┘   └───────────────┘        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```
┌──────────────────────────────────────────────────────────────────┐
│                      Risk Management System                       │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────┐      ┌────────────────┐      ┌───────────────┐
│                   │      │                │      │               │
│ Account-Level     │◄────►│ Position-Level │◄────►│ Order-Level   │
│ Risk Controls     │      │ Risk Controls  │      │ Risk Controls │
│                   │      │                │      │               │
└─────────┬─────────┘      └────────────────┘      └───────────────┘
          │
          ▼
┌────────────────────────┐
│                        │
│ Max Portfolio Exposure │
│ Max Drawdown Limit     │
│ Correlation Control    │
│                        │
└────────────────────────┘
```
┌────────────────────────────────────────────────────────────────────┐
│ Trading Bot Dashboard                                   User: Admin │
└────────────────────────────────────────────────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────────────────┐
│                         │  │                                     │
│     Account Summary     │  │         Performance Metrics         │
│                         │  │                                     │
│  Balance: $10,245.67    │  │  Daily P&L: +$245.30 (+2.4%)       │
│  Buying Power: $8,432.10│  │  Monthly P&L: +$1,245.30 (+12.4%)   │
│  # Positions: 3         │  │  Sharpe Ratio: 1.35                │
│  Risk Usage: 45%        │  │  Win Rate: 62%                     │
│                         │  │                                     │
└─────────────────────────┘  └─────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         Performance Chart                           │
│                                                                     │
│                                                                     │
│                                                                     │
│                                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────────────────┐
│                         │  │                                     │
│   Active Positions      │  │          Recent Trades              │
│                         │  │                                     │
│  BTC/USD: +3.2%         │  │  ETH/USD: Sold @ $1,895.30         │
│  ETH/USD: -1.5%         │  │  Profit: +$120.50                  │
│  SOL/USD: +5.4%         │  │  Time: 2023-06-15 14:22:35         │
│                         │  │                                     │
│                         │  │  BTC/USD: Bought @ $28,450.25      │
│                         │  │  Size: 0.15 BTC                    │
│                         │  │  Time: 2023-06-15 10:15:03         │
│                         │  │                                     │
└─────────────────────────┘  └─────────────────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────────────────┐
│                         │  │                                     │
│   Strategy Performance  │  │         System Metrics              │
│                         │  │                                     │
│  Supertrend: +8.3%      │  │  CPU Usage: 32%                    │
│  MACD: +2.1%            │  │  Memory: 1.2GB                     │
│  Custom: +4.5%          │  │  API Latency: 120ms                │
│  Combined: +5.6%        │  │  Last Update: 15:30:05             │
│                         │  │                                     │
└─────────────────────────┘  └─────────────────────────────────────┘
``` 
