// verify-local.js
// Serves the BUILT dist/ (run `npm run build` first), loads each page in headless Chromium (same viewports/scroll cadence as
// capture-prod.js), captures local screenshots + console errors, and diffs each local frame
// against the matching production reference (mean abs pixel diff via raw RGBA). Writes:
//   assets-prod/local-screenshots/<page>_<vp>_<n>.png
//   assets-prod/verify-report.json   (per-frame diff score + console errors)
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';
import zlib from 'node:zlib';

const ROOT = '..';
const SITE = join(ROOT, 'dist');
const REF = join(ROOT, 'assets-prod/screenshots');        // production reference
const OUT = join(ROOT, 'assets-prod/local-screenshots');
await mkdir(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.riv': 'application/octet-stream', '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.hdr': 'application/octet-stream',
  '.mov': 'video/quicktime', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vert': 'text/plain',
  '.frag': 'text/plain', '.glsl': 'text/plain', '.txt': 'text/plain',
};

// tiny static server w/ clean-URL + dir-index support
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (p === '/') p = '/index.html';
    let fp = normalize(join(SITE, p));
    if (!fp.startsWith(SITE)) { res.statusCode = 403; return res.end('forbidden'); }
    if (!existsSync(fp)) {
      // try clean URL → .html
      const alt = fp + '.html';
      if (existsSync(alt)) fp = alt;
      else if (existsSync(join(fp, 'index.html'))) fp = join(fp, 'index.html');
      else { res.statusCode = 404; return res.end('not found: ' + p); }
    }
    const buf = await readFile(fp);
    res.setHeader('Content-Type', MIME[extname(fp).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(buf);
  } catch (e) { res.statusCode = 500; res.end(String(e)); }
});
await new Promise(r => server.listen(4321, r));
const LOCAL = 'http://localhost:4321';

const PAGES = [
  ['home', '/'], ['on-track', '/on-track'], ['off-track', '/off-track'],
  ['partnerships', '/partnerships'], ['calendar', '/calendar'],
  ['privacy', '/legal/privacy-policy'], ['terms', '/legal/terms-conditions'],
];
const VIEWPORTS = [{ name: 'd', width: 1440, height: 900 }, { name: 'm', width: 390, height: 844 }];

// PNG decode (unfilters + extracts raw RGBA8) — minimal, handles the Playwright screenshots (8-bit RGBA, color-type 6)
function decodePNG(buf) {
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4;
    const type = buf.toString('ascii', pos, pos + 4); pos += 4;
    const data = buf.subarray(pos, pos + len); pos += len + 4;
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 4 ? 2 : 1;
  const bpp = ch;
  const stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[rp++];
    const line = raw.subarray(rp, rp + stride); rp += stride;
    const rec = Buffer.from(line);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? rec[x - bpp] : 0;
      const b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      switch (ft) { case 0: break; case 1: rec[x] = (rec[x] + a) & 255; break; case 2: rec[x] = (rec[x] + b) & 255; break; case 3: rec[x] = (rec[x] + ((a + b) >> 1)) & 255; break; case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); rec[x] = (rec[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; break; } default: break; }
    }
    rec.copy(out, y * stride); prev = rec;
  }
  // normalize to RGBA8
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h * bpp; i += bpp, j += 4) {
    if (ch === 4) { rgba[j] = out[i]; rgba[j+1] = out[i+1]; rgba[j+2] = out[i+2]; rgba[j+3] = out[i+3]; }
    else if (ch === 3) { rgba[j] = out[i]; rgba[j+1] = out[i+1]; rgba[j+2] = out[i+2]; rgba[j+3] = 255; }
    else { rgba[j] = rgba[j+1] = rgba[j+2] = out[i]; rgba[j+3] = 255; }
  }
  return { w, h, rgba };
}
function diffScore(a, b) {
  if (a.w !== b.w || a.h !== b.h) { // resize-compare by scaling not done; report size mismatch
    return { score: null, note: `size ${a.w}x${a.h} vs ${b.w}x${b.h}` };
  }
  let sum = 0, n = a.w * a.h;
  for (let i = 0; i < a.rgba.length; i += 4) {
    sum += Math.abs(a.rgba[i]-b.rgba[i]) + Math.abs(a.rgba[i+1]-b.rgba[i+1]) + Math.abs(a.rgba[i+2]-b.rgba[i+2]);
  }
  return { score: +(sum / (n * 3 * 255)).toFixed(4), note: 'meanAbsDiffRGB' };
}

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { frames: [], consoleErrors: {} };

for (const [slug, path] of PAGES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', r => errs.push('FAIL ' + r.url() + ' ' + (r.failure()?.errorText || '')));
    try { await page.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) { errs.push('goto: ' + e.message); }
    await sleep(3000);
    // Mirror capture-prod.js scroll cadence exactly so local frame N aligns with prod frame N.
    const total = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)).catch(() => vp.height * 8);
    const step = Math.round(vp.height * 0.85);
    let idx = 0;
    for (let y = 0; y <= total; y += step) {
      const refFile = join(REF, `${slug}_${vp.name}_${String(idx).padStart(2,'0')}.png`);
      const outF = join(OUT, `${slug}_${vp.name}_${String(idx).padStart(2,'0')}.png`);
      try { await page.mouse.move(Math.round(vp.width / 2), Math.round(vp.height / 2)); await page.mouse.wheel(0, step); } catch {}
      await sleep(520);
      try { await page.screenshot({ path: outF }); } catch {}
      let d = null;
      if (existsSync(refFile)) { try { d = diffScore(decodePNG(await readFile(outF)), decodePNG(await readFile(refFile))); } catch (e) { d = { score: null, note: 'decode-err ' + e.message }; } }
      if (d) report.frames.push({ page: slug, vp: vp.name, idx, diff: d.score, note: d.note });
      idx++; if (idx > 60) break;
    }
    report.consoleErrors[`${slug}/${vp.name}`] = [...new Set(errs)].slice(0, 25);
    await ctx.close();
    console.log(`  ${slug}/${vp.name}: ${idx} frames`);
  }
}

await browser.close();
server.close();
await writeFile(join(ROOT, 'assets-prod/verify-report.json'), JSON.stringify(report, null, 2));
const scored = report.frames.filter(f => typeof f.diff === 'number');
const avg = scored.length ? +(scored.reduce((a,f)=>a+f.diff,0)/scored.length).toFixed(4) : null;
console.log(`\nVERIFY DONE. frames:${report.frames.length} scored:${scored.length} avgDiff:${avg}`);
console.log('worst 12 frames:');
scored.sort((a,b)=>b.diff-a.diff).slice(0,12).forEach(f=>console.log(`  ${f.diff}  ${f.page}/${f.vp}_${String(f.idx).padStart(2,'0')}`));
