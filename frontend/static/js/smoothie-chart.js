// Simple SmoothieChart implementation for real-time streaming data
// This is a standalone implementation to avoid any conflicts with Chart.js

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initializeSmoothieChart, 500);
});

function initializeSmoothieChart() {
  try {
    // Check if SmoothieChart is available
    if (typeof SmoothieChart === 'undefined' || typeof TimeSeries === 'undefined') {
      console.error('[SMOOTHIE] Smoothie Charts library not loaded');
      return;
    }
    
    console.log('[SMOOTHIE] Initializing Smoothie Chart');
    
    // Get the chart container and canvas
    const chartContainer = document.getElementById('portfolioChartContainer');
    let canvasElement = document.getElementById('portfolioChart');
    
    if (!chartContainer) {
      console.error('[SMOOTHIE] Chart container not found');
      return;
    }
    
    if (!canvasElement) {
      console.log('[SMOOTHIE] Canvas not found, creating it');
      canvasElement = document.createElement('canvas');
      canvasElement.id = 'portfolioChart';
      canvasElement.width = chartContainer.clientWidth;
      canvasElement.height = 400;
      chartContainer.innerHTML = '';
      chartContainer.appendChild(canvasElement);
    }
    
    // Clean up any existing resources
    if (window.smoothieChart) {
      console.log('[SMOOTHIE] Cleaning up existing chart');
      if (window.smoothieChartInterval) {
        clearInterval(window.smoothieChartInterval);
      }
    }
    
    // Create a new SmoothieChart with styling
    window.smoothieChart = new SmoothieChart({
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
      maxValueScale: 1.1,
      minValue: 0,
      timestampFormatter: SmoothieChart.timeFormatter
    });
    
    // Create portfolio value time series
    window.portfolioValueSeries = new TimeSeries();
    
    // Add buy signals series (green dots)
    window.buySignalsSeries = new TimeSeries();
    
    // Add sell signals series (red dots)
    window.sellSignalsSeries = new TimeSeries();
    
    // Add the time series to the chart with styling
    window.smoothieChart.addTimeSeries(window.portfolioValueSeries, {
      strokeStyle: '#3556FB',
      fillStyle: 'rgba(53, 86, 251, 0.1)',
      lineWidth: 3
    });
    
    // Add buy signals with distinct styling (green dots)
    window.smoothieChart.addTimeSeries(window.buySignalsSeries, {
      strokeStyle: 'rgba(0, 0, 0, 0)',
      fillStyle: 'rgba(0, 0, 0, 0)',
      lineWidth: 0,
      dots: true,
      dotSize: 6,
      dotFillStyle: '#22c55e',
      dotStrokeStyle: '#22c55e'
    });
    
    // Add sell signals with distinct styling (red dots)
    window.smoothieChart.addTimeSeries(window.sellSignalsSeries, {
      strokeStyle: 'rgba(0, 0, 0, 0)',
      fillStyle: 'rgba(0, 0, 0, 0)',
      lineWidth: 0,
      dots: true,
      dotSize: 6,
      dotFillStyle: '#ef4444',
      dotStrokeStyle: '#ef4444'
    });
    
    // Start streaming to the canvas with a 1-second delay for smoother rendering
    window.smoothieChart.streamTo(canvasElement, 1000);
    
    // Load initial data
    initializeChartData();
    
    // Set up event handlers for timeframe buttons
    setupTimeframeButtonHandlers();
    
    // Handle window resize events
    window.addEventListener('resize', function() {
      if (canvasElement && window.smoothieChart) {
        canvasElement.width = chartContainer.clientWidth;
        window.smoothieChart.resize();
      }
    });
    
    console.log('[SMOOTHIE] Smoothie Chart initialized successfully');
  } catch (error) {
    console.error('[SMOOTHIE] Error initializing Smoothie Chart:', error);
  }
}

function initializeChartData() {
  // Generate sample data for the chart
  const now = Date.now();
  const baseValue = 10000; // starting value
  
  // Generate 100 data points with some random movement
  for (let i = 0; i < 100; i++) {
    const time = now - (100 - i) * 1000; // 1 second intervals
    const randomFactor = 1 + (Math.random() - 0.5) * 0.02; // ±1% change
    const value = baseValue * Math.pow(randomFactor, i);
    
    // Add to portfolio value series
    window.portfolioValueSeries.append(time, value);
    
    // Add some buy/sell signals
    if (Math.random() > 0.9) {
      if (Math.random() > 0.5) {
        window.buySignalsSeries.append(time, value);
      } else {
        window.sellSignalsSeries.append(time, value);
      }
    }
  }
  
  // Start live data simulation
  startLiveDataSimulation(baseValue * Math.pow(1.01, 100)); // Continue from last value
  
  // Update last update text
  const lastUpdateElement = document.getElementById('lastUpdate');
  if (lastUpdateElement) {
    lastUpdateElement.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
  }
}

function startLiveDataSimulation(startValue) {
  let lastValue = startValue;
  
  // Update data every second
  window.smoothieChartInterval = setInterval(function() {
    // Generate a new value with some random movement
    const randomChange = (Math.random() - 0.5) * 0.01; // ±0.5% change
    const newValue = lastValue * (1 + randomChange);
    
    // Add to the chart
    window.portfolioValueSeries.append(Date.now(), newValue);
    
    // Add occasional buy/sell signals
    if (Math.random() > 0.9) {
      if (newValue > lastValue) {
        window.buySignalsSeries.append(Date.now(), newValue);
      } else {
        window.sellSignalsSeries.append(Date.now(), newValue);
      }
    }
    
    // Update last value
    lastValue = newValue;
    
    // Update last update text
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
      lastUpdateElement.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    }
  }, 1000);
}

function setupTimeframeButtonHandlers() {
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  if (!timeframeButtons || timeframeButtons.length === 0) {
    console.log('[SMOOTHIE] No timeframe buttons found');
    return;
  }
  
  timeframeButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      // Update active state
      timeframeButtons.forEach(function(btn) {
        btn.classList.remove('active');
      });
      this.classList.add('active');
      
      // Clear existing data
      window.portfolioValueSeries.clear();
      window.buySignalsSeries.clear();
      window.sellSignalsSeries.clear();
      
      // Get the timeframe
      const timeframe = this.getAttribute('data-timeframe');
      console.log('[SMOOTHIE] Changing timeframe to', timeframe);
      
      // Generate new data based on timeframe
      const now = Date.now();
      let dataPoints = 100;
      let interval = 1000; // 1 second in ms
      let baseValue = 10000;
      
      // Adjust data points and interval based on timeframe
      switch (timeframe) {
        case '1d': 
          dataPoints = 24;
          interval = 60 * 60 * 1000; // 1 hour in ms
          break;
        case '1w': 
          dataPoints = 7;
          interval = 24 * 60 * 60 * 1000; // 1 day in ms
          break;
        case '1m': 
          dataPoints = 30;
          interval = 24 * 60 * 60 * 1000; // 1 day in ms
          break;
        case '3m': 
          dataPoints = 90;
          interval = 24 * 60 * 60 * 1000; // 1 day in ms
          break;
        case '6m': 
          dataPoints = 180;
          interval = 24 * 60 * 60 * 1000; // 1 day in ms
          break;
        case '1y': 
          dataPoints = 365;
          interval = 24 * 60 * 60 * 1000; // 1 day in ms
          break;
      }
      
      // Generate data
      for (let i = 0; i < dataPoints; i++) {
        const time = now - (dataPoints - i) * interval;
        const randomFactor = 1 + (Math.random() - 0.5) * 0.02; // ±1% change
        const value = baseValue * Math.pow(randomFactor, i);
        
        // Add to portfolio value series
        window.portfolioValueSeries.append(time, value);
        
        // Add some buy/sell signals
        if (Math.random() > 0.9) {
          if (Math.random() > 0.5) {
            window.buySignalsSeries.append(time, value);
          } else {
            window.sellSignalsSeries.append(time, value);
          }
        }
      }
      
      // Adjust chart speed based on timeframe
      if (window.smoothieChart) {
        switch (timeframe) {
          case '1d': window.smoothieChart.options.millisPerPixel = 50; break;
          case '1w': window.smoothieChart.options.millisPerPixel = 100; break;
          case '1m': window.smoothieChart.options.millisPerPixel = 200; break;
          case '3m': window.smoothieChart.options.millisPerPixel = 300; break;
          case '6m': window.smoothieChart.options.millisPerPixel = 400; break;
          case '1y': window.smoothieChart.options.millisPerPixel = 500; break;
        }
      }
      
      // Update last update text
      const lastUpdateElement = document.getElementById('lastUpdate');
      if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
      }
    });
  });
} 