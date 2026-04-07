from __future__ import annotations

from dml_backend.domain.models import ArtifactOrigin, CurvePayload
from dml_backend.pipelines.transforms.base import DeterministicTransform, TransformationContext, TransformationResult


class BC1RenormalizationTransform(DeterministicTransform):
    model_family = "BC1"

    def applies_to(self, curve: CurvePayload) -> bool:
        return curve.categories.get("modelFamily") == self.model_family

    def run(self, curve: CurvePayload, context: TransformationContext) -> TransformationResult:
        scaled_points = [
            point.model_copy(update={"x": point.x, "y": point.y})
            for point in curve.points
        ]
        output_curve = curve.model_copy(
            update={
                "curve_id": f"{curve.curve_id}-renormalized",
                "origin": ArtifactOrigin.RENORMALIZED,
                "label_name": f"{curve.label_name} (renormalized)",
                "points": scaled_points,
                "assumptions": [*curve.assumptions, *context.assumptions],
            }
        )
        record = self.build_record(
            input_curve_id=curve.curve_id,
            output_curve_id=output_curve.curve_id,
            context=context,
        )
        return TransformationResult(output_curve=output_curve, record=record)


class BC1CouplingScaleTransform(DeterministicTransform):
    """Applies an explicit multiplicative scaling law to the y-axis values.

    This is the first non-trivial deterministic transform in the scaffold. The scaling law is:

        y' = y * (g_target / g_reference) ** exponent

    The formula is fully explicit and all parameters are recorded in the transformation context.
    It is suitable for regression testing and infrastructure validation, but it still requires
    domain review before being treated as a production BC1 physics prescription.
    """

    model_family = "BC1"

    def applies_to(self, curve: CurvePayload) -> bool:
        return curve.categories.get("modelFamily") == self.model_family

    def run(self, curve: CurvePayload, context: TransformationContext) -> TransformationResult:
        g_reference = float(context.parameters["g_reference"])
        g_target = float(context.parameters["g_target"])
        exponent = float(context.parameters.get("exponent", 4.0))
        if g_reference == 0:
            raise ValueError("g_reference must be non-zero")

        scale_factor = (g_target / g_reference) ** exponent
        scaled_points = [
            point.model_copy(update={"x": point.x, "y": point.y * scale_factor})
            for point in curve.points
        ]
        output_curve = curve.model_copy(
            update={
                "curve_id": f"{curve.curve_id}-gscaled",
                "origin": ArtifactOrigin.REINTERPRETED,
                "label_name": f"{curve.label_name} (g-scaled)",
                "points": scaled_points,
                "assumptions": [
                    *curve.assumptions,
                    *context.assumptions,
                    f"Applied coupling scaling with exponent {exponent}",
                ],
            }
        )
        record = self.build_record(
            input_curve_id=curve.curve_id,
            output_curve_id=output_curve.curve_id,
            context=context,
        )
        return TransformationResult(output_curve=output_curve, record=record)
