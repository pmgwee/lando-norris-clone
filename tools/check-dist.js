// check-dist.js — serve dist/ in-process and Playwright-smoke given routes. Self-contained (no
// separate preview server). Usage: node check-dist.js <route> [route...]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

const DIST = join(process.cwd(), '..', 'dist');
const M = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.riv':'application/octet-stream','.glb':'model/gltf-binary','.ktx2':'image/ktx2','.hdr':'application/octet-stream','.bin':'application/octet-stream','.mov':'video/quicktime' };
const srv = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  let fp = normalize(join(DIST, p));
  if (!fp.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (!existsSync(fp)) { const a = fp + '.html'; if (existsSync(a)) fp = a; else { res.statusCode = 404; return res.end('404'); } }
  const b = await readFile(fp); res.setHeader('Content-Type', M[extname(fp).toLowerCase()] || 'application/octet-stream'); res.end(b);
});
await new Promise(r => srv.listen(4399, r));

const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
for (const route of routes) {
  const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const fails = [], errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('PE:' + e.message));
  pg.on('requestfailed', r => fails.push((r.failure() && r.failure().errorText) + ' ' + r.url().slice(0,70)));
  await pg.goto('http://localhost:4399' + route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => errs.push('goto:' + e.message));
  await new Promise(r => setTimeout(r, 5000));
  const landoGL = await pg.evaluate(() => typeof window.landoGL).catch(() => '?');
  const body = await pg.evaluate(() => document.body.innerText.slice(0, 90)).catch(() => '');
  console.log(`${route}  landoGL=${landoGL}  fails=${fails.length}  errs=${errs.length}`);
  if (body) console.log('  text: ' + JSON.stringify(body));
  [...new Set([...fails, ...errs])].slice(0, 6).forEach(e => console.log('   - ' + String(e).slice(0,140)));
  await pg.close();
}
await br.close(); srv.close();
