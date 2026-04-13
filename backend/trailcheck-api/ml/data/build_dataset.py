from __future__ import annotations

import argparse
import ast
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import pandas as pd

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.common import load_config, resolve_backend_path
from ml.data.park_profiles import get_park_metadata, parse_observed_date, resolve_season
from ml.data.prompts import SYSTEM_PROMPT, build_user_message
from ml.inference.schema import TrailSafetyOutput

SEVERITY_RANK = {"LOW": 1, "MODERATE": 2, "HIGH": 3, "EXTREME": 4}
RANK_TO_SEVERITY = {value: key for key, value in SEVERITY_RANK.items()}
WET_PROFILES = {"temperate_forest", "swamp_wetland", "alpine", "coastal"}
EXPOSED_PROFILES = {"desert", "canyon_exposure"}
HOT_PROFILES = {"desert", "canyon_exposure", "swamp_wetland", "coastal"}

ALERT_KEYWORDS: dict[str, tuple[list[str], str, str]] = {
    "TRAIL_CLOSURE": (
        ["closure", "closed", "road closed", "trail closed", "access closed", "construction"],
        "HIGH",
        "Active closures can block trail or road access.",
    ),
    "FLOODING": (
        ["flood", "flash flood", "high water", "washout", "washed out"],
        "HIGH",
        "Alert language points to runoff, flooding, or washout concerns.",
    ),
    "SNOW_ICE": (
        ["winter storm", "snow", "icy", "ice", "sleet", "tire chains"],
        "HIGH",
        "Winter weather or icy access is called out in the alert set.",
    ),
    "HEAT": (
        ["heat", "extreme heat", "dangerous heat"],
        "HIGH",
        "Heat-related alert language raises exposure risk.",
    ),
    "WILDFIRE": (
        ["fire", "wildfire", "red flag", "smoke from fire", "evacuat"],
        "HIGH",
        "Fire-related alert language suggests active wildfire concern or restrictions.",
    ),
    "AIR_QUALITY": (
        ["smoke", "air quality", "haze"],
        "MODERATE",
        "Smoke or air quality language can affect breathing comfort and visibility.",
    ),
    "LIGHTNING": (
        ["thunderstorm", "lightning", "electrical storm"],
        "HIGH",
        "Storm language suggests lightning exposure on open terrain.",
    ),
    "HIGH_WIND": (
        ["high wind", "wind advisory", "gust", "blowing dust", "strong wind"],
        "MODERATE",
        "Wind-related alerts can affect exposed routes and access roads.",
    ),
    "COASTAL_HAZARD": (
        ["surf", "wave", "marine", "coastal", "hurricane", "tropical storm", "rough seas"],
        "HIGH",
        "Coastal or marine alert language can affect island access and shoreline routes.",
    ),
}

WEATHER_HAZARD_MAP = {
    "FLOOD_RISK": ("FLOODING", "HIGH", "Heavy precipitation already triggered a flood-risk signal."),
    "MUDDY": ("MUD", "MODERATE", "Recent precipitation already triggered a muddy-trail signal."),
    "SNOW": ("SNOW_ICE", "HIGH", "Snowfall already triggered a snow-and-ice signal."),
    "HEAT": ("HEAT", "HIGH", "Hot conditions already triggered a heat signal."),
}

RECOMMENDED_ACTIONS = {
    "HEAT": "Avoid peak afternoon exposure, carry extra water, and shorten exposed travel.",
    "DEHYDRATION": "Carry more water than usual and plan refill points before committing to long routes.",
    "WILDFIRE": "Check fire restrictions and smoke conditions before departure and be ready to change plans.",
    "AIR_QUALITY": "Limit strenuous effort in smoky conditions and consider alternate routes if visibility drops.",
    "SNOW_ICE": "Use traction or winter gear and verify road and trail access before starting.",
    "FLOODING": "Avoid low water crossings and narrow drainages and confirm trail conditions before hiking.",
    "MUD": "Expect slower footing and stay on durable surfaces to avoid damaging wet trails.",
    "HIGH_WIND": "Use extra caution on exposed overlooks, ridges, and bridges.",
    "LIGHTNING": "Leave exposed terrain early and avoid summits or open areas during storms.",
    "TRAIL_CLOSURE": "Respect posted closures and use the latest NPS conditions page before traveling.",
    "COLD": "Dress for cold exposure, carry extra insulation, and watch for weather changes.",
    "COASTAL_HAZARD": "Check marine access, surf conditions, and weather before shoreline or boat travel.",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build structured SFT data for TrailCheck.")
    parser.add_argument(
        "--config",
        default="ml/configs/trailcheck_qlora_4060.yaml",
        help="Relative or absolute path to the training config YAML.",
    )
    return parser.parse_args()


def parse_list_field(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if pd.isna(value):
        return []

    text = str(value).strip()
    if not text:
        return []

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    try:
        return ast.literal_eval(text)
    except (ValueError, SyntaxError):
        return []


def summarize_impact(description: str | None) -> str:
    if description is None or pd.isna(description):
        text = ""
    else:
        text = str(description).replace("\n", " ").strip()
    if not text:
        return "Review the latest park advisory for details."
    sentence = text.split(". ")[0].strip()
    if not sentence.endswith("."):
        sentence += "."
    return sentence[:240]


def normalize_alert_records(alerts_df: pd.DataFrame) -> dict[str, list[dict[str, Any]]]:
    records_by_slug: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for _, row in alerts_df.iterrows():
        slug = str(row.get("park_slug", "")).strip().lower()
        park_code = str(row.get("park_code", "")).strip().lower()
        if not slug and not park_code:
            continue

        start_date = row.get("start_date") or row.get("snapshot_at")
        end_date = row.get("end_date") or start_date
        if not start_date:
            continue

        try:
            start = parse_observed_date(start_date)
            end = parse_observed_date(end_date)
        except ValueError:
            continue

        record = {
            "title": str(row.get("title", "")).strip(),
            "category": str(row.get("category", "General")).strip() or "General",
            "impact": summarize_impact(row.get("description")),
            "start_date": start,
            "end_date": end,
            "park_code": park_code,
        }

        if slug:
            records_by_slug[slug].append(record)

    return records_by_slug


def normalize_current_alerts(current_df: pd.DataFrame) -> dict[str, list[dict[str, Any]]]:
    current_by_slug: dict[str, list[dict[str, Any]]] = {}
    deduped = current_df.drop_duplicates(subset=["slug"])

    for _, row in deduped.iterrows():
        slug = str(row.get("slug", "")).strip().lower()
        if not slug:
            continue

        titles = parse_list_field(row.get("current_alert_titles"))
        categories = parse_list_field(row.get("current_alert_categories"))
        alerts: list[dict[str, Any]] = []

        for index, title in enumerate(titles):
            category = categories[index] if index < len(categories) else "General"
            alerts.append(
                {
                    "title": str(title).strip(),
                    "category": str(category).strip() or "General",
                    "impact": "Current alert attached from the latest park alert snapshot.",
                    "source": "park_current_fallback",
                }
            )

        current_by_slug[slug] = alerts

    return current_by_slug


def select_active_alerts(
    row_date: Any,
    slug: str,
    records_by_slug: dict[str, list[dict[str, Any]]],
    current_alerts_by_slug: dict[str, list[dict[str, Any]]],
    use_current_alerts_fallback: bool,
    max_alerts: int,
) -> tuple[list[dict[str, Any]], str]:
    observed_date = parse_observed_date(row_date)
    active = [
        record
        for record in records_by_slug.get(slug, [])
        if record["start_date"] <= observed_date <= record["end_date"]
    ]

    if active:
        return active[:max_alerts], "date_range_match"

    if use_current_alerts_fallback and slug in current_alerts_by_slug:
        return current_alerts_by_slug[slug][:max_alerts], "park_current_fallback"

    return [], "none"


def c_to_f(value: float | int | None) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round((float(value) * 9 / 5) + 32, 1)


def merge_hazard(hazards: dict[str, dict[str, str]], hazard_type: str, severity: str, reason: str) -> None:
    current = hazards.get(hazard_type)
    if current is None or SEVERITY_RANK[severity] > SEVERITY_RANK[current["severity"]]:
        hazards[hazard_type] = {"type": hazard_type, "severity": severity, "reason": reason}
        return

    if current["reason"] != reason and reason not in current["reason"]:
        current["reason"] = f"{current['reason']} {reason}".strip()


def derive_weather_hazards(
    hazards: dict[str, dict[str, str]],
    tmax_c: float | None,
    tmin_c: float | None,
    prcp_mm: float | None,
    snow_mm: float | None,
    season: str,
    profile: str,
) -> None:
    prcp_mm = 0.0 if prcp_mm is None or pd.isna(prcp_mm) else float(prcp_mm)
    snow_mm = 0.0 if snow_mm is None or pd.isna(snow_mm) else float(snow_mm)

    if tmax_c is not None and not pd.isna(tmax_c):
        tmax_c = float(tmax_c)
        if tmax_c >= 43:
            merge_hazard(
                hazards,
                "HEAT",
                "EXTREME",
                "Very high temperatures create dangerous heat exposure on open trails.",
            )
        elif tmax_c >= 37:
            merge_hazard(
                hazards,
                "HEAT",
                "HIGH",
                "High daytime temperatures raise the risk of heat illness during outdoor travel.",
            )
        elif tmax_c >= 32 and (season == "summer" or profile in HOT_PROFILES):
            merge_hazard(
                hazards,
                "HEAT",
                "MODERATE",
                "Warm seasonal conditions can make exposed routes noticeably hotter.",
            )

        if tmax_c >= 35 and profile in EXPOSED_PROFILES:
            merge_hazard(
                hazards,
                "DEHYDRATION",
                "EXTREME" if tmax_c >= 43 else "HIGH",
                "Hot and exposed terrain can increase water loss and dehydration risk.",
            )
        elif tmax_c >= 30 and profile in {"swamp_wetland", "coastal"}:
            merge_hazard(
                hazards,
                "DEHYDRATION",
                "MODERATE",
                "Warm and humid conditions can still increase hydration needs.",
            )

        if tmax_c >= 34 and prcp_mm <= 1 and season in {"summer", "fall"} and profile in {"desert", "canyon_exposure", "alpine"}:
            merge_hazard(
                hazards,
                "WILDFIRE",
                "MODERATE",
                "Hot and dry conditions can increase fire sensitivity or smoke concern.",
            )

    if tmin_c is not None and not pd.isna(tmin_c):
        tmin_c = float(tmin_c)
        if tmin_c <= -18:
            merge_hazard(
                hazards,
                "COLD",
                "EXTREME",
                "Very low overnight temperatures create severe cold exposure risk.",
            )
        elif tmin_c <= -8:
            merge_hazard(
                hazards,
                "COLD",
                "HIGH",
                "Cold overnight conditions can affect traction, layering needs, and recovery.",
            )
        elif tmin_c <= 0:
            merge_hazard(
                hazards,
                "COLD",
                "MODERATE",
                "Sub-freezing temperatures can still affect exposed early or late travel.",
            )

        if tmin_c <= -2 and prcp_mm > 0:
            merge_hazard(
                hazards,
                "SNOW_ICE",
                "MODERATE",
                "Moisture near or below freezing can create icy surfaces on trails and roads.",
            )

    if snow_mm >= 15:
        merge_hazard(
            hazards,
            "SNOW_ICE",
            "HIGH",
            "Snow accumulation can create traction issues and slower travel conditions.",
        )
    elif snow_mm > 0:
        merge_hazard(
            hazards,
            "SNOW_ICE",
            "MODERATE",
            "Light snowfall can still create slick patches and lower visibility.",
        )

    if prcp_mm >= 40:
        severity = "EXTREME" if profile in {"canyon_exposure", "swamp_wetland", "coastal"} else "HIGH"
        merge_hazard(
            hazards,
            "FLOODING",
            severity,
            "Heavy precipitation can create flooding, runoff, or washout problems.",
        )
    elif prcp_mm >= 20:
        merge_hazard(
            hazards,
            "FLOODING",
            "MODERATE",
            "Moderate to heavy rainfall can affect crossings and low-lying trail segments.",
        )

    if prcp_mm >= 10 and (season == "spring" or profile in WET_PROFILES):
        merge_hazard(
            hazards,
            "MUD",
            "MODERATE",
            "Wet conditions can leave trails muddy, slower, and more slippery than usual.",
        )


def derive_existing_rule_hazards(hazards: dict[str, dict[str, str]], raw_hazards: list[Any]) -> None:
    for value in raw_hazards:
        key = str(value).strip().upper()
        if key in WEATHER_HAZARD_MAP:
            hazard_type, severity, reason = WEATHER_HAZARD_MAP[key]
            merge_hazard(hazards, hazard_type, severity, reason)


def derive_alert_hazards(hazards: dict[str, dict[str, str]], active_alerts: list[dict[str, Any]]) -> None:
    for alert in active_alerts:
        searchable = " ".join(
            [
                str(alert.get("title", "")),
                str(alert.get("category", "")),
                str(alert.get("impact", "")),
            ]
        ).lower()

        for hazard_type, (keywords, severity, reason) in ALERT_KEYWORDS.items():
            if any(keyword in searchable for keyword in keywords):
                merge_hazard(hazards, hazard_type, severity, reason)


def build_alert_entries(active_alerts: list[dict[str, Any]]) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    seen_titles: set[str] = set()

    for alert in active_alerts:
        title = str(alert.get("title", "")).strip()
        if not title or title.lower() in seen_titles:
            continue
        seen_titles.add(title.lower())
        entries.append(
            {
                "title": title,
                "category": str(alert.get("category", "General")).strip() or "General",
                "impact": summarize_impact(alert.get("impact")),
            }
        )

    return entries


def _format_hazard_name(hazard_type: str) -> str:
    label_map = {
        "SNOW_ICE": "snow and ice",
        "AIR_QUALITY": "air quality",
        "HIGH_WIND": "high wind",
        "TRAIL_CLOSURE": "trail closures",
        "COASTAL_HAZARD": "coastal hazards",
    }
    return label_map.get(hazard_type, hazard_type.replace("_", " ").lower())


def _join_labels(labels: list[str]) -> str:
    if not labels:
        return ""
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]}, {labels[1]}"
    return f"{', '.join(labels[:-1])}, and {labels[-1]}"


def build_notification(hazards: list[dict[str, str]], alerts: list[dict[str, str]]) -> str:
    if not hazards and not alerts:
        return "No major trail hazards stand out from the available weather and alert inputs."

    top_hazards = _join_labels([_format_hazard_name(item["type"]) for item in hazards[:2]])
    top_hazards = top_hazards[:1].upper() + top_hazards[1:]
    if alerts:
        return f"{top_hazards} plus active park advisories may affect trail conditions today."
    return f"{top_hazards} are the main trail safety concerns in the current park conditions."


def build_recommended_action(hazards: list[dict[str, str]], alerts: list[dict[str, str]]) -> str:
    actions: list[str] = []

    for hazard in hazards[:2]:
        action = RECOMMENDED_ACTIONS.get(hazard["type"])
        if action and action not in actions:
            actions.append(action)

    if any(alert["category"].lower() == "park closure" for alert in alerts):
        closure_action = RECOMMENDED_ACTIONS["TRAIL_CLOSURE"]
        if closure_action not in actions:
            actions.append(closure_action)

    if not actions:
        actions.append("Review the latest NPS conditions page before starting your route.")

    return " ".join(actions[:2])


def compute_risk_level(hazards: list[dict[str, str]], alerts: list[dict[str, str]]) -> str:
    if not hazards:
        if alerts:
            return "MODERATE"
        return "LOW"

    max_rank = max(SEVERITY_RANK[item["severity"]] for item in hazards)
    high_or_worse = sum(1 for item in hazards if SEVERITY_RANK[item["severity"]] >= SEVERITY_RANK["HIGH"])
    moderate_or_worse = sum(
        1 for item in hazards if SEVERITY_RANK[item["severity"]] >= SEVERITY_RANK["MODERATE"]
    )

    if high_or_worse >= 2 and max_rank < SEVERITY_RANK["EXTREME"]:
        max_rank += 1
    elif moderate_or_worse >= 3 and max_rank < SEVERITY_RANK["HIGH"]:
        max_rank += 1

    if any(alert["category"].lower() == "park closure" for alert in alerts) and max_rank < SEVERITY_RANK["HIGH"]:
        max_rank = SEVERITY_RANK["HIGH"]

    return RANK_TO_SEVERITY[min(max_rank, SEVERITY_RANK["EXTREME"])]


def build_context(
    row: pd.Series,
    park_code: str,
    season: str,
    profile: str,
    alerts: list[dict[str, str]],
    alert_context_mode: str,
) -> dict[str, Any]:
    tmax_c = float(row["TMAX"]) if not pd.isna(row["TMAX"]) else None
    tmin_c = float(row["TMIN"]) if not pd.isna(row["TMIN"]) else None
    prcp_mm = float(row["PRCP"]) if not pd.isna(row["PRCP"]) else None
    snow_mm = float(row["SNOW"]) if not pd.isna(row["SNOW"]) else None
    derived_labels = [str(value).strip().upper() for value in parse_list_field(row["hazards"])]

    return {
        "parkName": str(row["park"]).strip(),
        "parkCode": park_code,
        "parkSlug": str(row["slug"]).strip(),
        "date": parse_observed_date(row["date"]).isoformat(),
        "season": season.upper(),
        "hazardProfile": profile,
        "weather": {
            "maxTempC": tmax_c,
            "maxTempF": c_to_f(tmax_c),
            "minTempC": tmin_c,
            "minTempF": c_to_f(tmin_c),
            "precipitationMm": prcp_mm,
            "snowMm": snow_mm,
        },
        "derivedHazardSignals": {
            "existingRuleLabels": derived_labels,
            "isHot": bool(tmax_c is not None and tmax_c >= 32),
            "isFreezing": bool(tmin_c is not None and tmin_c <= 0),
            "isVeryWet": bool(prcp_mm is not None and prcp_mm >= 20),
            "hasSnowSignal": bool(snow_mm is not None and snow_mm > 0),
        },
        "activeAlerts": alerts,
        "alertContextMode": alert_context_mode,
    }


def split_examples(records: list[dict[str, Any]], validation_ratio: float) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[record["metadata"]["parkCode"]].append(record)

    train_records: list[dict[str, Any]] = []
    validation_records: list[dict[str, Any]] = []

    for _, group_records in grouped.items():
        ordered = sorted(group_records, key=lambda item: item["metadata"]["date"])
        validation_count = max(1, math.ceil(len(ordered) * validation_ratio))
        if len(ordered) <= 2:
            validation_count = 1

        split_index = max(len(ordered) - validation_count, 1)
        train_records.extend(ordered[:split_index])
        validation_records.extend(ordered[split_index:])

    return train_records, validation_records


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record) + "\n")


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    data_config = config["data"]

    weather_file = resolve_backend_path(data_config["weather_file"])
    alerts_file = resolve_backend_path(data_config["alerts_file"])
    current_alerts_file = resolve_backend_path(data_config["current_alerts_file"])
    output_dir = resolve_backend_path(data_config["output_dir"])

    weather_df = pd.read_csv(weather_file)
    alerts_df = pd.read_csv(alerts_file)
    current_alerts_df = pd.read_csv(current_alerts_file)

    normalized_alerts = normalize_alert_records(alerts_df)
    current_alerts = normalize_current_alerts(current_alerts_df)

    records: list[dict[str, Any]] = []
    skipped_rows = 0

    for _, row in weather_df.iterrows():
        slug = str(row["slug"]).strip().lower()
        park_metadata = get_park_metadata(park_slug=slug)
        if park_metadata is None:
            skipped_rows += 1
            continue

        observed_date = parse_observed_date(row["date"])
        season = resolve_season(observed_date, park_metadata.hemisphere)
        alerts, alert_context_mode = select_active_alerts(
            row_date=row["date"],
            slug=slug,
            records_by_slug=normalized_alerts,
            current_alerts_by_slug=current_alerts,
            use_current_alerts_fallback=bool(data_config["use_current_alerts_fallback"]),
            max_alerts=int(data_config["max_alerts_per_example"]),
        )

        hazard_map: dict[str, dict[str, str]] = {}
        derive_existing_rule_hazards(hazard_map, parse_list_field(row["hazards"]))
        derive_weather_hazards(
            hazards=hazard_map,
            tmax_c=row["TMAX"],
            tmin_c=row["TMIN"],
            prcp_mm=row["PRCP"],
            snow_mm=row["SNOW"],
            season=season,
            profile=park_metadata.hazard_profile,
        )
        derive_alert_hazards(hazard_map, alerts)

        ordered_hazards = sorted(
            hazard_map.values(),
            key=lambda item: (-SEVERITY_RANK[item["severity"]], item["type"]),
        )
        alert_entries = build_alert_entries(alerts)
        target = {
            "riskLevel": compute_risk_level(ordered_hazards, alert_entries),
            "hazards": ordered_hazards[:6],
            "alerts": alert_entries,
            "notification": build_notification(ordered_hazards, alert_entries),
            "recommendedAction": build_recommended_action(ordered_hazards, alert_entries),
        }
        validated_target = TrailSafetyOutput.model_validate(target)
        context = build_context(
            row=row,
            park_code=park_metadata.park_code,
            season=season,
            profile=park_metadata.hazard_profile,
            alerts=alert_entries,
            alert_context_mode=alert_context_mode,
        )
        assistant_json = validated_target.model_dump_json(indent=2)
        row_id = f"{park_metadata.park_code}:{observed_date.isoformat()}"

        records.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_message(context)},
                    {"role": "assistant", "content": assistant_json},
                ],
                "input_context": context,
                "target_json": validated_target.model_dump(),
                "metadata": {
                    "rowId": row_id,
                    "parkName": str(row["park"]).strip(),
                    "parkCode": park_metadata.park_code,
                    "parkSlug": slug,
                    "season": season,
                    "profile": park_metadata.hazard_profile,
                    "date": observed_date.isoformat(),
                    "alertContextMode": alert_context_mode,
                },
            }
        )

    train_records, validation_records = split_examples(
        records=records,
        validation_ratio=float(data_config["validation_ratio"]),
    )

    write_jsonl(output_dir / "all.jsonl", records)
    write_jsonl(output_dir / "train.jsonl", train_records)
    write_jsonl(output_dir / "validation.jsonl", validation_records)

    manifest = {
        "recordCount": len(records),
        "trainCount": len(train_records),
        "validationCount": len(validation_records),
        "skippedRows": skipped_rows,
        "outputDir": str(output_dir),
        "sourceFiles": {
            "weather": str(weather_file),
            "alerts": str(alerts_file),
            "currentAlerts": str(current_alerts_file),
        },
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    if records:
        sample_path = output_dir / "sample_input.json"
        sample_path.write_text(
            json.dumps(records[0]["input_context"], indent=2),
            encoding="utf-8",
        )

    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
