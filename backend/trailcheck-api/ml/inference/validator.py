from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from ml.inference.schema import TrailSafetyOutput


@dataclass
class ValidationResult:
    is_valid: bool
    data: dict[str, Any] | None
    errors: list[str]
    raw_text: str
    extracted_json: str | None


def extract_first_json_object(text: str) -> str | None:
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False

    for index in range(start, len(text)):
        char = text[index]

        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]

    return None


def _normalize_candidate(candidate: Any) -> Any:
    if isinstance(candidate, dict):
        normalized: dict[str, Any] = {}
        for key, value in candidate.items():
            normalized[key] = _normalize_candidate(value)

        if "riskLevel" in normalized and isinstance(normalized["riskLevel"], str):
            normalized["riskLevel"] = normalized["riskLevel"].strip().upper()

        hazards = normalized.get("hazards")
        if isinstance(hazards, list):
            for item in hazards:
                if isinstance(item, dict) and isinstance(item.get("severity"), str):
                    item["severity"] = item["severity"].strip().upper()

        return normalized

    if isinstance(candidate, list):
        return [_normalize_candidate(item) for item in candidate]

    if isinstance(candidate, str):
        return candidate.strip()

    return candidate


def validate_output_text(raw_text: str) -> ValidationResult:
    extracted = extract_first_json_object(raw_text) or raw_text.strip()

    try:
        candidate = json.loads(extracted)
    except json.JSONDecodeError as exc:
        return ValidationResult(
            is_valid=False,
            data=None,
            errors=[f"JSON parse failed: {exc}"],
            raw_text=raw_text,
            extracted_json=extracted if extracted else None,
        )

    candidate = _normalize_candidate(candidate)

    try:
        validated = TrailSafetyOutput.model_validate(candidate)
    except ValidationError as exc:
        return ValidationResult(
            is_valid=False,
            data=None,
            errors=[error["msg"] for error in exc.errors()],
            raw_text=raw_text,
            extracted_json=extracted,
        )

    return ValidationResult(
        is_valid=True,
        data=validated.model_dump(),
        errors=[],
        raw_text=raw_text,
        extracted_json=extracted,
    )
