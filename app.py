import os
import json
import pandas as pd
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="BSE Stock Market Analysis & Forecasting Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load datasets on startup
CSV_PATH = "bses_stock_enriched.csv"
KPIS_PATH = "kpis.json"
METRICS_PATH = "model_metrics.json"
FORECAST_PATH = "forecast_results.json"
ANOMALIES_PATH = "anomalies.json"

df = pd.read_csv(CSV_PATH) if os.path.exists(CSV_PATH) else pd.DataFrame()
if not df.empty:
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)

with open(KPIS_PATH) as f:
    kpis_data = json.load(f)

with open(METRICS_PATH) as f:
    metrics_data = json.load(f)

with open(FORECAST_PATH) as f:
    forecast_data = json.load(f)

with open(ANOMALIES_PATH) as f:
    anomalies_data = json.load(f)


@app.get("/api/kpis")
def get_kpis():
    return kpis_data


@app.get("/api/metrics")
def get_metrics():
    return metrics_data


@app.get("/api/historical")
def get_historical(period: str = Query("1Y", pattern="^(1W|1M|3M|6M|1Y|3Y|5Y|ALL)$")):
    if df.empty:
        raise HTTPException(status_code=500, detail="Data not available")
        
    end_date = df['date'].iloc[-1]
    
    period_map = {
        "1W": 7,
        "1M": 30,
        "3M": 90,
        "6M": 180,
        "1Y": 365,
        "3Y": 365 * 3,
        "5Y": 365 * 5,
        "ALL": None
    }
    
    days = period_map.get(period)
    if days is not None:
        start_date = end_date - pd.Timedelta(days=days)
        sub_df = df[df['date'] >= start_date].copy()
    else:
        sub_df = df.copy()
        
    dates = [d.strftime('%Y-%m-%d') for d in sub_df['date']]
    
    return {
        "period": period,
        "count": len(sub_df),
        "dates": dates,
        "open": sub_df['open'].tolist(),
        "high": sub_df['high'].tolist(),
        "low": sub_df['low'].tolist(),
        "close": sub_df['close'].tolist(),
        "volume": sub_df['volume'].tolist(),
        "daily_return": [round(float(x * 100), 2) if not pd.isna(x) else 0.0 for x in sub_df['daily_return']],
        "sma_20": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['sma_20']],
        "sma_50": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['sma_50']],
        "ema_200": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['ema_200']],
        "bb_upper": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['bb_upper']],
        "bb_lower": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['bb_lower']],
        "bb_mid": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['bb_mid']],
        "rsi_14": [round(float(x), 1) if not pd.isna(x) else None for x in sub_df['rsi_14']],
        "macd": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['macd']],
        "macd_signal": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['macd_signal']],
        "macd_hist": [round(float(x), 2) if not pd.isna(x) else None for x in sub_df['macd_hist']],
        "volatility_30d": [round(float(x * 100), 2) if not pd.isna(x) else None for x in sub_df['volatility_30d']],
        "drawdown": [round(float(x * 100), 2) if not pd.isna(x) else None for x in sub_df['drawdown']],
    }


@app.get("/api/forecast/{model_name}")
def get_forecast(model_name: str, days: int = Query(30)):
    model_name = model_name.lower()
    
    if model_name == "prophet":
        prophet_dict = forecast_data.get("prophet", {})
        # Pick requested days or closest available
        str_days = str(days)
        if str_days in prophet_dict:
            return prophet_dict[str_days]
        # Fallback to closest available
        available = [int(k) for k in prophet_dict.keys()]
        if available:
            closest = min(available, key=lambda x: abs(x - days))
            return prophet_dict[str(closest)]
        raise HTTPException(status_code=404, detail="Prophet forecast unavailable")
        
    elif model_name in forecast_data:
        return forecast_data[model_name]
        
    else:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found. Available: prophet, xgboost, lstm, linear_regression, polynomial")


@app.get("/api/anomalies")
def get_anomalies():
    return anomalies_data


@app.get("/api/powerbi/measures")
def get_powerbi_measures():
    dax_path = "powerbi/DAX_Measures.dax"
    if os.path.exists(dax_path):
        with open(dax_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    return {"content": ""}


# Serve static web dashboard
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_index():
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "BSE Stock Market Analysis & Forecasting Dashboard API is running. Access /static/index.html"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
