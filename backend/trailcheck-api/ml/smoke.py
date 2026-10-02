"""CPU smoke test for the TrailCheck dataset and evaluation harness.

This does not download or fine-tune Qwen. It builds the committed fixture set,
scores a rules replay of those labels, and checks that model_eval.json still
says the QLoRA metrics have not been run.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.evaluation.evaluate_outputs import evaluate_system, load_gold, load_predictions

SMOKE_CONFIG = "ml/configs/trailcheck_smoke.yaml"
OUTPUT_DIR = BACKEND_ROOT / "ml" / "data" / "outputs" / "smoke"
HARNESS_PATH = BACKEND_ROOT / "ml" / "results" / "harness_smoke.json"
MODEL_EVAL_PATH = BACKEND_ROOT / "ml" / "results" / "model_eval.json"


def write_rules_replay(validation_path: Path, prediction_path: Path) -> int:
    count = 0
    with validation_path.open("r", encoding="utf-8") as source, prediction_path.open(
        "w", encoding="utf-8"
    ) as target:
        for line in source:
            if not line.strip():
                continue
            record = json.loads(line)
            target.write(
                json.dumps(
                    {
                        "rowId": record["metadata"]["rowId"],
                        "ok": True,
                        "output": record["target_json"],
                    }
                )
                + "\n"
            )
            count += 1
    return count


def run_smoke() -> dict:
    subprocess.run(
        [sys.executable, "ml/data/build_dataset.py", "--config", SMOKE_CONFIG],
        cwd=BACKEND_ROOT,
        check=True,
    )
    validation_path = OUTPUT_DIR / "validation.jsonl"
    replay_path = OUTPUT_DIR / "rules_replay.jsonl"
    replay_rows = write_rules_replay(validation_path, replay_path)
    if replay_rows == 0:
        raise RuntimeError("Smoke dataset produced no validation rows.")

    gold = load_gold(validation_path)
    predictions = load_predictions(replay_path)
    metrics = evaluate_system(gold, predictions)
    manifest = json.loads((OUTPUT_DIR / "manifest.json").read_text(encoding="utf-8"))
    harness = {
        "status": "measured",
        "what": "rules_replay",
        "note": (
            "Scores compare the dataset builder's own held-out labels with a replay of those labels. "
            "This checks JSON validity and the metric script. It is not a QLoRA model score."
        ),
        "dataset": {
            "recordCount": manifest["recordCount"],
            "trainCount": manifest["trainCount"],
            "validationCount": manifest["validationCount"],
            "source": "ml/data/fixtures",
            "labelSource": "deterministic rules in ml/data/build_dataset.py",
        },
        "metrics": metrics,
    }
    HARNESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    HARNESS_PATH.write_text(json.dumps(harness, indent=2) + "\n", encoding="utf-8")

    subprocess.run(
        [sys.executable, "ml/training/train_sft.py", "--config", SMOKE_CONFIG, "--smoke"],
        cwd=BACKEND_ROOT,
        check=True,
    )

    model_eval = json.loads(MODEL_EVAL_PATH.read_text(encoding="utf-8"))
    if model_eval.get("status") != "not yet run" or model_eval.get("metrics") is not None:
        raise RuntimeError("model_eval.json must stay 'not yet run' until a real training run is scored.")

    if metrics["schemaValidity"] != 1.0 or metrics["riskLevelAccuracy"] != 1.0:
        raise RuntimeError(f"Rules replay should score perfectly against its own labels: {metrics}")

    print(json.dumps({"harness": str(HARNESS_PATH), "modelEval": model_eval["status"]}, indent=2))
    return harness


def main() -> None:
    run_smoke()


if __name__ == "__main__":
    main()
