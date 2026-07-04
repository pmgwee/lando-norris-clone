// trace-overlay.js — find the lime preloader overlay + its visibility control
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
await new Promise(r => srv.listen(4326, r));
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await pg.goto('http://localhost:4326/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 6000));
const chain = await pg.evaluate(() => {
  const out = [];
  let el = [...document.querySelectorAll('*')].find(e => /LOAD NORRIS/i.test(e.textContent || '') && e.children.length === 0 && e.offsetWidth > 0);
  let cur = el;
  for (let i = 0; i < 12 && cur; i++) {
    const cs = getComputedStyle(cur);
    const r = cur.getBoundingClientRect();
    out.push({ tag: cur.tagName, cls: (cur.className || '').toString().slice(0, 50), id: cur.id || '', w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, display: cs.display, opacity: cs.opacity, vis: cs.visibility, z: cs.zIndex, pe: cs.pointerEvents });
    cur = cur.parentElement;
  }
  return out;
});
console.log('=== ancestor chain from "LOAD NORRIS" ===');
chain.forEach((c, i) => console.log(`  [${i}] ${c.tag}#${c.id}.${c.cls}  ${c.w}x${c.h}  bg=${c.bg} disp=${c.display} op=${c.opacity} vis=${c.vis} z=${c.z} pe=${c.pe}`));
await br.close(); srv.close();
