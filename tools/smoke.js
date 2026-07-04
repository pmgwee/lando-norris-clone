// smoke.js — quick load + error dump for the local site
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

const SITE = join(process.cwd(), '..', 'site');
const M = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.riv': 'application/octet-stream',
  '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2', '.hdr': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.mov': 'video/quicktime', '.vert': 'text/plain', '.frag': 'text/plain',
};
const srv = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  let fp = normalize(join(SITE, p));
  if (!fp.startsWith(SITE)) { res.statusCode = 403; return res.end(); }
  if (!existsSync(fp)) { const a = fp + '.html'; if (existsSync(a)) fp = a; else { res.statusCode = 404; return res.end('404 ' + p); } }
  const b = await readFile(fp); res.setHeader('Content-Type', M[extname(fp).toLowerCase()] || 'application/octet-stream'); res.end(b);
});
await new Promise(r => srv.listen(4321, r));

const path = process.argv[2] || '/';
const vp = process.argv[3] === 'm' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist', '--no-sandbox'] });
const pg = await (await br.newContext({ viewport: vp })).newPage();
const fails = [], errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PE:' + e.message));
pg.on('requestfailed', r => fails.push(r.url().slice(0, 95) + ' | ' + (r.failure() && r.failure().errorText)));
await pg.goto('http://localhost:4321' + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 4500));
const bodyText = await pg.evaluate(() => document.body.innerText.slice(0, 300));
const canvasCount = await pg.evaluate(() => document.querySelectorAll('canvas').length);
const landoGL = await pg.evaluate(() => typeof window.landoGL);
console.log(`=== SMOKE: ${path} (${vp.width}x${vp.height}) ===`);
console.log('canvas:', canvasCount, '| window.landoGL:', landoGL);
console.log('bodyText:', JSON.stringify(bodyText.slice(0, 180)));
console.log(`--- requestfailed (${fails.length}) ---`);
[...new Set(fails)].slice(0, 25).forEach(f => console.log('  ' + f));
console.log(`--- console errors (${errs.length}) ---`);
[...new Set(errs)].slice(0, 15).forEach(f => console.log('  ' + f.slice(0, 170)));
await br.close(); srv.close();
