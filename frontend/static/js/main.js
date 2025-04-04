// Main JavaScript file for Crypto Trader

// Global variables
// Window global variables are initialized in the base template
// Using window.currentSymbol which is already declared in base.html
let currentChart = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        setActiveNavItem();
        initializeBootstrapComponents();
        initializeWebSocket();
        await initializeCharts();
        addGlobalEventListeners();
        updateAccountInfo();
        initializeTradingControls();
        initializeStrategyForm();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function setActiveNavItem() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
}

function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

function initializeWebSocket() {
    // Connect to socket.io server
    const socketUrl = window.location.protocol + '//' + window.location.host;
    console.log('[SOCKET] Connecting to:', socketUrl);
    
    try {
        window.socket = io(socketUrl, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 5000
        });
        
        window.socket.on('connect', function() {
            console.log('[SOCKET] WebSocket connected');
            
            // Update connection status indicator if exists
            const connectionIndicator = document.getElementById('connectionStatus');
            if (connectionIndicator) {
                connectionIndicator.className = 'connection-status connected';
                connectionIndicator.title = 'Connected to real-time data';
            }
            
            // Subscribe to default symbol
            if (window.currentSymbol) {
                window.socket.emit('subscribe', { symbol: window.currentSymbol });
                console.log('[SOCKET] Subscribed to:', window.currentSymbol);
            }
        });
        
        window.socket.on('disconnect', function() {
            console.log('[SOCKET] WebSocket disconnected');
            
            // Update connection status indicator if exists
            const connectionIndicator = document.getElementById('connectionStatus');
            if (connectionIndicator) {
                connectionIndicator.className = 'connection-status disconnected';
                connectionIndicator.title = 'Disconnected from real-time data';
            }
        });
        
        // Handle market data updates
        window.socket.on('market_data', function(data) {
            console.log('[SOCKET] Received market data:', data);
            handleMarketData(data);
        });
        
        // Handle trade data updates
        window.socket.on('trade_update', function(data) {
            console.log('[SOCKET] Received trade update:', data);
            handleTradeUpdate(data);
        });
        
        // Handle order updates
        window.socket.on('order_update', function(data) {
            console.log('[SOCKET] Received order update:', data);
            handleOrderUpdate(data);
        });
        
        // Handle error messages
        window.socket.on('error', function(error) {
            console.error('[SOCKET] Error:', error);
            showToast(error.message || 'Connection error', 'error');
            
            // Update connection status indicator if exists
            const connectionIndicator = document.getElementById('connectionStatus');
            if (connectionIndicator) {
                connectionIndicator.className = 'connection-status error';
                connectionIndicator.title = 'Error with real-time data connection';
            }
        });
        
        // Handle reconnection attempts
        window.socket.on('reconnect_attempt', function(attemptNumber) {
            console.log(`[SOCKET] Reconnection attempt ${attemptNumber}`);
            
            // Update connection status indicator if exists
            const connectionIndicator = document.getElementById('connectionStatus');
            if (connectionIndicator) {
                connectionIndicator.className = 'connection-status connecting';
                connectionIndicator.title = `Reconnecting... (Attempt ${attemptNumber})`;
            }
        });
    } catch (error) {
        console.error('[SOCKET] Error initializing WebSocket:', error);
    }
}

function handleMarketData(data) {
    // Skip if no data
    if (!data) return;
    
    console.log(`[SOCKET] Processing market data for ${data.symbol}`);
    
    // Check if we're handling data for our selected symbol
    if (data.symbol === window.currentSymbol) {
        // Handle different data types
        if (data.type === 'trade' || data.price) {
            // Update the real-time chart with latest price
            if (window.chartManager) {
                // Check if we have volume data
                const volume = data.volume || 0;
                window.chartManager.updatePriceData(data.price, volume);
                
                // Update current price display
                const currentPriceElement = document.getElementById('currentPrice');
                if (currentPriceElement) {
                    currentPriceElement.textContent = formatCurrency(data.price);
                    
                    // Add a flash effect for visual feedback
                    currentPriceElement.classList.add('price-flash');
                    setTimeout(() => {
                        currentPriceElement.classList.remove('price-flash');
                    }, 500);
                }
                
                // Update trade data display
                updateTradeData(data);
            }
        } else if (data.type === 'quote' || (data.bid && data.ask)) {
            // Update quote data (bid/ask)
            updateQuoteData(data);
        }
    }
    
    // Update ticker/list display for this symbol regardless of whether it's selected
    updateTickerDisplay(data);
}

function updateAccountInfo() {
    fetch('/api/account')
        .then(response => response.json())
        .then(data => {
            // Update account balance display
            const accountBalance = document.getElementById('accountBalance');
            if (accountBalance) {
                accountBalance.textContent = formatCurrency(data.equity);
            }
            
            // Update account data display
            const accountData = document.getElementById('accountData');
            if (accountData) {
                accountData.innerHTML = `
                    <div class="mb-2"><strong>Cash:</strong> ${formatCurrency(data.cash)}</div>
                    <div class="mb-2"><strong>Buying Power:</strong> ${formatCurrency(data.buying_power)}</div>
                    <div class="mb-2"><strong>Portfolio Value:</strong> ${formatCurrency(data.equity)}</div>
                    <div class="mb-2"><strong>Day P&L:</strong> <span class="${data.day_pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(data.day_pl)} (${data.day_pl_pct.toFixed(2)}%)</span></div>
                `;
            }
            
            // Update portfolio chart with current value
            if (window.chartManager) {
                window.chartManager.updatePortfolioValue(data.equity);
            }
        })
        .catch(error => {
            console.error('Error fetching account data:', error);
        });
    
    // If we haven't loaded historical account data yet, load it
    if (!window.accountHistoryLoaded) {
        loadAccountHistory();
    }
}

function symbolSearch(query) {
    return fetch(`/api/symbols?search=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            return data.symbols.map(symbol => ({
                symbol: symbol.symbol,
                name: symbol.name,
                price: symbol.price,
                change: symbol.change
            }));
        })
        .catch(error => {
            console.error('Error searching symbols:', error);
            showToast('Error searching symbols', 'error');
            return [];
        });
}

function addGlobalEventListeners() {
    // Symbol search functionality
    const symbolSearchInputs = document.querySelectorAll('.symbol-search');
    symbolSearchInputs.forEach(input => {
        let timeout = null;
        const dropdown = input.nextElementSibling;
        
        input.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const query = this.value.trim();
                if (query.length >= 2) {
                    symbolSearch(query)
                        .then(results => {
                            dropdown.innerHTML = '';
                            results.forEach(result => {
                                const item = document.createElement('a');
                                item.className = 'dropdown-item';
                                item.href = '#';
                                item.innerHTML = `
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span><strong>${result.symbol}</strong> - ${result.name}</span>
                                        <span class="${result.change >= 0 ? 'text-success' : 'text-danger'}">
                                            ${formatCurrency(result.price)} (${result.change.toFixed(2)}%)
                                        </span>
                                    </div>
                                `;
                                item.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    input.value = result.symbol;
                                    dropdown.innerHTML = '';
                                    dropdown.style.display = 'none';
                                    selectSymbol(result.symbol);
                                });
                                dropdown.appendChild(item);
                            });
                            dropdown.style.display = results.length ? 'block' : 'none';
                        });
                } else {
                    dropdown.innerHTML = '';
                    dropdown.style.display = 'none';
                }
            }, 300);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });

    // Strategy activation toggles
    const strategyToggles = document.querySelectorAll('.strategy-toggle');
    strategyToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const strategyId = this.dataset.strategyId;
            const active = this.checked;
            
            fetch('/api/strategies/' + strategyId, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: active })
            })
            .then(response => response.json())
            .then(data => {
                showToast(`Strategy ${active ? 'activated' : 'deactivated'}`, 'success');
            })
            .catch(error => {
                console.error('Error updating strategy:', error);
                showToast('Error updating strategy', 'error');
                this.checked = !active; // Revert toggle
            });
        });
    });

    // Close button for toasts
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-close-toast')) {
            const toast = e.target.closest('.toast');
            if (toast) {
                const bsToast = bootstrap.Toast.getInstance(toast);
                if (bsToast) bsToast.hide();
            }
        }
    });
}

// Update trade data
function updateTradeData(data) {
    const tradeElement = document.getElementById(`trade-${data.symbol}`);
    if (tradeElement) {
        tradeElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span class="price">${formatCurrency(data.price)}</span>
                <span class="change ${data.change >= 0 ? 'text-success' : 'text-danger'}">
                    ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%
                </span>
            </div>
        `;
    }
}

// Update quote data
function updateQuoteData(data) {
    const quoteElement = document.getElementById(`quote-${data.symbol}`);
    if (quoteElement) {
        quoteElement.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>Bid: ${formatCurrency(data.bid)}</div>
                <div>Ask: ${formatCurrency(data.ask)}</div>
            </div>
        `;
    }
}

// Symbol selection handler
function selectSymbol(symbol) {
    if (!symbol) return;
    
    window.currentSymbol = symbol;
    console.log('[CHART DEBUG] Selected symbol:', symbol);
    
    // Update UI to show selected symbol
    document.querySelectorAll('.selected-symbol').forEach(el => {
        el.textContent = symbol;
    });
    
    // Subscribe to symbol updates via WebSocket
    if (window.socket && window.socket.connected) {
        window.socket.emit('subscribe', { symbol });
    }
    
    // Load historical data with default timeframe
    console.log('[CHART DEBUG] Loading historical data for symbol:', symbol);
    loadHistoricalData(symbol);
}

// Load historical data for a symbol
function loadHistoricalData(symbol) {
    if (!symbol) return;
    
    console.log('[CHART DEBUG] Fetching historical data for:', symbol);
    
    // Show loading state if container exists
    const chartContainer = document.getElementById('chartContainer');
    if (chartContainer) {
        chartContainer.classList.add('loading');
    }

    // Track the URLs we've tried
    const attemptedUrls = new Set();
    let retryCount = 0;
    const maxRetries = 3;
    
    // List of URL formats to try
    function getUrlsToTry() {
        const encodedSymbol = encodeURIComponent(symbol);
        const urls = [
            `/api/historical/${encodedSymbol}?timeframe=1d&limit=100`, // Standard URL with encoded symbol
        ];
        
        // For BTC/USD, add specific hardcoded URLs
        if (symbol === 'BTC/USD') {
            urls.push('/api/historical/BTC%2FUSD?timeframe=1d&limit=100'); // Explicitly escaped %2F
            urls.push('/api/historical/BTC/USD?timeframe=1d&limit=100'); // Direct path with slash
        }
        
        // Add a general fallback that uses the string converter instead of path
        if (symbol.includes('/')) {
            const rawSymbol = symbol.replace('/', '%2F');
            urls.push(`/api/historical/${rawSymbol}?timeframe=1d&limit=100`);
        }
        
        return urls;
    }
    
    // Try the next URL in our list
    function tryNextUrl() {
        const urlsToTry = getUrlsToTry().filter(url => !attemptedUrls.has(url));
        
        if (urlsToTry.length === 0) {
            console.log('[CHART DEBUG] No more URLs to try, falling back to mock data');
            fallbackToMockData();
            return;
        }
        
        const nextUrl = urlsToTry[0];
        attemptedUrls.add(nextUrl);
        
        console.log(`[CHART DEBUG] Trying URL (${attemptedUrls.size}/${getUrlsToTry().length}):`, nextUrl);
        
        fetch(nextUrl)
            .then(response => {
                console.log('[CHART DEBUG] API response status:', response.status);
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data || !Array.isArray(data) || data.length === 0) {
                    throw new Error('Invalid or empty data received');
                }
                
                console.log('[CHART DEBUG] Received historical data from API:', data.length, 'points');
                updatePriceChart(data);
                
                // Hide loading state
                if (chartContainer) {
                    chartContainer.classList.remove('loading');
                }
                
                // Start real-time updates for this symbol
                startRealtimeUpdates(symbol);
            })
            .catch(error => {
                console.warn(`[CHART DEBUG] Failed to fetch data from ${nextUrl}:`, error.message);
                
                // Increment retry count and try the next URL
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.log(`[CHART DEBUG] Will try another URL (${retryCount}/${maxRetries})`);
                    setTimeout(tryNextUrl, 300);
                } else {
                    console.log('[CHART DEBUG] Max retries reached, falling back to mock data');
                    fallbackToMockData();
                }
            });
    }
    
    function fallbackToMockData() {
        console.log('[CHART DEBUG] Generating mock data for', symbol);
        const mockData = generateMockData(symbol, 100);
        
        // Short delay for better UX
        setTimeout(() => {
            console.log('[CHART DEBUG] Using mock data with', mockData.length, 'points');
            updatePriceChart(mockData);
            
            // Hide loading state
            if (chartContainer) {
                chartContainer.classList.remove('loading');
            }
            
            // Start real-time updates with mock data
            startRealtimeUpdates(symbol, true);
        }, 300);
    }
    
    // Start trying URLs
    tryNextUrl();
}

// Start real-time data updates for charts
function startRealtimeUpdates(symbol, useMockData = false) {
    // Clear any existing update interval
    if (window.priceUpdateInterval) {
        clearInterval(window.priceUpdateInterval);
    }
    
    // For mock data, simulate price updates
    if (useMockData) {
        console.log('[CHART DEBUG] Starting mock real-time updates for', symbol);
        
        // Store last price and volume for incremental updates
        let lastPrice = 0;
        let lastVolume = 0;
        
        // Get initial values from chart if possible
        const priceSeries = window.chartManager?.timeSeries.get('price');
        if (priceSeries && priceSeries.data.length > 0) {
            const lastPoint = priceSeries.data[priceSeries.data.length - 1];
            lastPrice = lastPoint[1]; // value
        } else {
            // Set base price based on symbol
            if (symbol.includes('BTC')) lastPrice = 45000;
            else if (symbol.includes('ETH')) lastPrice = 2000;
            else if (symbol.includes('SOL')) lastPrice = 150;
            else lastPrice = 100;
        }
        
        // Create random walk updates every second
        window.priceUpdateInterval = setInterval(() => {
            // Generate new price with small random change
            const priceChange = (Math.random() - 0.5) * 0.002 * lastPrice;
            const newPrice = Math.max(0.01, lastPrice + priceChange);
            
            // Generate new volume
            const newVolume = lastVolume * 0.95 + Math.random() * lastPrice * 0.5;
            
            // Update chart
            if (window.chartManager) {
                window.chartManager.updatePriceData(newPrice, newVolume);
                
                // Update current price display
                const currentPriceElement = document.getElementById('currentPrice');
                if (currentPriceElement) {
                    currentPriceElement.textContent = formatCurrency(newPrice);
                }
                
                // Calculate and update price change
                const priceChangeElement = document.getElementById('priceChange');
                if (priceChangeElement && lastPrice > 0) {
                    const priceChangePercent = ((newPrice - lastPrice) / lastPrice) * 100;
                    priceChangeElement.textContent = `${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
                    priceChangeElement.className = `ms-2 ${priceChangePercent >= 0 ? 'text-success' : 'text-danger'}`;
                }
            }
            
            // Store for next update
            lastPrice = newPrice;
            lastVolume = newVolume;
        }, 1000);
    } else {
        // Use WebSocket for real updates if available
        console.log('[CHART DEBUG] Using WebSocket for real-time updates for', symbol);
        
        // Ensure we're subscribed to this symbol
        if (window.socket && window.socket.connected) {
            window.socket.emit('unsubscribe_all');
            window.socket.emit('subscribe', { symbol });
        }
        
        // Also poll for updates every 5 seconds as backup
        window.priceUpdateInterval = setInterval(() => {
            if (!window.socket || !window.socket.connected) {
                console.log('[CHART DEBUG] WebSocket not connected, fetching latest price via API');
                
                // Fetch latest price via API
                const encodedSymbol = encodeURIComponent(symbol);
                fetch(`/api/quote/${encodedSymbol}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`API returned ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Update chart with new price point
                        if (window.chartManager && data.price) {
                            window.chartManager.updatePriceData(data.price, data.volume || 0);
                            
                            // Update current price display
                            const currentPriceElement = document.getElementById('currentPrice');
                            if (currentPriceElement) {
                                currentPriceElement.textContent = formatCurrency(data.price);
                            }
                        }
                    })
                    .catch(error => {
                        console.warn('[CHART DEBUG] Failed to fetch latest price:', error.message);
                    });
            }
        }, 5000);
    }
}

// Generate mock price data for testing
function generateMockData(symbol, count = 100) {
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
        
        // Create OHLC data
        const open = price;
        const high = open * (1 + Math.random() * 0.015);
        const low = open * (1 - Math.random() * 0.015);
        const close = price * (1 + (Math.random() - 0.5) * 0.01);
        const volume = basePrice * Math.random() * 10;
        
        data.push({
            timestamp: date.toISOString(),
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: parseFloat(volume.toFixed(2))
        });
    }
    
    return data;
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
            value: parseFloat(value.toFixed(2)),
            signal: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'BUY' : 'SELL') : null
        });
    }
    
    console.log('[CHART DEBUG] Generated mock portfolio data with', data.length, 'points');
    return data;
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0);
}

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

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto btn-close-toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();

    // Remove toast from DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'filled':
            return 'success';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'danger';
        case 'rejected':
            return 'danger';
        default:
            return 'secondary';
    }
}

// Start periodic account updates
setInterval(updateAccountInfo, 30000); // Update every 30 seconds

// Export common functions
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatLargeNumber = formatLargeNumber;

// Initialize charts
async function initializeCharts() {
    try {
        console.log('[CHART DEBUG] Starting to initialize charts');
        
        // Initialize chart manager if it doesn't exist
        if (!window.chartManager) {
            console.log('[CHART DEBUG] Creating new chart manager');
            window.chartManager = createChartManager();
        }
        
        // Initialize price chart
        const priceCanvas = document.getElementById('priceChart');
        if (priceCanvas) {
            try {
                console.log('[CHART DEBUG] Initializing price chart');
                window.chartManager.initializePriceChart('priceChart');
            } catch (chartError) {
                console.error('[CHART DEBUG] Error initializing price chart:', chartError);
                
                // Create a fallback chart
                createFallbackPriceChart();
            }
        } else {
            console.warn('[CHART DEBUG] Price chart canvas not found');
        }
        
        // Initialize portfolio chart
        const portfolioCanvas = document.getElementById('portfolioChart');
        if (portfolioCanvas) {
            try {
                console.log('[CHART DEBUG] Initializing portfolio chart');
                window.chartManager.initializePortfolioChart('portfolioChart');
            } catch (chartError) {
                console.error('[CHART DEBUG] Error initializing portfolio chart:', chartError);
                
                // Create a fallback portfolio chart
                createFallbackPortfolioChart();
            }
        } else {
            console.warn('[CHART DEBUG] Portfolio chart canvas not found');
        }
        
        // Load default symbol data with fallback
        try {
            console.log('[CHART DEBUG] Loading default symbol data');
            selectSymbol('BTC/USD');
        } catch (symbolError) {
            console.error('[CHART DEBUG] Error loading default symbol:', symbolError);
            
            // Generate and use mock data
            try {
                console.log('[CHART DEBUG] Using mock data as fallback');
                const mockData = generateMockData('BTC/USD', 100);
                updatePriceChart(mockData);
                
                // Start real-time updates with mock data
                startRealtimeUpdates('BTC/USD', true);
            } catch (mockError) {
                console.error('[CHART DEBUG] Even mock data fallback failed:', mockError);
                showToast('Failed to display charts. Please refresh the page.', 'error');
            }
        }
    } catch (error) {
        console.error('[CHART DEBUG] Fatal error initializing charts:', error);
        showToast('Failed to initialize charts', 'error');
        
        // Last resort fallback
        try {
            console.log('[CHART DEBUG] Attempting last resort fallback');
            const mockData = generateMockData('BTC/USD', 100);
            
            // Display data in a very simple way if all else fails
            const container = document.getElementById('chartContainer');
            if (container) {
                container.innerHTML = '<div class="alert alert-warning">Chart rendering failed. Showing simplified data.</div>' +
                    '<div class="fallback-chart">' + mockData.map(d => 
                        `<div class="fallback-bar" style="height: ${d.close / 1000}px;" title="${new Date(d.timestamp).toLocaleDateString()}: $${d.close}"></div>`
                    ).join('') + '</div>';
            }
        } catch (e) {
            console.error('[CHART DEBUG] All fallbacks failed:', e);
        }
    }
}

// Create a fallback price chart using Canvas API directly
function createFallbackPriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    // Get a 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Generate mock data for the fallback chart
    const mockData = generateMockData('BTC/USD', 30);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a simple line chart
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3556FB';
    
    const padding = 30;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find min and max values
    const max = Math.max(...mockData.map(d => d.high));
    const min = Math.min(...mockData.map(d => d.low));
    const range = max - min;
    
    // Draw each point
    mockData.forEach((point, i) => {
        const x = padding + (i / (mockData.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.close - min) / range) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Add a semi-transparent fill
    const gradient = ctx.createLinearGradient(0, padding, 0, chartHeight + padding);
    gradient.addColorStop(0, 'rgba(53, 86, 251, 0.3)');
    gradient.addColorStop(1, 'rgba(53, 86, 251, 0.0)');
    
    ctx.lineTo(padding + chartWidth, canvas.height - padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add some basic axes
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Store the fallback chart reference
    window.fallbackPriceChart = {
        canvas: canvas,
        context: ctx,
        update: function(newData) {
            createFallbackPriceChart(); // Just redraw the chart
        }
    };
}

// Create a fallback portfolio chart 
function createFallbackPortfolioChart() {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas) return;
    
    // Get a 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Generate mock data for the fallback chart
    const mockData = generateMockPortfolioData('1m');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a simple line chart
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22c55e';
    
    const padding = 30;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find min and max values
    const values = mockData.map(d => parseFloat(d.value));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    
    // Draw each point
    mockData.forEach((point, i) => {
        const x = padding + (i / (mockData.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - min) / range) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Add a semi-transparent fill
    const gradient = ctx.createLinearGradient(0, padding, 0, chartHeight + padding);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
    
    ctx.lineTo(padding + chartWidth, canvas.height - padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add some basic axes
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Store the fallback chart reference
    window.fallbackPortfolioChart = {
        canvas: canvas,
        context: ctx,
        update: function(newData) {
            createFallbackPortfolioChart(); // Just redraw the chart
        }
    };
}

// Simple chart manager creation function
function createChartManager() {
    return {
        timeSeries: new Map(),
        charts: new Map(),
        
        initializePriceChart(canvasId) {
            console.log(`[CHART DEBUG] Initializing price chart on canvas ${canvasId}`);
            // Implementation depends on what chart library you're using
            // This is just a placeholder
            this.timeSeries.set('price', []);
            this.charts.set('price', {
                canvas: document.getElementById(canvasId),
                update: () => console.log('[CHART DEBUG] Updating price chart')
            });
        },
        
        initializePortfolioChart(canvasId) {
            console.log(`[CHART DEBUG] Initializing portfolio chart on canvas ${canvasId}`);
            // Implementation depends on what chart library you're using
            // This is just a placeholder
            this.timeSeries.set('portfolio', []);
            this.charts.set('portfolio', {
                canvas: document.getElementById(canvasId),
                update: () => console.log('[CHART DEBUG] Updating portfolio chart')
            });
        },
        
        loadHistoricalData(chartType, data) {
            console.log(`[CHART DEBUG] Loading historical data for ${chartType} chart`);
            this.timeSeries.set(chartType, data);
            // In a real implementation, this would update the chart
        },
        
        updatePriceData(price, volume) {
            console.log(`[CHART DEBUG] Updating real-time price: ${price}, volume: ${volume}`);
            // In a real implementation, this would add a data point to the chart
        }
    };
}

// Update price chart
function updatePriceChart(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('[CHART DEBUG] Invalid or empty data for price chart');
        return;
    }
    
    // Update current price and price change if elements exist
    if (data.length >= 2) {
        const firstPrice = data[0].close;
        const lastPrice = data[data.length - 1].close;
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        
        // Update price change indicator if it exists
        const priceChangeElement = document.getElementById('priceChange');
        if (priceChangeElement) {
            priceChangeElement.textContent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
            priceChangeElement.className = `ms-2 ${priceChange >= 0 ? 'text-success' : 'text-danger'}`;
        }
        
        // Update current price if element exists
        const currentPriceElement = document.getElementById('currentPrice');
        if (currentPriceElement) {
            currentPriceElement.textContent = formatCurrency(lastPrice);
        }
    }
    
    // If using Smoothie Charts, load the data into the chart
    if (window.chartManager) {
        try {
            // Load all historical data
            window.chartManager.loadHistoricalData('price', data);
            
            // Also update volume if available
            if (data[0].volume) {
                window.chartManager.loadHistoricalData('volume', data.map(point => ({
                    timestamp: point.timestamp,
                    close: point.volume
                })));
            }
            
            console.log('[CHART DEBUG] Updated SmoothieChart with historical data');
        } catch (error) {
            console.error('[CHART DEBUG] Error updating SmoothieChart:', error);
        }
        return;
    }
    
    // Fallback to Chart.js if SmoothieChart is not available
    if (window.priceChart) {
        console.log('[CHART DEBUG] Falling back to Chart.js');
        // Clear existing data
        window.priceChart.data.datasets[0].data = [];
        
        // Add new data points
        data.forEach(point => {
            window.priceChart.data.datasets[0].data.push({
                x: new Date(point.timestamp),
                y: point.close,
                open: point.open,
                high: point.high,
                low: point.low,
                volume: point.volume
            });
        });
        
        // Update chart label with current symbol
        window.priceChart.data.datasets[0].label = window.currentSymbol;
        
        // Update chart
        window.priceChart.update();
    }
}

// Update portfolio chart
function updatePortfolioChart(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('[CHART DEBUG] Invalid or empty data for portfolio chart');
        return;
    }
    
    // If using Smoothie Charts, load the data into the chart
    if (window.chartManager) {
        try {
            window.chartManager.loadHistoricalData('portfolio', data);
            console.log('[CHART DEBUG] Updated portfolio SmoothieChart with historical data');
        } catch (error) {
            console.error('[CHART DEBUG] Error updating portfolio SmoothieChart:', error);
        }
        return;
    }
    
    // Fallback to Chart.js if SmoothieChart is not available
    if (window.portfolioChart) {
        // Clear existing data
        window.portfolioChart.data.datasets[0].data = [];
        
        // Add new data points
        data.forEach(point => {
            window.portfolioChart.data.datasets[0].data.push({
                x: new Date(point.timestamp),
                y: point.value
            });
        });
        
        // Update chart
        window.portfolioChart.update();
    }
}

// Handle order updates
function handleOrderUpdate(data) {
    // Update orders table
    const ordersTable = document.getElementById('ordersTable');
    if (ordersTable) {
        const newRow = `
            <tr>
                <td>${data.symbol}</td>
                <td>${data.side}</td>
                <td>${data.quantity}</td>
                <td>${formatCurrency(data.price)}</td>
                <td><span class="badge bg-${getStatusColor(data.status)}">${data.status}</span></td>
            </tr>
        `;
        ordersTable.querySelector('tbody').insertAdjacentHTML('afterbegin', newRow);
    }
    
    // Show notification
    showToast(`Order ${data.status}: ${data.side} ${data.quantity} ${data.symbol} @ ${formatCurrency(data.price)}`, 'info');
}

// Symbol selector functionality
function initSymbolSelector(container, onSelect) {
    const input = container.querySelector('.symbol-input');
    const suggestions = container.querySelector('.symbol-suggestions');
    const selectedSymbols = container.querySelector('.selected-symbols');
    let debounceTimeout;

    function addSymbol(symbol) {
        const badge = document.createElement('div');
        badge.className = 'symbol-badge';
        badge.innerHTML = `${symbol}<span class="remove">×</span>`;
        
        badge.querySelector('.remove').addEventListener('click', () => {
            badge.remove();
            if (onSelect) {
                onSelect(Array.from(selectedSymbols.children).map(b => 
                    b.textContent.replace('×', '').trim()
                ));
            }
        });

        selectedSymbols.appendChild(badge);
        input.value = '';
        suggestions.style.display = 'none';

        if (onSelect) {
            onSelect(Array.from(selectedSymbols.children).map(b => 
                b.textContent.replace('×', '').trim()
            ));
        }
    }

    input.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = input.value.trim();
            if (query) {
                fetch(`/api/symbols?search=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        suggestions.innerHTML = data.map(symbol => `
                            <div class="symbol-suggestion">
                                <span class="symbol">${symbol.symbol}</span>
                                <span class="price">${formatCurrency(symbol.price)}</span>
                            </div>
                        `).join('');
                        suggestions.style.display = 'block';

                        suggestions.querySelectorAll('.symbol-suggestion').forEach(suggestion => {
                            suggestion.addEventListener('click', () => {
                                const symbol = suggestion.querySelector('.symbol').textContent;
                                addSymbol(symbol);
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching symbols:', error);
                    });
            } else {
                suggestions.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });

    return {
        getSelectedSymbols: () => Array.from(selectedSymbols.children).map(b => 
            b.textContent.replace('×', '').trim()
        ),
        setSelectedSymbols: (symbols) => {
            selectedSymbols.innerHTML = '';
            symbols.forEach(addSymbol);
        },
        clearSelectedSymbols: () => {
            selectedSymbols.innerHTML = '';
        }
    };
}

// Initialize trading controls
function initializeTradingControls() {
    const startBtn = document.getElementById('startTradingBtn');
    const pauseBtn = document.getElementById('pauseTradingBtn');
    const stopBtn = document.getElementById('stopTradingBtn');

    if (startBtn && pauseBtn && stopBtn) {
        startBtn.addEventListener('click', () => {
            fetch('/api/trading/start', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showToast(data.error, 'error');
                    } else {
                        showToast('Trading started successfully', 'success');
                        updateTradingStatus();
                    }
                })
                .catch(error => {
                    showToast('Failed to start trading', 'error');
                });
        });

        pauseBtn.addEventListener('click', () => {
            fetch('/api/trading/pause', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showToast(data.error, 'error');
                    } else {
                        showToast('Trading paused successfully', 'success');
                        updateTradingStatus();
                    }
                })
                .catch(error => {
                    showToast('Failed to pause trading', 'error');
                });
        });

        stopBtn.addEventListener('click', () => {
            fetch('/api/trading/stop', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showToast(data.error, 'error');
                    } else {
                        showToast('Trading stopped successfully', 'success');
                        updateTradingStatus();
                    }
                })
                .catch(error => {
                    showToast('Failed to stop trading', 'error');
                });
        });
    }
}

// Initialize strategy form
function initializeStrategyForm() {
    const form = document.getElementById('addNewStrategyForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const selectedSymbols = document.querySelector('.symbol-selector')?.querySelector('.selected-symbols')?.children;
        if (!selectedSymbols?.length) {
            showToast('Please select at least one symbol', 'error');
            return;
        }

        // Get array of symbols
        const symbols = Array.from(selectedSymbols).map(badge => badge.textContent.trim().replace('×', ''));
        
        // Create a strategy for each symbol
        const promises = symbols.map(symbol => {
            const strategyData = {
                symbol: symbol,  // Single symbol per strategy
                type: document.getElementById('strategySelect').value,
                capital: parseFloat(document.getElementById('capitalPerStrategy').value),
                risk_per_trade: parseFloat(document.getElementById('riskPerTrade').value),
                parameters: {}
            };

            // Validate required fields
            if (!strategyData.type) {
                showToast('Please select a strategy type', 'error');
                return Promise.reject('Invalid strategy type');
            }

            return fetch('/api/strategies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(strategyData)
            })
            .then(response => response.json());
        });

        // Wait for all strategies to be created
        Promise.all(promises)
            .then(results => {
                const errors = results.filter(data => data.error);
                if (errors.length > 0) {
                    showToast(`Failed to add some strategies: ${errors.map(e => e.error).join(', ')}`, 'error');
                } else {
                    showToast('Strategies added successfully', 'success');
                    form.reset();
                    // Clear symbol selector
                    const symbolSelector = document.querySelector('.symbol-selector');
                    if (symbolSelector) {
                        symbolSelector.querySelector('.selected-symbols').innerHTML = '';
                    }
                    // Refresh active strategies table
                    updateActiveStrategies();
                }
            })
            .catch(error => {
                showToast('Failed to add strategies', 'error');
            });
    });
}

// Update trading status
function updateTradingStatus() {
    fetch('/api/trading/status')
        .then(response => response.json())
        .then(data => {
            const startBtn = document.getElementById('startTradingBtn');
            const pauseBtn = document.getElementById('pauseTradingBtn');
            const stopBtn = document.getElementById('stopTradingBtn');

            if (startBtn && pauseBtn && stopBtn) {
                startBtn.disabled = data.is_trading;
                pauseBtn.disabled = !data.is_trading;
                stopBtn.disabled = !data.is_trading;
            }

            const statusIndicator = document.getElementById('tradingStatus');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${data.is_trading ? 'online' : 'offline'}`;
                statusIndicator.textContent = data.is_trading ? 'Active' : 'Inactive';
            }
        })
        .catch(error => {
            console.error('Error updating trading status:', error);
        });
}

// Update active strategies
function updateActiveStrategies() {
    const tableBody = document.getElementById('activeStrategies');
    if (!tableBody) return;

    fetch('/api/strategies')
        .then(response => response.json())
        .then(strategies => {
            if (strategies.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No active strategies</td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = strategies.map(strategy => `
                <tr>
                    <td>${strategy.symbol}</td>
                    <td>${strategy.type}</td>
                    <td>
                        <span class="badge ${strategy.current_signal === 'BUY' ? 'bg-success' : 
                                          strategy.current_signal === 'SELL' ? 'bg-danger' : 'bg-secondary'}">
                            ${strategy.current_signal || 'NEUTRAL'}
                        </span>
                    </td>
                    <td>${strategy.position_size || 0}</td>
                    <td>${formatCurrency(strategy.current_price || 0)}</td>
                    <td>${Object.entries(strategy.parameters || {}).map(([key, value]) => 
                        `${key}: ${value}`).join(', ')}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="removeStrategy('${strategy.symbol}', '${strategy.type}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => {
            console.error('Error updating active strategies:', error);
            showToast('Error updating strategies', 'error');
        });
}

// Remove strategy
function removeStrategy(symbol, strategyType) {
    fetch(`/api/strategies/${symbol}/${strategyType}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'error');
        } else {
            showToast('Strategy removed successfully', 'success');
            updateActiveStrategies();
        }
    })
    .catch(error => {
        showToast('Failed to remove strategy', 'error');
    });
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

// Function to load historical account value data
function loadAccountHistory() {
    fetch('/api/account/history')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch account history');
            }
            return response.json();
        })
        .then(data => {
            console.log('[CHART DEBUG] Received account history data:', data.length, 'points');
            
            // Mark as loaded
            window.accountHistoryLoaded = true;
            
            // Update portfolio chart with historical data
            updatePortfolioChart(data);
        })
        .catch(error => {
            console.warn('[CHART DEBUG] Failed to load account history, using mock data:', error.message);
            
            // Generate mock account history if API fails
            const mockAccountHistory = generateMockAccountHistory();
            updatePortfolioChart(mockAccountHistory);
            
            // Still mark as loaded to prevent repeated attempts
            window.accountHistoryLoaded = true;
        });
}

// Function to generate mock account history data
function generateMockAccountHistory(days = 30) {
    console.log('[CHART DEBUG] Generating mock account history data');
    const mockData = [];
    const now = new Date();
    
    // Start with a base value
    let accountValue = 10000;
    
    // Generate data points for each day
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Add some random change to account value (from -1% to +1.5%)
        const change = (Math.random() * 2.5 - 1) / 100;
        accountValue *= (1 + change);
        
        mockData.push({
            timestamp: date.toISOString(),
            value: accountValue,
            change: change * 100 // Store percentage change
        });
    }
    
    return mockData;
}

// Update ticker display with latest price data
function updateTickerDisplay(data) {
    if (!data || !data.symbol || !data.price) return;
    
    // Find any ticker elements for this symbol
    const tickerElements = document.querySelectorAll(`.ticker-item[data-symbol="${data.symbol}"]`);
    tickerElements.forEach(element => {
        // Update price
        const priceElement = element.querySelector('.ticker-price');
        if (priceElement) {
            priceElement.textContent = formatCurrency(data.price);
            
            // Add a flash effect
            priceElement.classList.add('price-flash');
            setTimeout(() => {
                priceElement.classList.remove('price-flash');
            }, 500);
        }
        
        // Update change if we have previous close data
        if (data.previous_close) {
            const changeElement = element.querySelector('.ticker-change');
            if (changeElement) {
                const change = ((data.price - data.previous_close) / data.previous_close) * 100;
                changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                changeElement.className = `ticker-change ${change >= 0 ? 'text-success' : 'text-danger'}`;
            }
        }
    });
} 