from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from dml_backend.domain.models import SourceRecord
from dml_backend.pipelines.ingestion import SourceConnector


class HepDataConnector(SourceConnector):
    """Consumes a HEPData-style JSON feed snapshot and yields source records.

    The connector is intentionally tolerant because upstream feed shapes may vary.
    It accepts either a local JSON file or an HTTP(S) URL and looks for record-like
    objects with familiar keys such as `id`, `version`, `updated_at`, and `assets`.
    """

    source_name = "hepdata"

    def __init__(self, feed_location: str) -> None:
        self.feed_location = feed_location

    def fetch_updates(self, since: datetime | None = None) -> list[SourceRecord]:
        payload = self._load_payload()
        records = payload if isinstance(payload, list) else payload.get("records", [])
        source_records: list[SourceRecord] = []

        for item in records:
            source_record = self._parse_record(item)
            if since and source_record.fetched_at <= self._normalize_datetime(since):
                continue
            source_records.append(source_record)

        return source_records

    def _load_payload(self) -> object:
        parsed = urlparse(self.feed_location)
        if parsed.scheme in {"http", "https"}:
            with urlopen(self.feed_location) as response:  # noqa: S310
                return json.load(response)

        feed_path = Path(self.feed_location)
        return json.loads(feed_path.read_text(encoding="utf-8"))

    def _parse_record(self, item: dict[str, object]) -> SourceRecord:
        fetched_at = self._normalize_datetime(
            self._coalesce(item, "updated_at", "last_updated", "modified", default=datetime.now(timezone.utc))
        )
        landing_page = self._coalesce(item, "landing_page", "url", "record_url")
        assets = item.get("assets", [])

        raw_asset_paths: list[str] = []
        if isinstance(assets, list):
            for asset in assets:
                if isinstance(asset, str):
                    raw_asset_paths.append(asset)
                elif isinstance(asset, dict):
                    asset_path = asset.get("path") or asset.get("url") or asset.get("download_url")
                    if isinstance(asset_path, str):
                        raw_asset_paths.append(asset_path)

        source_record_id = self._coalesce(item, "id", "record_id", default="unknown-record")
        source_version = self._coalesce(item, "version", "record_version")
        checksum = self._coalesce(item, "checksum", "sha256")

        return SourceRecord(
            source_system=self.source_name,
            source_record_id=str(source_record_id),
            source_version=str(source_version) if source_version is not None else None,
            fetched_at=fetched_at,
            checksum=str(checksum) if checksum is not None else None,
            landing_page=str(landing_page) if landing_page is not None else None,
            raw_asset_paths=raw_asset_paths,
        )

    @staticmethod
    def _coalesce(item: dict[str, object], *keys: str, default: object | None = None) -> object | None:
        for key in keys:
            value = item.get(key)
            if value is not None:
                return value
        return default

    @staticmethod
    def _normalize_datetime(value: datetime | str) -> datetime:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)

        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
