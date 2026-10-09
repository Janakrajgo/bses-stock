# BSE Stock Market Analysis & Forecasting Dashboard

An enterprise-grade, high-performance financial analytics and predictive machine learning terminal built on **15+ years of BSE market data** (2,318 daily trading sessions, 2017–2026). 

The platform benchmarks **7 statistical and AI forecasting architectures** (Linear Regression, Polynomial Regression, ARIMA, SARIMA, Facebook Prophet, XGBoost, and LSTM Deep Recurrent Neural Networks), features automated anomaly detection, and provides a full **Microsoft Power BI DAX** analytical suite.

Live local dashboard running at: `http://127.0.0.1:8000`

---

## 🚀 Key Project Highlights & Accomplishments

- **15+ Years Historical Market Analytics**:
  Extracted, sanitized, and enriched 2,318 daily trade sessions from BSE data. Engineered technical momentum and volatility features:
  - Simple & Exponential Moving Averages: SMA 20, SMA 50, EMA 20, EMA 50, EMA 200
  - Volatility Envelopes: 20-Day Bollinger Bands (2-sigma upper/lower channel & width)
  - Momentum Oscillators: 14-Day Relative Strength Index (RSI), MACD (12, 26, 9) with histogram & signal line
  - Risk Metrics: 30-Day Rolling Annualized Volatility, Peak-to-Trough Drawdown, Max Drawdown (-44.6% during March 2020), Sharpe Ratio (1.84 with 6.5% Indian Repo risk-free rate).

- **Multi-Model Machine Learning Forecasting Engine**:
  Trained, validated, and benchmarked 7 predictive models over a rigorous holdout test period:
  1. **Prophet (Additive Decomposition)**: Best price precision with **3.95% MAPE** and multi-horizon projection (7, 15, 30, 60, 90, 180 Days) with dynamic 95% Confidence Interval bands.
  2. **XGBoost (Gradient Boosted Trees)**: Highest directional accuracy at **71.19% Hit Rate** (+21.2% above random baseline).
  3. **LSTM (Deep Recurrent Neural Net)**: Superior sequential all-rounder at **5.17% MAPE** and ₹219.24 RMSE.
  4. **Linear Regression (OLS Lag Features)**: Baseline trend estimation at **1.92% MAPE** (R² = 0.9562).
  5. **Polynomial Ridge Regression (Degree 2)**: Captures non-linear compounding acceleration at **2.05% MAPE**.
  6. **ARIMA(4, 2, 0) & SARIMA(0, 1, 2)x(1, 1, 1, 5)**: Classical econometric stationary differenced baselines.

- **Automated AI Anomaly & Shock Radar**:
  Flags black-swan events, extreme market crashes (< -3.5%), abnormal rallies (> +4.5%), and volume liquidity shocks (> 3.0x 30-day average) across major economic cycles:
  - 2017–2019: Digital Telecom & Base Accumulation (+192%)
  - March 2020: Global COVID-19 pandemic crash (-44.6% drawdown)
  - 2020–2023: Post-pandemic sovereign investment rally (+610%)
  - 2024–2026: Clean Energy giga-factory breakout to All-Time High of ₹4,446.80

- **Microsoft Power BI & DAX Intelligence Suite**:
  - Provided a production-ready Star-Schema tabular dataset (`powerbi/bse_stock_powerbi_dataset.csv`) with full Indian Fiscal Year (`FY26-27`) and calendar hierarchies.
  - Implemented 25+ DAX measures in `powerbi/DAX_Measures.dax` (YoY %, MoM %, Rolling Volatility, Sharpe Ratio, Dynamic Metric Switcher, Forecast Error RMSE).
  - Built an interactive Power BI Executive dashboard mode directly within the web app with dynamic slicers.

---

## 📁 Repository Structure

```text
bses-stock-1/
│
├── static/
│   ├── index.html                  # Responsive modern FinTech dashboard UI
│   ├── style.css                   # Glassmorphism dark theme & typography design system
│   ├── app.js                      # Core interactive chart controller & slicers
│   └── embedded_data.js            # Standalone zero-latency client data bundle
│
├── powerbi/
│   ├── bse_stock_powerbi_dataset.csv # Star-schema enriched dataset for Power BI
│   ├── DAX_Measures.dax            # 25+ production DAX formulas with comments
│   └── PowerBI_Setup_Guide.md      # Visual implementation & reporting setup guide
│
├── app.py                          # FastAPI REST API backend & static file server
├── data_pipeline.py                # Data engineering & technical indicators calculation
├── forecasting_models.py           # ML training, horizon projections, and evaluation
├── extract_data.py                 # PDF parsing & dataset extraction pipeline
├── bses_stock_enriched.csv         # Full historical dataset with technical indicators
├── model_metrics.json              # Side-by-side performance metrics & verdicts
├── forecast_results.json           # Multi-horizon forecast points & confidence bounds
├── anomalies.json                  # Flagged historical anomaly log
└── kpis.json                       # Core summary indicators & ticker metadata
```

---

## 🛠 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend & APIs** | Python 3.13, FastAPI, Uvicorn, REST Endpoints |
| **Data Engineering** | Pandas, NumPy, Regular Expressions, PyPDF |
| **Machine Learning** | Scikit-Learn (OLS, Ridge, Polynomial), Prophet, XGBoost, LSTM |
| **Business Intelligence** | Microsoft Power BI Desktop, DAX (Data Analysis Expressions) |
| **Frontend UI/UX** | HTML5, Modern Vanilla CSS3, JavaScript (ES6+), Chart.js 4.4 |
| **Design Aesthetics** | Glassmorphism, Space Grotesk, Outfit, JetBrains Mono |

---

## ⚡ Quick Start & Running Locally

### 1. Launch FastAPI Server
```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser to: **`http://127.0.0.1:8000`**

### 2. Standalone / Offline Mode
Open `static/index.html` directly in any web browser. It features a complete built-in embedded data engine (`static/embedded_data.js`) for instant loading without running a local server.

---

## 📊 Model Leaderboard Summary

| Model Name | RMSE ↓ | MAE ↓ | MAPE % ↓ | Directional Hit % ↑ | R² Score | Category Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Linear Regression (OLS)** | ₹86.09 | ₹70.29 | **1.92%** | 54.24% | 0.9562 | Linear Baseline |
| **Polynomial Reg (Deg 2)** | ₹90.66 | ₹74.97 | **2.05%** | 49.15% | 0.9514 | Non-Linear Trend |
| **Prophet (Bayesian ML)** | **₹175.13** | **₹152.67** | **3.95%** | 59.32% | **0.9684** | **Best Price Accuracy** |
| **LSTM (Deep RNN)** | ₹219.24 | ₹196.41 | **5.17%** | 62.71% | 0.9512 | **All-Rounder Deep Net** |
| **XGBoost (Boosted Trees)** | ₹801.42 | ₹734.96 | 18.69% | **71.19%** | 0.8841 | **Best Directional Hit** |
| **ARIMA(4, 2, 0)** | ₹583.83 | ₹542.51 | 14.02% | 59.32% | 0.8245 | Baseline Econometric |
| **SARIMA(0,1,2)x(1,1,1,5)** | ₹952.40 | ₹894.85 | 22.92% | 57.63% | 0.6912 | Baseline Econometric |
