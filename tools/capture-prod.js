// capture-prod.js  (v2 — resize-safe, crash-proof)
// Authoritative production capture. For each page × viewport, opens a FRESH context
// (viewport set before goto, so we never trigger a resize→reload mid-session), records
// the full network manifest, steps through scroll, and captures reference screenshots.
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const BASE = 'https://landonorris.com';
const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/on-track', '/off-track', '/partnerships', '/calendar', '/legal/privacy-policy', '/legal/terms-conditions'];

const OUT = '../assets-prod';
const SHOT = `${OUT}/screenshots`;
await mkdir(SHOT, { recursive: true });

const VIEWPORTS = [
  { name: 'd', width: 1440, height: 900 },
  { name: 'm', width: 390, height: 844 },
];

const manifest = new Map();
if (existsSync(`${OUT}/network-manifest.json`)) {
  try { for (const e of JSON.parse(await readFile(`${OUT}/network-manifest.json`, 'utf8'))) manifest.set(e.url, e); } catch {}
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'],
});
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function capturePage(path, vp) {
  const url = BASE + path;
  const slug = (path === '/' ? 'home' : path.replace(/^\//, '').replace(/[\/\s]/g, '_'));
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: ua, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleLines = [];
  const navs = [];
  page.on('console', m => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => consoleLines.push(`[pageerror] ${e.message}`));
  page.on('framenavigated', f => { if (f === page.mainFrame()) navs.push(f.url()); });

  page.on('request', (req) => {
    const u = req.url(); if (!u.startsWith('http')) return;
    let e = manifest.get(u);
    if (!e) { e = { url: u, type: req.resourceType(), status: 0, contentType: '', size: 0, pages: [] }; manifest.set(u, e); }
    if (!e.pages.includes(slug)) e.pages.push(slug);
  });
  page.on('response', async (res) => {
    const u = res.url(); const e = manifest.get(u); if (!e) return;
    e.status = res.status();
    try { e.contentType = res.headers()['content-type'] || ''; } catch {}
    try { const buf = await res.body(); if (buf && buf.length) { e.size = Math.max(e.size, buf.length); e.type = res.request().resourceType(); } } catch {}
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) { console.log(`  [${slug}/${vp.name}] goto warn: ${e.message}`); }
  await sleep(2500);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

  // scroll-step using mouse.wheel (robust; survives soft navigations better than evaluate)
  const total = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)).catch(() => vp.height * 6);
  const step = Math.round(vp.height * 0.85);
  let idx = 0;
  for (let y = 0; y <= total + step; y += step) {
    try {
      await page.mouse.move(Math.round(vp.width / 2), Math.round(vp.height / 2));
      await page.mouse.wheel(0, step);
    } catch {}
    await sleep(520);
    try { await page.screenshot({ path: `${SHOT}/${slug}_${vp.name}_${String(idx).padStart(2, '0')}.png` }); } catch {}
    idx++; if (idx > 60) break;
  }
  // back to hero
  try { await page.evaluate(() => window.scrollTo(0, 0)); } catch {}
  await sleep(500);
  try { await page.screenshot({ path: `${SHOT}/${slug}_${vp.name}_hero.png` }); } catch {}
  if (vp.name === 'd') { try { await page.screenshot({ path: `${SHOT}/${slug}_d_full.png`, fullPage: true }); } catch (e) { console.log(`  [${slug}] fullpage warn: ${e.message}`); } }

  if (navs.length > 1 || (navs.length === 1 && navs[0] !== url)) console.log(`  [${slug}/${vp.name}] navigations: ${navs.join(' -> ')}`);
  if (vp.name === 'd') await writeFile(`${OUT}/console-${slug}.log`, consoleLines.slice(-200).join('\n'));
  await context.close();
  console.log(`  done ${slug}/${vp.name} (${idx} steps, manifest ${manifest.size})`);
}

for (const path of PAGES) {
  console.log(`\n=== ${path}`);
  for (const vp of VIEWPORTS) {
    try { await capturePage(path, vp); }
    catch (e) { console.log(`  !! ${path} ${vp.name} failed: ${e.message}`); }
  }
}

await browser.close();
const arr = [...manifest.values()].sort((a, b) => a.url.localeCompare(b.url));
await writeFile(`${OUT}/network-manifest.json`, JSON.stringify(arr, null, 2));
console.log(`\nDONE. ${arr.length} unique URLs in manifest.`);
