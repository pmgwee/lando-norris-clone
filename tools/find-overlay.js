// find-overlay.js — locate the lime full-viewport overlay element + inspect its CSS/animations
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
await new Promise(r => srv.listen(4327, r));
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await pg.goto('http://localhost:4327/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 8000));
const hits = await pg.evaluate(() => {
  const lime = els => els.map(e => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), id: e.id, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, op: cs.opacity, vis: cs.visibility, disp: cs.display, z: cs.zIndex, anim: cs.animationName, trans: cs.transition };
  });
  // elements whose computed bg is lime and cover most of viewport
  const big = [...document.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return /210,\s*255,\s*0|212,\s*255,\s*0|d2ff00/i.test(cs.backgroundColor) && r.width > 800 && r.height > 600; });
  return lime(big).slice(0, 8);
});
console.log('=== lime full-viewport elements ===');
console.log(JSON.stringify(hits, null, 1));
// also: list every element with 'load' or 'preloader' in class/id
const named = await pg.evaluate(() => {
  return [...document.querySelectorAll('[class*="load" i],[class*="preloader" i],[id*="load" i],[class*="intro" i],[class*="curtain" i]')]
    .map(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { cls: (e.className||'').toString().slice(0,60), id: e.id, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, op: cs.opacity, disp: cs.display }; }).slice(0, 20);
});
console.log('=== load/preloader/intro/curtain elements ===');
console.log(JSON.stringify(named, null, 1));
await br.close(); srv.close();
