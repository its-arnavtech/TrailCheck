from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["LOW", "MODERATE", "HIGH", "EXTREME"]


class HazardItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1, max_length=64)
    severity: Severity
    reason: str = Field(min_length=1, max_length=400)


class AlertItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    impact: str = Field(min_length=1, max_length=240)


class TrailSafetyOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    riskLevel: Severity
    hazards: list[HazardItem] = Field(..., max_length=12)
    alerts: list[AlertItem] = Field(..., max_length=10)
    notification: str = Field(min_length=1, max_length=320)
    recommendedAction: str = Field(min_length=1, max_length=320)
