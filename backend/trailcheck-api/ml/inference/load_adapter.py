from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


def resolve_compute_dtype(dtype_name: str) -> torch.dtype:
    if dtype_name == "bfloat16":
        return torch.bfloat16
    return torch.float16


def build_quantization_config(quantization_config: dict[str, Any]) -> BitsAndBytesConfig:
    return BitsAndBytesConfig(
        load_in_4bit=bool(quantization_config["load_in_4bit"]),
        bnb_4bit_quant_type=str(quantization_config["bnb_4bit_quant_type"]),
        bnb_4bit_use_double_quant=bool(quantization_config["bnb_4bit_use_double_quant"]),
        bnb_4bit_compute_dtype=resolve_compute_dtype(
            str(quantization_config["bnb_4bit_compute_dtype"])
        ),
    )


def load_tokenizer(model_name: str, trust_remote_code: bool = False):
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=trust_remote_code,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    return tokenizer


def load_model_with_adapter(
    *,
    base_model_name: str,
    adapter_path: str | Path,
    quantization_config: dict[str, Any],
    trust_remote_code: bool = False,
):
    quant_config = build_quantization_config(quantization_config)
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        quantization_config=quant_config,
        device_map="auto",
        trust_remote_code=trust_remote_code,
    )
    base_model.config.use_cache = False
    return PeftModel.from_pretrained(base_model, str(adapter_path))
