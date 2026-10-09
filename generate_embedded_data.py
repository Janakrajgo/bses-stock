import json
import os
import pandas as pd

def generate_embedded_js():
    os.makedirs("static", exist_ok=True)
    
    with open("kpis.json") as f:
        kpis = json.load(f)
    with open("model_metrics.json") as f:
        metrics = json.load(f)
    with open("forecast_results.json") as f:
        forecast = json.load(f)
    with open("anomalies.json") as f:
        anomalies = json.load(f)
        
    df = pd.read_csv("bses_stock_enriched.csv")
    
    # Store complete historical data
    hist_all = {
        "dates": df['date_str'].tolist(),
        "open": df['open'].tolist(),
        "high": df['high'].tolist(),
        "low": df['low'].tolist(),
        "close": df['close'].tolist(),
        "volume": df['volume'].tolist(),
        "daily_return": [round(float(x * 100), 2) if not pd.isna(x) else 0.0 for x in df['daily_return']],
        "sma_20": [round(float(x), 2) if not pd.isna(x) else None for x in df['sma_20']],
        "sma_50": [round(float(x), 2) if not pd.isna(x) else None for x in df['sma_50']],
        "ema_200": [round(float(x), 2) if not pd.isna(x) else None for x in df['ema_200']],
        "bb_upper": [round(float(x), 2) if not pd.isna(x) else None for x in df['bb_upper']],
        "bb_lower": [round(float(x), 2) if not pd.isna(x) else None for x in df['bb_lower']],
        "bb_mid": [round(float(x), 2) if not pd.isna(x) else None for x in df['bb_mid']],
        "rsi_14": [round(float(x), 1) if not pd.isna(x) else None for x in df['rsi_14']],
        "macd": [round(float(x), 2) if not pd.isna(x) else None for x in df['macd']],
        "macd_signal": [round(float(x), 2) if not pd.isna(x) else None for x in df['macd_signal']],
        "macd_hist": [round(float(x), 2) if not pd.isna(x) else None for x in df['macd_hist']],
        "volatility_30d": [round(float(x * 100), 2) if not pd.isna(x) else None for x in df['volatility_30d']],
        "drawdown": [round(float(x * 100), 2) if not pd.isna(x) else None for x in df['drawdown']]
    }
    
    js_content = f"""// Auto-generated embedded data bundle for offline & standalone high-speed performance
window.EMBEDDED_KPIS = {json.dumps(kpis)};
window.EMBEDDED_METRICS = {json.dumps(metrics)};
window.EMBEDDED_FORECAST = {json.dumps(forecast)};
window.EMBEDDED_ANOMALIES = {json.dumps(anomalies)};
window.EMBEDDED_HISTORICAL = {json.dumps(hist_all)};
console.log('Embedded stock datasets loaded successfully (2,318 historical points, 7 ML models).');
"""

    with open("static/embedded_data.js", "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"Generated static/embedded_data.js ({len(js_content)} bytes)")

if __name__ == "__main__":
    generate_embedded_js()
