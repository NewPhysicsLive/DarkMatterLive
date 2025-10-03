Preview metadata generator (build-time)

Overview

This small script crawls the repository's data/ files, extracts URLs, fetches OpenGraph/meta information for each target URL and writes per-URL JSON files to `data/previews/` plus an `index.json` that maps `encodeURIComponent(url)` to the generated filename.

Why use this

- Keeps your deployed site purely static (no runtime preview server).
- Precomputes metadata so tooltips are immediate and work without CORS issues.
- Safe to run in CI (GitHub Actions workflow included) and commits the results to `main`.

How to run locally

Windows / Powershell:

```powershell
cd scripts
npm ci
npm run generate-previews
```

This will write files into `data/previews/`.

CI usage

A GitHub Actions workflow (`.github/workflows/generate-previews.yml`) is included. On pushes and PRs to `main` it will install dependencies, run the generator, and commit/push any changed preview files back to `main`.

Notes and caveats

- The script uses `open-graph-scraper`. Some sites may block scrapers or require JavaScript to render meta tags. If you need fully accurate metadata for such sites, consider adding a headless scraping step (Puppeteer) — this is slower and may require paid runners.

- The generator is conservative about request rate (adds a short delay between requests). If you target many URLs, consider adding exponential backoff and retry handling.

- Avoid storing private or sensitive URLs in `data/`, because preview JSON will include resolved URLs and metadata that will be committed.

- If you add new paper URLs, the workflow will automatically fetch previews for them when it runs.
