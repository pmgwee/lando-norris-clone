// rive-diag.js — intercept rive.wasm + .riv requests, report statuses + whether hero Rive canvases paint
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
await new Promise(r => srv.listen(4322, r));

const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const rivReqs = [];
pg.on('requestfinished', async r => {
  const u = r.url();
  if (u.endsWith('.riv') || u.endsWith('.wasm') || u.includes('rive')) {
    let status = '?'; try { status = (await r.response()).status(); } catch {}
    rivReqs.push(`${status}  ${u.replace('http://localhost:4322','')}`);
  }
});
const errs = [];
pg.on('console', m => { const t = m.text(); if (/rive|wasm/i.test(t)) errs.push(`[${m.type()}] ${t.slice(0,200)}`); });
await pg.goto('http://localhost:4322/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 6000));
// inspect hero rive canvases: do they have non-blank pixel content?
const canvasPaint = await pg.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')];
  const out = [];
  for (const c of cs.slice(0, 8)) {
    try { const ctx = c.getContext('2d'); const d = ctx && c.width ? ctx.getImageData(0,0,Math.min(c.width,40),Math.min(c.height,40)).data : null;
      let nonZero = 0; if (d) for (let i=0;i<d.length;i+=4) if (d[i]||d[i+1]||d[i+2]) nonZero++;
      out.push({ w:c.width, h:c.height, nonZeroPct: d ? +(nonZero/(d.length/4)*100).toFixed(1) : null });
    } catch(e){ out.push({err:String(e).slice(0,60)}); }
  }
  return out;
});
console.log('=== rive/wasm requests ===');
[...new Set(rivReqs)].forEach(r => console.log('  ' + r));
console.log('=== rive/wasm console ===');
[...new Set(errs)].slice(0,12).forEach(e => console.log('  ' + e));
console.log('=== first 8 canvases paint state ===');
console.log(JSON.stringify(canvasPaint, null, 0));
await br.close(); srv.close();
