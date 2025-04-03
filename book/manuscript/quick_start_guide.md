# Quick Start Guide

This guide will help you set up and run the cryptocurrency trading bot in less than 30 minutes.

## Prerequisites

- Python 3.8+ installed
- Git installed
- Alpaca account with API keys
- Basic familiarity with command line

## 5-Minute Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Organica-Ai-Solutions/BuildingACryptoTradingBot.git
cd BuildingACryptoTradingBot
```

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate environment
# For Windows:
venv\Scripts\activate
# For macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Configure API Keys

Create a `.env` file in the project root:

```
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_api_secret_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # Paper trading
```

## Run Example Bot

Launch the sample bot to verify your setup:

```bash
python examples/basic_bot.py
```

You should see output confirming the bot is running and connected to Alpaca.

## Configure Your First Strategy

Edit `config/strategy_config.json`:

```json
{
  "strategy": "supertrend",
  "parameters": {
    "atr_period": 10,
    "multiplier": 3
  },
  "symbols": ["BTC/USD", "ETH/USD"],
  "timeframe": "15Min",
  "risk_per_trade": 0.02
}
```

## Start Trading

```bash
python src/main.py --config config/strategy_config.json --paper
```

## Dashboard Access

Open your browser and navigate to:

```
http://localhost:5000
```

You should see the trading dashboard with active positions and performance metrics.

## Quick Configuration Reference

### Strategy Types

```python
AVAILABLE_STRATEGIES = {
    'supertrend': {  # Trend-following strategy
        'atr_period': 10,  # ATR lookback period
        'multiplier': 3    # ATR multiplier for bands
    },
    'macd': {  # Momentum strategy
        'fast_period': 12,
        'slow_period': 26,
        'signal_period': 9
    },
    'dual_strategy': {  # Combined strategy
        'strategies': ['supertrend', 'macd'],
        'confirmation': 'any'  # 'any' or 'all'
    }
}
```

### Risk Management Settings

```python
RISK_SETTINGS = {
    'risk_per_trade': 0.02,       # 2% of account per trade
    'max_positions': 5,           # Maximum concurrent positions
    'stop_loss_type': 'atr',      # 'fixed', 'percent', or 'atr'
    'stop_loss_value': 2,         # 2 ATR units for stop loss
    'take_profit_type': 'risk',   # 'fixed', 'percent', or 'risk'
    'take_profit_value': 2        # 2:1 reward-to-risk ratio
}
```

## Next Steps

- **Strategy Customization**: See Chapter 4 for detailed strategy implementation
- **Risk Management**: Configure advanced risk settings (Chapter 6)
- **Dashboard Customization**: Modify UI components (Chapter 7)
- **Deployment**: Set up production environment (Chapter 8)

## Troubleshooting

### Common Issues

- **Authentication Errors**: Double-check API keys in `.env` file
- **Module Not Found**: Ensure all dependencies are installed (`pip install -r requirements.txt`)
- **Connection Error**: Verify internet connection and API endpoint status

For more detailed troubleshooting, see the "Troubleshooting and FAQ" section. 