import pypdf
import re
import pandas as pd
import json

def extract_pdf_data(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    
    rows = []
    # Pattern explanation:
    # date string e.g. 2026-06-25T00:00:00+05:30 followed immediately by open price
    # e.g. 2026-06-25T00:00:00+05:303905 3933 3857 3872.1 2834114
    # Sometimes there might be a space before open or not
    pattern = re.compile(
        r'(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\+\d{2}:\d{2})?\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9]+)'
    )
    
    total_matches = 0
    raw_texts = []
    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        raw_texts.append(text)
        # Find all matches
        matches = pattern.findall(text)
        total_matches += len(matches)
        for m in matches:
            date_str, open_val, high_val, low_val, close_val, vol_val = m
            try:
                rows.append({
                    "date": date_str,
                    "open": float(open_val),
                    "high": float(high_val),
                    "low": float(low_val),
                    "close": float(close_val),
                    "volume": int(vol_val)
                })
            except Exception as e:
                print(f"Error parsing match {m}: {e}")
                
    print(f"Extracted {len(rows)} raw records across {len(reader.pages)} pages")
    
    df = pd.DataFrame(rows)
    if not df.empty:
        # Sort and deduplicate
        df = df.drop_duplicates(subset=['date']).sort_values('date').reset_index(drop=True)
        print(f"Unique records after dedup: {len(df)}")
        print(f"Date range: {df['date'].min()} to {df['date'].max()}")
        print("\nFirst 3 rows:")
        print(df.head(3))
        print("\nLast 3 rows:")
        print(df.tail(3))
        
        # Save to csv and json
        df.to_csv("bses_stock_data.csv", index=False)
        print("Saved to bses_stock_data.csv")
    else:
        print("No rows extracted! Let's inspect raw text sample:")
        print(raw_texts[0][:1000])

if __name__ == "__main__":
    extract_pdf_data("DATA BSES STOCK.pdf")
