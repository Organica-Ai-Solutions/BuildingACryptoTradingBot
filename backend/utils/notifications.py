import logging
from typing import Dict, Optional
from datetime import datetime
import json
import os
from pathlib import Path

# Configure logging
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)

# Set up file handler for trading logs
trading_log = logging.getLogger('trading')
trading_log.setLevel(logging.INFO)
trading_handler = logging.FileHandler(log_dir / 'trading.log')
trading_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
)
trading_log.addHandler(trading_handler)

# Set up file handler for error logs
error_log = logging.getLogger('error')
error_log.setLevel(logging.ERROR)
error_handler = logging.FileHandler(log_dir / 'error.log')
error_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
)
error_log.addHandler(error_handler)

def log_trade(symbol: str, side: str, quantity: float, price: float, 
              strategy: str, pl: Optional[float] = None) -> None:
    """Log trade execution details"""
    trade_info = {
        'timestamp': datetime.now().isoformat(),
        'symbol': symbol,
        'side': side,
        'quantity': quantity,
        'price': price,
        'strategy': strategy,
        'pl': pl
    }
    
    trading_log.info(f"Trade executed: {json.dumps(trade_info)}")
    
    # Save trade to trade history file
    try:
        trade_history_file = log_dir / 'trade_history.json'
        if trade_history_file.exists():
            with open(trade_history_file, 'r') as f:
                trade_history = json.load(f)
        else:
            trade_history = []
            
        trade_history.append(trade_info)
        
        with open(trade_history_file, 'w') as f:
            json.dump(trade_history, f, indent=2)
            
    except Exception as e:
        error_log.error(f"Error saving trade history: {e}")

def log_error(error_type: str, error_message: str, 
              additional_info: Optional[Dict] = None) -> None:
    """Log error details"""
    error_info = {
        'timestamp': datetime.now().isoformat(),
        'type': error_type,
        'message': error_message,
        'additional_info': additional_info or {}
    }
    
    error_log.error(f"Error occurred: {json.dumps(error_info)}")

def log_strategy_update(strategy_name: str, symbol: str, 
                       action: str, params: Optional[Dict] = None) -> None:
    """Log strategy updates"""
    update_info = {
        'timestamp': datetime.now().isoformat(),
        'strategy': strategy_name,
        'symbol': symbol,
        'action': action,
        'params': params or {}
    }
    
    trading_log.info(f"Strategy update: {json.dumps(update_info)}")

def log_portfolio_snapshot(portfolio_value: float, cash: float, 
                         positions: Dict, metrics: Optional[Dict] = None) -> None:
    """Log portfolio snapshot"""
    snapshot = {
        'timestamp': datetime.now().isoformat(),
        'portfolio_value': portfolio_value,
        'cash': cash,
        'positions': positions,
        'metrics': metrics or {}
    }
    
    # Save snapshot to portfolio history file
    try:
        portfolio_history_file = log_dir / 'portfolio_history.json'
        if portfolio_history_file.exists():
            with open(portfolio_history_file, 'r') as f:
                portfolio_history = json.load(f)
        else:
            portfolio_history = []
            
        portfolio_history.append(snapshot)
        
        # Keep only last 1000 snapshots to manage file size
        if len(portfolio_history) > 1000:
            portfolio_history = portfolio_history[-1000:]
            
        with open(portfolio_history_file, 'w') as f:
            json.dump(portfolio_history, f, indent=2)
            
    except Exception as e:
        error_log.error(f"Error saving portfolio history: {e}")
    
    trading_log.info(f"Portfolio snapshot: {json.dumps(snapshot)}")

def get_trade_history(limit: Optional[int] = None) -> list:
    """Get trade history from log file"""
    try:
        trade_history_file = log_dir / 'trade_history.json'
        if not trade_history_file.exists():
            return []
            
        with open(trade_history_file, 'r') as f:
            trade_history = json.load(f)
            
        if limit:
            return trade_history[-limit:]
        return trade_history
        
    except Exception as e:
        error_log.error(f"Error reading trade history: {e}")
        return []

def get_portfolio_history(limit: Optional[int] = None) -> list:
    """Get portfolio history from log file"""
    try:
        portfolio_history_file = log_dir / 'portfolio_history.json'
        if not portfolio_history_file.exists():
            return []
            
        with open(portfolio_history_file, 'r') as f:
            portfolio_history = json.load(f)
            
        if limit:
            return portfolio_history[-limit:]
        return portfolio_history
        
    except Exception as e:
        error_log.error(f"Error reading portfolio history: {e}")
        return []

def cleanup_logs(max_age_days: int = 30) -> None:
    """Clean up old log files"""
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        
        # Clean up trading.log and error.log if they're too old
        for log_file in ['trading.log', 'error.log']:
            file_path = log_dir / log_file
            if file_path.exists():
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff_date:
                    # Archive old log
                    archive_name = f"{log_file}.{file_time.strftime('%Y%m%d')}"
                    os.rename(file_path, log_dir / archive_name)
                    
        # Clean up trade and portfolio history
        for history_file in ['trade_history.json', 'portfolio_history.json']:
            file_path = log_dir / history_file
            if file_path.exists():
                with open(file_path, 'r') as f:
                    history = json.load(f)
                
                # Filter out old entries
                filtered_history = [
                    entry for entry in history
                    if datetime.fromisoformat(entry['timestamp']) > cutoff_date
                ]
                
                with open(file_path, 'w') as f:
                    json.dump(filtered_history, f, indent=2)
                    
    except Exception as e:
        error_log.error(f"Error cleaning up logs: {e}")

# Initialize logging system
def init_logging():
    """Initialize logging system"""
    try:
        # Create logs directory if it doesn't exist
        log_dir.mkdir(exist_ok=True)
        
        # Clean up old logs on startup
        cleanup_logs()
        
        # Log initialization
        trading_log.info("Logging system initialized")
        
    except Exception as e:
        print(f"Error initializing logging system: {e}")

# Initialize logging when module is imported
init_logging() 