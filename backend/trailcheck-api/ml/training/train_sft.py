from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import torch
from datasets import load_dataset
from peft import LoraConfig, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from trl import SFTTrainer

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
    return parser.parse_args()


def resolve_dtype(dtype_name: str) -> torch.dtype:
    if dtype_name == "bfloat16":
        return torch.bfloat16
    return torch.float16


def render_messages(tokenizer, messages: list[dict[str, str]]) -> str:
    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)

    rendered = []
    for message in messages:
        rendered.append(f"{message['role'].upper()}:\n{message['content']}\n")
    return "\n".join(rendered)


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    data_config = config["data"]
    model_config = config["model"]
    lora_config = config["lora"]
    quant_config = config["quantization"]
    training_config = config["training"]

    train_file = resolve_backend_path(data_config["output_dir"]) / "train.jsonl"
    validation_file = resolve_backend_path(data_config["output_dir"]) / "validation.jsonl"
    output_dir = resolve_backend_path(training_config["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(
        model_config["base_model"],
        trust_remote_code=bool(model_config["trust_remote_code"]),
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=bool(quant_config["load_in_4bit"]),
        bnb_4bit_quant_type=str(quant_config["bnb_4bit_quant_type"]),
        bnb_4bit_use_double_quant=bool(quant_config["bnb_4bit_use_double_quant"]),
        bnb_4bit_compute_dtype=resolve_dtype(str(quant_config["bnb_4bit_compute_dtype"])),
    )

    model = AutoModelForCausalLM.from_pretrained(
        model_config["base_model"],
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=bool(model_config["trust_remote_code"]),
    )
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
        return {"text": [render_messages(tokenizer, messages) for messages in batch["messages"]]}

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

    trainer = SFTTrainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=validation_dataset,
        tokenizer=tokenizer,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=int(training_config["max_seq_length"]),
        packing=False,
        args=TrainingArguments(
            output_dir=str(output_dir),
            per_device_train_batch_size=int(training_config["per_device_train_batch_size"]),
            per_device_eval_batch_size=int(training_config["per_device_eval_batch_size"]),
            gradient_accumulation_steps=int(training_config["gradient_accumulation_steps"]),
            learning_rate=float(training_config["learning_rate"]),
            num_train_epochs=float(training_config["num_train_epochs"]),
            warmup_ratio=float(training_config["warmup_ratio"]),
            weight_decay=float(training_config["weight_decay"]),
            logging_steps=int(training_config["logging_steps"]),
            save_steps=int(training_config["save_steps"]),
            eval_steps=int(training_config["eval_steps"]),
            max_grad_norm=float(training_config["max_grad_norm"]),
            lr_scheduler_type=str(training_config["lr_scheduler_type"]),
            fp16=bool(training_config["fp16"]),
            bf16=bool(training_config["bf16"]),
            evaluation_strategy="steps",
            save_strategy="steps",
            logging_strategy="steps",
            optim=str(training_config["optim"]),
            seed=int(training_config["seed"]),
            report_to="none",
            load_best_model_at_end=False,
        ),
    )

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


if __name__ == "__main__":
    main()
