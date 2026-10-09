import pandas as pd
import numpy as np
import json
import os

def build_data_pipeline(csv_path="bses_stock_data.csv"):
    df = pd.read_csv(csv_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # 1. Price Changes & Returns
    df['daily_return'] = df['close'].pct_change()
    df['log_return'] = np.log(df['close'] / df['close'].shift(1))
    df['cum_return'] = (1 + df['daily_return'].fillna(0)).cumprod() - 1
    
    # 2. Moving Averages
    df['sma_20'] = df['close'].rolling(window=20).mean()
    df['sma_50'] = df['close'].rolling(window=50).mean()
    df['ema_20'] = df['close'].ewm(span=20, adjust=False).mean()
    df['ema_50'] = df['close'].ewm(span=50, adjust=False).mean()
    df['ema_200'] = df['close'].ewm(span=200, adjust=False).mean()
    
    # 3. Bollinger Bands (20-day, 2 std dev)
    rolling_std_20 = df['close'].rolling(window=20).std()
    df['bb_mid'] = df['sma_20']
    df['bb_upper'] = df['bb_mid'] + (rolling_std_20 * 2)
    df['bb_lower'] = df['bb_mid'] - (rolling_std_20 * 2)
    df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_mid']
    
    # 4. Relative Strength Index (RSI 14)
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss.replace(0, np.nan)
    df['rsi_14'] = 100 - (100 / (1 + rs))
    df['rsi_14'] = df['rsi_14'].fillna(50)
    
    # 5. MACD (12, 26, 9)
    ema_12 = df['close'].ewm(span=12, adjust=False).mean()
    ema_26 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = ema_12 - ema_26
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd'] - df['macd_signal']
    
    # 6. Volatility (Annualized 30-Day Rolling)
    df['volatility_30d'] = df['daily_return'].rolling(window=30).std() * np.sqrt(252)
    
    # 7. Drawdown Analysis
    df['cum_max'] = df['close'].cummax()
    df['drawdown'] = (df['close'] - df['cum_max']) / df['cum_max']
    
    # 8. Volume Metrics
    df['vol_sma_30'] = df['volume'].rolling(window=30).mean()
    df['vol_ratio'] = df['volume'] / df['vol_sma_30'].replace(0, np.nan)
    
    # 9. Anomaly Detection
    # Anomaly conditions:
    # a) Severe single-day crash: daily return < -3.5%
    # b) Extreme single-day surge: daily return > +4.5%
    # c) Volume explosion: volume > 3.0x 30-day average
    # d) Volatility spike: price moves outside 2.5 Bollinger deviations
    df['is_crash_anomaly'] = df['daily_return'] < -0.035
    df['is_surge_anomaly'] = df['daily_return'] > 0.045
    df['is_volume_anomaly'] = df['vol_ratio'] > 3.0
    
    anomalies = []
    for idx, row in df.iterrows():
        reasons = []
        if row['is_crash_anomaly']:
            reasons.append(f"Severe Drop ({row['daily_return']*100:.2f}%)")
        if row['is_surge_anomaly']:
            reasons.append(f"Extreme Rally (+{row['daily_return']*100:.2f}%)")
        if row['is_volume_anomaly']:
            reasons.append(f"Abnormal Volume Spike ({row['vol_ratio']:.1f}x avg)")
            
        if reasons:
            anomalies.append({
                "date": row['date'].strftime('%Y-%m-%d'),
                "close": round(float(row['close']), 2),
                "open": round(float(row['open']), 2),
                "high": round(float(row['high']), 2),
                "low": round(float(row['low']), 2),
                "volume": int(row['volume']),
                "daily_return_pct": round(float(row['daily_return'] * 100), 2) if not np.isnan(row['daily_return']) else 0.0,
                "reasons": reasons,
                "type": "Crash" if row['is_crash_anomaly'] else ("Surge" if row['is_surge_anomaly'] else "Volume Shock")
            })
            
    print(f"Total identified anomalies: {len(anomalies)}")
    
    # Format date back to string for output
    df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
    
    # Round numerical columns for clean storage
    numeric_cols = ['daily_return', 'cum_return', 'sma_20', 'sma_50', 'ema_20', 'ema_50', 'ema_200',
                    'bb_mid', 'bb_upper', 'bb_lower', 'rsi_14', 'macd', 'macd_signal', 'macd_hist',
                    'volatility_30d', 'drawdown', 'vol_ratio']
    for col in numeric_cols:
        df[col] = df[col].round(4)
        
    df.to_csv("bses_stock_enriched.csv", index=False)
    with open("anomalies.json", "w") as f:
        json.dump(anomalies, f, indent=2)
        
    # Summary KPIs
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    high_52w = df.tail(252)['high'].max()
    low_52w = df.tail(252)['low'].min()
    ath = df['high'].max()
    atl = df['low'].min()
    
    # Total CAGR over dataset
    years = (df['date'].max() - df['date'].min()).days / 365.25
    cagr = ((latest['close'] / df.iloc[0]['close']) ** (1 / years) - 1) * 100
    
    kpis = {
        "ticker": "RELIANCE.NS (BSE / NSE)",
        "company_name": "Reliance Industries Ltd / BSE Stock",
        "last_date": latest['date'].strftime('%Y-%m-%d'),
        "current_price": round(float(latest['close']), 2),
        "prev_price": round(float(prev['close']), 2),
        "price_change": round(float(latest['close'] - prev['close']), 2),
        "price_change_pct": round(float((latest['close'] - prev['close']) / prev['close'] * 100), 2),
        "open": round(float(latest['open']), 2),
        "high": round(float(latest['high']), 2),
        "low": round(float(latest['low']), 2),
        "volume": int(latest['volume']),
        "high_52w": round(float(high_52w), 2),
        "low_52w": round(float(low_52w), 2),
        "all_time_high": round(float(ath), 2),
        "all_time_low": round(float(atl), 2),
        "total_data_points": len(df),
        "date_span_years": round(years, 1),
        "cagr_pct": round(cagr, 2),
        "max_drawdown_pct": round(float(df['drawdown'].min() * 100), 2),
        "current_rsi": round(float(latest['rsi_14']), 1),
        "current_volatility_pct": round(float(latest['volatility_30d'] * 100), 2),
        "current_sma_20": round(float(latest['sma_20']), 2),
        "current_sma_50": round(float(latest['sma_50']), 2),
        "current_ema_200": round(float(latest['ema_200']), 2),
        "total_anomalies": len(anomalies)
    }
    
    with open("kpis.json", "w") as f:
        json.dump(kpis, f, indent=2)
        
    print("Enriched dataset and KPIs generated successfully!")
    print(f"Latest price: INR {kpis['current_price']}, 52W High: INR {kpis['high_52w']}, 52W Low: INR {kpis['low_52w']}, CAGR: {kpis['cagr_pct']}%")

if __name__ == "__main__":
    build_data_pipeline()
