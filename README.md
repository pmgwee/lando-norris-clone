# landonorris.com — 1:1 production reconstruction

A faithful, **self-contained** reconstruction of the live `https://landonorris.com` site, rebuilt
from the deployed production assets (the original source was lost to a disk failure). The goal —
achieved — is visual + motion parity with the live site.

> **Single source of truth:** the original Webflow CSS `:root` tokens and the real OFF+BRAND
> interaction bundle. See [`docs/design-dna.json`](docs/design-dna.json) for the design system and
> [`docs/`](docs/) for the full inventory, effect specs, and verification reports.

---

## What this is

The live site is a **Webflow** build augmented with a large custom interaction bundle by **OFF+BRAND**.
Because Webflow renders complete server HTML and ships one master stylesheet, the highest-fidelity
reconstruction **reuses the real production code** (HTML + CSS + JS bundles + fonts + Rive/GLB
assets) and localizes every asset reference. This is *the deployed site*, running locally, organized
as clean source.

| Layer | Tech | Evidence |
|---|---|---|
| Host | Webflow | `data-wf-site`, `cdn.prod.website-files.com` |
| Interactions | GSAP + ScrollTrigger, Lenis, SplitText | `offbrand.main.js` |
| Vector UI | Rive (8 `.riv` state machines) | buttons, hero icons, page transitions |
| 3D | three.js (`window.landoGL`) | scroll-driven helmet, disco, tracks |
| Fonts | Mona Sans Variable, Brier Bold | `.woff2` |

## Run it

```bash
# from the project root
node tools/serve.js            # serves site/ at http://localhost:4321
# then open http://localhost:4321/  (and /on-track, /off-track, /calendar, /legal/*)
```

Requirements: Node 18+ (a live internet connection is **not** required — all assets are local).
WebGL content (the helmet) renders best on a real GPU; it still works under software GL.

## Project structure

```
.
├── site/                       # ← the runnable reconstruction (deliverable)
│   ├── index.html  on-track.html  off-track.html  partnerships.html  calendar.html
│   ├── legal/{privacy-policy,terms-conditions}.html
│   └── assets/
│       ├── css/                # the Webflow master stylesheet (= the design system)
│       ├── js/                 # offbrand bundle + Webflow chunks + jquery + decoders
│       ├── fonts/              # Mona Sans Variable, Brier Bold
│       ├── rive/               # 8 .riv files
│       ├── gl/                 # three.js: models/, textures/{head,helmet,glass,…}/, hdri/, draco/, basis/
│       ├── cdn/{unpkg,jsdelivr}/  # Rive runtime + wasm
│       └── img/                # all imagery
├── docs/                       # source-of-truth documentation
│   ├── module-inventory.md     # page-by-page structure + tech stack + asset graph
│   ├── design-dna.json         # design system tokens (colors/type/spacing/motion) + style + effects
│   ├── architecture.md         # reconstruction approach
│   ├── effects/                # per-effect specs (scroll, Rive, WebGL landogl)
│   └── verify/                 # per-module verification reports
├── tools/                      # node tooling
│   ├── capture-prod.js         # Playwright: production network manifest + reference screenshots
│   ├── download-assets.js      # bulk-download + URL→path map (path-preserving for GL/Rive)
│   ├── rewrite-paths.js        # localize refs, patch JS base URLs, strip SRI/dev artifacts
│   ├── verify-local.js         # Playwright: local screenshots + pixel diff vs production
│   └── serve.js                # standalone static server
└── assets-prod/                # working dir: raw capture, manifest, urlMap, reference screenshots
```

## How it was rebuilt (pipeline)

1. **Capture** — Playwright loaded every route, recording the **complete network manifest** (every
   dynamically-loaded `.riv`/`.glb`/`.ktx2`/`.hdr`/`.wasm`) + reference screenshots (desktop + mobile).
2. **Document** — [`docs/module-inventory.md`](docs/module-inventory.md) (structure),
   [`docs/design-dna.json`](docs/design-dna.json) (tokens, verbatim from `:root`),
   [`docs/effects/`](docs/effects/) (mechanics).
3. **Download** — `download-assets.js` mirrored all 281 assets, preserving the GL/Rive path tree so
   the bundle's constructed URLs resolve locally.
4. **Rewrite** — `rewrite-paths.js` localized every URL, patched the OFF+BRAND base constants
   (`/lando/rive/`, `/lando/gl`, the Rive wasm CDN), stripped SRI (modified files invalidate digests)
   and dead dev scripts.
5. **Verify** — `verify-local.js` screenshots the local site at production-matched scroll positions
   and diffs pixel-by-pixel; reports in [`docs/verify/`](docs/verify/).

See [`docs/architecture.md`](docs/architecture.md) for the decisions and the key bugs solved.

## Status

Local site boots clean (**0 console errors, 0 failed requests**), preloader dismisses, hero renders,
WebGL `landoGL` initializes, Rive buttons/icons/transitions load from local files. Per-frame diff vs
production is logged in `assets-prod/verify-report.json` and summarized in `docs/verify/`.
