from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend" / "src"))

from dml_backend.domain.models import SourceRecord  # noqa: E402
from dml_backend.pipelines.normalize import HepDataTableNormalizer  # noqa: E402


class HepDataTableNormalizerTest(unittest.TestCase):
    def test_normalizes_sample_table(self) -> None:
        normalizer = HepDataTableNormalizer()
        curve = normalizer.normalize(
            REPO_ROOT / "backend" / "examples" / "hepdata-table.sample.yaml",
            REPO_ROOT / "backend" / "examples" / "hepdata-table-metadata.sample.json",
            SourceRecord(
                source_system="hepdata",
                source_record_id="ins1234567",
                fetched_at="2026-04-04T00:00:00+00:00",
                raw_asset_paths=[],
            ),
        )

        self.assertEqual(curve.curve_id, "ins1234567-hepdata-table1")
        self.assertEqual(curve.confidence_level, "90% CL")
        self.assertEqual(curve.x_axis.unit, "GeV")
        self.assertEqual(curve.y_axis.unit, "cm^2")
        self.assertEqual(len(curve.points), 3)
        self.assertAlmostEqual(curve.points[1].x, 1.0)
        self.assertAlmostEqual(curve.points[1].y, 3.0e-5)

    def test_normalizes_multiple_series_and_uncertainties(self) -> None:
        normalizer = HepDataTableNormalizer()
        curves = normalizer.normalize_many(
            REPO_ROOT / "backend" / "examples" / "hepdata-multiseries.sample.yaml",
            REPO_ROOT / "backend" / "examples" / "hepdata-multiseries-metadata.sample.json",
            SourceRecord(
                source_system="hepdata",
                source_record_id="ins9999999",
                fetched_at="2026-04-04T00:00:00+00:00",
                raw_asset_paths=[],
            ),
        )

        self.assertEqual(len(curves), 2)
        self.assertEqual(curves[0].qualifiers["channel"], "electron")
        self.assertEqual(curves[1].qualifiers["channel"], "muon")
        self.assertIn("stat", curves[0].uncertainty_labels)
        self.assertIn("syst", curves[0].uncertainty_labels)
        self.assertEqual(curves[0].curve_id, "ins9999999-hepdata-multi-electron")
        self.assertEqual(curves[1].curve_id, "ins9999999-hepdata-multi-muon")


if __name__ == "__main__":
    unittest.main()
