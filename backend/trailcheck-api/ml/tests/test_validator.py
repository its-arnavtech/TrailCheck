from __future__ import annotations

import json
import unittest

from ml.inference.validator import (
    ValidationResult,
    extract_first_json_object,
    validate_output_text,
    validate_with_repair,
)


VALID_OUTPUT = {
    "riskLevel": "HIGH",
    "hazards": [
        {
            "type": "SNOW_ICE",
            "severity": "HIGH",
            "reason": "Snow and ice are affecting access.",
        }
    ],
    "alerts": [
        {
            "title": "Trail closure in effect",
            "category": "Park Closure",
            "impact": "Access is limited in some areas.",
        }
    ],
    "notification": "Snow and ice may affect trail conditions today.",
    "recommendedAction": "Use traction and confirm closures before starting.",
}


def make_valid_result(raw_text: str) -> ValidationResult:
    return validate_output_text(raw_text)


class ValidatorRecoveryTests(unittest.TestCase):
    def test_valid_json_passes_directly(self) -> None:
        result = validate_output_text(json.dumps(VALID_OUTPUT))

        self.assertTrue(result.is_valid)
        self.assertEqual(result.parse_mode, "direct")
        self.assertIsNone(result.extracted_json)

    def test_wrapped_json_is_recovered(self) -> None:
        wrapped = f"```json\n{json.dumps(VALID_OUTPUT, indent=2)}\n```\nExtra note."

        result = validate_output_text(wrapped)

        self.assertTrue(result.is_valid)
        self.assertEqual(result.parse_mode, "extracted")
        self.assertIn("recovered_from_extracted_json_object", result.recovery_notes)
        self.assertEqual(json.loads(result.extracted_json), VALID_OUTPUT)

    def test_trailing_junk_is_recovered(self) -> None:
        wrapped = f"{json.dumps(VALID_OUTPUT)}\n\nVisitor tip: check conditions again."

        result = validate_output_text(wrapped)

        self.assertTrue(result.is_valid)
        self.assertEqual(result.parse_mode, "extracted")

    def test_extract_first_json_object_ignores_wrapper_text(self) -> None:
        text = f"Here is the answer:\n{json.dumps(VALID_OUTPUT)}\nThanks."

        extracted = extract_first_json_object(text)

        self.assertIsNotNone(extracted)
        self.assertEqual(json.loads(extracted), VALID_OUTPUT)

    def test_malformed_json_uses_one_repair_attempt(self) -> None:
        malformed = '{"riskLevel":"HIGH","hazards":[{"type":"SNOW_ICE"}'
        calls: list[str] = []

        def repair_fn(failed_validation: ValidationResult) -> ValidationResult:
            calls.append(failed_validation.raw_text)
            return make_valid_result(json.dumps(VALID_OUTPUT))

        result, repaired, attempts = validate_with_repair(
            raw_text=malformed,
            repair_attempts=1,
            repair_fn=repair_fn,
        )

        self.assertTrue(result.is_valid)
        self.assertTrue(repaired)
        self.assertEqual(attempts, 1)
        self.assertEqual(len(calls), 1)

    def test_unrecoverable_output_fails_cleanly(self) -> None:
        malformed = '{"riskLevel":"HIGH","hazards":[{"type":"SNOW_ICE"}'

        result, repaired, attempts = validate_with_repair(
            raw_text=malformed,
            repair_attempts=1,
            repair_fn=lambda failed_validation: validate_output_text("still not json"),
        )

        self.assertFalse(result.is_valid)
        self.assertFalse(repaired)
        self.assertEqual(attempts, 1)
        self.assertTrue(any("JSON parse failed:" in error for error in result.errors))

    def test_schema_invalid_json_is_still_rejected(self) -> None:
        invalid_schema = {
            **VALID_OUTPUT,
            "recommendedAction": "",
        }

        result = validate_output_text(json.dumps(invalid_schema))

        self.assertFalse(result.is_valid)
        self.assertEqual(result.parse_mode, "direct")
        self.assertTrue(any("at least 1 character" in error for error in result.errors))


if __name__ == "__main__":
    unittest.main()
