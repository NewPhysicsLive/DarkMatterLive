# Dark-Matter-Live

Dark-Matter-Live is a static website project (hosted at https://darkmatter.web.cern.ch) that provides interactive, dynamic visualisations of unified dark-matter constraints collected from published experimental and observational results.

This repository contains the website pages and the underlying data used to render exclusion/constraint curves. New constraints can be added by submitting a Pull Request (PR) with the required data files and references.

## Repository layout (important folders)

- `pages/` – the static site pages (HTML/CSS/JS) that render the visualisations.
- `data/` – the data used to draw model constraints. Each model or model-family has its own subfolder (for example `data/BC1/`).

Example: `data/BC1/` contains JSON metadata files and CSVs used by the BC1 model pages.

## What this project does

- Loads JSON metadata files and CSV curve data from `data/<model>/`.
- Renders exclusion/constraint curves (lines and filled areas) on interactive plots.
- Provides a single place to compare published constraints across many experiments.

Website preview (static): open `pages/front/front.html` in your browser, or serve the repository locally (see below).

## Data formats

Two file types are used per constraint:

- CSV (curve data): a simple two-column CSV with header `x,y` where `x` and `y` are the coordinates used by the plot. Example (first lines):

```csv
x,y
0.041234367,0.009904085015790202
0.041702887,0.0023137588465525095
...
```

- JSON (metadata): one JSON file per curve that provides how the curve should be rendered, its label, category metadata and links to the source paper. Minimal example:

```json
{
	"labelName": "A1",
	"longName": "A1",
	"id": "a1",
	"line": { "color": "rgba(5, 58, 133, 1)", "width": 2 },
	"area": { "color": "rgba(57, 130, 232, 1)" },
	"paperUrls": ["https://arxiv.org/abs/1404.5502"],
	"url": "../../data/BC1/A1_rescaled.csv",
	"curveType": "excluded",
	"categories": {
		"detectionType": "Direct detection",
		"experimentType": "Collider experiments",
		"timeType": "Past constraints",
		"assumption": "None"
	}
}
```

Notes:
- `url` is a relative path from the page that reads the JSON to the CSV data file.
- `paperUrls` must contain a link to the published result (arXiv, journal DOI, or experiment page).

If you add new fields, keep them backwards compatible with the rendering code in `pages/`.

## Contribution guide — add a new constraint

1. Fork the repository (if you don't have push rights).
2. Create a descriptive branch for your work, e.g. `feature/add-<model>-<short-name>`.
3. Add the CSV and matching JSON metadata file under `data/<model>/`. If the model folder doesn't exist yet, create it.
4. Ensure the CSV has an `x,y` header and contains numeric values only.
5. In the JSON metadata include at least `labelName`, `id`, `paperUrls`, and `url` pointing to the CSV.
6. Only add published results. Provide at least one link in `paperUrls` pointing to the published paper or official experiment note. If the result is on arXiv, include the arXiv URL; if published in a journal, include the DOI or journal link.
7. Create a clear PR description explaining what you added, which paper(s) you used, and any important assumptions or rescalings performed.

Maintainers will review the PR and may request small edits (naming, colours, metadata). Once accepted, your curve will appear on the website.

## Example git commands (PowerShell)

Create a new branch and switch to it:

```powershell
# create and switch to a new branch
git switch -c feature/my-constraint
```

Replace an existing remote URL (overwrite `origin`):

```powershell
git remote set-url origin https://github.com/username/new-repo.git
git remote -v
git push -u origin feature/my-constraint
```

Add a new remote (keep the existing `origin`) and push your branch to that remote:

```powershell
git remote add newremote https://github.com/username/new-repo.git
git remote -v
git push -u newremote feature/my-constraint
```

Quick checklist before opening a PR:
- Commit only the new/changed files needed for the new constraint.
- Include `paperUrls` with the published reference.
- Name JSON and CSV files clearly (prefer lowercase, hyphens or underscores).

## Run locally (simple static server)

If you have Python installed, from the repository root run (PowerShell):

```powershell
python -m http.server 8000
# then open http://localhost:8000/pages/front/front.html
```

Or with Node (if you prefer):

```powershell
npx http-server -p 8000
# then open http://localhost:8000/pages/front/front.html
```

## Validation & tips

- Ensure CSV files are valid numeric CSVs. Small parsing errors will cause the plotting code to fail silently or skip the curve.
- Keep colours accessible (avoid only red/green differences). Use RGBA with alpha for filled areas if possible.
- If you rescale or reinterpret published limits, document the rescaling and assumptions clearly in the PR description and include a link to any code or notes used.

## License & contact

Please see the repository for any licensing information. If you need help or want to discuss a larger contribution, open an issue or contact the maintainers via the repository's issue tracker.

---

Thank you for contributing — every published constraint helps the community build a clearer picture of the allowed dark-matter parameter space.
# Dark-Matter-Live