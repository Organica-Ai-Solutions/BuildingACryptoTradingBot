// Global variables
let activeStrategies = [];
let availableSymbols = [];
let updateInterval = null;
const UPDATE_INTERVAL = 30000; // 30 seconds

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    initializeStrategiesPage();
});

// Initialize strategies page
async function initializeStrategiesPage() {
    try {
        showLoadingState(true);
        await Promise.all([
            fetchActiveStrategies(),
            fetchAvailableSymbols()
        ]);
        initializeEventListeners();
        startPeriodicUpdates();
        showLoadingState(false);
    } catch (error) {
        console.error('Failed to initialize strategies page:', error);
        showNotification('Error', 'Failed to initialize strategies page', 'error');
        showLoadingState(false);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Add strategy form submission
    const form = document.getElementById('addStrategyForm');
    if (form) {
        form.addEventListener('submit', handleStrategyFormSubmit);
    }
    
    // Strategy type change handler
    const strategyTypeSelect = document.getElementById('strategyType');
    if (strategyTypeSelect) {
        strategyTypeSelect.addEventListener('change', handleStrategyTypeChange);
    }
    
    // Delete strategy buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-strategy-btn')) {
            const strategyId = e.target.closest('.remove-strategy-btn').dataset.id;
            handleDeleteStrategy(strategyId);
        }
    });

    // Strategy toggle buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.toggle-strategy-btn')) {
            const btn = e.target.closest('.toggle-strategy-btn');
            const strategyId = btn.dataset.id;
            const isActive = btn.dataset.active === 'true';
            handleToggleStrategy(strategyId, !isActive);
        }
    });
}

// Start periodic updates
function startPeriodicUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(async () => {
        try {
            await fetchActiveStrategies();
        } catch (error) {
            console.error('Failed to update strategies:', error);
        }
    }, UPDATE_INTERVAL);
}

// Show/hide loading state
function showLoadingState(loading) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loading) {
        if (!loadingOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
    } else if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Fetch active strategies
async function fetchActiveStrategies() {
    try {
        const response = await fetch('/api/strategies');
        if (!response.ok) {
            throw new Error('Failed to fetch strategies');
        }
        const data = await response.json();
        activeStrategies = Array.isArray(data) ? data : [];
        updateStrategiesTable();
        updatePerformanceTable();
    } catch (error) {
        console.error('Failed to fetch active strategies:', error);
        showNotification('Error', 'Failed to fetch active strategies', 'error');
    }
}

// Fetch available symbols
async function fetchAvailableSymbols() {
    try {
        console.log("Fetching available symbols for strategies page");
        
        const response = await fetch('/api/symbols');
        if (!response.ok) {
            throw new Error(`Failed to fetch symbols: ${response.status} ${response.statusText}`);
        }
        
        // Safely parse the response
        let data;
        try {
            data = await response.json();
            console.log("Raw API response:", data);
        } catch (e) {
            console.error("Error parsing API response:", e);
            data = [];
        }
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.warn("API did not return an array, defaulting to empty array");
            data = [];
        }
        
        // Process the data into a consistent format
        availableSymbols = [];
        
        // Process each symbol
        for (let i = 0; i < data.length; i++) {
            try {
                const item = data[i];
                
                // Skip null/undefined values
                if (item === null || item === undefined) continue;
                
                // Handle string format
                if (typeof item === 'string') {
                    availableSymbols.push({
                        symbol: item,
                        price: 0,
                        change_24h: 0
                    });
                }
                // Handle object format
                else if (typeof item === 'object' && item.symbol) {
                    availableSymbols.push({
                        symbol: item.symbol,
                        price: item.price || 0,
                        change_24h: item.change_24h || 0
                    });
                }
                else {
                    console.warn("Skipping invalid symbol format:", item);
                }
            } catch (error) {
                console.error("Error processing symbol:", error);
            }
        }
        
        console.log("Processed symbols for strategies:", availableSymbols.length);
        updateSymbolSelect();
    } catch (error) {
        console.error("Failed to fetch symbols:", error);
        showNotification('Error', 'Failed to fetch symbols: ' + error.message, 'error');
        // Initialize with empty array to prevent further errors
        availableSymbols = [];
        updateSymbolSelect();
    }
}

// Update strategies table
function updateStrategiesTable() {
    const tbody = document.querySelector('#strategiesTable tbody');
    const noStrategies = document.getElementById('noStrategies');
    
    if (!activeStrategies.length) {
        tbody.innerHTML = '';
        noStrategies.classList.remove('d-none');
        return;
    }
    
    noStrategies.classList.add('d-none');
    tbody.innerHTML = activeStrategies.map(strategy => `
        <tr>
            <td>${strategy.symbol}</td>
            <td>${strategy.type}</td>
            <td>${formatParameters(strategy.parameters)}</td>
            <td>
                <span class="badge ${getSignalClass(strategy.current_signal)}">
                    ${strategy.current_signal || 'NEUTRAL'}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary toggle-strategy-btn" 
                            data-id="${strategy.id}" 
                            data-active="${strategy.is_active}">
                        <i class="bi bi-${strategy.is_active ? 'pause' : 'play'}"></i>
                        ${strategy.is_active ? 'Pause' : 'Start'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger remove-strategy-btn" data-id="${strategy.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update performance table
function updatePerformanceTable() {
    const tbody = document.querySelector('#performanceTable tbody');
    tbody.innerHTML = activeStrategies.map(strategy => `
        <tr>
            <td>${strategy.type}</td>
            <td>${strategy.symbol}</td>
            <td>${formatPercentage(strategy.win_rate || 0)}%</td>
            <td>${strategy.total_trades || 0}</td>
            <td class="${getPnlClass(strategy.pnl)}">
                ${formatPnl(strategy.pnl)}
            </td>
            <td>
                <span class="badge ${getSignalClass(strategy.current_signal)}">
                    ${strategy.current_signal || 'NEUTRAL'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Update symbol select dropdown
function updateSymbolSelect() {
    const select = document.getElementById('symbol');
    if (select) {
        select.innerHTML = '<option value="">Select a symbol...</option>';
        
        if (Array.isArray(availableSymbols)) {
            availableSymbols.forEach(symbol => {
                // Handle both string and object formats
                const symbolValue = typeof symbol === 'string' ? symbol : symbol.symbol;
                if (symbolValue) {
                    const option = document.createElement('option');
                    option.value = symbolValue;
                    option.textContent = symbolValue;
                    select.appendChild(option);
                }
            });
        }
    }
}

// Handle strategy form submission
async function handleStrategyFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        symbol: document.getElementById('symbol').value,
        type: document.getElementById('strategyType').value,
        parameters: getStrategyParameters()
    };
    
    if (!formData.symbol || !formData.type) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    try {
        showLoadingState(true);
        const response = await fetch('/api/strategies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Success', 'Strategy added successfully', 'success');
            document.getElementById('addStrategyModal').querySelector('.btn-close').click();
            await fetchActiveStrategies();
        } else {
            showNotification('Error', data.error || 'Failed to add strategy', 'error');
        }
    } catch (error) {
        console.error('Failed to add strategy:', error);
        showNotification('Error', 'Failed to add strategy', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Handle strategy type change
function handleStrategyTypeChange() {
    const type = document.getElementById('strategyType').value;
    const parametersDiv = document.getElementById('strategyParameters');
    
    if (!type) {
        parametersDiv.innerHTML = '';
        return;
    }
    
    // Show relevant parameters based on strategy type
    if (type === 'supertrend') {
        parametersDiv.innerHTML = `
            <div class="mb-3">
                <label class="form-label">ATR Period</label>
                <input type="number" class="form-control" name="atr_period" value="10" min="1">
            </div>
            <div class="mb-3">
                <label class="form-label">Multiplier</label>
                <input type="number" class="form-control" name="multiplier" value="3" step="0.1" min="0.1">
            </div>
        `;
    } else if (type === 'macd') {
        parametersDiv.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Fast Period</label>
                <input type="number" class="form-control" name="macd_fast" value="12" min="1">
            </div>
            <div class="mb-3">
                <label class="form-label">Slow Period</label>
                <input type="number" class="form-control" name="macd_slow" value="26" min="1">
            </div>
            <div class="mb-3">
                <label class="form-label">Signal Period</label>
                <input type="number" class="form-control" name="macd_signal" value="9" min="1">
            </div>
        `;
    }
}

// Handle strategy deletion
async function handleDeleteStrategy(strategyId) {
    if (!confirm('Are you sure you want to delete this strategy?')) {
        return;
    }
    
    try {
        showLoadingState(true);
        const response = await fetch(`/api/strategies/${strategyId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Success', 'Strategy deleted successfully', 'success');
            await fetchActiveStrategies();
        } else {
            showNotification('Error', data.error || 'Failed to delete strategy', 'error');
        }
    } catch (error) {
        console.error('Failed to delete strategy:', error);
        showNotification('Error', 'Failed to delete strategy', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Handle strategy toggle
async function handleToggleStrategy(strategyId, activate) {
    try {
        showLoadingState(true);
        const response = await fetch(`/api/strategies/${strategyId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active: activate })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Success', `Strategy ${activate ? 'activated' : 'paused'} successfully`, 'success');
            await fetchActiveStrategies();
        } else {
            showNotification('Error', data.error || 'Failed to update strategy', 'error');
        }
    } catch (error) {
        console.error('Failed to toggle strategy:', error);
        showNotification('Error', 'Failed to update strategy', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Helper functions
function getStrategyParameters() {
    const parameters = {};
    const inputs = document.getElementById('strategyParameters').querySelectorAll('input');
    inputs.forEach(input => {
        parameters[input.name] = input.type === 'number' ? parseFloat(input.value) : input.value;
    });
    return parameters;
}

function formatParameters(parameters) {
    if (!parameters) return 'Default';
    try {
        const params = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
        return Object.entries(params)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    } catch (e) {
        return 'Invalid parameters';
    }
}

function formatPercentage(value) {
    return parseFloat(value).toFixed(2);
}

function formatPnl(pnl) {
    if (!pnl) return '0.00%';
    const value = parseFloat(pnl);
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function getPnlClass(pnl) {
    if (!pnl) return '';
    return parseFloat(pnl) >= 0 ? 'text-success' : 'text-danger';
}

function getSignalClass(signal) {
    switch (signal?.toUpperCase()) {
        case 'BUY':
            return 'bg-success';
        case 'SELL':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Show notification
function showNotification(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">${title}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    const container = document.querySelector('.toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}); 