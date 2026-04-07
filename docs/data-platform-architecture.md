# Data Platform Architecture

This document defines the first three implementation tracks for Dark-Matter-Live's next phase:

1. Canonical schema
2. Ingestion and provenance workflow
3. Deterministic renormalisation pipeline

The governing rule is that machine-fetched data never bypasses expert review. Every candidate data addition must land as a GitHub PR or GitLab MR and be approved manually before publication.

## 1. Canonical schema

The current repository is already a valid static publish target. The new backend layer should treat it as an export format, not the primary source of truth.

Primary entities:

- Publication reference: title, collaboration, arXiv, DOI, journal, publication date, URLs.
- Source record: upstream system, source record ID, version, fetch time, checksum, landing page, raw assets.
- Curve payload: canonical observable, axis definitions, units, points, categories, assumptions, source links.
- Transformation record: deterministic method, formula reference, code version, parameters, assumptions.
- Review record: status, reviewer, sign-off notes, required checks.
- Export artifact: generated JSON and CSV files published to `data/<model>/`.

Design requirements:

- Raw source assets must be retained unchanged.
- Every transformed curve must cite its input curve IDs and transformation method.
- Review status must be tracked independently from export generation.
- Generated artifacts must remain compatible with the current frontend contract.

## 2. Ingestion and provenance workflow

The ingestion system is not a direct publisher. It is a draft generator for reviewable changes.

Workflow:

1. Poll an upstream source such as HEPData.
2. Detect new or updated records relevant to dark matter.
3. Download raw metadata and machine-readable tables.
4. Normalise them into the canonical schema.
5. Generate site artifacts in a draft branch.
6. Open a PR or MR with a machine-written summary and review checklist.
7. Require expert approval before merge.

Required review gates:

- Source link verification.
- Validation that the result matches the intended model family and observable.
- Numeric sanity checks on the generated curve.
- Review of all rescaling or renormalisation assumptions.
- Sign-off by a domain expert before publication.

Repository implications:

- `main` remains the publish branch.
- Bot-created branches should use a predictable prefix such as `bot/<model>/<timestamp>`.
- Draft summaries should be generated from canonical records, not handwritten.
- Existing validation should run in CI for every PR or MR.

## 3. Deterministic renormalisation pipeline

Physics transformations must be deterministic, versioned, and reviewable.

Rules:

- AI may suggest mappings or identify candidate source material.
- AI must not invent numerical data or apply hidden formulas.
- Every renormalisation method must be implemented as explicit code.
- Every output curve must record the exact code version and parameters used.

Implementation structure:

- One transformation module per supported model family.
- A shared transformation context carrying method name, parameters, assumptions, and formula reference.
- Regression tests using known source curves and expected outputs.
- Export only after transformation outputs pass both automated checks and expert review.

## Initial folder layout

The backend scaffold introduced alongside this document uses:

- `backend/src/dml_backend/domain/` for canonical types.
- `backend/src/dml_backend/pipelines/` for ingestion and review workflow code.
- `backend/src/dml_backend/pipelines/transforms/` for deterministic model-specific transforms.
- `backend/src/dml_backend/export/` for generating the repository's existing JSON and CSV artifacts.

## Immediate next tasks

1. Add stricter validation for generated JSON metadata and provenance fields.
2. Implement a HEPData connector that stores raw assets and produces draft change sets.
3. Add a PR creation adapter for GitHub and a parallel MR adapter for GitLab.
4. Define the first model-family transformation mathematically and encode it as tested code.
5. Add CI so bot-created draft PRs run the same validation as manual submissions.
