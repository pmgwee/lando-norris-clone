// rewrite-paths.js
// Localizes the reconstruction:
//  - Rewrites every URL present in assets-prod/urlMap.json to its local /assets/... path,
//    across the 7 HTML pages, the Webflow CSS, and the JS bundles (incl. literals inside JS).
//  - Patches the two OFF+BRAND base-URL constants (rive + gl) to local.
//  - Strips broken dev-artifact <script> tags (lando.itsoffbrand.io/dev-js/* that 403, localhost:6645).
//  - Emits: site/<route>.html, and rewrites in-place under site/assets/{css,js}.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = '..';
const urlMap = JSON.parse(await readFile(`${ROOT}/assets-prod/urlMap.json`, 'utf8'));

// replacements sorted longest-first to avoid partial-substring collisions
const reps = Object.entries(urlMap).sort((a, b) => b[0].length - a[0].length);
function rewrite(str) {
  for (const [url, local] of reps) {
    if (str.includes(url)) str = str.split(url).join(local);
  }
  return str;
}

// Route map: source HTML (in assets-prod) -> output path (in site)
const ROUTES = [
  ['index.html', 'index.html'],
  ['page-on-track.html', 'on-track.html'],
  ['page-off-track.html', 'off-track.html'],
  ['page-partnerships.html', 'partnerships.html'],
  ['page-calendar.html', 'calendar.html'],
  ['page-legal_privacy-policy.html', 'legal/privacy-policy.html'],
  ['page-legal_terms-conditions.html', 'legal/terms-conditions.html'],
];

// Dead/artifact <script> tags to strip (matched by exact src). Keep the WORKING bundle
// (gold-android-fix-03.js) — it is excluded here because we match exact dead URLs.
const STRIP_SRCS = [
  'https://assets.itsoffbrand.io/lando/dev-js/lando-by-OFF+BRAND.js',   // dead in prod (not in manifest)
  'https://assets.itsoffbrand.io/lando/dev-js/transitions-rive-isolate.js', // dead; handled by gold bundle
  'https://lando.itsoffbrand.io/dev-js/lando.OFF+BRAND.js',             // non-gold duplicate
  'http://localhost:6645/app.js',                                       // dev artifact
];
// Strip SRI integrity + crossorigin from <link>/<script>. Required because we modify files
// locally (CSS font paths, JS base URLs), so original SHA digests no longer match and the
// browser blocks the resource. (SRI is meaningless for same-origin local files anyway.)
function stripSRI(html) {
  html = html.replace(/\s+integrity="sha\d{3}-[^"]*"/gi, '');
  html = html.replace(/\s+crossorigin(?:="[^"]*")?/gi, '');
  return html;
}

function stripScripts(html) {
  // GA proxy beacon: opaque /avljl.../ path (tid=G-...). Strip the loader + its inline.
  html = html.replace(/<script[^>]*src="\/avljl[a-zA-Z0-9_\-]+\/[^"]*"[^>]*><\/script>\s*/gi, '');
  html = html.replace(/<script[^>]*async[^>]*src="\/avljl[a-zA-Z0-9_\-]+\/[^"]*"[^>]*><\/script>\s*/gi, '');
  for (const src of STRIP_SRCS) {
    const esc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp('<script[^>]*src="' + esc + '"[^>]*>[\\s\\S]*?</script>\\s*', 'gi'), '');
  }
  return html;
}

// JS base-constant patches (applied to the localized offbrand bundle, by string replacement)
const JS_PATCHES = [
  ['https://lando.itsoffbrand.io/rive/', '/assets/rive/'],   // page-transition.riv base
  ['https://lando.itsoffbrand.io/gl', '/assets/gl'],          // gl models/textures/hdri/decoders base
  ['https://assets.itsoffbrand.io/lando/rive/', '/assets/rive/'],
  ['https://assets.itsoffbrand.io/lando/gl', '/assets/gl'],
  ['https://unpkg.com/', '/assets/cdn/unpkg/'],               // rive runtime wasm base
  ['https://cdn.jsdelivr.net/', '/assets/cdn/jsdelivr/'],     // (fallback) npm base
];

await mkdir(`${ROOT}/site`, { recursive: true });
await mkdir(`${ROOT}/site/legal`, { recursive: true });

let htmlCount = 0;
for (const [src, dest] of ROUTES) {
  const inPath = `${ROOT}/assets-prod/${src}`;
  if (!existsSync(inPath)) { console.log(`skip (missing): ${src}`); continue; }
  let html = await readFile(inPath, 'utf8');
  // strip dead/artifact scripts + SRI (we modify files locally → digests won't match)
  html = stripScripts(html);
  html = stripSRI(html);
  // localize urls
  html = rewrite(html);
  await writeFile(`${ROOT}/site/${dest}`, html);
  htmlCount++;
}
console.log(`wrote ${htmlCount} html pages`);

// CSS
const cssDir = `${ROOT}/site/assets/css`;
if (existsSync(cssDir)) {
  for (const f of await readdir(cssDir)) {
    if (!f.endsWith('.css')) continue;
    const p = `${cssDir}/${f}`;
    let s = await readFile(p, 'utf8');
    const before = s.length;
    s = rewrite(s);
    await writeFile(p, s);
    console.log(`css ${f}: ${before} -> ${s.length}`);
  }
}

// JS (bundles): localize url literals, then patch base constants. Walk ALL .js under site/assets
// (js/, data/, cdn/) so no unpatched bundle copy can run.
async function walkJs(dir, out = []) { for (const e of await readdir(dir, { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) await walkJs(p, out); else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) out.push(p); } return out; }
const jsFiles = existsSync(`${ROOT}/site/assets`) ? await walkJs(`${ROOT}/site/assets`) : [];
for (const p of jsFiles) {
  let s = await readFile(p, 'utf8');
  const before = s.length;
  s = rewrite(s);
  let patched = 0;
  if (/off[_+]?brand/i.test(p) || s.includes('landoGL') || s.includes('itsoffbrand.io/gl') || s.includes('itsoffbrand.io/rive')) {
    for (const [from, to] of JS_PATCHES) {
      if (s.includes(from)) { s = s.split(from).join(to); patched++; }
    }
  }
  if (before !== s.length || patched) { await writeFile(p, s); console.log(`js ${p.replace(ROOT + '/site/assets/', '')}: ${before} -> ${s.length} (patches:${patched})`); }
}

console.log('\nrewrite complete. Verify: open site/index.html via a static server.');
