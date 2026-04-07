from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend" / "src"))

from dml_backend.domain.models import DraftChangeSet, ReviewRecord, ReviewStatus, SourceRecord  # noqa: E402
from dml_backend.forge.review_requests import ReviewRequestBuilder  # noqa: E402


class ReviewRequestBuilderTest(unittest.TestCase):
    def test_builds_github_payload(self) -> None:
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
            export_artifacts=[],
            review=ReviewRecord(review_id="review-123", status=ReviewStatus.NEEDS_REVIEW, required_checks=["source-link-verification"]),
        )
        payload = ReviewRequestBuilder().build_github(
            change_set,
            repository="owner/repo",
            base_branch="main",
            token="secret-token",
            api_base="https://api.github.test",
        )

        self.assertEqual(payload.api_url, "https://api.github.test/repos/owner/repo/pulls")
        self.assertEqual(payload.branch_name, "bot/bc1/123")
        self.assertEqual(payload.body["head"], "bot/bc1/123")
        self.assertTrue(payload.body["draft"])
        self.assertIn("source-link-verification", payload.body["body"])

    def test_builds_gitlab_payload(self) -> None:
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
            export_artifacts=[],
            review=ReviewRecord(review_id="review-123", status=ReviewStatus.NEEDS_REVIEW, required_checks=["source-link-verification"]),
        )
        payload = ReviewRequestBuilder().build_gitlab(
            change_set,
            project_id="group/repo",
            target_branch="main",
            token="secret-token",
            api_base="https://gitlab.test/api/v4",
        )

        self.assertEqual(payload.api_url, "https://gitlab.test/api/v4/projects/group%2Frepo/merge_requests")
        self.assertEqual(payload.branch_name, "bot/bc1/123")
        self.assertEqual(payload.body["source_branch"], "bot/bc1/123")
        self.assertTrue(payload.body["draft"])


if __name__ == "__main__":
    unittest.main()
