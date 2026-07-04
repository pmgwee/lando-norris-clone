// preloader-watch.js — poll whether the preloader overlay dismisses over time (per route)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

const SITE = join(process.cwd(), '..', 'site');
const M = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.riv':'application/octet-stream','.glb':'model/gltf-binary','.ktx2':'image/ktx2','.hdr':'application/octet-stream','.bin':'application/octet-stream','.mov':'video/quicktime','.vert':'text/plain','.frag':'text/plain' };
const srv = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  let fp = normalize(join(SITE, p));
  if (!fp.startsWith(SITE)) { res.statusCode = 403; return res.end(); }
  if (!existsSync(fp)) { const a = fp + '.html'; if (existsSync(a)) fp = a; else { res.statusCode = 404; return res.end('404'); } }
  const b = await readFile(fp); res.setHeader('Content-Type', M[extname(fp).toLowerCase()] || 'application/octet-stream'); res.end(b);
});
await new Promise(r => srv.listen(4325, r));

const route = process.argv[2] || '/on-track';
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
const fails = []; pg.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url().slice(0, 80)); });
await pg.goto('http://localhost:4325' + route, { waitUntil: 'domcontentloaded' });
// sample center-top pixel each second; lime ~ (210,255,0); report RGB + landoGL.reveal
for (let t = 2; t <= 16; t += 2) {
  await new Promise(r => setTimeout(r, 2000));
  const sample = await pg.evaluate(() => {
    const el = document.elementFromPoint(720, 200);
    const bg = el ? getComputedStyle(el).backgroundColor : 'none';
    const tag = el ? (el.tagName + '.' + (el.className || '').toString().slice(0, 30)) : 'none';
    let reveal = null; try { reveal = window.landoGL && window.landoGL.reveal; } catch {}
    return { bg, tag, reveal, scrollY: window.scrollY };
  }).catch(() => null);
  console.log(`t=${t}s  ${JSON.stringify(sample)}`);
}
console.log('4xx/5xx:', [...new Set(fails)].slice(0, 15));
await br.close(); srv.close();
