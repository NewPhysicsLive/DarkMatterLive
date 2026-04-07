from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ReviewStatus(str, Enum):
    DRAFT = "draft"
    NEEDS_REVIEW = "needs-review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class ArtifactOrigin(str, Enum):
    OFFICIAL = "official"
    DIGITIZED = "digitized"
    REINTERPRETED = "reinterpreted"
    RENORMALIZED = "renormalized"


class AxisDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    symbol: str
    unit: str
    scale: str = Field(description="Expected plot scale such as linear or log10")
    description: str


class PublicationReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    collaboration: str | None = None
    arxiv_id: str | None = None
    doi: str | None = None
    journal: str | None = None
    publication_date: date | None = None
    urls: list[HttpUrl] = Field(default_factory=list)


class SourceRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_system: str = Field(description="hepdata, inspire, arxiv, manual-upload, etc.")
    source_record_id: str
    source_version: str | None = None
    fetched_at: datetime
    checksum: str | None = None
    landing_page: HttpUrl | None = None
    raw_asset_paths: list[str] = Field(default_factory=list)
    persisted_assets: list[dict[str, str | int | None]] = Field(default_factory=list)


class CurvePoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: float
    y: float


class CurvePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    curve_id: str
    label_name: str
    long_name: str | None = None
    observable: str
    confidence_level: str | None = None
    curve_type: str
    origin: ArtifactOrigin
    x_axis: AxisDefinition
    y_axis: AxisDefinition
    points: list[CurvePoint]
    categories: dict[str, str] = Field(default_factory=dict)
    qualifiers: dict[str, str] = Field(default_factory=dict)
    uncertainty_labels: list[str] = Field(default_factory=list)
    paper_urls: list[HttpUrl] = Field(default_factory=list)
    publication: PublicationReference
    source_record: SourceRecord
    assumptions: list[str] = Field(default_factory=list)


class TransformationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transformation_id: str
    model_family: str
    input_curve_ids: list[str]
    output_curve_id: str
    code_version: str
    method_name: str
    formula_reference: str | None = None
    parameters: dict[str, float | str | bool] = Field(default_factory=dict)
    assumptions: list[str] = Field(default_factory=list)
    notes: str | None = None
    created_at: datetime


class ReviewRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    review_id: str
    status: ReviewStatus
    reviewer: str | None = None
    reviewed_at: datetime | None = None
    notes: str | None = None
    required_checks: list[str] = Field(default_factory=list)


class ExportArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    artifact_id: str
    model_family: str
    json_path: str
    csv_path: str
    generated_at: datetime
    source_curve_id: str
    transformation_id: str | None = None
    review_status: ReviewStatus


class DraftChangeSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    change_set_id: str
    branch_name: str
    title: str
    summary: str
    source_records: list[SourceRecord]
    curves: list[CurvePayload]
    transformations: list[TransformationRecord] = Field(default_factory=list)
    export_artifacts: list[ExportArtifact] = Field(default_factory=list)
    review: ReviewRecord
