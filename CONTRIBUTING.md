# Contributing

Thank you for contributing to Dark-Matter-Live. This document describes how to add new constraint curves and how to validate your data before opening a Pull Request.

Basic rules
- Only add published results. Include at least one link to the published paper (arXiv, DOI, or official experiment note).
- Add one CSV and one JSON metadata file per curve.
- Keep file names clear and lowercase (use hyphens or underscores).

Folder layout

- `data/<model>/` — each model or model family gets its own folder. Put CSV and JSON pairs there.

File formats

- CSV must be a numeric two-column file with header `x,y`.
- JSON must include at least the following keys:
  - `labelName` (string)
  - `id` (string)
  - `url` (string) — relative path to the CSV file
  - `paperUrls` (array) — at least one URL to the published result

Validation

Run the validator included in `scripts/validate_data.py` before opening a PR. It checks that JSON files parse, required fields exist, the CSV file exists, and the CSV contains a header `x,y` and numeric rows.

Run (PowerShell):

```powershell
python .\scripts\validate_data.py
```

If the validator reports errors, fix them and re-run until there are no errors. The script exits with a non-zero exit code when issues are found so it can be used in CI.

PR template suggestions

- Short description of the curve and the dataset added.
- Link(s) to the publication(s) used.
- Any rescaling performed, with a short explanation and link to code or notes.

If you need help, open an issue and mention the maintainers.
