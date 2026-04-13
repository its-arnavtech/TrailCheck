from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import torch

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.common import load_config, resolve_backend_path
from ml.data.prompts import SYSTEM_PROMPT, build_user_message
from ml.inference.load_adapter import load_model_with_adapter, load_tokenizer
from ml.inference.validator import ValidationResult, validate_output_text


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
        help="Optional JSONL output path for batch predictions.",
    )
    return parser.parse_args()


def render_generation_prompt(tokenizer, messages: list[dict[str, str]]) -> str:
    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    rendered = []
    for message in messages:
        rendered.append(f"{message['role'].upper()}:\n{message['content']}\n")
    rendered.append("ASSISTANT:\n")
    return "\n".join(rendered)


def generate_once(
    *,
    model,
    tokenizer,
    messages: list[dict[str, str]],
    inference_config: dict[str, Any],
) -> str:
    prompt = render_generation_prompt(tokenizer, messages)
    model_inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    do_sample = bool(inference_config["do_sample"]) and float(inference_config["temperature"]) > 0
    generation_kwargs = {
        "max_new_tokens": int(inference_config["max_new_tokens"]),
        "do_sample": do_sample,
        "temperature": float(inference_config["temperature"]) if do_sample else None,
        "top_p": float(inference_config["top_p"]) if do_sample else None,
        "repetition_penalty": float(inference_config["repetition_penalty"]),
        "pad_token_id": tokenizer.pad_token_id,
        "eos_token_id": tokenizer.eos_token_id,
    }
    generation_kwargs = {key: value for key, value in generation_kwargs.items() if value is not None}

    with torch.inference_mode():
        output_tokens = model.generate(**model_inputs, **generation_kwargs)

    generated_tokens = output_tokens[0][model_inputs["input_ids"].shape[1] :]
    return tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()


def attempt_repair(
    *,
    model,
    tokenizer,
    inference_config: dict[str, Any],
    original_messages: list[dict[str, str]],
    invalid_output: str,
) -> ValidationResult:
    repair_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "The previous answer did not validate against the required JSON schema.\n"
                "Rewrite it as a valid JSON object using only the provided context.\n\n"
                f"Original user context:\n{original_messages[-1]['content']}\n\n"
                f"Invalid assistant output:\n{invalid_output}"
            ),
        },
    ]
    repaired_text = generate_once(
        model=model,
        tokenizer=tokenizer,
        messages=repair_messages,
        inference_config=inference_config,
    )
    return validate_output_text(repaired_text)


def load_examples(args: argparse.Namespace) -> list[dict[str, Any]]:
    if args.input_json:
        input_path = resolve_backend_path(args.input_json)
        context = json.loads(input_path.read_text(encoding="utf-8"))
        return [
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_message(context)},
                ],
                "metadata": {
                    "rowId": "single-input",
                    "parkCode": context.get("parkCode"),
                    "parkSlug": context.get("parkSlug"),
                },
            }
        ]

    if args.dataset_file:
        dataset_path = resolve_backend_path(args.dataset_file)
        examples = []
        with dataset_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                record = json.loads(line)
                examples.append(
                    {
                        "messages": record["messages"][:2],
                        "metadata": record.get("metadata", {}),
                    }
                )
        return examples

    raise ValueError("Either --input-json or --dataset-file must be provided.")


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    model_config = config["model"]
    inference_config = config["inference"]
    quantization_config = config["quantization"]
    adapter_path = resolve_backend_path(
        args.adapter_path or config["training"]["output_dir"]
    )

    tokenizer = load_tokenizer(
        model_name=model_config["base_model"],
        trust_remote_code=bool(model_config["trust_remote_code"]),
    )
    model = load_model_with_adapter(
        base_model_name=model_config["base_model"],
        adapter_path=adapter_path,
        quantization_config=quantization_config,
        trust_remote_code=bool(model_config["trust_remote_code"]),
    )
    examples = load_examples(args)

    results: list[dict[str, Any]] = []
    repair_attempts = int(inference_config["repair_attempts"])

    for example in examples:
        raw_text = generate_once(
            model=model,
            tokenizer=tokenizer,
            messages=example["messages"],
            inference_config=inference_config,
        )
        validation = validate_output_text(raw_text)

        attempts = 0
        while not validation.is_valid and attempts < repair_attempts:
            attempts += 1
            validation = attempt_repair(
                model=model,
                tokenizer=tokenizer,
                inference_config=inference_config,
                original_messages=example["messages"],
                invalid_output=raw_text,
            )

        results.append(
            {
                "rowId": example["metadata"].get("rowId"),
                "ok": validation.is_valid,
                "fallbackRecommended": not validation.is_valid,
                "output": validation.data,
                "errors": validation.errors,
                "rawText": validation.raw_text,
                "extractedJson": validation.extracted_json,
                "metadata": example["metadata"],
            }
        )

    if args.output_file:
        output_path = resolve_backend_path(args.output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8") as handle:
            for result in results:
                handle.write(json.dumps(result, ensure_ascii=False) + "\n")
    else:
        print(json.dumps(results[0], indent=2))


if __name__ == "__main__":
    main()
