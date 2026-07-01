addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

/**
 * Simple Cloudflare Worker to fetch a target URL server-side, extract
 * common OpenGraph / meta tags and return JSON for the frontend preview.
 *
 * Security: by default this script is conservative. Edit `ALLOW_ANY_HOST`
 * or `ALLOWED_HOSTS` below to match your needs. You should avoid exposing
 * an open proxy to arbitrary hosts in public.
 */

const ALLOW_ANY_HOST = false; // set to true to allow any hostname (NOT recommended)
const ALLOWED_HOSTS = [
  'arxiv.org',
  'inspirehep.net',
  'doi.org',
  'nature.com',
  'sciencedirect.com',
  'biorxiv.org',
  'phys.org',
  'github.com'
];

async function handle(request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) {
      return jsonResponse({ error: 'missing url param' }, 400);
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch (e) {
      return jsonResponse({ error: 'invalid url' }, 400);
    }

    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (!ALLOW_ANY_HOST && !ALLOWED_HOSTS.includes(hostname)) {
      return jsonResponse({ error: 'host not allowed' }, 403);
    }

    // Fetch the target page server-side (follow redirects). Use a reasonable timeout.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let resp;
    try {
      resp = await fetch(parsed.toString(), { redirect: 'follow', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const text = await resp.text();

    const meta = parseMeta(text);
    // provide the original URL too (after redirects the response URL may differ)
    meta.resolvedUrl = resp.url || parsed.toString();

    return new Response(JSON.stringify(meta), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function parseMeta(html) {
  const out = { title: '', description: '', image: [], authors: [], siteName: '' };

  // title (og:title or <title>)
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitle) out.title = ogTitle[1].trim();
  else {
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleTag) out.title = titleTag[1].trim();
  }

  // description
  const desc = html.match(/<meta\s+(?:property|name)=["'](?:og:description|description)["']\s+content=["']([^"']+)["']/i);
  if (desc) out.description = desc[1].trim();

  // site_name
  const site = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
  if (site) out.siteName = site[1].trim();

  // image (first og:image)
  const image = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (image) out.image.push({ url: image[1].trim() });

  // authors (meta name="author" or article:author)
  const authorMatches = Array.from(html.matchAll(/<meta\s+(?:name|property)=["'](?:author|article:author)["']\s+content=["']([^"']+)["']/ig));
  authorMatches.forEach(m => { if (m[1]) out.authors.push(m[1].trim()); });

  return out;
}
