from __future__ import annotations

import argparse
import csv
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "nps" / "alerts"
OUTPUT_FILE = PROJECT_ROOT / "data" / "processed" / "parks" / "nps_alerts_normalized.csv"

DATE_KEYS = (
    "effectiveDate",
    "eventStartDate",
    "startDate",
    "beginDate",
    "date",
)
END_DATE_KEYS = ("eventEndDate", "endDate", "expireDate")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize raw NPS alert snapshots into a CSV.")
    parser.add_argument("--snapshot", help="Optional explicit snapshot filename.")
    return parser.parse_args()


def latest_snapshot() -> Path:
    candidates = sorted(RAW_DIR.glob("alerts_snapshot_*.json"))
    if not candidates:
        raise FileNotFoundError(f"No alert snapshots found in {RAW_DIR}")
    return candidates[-1]


def parse_iso_date(value: Any) -> str:
    if not value:
        return ""
    text = str(value).strip()
    if not text:
        return ""

    normalized = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).date().isoformat()
    except ValueError:
        pass

    for pattern in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, pattern).date().isoformat()
        except ValueError:
            continue

    return ""


def derive_start_date(alert: dict[str, Any], snapshot_date: str) -> str:
    for key in DATE_KEYS:
        parsed = parse_iso_date(alert.get(key))
        if parsed:
            return parsed
    return snapshot_date


def derive_end_date(alert: dict[str, Any], start_date: str) -> str:
    for key in END_DATE_KEYS:
        parsed = parse_iso_date(alert.get(key))
        if parsed:
            return parsed
    return start_date


def flatten_snapshot(snapshot_path: Path) -> list[dict[str, Any]]:
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    fetched_at = snapshot["fetched_at"]
    snapshot_date = parse_iso_date(fetched_at)
    rows: list[dict[str, Any]] = []

    for park_payload in snapshot.get("parks", []):
        park = park_payload.get("park", {})
        payload = park_payload.get("payload", {})
        alerts = payload.get("data") or []
        error = payload.get("error") or {}

        if error:
            rows.append(
                {
                    "snapshot_file": snapshot_path.name,
                    "snapshot_at": fetched_at,
                    "park_name": park.get("name", ""),
                    "park_slug": park.get("slug", ""),
                    "park_code": park.get("park_code", ""),
                    "state": park.get("state", ""),
                    "alert_id": "",
                    "title": "",
                    "category": "",
                    "url": "",
                    "start_date": "",
                    "end_date": "",
                    "last_indexed_date": "",
                    "description": "",
                    "error_type": error.get("type", ""),
                    "error_status": error.get("status", ""),
                    "error_reason": error.get("reason", ""),
                }
            )
            continue

        if not alerts:
            rows.append(
                {
                    "snapshot_file": snapshot_path.name,
                    "snapshot_at": fetched_at,
                    "park_name": park.get("name", ""),
                    "park_slug": park.get("slug", ""),
                    "park_code": park.get("park_code", ""),
                    "state": park.get("state", ""),
                    "alert_id": "",
                    "title": "",
                    "category": "",
                    "url": "",
                    "start_date": snapshot_date,
                    "end_date": snapshot_date,
                    "last_indexed_date": "",
                    "description": "",
                    "error_type": "",
                    "error_status": "",
                    "error_reason": "",
                }
            )
            continue

        for alert in alerts:
            start_date = derive_start_date(alert, snapshot_date)
            end_date = derive_end_date(alert, start_date)
            rows.append(
                {
                    "snapshot_file": snapshot_path.name,
                    "snapshot_at": fetched_at,
                    "park_name": park.get("name", ""),
                    "park_slug": park.get("slug", ""),
                    "park_code": park.get("park_code", ""),
                    "state": park.get("state", ""),
                    "alert_id": alert.get("id", ""),
                    "title": (alert.get("title") or "").strip(),
                    "category": (alert.get("category") or "").strip(),
                    "url": alert.get("url", ""),
                    "start_date": start_date,
                    "end_date": end_date,
                    "last_indexed_date": parse_iso_date(alert.get("lastIndexedDate")),
                    "description": " ".join((alert.get("description") or "").split()),
                    "error_type": "",
                    "error_status": "",
                    "error_reason": "",
                }
            )

    return rows


def main() -> None:
    args = parse_args()
    snapshot_path = RAW_DIR / args.snapshot if args.snapshot else latest_snapshot()
    rows = flatten_snapshot(snapshot_path)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else [])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Normalized alerts CSV: {OUTPUT_FILE}")
    print(f"Rows written: {len(rows)}")


if __name__ == "__main__":
    main()
