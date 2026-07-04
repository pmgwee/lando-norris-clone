// prod-shot.js — screenshot the REAL production site under the same headless SwiftShader flags,
// to A/B against the local reconstruction. Usage: node prod-shot.js <url> <outfile>
import { chromium } from 'playwright';
import { join } from 'node:path';
const [url = 'https://landonorris.com/', outfile = 'prod-abi.png'] = process.argv.slice(2);
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e.message).slice(0,120)));
pg.on('requestfailed', r => errs.push('FAIL ' + r.url().slice(0,70)));
await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise(r => setTimeout(r, 8000));
await pg.screenshot({ path: join(process.cwd(), '..', 'assets-prod', 'local-screenshots', outfile) });
console.log('captured PROD', url, '->', outfile, 'errors:', [...new Set(errs)].slice(0,5));
await br.close();
