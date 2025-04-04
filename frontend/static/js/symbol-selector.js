// Symbol Selector Component
class SymbolSelector {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        // Create the DOM structure
        this.container.innerHTML = `
            <div class="symbol-input-container mb-2">
                <input type="text" class="form-control symbol-input" placeholder="Search for symbols (e.g. BTC/USD)">
                <div class="symbol-suggestions"></div>
            </div>
            <div class="selected-symbols-container">
                <div class="selected-symbols"></div>
            </div>
        `;

        // Get references to elements
        this.input = this.container.querySelector('.symbol-input');
        this.suggestions = this.container.querySelector('.symbol-suggestions');
        this.selectedSymbolsContainer = this.container.querySelector('.selected-symbols');

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        let debounceTimeout;

        // Input event for search
        this.input.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const query = this.input.value.trim();
                if (query.length >= 2) {
                    this.searchSymbols(query);
                } else {
                    this.suggestions.style.display = 'none';
                }
            }, 300);
        });

        // Focus event to show suggestions if there's text
        this.input.addEventListener('focus', () => {
            const query = this.input.value.trim();
            if (query.length >= 2) {
                this.searchSymbols(query);
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.suggestions.style.display = 'none';
            }
        });

        // Prevent form submission on Enter in search input
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // If there's only one suggestion, select it
                const suggestions = this.suggestions.querySelectorAll('.symbol-suggestion');
                if (suggestions.length === 1) {
                    suggestions[0].click();
                }
            }
        });
    }

    searchSymbols(query) {
        // Show loading indicator in suggestions
        this.suggestions.innerHTML = '<div class="dropdown-item">Searching...</div>';
        this.suggestions.style.display = 'block';
        
        fetch(`/api/symbols?search=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                // Format can be either {symbols: [...]} or directly an array
                const symbols = Array.isArray(data) ? data : (data.symbols || []);
                
                if (symbols.length === 0) {
                    this.suggestions.innerHTML = '<div class="dropdown-item text-muted">No symbols found</div>';
                    return;
                }

                this.suggestions.innerHTML = '';
                symbols.forEach(symbol => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item symbol-suggestion';
                    
                    // Handle both object format and string format
                    if (typeof symbol === 'object') {
                        const price = symbol.price ? window.formatCurrency(symbol.price) : '';
                        const change = symbol.change ? 
                            `<span class="${symbol.change >= 0 ? 'text-success' : 'text-danger'}">
                                ${symbol.change >= 0 ? '+' : ''}${symbol.change.toFixed(2)}%
                            </span>` : '';
                        
                        item.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>${symbol.symbol}</strong>
                                <div>${price} ${change}</div>
                            </div>
                        `;
                        item.dataset.symbol = symbol.symbol;
                    } else {
                        item.innerHTML = `<strong>${symbol}</strong>`;
                        item.dataset.symbol = symbol;
                    }
                    
                    item.addEventListener('click', () => {
                        this.addSymbol(item.dataset.symbol);
                        this.suggestions.style.display = 'none';
                        this.input.value = '';
                        this.input.focus();
                    });
                    
                    this.suggestions.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Error searching symbols:', error);
                this.suggestions.innerHTML = '<div class="dropdown-item text-danger">Error searching symbols</div>';
            });
    }

    addSymbol(symbolText) {
        // Check if symbol already exists
        const existingSymbols = this.getSelectedSymbols();
        if (existingSymbols.includes(symbolText)) {
            return;
        }

        const badge = document.createElement('div');
        badge.className = 'badge bg-primary symbol-badge';
        badge.innerHTML = `${symbolText} <span class="symbol-remove">&times;</span>`;
        
        badge.querySelector('.symbol-remove').addEventListener('click', () => {
            badge.remove();
            this.triggerChange();
        });

        this.selectedSymbolsContainer.appendChild(badge);
        this.triggerChange();
    }

    getSelectedSymbols() {
        return Array.from(this.selectedSymbolsContainer.querySelectorAll('.symbol-badge'))
            .map(badge => badge.textContent.replace('×', '').trim());
    }

    clearSelectedSymbols() {
        this.selectedSymbolsContainer.innerHTML = '';
        this.triggerChange();
    }

    setSelectedSymbols(symbols) {
        this.clearSelectedSymbols();
        symbols.forEach(symbol => this.addSymbol(symbol));
    }

    triggerChange() {
        // Dispatch a custom event when the selection changes
        const event = new CustomEvent('symbolsChange', {
            detail: {
                symbols: this.getSelectedSymbols()
            }
        });
        this.container.dispatchEvent(event);
    }
}

// Initialize all symbol selectors on the page
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.symbol-selector').forEach(container => {
        const selector = new SymbolSelector(container);
        
        // Store the selector instance on the container element
        container.symbolSelector = selector;
    });
}); 