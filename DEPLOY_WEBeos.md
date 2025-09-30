This file documents the minimal steps and files needed to deploy this repository as a WebEOS site.

Summary of required repository contents

- A public index file. This repository includes `index.html` at the repository root which redirects to `pages/front/front.html`.
- Static site content under `pages/` (HTML/CSS/JS assets). This repo already contains `pages/front/front.html` and many other pages.
- Any data files (CSV/JSON) must be included under `data/` and referenced with relative URLs from the pages. This repo already stores those files under `data/`.
- Ensure WebEOS can read the EOS folder; grant access to the `a:wwweos` account (see WebEOS docs).

Files added by this patch

- `index.html` — root entrypoint that redirects to the main front page.
- `404.html` — a friendly not-found page.
- `robots.txt` — allows crawling and references a sitemap (`sitemap.xml` optional).
- `health.html` — a small health-check endpoint.
- `DEPLOY_WEBeos.md` — this file (deployment notes and checklist).

Quick WebEOS deployment checklist (from https://webeos.docs.cern.ch/create_site/):

1. Choose site name and category in the Web Services Portal.
2. Copy the repository contents to an EOS path. Recommended path examples:
   - Official/project sites: `/eos/project/<initial>/<projectname>/www`
   - Personal sites: `/eos/user/<initial>/<username>/www`

3. Grant read/execute permission on the EOS folder to `a:wwweos` (Viewer) using CERNBox or EOS ACLs (`u:wwweos:rx`).
4. In the Web Services Portal, fill the "Create Site" form and specify the EOS path that contains the `index.html` file (the path to the directory which contains the index file).
5. Wait for DNS propagation (a few minutes) and test the site.

Notes and recommendations

- Ensure all resource URLs used by pages are relative (no absolute filesystem paths). The `pages/front/front.html` uses relative references.
- If you rely on external fonts/CDN, confirm WebEOS policy allows them. Consider bundling critical fonts if needed.
- Provide a `sitemap.xml` in the root if you want search engines to index pages.

CI / Automation

If you want to automate copying the repo to EOS from CI (GitHub Actions, GitLab CI), the WebEoS docs provide examples and you can run a script on a machine with CERN access (e.g. lxplus) to rsync the files to EOS or use `gfal-copy`.

For more details see: https://webeos.docs.cern.ch/create_site/
