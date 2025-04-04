$(document).ready(function() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Global variables
    let currentSettings = null;
    let loadingSettings = false;
    let tradingStatusInterval = null;

    // Show loading state
    function showLoading(loading) {
        loadingSettings = loading;
        const loadingOverlay = $('#loadingOverlay');
        if (loading) {
            loadingOverlay.fadeIn(200);
        } else {
            loadingOverlay.fadeOut(200);
        }
    }

    // Show notification toast
    function showToast(message, type = 'info') {
        const toast = $(`
            <div class="toast" role="alert">
                <div class="toast-header ${type}-toast">
                    <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `);
        
        $('.toast-container').append(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.on('hidden.bs.toast', function() {
            toast.remove();
        });
    }

    // Update API key status indicators
    function updateApiKeyStatus() {
        const paperStatus = $('#paperApiStatus');
        const liveStatus = $('#liveApiStatus');
        
        if (currentSettings) {
            paperStatus.text(currentSettings.has_paper_credentials ? 'Configured' : 'Not Configured')
                      .removeClass('text-warning text-success text-danger')
                      .addClass(currentSettings.has_paper_credentials ? 'text-success' : 'text-warning');
            
            liveStatus.text(currentSettings.has_live_credentials ? 'Configured' : 'Not Configured')
                     .removeClass('text-warning text-success text-danger')
                     .addClass(currentSettings.has_live_credentials ? 'text-success' : 'text-warning');
        }
    }

    // Update account information
    function updateAccountInfo(info) {
        if (info) {
            $('#accountStatus').text(info.status || '-')
                             .removeClass('text-warning text-success text-danger')
                             .addClass(info.status === 'ACTIVE' ? 'text-success' : 'text-warning');
            $('#accountEquity').text(formatCurrency(info.portfolio_value));
            $('#accountCash').text(formatCurrency(info.cash));
            $('#accountBuyingPower').text(formatCurrency(info.buying_power));
        } else {
            $('#accountStatus').text('-').removeClass('text-success text-warning text-danger');
            $('#accountEquity').text(formatCurrency(0));
            $('#accountCash').text(formatCurrency(0));
            $('#accountBuyingPower').text(formatCurrency(0));
        }
    }

    // Format currency
    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    }

    // Update trading status indicators
    async function updateTradingStatus() {
        try {
            const response = await fetch('/api/trading/status');
            if (!response.ok) throw new Error('Failed to fetch trading status');
            
            const status = await response.json();
            
            // Update trading status badge
            const tradingStatusBadge = $('#tradingStatusBadge');
            if (status.is_running) {
                tradingStatusBadge.text('Trading: Active')
                               .removeClass('bg-secondary bg-danger bg-warning')
                               .addClass('bg-success');
            } else if (status.is_ready) {
                tradingStatusBadge.text('Trading: Ready')
                               .removeClass('bg-secondary bg-danger bg-success')
                               .addClass('bg-warning');
            } else {
                tradingStatusBadge.text('Trading: Inactive')
                               .removeClass('bg-secondary bg-success bg-warning')
                               .addClass('bg-danger');
            }
            
            // Update trading mode badge
            const tradingModeBadge = $('#tradingModeBadge');
            if (status.simulation_mode) {
                tradingModeBadge.text('Mode: Simulation')
                             .removeClass('bg-secondary bg-success')
                             .addClass('bg-info');
            } else {
                tradingModeBadge.text('Mode: Real Trading')
                             .removeClass('bg-secondary bg-info')
                             .addClass('bg-success');
            }
            
            // Add tooltip with extra information
            tradingStatusBadge.attr('title', status.message)
                           .tooltip('dispose')
                           .tooltip();
            
            tradingModeBadge.attr('title', `Active Strategies: ${status.active_strategies}`)
                         .tooltip('dispose')
                         .tooltip();
                         
        } catch (error) {
            console.error('Error fetching trading status:', error);
            $('#tradingStatusBadge').text('Trading: Unknown')
                                 .removeClass('bg-success bg-warning bg-info')
                                 .addClass('bg-secondary')
                                 .attr('title', 'Failed to fetch trading status')
                                 .tooltip('dispose')
                                 .tooltip();
                                 
            $('#tradingModeBadge').text('Mode: Unknown')
                               .removeClass('bg-success bg-info')
                               .addClass('bg-secondary')
                               .attr('title', 'Failed to fetch trading mode')
                               .tooltip('dispose')
                               .tooltip();
        }
    }

    // Load settings from server
    async function loadSettings() {
        try {
            showLoading(true);
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error('Failed to load settings');
            
            currentSettings = await response.json();
            
            // Update trading environment
            $('#isPaperTrading').prop('checked', currentSettings.tradingEnvironment === 'paper');
            
            // Show/hide appropriate trading settings
            if (currentSettings.tradingEnvironment === 'paper') {
                $('#paperTradingSettings').show();
                $('#liveTradingSettings').hide();
            } else {
                $('#paperTradingSettings').hide();
                $('#liveTradingSettings').show();
            }
            
            // Update trading settings
            $('#maxPositionSize').val(currentSettings.maxPositionSize);
            $('#riskPerTrade').val(currentSettings.riskPerTrade);
            $('#stopLossPercent').val(currentSettings.stopLossPercent);
            $('#takeProfitPercent').val(currentSettings.takeProfitPercent);
            $('#maxOpenTrades').val(currentSettings.maxOpenTrades);
            $('#trailingStopPercent').val(currentSettings.trailingStopPercent);
            
            // Update notification settings
            $('#emailNotifications').prop('checked', currentSettings.emailNotifications);
            $('#emailAddress').val(currentSettings.emailAddress);
            $('#notifyTrades').prop('checked', currentSettings.notifyTrades);
            $('#notifySignals').prop('checked', currentSettings.notifySignals);
            $('#notifyErrors').prop('checked', currentSettings.notifyErrors);
            
            // Show/hide email settings
            $('#emailSettings').toggle(currentSettings.emailNotifications);
            
            // Update API key status
            updateApiKeyStatus();
            
            // Test credentials and update account info
            await testApiCredentials();
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Failed to load settings: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Save settings to server
    async function saveSettings(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            // Collect form data
            const formData = {
                tradingEnvironment: $('#isPaperTrading').is(':checked') ? 'paper' : 'live',
                paperTrading: {
                    apiKey: $('#paperApiKey').val().trim(),
                    apiSecret: $('#paperApiSecret').val().trim()
                },
                liveTrading: {
                    apiKey: $('#liveApiKey').val().trim(),
                    apiSecret: $('#liveApiSecret').val().trim()
                },
                maxPositionSize: parseFloat($('#maxPositionSize').val()),
                riskPerTrade: parseFloat($('#riskPerTrade').val()),
                stopLossPercent: parseFloat($('#stopLossPercent').val()),
                takeProfitPercent: parseFloat($('#takeProfitPercent').val()),
                maxOpenTrades: parseInt($('#maxOpenTrades').val()),
                trailingStopPercent: parseFloat($('#trailingStopPercent').val()),
                emailNotifications: $('#emailNotifications').is(':checked'),
                emailAddress: $('#emailAddress').val().trim(),
                notifyTrades: $('#notifyTrades').is(':checked'),
                notifySignals: $('#notifySignals').is(':checked'),
                notifyErrors: $('#notifyErrors').is(':checked')
            };
            
            // Save settings
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to save settings');
            }
            
            // Clear API key fields
            $('#paperApiKey, #paperApiSecret, #liveApiKey, #liveApiSecret').val('');
            
            // Update current settings
            currentSettings = result.settings;
            
            // Update UI
            updateApiKeyStatus();
            
            // Test credentials if provided
            if ((formData.paperTrading.apiKey && formData.paperTrading.apiSecret) ||
                (formData.liveTrading.apiKey && formData.liveTrading.apiSecret)) {
                await testApiCredentials();
            }
            
            showToast('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Failed to save settings: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Test API credentials
    async function testApiCredentials(event) {
        try {
            showLoading(true);
            
            // Determine which credentials to test based on button clicked or current mode
            const buttonId = event ? $(event.target).attr('id') : null;
            const isTestingPaper = buttonId === 'testPaperCredentials' || 
                                  (currentSettings && currentSettings.tradingEnvironment === 'paper');
            
            // Get the appropriate credentials
            let apiKey, apiSecret;
            
            if (isTestingPaper) {
                apiKey = $('#paperApiKey').val().trim() || (currentSettings && currentSettings.has_paper_credentials ? currentSettings.paper_api_key : '');
                apiSecret = $('#paperApiSecret').val().trim();
                // If no new secret provided and we have existing credentials, use a placeholder to indicate existing value
                if (!apiSecret && currentSettings && currentSettings.has_paper_credentials) {
                    apiSecret = 'USE_EXISTING';
                }
            } else {
                apiKey = $('#liveApiKey').val().trim() || (currentSettings && currentSettings.has_live_credentials ? currentSettings.live_api_key : '');
                apiSecret = $('#liveApiSecret').val().trim();
                // If no new secret provided and we have existing credentials, use a placeholder to indicate existing value
                if (!apiSecret && currentSettings && currentSettings.has_live_credentials) {
                    apiSecret = 'USE_EXISTING';
                }
            }
            
            if (!apiKey) {
                throw new Error(`Please enter an API key for ${isTestingPaper ? 'paper' : 'live'} trading`);
            }
            
            // Test the credentials
            const response = await fetch('/api/settings/test_credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tradingEnvironment: isTestingPaper ? 'paper' : 'live',
                    apiKey: apiKey,
                    apiSecret: apiSecret
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to verify credentials: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                const mode = isTestingPaper ? 'Paper' : 'Live';
                showToast(`${mode} trading API credentials verified successfully`, 'success');
                updateAccountInfo(result.account_info);
                
                // Update status indicator
                const statusElement = isTestingPaper ? $('#paperApiStatus') : $('#liveApiStatus');
                statusElement.text('Verified')
                            .removeClass('text-warning text-danger')
                            .addClass('text-success');
            } else {
                throw new Error(result.message || 'Unknown error verifying credentials');
            }
        } catch (error) {
            console.error('Error testing credentials:', error);
            showToast('Error testing credentials: ' + error.message, 'error');
            
            // Update status indicator based on context
            const buttonId = event ? $(event.target).attr('id') : null;
            const statusElement = (buttonId === 'testPaperCredentials' || 
                                (currentSettings && currentSettings.tradingEnvironment === 'paper')) ? 
                                $('#paperApiStatus') : $('#liveApiStatus');
                                
            statusElement.text('Invalid')
                        .removeClass('text-warning text-success')
                        .addClass('text-danger');
                        
            updateAccountInfo(null);
        } finally {
            showLoading(false);
        }
    }

    // Event handlers
    $('#settingsForm').on('submit', saveSettings);
    
    $('#isPaperTrading').on('change', function() {
        const isPaper = $(this).is(':checked');
        $('#paperTradingSettings').toggle(isPaper);
        $('#liveTradingSettings').toggle(!isPaper);
    });
    
    $('#emailNotifications').on('change', function() {
        $('#emailSettings').toggle($(this).is(':checked'));
    });
    
    $('#testPaperCredentials, #testLiveCredentials').on('click', testApiCredentials);
    
    // Load initial settings
    loadSettings();
    
    // Start periodic updates of trading status
    updateTradingStatus();
    tradingStatusInterval = setInterval(updateTradingStatus, 30000); // Update every 30 seconds
    
    // Clean up interval when page unloads
    $(window).on('unload', function() {
        if (tradingStatusInterval) {
            clearInterval(tradingStatusInterval);
        }
    });
}); 