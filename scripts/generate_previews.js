#!/usr/bin/env node
/*
  generate_previews.js

  Scan the repository's data/ files for URLs, fetch OpenGraph/meta info for each
  URL, and write JSON preview files under data/previews/. Also creates
  data/previews/index.json mapping encodeURIComponent(url) -> filename.

  Usage: node generate_previews.js

  Notes:
  - Requires `open-graph-scraper` in the same folder (scripts/package.json).
  - This script is intended to run in CI (GitHub Actions) or locally.
*/

const fs = require('fs');
const path = require('path');
const ogs = require('open-graph-scraper');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PREVIEWS_DIR = path.join(ROOT, 'data', 'previews');
const INDEX_FILE = path.join(PREVIEWS_DIR, 'index.json');

function walk(dir, extList = ['.json', '.csv', '.txt', '.html']) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results = results.concat(walk(full, extList));
    } else {
      if (extList.includes(path.extname(e.name).toLowerCase())) results.push(full);
    }
  }
  return results;
}

function extractUrls(text) {
  const urls = new Set();
  if (!text) return urls;
  const re = /https?:\/\/[\w\-\.\/~:%\?\#\[\]@!$&'()*+,;=]+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const u = new URL(m[0]);
      urls.add(u.toString());
    } catch (e) {
      // skip invalid
    }
  }
  return urls;
}

function slugForUrl(url) {
  // use encodeURIComponent for deterministic filename, but shorten via hash to keep names reasonable
  const enc = encodeURIComponent(url);
  const h = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  // filename: <first-40chars-of-enc>_<hash>.json
  const safe = enc.slice(0, 40);
  return `${safe}_${h}.json`;
}

async function fetchPreview(url) {
  try {
    const options = { url, timeout: 10000, headers: { 'User-Agent': 'DarkMatterLivePreviewBot/1.0 (+https://darkmatter.web.cern.ch/)' } };
    const { error, result, response } = await ogs(options);
    if (error) {
      // still return something useful
      return { title: result.ogTitle || '', description: result.ogDescription || '', image: result.ogImage ? (Array.isArray(result.ogImage) ? result.ogImage : [result.ogImage]) : [], authors: [], siteName: result.ogSiteName || '', resolvedUrl: (response && response.url) || url };
    }
    const images = [];
    if (result.ogImage) {
      if (Array.isArray(result.ogImage)) result.ogImage.forEach(i => images.push({ url: i.url || i }));
      else if (typeof result.ogImage === 'object' && result.ogImage.url) images.push({ url: result.ogImage.url });
      else images.push({ url: String(result.ogImage) });
    }

    // authors: try article:author or twitter:creator or meta[name=author]
    const authors = [];
    if (result.author) authors.push(result.author);
    if (result.twitterCreator) authors.push(result.twitterCreator);
    if (result['article:author']) authors.push(result['article:author']);

    return {
      title: result.ogTitle || result.title || '',
      description: result.ogDescription || result.description || '',
      image: images,
      authors,
      siteName: result.ogSiteName || '',
      resolvedUrl: (response && response.url) || url
    };
  } catch (err) {
    return { title: '', description: '', image: [], authors: [], siteName: '', resolvedUrl: url, error: String(err) };
  }
}

(async function main() {
  try {
    console.log('Scanning data/ for URLs...');
    const files = walk(DATA_DIR);
    const allUrls = new Set();
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        const urls = extractUrls(content);
        urls.forEach(u => allUrls.add(u));
      } catch (e) {
        // skip unreadable
      }
    }

    console.log('Found', allUrls.size, 'unique URLs');
    if (!fs.existsSync(PREVIEWS_DIR)) fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

    const index = fs.existsSync(INDEX_FILE) ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) : {};

    let changed = false;
    for (const url of allUrls) {
      const key = encodeURIComponent(url);
      if (index[key] && fs.existsSync(path.join(PREVIEWS_DIR, index[key]))) {
        // already have preview
        continue;
      }
      console.log('Fetching preview for', url);
      const meta = await fetchPreview(url);
      const filename = slugForUrl(url);
      fs.writeFileSync(path.join(PREVIEWS_DIR, filename), JSON.stringify(meta, null, 2), 'utf8');
      index[key] = filename;
      changed = true;
      // be kind to hosts
      await new Promise(r => setTimeout(r, 200));
    }

    if (changed) {
      fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
      console.log('Wrote', Object.keys(index).length, 'preview records to', PREVIEWS_DIR);
    } else {
      console.log('No new previews required.');
    }

    // exit success
    process.exit(0);
  } catch (err) {
    console.error('Error generating previews:', err);
    process.exit(2);
  }
})();
