from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.common import load_config, resolve_backend_path
from ml.inference.runtime import LocalInferenceEngine, build_example_from_input_context

logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run structured local inference with a QLoRA adapter.")
    parser.add_argument(
        "--config",
        default="ml/configs/trailcheck_qlora_4060.yaml",
        help="Relative or absolute path to the training config YAML.",
    )
    parser.add_argument(
        "--adapter-path",
        help="Adapter directory. Defaults to the training output_dir from the config.",
    )
    parser.add_argument(
        "--input-json",
        help="Path to a single input context JSON file.",
    )
    parser.add_argument(
        "--dataset-file",
        help="Path to a JSONL dataset file produced by build_dataset.py.",
    )
    parser.add_argument(
        "--output-file",
        help="Deprecated alias for --output-jsonl.",
    )
    parser.add_argument(
        "--output-json",
        help="Optional JSON output path for a single input prediction.",
    )
    parser.add_argument(
        "--output-jsonl",
        help="Optional JSONL output path for batch predictions.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite an existing output file instead of failing.",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=1,
        help="Print batch progress every N processed rows. Use 0 to disable progress logs.",
    )
    return parser.parse_args()


def _default_batch_output_path(config: dict[str, Any]) -> Path:
    return resolve_backend_path(config["data"]["output_dir"]) / "local_predictions.jsonl"


def resolve_output_path(args: argparse.Namespace, *, is_batch: bool, config: dict[str, Any]) -> Path | None:
    raw_output = args.output_jsonl or args.output_file
    if is_batch:
        path = resolve_backend_path(raw_output) if raw_output else _default_batch_output_path(config)
    else:
        if raw_output:
            raise ValueError("Batch output options (--output-jsonl/--output-file) cannot be used with --input-json.")
        path = resolve_backend_path(args.output_json) if args.output_json else None

    if path and path.exists() and not args.overwrite:
        raise FileExistsError(
            f"Output file already exists: {path}. Re-run with --overwrite to replace it."
        )
    return path


def load_examples(args: argparse.Namespace) -> tuple[list[dict[str, Any]], bool]:
    if args.input_json:
        input_path = resolve_backend_path(args.input_json)
        context = json.loads(input_path.read_text(encoding="utf-8"))
        return ([build_example_from_input_context(context)], False)

    dataset_path = resolve_backend_path(
        args.dataset_file or "ml/data/outputs/validation.jsonl"
    )
    examples = []
    with dataset_path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            if not line.strip():
                continue
            record = json.loads(line)
            metadata = dict(record.get("metadata", {}))
            metadata.setdefault("rowId", f"row-{index:05d}")
            examples.append(
                {
                    "messages": record["messages"][:2],
                    "metadata": metadata,
                    "inputContext": record.get("input_context"),
                }
            )
    return examples, True


def write_single_result(path: Path, result: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")


def append_result(path: Path, result: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(result, ensure_ascii=False) + "\n")


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    engine = LocalInferenceEngine(
        config_path=args.config,
        adapter_path=args.adapter_path,
    )
    examples, is_batch = load_examples(args)
    output_path = resolve_output_path(args, is_batch=is_batch, config=config)
    total_examples = len(examples)

    if is_batch and output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("", encoding="utf-8")

    results: list[dict[str, Any]] = []

    for index, example in enumerate(examples):
        try:
            result = engine.generate_from_example(example, index=index)
            results.append(result)
        except Exception as exc:
            result = {
                "rowId": example.get("metadata", {}).get("rowId", f"row-{index:05d}"),
                "index": index,
                "ok": False,
                "fallbackRecommended": True,
                "output": None,
                "errors": [f"{type(exc).__name__}: {exc}"],
                "rawText": "",
                "extractedJson": None,
                "repaired": False,
                "repairAttemptsUsed": 0,
                "metadata": dict(example.get("metadata", {})),
                "inputContext": example.get("inputContext"),
            }
            results.append(result)

        if is_batch and output_path is not None:
            append_result(output_path, result)
            if args.progress_every > 0 and (
                (index + 1) % args.progress_every == 0 or index + 1 == total_examples
            ):
                status = "ok" if result["ok"] else "failed"
                print(
                    f"[{index + 1}/{total_examples}] {result['rowId']} {status}",
                    flush=True,
                )

    if is_batch:
        if output_path is None:
            raise ValueError("Batch inference requires an output path.")
        summary = {
            "rowsProcessed": len(results),
            "rowsSucceeded": sum(1 for result in results if result["ok"]),
            "rowsFailed": sum(1 for result in results if not result["ok"]),
            "outputFile": str(output_path),
        }
        print(json.dumps(summary, indent=2))
    else:
        result = results[0]
        if output_path:
            write_single_result(output_path, result)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
