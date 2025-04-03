from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import GetOrdersRequest
from alpaca.trading.enums import OrderSide, OrderStatus, TimeInForce

def get_account_info(trading_client: TradingClient) -> Dict:
    """Get account information including portfolio value and buying power"""
    try:
        account = trading_client.get_account()
        return {
            'portfolio_value': float(account.portfolio_value),
            'cash': float(account.cash),
            'buying_power': float(account.buying_power),
            'equity': float(account.equity),
            'last_equity': float(account.last_equity),
            'initial_margin': float(account.initial_margin),
            'maintenance_margin': float(account.maintenance_margin),
            'daytrade_count': account.daytrade_count
        }
    except Exception as e:
        print(f"Error getting account info: {e}")
        return {}

def get_positions(trading_client: TradingClient) -> List[Dict]:
    """Get all open positions"""
    try:
        positions = trading_client.get_all_positions()
        return [
            {
                'symbol': pos.symbol,
                'qty': float(pos.qty),
                'avg_entry_price': float(pos.avg_entry_price),
                'market_value': float(pos.market_value),
                'unrealized_pl': float(pos.unrealized_pl),
                'unrealized_plpc': float(pos.unrealized_plpc),
                'current_price': float(pos.current_price),
                'lastday_price': float(pos.lastday_price),
                'change_today': float(pos.change_today)
            }
            for pos in positions
        ]
    except Exception as e:
        print(f"Error getting positions: {e}")
        return []

def get_position_value(trading_client: TradingClient, symbol: str) -> float:
    """Get the current value of a position"""
    try:
        position = trading_client.get_position(symbol)
        return float(position.market_value)
    except Exception:
        return 0.0

def get_trades(trading_client: TradingClient, 
               start: Optional[datetime] = None,
               limit: int = 100) -> List[Dict]:
    """Get recent trades"""
    try:
        if start is None:
            start = datetime.now() - timedelta(days=30)
            
        request = GetOrdersRequest(
            status=OrderStatus.FILLED,
            limit=limit,
            after=start
        )
        
        orders = trading_client.get_orders(filter=request)
        return [
            {
                'symbol': order.symbol,
                'side': order.side.value,
                'qty': float(order.filled_qty),
                'price': float(order.filled_avg_price),
                'value': float(order.filled_qty) * float(order.filled_avg_price),
                'time': order.filled_at.isoformat() if order.filled_at else None,
                'type': order.type.value,
                'id': order.id
            }
            for order in orders
            if order.filled_at is not None
        ]
    except Exception as e:
        print(f"Error getting trades: {e}")
        return []

def calculate_portfolio_metrics(trading_client: TradingClient) -> Dict:
    """Calculate portfolio performance metrics"""
    try:
        # Get account info
        account = trading_client.get_account()
        current_value = float(account.portfolio_value)
        initial_value = float(account.last_equity)
        
        # Get recent trades
        trades = get_trades(trading_client)
        if not trades:
            return {
                'total_pl': 0.0,
                'total_pl_pct': 0.0,
                'win_rate': 0.0,
                'avg_win': 0.0,
                'avg_loss': 0.0,
                'largest_win': 0.0,
                'largest_loss': 0.0,
                'total_trades': 0
            }
            
        # Calculate trade metrics
        profits = [t['value'] for t in trades if t['side'] == OrderSide.SELL.value]
        losses = [t['value'] for t in trades if t['side'] == OrderSide.BUY.value]
        
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t['side'] == OrderSide.SELL.value])
        
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        avg_win = sum(profits) / len(profits) if profits else 0
        avg_loss = sum(losses) / len(losses) if losses else 0
        largest_win = max(profits) if profits else 0
        largest_loss = min(losses) if losses else 0
        
        # Calculate total P&L
        total_pl = current_value - initial_value
        total_pl_pct = (total_pl / initial_value * 100) if initial_value > 0 else 0
        
        return {
            'total_pl': total_pl,
            'total_pl_pct': total_pl_pct,
            'win_rate': win_rate,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'largest_win': largest_win,
            'largest_loss': largest_loss,
            'total_trades': total_trades
        }
        
    except Exception as e:
        print(f"Error calculating portfolio metrics: {e}")
        return {}

def calculate_position_size(account_value: float, risk_per_trade: float, 
                          entry_price: float, stop_loss: float) -> float:
    """Calculate position size based on risk parameters"""
    try:
        # Convert risk percentage to decimal
        risk_pct = risk_per_trade / 100
        
        # Calculate risk amount in dollars
        risk_amount = account_value * risk_pct
        
        # Calculate risk per share
        risk_per_share = abs(entry_price - stop_loss)
        
        # Calculate position size
        if risk_per_share > 0:
            position_size = risk_amount / risk_per_share
        else:
            position_size = 0
            
        return position_size
        
    except Exception as e:
        print(f"Error calculating position size: {e}")
        return 0.0

def get_portfolio_history(trading_client: TradingClient,
                         timeframe: str = '1D',
                         start: Optional[datetime] = None,
                         end: Optional[datetime] = None) -> pd.DataFrame:
    """Get portfolio value history"""
    try:
        if start is None:
            start = datetime.now() - timedelta(days=30)
        if end is None:
            end = datetime.now()
            
        history = trading_client.get_portfolio_history(
            timeframe=timeframe,
            start=start,
            end=end
        )
        
        if not history or not history.timestamp:
            return pd.DataFrame()
            
        df = pd.DataFrame({
            'timestamp': pd.to_datetime(history.timestamp, unit='s'),
            'equity': history.equity,
            'profit_loss': history.profit_loss,
            'profit_loss_pct': history.profit_loss_pct
        })
        
        df.set_index('timestamp', inplace=True)
        return df
        
    except Exception as e:
        print(f"Error getting portfolio history: {e}")
        return pd.DataFrame() 