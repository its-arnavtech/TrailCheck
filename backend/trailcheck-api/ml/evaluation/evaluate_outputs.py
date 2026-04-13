from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.common import resolve_backend_path
from ml.inference.validator import validate_output_text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate local and Gemini structured predictions.")
    parser.add_argument("--gold", required=True, help="Gold JSONL path from build_dataset.py.")
    parser.add_argument(
        "--predictions",
        action="append",
        required=True,
        help="Prediction mapping in name=path form. Can be repeated.",
    )
    return parser.parse_args()


def normalize_title(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def load_gold(path: Path) -> dict[str, dict[str, Any]]:
    gold_by_row: dict[str, dict[str, Any]] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            row_id = record["metadata"]["rowId"]
            gold_by_row[row_id] = record
    return gold_by_row


def parse_prediction_record(record: dict[str, Any]) -> tuple[bool, dict[str, Any] | None]:
    if isinstance(record.get("output"), dict):
        return bool(record.get("ok", True)), record["output"]

    if isinstance(record.get("rawText"), str):
        validation = validate_output_text(record["rawText"])
        return validation.is_valid, validation.data

    direct_keys = {"riskLevel", "hazards", "alerts", "notification", "recommendedAction"}
    if direct_keys.issubset(set(record.keys())):
        return True, {key: record[key] for key in direct_keys}

    return False, None


def load_predictions(path: Path) -> dict[str, dict[str, Any]]:
    predictions: dict[str, dict[str, Any]] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            row_id = record.get("rowId") or record.get("metadata", {}).get("rowId")
            if not row_id:
                continue
            ok, parsed = parse_prediction_record(record)
            predictions[row_id] = {
                "ok": ok,
                "parsed": parsed,
                "raw": record,
            }
    return predictions


def hazard_type_metrics(gold_items: list[dict[str, Any]], pred_items: list[dict[str, Any]]) -> tuple[float, float, float]:
    gold_types = {item["type"] for item in gold_items}
    pred_types = {item["type"] for item in pred_items}
    overlap = len(gold_types & pred_types)

    precision = overlap / len(pred_types) if pred_types else (1.0 if not gold_types else 0.0)
    recall = overlap / len(gold_types) if gold_types else (1.0 if not pred_types else 0.0)
    if precision + recall == 0:
        return precision, recall, 0.0
    return precision, recall, 2 * precision * recall / (precision + recall)


def alert_recall(gold_items: list[dict[str, Any]], pred_items: list[dict[str, Any]]) -> float:
    gold_titles = {normalize_title(item["title"]) for item in gold_items}
    pred_titles = {normalize_title(item["title"]) for item in pred_items}
    if not gold_titles:
        return 1.0 if not pred_titles else 0.0
    return len(gold_titles & pred_titles) / len(gold_titles)


def notification_is_clear(text: str) -> bool:
    words = [token for token in re.split(r"\s+", text.strip()) if token]
    return 6 <= len(words) <= 40 and "{" not in text and "[" not in text


def evaluate_system(
    gold_by_row: dict[str, dict[str, Any]],
    predictions_by_row: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    total_rows = len(gold_by_row)
    schema_valid = 0
    risk_correct = 0
    hazard_precision_total = 0.0
    hazard_recall_total = 0.0
    hazard_f1_total = 0.0
    alert_recall_total = 0.0
    notification_clear_total = 0
    consistency_total = 0
    missing_rows: list[str] = []

    for row_id, gold_record in gold_by_row.items():
        prediction = predictions_by_row.get(row_id)
        if prediction is None or prediction["parsed"] is None:
            missing_rows.append(row_id)
            continue

        parsed = prediction["parsed"]
        gold_output = gold_record["target_json"]
        schema_valid += 1 if prediction["ok"] else 0
        risk_correct += 1 if parsed["riskLevel"] == gold_output["riskLevel"] else 0

        precision, recall, f1 = hazard_type_metrics(
            gold_output["hazards"],
            parsed["hazards"],
        )
        hazard_precision_total += precision
        hazard_recall_total += recall
        hazard_f1_total += f1

        alert_recall_total += alert_recall(gold_output["alerts"], parsed["alerts"])
        notification_clear_total += 1 if notification_is_clear(parsed["notification"]) else 0

        if (
            parsed["riskLevel"] == gold_output["riskLevel"]
            and f1 >= 0.5
            and len(parsed["recommendedAction"].strip()) > 0
        ):
            consistency_total += 1

    evaluated_rows = total_rows - len(missing_rows)
    denominator = evaluated_rows if evaluated_rows else 1

    return {
        "rowsTotal": total_rows,
        "rowsEvaluated": evaluated_rows,
        "rowsMissing": len(missing_rows),
        "missingRowIds": missing_rows[:20],
        "schemaValidity": round(schema_valid / denominator, 4),
        "riskLevelAccuracy": round(risk_correct / denominator, 4),
        "hazardPrecision": round(hazard_precision_total / denominator, 4),
        "hazardRecall": round(hazard_recall_total / denominator, 4),
        "hazardF1": round(hazard_f1_total / denominator, 4),
        "alertRecall": round(alert_recall_total / denominator, 4),
        "notificationClarity": round(notification_clear_total / denominator, 4),
        "conditionConsistency": round(consistency_total / denominator, 4),
    }


def main() -> None:
    args = parse_args()
    gold_path = resolve_backend_path(args.gold)
    gold_by_row = load_gold(gold_path)

    report: dict[str, Any] = {
        "goldFile": str(gold_path),
        "systems": {},
    }

    for spec in args.predictions:
        if "=" not in spec:
            raise ValueError(f"Invalid prediction mapping: {spec}")
        name, relative_path = spec.split("=", 1)
        predictions_path = resolve_backend_path(relative_path)
        predictions = load_predictions(predictions_path)
        report["systems"][name] = {
            "predictionFile": str(predictions_path),
            "metrics": evaluate_system(gold_by_row, predictions),
        }

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
