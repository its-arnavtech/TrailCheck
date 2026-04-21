from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable

from pydantic import ValidationError

from ml.inference.schema import TrailSafetyOutput


@dataclass
class ValidationResult:
    is_valid: bool
    data: dict[str, Any] | None
    errors: list[str]
    raw_text: str
    extracted_json: str | None
    parse_mode: str
    recovery_notes: list[str]


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
    raw_candidate = raw_text.strip()
    raw_parse_error: str | None = None
    extracted_candidate: str | None = None
    recovery_notes: list[str] = []

    try:
        candidate = json.loads(raw_candidate)
        extracted = None
        parse_mode = "direct"
    except json.JSONDecodeError as exc:
        raw_parse_error = str(exc)
        recovery_notes.append("raw_json_parse_failed")
        extracted_candidate = extract_first_json_object(raw_text)

        if extracted_candidate and extracted_candidate != raw_candidate:
            try:
                candidate = json.loads(extracted_candidate)
                extracted = extracted_candidate
                parse_mode = "extracted"
                recovery_notes.append("recovered_from_extracted_json_object")
            except json.JSONDecodeError as extracted_exc:
                return ValidationResult(
                    is_valid=False,
                    data=None,
                    errors=[
                        f"JSON parse failed: {raw_parse_error}",
                        f"Extracted JSON parse failed: {extracted_exc}",
                    ],
                    raw_text=raw_text,
                    extracted_json=extracted_candidate,
                    parse_mode="failed",
                    recovery_notes=recovery_notes,
                )
        else:
            return ValidationResult(
                is_valid=False,
                data=None,
                errors=[f"JSON parse failed: {raw_parse_error}"],
                raw_text=raw_text,
                extracted_json=extracted_candidate if extracted_candidate else None,
                parse_mode="failed",
                recovery_notes=recovery_notes,
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
            parse_mode=parse_mode,
            recovery_notes=recovery_notes,
        )

    return ValidationResult(
        is_valid=True,
        data=validated.model_dump(),
        errors=[],
        raw_text=raw_text,
        extracted_json=extracted,
        parse_mode=parse_mode,
        recovery_notes=recovery_notes,
    )


def validate_with_repair(
    *,
    raw_text: str,
    repair_attempts: int,
    repair_fn: Callable[[ValidationResult], ValidationResult],
) -> tuple[ValidationResult, bool, int]:
    validation = validate_output_text(raw_text)
    attempts = 0
    repaired = False

    while not validation.is_valid and attempts < repair_attempts:
        attempts += 1
        validation = repair_fn(validation)
        repaired = validation.is_valid

    return validation, repaired, attempts
