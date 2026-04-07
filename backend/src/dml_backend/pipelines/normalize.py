from __future__ import annotations

import csv
import json
from pathlib import Path

import yaml

from dml_backend.domain.models import AxisDefinition, CurvePayload, CurvePoint, PublicationReference, SourceRecord


class LocalCsvCurveNormalizer:
    """Normalizes a local x,y CSV plus metadata into a canonical curve payload."""

    def normalize(self, csv_path: Path, metadata_path: Path, source_record: SourceRecord) -> CurvePayload:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        points = self._read_points(csv_path)

        return CurvePayload(
            curve_id=metadata["curve_id"],
            label_name=metadata["label_name"],
            long_name=metadata.get("long_name"),
            observable=metadata["observable"],
            confidence_level=metadata.get("confidence_level"),
            curve_type=metadata["curve_type"],
            origin=metadata.get("origin", "official"),
            x_axis=AxisDefinition.model_validate(metadata["x_axis"]),
            y_axis=AxisDefinition.model_validate(metadata["y_axis"]),
            points=points,
            categories=metadata.get("categories", {}),
            qualifiers=metadata.get("qualifiers", {}),
            uncertainty_labels=metadata.get("uncertainty_labels", []),
            paper_urls=metadata.get("paper_urls", []),
            publication=PublicationReference.model_validate(metadata["publication"]),
            source_record=source_record,
            assumptions=metadata.get("assumptions", []),
        )

    @staticmethod
    def _read_points(csv_path: Path) -> list[CurvePoint]:
        points: list[CurvePoint] = []
        with csv_path.open("r", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            header = next(reader)
            normalized_header = [item.strip() for item in header]
            if normalized_header[:2] != ["x", "y"]:
                raise ValueError(f"CSV header must start with x,y, got {normalized_header}")

            for row_number, row in enumerate(reader, start=2):
                if len(row) < 2:
                    raise ValueError(f"Row {row_number} has fewer than 2 columns")
                points.append(CurvePoint(x=float(row[0]), y=float(row[1])))
        return points


class HepDataTableNormalizer:
    """Normalizes a HEPData-style table YAML or JSON plus local metadata into a canonical curve payload."""

    def normalize(self, table_path: Path, metadata_path: Path, source_record: SourceRecord) -> CurvePayload:
        curves = self.normalize_many(table_path, metadata_path, source_record)
        if len(curves) != 1:
            raise ValueError("normalize() expected exactly one dependent series; use normalize_many() for multi-series tables")
        return curves[0]

    def normalize_many(self, table_path: Path, metadata_path: Path, source_record: SourceRecord) -> list[CurvePayload]:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        table = self._load_table(table_path)
        series_payloads = self._extract_table_payloads(table)

        publication_payload = metadata["publication"]
        dependent_index = metadata.get("dependent_variable_index")
        if dependent_index is not None:
            series_payloads = [series_payloads[int(dependent_index)]]

        curves: list[CurvePayload] = []
        for index, series in enumerate(series_payloads):
            curve_id = metadata["curve_id"]
            label_name = metadata["label_name"]
            long_name = metadata.get("long_name")
            if len(series_payloads) > 1:
                suffix = self._series_suffix(series["qualifiers"], index)
                curve_id = f"{curve_id}-{suffix}"
                label_name = f"{label_name} [{suffix}]"
                if long_name:
                    long_name = f"{long_name} [{suffix}]"

            assumptions = list(metadata.get("assumptions", []))
            if series["uncertainty_labels"]:
                assumptions.append(
                    "Uncertainty labels present in source table: " + ", ".join(series["uncertainty_labels"])
                )

            curves.append(
                CurvePayload(
                    curve_id=curve_id,
                    label_name=label_name,
                    long_name=long_name,
                    observable=metadata["observable"],
                    confidence_level=metadata.get("confidence_level") or series["confidence_level"],
                    curve_type=metadata["curve_type"],
                    origin=metadata.get("origin", "official"),
                    x_axis=series["x_axis"],
                    y_axis=series["y_axis"],
                    points=series["points"],
                    categories=metadata.get("categories", {}),
                    qualifiers=series["qualifiers"],
                    uncertainty_labels=series["uncertainty_labels"],
                    paper_urls=metadata.get("paper_urls", []),
                    publication=PublicationReference.model_validate(publication_payload),
                    source_record=source_record,
                    assumptions=assumptions,
                )
            )
        return curves

    @staticmethod
    def _load_table(table_path: Path) -> dict:
        suffix = table_path.suffix.lower()
        text = table_path.read_text(encoding="utf-8")
        if suffix in {".yaml", ".yml"}:
            loaded = yaml.safe_load(text)
        elif suffix == ".json":
            loaded = json.loads(text)
        else:
            raise ValueError(f"Unsupported HEPData table format: {suffix}")
        if not isinstance(loaded, dict):
            raise ValueError("HEPData table must decode to an object")
        return loaded

    @staticmethod
    def _extract_table_payloads(table: dict) -> list[dict[str, object]]:
        independent_variables = table.get("independent_variables") or []
        dependent_variables = table.get("dependent_variables") or []
        if len(independent_variables) != 1:
            raise ValueError("Expected exactly one independent variable")
        if len(dependent_variables) < 1:
            raise ValueError("Expected at least one dependent variable")

        x_variable = independent_variables[0]
        x_header = x_variable.get("header") or {}
        x_values = x_variable.get("values") or []
        x_axis = AxisDefinition(
            name=HepDataTableNormalizer._normalize_axis_name(x_header.get("name", "x")),
            symbol=str(x_header.get("name", "x")),
            unit=str(x_header.get("units", "")),
            scale="log10",
            description=str(x_header.get("name", "Independent variable")),
        )

        payloads = []
        for dep_index, y_variable in enumerate(dependent_variables):
            y_header = y_variable.get("header") or {}
            y_values = y_variable.get("values") or []
            if len(x_values) != len(y_values):
                raise ValueError("Independent and dependent variables must have the same number of values")

            points = []
            uncertainty_labels: list[str] = []
            for row_index, (x_entry, y_entry) in enumerate(zip(x_values, y_values), start=1):
                x_value = HepDataTableNormalizer._coerce_numeric(x_entry, f"x[{row_index}]")
                y_value = HepDataTableNormalizer._coerce_numeric(y_entry, f"y[{row_index}]")
                points.append(CurvePoint(x=x_value, y=y_value))
                uncertainty_labels.extend(HepDataTableNormalizer._extract_uncertainty_labels(y_entry))

            qualifiers = HepDataTableNormalizer._extract_qualifiers(y_variable.get("qualifiers") or [])
            confidence_level = qualifiers.get("CL") or qualifiers.get("Confidence Level")
            y_axis = AxisDefinition(
                name=HepDataTableNormalizer._normalize_axis_name(y_header.get("name", f"y_{dep_index}")),
                symbol=str(y_header.get("name", f"y_{dep_index}")),
                unit=str(y_header.get("units", "")),
                scale="log10",
                description=str(y_header.get("name", "Dependent variable")),
            )
            payloads.append(
                {
                    "x_axis": x_axis,
                    "y_axis": y_axis,
                    "points": points,
                    "confidence_level": str(confidence_level) if confidence_level is not None else None,
                    "qualifiers": qualifiers,
                    "uncertainty_labels": sorted(set(uncertainty_labels)),
                }
            )
        return payloads

    @staticmethod
    def _extract_uncertainty_labels(entry: dict) -> list[str]:
        if not isinstance(entry, dict):
            return []
        labels = []
        for error in entry.get("errors") or []:
            if isinstance(error, dict):
                label = error.get("label") or error.get("symerror") or error.get("asymerror")
                if label is not None:
                    labels.append(str(label))
        return labels

    @staticmethod
    def _extract_qualifiers(qualifiers: list[dict]) -> dict[str, str]:
        normalized: dict[str, str] = {}
        for qualifier in qualifiers:
            if isinstance(qualifier, dict) and "name" in qualifier and "value" in qualifier:
                normalized[str(qualifier["name"])] = str(qualifier["value"])
        return normalized

    @staticmethod
    def _series_suffix(qualifiers: dict[str, str], index: int) -> str:
        if qualifiers:
            preferred_keys = [key for key in qualifiers if key.strip().lower() not in {"cl", "confidence level"}]
            ordered_keys = preferred_keys or list(qualifiers)
            for key in ordered_keys:
                value = qualifiers[key]
                slug = str(value).strip().lower().replace(" ", "-").replace("%", "pct")
                slug = "".join(ch for ch in slug if ch.isalnum() or ch in {"-", "_"})
                if slug:
                    return slug
        return f"series-{index + 1}"

    @staticmethod
    def _coerce_numeric(entry: dict, label: str) -> float:
        if not isinstance(entry, dict) or "value" not in entry:
            raise ValueError(f"Missing value field for {label}")
        return float(entry["value"])

    @staticmethod
    def _normalize_axis_name(name: object) -> str:
        return str(name).strip().lower().replace(" ", "_")
