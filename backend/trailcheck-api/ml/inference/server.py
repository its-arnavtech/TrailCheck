from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ml.inference.runtime import LocalInferenceEngine

logger = logging.getLogger(__name__)

app = FastAPI(title="TrailCheck Local Model Server", version="1.0.0")


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input: dict[str, Any]
    rowId: str | None = None
    metadata: dict[str, Any] | None = None


def get_config_path() -> str:
    return os.getenv("LOCAL_MODEL_CONFIG", "ml/configs/trailcheck_qlora_4060.yaml")


def get_adapter_path() -> str | None:
    return os.getenv("LOCAL_MODEL_ADAPTER_PATH") or None


@app.on_event("startup")
def load_engine() -> None:
    app.state.engine = LocalInferenceEngine(
        config_path=get_config_path(),
        adapter_path=get_adapter_path(),
    )


@app.get("/health")
def health() -> dict[str, Any]:
    engine = getattr(app.state, "engine", None)
    if engine is None:
      return {"ok": False, "status": "starting"}

    return {
        "ok": True,
        "status": "ready",
        "configPath": engine.config_path,
        "adapterPath": engine.adapter_path,
        "repairAttempts": engine.repair_attempts,
    }


@app.post("/generate")
def generate(request: GenerateRequest) -> JSONResponse:
    engine: LocalInferenceEngine = app.state.engine

    try:
        result = engine.generate_from_input_context(
            request.input,
            row_id=request.rowId or "single-input",
            metadata=request.metadata,
        )
        return JSONResponse(status_code=200, content=result)
    except Exception as exc:
        logger.exception("Persistent local model service failed to generate output.")
        return JSONResponse(
            status_code=500,
            content={
                "rowId": request.rowId or "single-input",
                "ok": False,
                "fallbackRecommended": True,
                "output": None,
                "errors": [f"Local model server error: {type(exc).__name__}: {exc}"],
                "rawText": None,
                "extractedJson": None,
                "metadata": request.metadata or {},
            },
        )
