from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from dml_backend.domain.models import CurvePayload, ExportArtifact, ReviewStatus


class SiteExporter:
    """Exports canonical curves into the repository's current data/<model>/ layout."""

    def __init__(self, repository_root: Path) -> None:
        self.repository_root = repository_root

    def export_curve(self, model_family: str, curve: CurvePayload) -> ExportArtifact:
        data_dir = self.repository_root / "data" / model_family
        data_dir.mkdir(parents=True, exist_ok=True)

        csv_name = f"{curve.curve_id}.csv"
        json_name = f"{curve.curve_id}.json"
        csv_path = data_dir / csv_name
        json_path = data_dir / json_name

        with csv_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["x", "y"])
            for point in curve.points:
                writer.writerow([point.x, point.y])

        metadata = {
            "labelName": curve.label_name,
            "longName": curve.long_name or curve.label_name,
            "id": curve.curve_id,
            "paperUrls": [str(url) for url in curve.paper_urls],
            "url": f"../../data/{model_family}/{csv_name}",
            "curveType": curve.curve_type,
            "categories": curve.categories,
            "qualifiers": curve.qualifiers,
            "uncertaintyLabels": curve.uncertainty_labels,
            "generated": True,
            "origin": curve.origin.value,
            "observable": curve.observable,
            "assumptions": curve.assumptions,
            "publication": {
                "title": curve.publication.title,
                "collaboration": curve.publication.collaboration,
                "arxivId": curve.publication.arxiv_id,
                "doi": curve.publication.doi,
                "journal": curve.publication.journal,
                "publicationDate": curve.publication.publication_date.isoformat()
                if curve.publication.publication_date
                else None,
            },
            "provenance": {
                "sourceSystem": curve.source_record.source_system,
                "sourceRecordId": curve.source_record.source_record_id,
                "sourceVersion": curve.source_record.source_version,
                "fetchedAt": curve.source_record.fetched_at.isoformat(),
                "landingPage": str(curve.source_record.landing_page) if curve.source_record.landing_page else None,
                "rawAssetPaths": curve.source_record.raw_asset_paths,
            },
            "review": {
                "status": ReviewStatus.NEEDS_REVIEW.value,
                "requiredChecks": [
                    "source-link-verification",
                    "physics-assumption-review",
                    "numeric-curve-validation",
                    "model-family-signoff",
                ],
            },
        }
        json_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        return ExportArtifact(
            artifact_id=f"{model_family.lower()}-{curve.curve_id}",
            model_family=model_family,
            json_path=str(json_path.relative_to(self.repository_root)).replace("\\", "/"),
            csv_path=str(csv_path.relative_to(self.repository_root)).replace("\\", "/"),
            generated_at=datetime.now(timezone.utc),
            source_curve_id=curve.curve_id,
            review_status=ReviewStatus.NEEDS_REVIEW,
        )
