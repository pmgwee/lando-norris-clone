// inject-react.js — insert the React mount point + Vite module entry into each page HTML.
// Idempotent: skips pages that already have id="app". Run after rewrite-paths.js regenerates pages.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(process.cwd(), '..');
const PAGES = [
  'index.html', 'on-track.html', 'off-track.html', 'partnerships.html', 'calendar.html',
  'legal/privacy-policy.html', 'legal/terms-conditions.html',
];

const MOUNT = `
<!-- React mount (Vite entry). Page content + motion are driven by the real Webflow CSS +
     OFF+BRAND bundle; React mounts here for incremental adoption. See src/main.tsx. -->
<div id="app"></div>
<script type="module" src="/src/main.tsx"></script>
`;

let touched = 0;
for (const p of PAGES) {
  const fp = join(ROOT, p);
  let html;
  try { html = await readFile(fp, 'utf8'); } catch { console.log(`skip (missing): ${p}`); continue; }
  if (html.includes('id="app"')) { console.log(`ok (already): ${p}`); continue; }
  if (!html.includes('</body>')) { console.log(`skip (no </body>): ${p}`); continue; }
  html = html.replace('</body>', `${MOUNT}</body>`);
  await writeFile(fp, html);
  touched++;
  console.log(`injected: ${p}`);
}
console.log(`\ndone. injected ${touched} page(s).`);
