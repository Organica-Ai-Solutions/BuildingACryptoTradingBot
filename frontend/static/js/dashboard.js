// Global variables and state
let portfolioChart = null;
let detailChart = null;
let activeStrategies = [];
let currentSymbolData = null;
let isTrading = false;
let portfolioData = {
    labels: [],
    values: []
};

// API configuration
const API_CONFIG = {
    baseUrl: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
};

// API request wrapper with error handling
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...API_CONFIG.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        showNotification('Error', error.message, 'error');
        throw error;
    }
}

// Initialize the dashboard when the document loads
$(document).ready(async function() {
    try {
        // Initialize charts
        initPortfolioChart();
        
        // Load initial data
        await Promise.all([
            loadSymbols(),
            updateAccountInfo(),
            fetchActiveStrategies(),
            fetchOpenPositions(),
            fetchRecentTrades(),
            fetchMarketData()
        ]);
        
        // Set up event handlers
        setupEventHandlers();
        
        // Check trading status
        await checkTradingStatus();
        
        // Set up periodic updates
        setInterval(updateDashboard, 30000); // Update every 30 seconds
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showNotification('Error', 'Failed to initialize dashboard', 'error');
    }
});

// Initialize portfolio performance chart
function initPortfolioChart() {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    
    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value',
                data: [],
                borderColor: '#3556FB',
                backgroundColor: 'rgba(53, 86, 251, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 10,
                pointBackgroundColor: '#3556FB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    boxPadding: 5,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            return `$${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(229, 231, 235, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(229, 231, 235, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        },
                        font: {
                            size: 10
                        }
                    },
                    beginAtZero: false
                }
            }
        }
    });
    
    // Load initial data
    updatePortfolioChart('1d');
}

// Set up event handlers
function setupEventHandlers() {
    // Trading control buttons
    $('#startTradingBtn').click(startTrading);
    $('#stopTradingBtn').click(stopTrading);
    
    // Chart timeframe selector
    $('.timeframe-btn').click(function() {
        $('.timeframe-btn').removeClass('active');
        $(this).addClass('active');
        updatePortfolioChart($(this).data('timeframe'));
    });
    
    // Strategy form handling
    $('#strategySelect').change(function() {
        const strategy = $(this).val();
        $('.strategy-params').hide();
        $(`#${strategy}Params`).show();
    });
    
    // Add strategy button
    $('#addStrategyBtn').click(function() {
        addStrategy();
    });
    
    // Symbol detail modal
    $(document).on('click', '.view-symbol-btn', function() {
        const symbol = $(this).data('symbol');
        showSymbolDetails(symbol);
    });
    
    // Add symbol strategy from details modal
    $('#addSymbolStrategy').click(function() {
        const symbol = $('#symbolName').text();
        $('#symbolSelect').val(symbol);
        $('#addStrategyModal').modal('show');
        $('#symbolDetailModal').modal('hide');
    });
}

// Fetch available trading symbols
async function loadSymbols() {
    try {
        const data = await apiRequest('/symbols');
        const select = $('#symbolSelect');
        select.empty();
        select.append('<option value="">Select Symbol</option>');
        
        data.forEach(symbol => {
            select.append(`<option value="${symbol}">${symbol}</option>`);
        });
    } catch (error) {
        console.error('Failed to load symbols:', error);
    }
}

// Update account information
async function updateAccountInfo() {
    try {
        const data = await apiRequest('/account');
        $('#portfolioValue').text(`$${parseFloat(data.portfolio_value).toFixed(2)}`);
        $('#buyingPower').text(`$${parseFloat(data.buying_power).toFixed(2)}`);
        
        const portfolioChange = data.portfolio_change || 0;
        const changeElement = $('#portfolioChange');
        if (portfolioChange >= 0) {
            changeElement.text(`+${portfolioChange.toFixed(2)}% today`);
            changeElement.removeClass('negative').addClass('positive');
        } else {
            changeElement.text(`${portfolioChange.toFixed(2)}% today`);
            changeElement.removeClass('positive').addClass('negative');
        }
        
        // Calculate allocation percentage
        const allocation = 100 - ((data.buying_power / data.portfolio_value) * 100);
        $('#buyingPowerPercent').text(`${allocation.toFixed(0)}% allocated`);
        
        // Performance metrics
        if (data.performance) {
            $('#performanceValue').text(`${data.performance.percent.toFixed(2)}%`);
            $('#winRate').text(`Win rate: ${data.performance.win_rate.toFixed(0)}%`);
        }
    } catch (error) {
        console.error('Failed to update account info:', error);
    }
}

// Fetch and display active strategies
async function fetchActiveStrategies() {
    try {
        const data = await apiRequest('/strategies');
        activeStrategies = data;
        updateStrategiesSummary();
    } catch (error) {
        console.error('Failed to fetch active strategies:', error);
    }
}

// Update strategies summary display
function updateStrategiesSummary() {
    const container = $('#strategiesSummary');
    container.empty();
    
    if (activeStrategies.length === 0) {
        container.html(`
            <div class="text-center py-4">
                <i class="bi bi-info-circle text-muted mb-2" style="font-size: 2rem;"></i>
                <p class="text-muted mb-0">No active strategies</p>
            </div>
        `);
        return;
    }
    
    activeStrategies.forEach(strategy => {
        const strategyIcon = strategy.type === 'supertrend' 
            ? '<i class="bi bi-graph-up"></i>' 
            : '<i class="bi bi-bar-chart"></i>';
            
        const signalClass = 
            strategy.current_signal === 'BUY' ? 'buy' : 
            strategy.current_signal === 'SELL' ? 'sell' : 'neutral';
            
        const item = `
            <div class="strategy-item">
                <div class="strategy-header">
                    <div class="strategy-name">
                        <div class="strategy-icon">${strategyIcon}</div>
                        ${strategy.symbol} (${strategy.type})
                    </div>
                    <div class="strategy-signal ${signalClass}">
                        ${strategy.current_signal}
                    </div>
                </div>
                <div class="strategy-info">
                    <div class="strategy-metric">
                        Position: <span>${strategy.position_size || 'None'}</span>
                    </div>
                    <div class="strategy-metric">
                        P&L: <span>${strategy.pnl ? (strategy.pnl >= 0 ? '+' : '') + strategy.pnl.toFixed(2) + '%' : '0.00%'}</span>
                    </div>
                </div>
                <div class="strategy-actions">
                    <button class="btn btn-sm btn-outline-primary view-strategy-btn" data-id="${strategy.id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-danger remove-strategy-btn" data-id="${strategy.id}">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
        
        container.append(item);
    });
    
    // Update positions count
    const positionsCount = activeStrategies.filter(s => s.position_size).length;
    $('#positionsCount').text(positionsCount);
}

// Fetch and display open positions
async function fetchOpenPositions() {
    try {
        const data = await apiRequest('/positions');
        updatePositionsTable(data);
    } catch (error) {
        console.error('Failed to fetch open positions:', error);
    }
}

// Update positions table
function updatePositionsTable(positions) {
    const table = $('#positionsTable');
    table.empty();
    
    if (positions.length === 0) {
        table.html(`
            <tr>
                <td colspan="6" class="text-center py-3">
                    <span class="text-muted">No open positions</span>
                </td>
            </tr>
        `);
        
        // Update positions value
        $('#positionsValue').text('$0.00');
        return;
    }
    
    let totalValue = 0;
    
    positions.forEach(position => {
        const pnl = position.unrealized_pl;
        const pnlPercent = position.unrealized_plpc * 100;
        const pnlClass = pnl >= 0 ? 'text-success' : 'text-danger';
        
        const row = `
            <tr>
                <td>${position.symbol}</td>
                <td>${parseFloat(position.qty).toFixed(6)}</td>
                <td>$${parseFloat(position.avg_entry_price).toFixed(2)}</td>
                <td>$${parseFloat(position.current_price).toFixed(2)}</td>
                <td class="${pnlClass}">
                    ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-symbol-btn" data-symbol="${position.symbol}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger close-position-btn" data-symbol="${position.symbol}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </td>
            </tr>
        `;
        
        table.append(row);
        
        // Calculate total position value
        totalValue += parseFloat(position.market_value);
    });
    
    // Update positions value
    $('#positionsValue').text(`$${totalValue.toFixed(2)}`);
}

// Fetch and display recent trades
async function fetchRecentTrades() {
    try {
        const data = await apiRequest('/trades');
        updateTradesTable(data);
    } catch (error) {
        console.error('Failed to fetch recent trades:', error);
    }
}

// Update trades table
function updateTradesTable(trades) {
    const table = $('#tradesTable');
    table.empty();
    
    if (trades.length === 0) {
        table.html(`
            <tr>
                <td colspan="6" class="text-center py-3">
                    <span class="text-muted">No recent trades</span>
                </td>
            </tr>
        `);
        return;
    }
    
    trades.slice(0, 5).forEach(trade => {
        const row = `
            <tr>
                <td>${trade.symbol}</td>
                <td class="${trade.side === 'buy' ? 'text-success' : 'text-danger'}">${trade.side.toUpperCase()}</td>
                <td>${parseFloat(trade.qty).toFixed(6)}</td>
                <td>$${parseFloat(trade.price).toFixed(2)}</td>
                <td>${trade.strategy || '-'}</td>
                <td>${formatTimestamp(trade.transaction_time)}</td>
            </tr>
        `;
        
        table.append(row);
    });
}

// Fetch and display market data
async function fetchMarketData() {
    try {
        const data = await apiRequest('/market');
        updateMarketTable(data);
    } catch (error) {
        console.error('Failed to fetch market data:', error);
    }
}

// Update market data table
function updateMarketTable(marketData) {
    const table = $('#marketTable');
    table.empty();
    
    if (marketData.length === 0) {
        table.html(`
            <tr>
                <td colspan="7" class="text-center py-3">
                    <span class="text-muted">No market data available</span>
                </td>
            </tr>
        `);
        return;
    }
    
    marketData.forEach(asset => {
        const changeClass = asset.change >= 0 ? 'text-success' : 'text-danger';
        const signalClass = 
            asset.signal === 'BUY' ? 'badge bg-success' : 
            asset.signal === 'SELL' ? 'badge bg-danger' : 'badge bg-secondary';
            
        const row = `
            <tr>
                <td>${asset.symbol}</td>
                <td>$${parseFloat(asset.price).toFixed(2)}</td>
                <td class="${changeClass}">
                    ${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%
                </td>
                <td>$${formatLargeNumber(asset.volume)}</td>
                <td>$${formatLargeNumber(asset.market_cap || 0)}</td>
                <td><span class="${signalClass}">${asset.signal || 'NEUTRAL'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-symbol-btn" data-symbol="${asset.symbol}">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
        
        table.append(row);
    });
}

// Update portfolio chart with selected timeframe
function updatePortfolioChart(timeframe) {
    apiRequest(`/portfolio/history?timeframe=${timeframe}`, {
        method: 'GET'
    }).then(data => {
        if (!data || !data.timestamps || !data.values || data.timestamps.length === 0) {
            showNotification('Warning', 'No portfolio history data available', 'warning');
            return;
        }
        
        portfolioData.labels = data.timestamps;
        portfolioData.values = data.values;
        
        portfolioChart.data.labels = data.timestamps;
        portfolioChart.data.datasets[0].data = data.values;
        portfolioChart.update();
    }).catch(handleApiError);
}

// Show symbol details in modal
function showSymbolDetails(symbol) {
    apiRequest(`/symbols/${symbol}`, {
        method: 'GET'
    }).then(data => {
        currentSymbolData = data;
        
        // Update modal content
        $('#symbolName').text(data.symbol);
        $('#symbolPrice').text(`$${parseFloat(data.price).toFixed(2)}`);
        
        const priceChange = $('#priceChange');
        if (data.change >= 0) {
            priceChange.text(`+${data.change.toFixed(2)}%`);
            priceChange.removeClass('negative').addClass('positive');
        } else {
            priceChange.text(`${data.change.toFixed(2)}%`);
            priceChange.removeClass('positive').addClass('negative');
        }
        
        $('#highPrice').text(`$${parseFloat(data.high || 0).toFixed(2)}`);
        $('#lowPrice').text(`$${parseFloat(data.low || 0).toFixed(2)}`);
        $('#volume').text(`$${formatLargeNumber(data.volume || 0)}`);
        
        // Indicator values
        updateIndicatorValues(data.indicators);
        
        // Trading signals
        updateSignalsList(data.signals);
        
        // Initialize or update chart
        initDetailChart(data);
        
        // Show modal
        $('#symbolDetailModal').modal('show');
    }).catch(handleApiError);
}

// Initialize symbol detail chart
function initDetailChart(data) {
    const ctx = document.getElementById('detailChart').getContext('2d');
    
    if (detailChart) {
        detailChart.destroy();
    }
    
    detailChart = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: data.symbol,
                data: data.candles.map(candle => ({
                    x: new Date(candle.timestamp),
                    o: candle.open,
                    h: candle.high,
                    l: candle.low,
                    c: candle.close
                })),
                color: {
                    up: '#22c55e',
                    down: '#ef4444',
                    unchanged: '#64748b'
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour'
                    }
                },
                y: {
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Update indicator values
function updateIndicatorValues(indicators) {
    if (!indicators) return;
    
    // Supertrend
    const supertrendValue = $('#supertrendValue');
    if (indicators.supertrend) {
        const supertrend = indicators.supertrend;
        if (supertrend.signal === 'BUY') {
            supertrendValue.text('Bullish');
            supertrendValue.removeClass('negative neutral').addClass('positive');
        } else if (supertrend.signal === 'SELL') {
            supertrendValue.text('Bearish');
            supertrendValue.removeClass('positive neutral').addClass('negative');
        } else {
            supertrendValue.text('Neutral');
            supertrendValue.removeClass('positive negative').addClass('neutral');
        }
    }
    
    // MACD
    const macdValue = $('#macdValue');
    if (indicators.macd) {
        const macd = indicators.macd;
        if (macd.signal === 'BUY') {
            macdValue.text('Bullish');
            macdValue.removeClass('negative neutral').addClass('positive');
        } else if (macd.signal === 'SELL') {
            macdValue.text('Bearish');
            macdValue.removeClass('positive neutral').addClass('negative');
        } else {
            macdValue.text('Neutral');
            macdValue.removeClass('positive negative').addClass('neutral');
        }
    }
    
    // RSI
    if (indicators.rsi) {
        $('#rsiValue').text(indicators.rsi.value.toFixed(2));
    }
}

// Update signals list
function updateSignalsList(signals) {
    const container = $('#signalsList');
    container.empty();
    
    if (!signals || signals.length === 0) {
        container.html(`<div class="text-muted text-center py-2">No signals available</div>`);
        return;
    }
    
    signals.forEach(signal => {
        const signalClass = 
            signal.action === 'BUY' ? 'buy' : 
            signal.action === 'SELL' ? 'sell' : 'neutral';
            
        const item = `
            <div class="signal-item">
                <div class="signal-name">${signal.name}</div>
                <div class="signal-value ${signalClass}">${signal.action}</div>
            </div>
        `;
        
        container.append(item);
    });
}

// Add new trading strategy
function addStrategy() {
    const symbol = $('#symbolSelect').val();
    const strategyType = $('#strategySelect').val();
    const capital = parseFloat($('#capitalInput').val());
    const riskPerTrade = parseFloat($('#riskInput').val());
    
    if (!symbol || !strategyType) {
        showNotification('Error', 'Please select a symbol and strategy type', 'danger');
        return;
    }
    
    let params = {
        symbol: symbol,
        type: strategyType,
        capital: capital,
        risk_per_trade: riskPerTrade
    };
    
    // Add strategy-specific parameters
    if (strategyType === 'supertrend') {
        params.atr_period = parseInt($('#atrPeriodInput').val());
        params.multiplier = parseFloat($('#multiplierInput').val());
        params.timeframe = $('#timeframeSelect').val();
    } else if (strategyType === 'macd') {
        params.ema_period = parseInt($('#emaPeriodInput').val());
        params.macd_fast = parseInt($('#macdFastInput').val());
        params.macd_slow = parseInt($('#macdSlowInput').val());
        params.macd_signal = parseInt($('#macdSignalInput').val());
        params.rsi_period = parseInt($('#rsiPeriodInput').val());
        params.timeframe = $('#macdTimeframeSelect').val();
    } else if (strategyType === 'custom') {
        try {
            const customParams = JSON.parse($('#customParameters').val());
            params = { ...params, ...customParams };
        } catch (e) {
            showNotification('Error', 'Invalid JSON format for custom parameters', 'danger');
            return;
        }
    }
    
    // Backtest if requested
    if ($('#backtest').is(':checked')) {
        // Show loading state
        showNotification('Info', 'Running backtest...', 'info');
        
        apiRequest('/backtest', {
            method: 'POST',
            body: JSON.stringify(params)
        }).then(data => {
            if (data.success) {
                showNotification('Success', `Backtest complete. PnL: ${data.pnl.toFixed(2)}%, Win rate: ${data.win_rate.toFixed(2)}%`, 'success');
                
                // Now add the strategy
                addStrategyToSystem(params);
            } else {
                showNotification('Error', data.message || 'Backtest failed', 'danger');
            }
        }).catch(handleApiError);
    } else {
        // Add strategy directly
        addStrategyToSystem(params);
    }
}

// Add strategy to the system
function addStrategyToSystem(params) {
    apiRequest('/strategies', {
        method: 'POST',
        body: JSON.stringify(params)
    }).then(data => {
        if (data.success) {
            showNotification('Success', 'Strategy added successfully', 'success');
            
            // Close modal
            $('#addStrategyModal').modal('hide');
            
            // Update strategies
            fetchActiveStrategies();
        } else {
            showNotification('Error', data.message || 'Failed to add strategy', 'danger');
        }
    }).catch(handleApiError);
}

// Start trading
function startTrading() {
    apiRequest('/trading/start', {
        method: 'POST'
    }).then(data => {
        if (data.success) {
            isTrading = true;
            updateTradingStatusUI(true);
            showNotification('Success', 'Trading started successfully', 'success');
        } else {
            showNotification('Error', data.message || 'Failed to start trading', 'danger');
        }
    }).catch(handleApiError);
}

// Stop trading
function stopTrading() {
    apiRequest('/trading/stop', {
        method: 'POST'
    }).then(data => {
        if (data.success) {
            isTrading = false;
            updateTradingStatusUI(false);
            showNotification('Success', 'Trading stopped successfully', 'success');
        } else {
            showNotification('Error', data.message || 'Failed to stop trading', 'danger');
        }
    }).catch(handleApiError);
}

// Check trading status
async function checkTradingStatus() {
    try {
        const data = await apiRequest('/trading/status');
        isTrading = data.is_trading;
        updateTradingStatusUI(isTrading);
    } catch (error) {
        console.error('Failed to check trading status:', error);
        showNotification('Error', 'Failed to check trading status', 'error');
    }
}

// Update trading status UI
function updateTradingStatusUI(isActive) {
    if (isActive) {
        $('#startTradingBtn').hide();
        $('#stopTradingBtn').show();
        $('#statusIndicator').removeClass('offline').addClass('online');
        $('#tradingStatus').text('Online');
    } else {
        $('#stopTradingBtn').hide();
        $('#startTradingBtn').show();
        $('#statusIndicator').removeClass('online').addClass('offline');
        $('#tradingStatus').text('Offline');
    }
}

// Update dashboard data
function updateDashboard() {
    updateAccountInfo();
    fetchActiveStrategies();
    fetchOpenPositions();
    fetchRecentTrades();
    
    // Only update portfolio chart if we're viewing real-time data
    const currentTimeframe = $('.timeframe-btn.active').data('timeframe');
    if (currentTimeframe === '1d') {
        updatePortfolioChart('1d');
    }
}

// Enhanced error notification
function showNotification(title, message, type = 'info') {
    const toast = $(`
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${type}-toast">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `);
    
    $('.toast-container').append(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.on('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Format large numbers
function formatLargeNumber(num) {
    if (!num) return '0';
    
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    
    return num.toFixed(2);
}

// Handle API errors
function handleApiError(error) {
    console.error('API Error:', error);
    showNotification('Error', error.message, 'error');
} 