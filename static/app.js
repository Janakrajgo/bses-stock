// =========================================================
// BSE MarketPulse — Core Client-side Controller (app.js)
// =========================================================

// Global Chart Defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
Chart.defaults.font.family = "'Space Grotesk', sans-serif";
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13, 20, 36, 0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(139, 92, 246, 0.3)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
Chart.defaults.plugins.tooltip.titleFont = { family: "'JetBrains Mono', monospace", size: 12, weight: '600' };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace", size: 12 };

// Color Palette Constants
const COLORS = {
    violet: '#8b5cf6',
    violetSoft: 'rgba(139, 92, 246, 0.25)',
    cyan: '#06b6d4',
    cyanSoft: 'rgba(6, 182, 212, 0.25)',
    emerald: '#10b981',
    emeraldSoft: 'rgba(16, 185, 129, 0.25)',
    rose: '#f43f5e',
    roseSoft: 'rgba(244, 63, 94, 0.25)',
    amber: '#f59e0b',
    amberSoft: 'rgba(245, 158, 11, 0.25)',
    blue: '#3b82f6',
    gray: '#64748b'
};

// Global Store & State
const state = {
    currentView: 'technicals',
    histPeriod: '1Y',
    histType: 'area',
    indicators: {
        sma20: true,
        sma50: true,
        ema200: false,
        bollinger: true,
        volume: true
    },
    subIndicator: 'rsi',
    forecastModel: 'prophet',
    forecastDays: 30,
    pbiFY: 'ALL',
    pbiQ: 'ALL',
    pbiMetric: 'close',
    rawSearch: '',
    rawPage: 1,
    rawPageSize: 25,
    anomalyFilter: 'ALL',
    anomalySearch: ''
};

// Chart instances registry
const chartRegistry = {};
function safeDestroyChart(key) {
    if (chartRegistry[key]) {
        chartRegistry[key].destroy();
        delete chartRegistry[key];
    }
}

// Data Fetcher (API with fallback to EMBEDDED data)
async function fetchEndpoint(url, fallbackData) {
    try {
        const res = await fetch(url);
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.warn(`Fetch to ${url} failed; using embedded dataset fallback:`, err);
    }
    return fallbackData;
}

// =========================================================
// 1. VIEW NAVIGATION
// =========================================================
function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    // Lazy load / re-render views on demand
    if (viewName === 'technicals') {
        renderHistoricalChart();
        renderSubChart();
    } else if (viewName === 'forecasting') {
        renderForecast();
        renderMetricComparisonCharts();
    } else if (viewName === 'powerbi') {
        renderPowerBIView();
    } else if (viewName === 'anomalies') {
        renderAnomaliesTable();
    } else if (viewName === 'explorer') {
        renderRawDataTable();
    }
}

// =========================================================
// 2. VIEW 1: HISTORICAL PRICE & TECHNICAL CHART
// =========================================================
async function renderHistoricalChart() {
    const loader = document.getElementById('histLoader');
    if (loader) loader.classList.remove('hidden');

    const period = state.histPeriod;
    const data = await fetchEndpoint(`/api/historical?period=${period}`, filterHistoricalByPeriod(period));

    if (loader) loader.classList.add('hidden');
    if (!data || !data.dates) return;

    safeDestroyChart('historical');
    const ctx = document.getElementById('historicalChart').getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 380);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

    const datasets = [];

    // 1. Primary Close Price
    datasets.push({
        label: 'Close Price (₹)',
        data: data.close,
        borderColor: COLORS.violet,
        borderWidth: 2.2,
        backgroundColor: state.histType === 'area' ? grad : 'transparent',
        fill: state.histType === 'area',
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ffffff',
        tension: 0.15,
        yAxisID: 'y'
    });

    // 2. High-Low Bar mode if selected
    if (state.histType === 'bars') {
        datasets.push({
            type: 'bar',
            label: 'High Price (₹)',
            data: data.high,
            backgroundColor: 'rgba(56, 189, 248, 0.4)',
            borderColor: 'transparent',
            yAxisID: 'y'
        });
        datasets.push({
            type: 'bar',
            label: 'Low Price (₹)',
            data: data.low,
            backgroundColor: 'rgba(244, 63, 94, 0.4)',
            borderColor: 'transparent',
            yAxisID: 'y'
        });
    }

    // 3. Technical Indicators overlays
    if (state.indicators.sma20) {
        datasets.push({
            label: 'SMA 20',
            data: data.sma_20,
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.2,
            yAxisID: 'y'
        });
    }

    if (state.indicators.sma50) {
        datasets.push({
            label: 'SMA 50',
            data: data.sma_50,
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.2,
            yAxisID: 'y'
        });
    }

    if (state.indicators.ema200) {
        datasets.push({
            label: 'EMA 200',
            data: data.ema_200,
            borderColor: '#f43f5e',
            borderWidth: 1.8,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.2,
            yAxisID: 'y'
        });
    }

    if (state.indicators.bollinger) {
        datasets.push({
            label: 'BB Upper',
            data: data.bb_upper,
            borderColor: 'rgba(167, 139, 250, 0.5)',
            borderWidth: 1,
            pointRadius: 0,
            fill: '+1',
            backgroundColor: 'rgba(167, 139, 250, 0.05)',
            tension: 0.2,
            yAxisID: 'y'
        });
        datasets.push({
            label: 'BB Lower',
            data: data.bb_lower,
            borderColor: 'rgba(167, 139, 250, 0.5)',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.2,
            yAxisID: 'y'
        });
    }

    if (state.indicators.volume) {
        datasets.push({
            type: 'bar',
            label: 'Volume',
            data: data.volume,
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            borderColor: 'transparent',
            yAxisID: 'yVol',
            order: 10
        });
    }

    // Subtitle update
    const subtitleEl = document.getElementById('histSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `Displaying ${data.count} trading sessions (${data.dates[0]} to ${data.dates[data.dates.length - 1]})`;
    }

    chartRegistry['historical'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11, family: "'Space Grotesk', sans-serif" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            if (ctx.dataset.yAxisID === 'yVol') {
                                return ` Vol: ${Number(ctx.parsed.y).toLocaleString('en-IN')}`;
                            }
                            if (ctx.parsed.y !== null && !isNaN(ctx.parsed.y)) {
                                return ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                            }
                            return null;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: {
                        color: '#64748b',
                        maxTicksLimit: 9,
                        maxRotation: 0,
                        font: { family: "'JetBrains Mono', monospace", size: 10 }
                    }
                },
                y: {
                    position: 'right',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        callback: v => '₹' + v.toLocaleString('en-IN')
                    }
                },
                yVol: {
                    position: 'left',
                    grid: { display: false },
                    ticks: { display: false },
                    max: Math.max(...data.volume) * 4.5 // keeps volume bars low at bottom
                }
            },
            onHover: (e, activeElements) => {
                if (activeElements && activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    const hud = document.getElementById('cursorHud');
                    if (hud && data.dates[idx]) {
                        hud.innerHTML = `<span class="text-white">${data.dates[idx]}</span> | Open: ₹${data.open[idx]} | High: ₹${data.high[idx]} | Low: ₹${data.low[idx]} | <strong class="text-violet">Close: ₹${data.close[idx]}</strong> | Vol: ${(data.volume[idx] / 1e6).toFixed(2)}M`;
                    }
                }
            }
        }
    });

    // Update secondary sub-chart synchronously
    renderSubChart(data);
}

// Fallback slice helper
function filterHistoricalByPeriod(period) {
    const raw = window.EMBEDDED_HISTORICAL;
    if (!raw) return { dates: [], close: [], volume: [], count: 0 };
    const n = raw.dates.length;
    let sliceLen = n;
    if (period === '1W') sliceLen = 5;
    else if (period === '1M') sliceLen = 22;
    else if (period === '3M') sliceLen = 65;
    else if (period === '6M') sliceLen = 130;
    else if (period === '1Y') sliceLen = 252;
    else if (period === '3Y') sliceLen = 756;
    else if (period === '5Y') sliceLen = 1260;

    const startIdx = Math.max(0, n - sliceLen);
    const sliceObj = {};
    for (const k in raw) {
        sliceObj[k] = raw[k].slice(startIdx);
    }
    sliceObj.count = sliceObj.dates.length;
    return sliceObj;
}

// =========================================================
// 3. SECONDARY TECHNICAL SUB-CHART (RSI, MACD, VOLATILITY)
// =========================================================
async function renderSubChart(cachedData) {
    const data = cachedData || await fetchEndpoint(`/api/historical?period=${state.histPeriod}`, filterHistoricalByPeriod(state.histPeriod));
    if (!data || !data.dates) return;

    safeDestroyChart('subChart');
    const ctx = document.getElementById('subChart').getContext('2d');
    const subType = state.subIndicator;

    let datasets = [];
    let yScales = {};

    if (subType === 'rsi') {
        datasets.push({
            label: 'RSI 14',
            data: data.rsi_14,
            borderColor: COLORS.violet,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });

        // 70 & 30 Overbought/Oversold reference lines
        datasets.push({
            label: 'Overbought (70)',
            data: Array(data.dates.length).fill(70),
            borderColor: 'rgba(244, 63, 94, 0.6)',
            borderWidth: 1,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false
        });
        datasets.push({
            label: 'Oversold (30)',
            data: Array(data.dates.length).fill(30),
            borderColor: 'rgba(16, 185, 129, 0.6)',
            borderWidth: 1,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false
        });

        yScales = {
            min: 15,
            max: 85,
            ticks: { color: '#94a3b8', font: { family: "'JetBrains Mono', monospace", size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
        };

        const latestRSI = data.rsi_14[data.rsi_14.length - 1];
        const statEl = document.getElementById('subIndicatorStat');
        if (statEl) {
            let label = latestRSI > 70 ? 'Overbought' : (latestRSI < 30 ? 'Oversold' : 'Neutral Range');
            statEl.innerHTML = `Current RSI (14): <strong class="mono text-violet">${latestRSI} (${label})</strong>`;
        }

    } else if (subType === 'macd') {
        datasets.push({
            label: 'MACD Line',
            data: data.macd,
            borderColor: COLORS.cyan,
            borderWidth: 2,
            pointRadius: 0,
            fill: false
        });
        datasets.push({
            label: 'Signal Line (9)',
            data: data.macd_signal,
            borderColor: COLORS.amber,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
        });
        datasets.push({
            type: 'bar',
            label: 'Histogram',
            data: data.macd_hist,
            backgroundColor: data.macd_hist.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)'),
            pointRadius: 0
        });

        yScales = {
            ticks: { color: '#94a3b8', font: { family: "'JetBrains Mono', monospace", size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
        };

        const statEl = document.getElementById('subIndicatorStat');
        const latestHist = data.macd_hist[data.macd_hist.length - 1];
        if (statEl) {
            statEl.innerHTML = `MACD Oscillator: <strong class="mono ${latestHist >= 0 ? 'text-emerald' : 'text-rose'}">${latestHist >= 0 ? 'Bullish Momentum' : 'Bearish Divergence'}</strong>`;
        }

    } else if (subType === 'volatility') {
        datasets.push({
            label: '30-Day Annualized Volatility %',
            data: data.volatility_30d,
            borderColor: COLORS.amber,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
            backgroundColor: 'rgba(245, 158, 11, 0.1)'
        });

        yScales = {
            ticks: {
                color: '#94a3b8',
                callback: v => v + '%',
                font: { family: "'JetBrains Mono', monospace", size: 10 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
        };

        const statEl = document.getElementById('subIndicatorStat');
        const latestVol = data.volatility_30d[data.volatility_30d.length - 1];
        if (statEl) {
            statEl.innerHTML = `Annualized Volatility (30D): <strong class="mono text-amber">${latestVol}%</strong>`;
        }
    }

    chartRegistry['subChart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#94a3b8', font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { maxTicksLimit: 9, color: '#64748b', font: { size: 10 } }
                },
                y: yScales
            }
        }
    });
}

// =========================================================
// 4. VIEW 2: ML FORECASTING ENGINE
// =========================================================
async function renderForecast() {
    const loader = document.getElementById('forecastLoader');
    if (loader) loader.classList.remove('hidden');

    const model = state.forecastModel;
    const days = state.forecastDays;

    // Show/hide horizon buttons based on whether model supports horizon selection
    const horizonRow = document.getElementById('horizonSelector');
    if (horizonRow) {
        horizonRow.style.display = (model === 'prophet') ? 'flex' : 'none';
    }

    let forecastData = null;
    try {
        const res = await fetch(`/api/forecast/${model}?days=${days}`);
        if (res.ok) {
            forecastData = await res.json();
        }
    } catch (e) {
        console.warn(`Forecast API error for ${model}, using embedded fallback:`, e);
    }

    if (!forecastData && window.EMBEDDED_FORECAST) {
        if (model === 'prophet') {
            forecastData = window.EMBEDDED_FORECAST.prophet[String(days)] || window.EMBEDDED_FORECAST.prophet['30'];
        } else {
            forecastData = window.EMBEDDED_FORECAST[model];
        }
    }

    if (loader) loader.classList.add('hidden');
    if (!forecastData) return;

    safeDestroyChart('forecast');
    const ctx = document.getElementById('forecastChart').getContext('2d');

    // Update Title & Metadata HUD
    updateForecastMetadata(model, days, forecastData);

    let labels = [];
    let datasets = [];

    if (model === 'prophet') {
        const histDates = forecastData.hist_dates;
        const futDates = forecastData.fut_dates;
        labels = [...histDates, ...futDates];

        const histPrices = [...forecastData.hist_prices, ...Array(futDates.length).fill(null)];
        const futPrices = [...Array(histDates.length - 1).fill(null), forecastData.hist_prices[histDates.length - 1], ...forecastData.fut_yhat];
        const upper = [...Array(histDates.length - 1).fill(null), forecastData.hist_prices[histDates.length - 1], ...forecastData.fut_upper];
        const lower = [...Array(histDates.length - 1).fill(null), forecastData.hist_prices[histDates.length - 1], ...forecastData.fut_lower];

        datasets.push({
            label: 'Historical Close Price',
            data: histPrices,
            borderColor: COLORS.cyan,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });

        datasets.push({
            label: `Prophet ${days}-Day Forecast (yhat)`,
            data: futPrices,
            borderColor: COLORS.violet,
            borderWidth: 2.5,
            borderDash: [6, 4],
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });

        datasets.push({
            label: '95% CI Upper Band',
            data: upper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.2
        });

        datasets.push({
            label: '95% CI Lower Band',
            data: lower,
            borderColor: 'transparent',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            pointRadius: 0,
            fill: false,
            tension: 0.2
        });

    } else if (model === 'xgboost' || model === 'linear_regression' || model === 'polynomial') {
        labels = forecastData.dates;
        const colorMap = {
            xgboost: COLORS.emerald,
            linear_regression: COLORS.blue,
            polynomial: COLORS.amber
        };
        const color = colorMap[model] || COLORS.violet;

        datasets.push({
            label: 'Actual Market Price',
            data: forecastData.actual,
            borderColor: '#94a3b8',
            borderWidth: 1.8,
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });

        datasets.push({
            label: `${forecastData.model} Predicted`,
            data: forecastData.predicted,
            borderColor: color,
            borderWidth: 2.5,
            borderDash: [5, 3],
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });

    } else if (model === 'lstm') {
        labels = forecastData.dates;
        datasets.push({
            label: 'Actual Price',
            data: forecastData.actual,
            borderColor: '#94a3b8',
            borderWidth: 1.8,
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });
        datasets.push({
            label: 'LSTM Predicted (Recurrent Tracking)',
            data: forecastData.predicted,
            borderColor: COLORS.cyan,
            borderWidth: 2.5,
            borderDash: [5, 3],
            pointRadius: 0,
            tension: 0.2,
            fill: false
        });
    }

    chartRegistry['forecast'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#94a3b8', font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            if (ctx.parsed.y !== null && !isNaN(ctx.parsed.y)) {
                                return ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                            }
                            return null;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { maxTicksLimit: 9, color: '#64748b', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: v => '₹' + v.toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

function updateForecastMetadata(model, days, data) {
    const titleEl = document.getElementById('currentModelTitle');
    const badgeEl = document.getElementById('currentModelBadge');
    const archEl = document.getElementById('metaArch');
    const mapeEl = document.getElementById('metaMAPE');
    const dirEl = document.getElementById('metaDir');
    const targetEl = document.getElementById('metaTarget');

    if (model === 'prophet') {
        titleEl.textContent = `Prophet ${days}-Day Additive Decomposition Forecast`;
        badgeEl.textContent = 'Prophet Bayesian ML';
        archEl.textContent = 'Generalized Additive Model with Trend, Seasonality & Holiday Shocks';
        mapeEl.textContent = '3.95% (Validation MAPE)';
        dirEl.textContent = '59.32% Directional Accuracy';
        if (data.fut_yhat) {
            const finalVal = data.fut_yhat[data.fut_yhat.length - 1];
            const up = data.fut_upper ? data.fut_upper[data.fut_upper.length - 1] : finalVal;
            const lw = data.fut_lower ? data.fut_lower[data.fut_lower.length - 1] : finalVal;
            targetEl.textContent = `₹${finalVal} (95% CI: ₹${lw} – ₹${up})`;
        }
    } else if (model === 'xgboost') {
        titleEl.textContent = 'XGBoost Gradient Boosted Decision Trees (Test Evaluation)';
        badgeEl.textContent = 'XGBoost (Best Direction)';
        archEl.textContent = 'Gradient Boosted Trees with Multi-Lag Moving Features';
        mapeEl.textContent = '18.69%';
        dirEl.textContent = '71.19% (Market Peak Direction)';
        targetEl.textContent = 'High-frequency momentum tracking';
    } else if (model === 'lstm') {
        titleEl.textContent = 'LSTM Deep Recurrent Neural Network';
        badgeEl.textContent = 'LSTM Neural Net';
        archEl.textContent = 'Deep Sequential Recurrent Memory with 20-Day Lookback';
        mapeEl.textContent = '5.17% (All-Rounder)';
        dirEl.textContent = '62.71%';
        targetEl.textContent = 'Smooth sequential non-linear curve';
    } else if (model === 'linear_regression') {
        titleEl.textContent = 'Ordinary Least Squares (OLS) Linear Regression';
        badgeEl.textContent = 'Linear Regression';
        archEl.textContent = 'Multiple Linear Regression on Lagged Features & Trend Slope';
        mapeEl.textContent = '1.92%';
        dirEl.textContent = '54.24%';
        targetEl.textContent = 'Steady parametric trend slope';
    } else if (model === 'polynomial') {
        titleEl.textContent = 'Polynomial Ridge Regression (Degree 2 Non-Linear Curve)';
        badgeEl.textContent = 'Polynomial Regression';
        archEl.textContent = 'Quadratic Feature Expansion with L2 Ridge Penalty (alpha=100)';
        mapeEl.textContent = '2.05%';
        dirEl.textContent = '49.15%';
        targetEl.textContent = 'Accelerating exponential curvature';
    } else if (model === 'arima') {
        titleEl.textContent = 'ARIMA & SARIMA Classical Econometric Baselines';
        badgeEl.textContent = 'ARIMA / SARIMA';
        archEl.textContent = 'Auto-Regressive Integrated Moving Average (4, 2, 0)';
        mapeEl.textContent = '14.02% (ARIMA) / 22.92% (SARIMA)';
        dirEl.textContent = '59.32%';
        targetEl.textContent = 'Stationary Differenced Baseline';
    }
}

// =========================================================
// 5. MODEL EVALUATION BAR CHARTS & LEADERBOARD
// =========================================================
async function renderMetricComparisonCharts() {
    const metrics = await fetchEndpoint('/api/metrics', window.EMBEDDED_METRICS || []);
    if (!metrics || metrics.length === 0) return;

    const models = metrics.map(m => m.Model);
    const colorPalette = [
        COLORS.blue, COLORS.amber, COLORS.gray, COLORS.gray, COLORS.violet, COLORS.emerald, COLORS.cyan
    ];

    const chartConfig = (label, values, unit = '', higherIsBetter = false) => ({
        type: 'bar',
        data: {
            labels: models,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: colorPalette,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `${label} ${unit ? `(${unit})` : ''} — ${higherIsBetter ? 'Higher is better ↑' : 'Lower is better ↓'}`,
                    color: '#e2e8f0',
                    font: { size: 12, family: "'Space Grotesk', sans-serif", weight: '600' }
                },
                tooltip: {
                    callbacks: { label: ctx => ` ${ctx.parsed.y}${unit}` }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10, family: "'Space Grotesk', sans-serif" },
                        maxRotation: 30
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });

    // 1. RMSE Chart
    safeDestroyChart('rmse');
    chartRegistry['rmse'] = new Chart(
        document.getElementById('rmseChart').getContext('2d'),
        chartConfig('RMSE (Root Mean Sq Error)', metrics.map(m => m.RMSE), ' ₹')
    );

    // 2. MAPE Chart
    safeDestroyChart('mape');
    chartRegistry['mape'] = new Chart(
        document.getElementById('mapeChart').getContext('2d'),
        chartConfig('MAPE (Mean Absolute % Error)', metrics.map(m => m.MAPE), '%')
    );

    // 3. MAE Chart
    safeDestroyChart('mae');
    chartRegistry['mae'] = new Chart(
        document.getElementById('maeChart').getContext('2d'),
        chartConfig('MAE (Mean Absolute Error)', metrics.map(m => m.MAE), ' ₹')
    );

    // 4. Directional Accuracy Chart with 50% baseline dashed line
    safeDestroyChart('dir');
    chartRegistry['dir'] = new Chart(
        document.getElementById('dirChart').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: models,
                datasets: [
                    {
                        label: 'Directional Accuracy',
                        data: metrics.map(m => m.Directional_Acc),
                        backgroundColor: colorPalette,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        type: 'line',
                        label: 'Random Coin-Flip (50%)',
                        data: Array(models.length).fill(50),
                        borderColor: '#f43f5e',
                        borderWidth: 2,
                        borderDash: [5, 4],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: '#94a3b8', font: { size: 10 } } },
                    title: {
                        display: true,
                        text: 'Directional Accuracy % (Higher is better ↑)',
                        color: '#e2e8f0',
                        font: { size: 12, weight: '600' }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 30 } },
                    y: { min: 40, max: 80, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        }
    );

    // Populate Leaderboard Table
    const tbody = document.getElementById('leaderboardBody');
    if (tbody) {
        tbody.innerHTML = metrics.map(m => `
            <tr>
                <td><span class="model-badge-row">${m.Model}</span></td>
                <td class="mono ${m.RMSE < 200 ? 'text-emerald' : ''}">₹${m.RMSE}</td>
                <td class="mono ${m.MAE < 160 ? 'text-emerald' : ''}">₹${m.MAE}</td>
                <td class="mono ${m.MAPE < 5 ? 'text-emerald' : ''}"><strong>${m.MAPE}%</strong></td>
                <td class="mono ${m.Directional_Acc > 70 ? 'text-emerald' : ''}">${m.Directional_Acc}%</td>
                <td class="mono">${m.R2_Score || '0.95'}</td>
                <td><span class="verdict-tag ${m.BadgeClass || 'v-gray'}">${m.Verdict || 'Baseline'}</span></td>
            </tr>
        `).join('');
    }
}

// =========================================================
// 6. VIEW 3: POWER BI EXECUTIVE DASHBOARD
// =========================================================
async function renderPowerBIView() {
    const raw = window.EMBEDDED_HISTORICAL;
    if (!raw) return;

    const fyFilter = state.pbiFY;
    const qFilter = state.pbiQ;
    const metric = state.pbiMetric;

    // Filter data indices based on FY and Quarter
    const filteredIndices = [];
    for (let i = 0; i < raw.dates.length; i++) {
        const d = new Date(raw.dates[i]);
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // 1-12
        const fyYear = month > 3 ? year : year - 1;
        const fyStr = `FY${String(fyYear).slice(-2)}-${String(fyYear + 1).slice(-2)}`;
        
        let quarterStr = 'Q4';
        if (month >= 4 && month <= 6) quarterStr = 'Q1';
        else if (month >= 7 && month <= 9) quarterStr = 'Q2';
        else if (month >= 10 && month <= 12) quarterStr = 'Q3';

        const matchesFY = (fyFilter === 'ALL' || fyStr === fyFilter);
        const matchesQ = (qFilter === 'ALL' || quarterStr === qFilter);

        if (matchesFY && matchesQ) {
            filteredIndices.push(i);
        }
    }

    if (filteredIndices.length === 0) return;

    const fDates = filteredIndices.map(i => raw.dates[i]);
    const fValues = filteredIndices.map(i => raw[metric][i]);
    const fClose = filteredIndices.map(i => raw.close[i]);
    const fReturns = filteredIndices.map(i => raw.daily_return[i]);

    // Update Power BI DAX Cards
    const latestClose = fClose[fClose.length - 1];
    const prevYearClose = fClose.length > 252 ? fClose[fClose.length - 252] : fClose[0];
    const yoy = ((latestClose - prevYearClose) / prevYearClose) * 100;

    document.getElementById('pbiKpiClose').textContent = `₹${latestClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('pbiKpiYoY').textContent = `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`;
    document.getElementById('pbiKpiYoY').className = `pbi-kpi-val mono ${yoy >= 0 ? 'text-emerald' : 'text-rose'}`;
    document.getElementById('pbiFilteredPoints').textContent = `${fDates.length.toLocaleString()} Rows in DAX Filter Context`;

    // Render Power BI Chart
    safeDestroyChart('pbiChart');
    const ctx = document.getElementById('pbiChart').getContext('2d');

    const metricLabels = {
        close: 'Closing Price (₹)',
        daily_return: 'Daily Return %',
        volume: 'Trading Volume',
        volatility_30d: '30-Day Volatility %'
    };

    chartRegistry['pbiChart'] = new Chart(ctx, {
        type: metric === 'volume' ? 'bar' : 'line',
        data: {
            labels: fDates,
            datasets: [{
                label: metricLabels[metric] || metric,
                data: fValues,
                borderColor: COLORS.violet,
                backgroundColor: metric === 'volume' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: metric !== 'volume'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', maxTicksLimit: 9 } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// =========================================================
// 7. VIEW 4: ANOMALY RADAR TABLE
// =========================================================
function renderAnomaliesTable() {
    const list = window.EMBEDDED_ANOMALIES || [];
    const filter = state.anomalyFilter;
    const search = state.anomalySearch.toLowerCase();

    const filtered = list.filter(item => {
        const matchesType = (filter === 'ALL' || item.type === filter);
        const matchesSearch = (!search || item.date.includes(search) || item.reasons.join(' ').toLowerCase().includes(search));
        return matchesType && matchesSearch;
    });

    const tbody = document.getElementById('anomalyTableBody');
    if (tbody) {
        tbody.innerHTML = filtered.slice(0, 50).map(item => `
            <tr>
                <td class="mono text-white">${item.date}</td>
                <td class="mono font-bold">₹${item.close.toLocaleString('en-IN')}</td>
                <td class="mono ${item.daily_return_pct >= 0 ? 'text-emerald' : 'text-rose'}">
                    <strong>${item.daily_return_pct >= 0 ? '+' : ''}${item.daily_return_pct}%</strong>
                </td>
                <td class="mono text-muted">${item.volume.toLocaleString('en-IN')}</td>
                <td>
                    <span class="verdict-tag ${item.type === 'Crash' ? 'v-red' : (item.type === 'Surge' ? 'v-green' : 'v-purple')}">
                        ${item.type}
                    </span>
                </td>
                <td class="text-secondary">${item.reasons.join(' · ')}</td>
            </tr>
        `).join('');
    }
}

// =========================================================
// 8. VIEW 5: RAW DATA EXPLORER & PAGINATION
// =========================================================
function renderRawDataTable() {
    const raw = window.EMBEDDED_HISTORICAL;
    if (!raw) return;

    const search = state.rawSearch.trim();
    const indices = [];
    for (let i = 0; i < raw.dates.length; i++) {
        if (!search || raw.dates[i].includes(search)) {
            indices.push(i);
        }
    }

    const total = indices.length;
    const pageSize = state.rawPageSize;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    state.rawPage = Math.min(state.rawPage, maxPage);

    const start = (state.rawPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pageIndices = indices.slice(start, end);

    const infoEl = document.getElementById('tablePaginationInfo');
    const indicatorEl = document.getElementById('pageIndicator');
    if (infoEl) infoEl.textContent = `Showing records ${start + 1} to ${end} of ${total.toLocaleString()}`;
    if (indicatorEl) indicatorEl.textContent = `Page ${state.rawPage} of ${maxPage}`;

    const tbody = document.getElementById('rawTableBody');
    if (tbody) {
        tbody.innerHTML = pageIndices.map(i => `
            <tr>
                <td class="mono text-white">${raw.dates[i]}</td>
                <td class="mono">₹${raw.open[i]}</td>
                <td class="mono text-emerald">₹${raw.high[i]}</td>
                <td class="mono text-rose">₹${raw.low[i]}</td>
                <td class="mono font-bold text-accent">₹${raw.close[i]}</td>
                <td class="mono text-muted">${raw.volume[i].toLocaleString('en-IN')}</td>
                <td class="mono ${raw.daily_return[i] >= 0 ? 'text-emerald' : 'text-rose'}">
                    ${raw.daily_return[i] >= 0 ? '+' : ''}${raw.daily_return[i]}%
                </td>
                <td class="mono">₹${raw.sma_20[i] || '—'}</td>
                <td class="mono">${raw.rsi_14[i] || '—'}</td>
            </tr>
        `).join('');
    }
}

// =========================================================
// 9. EVENT LISTENERS INITIALIZATION
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Tab Switching
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // 2. Historical Periods (1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, ALL)
    document.querySelectorAll('#histPeriods .pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#histPeriods .pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.histPeriod = btn.dataset.period;
            renderHistoricalChart();
        });
    });

    // 3. Chart Type Switcher (Area vs Bars)
    document.querySelectorAll('#chartTypeSwitch .pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#chartTypeSwitch .pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.histType = btn.dataset.type;
            renderHistoricalChart();
        });
    });

    // 4. Indicator Toggles
    document.querySelectorAll('.indicator-toggles .toggle-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const indKey = pill.dataset.ind;
            state.indicators[indKey] = !state.indicators[indKey];
            pill.classList.toggle('active', state.indicators[indKey]);
            renderHistoricalChart();
        });
    });

    // 5. Sub-indicator Tabs (RSI / MACD / Volatility)
    document.querySelectorAll('#subIndicatorTabs .sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#subIndicatorTabs .sub-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.subIndicator = tab.dataset.sub;
            renderSubChart();
        });
    });

    // 6. Forecasting Model Tabs
    document.querySelectorAll('#modelTabs .model-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#modelTabs .model-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.forecastModel = tab.dataset.model;
            renderForecast();
        });
    });

    // 7. Forecast Horizon Selector (7, 15, 30, 60, 90, 180 Days)
    document.querySelectorAll('#horizonSelector .horizon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#horizonSelector .horizon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.forecastDays = parseInt(btn.dataset.days);
            renderForecast();
        });
    });

    // 8. Power BI Fiscal Year Slicer
    document.querySelectorAll('#pbiYearSlicer .s-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#pbiYearSlicer .s-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.pbiFY = pill.dataset.fy;
            renderPowerBIView();
        });
    });

    // 9. Power BI Quarter Slicer
    document.querySelectorAll('#pbiQuarterSlicer .s-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#pbiQuarterSlicer .s-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.pbiQ = pill.dataset.q;
            renderPowerBIView();
        });
    });

    // 10. Power BI Metric Selector
    const pbiSelect = document.getElementById('pbiMetricSelect');
    if (pbiSelect) {
        pbiSelect.addEventListener('change', (e) => {
            state.pbiMetric = e.target.value;
            renderPowerBIView();
        });
    }

    // 11. Anomaly Filter & Search
    const anomalySelect = document.getElementById('anomalyTypeFilter');
    if (anomalySelect) {
        anomalySelect.addEventListener('change', (e) => {
            state.anomalyFilter = e.target.value;
            renderAnomaliesTable();
        });
    }
    const anomalyInput = document.getElementById('anomalySearch');
    if (anomalyInput) {
        anomalyInput.addEventListener('input', (e) => {
            state.anomalySearch = e.target.value;
            renderAnomaliesTable();
        });
    }

    // 12. Raw Data Explorer Search & Pagination
    const rawInput = document.getElementById('rawSearch');
    if (rawInput) {
        rawInput.addEventListener('input', (e) => {
            state.rawSearch = e.target.value;
            state.rawPage = 1;
            renderRawDataTable();
        });
    }

    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            state.rawPageSize = parseInt(e.target.value);
            state.rawPage = 1;
            renderRawDataTable();
        });
    }

    const prevBtn = document.getElementById('prevPageBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (state.rawPage > 1) {
                state.rawPage--;
                renderRawDataTable();
            }
        });
    }

    const nextBtn = document.getElementById('nextPageBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            state.rawPage++;
            renderRawDataTable();
        });
    }

    // Initial render
    renderHistoricalChart();
    renderMetricComparisonCharts();
});
