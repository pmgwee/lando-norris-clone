// fix-html.js — normalize the Webflow HTML so Vite's strict parse5 parser accepts it, without
// altering rendering. Two fixes:
//   1. strip first-party GA-proxy beacon <script>s (opaque token path, varies per page)
//   2. insert missing whitespace between attributes (Webflow exports a few `value"attr=` SVGs)
// Script/style blocks are stashed so their content is never touched.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(process.cwd(), '..');
const PAGES = [
  'index.html', 'on-track.html', 'off-track.html', 'partnerships.html', 'calendar.html',
  'legal/privacy-policy.html', 'legal/terms-conditions.html',
];
const SENT_OPEN = '', SENT_CLOSE = '';

let totalFixes = 0;
for (const p of PAGES) {
  let html;
  try { html = await readFile(join(ROOT, p), 'utf8'); } catch { console.log(`skip (missing): ${p}`); continue; }
  const before = html.length;
  let beaconStripped = 0, attrFixed = 0;

  // 1. strip GA-proxy beacon scripts (any /<longToken>/<longToken> first-party src)
  html = html.replace(/<script[^>]*\ssrc="\/[A-Za-z0-9_-]{20,}\/[A-Za-z0-9_-]{16,}"[^>]*><\/script>\s*/gi,
    () => { beaconStripped++; return ''; });

  // 2. stash <script>/<style> so we don't touch their contents (private-use Unicode sentinels)
  const stash = [];
  html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
    const i = stash.length; stash.push(m); return SENT_OPEN + i + SENT_CLOSE;
  });

  // fix missing whitespace between attributes:  valueChar"attr=  ->  valueChar" attr=
  html = html.replace(/([A-Za-z0-9)])"([a-zA-Z][a-zA-Z-]*=)/g, (m, a, b) => { attrFixed++; return a + '" ' + b; });

  // restore stashed blocks
  html = html.replace(new RegExp(SENT_OPEN + '(\\d+)' + SENT_CLOSE, 'g'), (m, i) => stash[+i]);

  await writeFile(join(ROOT, p), html);
  totalFixes += beaconStripped + attrFixed;
  console.log(`${p}: beacons=${beaconStripped} attrSpaces=${attrFixed} (${before}->${html.length})`);
}
console.log(`\ndone. ${totalFixes} total fixes.`);
