from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from dml_backend.domain.models import SourceRecord


class RawAssetStore:
    """Persists raw source assets under the repository for reproducible review."""

    def __init__(self, repository_root: Path) -> None:
        self.repository_root = repository_root

    def persist_source_record_assets(self, source_record: SourceRecord) -> SourceRecord:
        record_dir = (
            self.repository_root
            / ".cache"
            / "raw-sources"
            / source_record.source_system
            / source_record.source_record_id
        )
        assets_dir = record_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)

        persisted_assets: list[dict[str, str | int | None]] = []
        for index, asset_path in enumerate(source_record.raw_asset_paths, start=1):
            try:
                stored_path = self._persist_asset(asset_path, assets_dir, index)
            except Exception as exc:
                persisted_assets.append(
                    {
                        "sourcePath": asset_path,
                        "storedPath": None,
                        "sha256": None,
                        "sizeBytes": None,
                        "error": str(exc),
                    }
                )
                continue

            persisted_assets.append(
                {
                    "sourcePath": asset_path,
                    "storedPath": str(stored_path.relative_to(self.repository_root)).replace("\\", "/"),
                    "sha256": self._compute_sha256(stored_path),
                    "sizeBytes": stored_path.stat().st_size,
                    "error": None,
                }
            )

        manifest = {
            "sourceSystem": source_record.source_system,
            "sourceRecordId": source_record.source_record_id,
            "sourceVersion": source_record.source_version,
            "fetchedAt": source_record.fetched_at.isoformat(),
            "landingPage": str(source_record.landing_page) if source_record.landing_page else None,
            "persistedAssets": persisted_assets,
        }
        (record_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return source_record.model_copy(update={"persisted_assets": persisted_assets})

    def _persist_asset(self, asset_path: str, assets_dir: Path, index: int) -> Path:
        parsed = urlparse(asset_path)
        filename = Path(parsed.path).name or f"asset-{index}.bin"
        target_path = assets_dir / f"{index:02d}-{filename}"

        if parsed.scheme in {"http", "https"}:
            with urlopen(asset_path) as response, target_path.open("wb") as handle:  # noqa: S310
                shutil.copyfileobj(response, handle)
            return target_path

        source_path = Path(asset_path)
        if not source_path.is_absolute():
            source_path = (self.repository_root / source_path).resolve()
        shutil.copyfile(source_path, target_path)
        return target_path

    @staticmethod
    def _compute_sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(65536), b""):
                digest.update(chunk)
        return digest.hexdigest()
