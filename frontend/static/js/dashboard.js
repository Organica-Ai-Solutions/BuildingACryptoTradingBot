// Global variables and state
let portfolioChart = null;
let detailChart = null;
let activeStrategies = [];
let currentSymbolData = null;
let isTrading = false;
let lastUpdate = null;
let updateInterval = null;
let dataCache = {
    portfolio: { data: null, timestamp: null },
    symbols: { data: null, timestamp: null },
    positions: { data: null, timestamp: null },
    trades: { data: null, timestamp: null },
    strategies: { data: null, timestamp: null },
    account: null,
    lastUpdate: null
};

// Configure Chart.js with Luxon adapter
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined' && typeof luxon !== 'undefined') {
        console.log('[CHART DEBUG] Configuring global Chart.js settings with Luxon');
        // Set global defaults for time scales
        Chart.defaults.scales.time = {
            adapters: {
                date: luxon.DateTime
            }
        };
        
        // Set global date adapter
        Chart.defaults.adapters = {
            date: luxon.DateTime
        };
    }
});

// Cache duration in milliseconds
const CACHE_DURATION = 5000; // 5 seconds
const UPDATE_INTERVAL = 30000; // 30 seconds
const CHART_UPDATE_INTERVAL = 60000; // 1 minute

// Symbol categories and their contents
const symbolCategories = {
    popular: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD'],
    stablecoins: ['USDT/USD', 'USDC/USD', 'DAI/USD', 'BUSD/USD'],
    defi: ['UNI/USD', 'AAVE/USD', 'MKR/USD', 'SNX/USD', 'COMP/USD'],
    layer1: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'ADA/USD', 'DOT/USD']
};

let allSymbols = [];
let symbolData = {};
let symbolsData = {};
let lastPrices = {};

// API configuration
const API_BASE_URL = 'http://0.0.0.0:5002/api';
const HISTORICAL_API_URL = 'http://0.0.0.0:5004/api'; // Use the standalone API for historical data

// Global error handling
window.addEventListener('error', function(event) {
    // Catch and suppress any padEnd errors
    if (event.error && event.error.message && event.error.message.includes('padEnd')) {
        event.preventDefault();
        console.log('Suppressed padEnd error');
        return;
    }
});

// Format price for display
function formatPrice(price) {
    if (!price) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price);
}

// Format percentage for display
function formatPercentage(percentage) {
    if (!percentage) return '0.00%';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced error notification
function showNotification(title, message, type = 'info') {
    // Prevent empty notifications
    if (!message || message.trim() === '') {
        console.log(`Prevented empty ${type} notification with title: ${title}`);
        return;
    }
    
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

// Show warning in a modal for more critical issues
function showWarningModal(message) {
    if (!message || message.trim() === '') {
        console.log('Prevented empty warning modal');
        return;
    }
    
    // Insert the message into the modal
    $('#warningModalBody').text(message);
    
    // Show the modal
    const warningModal = new bootstrap.Modal(document.getElementById('warningModal'));
    warningModal.show();
}

// Update symbol select dropdown based on category
function updateSymbolSelect(category) {
    try {
        // Reference the select element
        const symbolSelect = document.getElementById('symbolSelect');
        if (!symbolSelect) return;
        
        // Clear current options
        symbolSelect.innerHTML = '';
        
        // Create default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Symbol';
        symbolSelect.appendChild(defaultOption);
        
        // Safety check
        if (!Array.isArray(allSymbols) || allSymbols.length === 0) {
            return;
        }
        
        // Get filtered symbols based on category
        let filteredSymbols = [];
        if (category === 'all') {
            filteredSymbols = [...allSymbols];
        } else if (category === 'gainers') {
            filteredSymbols = [...allSymbols].filter(s => {
                const symbol = typeof s === 'string' ? s : (s && s.symbol ? s.symbol : '');
                return symbolsData[symbol] && symbolsData[symbol].change_24h > 0;
            }).sort((a, b) => {
                const symbolA = typeof a === 'string' ? a : (a && a.symbol ? a.symbol : '');
                const symbolB = typeof b === 'string' ? b : (b && b.symbol ? b.symbol : '');
                return (symbolsData[symbolB]?.change_24h || 0) - (symbolsData[symbolA]?.change_24h || 0);
            }).slice(0, 20);
        } else if (category === 'losers') {
            filteredSymbols = [...allSymbols].filter(s => {
                const symbol = typeof s === 'string' ? s : (s && s.symbol ? s.symbol : '');
                return symbolsData[symbol] && symbolsData[symbol].change_24h < 0;
            }).sort((a, b) => {
                const symbolA = typeof a === 'string' ? a : (a && a.symbol ? a.symbol : '');
                const symbolB = typeof b === 'string' ? b : (b && b.symbol ? b.symbol : '');
                return (symbolsData[symbolA]?.change_24h || 0) - (symbolsData[symbolB]?.change_24h || 0);
            }).slice(0, 20);
        } else if (category === 'volume') {
            filteredSymbols = [...allSymbols].filter(s => {
                const symbol = typeof s === 'string' ? s : (s && s.symbol ? s.symbol : '');
                return symbolsData[symbol] && symbolsData[symbol].volume_24h > 0;
            }).sort((a, b) => {
                const symbolA = typeof a === 'string' ? a : (a && a.symbol ? a.symbol : '');
                const symbolB = typeof b === 'string' ? b : (b && b.symbol ? b.symbol : '');
                return (symbolsData[symbolB]?.volume_24h || 0) - (symbolsData[symbolA]?.volume_24h || 0);
            }).slice(0, 20);
        }
        
        // Add symbols to select
        filteredSymbols.forEach(symbol => {
            if (!symbol) return; // Skip null/undefined values
            
            const symbolStr = typeof symbol === 'string' ? symbol : (symbol.symbol || '');
            if (!symbolStr) return; // Skip empty strings
            
            // Add option using DOM methods (avoid string templating)
            const option = document.createElement('option');
            option.value = symbolStr;
            
            // Format symbol data safely
            let priceStr = '0.00';
            let changeStr = '0.00%';
            
            if (symbolsData[symbolStr]) {
                // Format price
                const price = symbolsData[symbolStr].price || 0;
                priceStr = formatPrice(price);
                
                // Format change
                const change = symbolsData[symbolStr].change_24h || 0;
                changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
            }
            
            // Set option text safely
            option.textContent = symbolStr;
            
            // Add data attributes
            option.setAttribute('data-price', priceStr);
            option.setAttribute('data-change', changeStr);
            
            symbolSelect.appendChild(option);
        });
        
        // Initialize or refresh Select2
        if ($(symbolSelect).data('select2')) {
            $(symbolSelect).select2('destroy');
        }
        
        $(symbolSelect).select2({
            templateResult: formatSymbolOption,
            templateSelection: formatSymbolOption
        });
    } catch (error) {
        console.log("Error in updateSymbolSelect (suppressed)");
    }
}

// Set up symbol search functionality
function setupSymbolSearch() {
    try {
        const searchInput = document.getElementById('symbolSearch');
        const symbolSelect = document.getElementById('symbolSelect');
        
        if (!searchInput || !symbolSelect) return;
        
        searchInput.addEventListener('input', function() {
            try {
                const searchText = (this.value || '').toLowerCase().trim();
                
                // Clear and reset select dropdown
                symbolSelect.innerHTML = '';
                
                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select Symbol';
                symbolSelect.appendChild(defaultOption);
                
                // Skip if no symbols are available
                if (!Array.isArray(allSymbols) || allSymbols.length === 0) {
                    return;
                }
                
                // Filter symbols based on search text
                const filteredSymbols = allSymbols.filter(symbol => {
                    if (!symbol) return false; // Skip null/undefined
                    
                    const symbolStr = typeof symbol === 'string' ? symbol : (symbol.symbol || '');
                    return symbolStr.toLowerCase().includes(searchText);
                });
                
                // Add filtered symbols to select
        filteredSymbols.forEach(symbol => {
                    if (!symbol) return; // Skip null/undefined values
                    
                    const symbolStr = typeof symbol === 'string' ? symbol : (symbol.symbol || '');
                    if (!symbolStr) return; // Skip empty strings
                    
                    // Add option using DOM methods (avoid string templating)
                    const option = document.createElement('option');
                    option.value = symbolStr;
                    
                    // Format symbol data safely
                    let priceStr = '0.00';
                    let changeStr = '0.00%';
                    
                    if (symbolsData[symbolStr]) {
                        // Format price
                        const price = symbolsData[symbolStr].price || 0;
                        priceStr = formatPrice(price);
                        
                        // Format change
                        const change = symbolsData[symbolStr].change_24h || 0;
                        changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
                    }
                    
                    // Set option text safely
                    option.textContent = symbolStr;
                    
                    // Add data attributes
                    option.setAttribute('data-price', priceStr);
                    option.setAttribute('data-change', changeStr);
                    
                    symbolSelect.appendChild(option);
                });
                
                // Trigger select2 update
                $(symbolSelect).trigger('change');
            } catch (error) {
                console.log("Error in symbol search (suppressed)");
            }
        });
    } catch (error) {
        console.log("Error setting up symbol search (suppressed)");
    }
}

// Setup symbol preset buttons
function setupSymbolPresets() {
    // Category selection
    $('.symbol-category').click(function(e) {
        e.preventDefault();
        const category = $(this).data('category');
        $('.symbol-category').removeClass('active');
        $(this).addClass('active');
        updateSymbolSelect(category);
    });
    
    // Popular symbols
    $('.symbol-preset').click(function(e) {
        e.preventDefault();
        const symbol = $(this).data('symbol');
        $('#symbolSelect').val(symbol).trigger('change');
    });
}

// Check trading API keys status
async function checkApiKeyStatus() {
    try {
        let response;
        try {
            response = await fetch('/api/settings/trading-status');
        } catch (error) {
            console.log('API key status check network error (suppressed)');
            return false;
        }
        
        if (!response.ok) {
            console.log(`API key status check returned ${response.status} (suppressed)`);
            return false;
        }
        
        try {
        const data = await response.json();
        const alertContainer = document.getElementById('apiKeyAlert');
        
            // Handle API keys status
            if (data.has_credentials === false) {
            if (alertContainer) {
                alertContainer.style.display = 'block';
            }
                return false;
        } else {
            if (alertContainer) {
                alertContainer.style.display = 'none';
            }
                return true;
        }
    } catch (error) {
            console.log('API key status parse error (suppressed)');
            return false;
        }
    } catch (error) {
        console.log('API key status check failed (suppressed)');
        return false;
    }
}

// Fetch available trading symbols
async function loadSymbols() {
    try {
        // Clear cache to avoid errors from previous responses
        allSymbols = [];
        symbolsData = {};
        
        const response = await fetch('/api/symbols');
        if (!response.ok) {
            // Silently handle non-OK responses
            console.log(`Symbols API returned status ${response.status}`);
            return false;
        }
        
        // Safely parse the response
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // Silently handle JSON parse errors
            console.log("Symbol data is not valid JSON");
            return false;
        }
        
        // Ensure data is an array with valid objects
        if (!Array.isArray(data)) {
            // Return false instead of throwing
            console.log("API did not return an array");
            return false;
        }
        
        // Process each symbol, filtering out invalid ones
        for (let i = 0; i < data.length; i++) {
            try {
                const item = data[i];
                
                // Skip null/undefined items
                if (!item) continue;
                
                // We only want items with valid symbol properties
                if (typeof item === 'object' && item.symbol) {
                    allSymbols.push({
            symbol: item.symbol,
                        price: Number(item.price) || 0,
                        change_24h: Number(item.change_24h) || 0,
                        volume_24h: Number(item.volume_24h) || 0,
                        market_cap: Number(item.market_cap) || 0
                    });
                    
                    symbolsData[item.symbol] = {
                        price: Number(item.price) || 0,
                        change_24h: Number(item.change_24h) || 0,
                        volume_24h: Number(item.volume_24h) || 0
                    };
                }
                // Handle string format (though API should now always send objects)
                else if (typeof item === 'string' && item.trim()) {
                    allSymbols.push({
                        symbol: item,
                        price: 0,
                        change_24h: 0,
                        volume_24h: 0,
                        market_cap: 0
                    });
                    
                    symbolsData[item] = {
                        price: 0,
                        change_24h: 0,
                        volume_24h: 0
                    };
                }
            } catch (error) {
                // Silently continue processing other symbols
                continue;
            }
        }
        
        // Set up last prices (for animations)
        Object.keys(symbolsData).forEach(symbol => {
            lastPrices[symbol] = symbolsData[symbol].price || 0;
        });
        
        // Initialize UI as long as we have at least one valid symbol
        if (allSymbols.length > 0) {
            try {
        updateSymbolSelect('all');
        setupSymbolSearch();
        setupSymbolPresets();
            } catch (uiError) {
                // Silently handle UI initialization errors
                console.log("Error initializing symbol UI");
            }
        }
        
        return true;
    } catch (error) {
        // Silently handle all errors to prevent console messages
        console.log("Error in loadSymbols (suppressed)");
        return false;
    }
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
    
    // Setup timeframe selector for Smoothie chart
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
    timeframeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Get selected timeframe
            const timeframe = this.getAttribute('data-timeframe');
            
            // Use appropriate chart update method based on available charts
            if (window.portfolioSmoothie) {
                // If using Smoothie Charts, update the data
                updateSmoothieChartTimeframe(timeframe);
            } else if (typeof updatePortfolioChart === 'function') {
                // Otherwise use Chart.js update function
                updatePortfolioChart(timeframe);
            }
        });
    });
}

// Initialize portfolio performance chart with Smoothie Charts
function initPortfolioChartWithSmoothie() {
    try {
        console.log('[CHART DEBUG] Starting Smoothie chart initialization');
        
        // Find the chart container
        const chartContainer = document.getElementById('portfolioChartContainer');
        if (!chartContainer) {
            console.log('[CHART DEBUG] Portfolio chart container not found in DOM');
        return;
    }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create a canvas for Smoothie Charts
        const canvasElement = document.createElement('canvas');
            canvasElement.id = 'portfolioChart';
        canvasElement.width = chartContainer.clientWidth;
        canvasElement.height = 400;
            chartContainer.appendChild(canvasElement);
        
        console.log('[CHART DEBUG] Canvas element ready for Smoothie Charts');
        
        // Handle resize events for responsive canvas
        const resizeCanvas = () => {
            canvasElement.width = chartContainer.clientWidth;
            if (window.portfolioSmoothie) {
                window.portfolioSmoothie.resize();
            }
        };
        
        // Add resize listener
        window.addEventListener('resize', debounce(resizeCanvas, 250));
        
        // Create the Smoothie Chart with styling
        window.portfolioSmoothie = new SmoothieChart({
            millisPerPixel: 50,
                    grid: {
                strokeStyle: 'rgba(119, 119, 119, 0.1)',
                fillStyle: 'transparent',
                lineWidth: 1,
                millisPerLine: 1000,
                verticalSections: 5
            },
            labels: { 
                fillStyle: '#999999',
                fontSize: 12,
                precision: 0
            },
            maxValue: undefined,
            minValue: undefined,
            timestampFormatter: SmoothieChart.timeFormatter
        });
        
        // Create time series for portfolio value
        window.portfolioValueSeries = new TimeSeries();
        
        // Add buy signals series (green dots)
        window.buySignalsSeries = new TimeSeries();
        
        // Add sell signals series (red dots)
        window.sellSignalsSeries = new TimeSeries();
        
        // Add the time series to the chart with styling
        window.portfolioSmoothie.addTimeSeries(window.portfolioValueSeries, {
            strokeStyle: '#3556FB',
            fillStyle: 'rgba(53, 86, 251, 0.1)',
            lineWidth: 3
        });
        
        // Add buy signals with distinct styling (green dots)
        window.portfolioSmoothie.addTimeSeries(window.buySignalsSeries, {
            strokeStyle: 'rgba(0, 0, 0, 0)',
            fillStyle: 'rgba(0, 0, 0, 0)',
            lineWidth: 0,
            dots: true,
            dotSize: 6,
            dotFillStyle: '#22c55e',
            dotStrokeStyle: '#22c55e'
        });
        
        // Add sell signals with distinct styling (red dots)
        window.portfolioSmoothie.addTimeSeries(window.sellSignalsSeries, {
            strokeStyle: 'rgba(0, 0, 0, 0)',
            fillStyle: 'rgba(0, 0, 0, 0)',
            lineWidth: 0,
            dots: true,
            dotSize: 6,
            dotFillStyle: '#ef4444',
            dotStrokeStyle: '#ef4444'
        });
        
        // Start streaming to the canvas with a 1-second delay for smoother rendering
        window.portfolioSmoothie.streamTo(canvasElement, 1000);
        
        // Load initial data
        loadInitialPortfolioData();
        
        console.log('[CHART DEBUG] Smoothie Chart initialized successfully');
        return window.portfolioSmoothie;
    } catch (error) {
        console.error('[CHART DEBUG] Failed to initialize Smoothie Chart:', error);
        showNotification('Error', 'Failed to initialize portfolio chart', 'error');
    }
}

// Load initial data for the portfolio chart
function loadInitialPortfolioData() {
    // Fetch portfolio history data or use mock data
    const timeframe = '1m'; // Default timeframe
    const endpoint = `/api/account/history?timeframe=${timeframe}`;
    
    apiRequest(endpoint)
        .then(data => {
            console.log('[CHART DEBUG] Successfully loaded portfolio data:', data.length, 'data points');
            
            // If we have data, use it, otherwise generate mock data
            const chartData = data && data.length > 0 ? data : generateMockPortfolioData(timeframe);
            
            // Add data points to the time series
            if (chartData && chartData.length > 0) {
                // Get the data points
                chartData.forEach(point => {
                    const timestamp = new Date(point.timestamp).getTime();
                    const value = parseFloat(point.value);
                    
                    // Add to the portfolio value series
                    window.portfolioValueSeries.append(timestamp, value);
                    
                    // Add buy/sell signals if present
                    if (point.signal === 'BUY') {
                        window.buySignalsSeries.append(timestamp, value);
                    } else if (point.signal === 'SELL') {
                        window.sellSignalsSeries.append(timestamp, value);
                    }
                });
                
                // Start live data simulation for demo purposes
                startLiveDataSimulation(chartData);
            }
        })
        .catch(error => {
            console.error('[CHART DEBUG] Error loading portfolio data:', error);
            // Generate mock data if API fails
            const mockData = generateMockPortfolioData(timeframe);
            console.log('[CHART DEBUG] Using mock data as fallback with', mockData.length, 'points');
            
            // Add mock data points
            mockData.forEach(point => {
                const timestamp = new Date(point.timestamp).getTime();
                const value = parseFloat(point.value);
                window.portfolioValueSeries.append(timestamp, value);
                
                // Add some random buy/sell signals
                if (point.signal) {
                    if (point.signal === 'BUY') {
                        window.buySignalsSeries.append(timestamp, value);
                    } else if (point.signal === 'SELL') {
                        window.sellSignalsSeries.append(timestamp, value);
                    }
                }
            });
            
            // Start live data simulation for demo purposes
            startLiveDataSimulation(mockData);
        });
}

// Simulate live data updates for demo purposes
function startLiveDataSimulation(initialData) {
    if (!window.portfolioValueSeries) return;
    
    // Get the last data point
    let lastData = initialData[initialData.length - 1];
    let lastTime = new Date(lastData.timestamp).getTime();
    let lastValue = parseFloat(lastData.value);
    
    // Update data every second
    window.liveDataInterval = setInterval(() => {
        // Generate a new time point (now)
        const now = Date.now();
        
        // Generate a new value with some random movement
        // This simulates price movement with some volatility
        const change = (Math.random() - 0.5) * lastValue * 0.01; // 1% random change
        const newValue = lastValue + change;
        
        // Add to the chart
        window.portfolioValueSeries.append(now, newValue);
        
        // Add occasional buy/sell signals for demonstration
        if (Math.random() > 0.9) {
            if (newValue > lastValue) {
                window.buySignalsSeries.append(now, newValue);
            } else {
                window.sellSignalsSeries.append(now, newValue);
            }
        }
        
        // Update last value
        lastValue = newValue;
        
        // Update the last update text
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }
                    }, 1000);
    
    // Clean up when leaving the page
    window.addEventListener('beforeunload', () => {
        if (window.liveDataInterval) {
            clearInterval(window.liveDataInterval);
        }
    });
}

// Generate mock portfolio data for testing
function generateMockPortfolioData(timeframe = '1m') {
    console.log('[CHART DEBUG] Generating mock portfolio data for timeframe:', timeframe);
    
    const now = new Date();
    const data = [];
    
    // Determine time interval and count based on timeframe
    let count, interval;
    switch(timeframe) {
        case '1d':
            count = 24;
            interval = 60 * 60 * 1000; // 1 hour
            break;
        case '1w':
            count = 7;
            interval = 24 * 60 * 60 * 1000; // 1 day
            break;
        case '1m':
        default:
            count = 30;
            interval = 24 * 60 * 60 * 1000; // 1 day
            break;
        case '3m':
            count = 90;
            interval = 24 * 60 * 60 * 1000; // 1 day
            break;
        case '1y':
            count = 52;
            interval = 7 * 24 * 60 * 60 * 1000; // 1 week
            break;
    }
    
    // Generate starting value between 10000 and 30000
    let value = 10000 + Math.random() * 20000;
    
    // Generate data points with realistic price movements
    for (let i = count - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * interval);
        
        // Add some volatility but with an upward trend
        const percentChange = (Math.random() - 0.4) * 5; // Slight upward bias
        value = value * (1 + percentChange / 100);
        
        data.push({
            timestamp: timestamp.toISOString(),
            value: value.toFixed(2),
            signal: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'BUY' : 'SELL') : null
        });
    }
    
    console.log('[CHART DEBUG] Generated mock portfolio data with', data.length, 'points');
    return data;
}

// Update the initializeDashboard function to use Smoothie Charts
async function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    try {
        // Run chart troubleshooting first
        troubleshootChartSetup();
        
        // Check if we have SmoothieChart available
        if (typeof SmoothieChart !== 'undefined') {
            console.log('[CHART DEBUG] Using SmoothieChart for real-time data');
            initPortfolioChartWithSmoothie();
        } else {
            // Fallback to Chart.js
            console.log('[CHART DEBUG] SmoothieChart not available, falling back to Chart.js');
        initPortfolioChart();
        }
        
        // Try to load strategies, positions, and trades
        console.log('Loading strategies...');
        const strategies = await fetchActiveStrategies();
        if (Array.isArray(strategies)) {
            console.log(`Loaded ${strategies.length} active strategies`);
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('strategiesUpdated', { detail: strategies }));
        } else {
            console.log('[Suppressed] Failed to load strategies');
        }
        
        console.log('Loading positions...');
        const positions = await fetchOpenPositions();
        if (Array.isArray(positions)) {
            console.log(`Loaded ${positions.length} open positions`);
        } else {
            console.log('[Suppressed] Failed to load positions');
        }
        
        console.log('Loading trades...');
        const trades = await fetchRecentTrades();
        if (Array.isArray(trades)) {
            console.log(`Loaded ${trades.length} recent trades`);
        } else {
            console.log('[Suppressed] Failed to load trades');
        }
        
        // Set BTC/USD as default symbol
        setDefaultSymbol('BTC/USD');
        
        // Initialize trailing stop loss feature
        initializeTrailingStopLoss();
        
        // Update dashboard components with latest data
        updateDashboard();
        
        // Set periodic update interval
        if (!window.dashboardUpdateInterval) {
            window.dashboardUpdateInterval = setInterval(updateDashboard, 30000); // Update every 30 seconds
        }
        
        // Hide loading indicator
        showLoadingState(false);
        
        console.log('Dashboard initialization complete');
    } catch (error) {
        console.log('[Suppressed] Dashboard initialization error:', error.message);
        showNotification('Dashboard initialization error: ' + error.message, 'error');
        showLoadingState(false);
    }
}

// Fetch data for a specific symbol
async function fetchSymbolData(symbol) {
    if (!symbol) {
        return null;
    }
    
    try {
        // Try to get cached data first
        const cacheKey = `symbol_data_${symbol}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        const now = new Date().getTime();
        
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                // Only use cache if less than 30 seconds old
                if (data && data._timestamp && (now - data._timestamp < 30000)) {
                    console.log(`Using cached data for ${symbol}`);
                    return data;
                }
            } catch (e) {
                console.log(`[Suppressed] Error parsing cached data for ${symbol}:`, e.message);
            }
        }
        
        // Fetch fresh data
        console.log(`Fetching data for ${symbol}`);
        const response = await apiRequest(`/symbols/${encodeURIComponent(symbol)}`);
        
        if (response) {
            // Add timestamp and cache
            response._timestamp = now;
            sessionStorage.setItem(cacheKey, JSON.stringify(response));
            
            // Also update global state if needed
            if (symbolsData) {
                symbolsData[symbol] = response;
            }
            
            // Update UI elements
            updateSymbolInfoDisplay(symbol, response);
            
            return response;
        } else {
            console.log(`[Suppressed] No data returned for ${symbol}`);
            return null;
        }
    } catch (error) {
        console.log(`[Suppressed] Error fetching data for ${symbol}:`, error.message);
        return null;
    }
}

// Update UI with symbol information
function updateSymbolInfoDisplay(symbol, data) {
    if (!symbol || !data) return;
    
    try {
        // Update price display
        const priceElement = document.getElementById('currentPrice');
        if (priceElement && data.price) {
            priceElement.textContent = formatPrice(data.price);
            
            // Add class based on price change
            if (data.change_24h > 0) {
                priceElement.classList.remove('text-danger');
                priceElement.classList.add('text-success');
            } else if (data.change_24h < 0) {
                priceElement.classList.remove('text-success');
                priceElement.classList.add('text-danger');
            } else {
                priceElement.classList.remove('text-success', 'text-danger');
            }
        }
        
        // Update 24h change
        const changeElement = document.getElementById('price24hChange');
        if (changeElement && data.change_24h !== undefined) {
            const changeText = formatPercentage(data.change_24h);
            changeElement.textContent = changeText;
            
            // Add class based on change
            if (data.change_24h > 0) {
                changeElement.classList.remove('text-danger');
                changeElement.classList.add('text-success');
            } else if (data.change_24h < 0) {
                changeElement.classList.remove('text-success');
                changeElement.classList.add('text-danger');
            } else {
                changeElement.classList.remove('text-success', 'text-danger');
            }
        }
        
        // Update other stats if available
        if (data.volume_24h) {
            const volumeElement = document.getElementById('volume24h');
            if (volumeElement) {
                volumeElement.textContent = formatPrice(data.volume_24h);
            }
        }
        
        if (data.high_24h) {
            const highElement = document.getElementById('high24h');
            if (highElement) {
                highElement.textContent = formatPrice(data.high_24h);
            }
        }
        
        if (data.low_24h) {
            const lowElement = document.getElementById('low24h');
            if (lowElement) {
                lowElement.textContent = formatPrice(data.low_24h);
            }
        }
        
        // Update symbol name display
        const symbolNameElement = document.getElementById('currentSymbol');
        if (symbolNameElement) {
            symbolNameElement.textContent = symbol;
        }
        
        // Store current symbol
        currentSymbolData = data;
    } catch (error) {
        console.log(`[Suppressed] Error updating symbol info display:`, error.message);
    }
}

// Helper function to set default symbol
function setDefaultSymbol(symbolToSet) {
    try {
        const symbolSelect = document.getElementById('symbolSelect');
        if (!symbolSelect) {
            console.log('[Suppressed] Symbol select element not found');
            return false;
        }
        
        // Try to find the BTC/USD option
        let btcOption = null;
        for (let i = 0; i < symbolSelect.options.length; i++) {
            const option = symbolSelect.options[i];
            if (option.value === symbolToSet || option.textContent.includes(symbolToSet)) {
                btcOption = option;
                break;
            }
        }
        
        // If found, select it
        if (btcOption) {
            console.log(`Setting default symbol to ${symbolToSet}`);
            btcOption.selected = true;
            
            // Trigger change event to update any dependent UI
            const event = new Event('change', { bubbles: true });
            symbolSelect.dispatchEvent(event);
            
            // Also try to click the BTC preset button if available
            const btcPresetButton = document.querySelector('button[data-symbol="BTC/USD"]');
            if (btcPresetButton) {
                btcPresetButton.click();
            }
            
            // Fetch latest data for this symbol
            fetchSymbolData(symbolToSet).then(data => {
                console.log(`Loaded data for ${symbolToSet}`);
                // Update symbol detail chart if needed
                if (typeof updateSymbolDetailChart === 'function') {
                    updateSymbolDetailChart(symbolToSet);
                }
            }).catch(error => {
                console.log(`[Suppressed] Failed to load data for ${symbolToSet}:`, error.message);
            });
            
            return true;
        } else {
            console.log(`[Suppressed] ${symbolToSet} option not found in symbol select`);
            return false;
        }
    } catch (error) {
        console.log(`[Suppressed] Error setting default symbol to ${symbolToSet}:`, error.message);
        return false;
    }
}

// Update the symbol detail chart
async function updateSymbolDetailChart(symbol, timeframe = '1d') {
    if (!symbol) return;
    
    try {
        console.log(`Updating chart for ${symbol}, timeframe: ${timeframe}`);
        
        // Show loading indicator
        const chartContainer = document.getElementById('symbolChartContainer');
        if (chartContainer) {
            chartContainer.classList.add('loading');
        }
        
        // Fetch historical data
        const cacheKey = `historical_${symbol}_${timeframe}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        let chartData = null;
        let usingMockData = false;
        
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                // Only use cache if less than 1 minute old
                if (parsed && parsed._timestamp && 
                    (new Date().getTime() - parsed._timestamp < 60000)) {
                    chartData = parsed.data;
                    usingMockData = parsed._isMockData;
                }
            } catch (e) {
                console.log(`[Suppressed] Failed to parse cached chart data for ${symbol}:`, e.message);
            }
        }
        
        if (!chartData) {
            try {
                // Fetch with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`/api/historical/${encodeURIComponent(symbol)}?timeframe=${timeframe}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    chartData = await response.json();
                    
                    // Cache the data
                    if (chartData && Array.isArray(chartData)) {
                        sessionStorage.setItem(cacheKey, JSON.stringify({
                            data: chartData,
                            _timestamp: new Date().getTime()
                        }));
                    }
                } else {
                    // For 401/402, show API key notification
                    if (response.status === 401 || response.status === 402) {
                        createApiKeyNotificationChart(chartContainer);
                        showChartLoading(false);
        return;
    }
    
                    // For 404 or other errors, use mock data
                    console.log(`Historical API returned status ${response.status}, using mock data for ${symbol}`);
                    chartData = generateMockPriceData(symbol, timeframe);
                    usingMockData = true;
                }
            } catch (error) {
                console.log(`[Suppressed] Failed to fetch historical data for ${symbol}:`, error.message);
                // Generate mock price data
                chartData = generateMockPriceData(symbol, timeframe);
                usingMockData = true;
            }
            
            // Cache mock data too
            if (usingMockData) {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: chartData,
                    _timestamp: new Date().getTime(),
                    _isMockData: true
                }));
            }
        }
        
        // Also try to fetch any strategy signals for this symbol
        let strategySignals = [];
        try {
            const signals = await apiRequest(`/strategies/signals?symbol=${encodeURIComponent(symbol)}`);
            if (signals && Array.isArray(signals)) {
                strategySignals = signals;
            }
        } catch (error) {
            console.log(`[Suppressed] Failed to fetch signals for ${symbol}:`, error.message);
            // Create some mock signals for demo purposes
            if (usingMockData && Math.random() > 0.3) {
                strategySignals = generateMockSignalsForSymbol(symbol, timeframe);
            }
        }
        
        // Get the chart canvas
        const chartCanvas = document.getElementById('symbolChart');
        if (!chartCanvas) {
            console.log('[Suppressed] Symbol chart canvas not found');
            showChartLoading(false);
            return;
        }
        
        // If no data, display an empty chart
        if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
            console.log(`[Suppressed] No historical data available for ${symbol}`);
            // Create empty chart
            if (window.detailChart instanceof Chart) {
                window.detailChart.destroy();
            }
            
            window.detailChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            datasets: [{
                        label: symbol,
                data: [],
                borderColor: '#3556FB',
                backgroundColor: 'rgba(53, 86, 251, 0.1)',
                        borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    }
                }
            });
            
            // Show "No data available" message
            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('No price data available for ' + symbol, chartCanvas.width / 2, chartCanvas.height / 2);
            }
            
            if (chartContainer) {
                chartContainer.classList.remove('loading');
            }
            return;
        }
        
        // Performance optimization: Limit data points for better performance
        if (chartData.length > 500) {
            const factor = Math.ceil(chartData.length / 500);
            chartData = chartData.filter((_, i) => i % factor === 0);
        }
        
        // Prepare data for the chart
        const ohlcData = [];
        const volumeData = [];
        const timestamps = [];
        
        // Process data
        chartData.forEach(item => {
            if (item.timestamp && item.open && item.high && item.low && item.close) {
                const date = new Date(item.timestamp);
                timestamps.push(date);
                
                ohlcData.push({
                    x: date,
                    o: parseFloat(item.open),
                    h: parseFloat(item.high),
                    l: parseFloat(item.low),
                    c: parseFloat(item.close)
                });
                
                if (item.volume) {
                    volumeData.push({
                        x: date,
                        y: parseFloat(item.volume)
                    });
                }
            }
        });
        
        // Process strategy signals
        const buySignals = [];
        const sellSignals = [];
        const strategyColors = {
            'Moving Average': 'rgba(59, 130, 246, 0.9)',
            'RSI Strategy': 'rgba(139, 92, 246, 0.9)',
            'MACD Strategy': 'rgba(236, 72, 153, 0.9)',
            'Bollinger Bands': 'rgba(16, 185, 129, 0.9)',
            'Breakout Strategy': 'rgba(245, 158, 11, 0.9)',
            'Unknown': 'rgba(75, 85, 99, 0.9)'
        };
        
        // Extract unique strategies for legend
        const uniqueStrategies = new Set();
        
        strategySignals.forEach(signal => {
            if (signal.timestamp && signal.price) {
                const date = new Date(signal.timestamp);
                const strategyName = signal.strategy_id || 'Unknown';
                
                // Add to unique strategies
                uniqueStrategies.add(strategyName);
                
                // Get strategy color
                const strategyColor = strategyColors[strategyName] || strategyColors['Unknown'];
                
                if (signal.action === 'BUY') {
                    buySignals.push({
                        x: date,
                        y: parseFloat(signal.price),
                        strategy: strategyName,
                        color: strategyColor,
                        description: signal.description || 'Buy signal'
                    });
                } else if (signal.action === 'SELL') {
                    sellSignals.push({
                        x: date,
                        y: parseFloat(signal.price),
                        strategy: strategyName,
                        color: strategyColor,
                        description: signal.description || 'Sell signal'
                    });
                }
            }
        });
        
        // Create buy signal annotations
        const buyAnnotations = {};
        buySignals.forEach((signal, index) => {
            buyAnnotations[`buy-${index}`] = {
                type: 'point',
                xValue: signal.x,
                yValue: signal.y,
                backgroundColor: 'rgba(34, 197, 94, 0.9)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 3,
                radius: 8,
                display: true,
                label: {
                    enabled: true,
                    content: `↑ ${signal.strategy}`,
                    position: 'top',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    color: '#fff',
                    backgroundColor: signal.color || 'rgba(34, 197, 94, 0.9)',
                    padding: {
                        top: 6,
                        bottom: 6,
                        left: 8,
                        right: 8
                    },
                    borderRadius: 4
                }
            };
        });
        
        // Create sell signal annotations
        const sellAnnotations = {};
        sellSignals.forEach((signal, index) => {
            sellAnnotations[`sell-${index}`] = {
                type: 'point',
                xValue: signal.x,
                yValue: signal.y,
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 3,
                radius: 8,
                display: true,
                label: {
                    enabled: true,
                    content: `↓ ${signal.strategy}`,
                    position: 'bottom',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    color: '#fff',
                    backgroundColor: signal.color || 'rgba(239, 68, 68, 0.9)',
                    padding: {
                        top: 6,
                        bottom: 6,
                        left: 8,
                        right: 8
                    },
                    borderRadius: 4
                }
            };
        });
        
        // Destroy existing chart if it exists
        if (window.detailChart instanceof Chart) {
            window.detailChart.destroy();
        }
        
        // Determine price range for better visualization
        const allPrices = ohlcData.flatMap(item => [item.o, item.h, item.l, item.c]);
        const minPrice = Math.min(...allPrices) * 0.995;
        const maxPrice = Math.max(...allPrices) * 1.005;
        
        // Create new chart with candlestick data
        // Check if candlestick chart type is available
        if (typeof Chart === 'undefined' || typeof window.CandlestickController === 'undefined') {
            console.log('[CHART DEBUG] Candlestick chart type is not available, falling back to line chart');
            // Fall back to line chart if candlestick is not available
            window.detailChart = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    datasets: [{
                        label: symbol,
                        data: chartData.map(item => ({
                            x: new Date(item.timestamp),
                            y: parseFloat(item.close)
                        })),
                        borderColor: '#3556FB',
                        backgroundColor: 'rgba(53, 86, 251, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `$${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            adapters: {
                                date: luxon.DateTime
                            },
                            time: {
                                unit: getTimeUnit(timeframe)
                            }
                        },
                        y: {
                            position: 'right',
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // Use candlestick chart if available
        window.detailChart = new Chart(chartCanvas, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: symbol,
                    data: ohlcData,
                    color: {
                        up: '#22c55e',
                        down: '#ef4444',
                        unchanged: '#888'
                        },
                        borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                        duration: 500
                },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                        padding: 10,
                    callbacks: {
                        label: function(context) {
                                const point = context.raw;
                                    if (point && typeof point.o !== 'undefined') {
                                return [
                                    `Open: $${point.o.toFixed(2)}`,
                                    `High: $${point.h.toFixed(2)}`,
                                    `Low: $${point.l.toFixed(2)}`,
                                    `Close: $${point.c.toFixed(2)}`
                                ];
                                    }
                                    return '';
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            ...buyAnnotations,
                            ...sellAnnotations
                        }
                }
            },
            scales: {
                x: {
                    type: 'time',
                            adapters: {
                                date: luxon.DateTime
                            },
                    time: {
                            unit: getTimeUnit(timeframe),
                        displayFormats: {
                                minute: 'HH:mm',
                                hour: 'MM/dd HH:mm',
                                day: 'MM/dd',
                                week: 'MM/dd',
                            month: 'MMM yyyy'
                            }
                    },
                    grid: {
                            display: true,
                            color: 'rgba(229, 231, 235, 0.4)'
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
                        position: 'right',
                        min: minPrice,
                        max: maxPrice,
                    grid: {
                            color: 'rgba(229, 231, 235, 0.4)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                                return '$' + value.toFixed(2);
                        },
                        font: {
                            size: 10
                        }
                        }
                }
            }
        }
    });
        }
        
        // Create enhanced legend for buy/sell signals
        if (buySignals.length > 0 || sellSignals.length > 0) {
            // Remove existing legend if any
            const existingLegend = document.querySelector('.chart-legend');
            if (existingLegend) {
                existingLegend.remove();
            }
            
            // Create container for legends
            const legendContainer = document.createElement('div');
            legendContainer.className = 'chart-legend mt-3 mb-3';
            
            // Add signal type legend
            const signalTypeLegend = document.createElement('div');
            signalTypeLegend.className = 'd-flex justify-content-center mb-2';
            signalTypeLegend.innerHTML = `
                <div class="d-flex align-items-center me-4">
                    <span class="signal-dot buy-signal me-1"></span>
                    <small class="fw-bold">Buy Signals</small>
                </div>
                <div class="d-flex align-items-center">
                    <span class="signal-dot sell-signal me-1"></span>
                    <small class="fw-bold">Sell Signals</small>
                </div>
            `;
            
            // Add strategy legend if we have multiple strategies
            if (uniqueStrategies.size > 0) {
                const strategyLegend = document.createElement('div');
                strategyLegend.className = 'd-flex justify-content-center flex-wrap mt-1';
                
                // Add each strategy
                Array.from(uniqueStrategies).forEach(strategy => {
                    const color = strategyColors[strategy] || strategyColors['Unknown'];
                    
                    const strategyItem = document.createElement('div');
                    strategyItem.className = 'd-inline-flex align-items-center mx-2 mb-1';
                    strategyItem.innerHTML = `
                        <span class="strategy-badge me-1" style="background-color: ${color}"></span>
                        <small>${strategy}</small>
                    `;
                    
                    strategyLegend.appendChild(strategyItem);
                });
                
                legendContainer.appendChild(signalTypeLegend);
                legendContainer.appendChild(strategyLegend);
            } else {
                legendContainer.appendChild(signalTypeLegend);
            }
            
            // Add custom CSS for legend if not already added
            if (!document.getElementById('chart-legend-styles')) {
                const style = document.createElement('style');
                style.id = 'chart-legend-styles';
                style.textContent = `
                    .signal-dot {
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }
                    .strategy-badge {
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 2px;
                    }
                    .buy-signal { background-color: rgba(34, 197, 94, 0.9); }
                    .sell-signal { background-color: rgba(239, 68, 68, 0.9); }
                `;
                document.head.appendChild(style);
            }
            
            // Add legend after chart
            chartContainer.parentNode.insertBefore(legendContainer, chartContainer.nextSibling);
        }
        
        // Hide loading indicator
        if (chartContainer) {
            chartContainer.classList.remove('loading');
        }
        
        // Update chart title
        const chartTitle = document.getElementById('symbolChartTitle');
        if (chartTitle) {
            chartTitle.textContent = `${symbol} Price Chart`;
        }
        
        // Add note if using mock data
        if (usingMockData) {
            const mockDataNote = document.createElement('div');
            mockDataNote.className = 'text-center text-muted mt-2';
            mockDataNote.innerHTML = '<small><i class="fas fa-info-circle"></i> Using demo data. Add API key for live data.</small>';
            
            // Remove any existing note
            const existingNote = chartContainer.parentNode.querySelector('.text-muted:not(.chart-legend)');
            if (existingNote) {
                existingNote.remove();
            }
            
            // Add after chart or legend
            const legend = chartContainer.parentNode.querySelector('.chart-legend');
            if (legend) {
                chartContainer.parentNode.insertBefore(mockDataNote, legend.nextSibling);
            } else {
                chartContainer.parentNode.insertBefore(mockDataNote, chartContainer.nextSibling);
            }
        }
    } catch (error) {
        console.log('[Suppressed] Error updating symbol chart:', error.message);
        // Hide loading indicator
        const chartContainer = document.getElementById('symbolChartContainer');
        if (chartContainer) {
            chartContainer.classList.remove('loading');
        }
    }
}

// Generate mock price data for a symbol
function generateMockPriceData(symbol, timeframe = '1d') {
    const now = new Date();
    const data = [];
    
    // Set base price based on symbol
    let basePrice = 0;
    let volatility = 0.02; // Default 2% volatility
    
    if (symbol.includes('BTC')) {
        basePrice = 40000 + Math.random() * 5000;
        volatility = 0.04;
    } else if (symbol.includes('ETH')) {
        basePrice = 2200 + Math.random() * 300;
        volatility = 0.05;
    } else if (symbol.includes('SOL')) {
        basePrice = 100 + Math.random() * 20;
        volatility = 0.06;
    } else if (symbol.includes('AVAX')) {
        basePrice = 30 + Math.random() * 5;
        volatility = 0.05;
    } else if (symbol.includes('MATIC')) {
        basePrice = 1.5 + Math.random() * 0.3;
        volatility = 0.06;
    } else if (symbol.includes('USD')) {
        basePrice = 1 + (Math.random() * 0.1 - 0.05);
        volatility = 0.005;
    } else {
        basePrice = 50 + Math.random() * 50;
        volatility = 0.04;
    }
    
    let numPoints = 30; // Default for 1d
    let interval = 60 * 60 * 1000; // Hourly by default
    
    // Adjust based on timeframe
    switch (timeframe) {
        case '1h':
            numPoints = 60;
            interval = 60 * 1000; // Minutes
            break;
        case '1d':
            numPoints = 24;
            interval = 60 * 60 * 1000; // Hourly
            break;
        case '1w':
            numPoints = 7;
            interval = 24 * 60 * 60 * 1000; // Daily
            break;
        case '1m':
            numPoints = 30;
            interval = 24 * 60 * 60 * 1000; // Daily
            break;
        case '3m':
            numPoints = 90;
            interval = 24 * 60 * 60 * 1000; // Daily
            break;
        case '1y':
            numPoints = 365;
            interval = 24 * 60 * 60 * 1000; // Daily
            break;
    }
    
    // Generate data points
    for (let i = numPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * interval));
        
        // Generate OHLC with random walk
        const change = (Math.random() - 0.5) * volatility * basePrice;
        basePrice += change;
        
        const open = basePrice;
        const close = basePrice * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.round(basePrice * 100 * (1 + Math.random()));
        
        data.push({
            timestamp: timestamp.toISOString(),
            open: open.toFixed(2),
            high: high.toFixed(2),
            low: low.toFixed(2),
            close: close.toFixed(2),
            volume: volume.toFixed(0)
        });
    }
    
    return data;
}

// Generate mock signals for a symbol
function generateMockSignalsForSymbol(symbol, timeframe) {
    const data = generateMockPriceData(symbol, timeframe);
    const signals = [];
    const strategies = [
        'Moving Average', 
        'RSI Strategy', 
        'MACD Strategy', 
        'Bollinger Bands',
        'Breakout Strategy',
        'Trend Following'
    ];
    
    // Create descriptive signal messages
    const buyDescriptions = [
        'Bullish crossover detected',
        'Oversold conditions, entering long position',
        'Support level breakout confirmed',
        'Positive momentum building',
        'Golden cross pattern formed'
    ];
    
    const sellDescriptions = [
        'Bearish divergence detected',
        'Taking profits at resistance',
        'Overbought conditions, exiting position',
        'Momentum weakening, securing gains',
        'Death cross pattern formed'
    ];
    
    // Create 2-4 random signals
    const numSignals = 2 + Math.floor(Math.random() * 3);
    
    // Assign 1-2 strategies to use for this symbol
    const symbolStrategies = [];
    const numStrategies = 1 + Math.floor(Math.random() * 2);
    
    while (symbolStrategies.length < numStrategies) {
        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        if (!symbolStrategies.includes(strategy)) {
            symbolStrategies.push(strategy);
        }
    }
    
    // Generate alternating buy/sell signals
    let lastAction = Math.random() > 0.5 ? 'BUY' : 'SELL';
    
    for (let i = 0; i < numSignals; i++) {
        // Alternate between BUY and SELL for realism
        const action = lastAction === 'BUY' ? 'SELL' : 'BUY';
        lastAction = action;
        
        // Choose data point
        const dataIndex = Math.floor(Math.random() * (data.length * 0.8)) + Math.floor(data.length * 0.1);
        
        // Choose a strategy from the symbol strategies
        const strategy = symbolStrategies[Math.floor(Math.random() * symbolStrategies.length)];
        
        // Choose a description based on action type
        const descriptions = action === 'BUY' ? buyDescriptions : sellDescriptions;
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        signals.push({
            timestamp: data[dataIndex].timestamp,
            action: action,
            strategy_id: strategy,
            description: description,
            price: action === 'BUY' ? 
                parseFloat(data[dataIndex].low) * (1 + Math.random() * 0.01) : 
                parseFloat(data[dataIndex].high) * (1 - Math.random() * 0.01)
        });
    }
    
    // Add a recent signal
    const action = lastAction === 'BUY' ? 'SELL' : 'BUY';
    const recentIndex = data.length - 1 - Math.floor(Math.random() * 3);
    const strategy = symbolStrategies[Math.floor(Math.random() * symbolStrategies.length)];
    const descriptions = action === 'BUY' ? buyDescriptions : sellDescriptions;
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    signals.push({
        timestamp: data[recentIndex].timestamp,
        action: action,
        strategy_id: strategy,
        description: description,
        price: action === 'BUY' ? 
            parseFloat(data[recentIndex].low) * (1 + Math.random() * 0.01) : 
            parseFloat(data[recentIndex].high) * (1 - Math.random() * 0.01)
    });
    
    // Sort by timestamp
    signals.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return signals;
}

// Create API key notification chart
function createApiKeyNotificationChart(chartContainer) {
    if (!chartContainer) return;
    
    // Clear existing content
    chartContainer.innerHTML = '';
    
    // Create a canvas for the chart
    const canvas = document.createElement('canvas');
    canvas.id = 'portfolioChart';
    chartContainer.appendChild(canvas);
    
    // Create the notification container
    const notification = document.createElement('div');
    notification.className = 'api-key-notification';
    notification.style.position = 'absolute';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.textAlign = 'center';
    notification.style.padding = '20px';
    notification.style.borderRadius = '8px';
    notification.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    notification.style.maxWidth = '80%';
    
    notification.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 10px; color: #3556FB;">
            <i class="fas fa-key"></i>
        </div>
        <h4 style="margin-bottom: 10px; color: #1F2937;">API Key Required</h4>
        <p style="color: #4B5563; margin-bottom: 15px;">
            You need to add your API key to access live trading data.
            The current data is for demonstration purposes only.
        </p>
        <a href="/settings" class="btn btn-primary btn-sm">
            <i class="fas fa-cog mr-1"></i> Go to Settings
        </a>
    `;
    
    chartContainer.appendChild(notification);
    
    // Create an empty chart as background
    if (typeof Chart !== 'undefined') {
        if (window.portfolioChart instanceof Chart) {
            window.portfolioChart.destroy();
        }
        
        // Generate some placeholder data
        const mockData = generateMockPortfolioData('1m');
        const labels = mockData.map(item => new Date(item.timestamp));
        const values = mockData.map(item => parseFloat(item.value));
        
        window.portfolioChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: values.map((value, index) => ({
                        x: labels[index],
                        y: value
                    })),
                    borderColor: '#E5E7EB',
                    backgroundColor: 'rgba(229, 231, 235, 0.2)',
                    borderWidth: 1,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                events: [] // Disable all events
            }
        });
    }
}

// Create an empty portfolio chart with placeholder message
function createEmptyPortfolioChart(chartContainer) {
    if (!chartContainer) return;
    
    // Clear existing content
    chartContainer.innerHTML = '';
    
    // Create a canvas for the chart
    const canvas = document.createElement('canvas');
    canvas.id = 'portfolioChart';
    chartContainer.appendChild(canvas);
    
    // Create an empty chart
    if (typeof Chart !== 'undefined') {
        if (window.portfolioChart instanceof Chart) {
            window.portfolioChart.destroy();
        }
        
        window.portfolioChart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Portfolio Value',
                    data: [],
                    borderColor: '#3556FB',
                    backgroundColor: 'rgba(53, 86, 251, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                }
            }
        });
        
        // Add placeholder text
        const placeholderElement = document.createElement('div');
        placeholderElement.className = 'chart-placeholder';
        placeholderElement.style.position = 'absolute';
        placeholderElement.style.top = '50%';
        placeholderElement.style.left = '50%';
        placeholderElement.style.transform = 'translate(-50%, -50%)';
        placeholderElement.style.textAlign = 'center';
        placeholderElement.style.width = '80%';
        
        placeholderElement.innerHTML = `
            <div style="font-size: 36px; color: #E5E7EB; margin-bottom: 10px;">
                <i class="fas fa-chart-line"></i>
            </div>
            <h5 style="color: #6B7280; margin-bottom: 5px;">No Portfolio Data Available</h5>
            <p style="color: #9CA3AF; font-size: 14px;">
                Add your API key in settings to see your portfolio performance.
            </p>
        `;
        
        chartContainer.appendChild(placeholderElement);
    }
}

// Helper function to determine time unit based on timeframe
function getTimeUnit(timeframe) {
    switch (timeframe) {
        case '1h': return 'minute';
        case '1d': return 'hour';
        case '1w': return 'day';
        case '1m': return 'day';
        case '3m': return 'week';
        case '1y': return 'month';
        default: return 'day';
    }
}

// Chart loading helper functions
function showChartLoading(show = true) {
    const chartContainer = document.getElementById('portfolioChartContainer');
    if (chartContainer) {
        if (show) {
            chartContainer.classList.add('loading');
        } else {
            chartContainer.classList.remove('loading');
        }
    }
}

// Update portfolio chart
async function updatePortfolioChart(timeframe = '1m') {
    try {
        showChartLoading(true);
        console.log('[CHART DEBUG] Updating portfolio chart with timeframe:', timeframe);
        
        const response = await fetch(`/api/account/history?timeframe=${timeframe}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data format received');
        }
        
        // Check if we're using SmoothieCharts
        if (window.portfolioSmoothie && window.portfolioValueSeries) {
            console.log('[CHART DEBUG] Updating SmoothieChart with', data.length, 'data points');
            
            // Clear existing data
            window.portfolioValueSeries.clear();
            window.buySignalsSeries.clear();
            window.sellSignalsSeries.clear();
            
            // Add new data points
            data.forEach(point => {
                const timestamp = new Date(point.timestamp).getTime();
                const value = parseFloat(point.value);
                
                window.portfolioValueSeries.append(timestamp, value);
                
                // Add buy/sell signals if present
                if (point.signal === 'BUY') {
                    window.buySignalsSeries.append(timestamp, value);
                } else if (point.signal === 'SELL') {
                    window.sellSignalsSeries.append(timestamp, value);
                }
            });
            
            console.log('[CHART DEBUG] SmoothieChart updated successfully');
        } else {
            // Fallback to traditional Chart.js if it exists
            if (window.portfolioChart && window.portfolioChart.data && window.portfolioChart.data.datasets) {
                // Clear existing data
                window.portfolioChart.data.datasets[0].data = [];
                
                // Add new data points
                data.forEach(point => {
                    window.portfolioChart.data.datasets[0].data.push({
                        x: new Date(point.timestamp),
                        y: parseFloat(point.value)
                    });
                });
                
                window.portfolioChart.update();
                console.log('[CHART DEBUG] Chart.js updated successfully');
            } else {
                console.log('[CHART DEBUG] No chart object available, initializing new chart');
                // Initialize a new chart if neither exists
                initPortfolioChartWithSmoothie();
                
                // After initialization, recursively call this function again to load the data
                setTimeout(() => updatePortfolioChart(timeframe), 500);
                return;
            }
        }
    } catch (error) {
        console.error('[CHART DEBUG] Error updating portfolio chart:', error);
        showToast('Failed to update portfolio chart', 'error');
        
        // Generate and use mock data if API fails
        try {
            const mockData = generateMockPortfolioData(timeframe);
            console.log('[CHART DEBUG] Using mock data as fallback');
            
            if (window.portfolioSmoothie && window.portfolioValueSeries) {
                // Clear existing data
                window.portfolioValueSeries.clear();
                window.buySignalsSeries.clear();
                window.sellSignalsSeries.clear();
                
                // Add mock data points
                mockData.forEach(point => {
                    const timestamp = new Date(point.timestamp).getTime();
                    const value = parseFloat(point.value);
                    
                    window.portfolioValueSeries.append(timestamp, value);
                    
                    // Add buy/sell signals if present
                    if (point.signal === 'BUY') {
                        window.buySignalsSeries.append(timestamp, value);
                    } else if (point.signal === 'SELL') {
                        window.sellSignalsSeries.append(timestamp, value);
                    }
                });
                
                console.log('[CHART DEBUG] SmoothieChart updated with mock data');
            }
        } catch (mockError) {
            console.error('[CHART DEBUG] Failed to use mock data:', mockError);
        }
    } finally {
        showChartLoading(false);
    }
}

// Initialize trailing stop loss feature
function initializeTrailingStopLoss() {
    try {
        console.log('Initializing trailing stop loss feature');
        
        // Initialize storage for trailing stops if not exists
        if (!window.trailingStops) {
            window.trailingStops = {};
        }
        
        // Set up UI controls for trailing stops
        setupTrailingStopLossControls();
        
        // Listen for price updates to adjust trailing stops
        document.addEventListener('priceUpdated', function(event) {
            if (event.detail && event.detail.symbol && event.detail.price) {
                updateTrailingStopLoss(event.detail.symbol, event.detail.price);
            }
        });
        
        // Listen for new strategies
        document.addEventListener('strategiesUpdated', function(event) {
            if (event.detail && Array.isArray(event.detail)) {
                event.detail.forEach(strategy => {
                    setupTrailingStopForStrategy(strategy);
                });
            }
        });
        
        console.log('Trailing stop loss initialized');
        return true;
    } catch (error) {
        console.log('[Suppressed] Failed to initialize trailing stop loss:', error.message);
        return false;
    }
}

// Set up trailing stop loss controls
function setupTrailingStopLossControls() {
    try {
        // Add toggle controls to each strategy in the list
        const strategiesList = document.getElementById('activeStrategiesList');
        if (!strategiesList) return;
        
        // Add global trailing stop percentage input
        const settingsCard = document.querySelector('.settings-card');
        if (settingsCard) {
            const trailingStopSetting = document.createElement('div');
            trailingStopSetting.className = 'form-group mb-3';
            trailingStopSetting.innerHTML = `
                <label for="defaultTrailingStop">Default Trailing Stop (%)</label>
                <input type="number" class="form-control" id="defaultTrailingStop" 
                       min="0.1" max="20" step="0.1" value="2.0">
                <small class="form-text text-muted">
                    Default percentage for new trailing stops
                </small>
            `;
            
            settingsCard.appendChild(trailingStopSetting);
            
            // Add event listener
            const defaultTrailingStop = document.getElementById('defaultTrailingStop');
            if (defaultTrailingStop) {
                defaultTrailingStop.addEventListener('change', function() {
                    const value = parseFloat(this.value);
                    if (!isNaN(value) && value > 0) {
                        localStorage.setItem('defaultTrailingStop', value);
                    }
                });
                
                // Set initial value from storage
                const storedValue = localStorage.getItem('defaultTrailingStop');
                if (storedValue) {
                    defaultTrailingStop.value = storedValue;
                }
            }
        }
    } catch (error) {
        console.log('[Suppressed] Error setting up trailing stop controls:', error.message);
    }
}

// Setup trailing stop for a specific strategy
function setupTrailingStopForStrategy(strategy) {
    if (!strategy || !strategy.id) return;
    
    try {
        // Check if we already have a trailing stop for this strategy
        if (!window.trailingStops[strategy.id]) {
            const defaultTrailingStop = parseFloat(localStorage.getItem('defaultTrailingStop') || 2.0);
            
            // Initialize trailing stop data
            window.trailingStops[strategy.id] = {
                active: false,
                stopPercent: defaultTrailingStop,
                entryPrice: strategy.entry_price || 0,
                highestPrice: strategy.current_price || 0,
                stopPrice: calculateStopPrice(strategy, defaultTrailingStop),
                lastUpdated: new Date().getTime()
            };
            
            // Add trailing stop toggle to the strategy row
            const strategyRow = document.querySelector(`tr[data-strategy-id="${strategy.id}"]`);
            if (strategyRow) {
                const actionsCell = strategyRow.querySelector('.strategy-actions');
                if (actionsCell) {
                    const trailingStopBtn = document.createElement('button');
                    trailingStopBtn.className = 'btn btn-sm btn-outline-primary trailing-stop-btn ms-2';
                    trailingStopBtn.setAttribute('data-strategy-id', strategy.id);
                    trailingStopBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Stop Loss';
                    
                    trailingStopBtn.addEventListener('click', function() {
                        toggleTrailingStop(strategy.id);
                    });
                    
                    actionsCell.appendChild(trailingStopBtn);
                }
            }
        }
    } catch (error) {
        console.log(`[Suppressed] Error setting up trailing stop for strategy ${strategy.id}:`, error.message);
    }
}

// Calculate stop price based on strategy and percentage
function calculateStopPrice(strategy, percent) {
    if (!strategy || !strategy.current_price) return 0;
    
    // For long positions, stop is below current price
    if (strategy.position_type === 'LONG') {
        return strategy.current_price * (1 - percent / 100);
    }
    // For short positions, stop is above current price
    else if (strategy.position_type === 'SHORT') {
        return strategy.current_price * (1 + percent / 100);
    }
    
    // Default fallback
    return strategy.current_price * (1 - percent / 100);
}

// Toggle trailing stop for a strategy
function toggleTrailingStop(strategyId) {
    if (!strategyId || !window.trailingStops[strategyId]) return;
    
    try {
        const trailingStop = window.trailingStops[strategyId];
        trailingStop.active = !trailingStop.active;
        
        // Update button state
        const trailingStopBtn = document.querySelector(`button.trailing-stop-btn[data-strategy-id="${strategyId}"]`);
        if (trailingStopBtn) {
            if (trailingStop.active) {
                trailingStopBtn.classList.remove('btn-outline-primary');
                trailingStopBtn.classList.add('btn-primary');
                
                // Create or update stop loss indicator on chart
                createStopLossIndicator(strategyId, trailingStop.stopPrice);
                
                // Show notification
                showNotification('Trailing Stop Activated', 
                    `Trailing stop loss set at $${trailingStop.stopPrice.toFixed(2)}`, 'info');
        } else {
                trailingStopBtn.classList.remove('btn-primary');
                trailingStopBtn.classList.add('btn-outline-primary');
                
                // Remove indicator from chart
                removeStopLossIndicator(strategyId);
                
                // Show notification
                showNotification('Trailing Stop Deactivated', 
                    'Trailing stop loss has been turned off', 'info');
            }
        }
    } catch (error) {
        console.log(`[Suppressed] Error toggling trailing stop for strategy ${strategyId}:`, error.message);
    }
}

// Update trailing stop loss based on current price
function updateTrailingStopLoss(symbol, currentPrice) {
    if (!symbol || !currentPrice || !window.trailingStops) return;
    
    try {
        // Find strategies for this symbol
        Object.keys(window.trailingStops).forEach(strategyId => {
            const stop = window.trailingStops[strategyId];
            if (!stop.active) return; // Skip inactive stops
            
            // Find the strategy
            const strategy = activeStrategies.find(s => s.id === strategyId);
            if (!strategy || strategy.symbol !== symbol) return;
            
            // Update highest price if needed (for long positions)
            if (strategy.position_type === 'LONG' && currentPrice > stop.highestPrice) {
                stop.highestPrice = currentPrice;
                
                // Move stop price up
                const newStopPrice = currentPrice * (1 - stop.stopPercent / 100);
                if (newStopPrice > stop.stopPrice) {
                    stop.stopPrice = newStopPrice;
                    
                    // Update indicator on chart
                    updateStopLossIndicator(strategyId, newStopPrice);
                    
                    // Show notification for significant moves
                    if (Math.random() < 0.1) { // Only show occasionally to avoid spam
                        showNotification('Trailing Stop Updated', 
                            `Stop loss for ${strategy.name} moved up to $${newStopPrice.toFixed(2)}`, 'info');
                    }
                }
            }
            // For short positions, track lowest price
            else if (strategy.position_type === 'SHORT' && (stop.lowestPrice === 0 || currentPrice < stop.lowestPrice)) {
                stop.lowestPrice = currentPrice;
                
                // Move stop price down
                const newStopPrice = currentPrice * (1 + stop.stopPercent / 100);
                if (stop.stopPrice === 0 || newStopPrice < stop.stopPrice) {
                    stop.stopPrice = newStopPrice;
                    
                    // Update indicator on chart
                    updateStopLossIndicator(strategyId, newStopPrice);
                }
            }
            
            // Check if stop loss is triggered
            if ((strategy.position_type === 'LONG' && currentPrice <= stop.stopPrice) || 
                (strategy.position_type === 'SHORT' && currentPrice >= stop.stopPrice)) {
                
                // Trigger the stop loss
                triggerStopLoss(strategyId, currentPrice);
            }
        });
    } catch (error) {
        console.log('[Suppressed] Error updating trailing stops:', error.message);
    }
}

// Create visual indicator for stop loss on chart
function createStopLossIndicator(strategyId, stopPrice) {
    if (!strategyId || !stopPrice || !window.portfolioChart) return;
    
    try {
        // Get chart instance
        const chart = window.portfolioChart;
        
        // Add horizontal line annotation for stop loss
        if (chart.options && chart.options.plugins && chart.options.plugins.annotation) {
            // Remove existing annotation if any
            removeStopLossIndicator(strategyId);
            
            // Create new annotation
            const annotations = chart.options.plugins.annotation.annotations;
            annotations[`stopLoss-${strategyId}`] = {
                type: 'line',
                yMin: stopPrice,
                yMax: stopPrice,
                borderColor: 'rgba(255, 99, 132, 0.8)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                    enabled: true,
                    content: `Stop: $${stopPrice.toFixed(2)}`,
                    position: 'left',
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    color: '#fff',
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    padding: 4
                }
            };
            
            // Update chart
            chart.update();
        }
    } catch (error) {
        console.log(`[Suppressed] Error creating stop loss indicator for strategy ${strategyId}:`, error.message);
    }
}

// Update stop loss indicator on chart
function updateStopLossIndicator(strategyId, stopPrice) {
    if (!strategyId || !stopPrice || !window.portfolioChart) return;
    
    try {
        // Get chart instance
        const chart = window.portfolioChart;
        
        // Update existing annotation
        if (chart.options && chart.options.plugins && 
            chart.options.plugins.annotation && 
            chart.options.plugins.annotation.annotations) {
            
            const annotations = chart.options.plugins.annotation.annotations;
            if (annotations[`stopLoss-${strategyId}`]) {
                annotations[`stopLoss-${strategyId}`].yMin = stopPrice;
                annotations[`stopLoss-${strategyId}`].yMax = stopPrice;
                
                if (annotations[`stopLoss-${strategyId}`].label) {
                    annotations[`stopLoss-${strategyId}`].label.content = `Stop: $${stopPrice.toFixed(2)}`;
                }
                
                // Update chart
                chart.update();
        } else {
                // If annotation doesn't exist, create it
                createStopLossIndicator(strategyId, stopPrice);
            }
        }
    } catch (error) {
        console.log(`[Suppressed] Error updating stop loss indicator for strategy ${strategyId}:`, error.message);
    }
}

// Remove stop loss indicator from chart
function removeStopLossIndicator(strategyId) {
    if (!strategyId || !window.portfolioChart) return;
    
    try {
        // Get chart instance
        const chart = window.portfolioChart;
        
        // Remove annotation
        if (chart.options && chart.options.plugins && 
            chart.options.plugins.annotation && 
            chart.options.plugins.annotation.annotations) {
            
            const annotations = chart.options.plugins.annotation.annotations;
            if (annotations[`stopLoss-${strategyId}`]) {
                delete annotations[`stopLoss-${strategyId}`];
                
                // Update chart
                chart.update();
            }
        }
    } catch (error) {
        console.log(`[Suppressed] Error removing stop loss indicator for strategy ${strategyId}:`, error.message);
    }
}

// Trigger stop loss for a strategy
function triggerStopLoss(strategyId, currentPrice) {
    if (!strategyId || !window.trailingStops[strategyId]) return;
    
    try {
        const trailingStop = window.trailingStops[strategyId];
        if (!trailingStop.active) return; // Skip if not active
        
        // Find the strategy
        const strategy = activeStrategies.find(s => s.id === strategyId);
        if (!strategy) return;
        
        // Mark as inactive
        trailingStop.active = false;
        
        // Remove indicator from chart
        removeStopLossIndicator(strategyId);
        
        // Update button state
        const trailingStopBtn = document.querySelector(`button.trailing-stop-btn[data-strategy-id="${strategyId}"]`);
        if (trailingStopBtn) {
            trailingStopBtn.classList.remove('btn-primary');
            trailingStopBtn.classList.add('btn-outline-primary');
        }
        
        // Show notification
        showNotification('Stop Loss Triggered', 
            `Trailing stop loss triggered for ${strategy.name} at $${currentPrice.toFixed(2)}`, 'warning');
        
        // Make API request to stop the strategy
        fetch(`/api/strategies/${strategyId}/stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: 'Trailing stop loss triggered',
                price: currentPrice
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to stop strategy');
            }
            return response.json();
        })
        .then(data => {
            console.log(`Strategy ${strategyId} stopped successfully due to trailing stop`);
            // Update strategies list
            updateActiveStrategies();
        })
        .catch(error => {
            console.log(`[Suppressed] Error stopping strategy ${strategyId}:`, error.message);
        });
    } catch (error) {
        console.log(`[Suppressed] Error triggering stop loss for strategy ${strategyId}:`, error.message);
    }
}

// Add new trading strategy
function addStrategy() {
    console.log('Adding new trading strategy');
    
    // Get form values
    const strategyType = document.getElementById('strategySelect').value;
    const capital = parseFloat(document.getElementById('capitalInput').value || 0);
    const riskPerTrade = parseFloat(document.getElementById('riskInput').value || 1);
    
    // Get selected symbols
    const selectedSymbols = [];
    const symbolSelector = document.querySelector('.symbol-selector');
    if (symbolSelector) {
        const badges = symbolSelector.querySelectorAll('.symbol-badge');
        badges.forEach(badge => {
            const symbol = badge.textContent.replace('×', '').trim();
            if (symbol) selectedSymbols.push(symbol);
        });
    }
    
    // If no symbols selected, use the one from the dropdown
    if (selectedSymbols.length === 0) {
        const symbolSelect = document.getElementById('symbolSelect');
        if (symbolSelect && symbolSelect.value) {
            selectedSymbols.push(symbolSelect.value);
        }
    }
    
    // Validate required fields
    if (!strategyType) {
        showNotification('Error', 'Please select a strategy type', 'error');
        return;
    }
    
    if (selectedSymbols.length === 0) {
        showNotification('Error', 'Please select at least one symbol', 'error');
        return;
    }
    
    if (isNaN(capital) || capital <= 0) {
        showNotification('Error', 'Please enter a valid capital amount', 'error');
        return;
    }
    
    // Generate a unique strategy name
    const strategyName = generateStrategyName(strategyType, selectedSymbols[0]);
    
    // Prepare strategy data
    const strategyData = {
        symbol: selectedSymbols.join(','),
        strategy_type: strategyType,
        capital: capital,
        risk_per_trade: riskPerTrade,
        name: strategyName,
        parameters: getStrategyParameters()
    };
    
    console.log('Strategy data:', strategyData);
    
    // Send request to create strategy
    fetch('/api/strategies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(strategyData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Strategy added successfully:', data);
        showNotification('Success', `Strategy "${strategyName}" added successfully`, 'success');
        
        // Clear form
        document.getElementById('strategySelect').value = '';
        document.getElementById('capitalInput').value = '';
        document.getElementById('riskInput').value = '1';
        
        // Clear selected symbols
        if (symbolSelector) {
            const badgesContainer = symbolSelector.querySelector('.selected-symbols');
            if (badgesContainer) {
                badgesContainer.innerHTML = '';
            }
        }
        
        // Update strategies list
        updateActiveStrategies();
    })
    .catch(error => {
        console.error('Error creating strategy:', error);
        showNotification('Error', `Failed to add strategy: ${error.message}`, 'error');
    });
}

// Generate a unique strategy name
function generateStrategyName(strategyType, symbol) {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const adjectives = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 
        'Rapid', 'Swift', 'Smart', 'Sharp', 'Quick',
        'Golden', 'Silver', 'Platinum', 'Diamond', 'Emerald',
        'Agile', 'Dynamic', 'Strategic', 'Tactical', 'Focused'
    ];
    const nouns = [
        'Hunter', 'Trader', 'Eagle', 'Tiger', 'Hawk',
        'Oracle', 'Predictor', 'Sensor', 'Pulse', 'Wave',
        'Momentum', 'Navigator', 'Pathfinder', 'Scout', 'Explorer',
        'Voyager', 'Seeker', 'Finder', 'Tracker', 'Watcher'
    ];
    
    // Get symbol base currency (e.g., BTC from BTC/USD)
    const baseCurrency = symbol.split('/')[0] || symbol;
    
    // Choose random adjective and noun
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    // Format strategy type more nicely
    let formattedType = strategyType.charAt(0).toUpperCase() + strategyType.slice(1);
    if (formattedType === 'Macd') formattedType = 'MACD';
    if (formattedType === 'Rsi') formattedType = 'RSI';
    
    // Create name format: [Adjective] [Noun] [Type] - [Symbol] [Timestamp]
    return `${adjective} ${noun} ${formattedType} - ${baseCurrency} ${timestamp}`;
}

// Get parameters specific to the selected strategy
function getStrategyParameters() {
    const strategyType = document.getElementById('strategySelect').value;
    const params = {};
    
    if (strategyType === 'supertrend') {
        // Default values if inputs not found
        params.atr_period = parseInt(document.querySelector('[name="atr_period"]')?.value || '10');
        params.multiplier = parseFloat(document.querySelector('[name="multiplier"]')?.value || '3');
    } 
    else if (strategyType === 'macd') {
        params.fast_period = parseInt(document.querySelector('[name="fast_period"]')?.value || '12');
        params.slow_period = parseInt(document.querySelector('[name="slow_period"]')?.value || '26');
        params.signal_period = parseInt(document.querySelector('[name="signal_period"]')?.value || '9');
    }
    else if (strategyType === 'rsi') {
        params.period = parseInt(document.querySelector('[name="period"]')?.value || '14');
        params.overbought = parseInt(document.querySelector('[name="overbought"]')?.value || '70');
        params.oversold = parseInt(document.querySelector('[name="oversold"]')?.value || '30');
    }
    else if (strategyType === 'bollinger') {
        params.period = parseInt(document.querySelector('[name="period"]')?.value || '20');
        params.std_dev = parseFloat(document.querySelector('[name="std_dev"]')?.value || '2');
    }
    
    return params;
}

// Update active strategies table
async function updateActiveStrategies() {
    console.log('Updating active strategies...');
    
    // Show loading indicator
    showLoadingState(true);
    
    try {
        // Fetch strategies from API
        const response = await fetch('/api/strategies');
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const strategies = await response.json();
        console.log('Fetched strategies:', strategies);
        
        // Get the strategies container
        const strategiesContainer = document.getElementById('strategiesContainer');
        if (!strategiesContainer) {
            console.error('Strategies container not found');
            return;
        }
        
        // Clear existing strategies
        strategiesContainer.innerHTML = '';
        
        // Check if we have any strategies
        if (!strategies || strategies.length === 0) {
            strategiesContainer.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No active trading strategies. Create a strategy to start trading.
                </div>
            `;
            return;
        }
        
        // Create a table to display strategies
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        // Add strategies to table
        const tbody = table.querySelector('tbody');
        strategies.forEach(strategy => {
            // Format strategy name for display
            const displayName = strategy.name || `${strategy.type} - ${strategy.symbol}`;
            
            // Create status badge
            const statusBadge = strategy.active 
                ? '<span class="badge bg-success">Active</span>' 
                : '<span class="badge bg-secondary">Paused</span>';
            
            // Create row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${displayName}</strong></td>
                <td>${strategy.symbol}</td>
                <td>${strategy.type}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary strategy-toggle-btn" data-id="${strategy.id}" data-active="${strategy.active}">
                            <i class="fas fa-${strategy.active ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-outline-danger strategy-delete-btn" data-id="${strategy.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add table to container
        strategiesContainer.appendChild(table);
        
        // Attach event listeners to buttons
        setupStrategyButtons();
        
    } catch (error) {
        console.error('Error updating strategies:', error);
        
        // Show error message
        const strategiesContainer = document.getElementById('strategiesContainer');
        if (strategiesContainer) {
            strategiesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to load strategies: ${error.message}
                </div>
            `;
        }
    } finally {
        // Hide loading indicator
        showLoadingState(false);
    }
}

// Setup handlers for strategy buttons
function setupStrategyButtons() {
    console.log('Setting up strategy buttons...');
    
    // Get all delete buttons
    const deleteButtons = document.querySelectorAll('.strategy-delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async function(event) {
            event.preventDefault();
            
            const strategyId = this.getAttribute('data-id');
            if (!strategyId) {
                console.error('No strategy ID found on button');
                return;
            }
            
            // Confirm deletion
            if (!confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
                return;
            }
            
            console.log(`Deleting strategy ${strategyId}`);
            showLoadingState(true);
            
            try {
                const response = await fetch(`/api/strategies/${strategyId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || `API error: ${response.status}`);
                }
                
                // Show success notification
                showNotification('Success', 'Strategy deleted successfully', 'success');
                
                // Update strategies list
                updateActiveStrategies();
                
            } catch (error) {
                console.error('Error deleting strategy:', error);
                showNotification('Error', `Failed to delete strategy: ${error.message}`, 'error');
            } finally {
                showLoadingState(false);
            }
        });
    });
    
    // Get all toggle buttons
    const toggleButtons = document.querySelectorAll('.strategy-toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', async function(event) {
            event.preventDefault();
            
            const strategyId = this.getAttribute('data-id');
            const isActive = this.getAttribute('data-active') === 'true';
            
            if (!strategyId) {
                console.error('No strategy ID found on button');
                return;
            }
            
            console.log(`${isActive ? 'Pausing' : 'Activating'} strategy ${strategyId}`);
            showLoadingState(true);
            
            try {
                const response = await fetch(`/api/strategies/${strategyId}/toggle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        active: !isActive
                    })
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || `API error: ${response.status}`);
                }
                
                // Show success notification
                showNotification(
                    'Success', 
                    `Strategy ${isActive ? 'paused' : 'activated'} successfully`, 
                    'success'
                );
                
                // Update strategies list
                updateActiveStrategies();
                
        } catch (error) {
                console.error('Error toggling strategy:', error);
                showNotification('Error', `Failed to update strategy: ${error.message}`, 'error');
            } finally {
            showLoadingState(false);
        }
}); 
    });
}

// Update Smoothie Chart with new timeframe data
function updateSmoothieChartTimeframe(timeframe) {
    if (!window.portfolioSmoothie || !window.portfolioValueSeries) {
        return;
    }
    
    console.log('[CHART DEBUG] Updating Smoothie chart timeframe to', timeframe);
    
    // Clear existing data
    window.portfolioValueSeries.clear();
    window.buySignalsSeries.clear();
    window.sellSignalsSeries.clear();
    
    // Stop existing data simulation
    if (window.liveDataInterval) {
        clearInterval(window.liveDataInterval);
    }
    
    // Fetch new data based on timeframe
    const endpoint = `/portfolio/history?timeframe=${timeframe}`;
    
    apiRequest(endpoint)
        .then(data => {
            // If we have data, use it, otherwise generate mock data
            const chartData = data && data.length > 0 ? data : generateMockPortfolioData(timeframe);
            
            // Add data points to the time series
            if (chartData && chartData.length > 0) {
                // Get the data points
                chartData.forEach(point => {
                    const timestamp = new Date(point.timestamp).getTime();
                    const value = parseFloat(point.value);
                    
                    // Add to the portfolio value series
                    window.portfolioValueSeries.append(timestamp, value);
                    
                    // Add buy/sell signals if present
                    if (point.signal === 'BUY') {
                        window.buySignalsSeries.append(timestamp, value);
                    } else if (point.signal === 'SELL') {
                        window.sellSignalsSeries.append(timestamp, value);
                    }
                });
                
                // Start live data simulation for demo purposes
                startLiveDataSimulation(chartData);
                
                // Update last update text
                const lastUpdateElement = document.getElementById('lastUpdate');
                if (lastUpdateElement) {
                    lastUpdateElement.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                }
            }
        })
        .catch(error => {
            console.error('[CHART DEBUG] Error loading portfolio data for timeframe', timeframe, error);
            // Generate mock data if API fails
            const mockData = generateMockPortfolioData(timeframe);
            
            // Add mock data points
            mockData.forEach(point => {
                const timestamp = new Date(point.timestamp).getTime();
                const value = parseFloat(point.value);
                window.portfolioValueSeries.append(timestamp, value);
                
                // Add some random buy/sell signals
                if (Math.random() > 0.9) {
                    if (Math.random() > 0.5) {
                        window.buySignalsSeries.append(timestamp, value);
                    } else {
                        window.sellSignalsSeries.append(timestamp, value);
                    }
                }
            });
            
            // Start live data simulation
            startLiveDataSimulation(mockData);
        });
}

// Run chart troubleshooting 
function troubleshootChartSetup() {
    console.log('[CHART DEBUG] Running chart troubleshooting');
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('[CHART DEBUG] Chart.js is not loaded!');
        return;
    }
    
    console.log('[CHART DEBUG] Chart.js version:', Chart.version);
    
    // Check if Luxon is available
    if (typeof luxon === 'undefined' || typeof luxon.DateTime === 'undefined') {
        console.error('[CHART DEBUG] Luxon is missing!');
    } else {
        console.log('[CHART DEBUG] Luxon is available');
    }
    
    // Check Chart.js configuration
    console.log('[CHART DEBUG] Chart defaults:', Chart.defaults);
    
    // Check adapters configuration
    if (!Chart.defaults.adapters || !Chart.defaults.adapters.date) {
        console.error('[CHART DEBUG] Date adapter is not configured!');
        
        // Try to fix it if possible
        if (typeof luxon !== 'undefined' && typeof luxon.DateTime !== 'undefined') {
            console.log('[CHART DEBUG] Setting up date adapter with Luxon');
            Chart.defaults.adapters = {
                date: luxon.DateTime
            };
            
            // Also set up time scale adapter
            if (!Chart.defaults.scales) Chart.defaults.scales = {};
            if (!Chart.defaults.scales.time) Chart.defaults.scales.time = {};
            Chart.defaults.scales.time.adapters = {
                date: luxon.DateTime
            };
        }
    } else {
        console.log('[CHART DEBUG] Date adapter is configured:', Chart.defaults.adapters.date);
    }
    
    // Check time scale configuration
    if (!Chart.defaults.scales || !Chart.defaults.scales.time || !Chart.defaults.scales.time.adapters) {
        console.error('[CHART DEBUG] Time scale adapter is not configured!');
        
        // Try to fix it if possible
        if (typeof luxon !== 'undefined' && typeof luxon.DateTime !== 'undefined') {
            console.log('[CHART DEBUG] Setting up time scale adapter with Luxon');
            if (!Chart.defaults.scales) Chart.defaults.scales = {};
            if (!Chart.defaults.scales.time) Chart.defaults.scales.time = {};
            Chart.defaults.scales.time.adapters = {
                date: luxon.DateTime
            };
        }
    } else {
        console.log('[CHART DEBUG] Time scale adapter is configured:', Chart.defaults.scales.time.adapters);
    }
}

// API request helper with error handling
async function apiRequest(endpoint, options = {}) {
    console.log(`[API DEBUG] Making request to ${endpoint}`);
    
    // Ensure the endpoint starts with /api/ unless it already does
    const apiEndpoint = endpoint.startsWith('/api/') 
        ? endpoint 
        : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    try {
        const response = await fetch(apiEndpoint, options);
        
        if (!response.ok) {
            console.warn(`[API DEBUG] Request failed: ${apiEndpoint} (${response.status})`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[API DEBUG] Request successful: ${apiEndpoint}`);
        return data;
    } catch (error) {
        console.error(`[API DEBUG] Request error: ${apiEndpoint}`, error);
        throw error;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // If toastify is available, use it
    if (typeof Toastify === 'function') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            className: `toast-${type}`,
            close: true
        }).showToast();
        return;
    }
    
    // Fallback to browser notification
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        alert(message);
        return;
    }
    
    // If permission is already granted
    if (Notification.permission === 'granted') {
        new Notification('Crypto Trader', {
            body: message,
            icon: '/static/img/favicon.png'
        });
    }
    // Otherwise, request permission
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Crypto Trader', {
                    body: message,
                    icon: '/static/img/favicon.png'
                });
            }
        });
    }
}