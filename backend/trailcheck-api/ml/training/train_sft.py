from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.common import load_config, resolve_backend_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a TrailCheck structured-output QLoRA adapter.")
    parser.add_argument(
        "--config",
        default="ml/configs/trailcheck_qlora_4060.yaml",
        help="Relative or absolute path to the training config YAML.",
    )
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="CPU check that the config and dataset files are readable. Does not download or train a model.",
    )
    return parser.parse_args()


def render_messages(tokenizer: Any, messages: list[dict[str, str]]) -> str:
    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )

    rendered: list[str] = []
    for message in messages:
        rendered.append(f"{message['role'].upper()}:\n{message['content']}\n")
    return "\n".join(rendered)


def resolve_dtype(dtype_name: str, torch_module: Any) -> Any:
    normalized = dtype_name.strip().lower()
    if normalized in {"float16", "fp16", "half"}:
        return torch_module.float16
    if normalized in {"bfloat16", "bf16"}:
        return torch_module.bfloat16
    if normalized in {"float32", "fp32", "float"}:
        return torch_module.float32
    raise ValueError(f"Unsupported compute dtype: {dtype_name}")


def count_jsonl_rows(path: Path) -> int:
    count = 0
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            messages = record.get("messages")
            if not isinstance(messages, list) or not messages:
                raise ValueError(f"{path} contains a row without a messages array.")
            count += 1
    return count


def run_smoke(config_path: str) -> dict[str, Any]:
    config = load_config(config_path)
    data_config = config["data"]
    training_config = config["training"]
    model_config = config["model"]
    output_dir = resolve_backend_path(data_config["output_dir"])
    train_file = output_dir / "train.jsonl"
    validation_file = output_dir / "validation.jsonl"
    missing = [str(path) for path in (train_file, validation_file) if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Smoke training needs dataset files. Build them first with "
            "ml/data/build_dataset.py. Missing: " + ", ".join(missing)
        )

    report = {
        "mode": "smoke",
        "trained": False,
        "status": "not yet run",
        "baseModel": model_config["base_model"],
        "trainRows": count_jsonl_rows(train_file),
        "validationRows": count_jsonl_rows(validation_file),
        "configuredEpochs": training_config["num_train_epochs"],
        "outputDir": str(resolve_backend_path(training_config["output_dir"])),
        "note": (
            "CPU smoke test checked the config and JSONL rows only. "
            "It did not download Qwen2.5-3B or run QLoRA. "
            "Model quality metrics are not yet run."
        ),
    }
    print(json.dumps(report, indent=2))
    return report


def build_training_arguments(output_dir: Path, training_config: dict[str, Any], training_arguments_cls: Any) -> Any:
    import inspect

    kwargs: dict[str, Any] = {
        "output_dir": str(output_dir),
        "per_device_train_batch_size": int(training_config["per_device_train_batch_size"]),
        "per_device_eval_batch_size": int(training_config["per_device_eval_batch_size"]),
        "gradient_accumulation_steps": int(training_config["gradient_accumulation_steps"]),
        "learning_rate": float(training_config["learning_rate"]),
        "num_train_epochs": float(training_config["num_train_epochs"]),
        "weight_decay": float(training_config["weight_decay"]),
        "logging_steps": int(training_config["logging_steps"]),
        "save_steps": int(training_config["save_steps"]),
        "eval_steps": int(training_config["eval_steps"]),
        "max_grad_norm": float(training_config["max_grad_norm"]),
        "lr_scheduler_type": str(training_config["lr_scheduler_type"]),
        "fp16": bool(training_config["fp16"]),
        "bf16": bool(training_config["bf16"]),
        "save_strategy": "steps",
        "logging_strategy": "steps",
        "optim": str(training_config["optim"]),
        "seed": int(training_config["seed"]),
        "report_to": "none",
        "load_best_model_at_end": False,
    }

    signature = inspect.signature(training_arguments_cls.__init__)
    parameter_names = set(signature.parameters.keys())

    if "warmup_ratio" in parameter_names and "warmup_ratio" in training_config:
        kwargs["warmup_ratio"] = float(training_config["warmup_ratio"])

    if "evaluation_strategy" in parameter_names:
        kwargs["evaluation_strategy"] = "steps"
    elif "eval_strategy" in parameter_names:
        kwargs["eval_strategy"] = "steps"

    return training_arguments_cls(**kwargs)


def build_trainer(
    model: Any,
    tokenizer: Any,
    train_dataset: Any,
    validation_dataset: Any,
    peft_config: Any,
    training_args: Any,
    max_seq_length: int,
    sft_trainer_cls: Any,
) -> Any:
    import inspect

    trainer_signature = inspect.signature(sft_trainer_cls.__init__)
    parameter_names = set(trainer_signature.parameters.keys())

    trainer_kwargs: dict[str, Any] = {
        "model": model,
        "train_dataset": train_dataset,
        "eval_dataset": validation_dataset,
        "peft_config": peft_config,
        "args": training_args,
    }

    if "processing_class" in parameter_names:
        trainer_kwargs["processing_class"] = tokenizer
    elif "tokenizer" in parameter_names:
        trainer_kwargs["tokenizer"] = tokenizer

    if "dataset_text_field" in parameter_names:
        trainer_kwargs["dataset_text_field"] = "text"

    if "max_seq_length" in parameter_names:
        trainer_kwargs["max_seq_length"] = max_seq_length

    if "packing" in parameter_names:
        trainer_kwargs["packing"] = False

    return sft_trainer_cls(**trainer_kwargs)


def normalize_trainable_params(model: Any, torch_module: Any) -> None:
    for parameter in model.parameters():
        if parameter.requires_grad and parameter.dtype != torch_module.float32:
            parameter.data = parameter.data.to(torch_module.float32)


def run_training(config_path: str) -> None:
    import torch
    from datasets import load_dataset
    from peft import LoraConfig, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
    from trl import SFTTrainer

    config = load_config(config_path)
    data_config = config["data"]
    model_config = config["model"]
    lora_config = config["lora"]
    quant_config = config["quantization"]
    training_config = config["training"]

    train_file = resolve_backend_path(data_config["output_dir"]) / "train.jsonl"
    validation_file = resolve_backend_path(data_config["output_dir"]) / "validation.jsonl"
    output_dir = resolve_backend_path(training_config["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    local_files_only = bool(model_config.get("local_files_only", False))
    compute_dtype = resolve_dtype(str(quant_config["bnb_4bit_compute_dtype"]), torch)

    tokenizer = AutoTokenizer.from_pretrained(
        model_config["base_model"],
        local_files_only=local_files_only,
        use_fast=False,
        trust_remote_code=bool(model_config["trust_remote_code"]),
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=bool(quant_config["load_in_4bit"]),
        bnb_4bit_quant_type=str(quant_config["bnb_4bit_quant_type"]),
        bnb_4bit_use_double_quant=bool(quant_config["bnb_4bit_use_double_quant"]),
        bnb_4bit_compute_dtype=compute_dtype,
    )

    model = AutoModelForCausalLM.from_pretrained(
        model_config["base_model"],
        quantization_config=bnb_config,
        torch_dtype=compute_dtype,
        device_map="auto",
        local_files_only=local_files_only,
        trust_remote_code=bool(model_config["trust_remote_code"]),
    )
    model.config.torch_dtype = compute_dtype
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(
        model,
        use_gradient_checkpointing=bool(training_config["gradient_checkpointing"]),
    )

    dataset = load_dataset(
        "json",
        data_files={
            "train": str(train_file),
            "validation": str(validation_file),
        },
    )

    def format_batch(batch: dict[str, list[Any]]) -> dict[str, list[str]]:
        return {
            "text": [
                render_messages(tokenizer, messages)
                for messages in batch["messages"]
            ]
        }

    train_dataset = dataset["train"].map(
        format_batch,
        batched=True,
        remove_columns=dataset["train"].column_names,
    )
    validation_dataset = dataset["validation"].map(
        format_batch,
        batched=True,
        remove_columns=dataset["validation"].column_names,
    )

    peft_config = LoraConfig(
        r=int(lora_config["r"]),
        lora_alpha=int(lora_config["alpha"]),
        lora_dropout=float(lora_config["dropout"]),
        bias=str(lora_config["bias"]),
        task_type="CAUSAL_LM",
        target_modules=list(lora_config["target_modules"]),
    )

    training_args = build_training_arguments(output_dir, training_config, TrainingArguments)
    trainer = build_trainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        validation_dataset=validation_dataset,
        peft_config=peft_config,
        training_args=training_args,
        max_seq_length=int(training_config["max_seq_length"]),
        sft_trainer_cls=SFTTrainer,
    )
    normalize_trainable_params(trainer.model, torch)
    trainer.model.config.torch_dtype = compute_dtype

    print("fp16:", training_config["fp16"])
    print("bf16:", training_config["bf16"])
    print("compute dtype:", quant_config["bnb_4bit_compute_dtype"])
    print("local_files_only:", local_files_only)

    trainer.train()
    trainer.model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    metadata = {
        "baseModel": model_config["base_model"],
        "trainFile": str(train_file),
        "validationFile": str(validation_file),
        "outputDir": str(output_dir),
        "trainingConfig": training_config,
        "loraConfig": lora_config,
        "quantization": quant_config,
    }
    (output_dir / "adapter_metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()
    if args.smoke:
        run_smoke(args.config)
        return
    run_training(args.config)


if __name__ == "__main__":
    main()
