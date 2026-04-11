import ast
import json
from pathlib import Path

import pandas as pd

YEAR = "2024"
INPUT_FILE = Path("data") / "processed" / "parks" / f"park_weather_hazards_{YEAR}.csv"
OUTPUT_FILE = Path("data") / "processed" / "training" / "dataset.jsonl"


def parse_hazards(value):
    if isinstance(value, list):
        return value
    if pd.isna(value):
        return []
    return ast.literal_eval(value)


def build_notification(hazards):
    if hazards:
        return f"Conditions include {', '.join(hazards)}"
    return "No significant hazards detected"


def main():
    df = pd.read_csv(INPUT_FILE)
    df["hazards"] = df["hazards"].apply(parse_hazards)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        for _, row in df.iterrows():
            input_text = f"""
Weather:
- Max Temp: {row['TMAX']} C
- Min Temp: {row['TMIN']} C
- Rain: {row['PRCP']} mm
- Snow: {row['SNOW']} mm
"""
            output = {
                "riskLevel": "HIGH" if len(row["hazards"]) > 1 else "LOW",
                "hazards": row["hazards"],
                "notification": build_notification(row["hazards"]),
            }
            record = {
                "input": input_text.strip(),
                "output": json.dumps(output),
            }
            f.write(json.dumps(record) + "\n")

    print("Training dataset created")


if __name__ == "__main__":
    main()
