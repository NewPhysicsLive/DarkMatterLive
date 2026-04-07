# Implementation Status

This document records what has already been implemented in the backend automation scaffold and what remains deliberately incomplete.

It is meant to describe the repository as it exists now, not the final intended architecture.

## Implemented in code

### 1. Canonical domain schema

Implemented in `backend/src/dml_backend/domain/models.py`.

Available model types:

- `ReviewStatus`
- `ArtifactOrigin`
- `AxisDefinition`
- `PublicationReference`
- `SourceRecord`
- `CurvePoint`
- `CurvePayload`
- `TransformationRecord`
- `ReviewRecord`
- `ExportArtifact`
- `DraftChangeSet`

Purpose:

- define a backend source-of-truth model that is stricter than the current static `data/<model>/` files
- track provenance and review state explicitly
- separate canonical scientific records from site-export artifacts

### 2. Ingestion workflow primitives

Implemented in `backend/src/dml_backend/pipelines/ingestion.py`.

Available classes:

- `SourceConnector`
- `ChangeSetFactory`
- `PullRequestPublisher`

Current behavior:

- `ChangeSetFactory` builds a review-gated draft change set
- `PullRequestPublisher` writes a markdown summary under `.draft-data-prs/`

Current limitation:

- draft payload generation and local branch publication are implemented, but live submission has not been exercised in this repository session

### 3. HEPData-style source connector

Implemented in `backend/src/dml_backend/pipelines/connectors/hepdata.py`.

Current behavior:

- accepts local JSON or HTTP(S) JSON input
- accepts either a top-level list or an object containing `records`
- normalizes supported fields into `SourceRecord`

Current limitation:

- does not yet persist downloaded assets directly as part of the plain `draft-hepdata` flow
- does not yet map HEPData tables into curve payloads on its own
- is tolerant by design because the exact live upstream contract is not locked into the code yet

### 4. CLI entry point

Implemented in `backend/src/dml_backend/cli.py` and registered in `backend/pyproject.toml`.

Current command:

```powershell
dml-backend draft-hepdata --feed <path-or-url> --model-family <model>
```

Current behavior:

- loads source records from the connector
- filters by `--since` if provided
- generates a draft change set
- writes a draft summary file under `.draft-data-prs/`

Additional command:

```powershell
dml-backend draft-local-curve --feed <path-or-url> --record-id <record-id> --csv <csv> --metadata <metadata-json> --model-family <model>
```

Current behavior:

- selects one source record
- persists referenced and supplied local assets under `.cache/raw-sources/`
- normalizes a local x,y CSV plus metadata JSON into a canonical `CurvePayload`
- exports generated site artifacts to `data/<model>/`
- writes a markdown summary and JSON change-set manifest under `.draft-data-prs/`

Additional command:

```powershell
dml-backend draft-hepdata-table --feed <path-or-url> --record-id <record-id> --table <yaml-or-json-table> --metadata <metadata-json> --model-family <model>
```

Current behavior:

- persists referenced and supplied local assets under `.cache/raw-sources/`
- normalizes a local HEPData-style table into a canonical curve payload
- can apply the explicit BC1 coupling-scale transform
- can normalize multiple dependent variable series from one HEPData table
- exports generated site artifacts and draft bundle files

### 5. Deterministic transformation scaffold

Implemented in:

- `backend/src/dml_backend/pipelines/transforms/base.py`
- `backend/src/dml_backend/pipelines/transforms/bc1.py`

Current behavior:

- defines the interface for deterministic model-family transforms
- shows how a transform should emit both a transformed curve and provenance record

Current limitation:

- the BC1 transform is a placeholder and does not apply a real physics formula

### 6. Static export scaffold

Implemented in `backend/src/dml_backend/export/site.py`.

Current behavior:

- exports `x,y` CSV files
- exports matching JSON metadata files compatible with the current site layout
- adds generated-data metadata for provenance and review

Generated JSON fields added by the exporter:

- `generated`
- `origin`
- `observable`
- `assumptions`
- `publication`
- `provenance`
- `review`

### 7. Repository validator extension

Implemented in `scripts/validate_data.py`.

Current behavior:

- keeps the original JSON and CSV validation rules
- adds extra checks when a JSON file sets `generated: true`

Generated artifact checks added:

- presence of `origin`, `observable`, `assumptions`, `provenance`, `review`
- structure checks for `provenance`
- ISO-8601 shape check for `provenance.fetchedAt`
- allowed-state validation for `review.status`

### 8. Raw asset persistence and local normalization path

Implemented in:

- `backend/src/dml_backend/storage/raw_assets.py`
- `backend/src/dml_backend/pipelines/normalize.py`

Current behavior:

- persists raw assets under `.cache/raw-sources/<source>/<record-id>/assets/`
- writes a raw-source manifest beside the persisted assets
- normalizes one local x,y CSV plus metadata JSON into a canonical curve payload

Current limitation:

- the normalization path is local-file driven
- it does not yet interpret real HEPData table schemas automatically

### 9. HEPData table normalization

Implemented in `backend/src/dml_backend/pipelines/normalize.py`.

Current behavior:

- reads HEPData-style YAML or JSON table files
- expects one independent variable and at least one dependent variable
- infers axis metadata and confidence-level qualifiers from the table structure
- extracts per-series qualifiers and uncertainty labels

Current limitation:

- more complex uncertainty payloads are reduced to label capture only
- asymmetric and structured uncertainty values are not yet modeled explicitly in the canonical schema

### 10. Forge review-request adapters

Implemented in `backend/src/dml_backend/forge/review_requests.py`.

Current behavior:

- builds GitHub PR request payloads
- builds GitLab MR request payloads
- supports dry-run inspection from a draft manifest
- supports live submission when credentials are provided
- supports dry-run git branch publication planning from the same manifest

Current limitation:

- live API submission has not been exercised in this repository session
- non-dry-run git publication was implemented but not exercised in this repository session

### 11. BC1 coupling-scale transform and regression tests

Implemented in `backend/src/dml_backend/pipelines/transforms/bc1.py` and `backend/tests/`.

Current behavior:

- applies the explicit formula `y' = y * (g_target / g_reference) ** exponent`
- records transform provenance in `TransformationRecord`
- is covered by regression tests together with HEPData normalization and review-request payload generation

Current limitation:

- the transform is infrastructure-grade and explicit, but still requires domain validation before being treated as a production BC1 renormalization prescription

## Verified during implementation

The following were verified during development:

- the backend package files had no editor-reported syntax errors
- `scripts/validate_data.py` had no editor-reported errors after extension
- the CLI path was smoke-tested with a synthetic HEPData-style JSON snapshot
- the smoke test successfully created a local draft review artifact under `.draft-data-prs/`

The temporary smoke-test files were removed after verification.

## Documentation artifacts added

The repository now also includes concrete examples and authoring guidance:

- `backend/examples/hepdata-records.sample.json` for a sample HEPData-style feed payload
- `backend/examples/draft-pr-example.md` for an example draft review artifact
- `backend/examples/hepdata-table.sample.yaml` for a sample HEPData-style table
- `backend/examples/hepdata-multiseries.sample.yaml` for a sample multi-series HEPData-style table
- `docs/adding-model-family-transform.md` for model-family transform authoring guidance
- `.github/PULL_REQUEST_TEMPLATE/bot_data_update.md` for bot-generated PR review checklists

## Dependencies introduced

Backend dependency currently required:

- `pydantic>=2.8,<3.0`

## Intentionally deferred

These items are not missing by accident. They were left for the next implementation phase:

- verified live HEPData polling contract
- automated remote branch publication in a real bot environment
- database storage
- backend API endpoints
- MCP server implementation
- domain-validated renormalization formulas

## Recommended next implementation order

1. Exercise the branch publication and review-request flow against a real remote in a bot environment
2. One real model-family transformation with tests
3. CI integration for bot-generated draft changes
4. API and MCP layers over reviewed canonical data