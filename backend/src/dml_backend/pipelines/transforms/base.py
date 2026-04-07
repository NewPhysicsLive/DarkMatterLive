from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone

from dml_backend.domain.models import CurvePayload, TransformationRecord


@dataclass(slots=True)
class TransformationContext:
    model_family: str
    code_version: str
    method_name: str
    formula_reference: str | None = None
    assumptions: list[str] = field(default_factory=list)
    parameters: dict[str, float | str | bool] = field(default_factory=dict)


@dataclass(slots=True)
class TransformationResult:
    output_curve: CurvePayload
    record: TransformationRecord


class DeterministicTransform(ABC):
    model_family: str

    @abstractmethod
    def applies_to(self, curve: CurvePayload) -> bool:
        raise NotImplementedError

    @abstractmethod
    def run(self, curve: CurvePayload, context: TransformationContext) -> TransformationResult:
        raise NotImplementedError

    def build_record(self, input_curve_id: str, output_curve_id: str, context: TransformationContext) -> TransformationRecord:
        timestamp = datetime.now(timezone.utc)
        return TransformationRecord(
            transformation_id=f"{context.model_family.lower()}-{output_curve_id}-{timestamp.strftime('%Y%m%d%H%M%S')}",
            model_family=context.model_family,
            input_curve_ids=[input_curve_id],
            output_curve_id=output_curve_id,
            code_version=context.code_version,
            method_name=context.method_name,
            formula_reference=context.formula_reference,
            parameters=context.parameters,
            assumptions=context.assumptions,
            created_at=timestamp,
        )
