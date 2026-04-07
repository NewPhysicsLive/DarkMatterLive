from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend" / "src"))

from dml_backend.domain.models import (  # noqa: E402
    ArtifactOrigin,
    AxisDefinition,
    CurvePayload,
    CurvePoint,
    PublicationReference,
    SourceRecord,
)
from dml_backend.pipelines.transforms.base import TransformationContext  # noqa: E402
from dml_backend.pipelines.transforms.bc1 import BC1CouplingScaleTransform  # noqa: E402


class BC1CouplingScaleTransformTest(unittest.TestCase):
    def test_scales_y_values_and_records_provenance(self) -> None:
        curve = CurvePayload(
            curve_id="example-curve",
            label_name="Example",
            observable="sigma_chi_nucleon",
            curve_type="excluded",
            origin=ArtifactOrigin.OFFICIAL,
            x_axis=AxisDefinition(name="m_chi", symbol="m_chi", unit="GeV", scale="log10", description="mass"),
            y_axis=AxisDefinition(name="sigma", symbol="sigma", unit="cm^2", scale="log10", description="cross section"),
            points=[CurvePoint(x=1.0, y=2.0), CurvePoint(x=10.0, y=4.0)],
            categories={"modelFamily": "BC1"},
            paper_urls=["https://arxiv.org/abs/1234.56789"],
            publication=PublicationReference(title="Example publication", urls=["https://arxiv.org/abs/1234.56789"]),
            source_record=SourceRecord(
                source_system="hepdata",
                source_record_id="ins1234567",
                fetched_at="2026-04-04T00:00:00+00:00",
                raw_asset_paths=[],
            ),
            assumptions=["base assumption"],
        )
        context = TransformationContext(
            model_family="BC1",
            code_version="0.1.0",
            method_name="bc1_coupling_scale",
            formula_reference="y' = y * (g_target / g_reference) ** exponent",
            assumptions=["scale assumption"],
            parameters={"g_reference": 1.0, "g_target": 2.0, "exponent": 2.0},
        )

        result = BC1CouplingScaleTransform().run(curve, context)

        self.assertEqual(result.output_curve.curve_id, "example-curve-gscaled")
        self.assertEqual(result.output_curve.origin, ArtifactOrigin.REINTERPRETED)
        self.assertAlmostEqual(result.output_curve.points[0].y, 8.0)
        self.assertAlmostEqual(result.output_curve.points[1].y, 16.0)
        self.assertIn("Applied coupling scaling with exponent 2.0", result.output_curve.assumptions)
        self.assertEqual(result.record.method_name, "bc1_coupling_scale")
        self.assertEqual(result.record.parameters["g_target"], 2.0)


if __name__ == "__main__":
    unittest.main()
