# Building A Crypto Trading Bot

<p align="center">
  <img src="book/images/portada.png" alt="Building A Crypto Trading Bot Book Cover" width="600"/>
</p>

This repository contains the complete source code for building a cryptocurrency trading bot using Python, Flask, and Alpaca API. The bot supports multiple trading strategies, real-time market data analysis, and automated trade execution.

## Features

- Multiple trading strategies (Supertrend, MACD)
- Real-time market data processing
- Automated trade execution
- Risk management
- Performance tracking
- Web-based dashboard
- Email notifications
- Paper trading mode for testing

## Prerequisites

- Python 3.8+
- pip (Python package installer)
- Git
- Alpaca trading account (paper or live)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Organica-Ai-Solutions/BuildingACryptoTradingBot.git
cd BuildingACryptoTradingBot
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory and add your Alpaca API credentials:
```
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
ALPACA_API_URL=https://paper-api.alpaca.markets  # For paper trading
```

## Project Structure

```
crypto_trader/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── api_routes.py          # API endpoints
│   ├── trading_engine.py      # Trading engine implementation
│   ├── strategies/            # Trading strategies
│   │   ├── base_strategy.py
│   │   ├── supertrend_strategy.py
│   │   └── macd_strategy.py
│   └── utils/                 # Utility functions
│       ├── market_data.py
│       ├── indicators.py
│       ├── portfolio.py
│       └── notifications.py
├── frontend/
│   ├── templates/            # HTML templates
│   │   ├── dashboard.html
│   │   ├── strategies.html
│   │   ├── settings.html
│   │   └── history.html
│   └── static/              # Static assets
│       ├── css/
│       └── js/
├── tests/                   # Unit tests
├── requirements.txt         # Python dependencies
├── .env                    # Environment variables
└── README.md              # Project documentation
```

## Running the Application

1. Start the Flask application:
```bash
python -m backend.app
```

2. Open your web browser and navigate to:
```
http://localhost:5001
```

## Trading Strategies

### Supertrend Strategy
The Supertrend strategy uses a trend-following indicator that combines ATR (Average True Range) with basic price action to identify potential entry and exit points.

### MACD Strategy
The MACD (Moving Average Convergence Divergence) strategy uses momentum and trend following to generate trading signals based on moving average crossovers.

## Configuration

All trading parameters can be configured through the web interface:

1. Trading Settings:
   - Paper/Live trading mode
   - Maximum concurrent trades
   - Default strategy capital
   - Risk per trade
   - Take profit/Stop loss levels

2. API Settings:
   - Alpaca API credentials
   - API endpoint URL

3. Notification Settings:
   - Email notifications
   - Trade execution alerts
   - Error notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This trading bot is for educational purposes only. Use it at your own risk. The authors and contributors are not responsible for any financial losses incurred while using this software.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers directly.

## Acknowledgments

- Alpaca Markets for their excellent trading API
- The Python community for the amazing libraries
- All contributors and users of this project 