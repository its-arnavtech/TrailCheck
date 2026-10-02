from __future__ import annotations

import json
import unittest
from pathlib import Path

from ml.smoke import MODEL_EVAL_PATH, run_smoke
from ml.training.train_sft import resolve_dtype


class _Dtypes:
    float16 = "float16"
    bfloat16 = "bfloat16"
    float32 = "float32"


class SmokePipelineTests(unittest.TestCase):
    def test_resolve_dtype_honors_config_name(self) -> None:
        self.assertEqual(resolve_dtype("bfloat16", _Dtypes), "bfloat16")
        self.assertEqual(resolve_dtype("float32", _Dtypes), "float32")
        with self.assertRaises(ValueError):
            resolve_dtype("float8", _Dtypes)

    def test_cpu_smoke_measures_rules_replay_and_leaves_model_unrun(self) -> None:
        harness = run_smoke()
        self.assertEqual(harness["status"], "measured")
        self.assertEqual(harness["what"], "rules_replay")
        self.assertGreater(harness["dataset"]["recordCount"], 0)
        self.assertEqual(harness["metrics"]["schemaValidity"], 1.0)
        self.assertEqual(harness["metrics"]["riskLevelAccuracy"], 1.0)

        model_eval = json.loads(Path(MODEL_EVAL_PATH).read_text(encoding="utf-8"))
        self.assertEqual(model_eval["status"], "not yet run")
        self.assertIsNone(model_eval["metrics"])


if __name__ == "__main__":
    unittest.main()
