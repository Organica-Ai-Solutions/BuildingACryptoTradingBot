# Quick Start Guide

This guide will help you get the crypto trading bot up and running quickly.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Git
- An Alpaca account (sign up at https://app.alpaca.markets/)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crypto_trader.git
   cd crypto_trader
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:
   ```
   # Get these from https://app.alpaca.markets/
   ALPACA_API_KEY="your_api_key"
   ALPACA_API_SECRET="your_api_secret"
   ALPACA_PAPER_API_KEY="your_paper_api_key"
   ALPACA_PAPER_API_SECRET="your_paper_api_secret"
   ALPACA_API_URL="https://paper-api.alpaca.markets"
   ALPACA_IS_PAPER=true

   # Flask settings
   FLASK_APP=backend.app
   FLASK_ENV=development
   FLASK_DEBUG=true
   FLASK_PORT=5002

   # Database settings
   DATABASE_URL=sqlite:///crypto_trader.db
   ```

## Running the Application

1. Start the application:
   ```bash
   PYTHONPATH=/path/to/crypto_trader python backend/app.py
   ```

2. Access the web interface:
   - Open your browser and navigate to `http://localhost:5002`
   - The following pages are available:
     - Dashboard: `http://localhost:5002/dashboard`
     - Settings: `http://localhost:5002/settings`
     - Strategies: `http://localhost:5002/strategies`
     - History: `http://localhost:5002/history`

## Initial Setup

1. Configure API Keys:
   - Go to the Settings page
   - Enter your Alpaca API keys
   - Choose between paper trading and live trading
   - Test your API credentials

2. Configure Trading Parameters:
   - Set maximum position size
   - Set risk per trade
   - Configure stop loss and take profit percentages
   - Set maximum number of open trades
   - Configure trailing stop percentage

3. Optional: Set up Email Notifications
   - Enable email notifications
   - Enter your email address
   - Choose which notifications to receive (trades, signals, errors)

## Troubleshooting

If you encounter any issues:

1. Check the logs:
   - Application logs are in the console
   - Database logs are in SQLite database file

2. Common Issues:
   - Import errors: Make sure PYTHONPATH is set correctly
   - WebSocket errors: Verify eventlet and Flask-SocketIO versions
   - Database errors: Ensure the database is initialized
   - API errors: Verify your API credentials and trading mode

3. For more detailed troubleshooting:
   - Refer to the Troubleshooting Guide in the documentation
   - Check the application logs for specific error messages
   - Verify all environment variables are set correctly

## Next Steps

After getting the basic setup working:

1. Explore different trading strategies
2. Monitor the dashboard for performance
3. Adjust trading parameters as needed
4. Set up automated notifications
5. Review trading history and performance metrics

For more detailed information, refer to the full documentation in the `book` directory. 
