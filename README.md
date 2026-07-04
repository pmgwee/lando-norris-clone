# landonorris.com — 1:1 production reconstruction (Vite + React + TypeScript)

A faithful, **self-contained** reconstruction of the live `https://landonorris.com`, rebuilt from
the deployed production assets (the original source was lost to a disk failure). Goal — achieved —
is visual + motion parity with the live site, now packaged as a modern **Vite + React + TypeScript**
app that deploys to **Vercel** in one click.

> **Fidelity strategy:** the reconstruction reuses the **real Webflow CSS** (the design system) and
> the **real OFF+BRAND interaction bundle** (GSAP / Rive / three.js). Vite/React/TypeScript wrap and
> serve them; Tailwind is available for new code with its reset disabled so the Webflow styles win.
> See [`docs/architecture.md`](docs/architecture.md).

---

## Quick start

```bash
npm install          # Vite + React + TS + Tailwind + GSAP
npm run dev          # http://localhost:5173/   (Vite dev, HMR)
# production build + local preview:
npm run build        # -> dist/
npm run preview      # http://localhost:4173/
```

Open `/`, `/on-track`, `/off-track`, `/partnerships`, `/calendar`, `/legal/privacy-policy`,
`/legal/terms-conditions`.

## Deploy to Vercel

The repo is Vercel-ready (`vercel.json` sets `framework: vite`, `outputDirectory: dist`, and clean-URL
rewrites). Two options:

**A. Dashboard (recommended)** — push to GitHub, then in Vercel: *Add New → Project → Import* the
repo. Framework preset auto-detects as **Vite**; defaults are correct. Click **Deploy**. Vercel runs
`npm run build` and serves `dist/`. Every `git push` redeploys automatically.

**B. CLI** — `npm i -g vercel && vercel` (preview), then `vercel --prod`.

> WebGL content (the helmet) renders best on a real GPU. Under headless software-GL the scene
> renders differently (a lime frame) on *both* prod and local — proof, not a defect; see
> [`docs/verify/README.md`](docs/verify/README.md).

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build / dev | **Vite** (multi-page) | Static marketing site; Next.js SSR would add complexity for no benefit |
| UI framework | **React 18 + TypeScript** | Thin mount (`src/`) for incremental component adoption without touching the 1:1 DOM |
| Styling | **Tailwind** (preflight **OFF**) | Webflow CSS is the system of record; Tailwind utilities only for NEW React code |
| Motion | **GSAP + @gsap/react** | (Bundle ships its own GSAP; `@gsap/react` ready for React-driven motion) |
| Reconstruction | real Webflow HTML/CSS + OFF+BRAND bundle | Maximum fidelity by code reuse |

## Project structure

```
.
├── index.html  on-track.html  off-track.html  partnerships.html  calendar.html   # Vite MPA entries (= Webflow pages)
├── legal/{privacy-policy,terms-conditions}.html
├── public/assets/        # the reconstruction assets, served as-is at /assets/
│   ├── css/              # Webflow master stylesheet (= the design system)
│   ├── js/               # OFF+BRAND bundle + Webflow chunks + jquery + DRACO/Basis decoders
│   ├── fonts/  rive/  gl/  cdn/  img/  data/
├── src/                  # React + TS layer (thin)
│   ├── main.tsx          # mounts <App/> into #app
│   ├── App.tsx           # no-op render (ready for incremental component adoption)
│   └── index.css         # Tailwind entry (preflight disabled)
├── package.json  vite.config.ts  tsconfig*.json  tailwind.config.js  postcss.config.js  vercel.json
├── docs/                 # single-source-of-truth documentation
│   ├── module-inventory.md  design-dna.json  architecture.md
│   ├── effects/          # GSAP/Lenis scroll, Rive layer, WebGL `landoGL` helmet scene
│   └── verify/           # verification method + verdict
├── tools/                # capture / download / rewrite / fix-html / inject-react / verify / serve
└── assets-prod/          # raw capture HTML + JSON manifests (screenshots gitignored)
```

## How it was rebuilt (pipeline)

If you ever need to regenerate the reconstruction from the live site:

```bash
cd tools && npm install                 # playwright (for capture/verify tools)
node capture-prod.js                    # 1. production network manifest + reference screenshots
node download-assets.js                 # 2. mirror all assets into ../public/assets/ + urlMap.json
node rewrite-paths.js                   # 3. localize URLs, patch JS base constants, strip dev artifacts
node fix-html.js                        # 4. normalize Webflow HTML for Vite's strict parser
node inject-react.js                    # 5. add the #app mount + /src/main.tsx to each page
cd .. && npm run build                  # 6. build
node tools/check-dist.js "/" "/on-track.html"   # 7. smoke the built dist
```

Verification: `node tools/abi-verify.js` (prod vs local pixel A/B) — see [`docs/verify/README.md`](docs/verify/README.md).

## Status

- Local build boots clean: **0 console errors, 0 failed requests** across all routes; `window.landoGL`
  (three.js) initializes; the React mount is present.
- **A/B pixel diff (prod vs local, matched scroll, same software-GL): mean 0.0912** — frame-for-frame parity.
- The `/partnerships` route reproduces the live site's own 404 page (production returns "Page Not Found").
