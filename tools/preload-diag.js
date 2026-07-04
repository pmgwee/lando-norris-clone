// preload-diag.js — find failing assets + try to dismiss the "LOAD NORRIS" preloader
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
await new Promise(r => srv.listen(4323, r));

const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const failed = [], allStatus = {};
pg.on('response', r => { const u = r.url(); allStatus[u] = r.status(); if (r.status() >= 400) failed.push(r.status() + '  ' + u); });
const errs = [];
pg.on('pageerror', e => errs.push('PE:' + e.message));
await pg.goto('http://localhost:4323/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 4000));

// Is there a visible preloader? Try to find & click "LOAD NORRIS"
const pre = await pg.evaluate(() => {
  const els = [...document.querySelectorAll('*')];
  const hit = els.find(e => /LOAD NORRIS/i.test(e.textContent || '') && e.children.length === 0 && e.getBoundingClientRect().width > 0);
  return hit ? { tag: hit.tagName, cls: hit.className, text: hit.textContent.slice(0,40), rect: JSON.stringify(hit.getBoundingClientRect()) } : null;
});
console.log('=== preloader text node ===', JSON.stringify(pre));

// try clicking it
if (pre) {
  try { await pg.evaluate(() => { const e=[...document.querySelectorAll('*')].find(e=>/LOAD NORRIS/i.test(e.textContent||'')&&e.children.length===0); if(e){e.parentElement?(e.parentElement.click(),1):0; e.click();} }); } catch(e){}
  // also dispatch keydown/pointer events (some preloaders wait for any gesture)
  try { await pg.mouse.move(720, 450); await pg.mouse.click(720, 800); } catch(e){}
  await new Promise(r => setTimeout(r, 3000));
}
// inspect the loader counter state if exposed
const loaderState = await pg.evaluate(() => {
  const out = {};
  for (const k of ['yA','XI','landoLoader','__landoLoader']) { try { if (window[k]) out[k] = JSON.parse(JSON.stringify(window[k])); } catch{} }
  // also try to read from any global with total/loaded
  return out;
}).catch(() => null);
const preloaderVisible = await pg.evaluate(() => {
  const e = document.querySelector('.preloader,[class*="preload"],[class*="loading-screen"]');
  return e ? { display: getComputedStyle(e).display, vis: getComputedStyle(e).visibility, h: e.offsetHeight } : 'no-preloader-element';
});
console.log('=== preloader element visibility ===', JSON.stringify(preloaderVisible));
console.log('=== loader state ===', JSON.stringify(loaderState));
console.log('=== FAILED requests (' + failed.length + ') ===');
[...new Set(failed)].slice(0, 30).forEach(f => console.log('  ' + f));
console.log('=== pageerrors (' + errs.length + ') ===');
[...new Set(errs)].slice(0, 10).forEach(e => console.log('  ' + e.slice(0,150)));
await pg.screenshot({ path: join(process.cwd(), '..', 'assets-prod', 'local-screenshots', 'preload-after-click.png') });
console.log('screenshot: assets-prod/local-screenshots/preload-after-click.png');
await br.close(); srv.close();
