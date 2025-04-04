// Chart.js Adapter Configuration
// This file must be loaded after Chart.js but before any chart initialization

(function() {
    console.log('[CHART DEBUG] Running Chart.js adapter configuration');
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('[CHART DEBUG] Chart.js not found! Waiting for it to load...');
        
        // Try again when page is fully loaded
        window.addEventListener('load', configureAdapter);
        return;
    }
    
    configureAdapter();
    
    function configureAdapter() {
        // Check again if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('[CHART DEBUG] Chart.js still not available after page load!');
            return;
        }
        
        console.log('[CHART DEBUG] Chart.js found, configuring date adapter');
        
        // Set up adapter using Luxon if available
        if (typeof luxon !== 'undefined' && typeof luxon.DateTime !== 'undefined') {
            // Define the adapter globally
            try {
                Chart.defaults.adapters = {
                    date: luxon.DateTime
                };
                
                // Also configure for time scales
                if (!Chart.defaults.scales) Chart.defaults.scales = {};
                if (!Chart.defaults.scales.time) Chart.defaults.scales.time = {};
                
                Chart.defaults.scales.time.adapters = {
                    date: luxon.DateTime
                };
                
                console.log('[CHART DEBUG] Successfully configured Chart.js with Luxon adapter');
            } catch (e) {
                console.error('[CHART DEBUG] Error configuring Chart.js adapter:', e);
            }
        } else {
            console.error('[CHART DEBUG] Luxon not available! Date adapter cannot be configured.');
        }
    }
})(); 