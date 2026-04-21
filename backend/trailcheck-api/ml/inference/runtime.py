from __future__ import annotations

import logging
from typing import Any

import torch

from ml.common import load_config, resolve_backend_path
from ml.data.prompts import SYSTEM_PROMPT, build_user_message
from ml.inference.load_adapter import load_model_with_adapter, load_tokenizer
from ml.inference.validator import ValidationResult, validate_output_text, validate_with_repair

logger = logging.getLogger(__name__)


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


def build_example_from_input_context(
    input_context: dict[str, Any],
    *,
    row_id: str = "single-input",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    next_metadata = dict(metadata or {})
    next_metadata.setdefault("rowId", row_id)
    next_metadata.setdefault("parkCode", input_context.get("parkCode"))
    next_metadata.setdefault("parkSlug", input_context.get("parkSlug"))

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_message(input_context)},
        ],
        "metadata": next_metadata,
        "inputContext": input_context,
    }


def build_result_record(
    *,
    example: dict[str, Any],
    index: int,
    validation: ValidationResult | None,
    errors: list[str] | None = None,
    raw_text: str = "",
    repaired: bool = False,
    repair_attempts_used: int = 0,
) -> dict[str, Any]:
    metadata = dict(example.get("metadata", {}))
    row_id = metadata.get("rowId") or f"row-{index:05d}"
    return {
        "rowId": row_id,
        "index": index,
        "ok": bool(validation.is_valid) if validation else False,
        "fallbackRecommended": not bool(validation.is_valid) if validation else True,
        "output": validation.data if validation else None,
        "errors": list(validation.errors) if validation else (errors or []),
        "rawText": validation.raw_text if validation else raw_text,
        "extractedJson": validation.extracted_json if validation else None,
        "repaired": repaired,
        "repairAttemptsUsed": repair_attempts_used,
        "metadata": metadata,
        "inputContext": example.get("inputContext"),
    }


class LocalInferenceEngine:
    def __init__(self, *, config_path: str, adapter_path: str | None = None):
        self.config_path = str(resolve_backend_path(config_path))
        self.config = load_config(self.config_path)
        self.model_config = self.config["model"]
        self.inference_config = self.config["inference"]
        self.quantization_config = self.config["quantization"]
        self.adapter_path = str(
            resolve_backend_path(adapter_path or self.config["training"]["output_dir"])
        )
        self.repair_attempts = int(self.inference_config["repair_attempts"])

        logger.info(
            "Loading local inference engine from %s with adapter %s.",
            self.config_path,
            self.adapter_path,
        )
        self.tokenizer = load_tokenizer(
            model_name=self.model_config["base_model"],
            trust_remote_code=bool(self.model_config["trust_remote_code"]),
            tokenizer_path=self.adapter_path,
        )
        self.model = load_model_with_adapter(
            base_model_name=self.model_config["base_model"],
            adapter_path=self.adapter_path,
            quantization_config=self.quantization_config,
            trust_remote_code=bool(self.model_config["trust_remote_code"]),
        )
        logger.info("Local inference engine loaded successfully.")

    def generate_from_input_context(
        self,
        input_context: dict[str, Any],
        *,
        row_id: str = "single-input",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        example = build_example_from_input_context(
            input_context,
            row_id=row_id,
            metadata=metadata,
        )
        return self.generate_from_example(example, index=0)

    def generate_from_example(
        self,
        example: dict[str, Any],
        *,
        index: int,
    ) -> dict[str, Any]:
        raw_text = generate_once(
            model=self.model,
            tokenizer=self.tokenizer,
            messages=example["messages"],
            inference_config=self.inference_config,
        )
        initial_validation = validate_output_text(raw_text)
        if initial_validation.parse_mode == "extracted" and initial_validation.is_valid:
            logger.info("Recovered schema-valid JSON from wrapped model output.")
        elif (
            initial_validation.parse_mode == "failed"
            and any(error.startswith("JSON parse failed:") for error in initial_validation.errors)
        ):
            logger.warning("Raw model output did not parse as JSON. Trying recovery/repair flow.")

        validation, repaired, attempts = validate_with_repair(
            raw_text=raw_text,
            repair_attempts=self.repair_attempts,
            repair_fn=lambda failed_validation: self._attempt_repair(
                original_messages=example["messages"],
                failed_validation=failed_validation,
            ),
        )

        if attempts > 0:
            logger.info("Used %s local repair attempt(s).", attempts)
        if validation.parse_mode == "extracted" and validation.is_valid and repaired:
            logger.info("Repair flow recovered a valid extracted JSON object.")
        elif validation.is_valid and repaired:
            logger.info("Repair flow produced schema-valid JSON.")

        return build_result_record(
            example=example,
            index=index,
            validation=validation,
            repaired=repaired,
            repair_attempts_used=attempts,
        )

    def _attempt_repair(
        self,
        *,
        original_messages: list[dict[str, str]],
        failed_validation: ValidationResult,
    ) -> ValidationResult:
        validation_errors = "\n".join(
            f"- {error}" for error in failed_validation.errors
        ) or "- Unknown validation failure"
        repair_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "The previous answer did not validate against the required JSON schema.\n"
                    "Rewrite it as one valid JSON object using only the provided context.\n"
                    "Return raw JSON only. Do not include markdown, comments, code fences, or any prose.\n"
                    "Use double-quoted JSON strings and ensure commas and brackets are valid.\n"
                    "The JSON must contain exactly these top-level keys: "
                    "riskLevel, hazards, alerts, notification, recommendedAction.\n\n"
                    f"Validation errors:\n{validation_errors}\n\n"
                    f"Original user context:\n{original_messages[-1]['content']}\n\n"
                    f"Invalid assistant output:\n{failed_validation.raw_text}"
                ),
            },
        ]
        repaired_text = generate_once(
            model=self.model,
            tokenizer=self.tokenizer,
            messages=repair_messages,
            inference_config=self.inference_config,
        )
        return validate_output_text(repaired_text)
