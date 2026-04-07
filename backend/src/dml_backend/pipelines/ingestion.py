from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

from dml_backend.domain.models import DraftChangeSet, ExportArtifact, ReviewRecord, ReviewStatus, SourceRecord


class SourceConnector(ABC):
    """Pulls new or changed source records from an upstream system."""

    source_name: str

    @abstractmethod
    def fetch_updates(self, since: datetime | None = None) -> list[SourceRecord]:
        raise NotImplementedError


class ChangeSetFactory:
    """Builds draft change sets that are intended to be reviewed in PRs or MRs."""

    def create_change_set(
        self,
        source_records: list[SourceRecord],
        model_family: str,
        curves=None,
        transformations=None,
        export_artifacts: list[ExportArtifact] | None = None,
    ) -> DraftChangeSet:
        timestamp = datetime.now(timezone.utc)
        slug = timestamp.strftime("%Y%m%d-%H%M%S")
        return DraftChangeSet(
            change_set_id=f"{model_family.lower()}-{slug}",
            branch_name=f"bot/{model_family.lower()}/{slug}",
            title=f"Add candidate {model_family} data update {slug}",
            summary=(
                "Machine-fetched candidate data prepared for expert review. "
                "Do not merge until physics validation and provenance checks are complete."
            ),
            source_records=source_records,
            curves=curves or [],
            transformations=transformations or [],
            export_artifacts=export_artifacts or [],
            review=ReviewRecord(
                review_id=f"review-{slug}",
                status=ReviewStatus.NEEDS_REVIEW,
                required_checks=[
                    "source-link-verification",
                    "physics-assumption-review",
                    "numeric-curve-validation",
                    "model-family-signoff",
                ],
            ),
        )

    def create_empty_change_set(self, source_records: list[SourceRecord], model_family: str) -> DraftChangeSet:
        return self.create_change_set(source_records=source_records, model_family=model_family)


class PullRequestPublisher:
    """Writes change-set material into the repo and opens a PR or MR in a later implementation."""

    def __init__(self, repository_root: Path) -> None:
        self.repository_root = repository_root

    def materialize_change_set(self, change_set: DraftChangeSet) -> Path:
        drafts_dir = self.repository_root / ".draft-data-prs"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        summary_path = drafts_dir / f"{change_set.change_set_id}.md"
        manifest_path = drafts_dir / f"{change_set.change_set_id}.json"
        summary_path.write_text(self.render_summary(change_set), encoding="utf-8")
        manifest_path.write_text(change_set.model_dump_json(indent=2), encoding="utf-8")
        return summary_path

    def render_summary(self, change_set: DraftChangeSet) -> str:
        lines = [
            f"# {change_set.title}",
            "",
            change_set.summary,
            "",
            "## Review gates",
        ]
        lines.extend(f"- {item}" for item in change_set.review.required_checks)
        lines.append("")
        lines.append("## Source records")
        for record in change_set.source_records:
            lines.append(f"- {record.source_system}:{record.source_record_id}")
        if change_set.curves:
            lines.append("")
            lines.append("## Normalized curves")
            for curve in change_set.curves:
                lines.append(f"- {curve.curve_id} ({curve.observable})")
        if change_set.export_artifacts:
            lines.append("")
            lines.append("## Export artifacts")
            for artifact in change_set.export_artifacts:
                lines.append(f"- {artifact.json_path}")
                lines.append(f"- {artifact.csv_path}")
        lines.append("")
        lines.append("A matching JSON manifest is written alongside this summary for machine-readable review metadata.")
        lines.append("This file is a local placeholder until GitHub/GitLab PR creation is wired in.")
        return "\n".join(lines)
