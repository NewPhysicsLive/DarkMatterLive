# Dark-Matter-Live Backend Scaffold

This folder contains the first implemented backend layer for Dark-Matter-Live's automated ingestion and review workflow. It is not yet a complete data platform, but it now defines the core code boundaries that later HEPData polling, PR creation, transformation logic, and MCP tooling will build on.

## What is implemented

- Canonical domain models for publications, source records, curves, transformations, reviews, export artifacts, and draft change sets.
- A backend Python package with a CLI entry point.
- A tolerant HEPData-style JSON connector that can read local feed snapshots or HTTP(S) JSON endpoints.
- A draft change-set generator that writes review summaries under `.draft-data-prs/`.
- A static-site exporter that emits CSV and JSON artifacts compatible with the current `data/<model>/` layout.
- Deterministic transformation base classes and a BC1 placeholder transform module.

## What is not implemented yet

- Live HEPData polling against a verified production feed contract.
- Raw asset persistence to a durable storage layer.
- Automatic GitHub PR or GitLab MR creation without operator-supplied credentials.
- Canonical normalization from source tables into approved curve payloads.
- Domain-validated production renormalization formulas.
- Database persistence and API endpoints.

## Package layout

- `src/dml_backend/domain/` contains canonical data models.
- `src/dml_backend/pipelines/` contains ingestion and review workflow code.
- `src/dml_backend/pipelines/connectors/` contains source-specific connector implementations.
- `src/dml_backend/pipelines/transforms/` contains deterministic model-family transforms.
- `src/dml_backend/export/` contains exporters back into the existing static-site data format.

## Implemented modules

### Canonical schema

The canonical schema is defined in `src/dml_backend/domain/models.py`.

Implemented entities:

- `PublicationReference`
- `SourceRecord`
- `CurvePayload`
- `TransformationRecord`
- `ReviewRecord`
- `ExportArtifact`
- `DraftChangeSet`

These types are intentionally stricter than the current `data/<model>/` JSON files. They are meant to become the backend source of truth, while the website JSON and CSV files remain export artifacts.

### Ingestion workflow

The current ingestion workflow lives in `src/dml_backend/pipelines/ingestion.py`.

Implemented pieces:

- `SourceConnector`: abstract source interface.
- `ChangeSetFactory`: creates review-gated draft change sets.
- `PullRequestPublisher`: currently writes a local summary file instead of opening a real PR or MR.

The publisher's output is a deliberate intermediate step. It proves the change-set contract before repository credentials and forge-specific APIs are wired in.

### HEPData-style connector

The connector in `src/dml_backend/pipelines/connectors/hepdata.py` accepts:

- a local JSON file path, or
- an HTTP(S) URL returning JSON

Accepted feed shapes:

- a top-level list of records
- an object with a `records` array

Supported record fields:

- `id` or `record_id`
- `version` or `record_version`
- `updated_at`, `last_updated`, or `modified`
- `url`, `landing_page`, or `record_url`
- `checksum` or `sha256`
- `assets` as either strings or objects containing `path`, `url`, or `download_url`

The connector currently produces `SourceRecord` objects only. It does not interpret remote HEPData tables by itself, but the backend now includes a HEPData table normalizer for local YAML or JSON table files, including multi-series tables with qualifier and uncertainty-label extraction.

Raw asset persistence is now available separately through the local draft workflow. Persisted raw files are written under `.cache/raw-sources/<source>/<record-id>/` together with a manifest.

### Transform scaffold

The deterministic transform framework is in `src/dml_backend/pipelines/transforms/base.py`.

Implemented pieces:

- `TransformationContext`
- `TransformationResult`
- `DeterministicTransform`

The BC1 transform in `src/dml_backend/pipelines/transforms/bc1.py` is only a placeholder. It demonstrates how a model-family-specific transform should return both a transformed curve and a transformation provenance record, but it does not yet apply any real renormalization formula.

### Static export scaffold

The exporter in `src/dml_backend/export/site.py` writes:

- a `x,y` CSV file
- a matching JSON metadata file

The exported JSON remains compatible with the current frontend contract and now also includes generated-data metadata fields:

- `generated`
- `origin`
- `observable`
- `assumptions`
- `publication`
- `provenance`
- `review`

These additional fields are intended to support traceability without breaking existing rendering code.

## CLI

The backend package exposes a console command through `pyproject.toml`:

```powershell
dml-backend
```

Currently implemented subcommand:

```powershell
dml-backend draft-hepdata --feed <path-or-url> --model-family BC1
```

Additional subcommand:

```powershell
dml-backend draft-local-curve --feed <path-or-url> --record-id <source-record-id> --csv <local-csv> --metadata <metadata-json> --model-family BC1
```

HEPData table subcommand:

```powershell
dml-backend draft-hepdata-table --feed <path-or-url> --record-id <source-record-id> --table <hepdata-table.yaml> --metadata <metadata-json> --model-family BC1
```

Review-request subcommand:

```powershell
dml-backend open-review-request --manifest <draft-json> --provider github --repository owner/repo --base-branch main --token-env GITHUB_TOKEN --dry-run
```

Branch publication can be chained into the review-request path:

```powershell
dml-backend open-review-request --manifest <draft-json> --provider github --repository owner/repo --base-branch main --token-env GITHUB_TOKEN --prepare-branch --push-remote origin --dry-run
```

Optional arguments:

- `--repo-root` to override the repository root used for `.draft-data-prs/`
- `--since` to ignore records older than an ISO-8601 timestamp

### Example usage

```powershell
cd backend
python -m pip install -e .
dml-backend draft-hepdata --feed .\sample-feed.json --model-family BC1
```

Expected result:

- a markdown summary is created under `.draft-data-prs/`
- the summary includes review gates and discovered source record IDs
- a branch naming suggestion is printed using the `bot/<model>/<timestamp>` pattern

Example input and output files are included in:

- `examples/hepdata-records.sample.json`
- `examples/draft-pr-example.md`
- `examples/local-curve.sample.csv`
- `examples/local-curve-metadata.sample.json`
- `examples/hepdata-table.sample.yaml`
- `examples/hepdata-table-metadata.sample.json`
- `examples/hepdata-multiseries.sample.yaml`
- `examples/hepdata-multiseries-metadata.sample.json`

### End-to-end local draft example

```powershell
cd backend
python -m pip install -e .
dml-backend draft-local-curve --feed .\examples\hepdata-records.sample.json --record-id ins1234567 --csv .\examples\local-curve.sample.csv --metadata .\examples\local-curve-metadata.sample.json --model-family BC1
```

Expected result:

- raw source assets are persisted under `.cache/raw-sources/`
- a normalized curve is exported into `data/BC1/`
- a markdown summary and JSON manifest are written under `.draft-data-prs/`

## Validator changes in the main repository

The repository validator at `../scripts/validate_data.py` now distinguishes between manually curated JSON and generated JSON.

For all JSON files it still validates:

- JSON parsing
- presence of `labelName`, `id`, `url`, `paperUrls`
- referenced CSV existence
- `x,y` numeric CSV structure

For generated JSON files with `"generated": true`, it now also validates:

- `origin`
- `observable`
- `assumptions`
- `provenance`
- `review`

And checks parts of the generated metadata structure, including:

- `provenance.sourceSystem`
- `provenance.sourceRecordId`
- ISO-8601 shape for `provenance.fetchedAt`
- `review.status` membership in the allowed review-state set

## Current workflow boundary

The implemented workflow is:

1. Read a HEPData-style feed snapshot.
2. Convert each record into a canonical `SourceRecord`.
3. Build a draft change set with mandatory review gates.
4. Materialize a local review summary.

The workflow intentionally stops there. It does not yet infer curves, write site artifacts automatically from source data, or open a PR or MR.

The local draft normalization workflow extends this path by taking a local CSV and metadata JSON, persisting the raw assets, producing one canonical `CurvePayload`, exporting it into the site's data format, and then writing a draft review bundle.

The HEPData table workflow does the same for a local HEPData-style YAML or JSON table file and can optionally apply the explicit BC1 coupling scaling transform before export. It can also normalize all dependent series in a multi-series table.

## Review-request adapters

Forge adapters now live in `src/dml_backend/forge/review_requests.py`.

Implemented support:

- GitHub pull request payload creation
- GitLab merge request payload creation
- dry-run payload inspection from a generated draft JSON manifest
- optional git branch preparation and commit planning before review request creation

These adapters can submit real API requests when supplied with credentials through environment variables, but they have only been exercised in dry-run mode inside this repository. Branch publication defaults to a conservative safety model and refuses to run in a dirty worktree unless `--allow-dirty` is passed explicitly.

## Transform status

The transform layer now contains two BC1 modules:

- `BC1RenormalizationTransform`, which remains a placeholder shape-preserving stub
- `BC1CouplingScaleTransform`, which applies the explicit scaling law `y' = y * (g_target / g_reference) ** exponent`

The coupling-scale transform is fully deterministic and regression-tested. It is suitable for backend infrastructure development, but still requires domain approval before being treated as a production BC1 physics transform.

## Tests

Regression tests are now included under `tests/` and currently cover:

- HEPData table normalization
- multi-series HEPData normalization with qualifier and uncertainty-label extraction
- GitHub and GitLab review-request payload generation
- git branch publication dry-run behavior
- BC1 coupling-scale transformation

Run them with:

```powershell
cd backend
python -m unittest discover -s tests
```

## Installation notes

The backend currently depends on:

- `pydantic>=2.8,<3.0`

If the workspace environment does not already contain that dependency, install the backend in editable mode from the `backend/` directory.

## Recommended next implementation tasks

1. Exercise non-dry-run branch publication and forge submission in a dedicated bot environment.
2. Replace the BC1 placeholder transform with a domain-validated physics transformation.
3. Extend the canonical schema if uncertainty magnitudes, not just labels, need to survive normalization.
4. Add CI coverage for bot-generated draft changes.
5. Add API and MCP layers on top of the reviewed canonical data pipeline.

## Related documentation

- `../docs/data-platform-architecture.md`
- `../docs/draft-ingestion-workflow.md`
- `../docs/implementation-status.md`
- `../docs/adding-model-family-transform.md`
