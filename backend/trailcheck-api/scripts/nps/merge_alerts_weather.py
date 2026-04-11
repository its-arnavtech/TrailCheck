from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEATHER_FILE = PROJECT_ROOT / "data" / "processed" / "parks" / "park_weather_2024.csv"
ALERTS_FILE = PROJECT_ROOT / "data" / "processed" / "parks" / "nps_alerts_normalized.csv"
OUTPUT_FILE = PROJECT_ROOT / "data" / "processed" / "parks" / "park_weather_alerts_current.csv"


def summarize_alerts(group: pd.DataFrame) -> pd.Series:
    live_alerts = group[group["alert_id"].fillna("") != ""]
    titles = live_alerts["title"].dropna().astype(str).unique().tolist()
    categories = live_alerts["category"].dropna().astype(str).unique().tolist()

    snapshot_at = ""
    if not group["snapshot_at"].dropna().empty:
        snapshot_at = str(group["snapshot_at"].dropna().iloc[0])

    return pd.Series(
        {
            "alert_snapshot_at": snapshot_at,
            "current_alert_count": int(live_alerts["alert_id"].nunique()),
            "current_alert_titles": json.dumps(titles),
            "current_alert_categories": json.dumps(categories),
            "current_alert_ids": json.dumps(live_alerts["alert_id"].dropna().astype(str).unique().tolist()),
        }
    )


def main() -> None:
    weather = pd.read_csv(WEATHER_FILE)
    alerts = pd.read_csv(ALERTS_FILE)

    alert_summary = alerts.groupby("park_slug", dropna=False).apply(summarize_alerts).reset_index()
    merged = weather.merge(alert_summary, left_on="slug", right_on="park_slug", how="left")
    merged = merged.drop(columns=["park_slug"])

    for column in ("alert_snapshot_at", "current_alert_titles", "current_alert_categories", "current_alert_ids"):
        merged[column] = merged[column].fillna("")
    merged["current_alert_count"] = merged["current_alert_count"].fillna(0).astype(int)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(OUTPUT_FILE, index=False)

    print(f"Merged weather+alerts CSV: {OUTPUT_FILE}")
    print(f"Rows written: {len(merged)}")


if __name__ == "__main__":
    main()
