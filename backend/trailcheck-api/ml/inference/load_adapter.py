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


def _has_local_tokenizer_files(path: str | Path) -> bool:
    candidate = Path(path)
    return (candidate / "tokenizer_config.json").exists() or (candidate / "tokenizer.json").exists()


def _load_tokenizer(source: str | Path, *, trust_remote_code: bool, local_files_only: bool):
    return AutoTokenizer.from_pretrained(
        str(source),
        trust_remote_code=trust_remote_code,
        local_files_only=local_files_only,
    )


def load_tokenizer(
    model_name: str,
    trust_remote_code: bool = False,
    tokenizer_path: str | Path | None = None,
):
    tokenizer = None

    if tokenizer_path and _has_local_tokenizer_files(tokenizer_path):
        tokenizer = _load_tokenizer(
            tokenizer_path,
            trust_remote_code=trust_remote_code,
            local_files_only=True,
        )
    else:
        try:
            tokenizer = _load_tokenizer(
                model_name,
                trust_remote_code=trust_remote_code,
                local_files_only=True,
            )
        except Exception:
            tokenizer = _load_tokenizer(
                model_name,
                trust_remote_code=trust_remote_code,
                local_files_only=False,
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

    try:
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            quantization_config=quant_config,
            device_map="auto",
            trust_remote_code=trust_remote_code,
            local_files_only=True,
        )
    except Exception:
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            quantization_config=quant_config,
            device_map="auto",
            trust_remote_code=trust_remote_code,
            local_files_only=False,
        )

    base_model.config.use_cache = False
    return PeftModel.from_pretrained(base_model, str(adapter_path))
