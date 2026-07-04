// download-assets.js  (v2 — path-preserving for itsoffbrand GL/Rive tree)
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = '..';
const MANIFEST = `${ROOT}/assets-prod/network-manifest.json`;
const ASSETS = `${ROOT}/site/assets`;
const URLMAP = `${ROOT}/assets-prod/urlMap.json`;
const REPORT = `${ROOT}/assets-prod/download-report.json`;

// ---- decide whether to localize a host ----
const ALLOW_HOSTS = new Set([
  'cdn.prod.website-files.com', 'assets.itsoffbrand.io', 'lando.itsoffbrand.io',
  'd3e54v103j8qbb.cloudfront.net', 'unpkg.com', 'cdn.jsdelivr.net',
]);
const SKIP_HOSTS = new Set([
  'www.google-analytics.com', 'www.googletagmanager.com', 'stats.g.doubleclick.net',
  'www.facebook.com', 'connect.facebook.net', 'static.klaviyo.com',
  'www.iubenda.com', 'cdn.iubenda.com', 'cs.iubenda.com',
  'www.tiktok.com', 'www.instagram.com', 'www.youtube.com', 'www.twitch.tv',
  'store.landonorris.com', 'landonorris.store', 'landonorris.com',
]);

// path-preserving local destination per URL
function pathFor(url) {
  let u; try { u = new URL(url); } catch { return null; }
  const host = u.host;
  const ext = (u.pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/) || [,''])[1];

  // itsoffbrand: preserve tree under /assets/rive or /assets/gl
  if (host === 'assets.itsoffbrand.io' || host === 'lando.itsoffbrand.io') {
    let p = decodeURIComponent(u.pathname); // /lando/rive/X or /gl/X or /rive/X or /dev-js/X
    if (p.startsWith('/lando/rive/')) return '/assets/rive/' + p.slice('/lando/rive/'.length);
    if (p.startsWith('/lando/gl/'))   return '/assets/gl/'   + p.slice('/lando/gl/'.length);
    if (p.startsWith('/rive/'))       return '/assets/rive/' + p.slice('/rive/'.length);
    if (p.startsWith('/gl/'))         return '/assets/gl/'   + p.slice('/gl/'.length);
    if (p.startsWith('/dev-js/')) {       // JS bundles -> /assets/js/ (sanitized basename)
      return '/assets/js/' + p.split('/').pop().replace(/[^\w.\-]+/g, '_');
    }
    // fallback: keep under /assets/data
    return '/assets/data/' + p.split('/').filter(Boolean).join('_');
  }

  // npm CDNs (rive runtime/wasm): preserve path under /assets/cdn/<host>/ so the bundle's
  // constructed base URLs resolve locally after patching.
  if (host === 'unpkg.com') return '/assets/cdn/unpkg' + decodeURIComponent(u.pathname);
  if (host === 'cdn.jsdelivr.net') return '/assets/cdn/jsdelivr' + decodeURIComponent(u.pathname);

  // flat buckets by extension for other hosts
  if (['woff2','woff','ttf','otf','eot'].includes(ext)) return '/assets/fonts/' + basename(u);
  if (ext === 'css') return '/assets/css/' + basename(u);
  if (['js','mjs'].includes(ext)) return '/assets/js/' + basename(u);
  if (['webp','svg','png','jpg','jpeg','gif','avif','ico'].includes(ext)) return '/assets/img/' + basename(u);
  if (ext === 'json') return '/assets/data/' + basename(u);
  return null; // skip unknowns on these hosts
}
function basename(u) {
  let b = decodeURIComponent(u.pathname.split('/').pop() || 'asset');
  return b.replace(/[^\w.\-]+/g, '_');
}

const man = JSON.parse(await readFile(MANIFEST, 'utf8'));
const want = [];
for (const e of man) {
  let host; try { host = new URL(e.url).host; } catch { continue; }
  if (e.status >= 400) continue;
  if (SKIP_HOSTS.has(host) || !ALLOW_HOSTS.has(host)) continue;
  const dest = pathFor(e.url);
  if (!dest) continue;
  want.push({ ...e, dest });
}

const urlMap = {};
const queue = [];
const takenByPath = new Set();
for (const w of want) {
  let dest = w.dest;
  if (takenByPath.has(dest)) continue;     // dup (e.g. same file via two URLs)
  takenByPath.add(dest);
  urlMap[w.url] = dest;
  queue.push({ ...w, dest });
}
console.log(`want: ${want.length}  unique-paths: ${queue.length}`);

for (const q of queue) await mkdir(`${ROOT}/site${q.dest}`.replace(/[/\\][^/\\]+$/, ''), { recursive: true });

const fetchOne = async (q) => {
  const out = `${ROOT}/site${q.dest}`;
  if (existsSync(out)) {
    try { const st = await stat(out); if (st.size > 0) return { url: q.url, dest: q.dest, ok: true, cached: true, bytes: st.size }; } catch {}
  }
  for (let a = 0; a < 4; a++) {
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(q.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', 'Referer': 'https://landonorris.com/' }, signal: ctrl.signal, redirect: 'follow' });
      clearTimeout(to);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(out, buf);
      return { url: q.url, dest: q.dest, ok: true, bytes: buf.length };
    } catch (e) { if (a === 3) return { url: q.url, dest: q.dest, ok: false, error: String(e.message || e) }; await new Promise(r => setTimeout(r, 400 * (a + 1))); }
  }
};

const CONC = 12;
const results = []; let i = 0;
const workers = Array.from({ length: CONC }, async () => {
  while (i < queue.length) { const cur = queue[i++]; const r = await fetchOne(cur); results.push(r); process.stdout.write(r.ok ? '.' : 'x'); }
});
await workers; process.stdout.write('\n');

await writeFile(URLMAP, JSON.stringify(urlMap, null, 2));
const ok = results.filter(r => r.ok), fail = results.filter(r => !r.ok);
const bytes = ok.reduce((a, r) => a + (r.bytes || 0), 0);
await writeFile(REPORT, JSON.stringify({ total: queue.length, ok: ok.length, fail: fail.length, bytes, failures: fail }, null, 2));
console.log(`done: ${ok.length}/${queue.length} ok, ${fail.length} failed, ${(bytes / 1048576).toFixed(1)} MB`);
if (fail.length) console.log(fail.slice(0, 20).map(f => `  ${f.error}  ${f.url}`).join('\n'));
