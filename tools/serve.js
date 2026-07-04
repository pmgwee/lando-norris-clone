// serve.js — standalone static server for the reconstructed site/.
// Usage: node tools/serve.js [port]   (default 4321)
// Handles clean URLs (/on-track -> on-track.html) and all asset MIME types.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve site/ relative to this script (tools/), so it works regardless of cwd.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = +(process.argv[2] || 4321);
const M = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.riv': 'application/octet-stream', '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.hdr': 'application/octet-stream',
  '.mov': 'video/quicktime', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.vert': 'text/plain', '.frag': 'text/plain', '.glsl': 'text/plain',
};

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (p === '/') p = '/index.html';
    let fp = normalize(join(ROOT, p));
    if (!fp.startsWith(ROOT)) { res.statusCode = 403; return res.end('forbidden'); }
    if (!existsSync(fp)) {
      const alt = fp + '.html';
      if (existsSync(alt)) fp = alt;
      else if (existsSync(join(fp, 'index.html'))) fp = join(fp, 'index.html');
      else { res.statusCode = 404; return res.end('not found: ' + p); }
    }
    const buf = await readFile(fp);
    res.setHeader('Content-Type', M[extname(fp).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(buf);
  } catch (e) { res.statusCode = 500; res.end(String(e)); }
});
await new Promise(r => server.listen(PORT, r));
console.log(`Lando reconstruction served at  http://localhost:${PORT}/   (root: ${ROOT})`);
