// Global variables
let priceChart = null;
let isTrading = false;
let activeSymbols = new Set();

// Initialize the dashboard
$(document).ready(function() {
    // Load available symbols
    loadSymbols();
    
    // Load initial account info
    updateAccountInfo();
    
    // Set up event handlers
    setupEventHandlers();
    
    // Initialize price chart
    initializeChart();
    
    // Start periodic updates
    setInterval(updateDashboard, 60000); // Update every minute
});

function loadSymbols() {
    $.get('/api/symbols', function(symbols) {
        const select = $('#symbolSelect');
        select.empty();
        select.append('<option value="">Select Symbol</option>');
        
        symbols.forEach(symbol => {
            select.append(`<option value="${symbol}">${symbol}</option>`);
        });
    });
}

function updateAccountInfo() {
    $.get('/api/account', function(data) {
        $('#portfolioValue').text(`$${parseFloat(data.portfolio_value).toFixed(2)}`);
        $('#buyingPower').text(`$${parseFloat(data.buying_power).toFixed(2)}`);
        $('#dayTradeCount').text(data.daytrade_count);
    });
}

function setupEventHandlers() {
    // Strategy form submission
    $('#strategyForm').on('submit', function(e) {
        e.preventDefault();
        addStrategy();
    });
    
    // Trading control buttons
    $('#startTradingBtn').click(startTrading);
    $('#stopTradingBtn').click(stopTrading);
    
    // Symbol selection change
    $('#symbolSelect').change(function() {
        const symbol = $(this).val();
        if (symbol) {
            updateSymbolChart(symbol);
        }
    });

    // Strategy parameter visibility toggle
    $('#strategySelect').on('change', function() {
        const selectedStrategy = $(this).val();
        if (selectedStrategy === 'supertrend') {
            $('#supertrendParams').show();
            $('#macdParams').hide();
        } else if (selectedStrategy === 'macd') {
            $('#supertrendParams').hide();
            $('#macdParams').show();
        }
    });
}

function addStrategy() {
    const data = {
        action: 'add',
        symbol: $('#symbolSelect').val(),
        strategy_type: $('#strategySelect').val(),
        atr_period: parseInt($('#atrPeriodInput').val()),
        multiplier: parseFloat($('#multiplierInput').val())
    };
    
    $.ajax({
        url: '/api/strategy',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.status === 'success') {
                activeSymbols.add(data.symbol);
                updateStrategyTable();
                showAlert('Strategy added successfully', 'success');
            } else {
                showAlert('Failed to add strategy', 'danger');
            }
        },
        error: function() {
            showAlert('Error adding strategy', 'danger');
        }
    });
}

function removeStrategy(symbol, strategyType) {
    $.ajax({
        url: '/api/strategy',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            action: 'remove',
            symbol: symbol,
            strategy_type: strategyType
        }),
        success: function(response) {
            if (response.status === 'success') {
                activeSymbols.delete(symbol);
                updateStrategyTable();
                showAlert('Strategy removed successfully', 'success');
            }
        }
    });
}

function startTrading() {
    $.ajax({
        url: '/api/trading',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ action: 'start' }),
        success: function(response) {
            if (response.status === 'success') {
                isTrading = true;
                $('#startTradingBtn').hide();
                $('#stopTradingBtn').show();
                showAlert('Trading started', 'success');
            }
        }
    });
}

function stopTrading() {
    $.ajax({
        url: '/api/trading',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ action: 'stop' }),
        success: function(response) {
            if (response.status === 'success') {
                isTrading = false;
                $('#stopTradingBtn').hide();
                $('#startTradingBtn').show();
                showAlert('Trading stopped', 'success');
            }
        }
    });
}

function updateStrategyTable() {
    const tbody = $('#strategiesTable');
    tbody.empty();
    
    activeSymbols.forEach(symbol => {
        $.get(`/api/strategies/${symbol}`, function(strategies) {
            strategies.forEach(strategy => {
                const row = `
                    <tr>
                        <td>${strategy.symbol}</td>
                        <td>${strategy.strategy_type}</td>
                        <td class="signal-${strategy.current_signal.toLowerCase()}">${strategy.current_signal}</td>
                        <td>${strategy.current_position}</td>
                        <td>$${parseFloat(strategy.current_price).toFixed(2)}</td>
                        <td>$${parseFloat(strategy.supertrend_value).toFixed(2)}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="removeStrategy('${strategy.symbol}', '${strategy.strategy_type}')">
                                Remove
                            </button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        });
    });
}

function initializeChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#3498db',
                borderWidth: 2,
                fill: false
            }, {
                label: 'Supertrend',
                data: [],
                borderColor: '#e74c3c',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Price'
                    }
                }
            }
        }
    });
}

function updateSymbolChart(symbol) {
    // Get historical data and update chart
    $.get(`/api/strategies/${symbol}`, function(data) {
        if (data.length > 0) {
            const strategy = data[0];
            const prices = strategy.historical_prices || [];
            const supertrend = strategy.historical_supertrend || [];
            
            priceChart.data.labels = prices.map((_, i) => i);
            priceChart.data.datasets[0].data = prices;
            priceChart.data.datasets[1].data = supertrend;
            priceChart.update();
        }
    });
}

function updateDashboard() {
    if (isTrading) {
        updateAccountInfo();
        updateStrategyTable();
        
        const currentSymbol = $('#symbolSelect').val();
        if (currentSymbol) {
            updateSymbolChart(currentSymbol);
        }
    }
}

function showAlert(message, type) {
    const alert = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    $('.container-fluid').prepend(alert);
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

function getStrategyParams() {
    const strategy = $('#strategySelect').val();
    const params = {
        symbol: $('#symbolSelect').val(),
        strategy_type: strategy,
        capital: parseFloat($('#capitalInput').val())
    };

    if (strategy === 'supertrend') {
        params.risk_per_trade = parseFloat($('#riskInput').val());
        params.atr_period = parseInt($('#atrPeriodInput').val());
        params.multiplier = parseFloat($('#multiplierInput').val());
    } else if (strategy === 'macd') {
        params.ema_period = parseInt($('#emaPeriodInput').val());
        params.macd_fast = parseInt($('#macdFastInput').val());
        params.macd_slow = parseInt($('#macdSlowInput').val());
        params.macd_signal = parseInt($('#macdSignalInput').val());
        params.rsi_period = parseInt($('#rsiPeriodInput').val());
        params.rsi_overbought = parseInt($('#rsiOverboughtInput').val());
        params.rsi_oversold = parseInt($('#rsiOversoldInput').val());
    }

    return params;
}

function updateStrategyRow(strategy) {
    let indicatorsHtml = '';
    if (strategy.strategy_type === 'supertrend') {
        indicatorsHtml = `Supertrend: ${strategy.supertrend_value.toFixed(2)}`;
    } else if (strategy.strategy_type === 'macd') {
        indicatorsHtml = `
            EMA: ${strategy.ema_value.toFixed(2)}<br>
            MACD: ${strategy.macd_value.toFixed(2)}<br>
            Signal: ${strategy.signal_line.toFixed(2)}<br>
            RSI: ${strategy.rsi_value.toFixed(2)}
        `;
    }

    const row = $(`#strategy-${strategy.id}`);
    if (row.length) {
        row.find('.current-signal').text(strategy.current_signal);
        row.find('.position').text(strategy.position || 'None');
        row.find('.current-price').text(`$${strategy.current_price.toFixed(2)}`);
        row.find('.indicators').html(indicatorsHtml);
    } else {
        $('#strategiesTable').append(`
            <tr id="strategy-${strategy.id}">
                <td>${strategy.symbol}</td>
                <td>${strategy.strategy_type}</td>
                <td class="current-signal">${strategy.current_signal}</td>
                <td class="position">${strategy.position || 'None'}</td>
                <td class="current-price">$${strategy.current_price.toFixed(2)}</td>
                <td class="indicators">${indicatorsHtml}</td>
                <td>
                    <button class="btn btn-sm btn-danger remove-strategy" data-id="${strategy.id}">Remove</button>
                </td>
            </tr>
        `);
    }
} 