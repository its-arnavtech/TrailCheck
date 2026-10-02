from __future__ import annotations

import unittest

from ml.evaluation.evaluate_outputs import evaluate_system


GOLD_OUTPUT = {
    "riskLevel": "HIGH",
    "hazards": [{"type": "HEAT", "severity": "HIGH", "reason": "Hot trails."}],
    "alerts": [{"title": "Heat advisory", "category": "Park Alert", "impact": "Limit midday hiking."}],
    "notification": "Heat plus active park advisories may affect trail conditions today.",
    "recommendedAction": "Carry extra water and avoid exposed routes at midday.",
}


def gold_row(output: dict) -> dict:
    return {"metadata": {"rowId": "bibe:2024-07-01"}, "target_json": output}


class EvaluateOutputTests(unittest.TestCase):
    def test_matching_prediction_scores_perfectly(self) -> None:
        metrics = evaluate_system(
            {"bibe:2024-07-01": gold_row(GOLD_OUTPUT)},
            {"bibe:2024-07-01": {"ok": True, "parsed": GOLD_OUTPUT}},
        )
        self.assertEqual(metrics["rowsEvaluated"], 1)
        self.assertEqual(metrics["schemaValidity"], 1.0)
        self.assertEqual(metrics["riskLevelAccuracy"], 1.0)
        self.assertEqual(metrics["hazardF1"], 1.0)

    def test_invalid_json_and_wrong_risk_are_counted(self) -> None:
        wrong = {**GOLD_OUTPUT, "riskLevel": "LOW", "hazards": []}
        metrics = evaluate_system(
            {
                "bibe:2024-07-01": gold_row(GOLD_OUTPUT),
                "yose:2024-01-10": gold_row(GOLD_OUTPUT),
            },
            {
                "bibe:2024-07-01": {"ok": False, "parsed": GOLD_OUTPUT},
                "yose:2024-01-10": {"ok": True, "parsed": wrong},
            },
        )
        self.assertEqual(metrics["rowsEvaluated"], 2)
        self.assertEqual(metrics["schemaValidity"], 0.5)
        self.assertEqual(metrics["riskLevelAccuracy"], 0.5)


if __name__ == "__main__":
    unittest.main()
