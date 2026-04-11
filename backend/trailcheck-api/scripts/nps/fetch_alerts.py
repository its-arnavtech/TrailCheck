from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from parks import PARKS


BASE_URL = "https://developer.nps.gov/api/v1/alerts"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "nps" / "alerts"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch raw NPS alert snapshots.")
    parser.add_argument("--limit", type=int, help="Only fetch the first N parks.")
    parser.add_argument("--parks", help="Comma-separated park slugs to fetch.")
    parser.add_argument("--snapshot-name", help="Optional snapshot file name.")
    return parser.parse_args()


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def resolve_api_key() -> str:
    env_values = load_env_file(ENV_FILE)
    api_key = os.environ.get("NPS_API_KEY") or env_values.get("NPS_API_KEY")
    if not api_key:
        raise RuntimeError("Missing NPS_API_KEY in environment or backend/trailcheck-api/.env")
    return api_key


def select_parks(args: argparse.Namespace) -> list[dict[str, str]]:
    parks = list(PARKS)

    if args.parks:
        wanted = {slug.strip() for slug in args.parks.split(",") if slug.strip()}
        parks = [park for park in parks if park["slug"] in wanted]

    if args.limit:
        parks = parks[: args.limit]

    if not parks:
        raise RuntimeError("No parks selected for fetch.")

    return parks


def fetch_park_alerts(api_key: str, park: dict[str, str]) -> dict[str, Any]:
    query = urlencode({"parkCode": park["park_code"], "api_key": api_key, "limit": 50})
    request = Request(f"{BASE_URL}?{query}", headers={"Accept": "application/json"})

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        payload = {
            "error": {
                "type": "http_error",
                "status": exc.code,
                "reason": exc.reason,
            }
        }
    except URLError as exc:
        payload = {"error": {"type": "url_error", "reason": str(exc.reason)}}

    alerts = payload.get("data") or []
    return {
        "park": park,
        "fetched_alert_count": len(alerts) if isinstance(alerts, list) else 0,
        "payload": payload,
    }


def main() -> int:
    args = parse_args()
    api_key = resolve_api_key()
    selected_parks = select_parks(args)
    fetched_at = datetime.now(timezone.utc).replace(microsecond=0)
    snapshot_name = args.snapshot_name or f"alerts_snapshot_{fetched_at.strftime('%Y%m%dT%H%M%SZ')}.json"

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_path = RAW_DIR / snapshot_name

    parks_payload = [fetch_park_alerts(api_key, park) for park in selected_parks]
    snapshot = {
        "fetched_at": fetched_at.isoformat(),
        "source": BASE_URL,
        "park_count": len(selected_parks),
        "parks": parks_payload,
    }

    snapshot_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    success_count = sum(1 for park in parks_payload if not park["payload"].get("error"))
    total_alerts = sum(park["fetched_alert_count"] for park in parks_payload)
    print(f"Saved snapshot: {snapshot_path}")
    print(f"Parks fetched: {len(selected_parks)} | Successful: {success_count} | Alerts found: {total_alerts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
