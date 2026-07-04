// preview-check.js — load a URL (e.g. the vite preview server serving dist/) and report runtime
// health: console errors, failed requests, window.landoGL, hero content. Confirms the built
// artifact behaves like the working static site.
// Usage: node preview-check.js <url> [vp]
import { chromium } from 'playwright';
const [url = 'http://localhost:4173/', vp = 'd'] = process.argv.slice(2);
const V = vp === 'm' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const br = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await (await br.newContext({ viewport: V })).newPage();
const fails = [], errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PE:' + e.message));
pg.on('requestfailed', r => fails.push(r.url().slice(0, 90) + ' | ' + (r.failure() && r.failure().errorText)));
await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => errs.push('goto:' + e.message));
await new Promise(r => setTimeout(r, 5000));
const body = await pg.evaluate(() => document.body.innerText.slice(0, 220)).catch(() => '(no body)');
const landoGL = await pg.evaluate(() => typeof window.landoGL).catch(() => '?');
const reactRoot = await pg.evaluate(() => !!document.getElementById('app')).catch(() => false);
console.log(`=== preview-check: ${url} (${V.width}x${V.height}) ===`);
console.log('window.landoGL:', landoGL, '| #app mount present:', reactRoot);
console.log('bodyText:', JSON.stringify(body));
console.log(`requestfailed (${fails.length}):`); [...new Set(fails)].slice(0, 15).forEach(f => console.log('  ' + f));
console.log(`console errors (${errs.length}):`); [...new Set(errs)].slice(0, 12).forEach(e => console.log('  ' + e.slice(0, 160)));
await br.close();
