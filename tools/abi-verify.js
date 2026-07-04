// abi-verify.js — prod vs local A/B: load the real production site AND the built local dist/ in the
// SAME headless browser, scroll both in lock-step, screenshot frame N of each, compute per-frame
// mean-absolute RGB diff. The meaningful fidelity test (same env + same code/assets → low diff).
// Run `npm run build` first. Pairs -> assets-prod/abi/.  Usage: node abi-verify.js
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';
import zlib from 'node:zlib';

const ROOT = '..';
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'assets-prod/abi');
await mkdir(OUT, { recursive: true });
if (!existsSync(DIST)) { console.error('dist/ not found — run `npm run build` first.'); process.exit(1); }
const PROD = 'https://landonorris.com';
const LOCAL = 'http://localhost:4330';

const M = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.riv':'application/octet-stream','.glb':'model/gltf-binary','.ktx2':'image/ktx2','.hdr':'application/octet-stream','.bin':'application/octet-stream','.mov':'video/quicktime','.vert':'text/plain','.frag':'text/plain' };
const srv = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  let fp = normalize(join(DIST, p));
  if (!fp.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (!existsSync(fp)) { const a = fp + '.html'; if (existsSync(a)) fp = a; else { res.statusCode = 404; return res.end('404'); } }
  const b = await readFile(fp); res.setHeader('Content-Type', M[extname(fp).toLowerCase()] || 'application/octet-stream'); res.end(b);
});
await new Promise(r => srv.listen(4330, r));

function decodePNG(buf){let pos=8,w=0,h=0,ctype=0,idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);pos+=4;const type=buf.toString('ascii',pos,pos+4);pos+=4;const data=buf.subarray(pos,pos+len);pos+=len+4;if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);ctype=data[9];}else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;}const raw=zlib.inflateSync(Buffer.concat(idat));const ch=ctype===6?4:ctype===2?3:1;const stride=w*ch;const out=Buffer.alloc(stride*h);let prev=Buffer.alloc(stride);let rp=0;for(let y=0;y<h;y++){const ft=raw[rp++];const line=raw.subarray(rp,rp+stride);rp+=stride;const rec=Buffer.from(line);for(let x=0;x<stride;x++){const a=x>=ch?rec[x-ch]:0;const b=prev[x],c=x>=ch?prev[x-ch]:0;switch(ft){case 0:break;case 1:rec[x]=(rec[x]+a)&255;break;case 2:rec[x]=(rec[x]+b)&255;break;case 3:rec[x]=(rec[x]+((a+b)>>1))&255;break;case 4:{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);rec[x]=(rec[x]+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255;break;}default:break;}}rec.copy(out,y*stride);prev=rec;}const rgba=Buffer.alloc(w*h*4);for(let i=0,j=0;i<w*h*ch;i+=ch,j+=4){if(ch===4){rgba[j]=out[i];rgba[j+1]=out[i+1];rgba[j+2]=out[i+2];rgba[j+3]=out[i+3];}else if(ch===3){rgba[j]=out[i];rgba[j+1]=out[i+1];rgba[j+2]=out[i+2];rgba[j+3]=255;}else{rgba[j]=rgba[j+1]=rgba[j+2]=out[i];rgba[j+3]=255;}}return{w,h,rgba};}
function diffScore(a,b){if(a.w!==b.w||a.h!==b.h)return{score:null,note:`size ${a.w}x${a.h} vs ${b.w}x${b.h}`};let sum=0,n=a.w*a.h;for(let i=0;i<a.rgba.length;i+=4){sum+=Math.abs(a.rgba[i]-b.rgba[i])+Math.abs(a.rgba[i+1]-b.rgba[i+1])+Math.abs(a.rgba[i+2]-b.rgba[i+2]);}return{score:+(sum/(n*3*255)).toFixed(4),note:'meanAbsDiffRGB'};}

const PAGES = [['home','/'],['on-track','/on-track.html'],['off-track','/off-track.html'],['calendar','/calendar.html']];
const VP = { width: 1440, height: 900 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--no-sandbox'] });
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const report = { frames: [] };
for (const [slug, path] of PAGES) {
  const c = await browser.newContext({ viewport: VP, userAgent: ua, deviceScaleFactor: 1 });
  const prodP = await c.newPage(); const locP = await c.newPage();
  await prodP.goto(PROD + (path === '/on-track.html' ? '/on-track' : path === '/off-track.html' ? '/off-track' : path === '/calendar.html' ? '/calendar' : '/'), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log('prod goto', e.message));
  await locP.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('local goto', e.message));
  await sleep(6000);
  const total = await locP.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)).catch(() => VP.height * 8);
  const step = Math.round(VP.height * 0.85);
  let idx = 0;
  for (let y = 0; y <= total; y += step) {
    await prodP.mouse.move(720, 450).catch(()=>{}); await prodP.mouse.wheel(0, step).catch(()=>{});
    await locP.mouse.move(720, 450).catch(()=>{}); await locP.mouse.wheel(0, step).catch(()=>{});
    await sleep(600);
    const pf = join(OUT, `${slug}_prod_${String(idx).padStart(2,'0')}.png`);
    const lf = join(OUT, `${slug}_local_${String(idx).padStart(2,'0')}.png`);
    await prodP.screenshot({ path: pf }).catch(()=>{}); await locP.screenshot({ path: lf }).catch(()=>{});
    let d = null; try { d = diffScore(decodePNG(await readFile(pf)), decodePNG(await readFile(lf))); } catch (e) { d = { score: null, note: e.message.slice(0,50) }; }
    report.frames.push({ page: slug, idx, diff: d.score, note: d.note });
    idx++; if (idx > 18) break;
  }
  console.log(`${slug}: ${idx} frames`); await c.close();
}
await browser.close(); srv.close();
await writeFile(join(ROOT, 'assets-prod/abi-report.json'), JSON.stringify(report, null, 2));
const scored = report.frames.filter(f => typeof f.diff === 'number');
const avg = scored.length ? +(scored.reduce((a,f)=>a+f.diff,0)/scored.length).toFixed(4) : null;
console.log(`\nA/B DONE. frames:${report.frames.length} avgDiff(prod vs local):${avg}`);
console.log('worst 10:'); scored.sort((a,b)=>b.diff-a.diff).slice(0,10).forEach(f=>console.log(`  ${f.diff}  ${f.page}_${String(f.idx).padStart(2,'0')}`));
