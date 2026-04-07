from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend" / "src"))

from dml_backend.domain.models import ExportArtifact, DraftChangeSet, ReviewRecord, ReviewStatus, SourceRecord  # noqa: E402
from dml_backend.git.review_branch import ReviewBranchPublisher  # noqa: E402


class ReviewBranchPublisherTest(unittest.TestCase):
    def test_dry_run_collects_paths_without_touching_git(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            subprocess.run(["git", "init", "-b", "main"], cwd=repo, check=True, capture_output=True, text=True)
            subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo, check=True, capture_output=True, text=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True, capture_output=True, text=True)
            data_dir = repo / "data" / "BC1"
            data_dir.mkdir(parents=True)
            (data_dir / "curve.json").write_text("{}", encoding="utf-8")
            (data_dir / "curve.csv").write_text("x,y\n1,2\n", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=repo, check=True, capture_output=True, text=True)
            subprocess.run(["git", "commit", "-m", "init"], cwd=repo, check=True, capture_output=True, text=True)

            change_set = DraftChangeSet(
                change_set_id="bc1-123",
                branch_name="bot/bc1/123",
                title="Add candidate BC1 data update 123",
                summary="Machine-fetched candidate data prepared for expert review.",
                source_records=[
                    SourceRecord(
                        source_system="hepdata",
                        source_record_id="ins1234567",
                        fetched_at="2026-04-04T00:00:00+00:00",
                        raw_asset_paths=[],
                    )
                ],
                curves=[],
                export_artifacts=[
                    ExportArtifact(
                        artifact_id="bc1-curve",
                        model_family="BC1",
                        json_path="data/BC1/curve.json",
                        csv_path="data/BC1/curve.csv",
                        generated_at="2026-04-04T00:00:00+00:00",
                        source_curve_id="curve",
                        review_status=ReviewStatus.NEEDS_REVIEW,
                    )
                ],
                review=ReviewRecord(review_id="review-123", status=ReviewStatus.NEEDS_REVIEW, required_checks=[]),
            )

            result = ReviewBranchPublisher(repo).publish_change_set(
                change_set=change_set,
                base_branch="main",
                remote="origin",
                push=False,
                dry_run=True,
                allow_dirty=False,
            )

            self.assertEqual(result.branch_name, "bot/bc1/123")
            self.assertEqual(result.staged_paths, ["data/BC1/curve.json", "data/BC1/curve.csv"])
            self.assertTrue(result.dry_run)


if __name__ == "__main__":
    unittest.main()
