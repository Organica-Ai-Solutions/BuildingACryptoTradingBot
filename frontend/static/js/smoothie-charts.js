// Smoothie Charts implementation

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.timeSeries = new Map();
        
        // Ensure libraries are loaded
        this.checkDependencies();
    }
    
    checkDependencies() {
        if (typeof SmoothieChart === 'undefined') {
            console.error('SmoothieChart library not loaded');
            return false;
        }
        
        if (typeof TimeSeries === 'undefined') {
            console.error('TimeSeries class not loaded');
            return false;
        }
        
        if (typeof moment === 'undefined') {
            console.error('Moment.js library not loaded');
            return false;
        }
        
        return true;
    }

    initializePriceChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with ID ${canvasId} not found`);
            return null;
        }

        try {
            // Create price chart
            const chart = new SmoothieChart({
                millisPerPixel: 250,  // Increased for better performance
                grid: {
                    fillStyle: 'rgba(0,0,0,0.1)',
                    strokeStyle: 'rgba(255,255,255,0.1)',
                    millisPerLine: 5000,
                    verticalSections: 6
                },
                labels: {
                    fillStyle: 'rgba(255,255,255,0.4)',
                    precision: 2,
                    fontSize: 12
                },
                timestampFormatter: function(date) {
                    return moment(date).format('HH:mm:ss');
                },
                maxValueScale: 1.1,
                minValueScale: 0.9,
                responsive: true,
                limitFPS: 30
            });

            // Create time series for price data
            const priceSeries = new TimeSeries();
            const volumeSeries = new TimeSeries();

            // Add time series to chart with styling
            chart.addTimeSeries(priceSeries, {
                strokeStyle: 'rgb(33, 150, 243)',
                fillStyle: 'rgba(33, 150, 243, 0.1)',
                lineWidth: 2
            });

            chart.addTimeSeries(volumeSeries, {
                strokeStyle: 'rgb(76, 175, 80)',
                fillStyle: 'rgba(76, 175, 80, 0.1)',
                lineWidth: 1
            });

            // Store references
            this.charts.set('price', chart);
            this.timeSeries.set('price', priceSeries);
            this.timeSeries.set('volume', volumeSeries);

            // Set canvas size
            this.resizeCanvas(canvas);

            // Start streaming
            chart.streamTo(canvas, 1000);
            console.log(`Initialized price chart on canvas #${canvasId}`);
            return chart;
        } catch (error) {
            console.error('Failed to initialize price chart:', error);
            return null;
        }
    }

    initializePortfolioChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with ID ${canvasId} not found`);
            return null;
        }

        try {
            // Create portfolio chart
            const chart = new SmoothieChart({
                millisPerPixel: 400,
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
                    return moment(date).format('MM/DD HH:mm');
                },
                maxValueScale: 1.1,
                minValueScale: 0.9,
                responsive: true,
                limitFPS: 30
            });

            // Create time series for portfolio value
            const portfolioSeries = new TimeSeries();

            // Add time series to chart with styling
            chart.addTimeSeries(portfolioSeries, {
                strokeStyle: 'rgb(53, 86, 251)',
                fillStyle: 'rgba(53, 86, 251, 0.1)',
                lineWidth: 2
            });

            // Store references
            this.charts.set('portfolio', chart);
            this.timeSeries.set('portfolio', portfolioSeries);

            // Set canvas size
            this.resizeCanvas(canvas);

            // Start streaming
            chart.streamTo(canvas, 1000);
            console.log(`Initialized portfolio chart on canvas #${canvasId}`);
            return chart;
        } catch (error) {
            console.error('Failed to initialize portfolio chart:', error);
            return null;
        }
    }

    updatePriceData(price, volume, timestamp = Date.now()) {
        try {
            const priceSeries = this.timeSeries.get('price');
            const volumeSeries = this.timeSeries.get('volume');
            
            if (priceSeries && price !== undefined) {
                priceSeries.append(timestamp, parseFloat(price));
            }
            
            if (volumeSeries && volume !== undefined) {
                volumeSeries.append(timestamp, parseFloat(volume));
            }
        } catch (error) {
            console.error('Error updating price data:', error);
        }
    }

    updatePortfolioValue(value, timestamp = Date.now()) {
        try {
            const portfolioSeries = this.timeSeries.get('portfolio');
            if (portfolioSeries && value !== undefined) {
                portfolioSeries.append(timestamp, parseFloat(value));
            }
        } catch (error) {
            console.error('Error updating portfolio value:', error);
        }
    }
    
    // Method to load historical data into a chart
    loadHistoricalData(chartType, data) {
        try {
            const series = this.timeSeries.get(chartType);
            if (!series || !Array.isArray(data) || data.length === 0) {
                console.warn(`Cannot load historical data for ${chartType}`);
                return;
            }
            
            // Clear existing data
            series.clear();
            
            // Add historical data points
            data.forEach(point => {
                const timestamp = new Date(point.timestamp).getTime();
                const value = parseFloat(point.close || point.value || 0);
                series.append(timestamp, value);
            });
            
            console.log(`Loaded ${data.length} historical data points for ${chartType} chart`);
        } catch (error) {
            console.error(`Error loading historical data for ${chartType}:`, error);
        }
    }

    resizeCharts() {
        for (const [name, chart] of this.charts.entries()) {
            try {
                if (!chart || !chart.canvas) continue;
                this.resizeCanvas(chart.canvas);
            } catch (error) {
                console.error(`Error resizing ${name} chart:`, error);
            }
        }
    }
    
    resizeCanvas(canvas) {
        if (!canvas) return;
        
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth || 400;
            canvas.height = container.clientHeight || 200;
        }
    }
}

// Export chart manager instance
window.chartManager = new ChartManager();

// Handle window resize
window.addEventListener('resize', () => {
    if (window.chartManager) {
        window.chartManager.resizeCharts();
    }
}); 