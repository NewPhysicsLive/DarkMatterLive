# Add candidate BC1 data update 20260403-100000

Machine-fetched candidate data prepared for expert review. Do not merge until physics validation and provenance checks are complete.

## Review gates

- source-link-verification
- physics-assumption-review
- numeric-curve-validation
- model-family-signoff

## Source records

- hepdata:ins1234567
- hepdata:ins2345678

This file is an example of the markdown currently produced by the local draft publisher in `backend/src/dml_backend/pipelines/ingestion.py`.

In the current implementation, this markdown is written under `.draft-data-prs/` and acts as a stand-in for the future GitHub PR body or GitLab MR description.

## Expected reviewer actions

- Confirm that each cited source record is relevant to the model family targeted by the draft branch.
- Check that the linked tables correspond to published material and not an unsupported intermediate state.
- Verify any later normalization or renormalization logic before approving publication.
- Reject or request changes if provenance or assumptions are incomplete.
