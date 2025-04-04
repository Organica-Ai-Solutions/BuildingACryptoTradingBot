// Global variables
let performanceChart = null;
let performanceSeries = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chart
    initializePerformanceChart();
    
    // Load initial trade data
    loadTradeHistory('all');
    
    // Add event listeners for filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            loadTradeHistory(filter);
            
            // Update active button state
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Add event listeners for time filter buttons
    document.querySelectorAll('.time-filter').forEach(button => {
        button.addEventListener('click', function() {
            const days = parseInt(this.dataset.days, 10);
            filterPerformanceByDays(days);
            
            // Update active button state
            document.querySelectorAll('.time-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
});

// Load trade history data
async function loadTradeHistory(filter) {
    try {
        showLoading();
        
        // Show loading state for chart
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.classList.add('loading');
        }
        
        let response;
        try {
            response = await fetch(`/api/trades?filter=${filter}`);
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            const data = await response.json();
            
            // Update trades table
            updateTradesTable(data.trades);
            
            // Update statistics
            updateStatistics(data.statistics);
            
            // Update performance chart
            updatePerformanceChart(data.performance);
        } catch (error) {
            console.warn('Error loading trade history, using mock data:', error.message);
            
            // Use mock data if API fails
            const mockData = generateMockTradeData(filter);
            
            // Update with mock data
            updateTradesTable(mockData.trades);
            updateStatistics(mockData.statistics);
            updatePerformanceChart(mockData.performance);
        }
        
    } finally {
        hideLoading();
        
        // Hide loading state for chart
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.classList.remove('loading');
        }
    }
}

// Initialize performance chart
function initializePerformanceChart() {
    try {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) {
            console.error('Performance chart canvas not found');
            return;
        }
        
        // Create a new SmoothieChart
        performanceChart = new SmoothieChart({
            millisPerPixel: 60000, // 1 minute per pixel
            grid: {
                fillStyle: 'rgba(0,0,0,0.1)',
                strokeStyle: 'rgba(255,255,255,0.1)',
                millisPerLine: 24 * 60 * 60 * 1000, // 1 day
                verticalSections: 5
            },
            labels: {
                fillStyle: 'rgba(255,255,255,0.4)',
                precision: 2,
                fontSize: 12
            },
            timestampFormatter: function(date) {
                return moment(date).format('MM/DD');
            },
            maxValue: undefined, // Will be set dynamically
            minValue: undefined, // Will be set dynamically
            responsive: true,
            limitFPS: 30
        });
        
        // Create time series for performance data
        performanceSeries = new TimeSeries();
        
        // Add time series to chart with styling
        performanceChart.addTimeSeries(performanceSeries, {
            strokeStyle: 'rgb(0, 255, 127)',
            fillStyle: 'rgba(0, 255, 127, 0.2)',
            lineWidth: 2
        });
        
        // Start streaming
        performanceChart.streamTo(canvas, 1000);
        console.log('Performance chart initialized');
        
    } catch (error) {
        console.error('Failed to initialize performance chart:', error);
    }
}

// Update performance chart with new data
function updatePerformanceChart(performance) {
    if (!performanceSeries || !performance || !Array.isArray(performance)) {
        console.error('Invalid performance data or series not initialized');
        return;
    }
    
    try {
        // Clear existing data
        performanceSeries.clear();
        
        // Determine min/max values to set chart scale
        let minValue = 0;
        let maxValue = 0;
        
        // Add each performance data point
        performance.forEach(point => {
            const timestamp = new Date(point.timestamp).getTime();
            const value = parseFloat(point.cumulative_pnl);
            
            // Update min/max
            if (value < minValue) minValue = value;
            if (value > maxValue) maxValue = value;
            
            // Add to series
            performanceSeries.append(timestamp, value);
        });
        
        // Set chart scale with padding
        const range = Math.max(Math.abs(maxValue), Math.abs(minValue)) * 0.1;
        performanceChart.options.maxValue = maxValue + range;
        performanceChart.options.minValue = minValue - range;
        
        console.log(`Updated performance chart with ${performance.length} data points`);
    } catch (error) {
        console.error('Error updating performance chart:', error);
    }
}

// Filter performance data by number of days
function filterPerformanceByDays(days) {
    if (!performanceChart) return;
    
    try {
        // Set new timestamp range
        const now = new Date().getTime();
        const past = now - (days * 24 * 60 * 60 * 1000);
        
        // Update chart timespan
        performanceChart.options.millisPerPixel = (days * 24 * 60 * 60 * 1000) / 800; // Adjust for chart width
        performanceChart.options.timeSpan = days * 24 * 60 * 60 * 1000;
        
        console.log(`Filtered performance chart to ${days} days`);
    } catch (error) {
        console.error('Error filtering performance chart:', error);
    }
}

// Update trades table
function updateTradesTable(trades) {
    const tbody = document.querySelector('#tradesTable tbody');
    tbody.innerHTML = '';
    
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" class="text-center">No trades found</td>';
        tbody.appendChild(row);
        return;
    }
    
    trades.forEach(trade => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(trade.timestamp).toLocaleString()}</td>
            <td>${trade.symbol}</td>
            <td><span class="badge ${trade.side === 'buy' ? 'bg-success' : 'bg-danger'}">${trade.side.toUpperCase()}</span></td>
            <td>${trade.quantity}</td>
            <td>${formatCurrency(trade.price)}</td>
            <td>${formatCurrency(trade.quantity * trade.price)}</td>
            <td class="${trade.pnl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(trade.pnl)}</td>
            <td>${trade.strategy || 'Manual'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update statistics cards
function updateStatistics(statistics) {
    if (!statistics) return;
    
    document.getElementById('totalTrades').textContent = statistics.total_trades || 0;
    document.getElementById('winRate').textContent = `${((statistics.win_rate || 0) * 100).toFixed(1)}%`;
    document.getElementById('totalPnL').textContent = formatCurrency(statistics.total_pnl || 0);
    document.getElementById('avgTrade').textContent = formatCurrency(statistics.avg_trade || 0);
}

// Generate mock trade data
function generateMockTradeData(filter = 'all') {
    console.log('Generating mock trade data');
    
    // Mock trade types based on filter
    const tradeTypes = filter === 'all' ? ['buy', 'sell'] :
                     filter === 'buy' ? ['buy'] : 
                     filter === 'sell' ? ['sell'] : ['buy', 'sell'];
    
    // Generate mock trades (last 30 days)
    const trades = [];
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD'];
    const strategies = ['Supertrend', 'MACD', 'RSI', 'Manual'];
    
    const now = new Date();
    for (let i = 0; i < 25; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        const side = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const price = symbol.includes('BTC') ? 45000 + (Math.random() * 5000 - 2500) :
                    symbol.includes('ETH') ? 2000 + (Math.random() * 300 - 150) :
                    symbol.includes('SOL') ? 150 + (Math.random() * 20 - 10) : 
                    0.15 + (Math.random() * 0.05 - 0.025);
        
        const quantity = Math.random() * 0.5 + 0.1;
        const pnl = (Math.random() * 200 - 100) * (side === 'buy' ? 1 : -1);
        
        trades.push({
            timestamp: date.toISOString(),
            symbol: symbol,
            side: side,
            quantity: quantity.toFixed(4),
            price: price,
            pnl: pnl,
            strategy: strategies[Math.floor(Math.random() * strategies.length)]
        });
    }
    
    // Sort by date, newest first
    trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Generate performance data
    const performance = [];
    let cumulativePnl = 0;
    
    // Generate daily performance for last 90 days
    for (let i = 90; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Add small random change to cumulative PnL
        cumulativePnl += (Math.random() * 50 - 20);
        
        performance.push({
            timestamp: date.toISOString(),
            pnl: Math.random() * 50 - 20,
            cumulative_pnl: cumulativePnl
        });
    }
    
    // Generate statistics
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    const statistics = {
        total_trades: trades.length,
        win_rate: trades.length ? winningTrades / trades.length : 0,
        total_pnl: totalPnl,
        avg_trade: trades.length ? totalPnl / trades.length : 0
    };
    
    return { trades, performance, statistics };
}

// Show loading spinner
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.remove('d-none');
}

// Hide loading spinner
function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('d-none');
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0);
} 