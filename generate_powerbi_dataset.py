import pandas as pd
import numpy as np
import os
import json

def generate_powerbi_model():
    os.makedirs("powerbi", exist_ok=True)
    
    df = pd.read_csv("bses_stock_enriched.csv")
    df['date'] = pd.to_datetime(df['date'])
    
    # Add calendar fields for Power BI Date Hierarchies
    df['Year'] = df['date'].dt.year
    df['Quarter'] = 'Q' + df['date'].dt.quarter.astype(str)
    df['YearQuarter'] = df['Year'].astype(str) + '-' + df['Quarter']
    df['MonthNum'] = df['date'].dt.month
    df['MonthName'] = df['date'].dt.strftime('%b')
    df['YearMonth'] = df['date'].dt.strftime('%Y-%m')
    df['DayOfWeek'] = df['date'].dt.day_name()
    df['DayNum'] = df['date'].dt.day
    
    # Fiscal Year (India: April to March)
    df['FiscalYear'] = df['date'].apply(lambda d: f"FY{d.year if d.month > 3 else d.year - 1}-{str((d.year + 1) if d.month > 3 else d.year)[-2:]}")
    
    # Load anomalies to tag
    with open("anomalies.json") as f:
        anomalies_list = json.load(f)
    anomaly_dates = {a['date']: a['type'] for a in anomalies_list}
    
    df['IsAnomaly'] = df['date_str'].apply(lambda d: 1 if d in anomaly_dates else 0)
    df['AnomalyType'] = df['date_str'].apply(lambda d: anomaly_dates.get(d, "Normal"))
    
    # Load forecast outputs to join with test period
    with open("forecast_results.json") as f:
        fc = json.load(f)
        
    prophet_map = {}
    if "prophet" in fc and "30" in fc["prophet"]:
        p30 = fc["prophet"]["30"]
        for d, y in zip(p30["fut_dates"], p30["fut_yhat"]):
            prophet_map[d] = y
            
    xgb_map = {}
    if "xgboost" in fc:
        for d, y in zip(fc["xgboost"].get("dates", []), fc["xgboost"].get("predicted", [])):
            xgb_map[d] = y
            
    lstm_map = {}
    if "lstm" in fc:
        for d, y in zip(fc["lstm"].get("dates", []), fc["lstm"].get("predicted", [])):
            lstm_map[d] = y
            
    df['Forecast_XGBoost'] = df['date_str'].map(xgb_map)
    df['Forecast_LSTM'] = df['date_str'].map(lstm_map)
    df['Forecast_Prophet'] = df['date_str'].map(prophet_map)
    
    # Clean export for Power BI
    pbi_cols = [
        'date_str', 'Year', 'FiscalYear', 'Quarter', 'YearQuarter', 'MonthNum', 'MonthName',
        'YearMonth', 'DayOfWeek', 'open', 'high', 'low', 'close', 'volume',
        'daily_return', 'cum_return', 'sma_20', 'sma_50', 'ema_200',
        'bb_upper', 'bb_mid', 'bb_lower', 'rsi_14', 'volatility_30d', 'drawdown',
        'IsAnomaly', 'AnomalyType', 'Forecast_XGBoost', 'Forecast_LSTM'
    ]
    
    df_pbi = df[pbi_cols].rename(columns={
        'date_str': 'Date',
        'open': 'Open_Price',
        'high': 'High_Price',
        'low': 'Low_Price',
        'close': 'Close_Price',
        'volume': 'Volume',
        'daily_return': 'Daily_Return_Pct',
        'cum_return': 'Cumulative_Return',
        'sma_20': 'SMA_20',
        'sma_50': 'SMA_50',
        'ema_200': 'EMA_200',
        'bb_upper': 'Bollinger_Upper',
        'bb_mid': 'Bollinger_Mid',
        'bb_lower': 'Bollinger_Lower',
        'rsi_14': 'RSI_14',
        'volatility_30d': 'Volatility_30D',
        'drawdown': 'Drawdown_Pct'
    })
    
    out_csv = "powerbi/bse_stock_powerbi_dataset.csv"
    df_pbi.to_csv(out_csv, index=False)
    print(f"Generated Power BI star-schema dataset with {len(df_pbi)} rows at {out_csv}")

if __name__ == "__main__":
    generate_powerbi_model()
