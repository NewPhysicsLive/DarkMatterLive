# Draft Ingestion Workflow

This workflow implements the first operational step toward automated source ingestion while preserving expert control through GitHub PRs or GitLab MRs.

## Goal

When new dark-matter-relevant source data is discovered, the system should prepare a review package automatically, but it must not publish directly. Each candidate update should become a reviewable branch and PR or MR.

## Current implementation

The repository now includes a backend CLI command that can consume a HEPData-style JSON feed snapshot and generate a local draft review artifact.

Command:

```powershell
cd backend
python -m pip install -e .
dml-backend draft-hepdata --feed path\to\hepdata-records.json --model-family BC1
```

Result:

- A summary file is written under `.draft-data-prs/`
- A matching JSON manifest is written beside the summary
- The summary contains the review checklist and the discovered source record IDs
- The generated branch name follows the intended bot naming convention

## Local normalization workflow

The backend now also supports a local end-to-end draft path for one source table when you already have a CSV and metadata JSON prepared.

Command:

```powershell
cd backend
python -m pip install -e .
dml-backend draft-local-curve --feed .\examples\hepdata-records.sample.json --record-id ins1234567 --csv .\examples\local-curve.sample.csv --metadata .\examples\local-curve-metadata.sample.json --model-family BC1
```

Result:

- Raw assets are persisted under `.cache/raw-sources/`
- A normalized curve is exported to `data/<model>/`
- A draft markdown summary and JSON manifest are written under `.draft-data-prs/`

This is the first implemented normalization path. It is local-file driven and intended for reviewable development work, not unattended publishing.

## HEPData table workflow

The backend now includes a HEPData table normalizer for local YAML or JSON table files that follow the common `independent_variables` and `dependent_variables` structure.

Command:

```powershell
cd backend
python -m pip install -e .
dml-backend draft-hepdata-table --feed .\examples\hepdata-records.sample.json --record-id ins1234567 --table .\examples\hepdata-table.sample.yaml --metadata .\examples\hepdata-table-metadata.sample.json --model-family BC1 --apply-bc1-gscale --g-reference 1.0 --g-target 2.0 --g-exponent 2.0
```

Result:

- Raw source assets are persisted under `.cache/raw-sources/`
- A HEPData-style table is normalized into a canonical curve payload
- An optional explicit BC1 scaling transform can be applied
- Export artifacts are written to `data/<model>/`
- A draft markdown summary and JSON manifest are written under `.draft-data-prs/`

## Review-request adapters

Draft change-set manifests can now be converted into GitHub PR or GitLab MR request payloads.

Dry-run example:

```powershell
dml-backend open-review-request --manifest ..\.draft-data-prs\bc1-example.json --provider github --repository owner/repo --base-branch main --token-env GITHUB_TOKEN --dry-run
```

This is intended to let you inspect or automate the outgoing review request payload before enabling live submission credentials.

If you also want the backend to prepare the review branch before opening the request, add `--prepare-branch`. In dry-run mode this prints the planned branch name, commit message, and staged export paths without touching git state.

## Multi-series tables

The HEPData table normalizer now supports tables with multiple dependent variables. Use:

```powershell
dml-backend draft-hepdata-table --feed .\examples\hepdata-records.sample.json --record-id ins1234567 --table .\examples\hepdata-multiseries.sample.yaml --metadata .\examples\hepdata-multiseries-metadata.sample.json --model-family BC1 --all-dependent-variables
```

The resulting curves:

- preserve per-series qualifiers in canonical metadata
- collect uncertainty labels found in the source table
- generate distinct curve IDs and labels for each dependent series

## Why this comes before live PR creation

The open question is not the mechanics of opening a PR. It is whether the upstream metadata mapping is stable enough to trust. This draft step makes the record normalisation path testable before wiring GitHub and GitLab credentials into automation.

## Next integration steps

1. Replace the local draft summary writer with a GitHub PR creator.
2. Add a GitLab MR creator with the same change-set payload.
3. Persist fetched raw source assets for each source record.
4. Connect source records to canonical curves and exported `data/<model>/` artifacts.
5. Run `scripts/validate_data.py` in CI for bot-created PRs and human-created PRs alike.
