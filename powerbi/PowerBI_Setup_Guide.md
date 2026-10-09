# BSE Stock Market Analysis & Forecasting Dashboard — Power BI Guide

This guide provides end-to-end instructions for loading the enriched dataset into Microsoft Power BI Desktop, creating the interactive visuals, configuring slicers, and applying the DAX measures.

---

## 1. Data Source & Model Setup

1. **Open Power BI Desktop**.
2. Click **Get Data** -> **Text/CSV**.
3. Select `powerbi/bse_stock_powerbi_dataset.csv`.
4. In Power Query Editor:
   - Ensure the `Date` column data type is set to **Date**.
   - Verify that price columns (`Open_Price`, `High_Price`, `Low_Price`, `Close_Price`) are set to **Decimal Number**.
   - Ensure `Volume` is set to **Whole Number**.
   - Click **Close & Apply**.
5. Name the table in Power BI: `BSE_Stock_Data`.

---

## 2. Power BI Slicers Setup

Create the following slicers in the left filter panel or top navigation bar:

1. **Date Hierarchy Slicer**:
   - Fields: `FiscalYear` -> `Quarter` -> `MonthName`.
   - Style: Dropdown or Horizontal tile slider.
2. **Anomaly Type Filter**:
   - Field: `AnomalyType` (Values: *All*, *Normal*, *Crash*, *Surge*, *Volume Shock*).
3. **Dynamic Metric Switcher**:
   - Create a single-column disconnected table via **Enter Data**:
     - Table Name: `Metric_Selection`
     - Column: `Metric`
     - Rows:
       - `Closing Price`
       - `SMA 20`
       - `SMA 50`
       - `Daily Return %`
       - `Volume`
   - Use `[Selected Dynamic Metric]` measure from `DAX_Measures.dax`.

---

## 3. Recommended Visualizations & Layout

| Visual Type | Fields / Measures | Purpose |
| :--- | :--- | :--- |
| **KPI Card 1** | `[Latest Close Price]`, Callout: `[Daily Price Change %]` | Real-time valuation banner |
| **KPI Card 2** | `[52W High]` & `[52W Low]` | Trading range bracket |
| **KPI Card 3** | `[Long Term CAGR %]` | 15+ year / long-term annualized wealth creation |
| **KPI Card 4** | `[Sharpe Ratio]` & `[Annualized Volatility 30D]` | Risk-adjusted performance gauge |
| **Line Chart** | X-Axis: `Date`<br>Y-Axis: `Close_Price`, `SMA_20`, `SMA_50`, `Bollinger_Upper`, `Bollinger_Lower` | Primary price action & volatility channel |
| **Combo / Bar Chart** | X-Axis: `Date`<br>Column: `Volume`<br>Line: `Daily_Return_Pct` | Trading activity & liquidity shocks |
| **Forecast Overlay** | X-Axis: `Date`<br>Lines: `Close_Price`, `Forecast_XGBoost`, `Forecast_LSTM` | Actual vs. ML Predictions on test horizon |
| **Anomaly Matrix** | Rows: `Date`, `AnomalyType`<br>Values: `Close_Price`, `Daily_Return_Pct`, `Volume Spike Ratio` | Event investigation & stress testing |

---

## 4. DAX Measures Import

All 25+ DAX measures are defined with comments in [`DAX_Measures.dax`](file:///c:/Users/janak%20raj%20goyal/OneDrive/Documents/bses-stock-1/powerbi/DAX_Measures.dax). 

In Power BI:
1. Click **New Measure** in the Modeling tab.
2. Copy & paste the desired measure formula.
3. Set the data format (Currency `₹`, Percentage `%`, or Decimal).
