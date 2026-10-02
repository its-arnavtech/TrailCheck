from __future__ import annotations

import unittest

from ml.data.build_dataset import build_notification


class DatasetLabelTests(unittest.TestCase):
    def test_single_hazard_uses_singular_verb(self) -> None:
        text = build_notification(
            [{"type": "HEAT", "severity": "HIGH", "reason": "Hot."}],
            [],
        )
        self.assertEqual(
            text,
            "Heat is the main trail safety concern in the current park conditions.",
        )

    def test_two_hazards_use_plural_verb(self) -> None:
        text = build_notification(
            [
                {"type": "HEAT", "severity": "HIGH", "reason": "Hot."},
                {"type": "DEHYDRATION", "severity": "HIGH", "reason": "Dry."},
            ],
            [],
        )
        self.assertIn(" are the main trail safety concerns", text)
        self.assertTrue(text.startswith("Heat, dehydration"))

    def test_alerts_without_hazards_do_not_start_with_a_space(self) -> None:
        text = build_notification([], [{"title": "Closure", "category": "Park Closure", "impact": "Closed."}])
        self.assertEqual(text, "Active park advisories may affect trail conditions today.")
        self.assertFalse(text.startswith(" "))

    def test_empty_inputs_stay_calm(self) -> None:
        text = build_notification([], [])
        self.assertIn("No major trail hazards", text)


if __name__ == "__main__":
    unittest.main()
