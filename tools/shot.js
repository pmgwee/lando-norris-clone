// shot.js — capture a single viewport screenshot of a local route at a scroll position.
// Usage: node tools/shot.js <route> <vp d|m> <scrollY> <outfile>
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
await new Promise(r => srv.listen(4324, r));
const [route = '/', vp = 'd', scrollY = 0, outfile = 'shot.png', wait = '4000', warmup = '0'] = process.argv.slice(2);
const V = vp === 'm' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: V, deviceScaleFactor: 1 })).newPage();
await pg.goto('http://localhost:4324' + route, { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, +wait));
if (+warmup) {
  // scroll-warmup: nudge down then back, to trigger scroll-revealed WebGL/Rive
  await pg.mouse.move(Math.round(V.width / 2), Math.round(V.height / 2));
  for (let i = 0; i < 6; i++) { await pg.mouse.wheel(0, 600); await new Promise(r => setTimeout(r, 350)); }
  await pg.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1500));
}
await pg.evaluate(y => window.scrollTo(0, y), +scrollY);
await new Promise(r => setTimeout(r, 1500));
await pg.screenshot({ path: join(process.cwd(), '..', 'assets-prod', 'local-screenshots', outfile) });
console.log('captured', route, vp, 'scroll', scrollY, 'warmup', warmup, '->', outfile);
await br.close(); srv.close();
