# Architecture & reconstruction decisions

## The core decision: reuse the real production code

The live site is **Webflow + a custom OFF+BRAND interaction bundle**. Two facts drove the approach:

1. **Webflow renders complete, server-side HTML** and ships **one master stylesheet** whose `:root`
   block *is* the design system (every color, type size, spacing, radius, breakpoint — verbatim).
2. The interaction bundle is **publicly served** and contains the actual GSAP/Rive/three.js code,
   GLB models, KTX2 textures, and HDRIs.

Re-deriving any of this from screenshots would discard perfect, authoritative source data. So the
reconstruction **reuses the real code** and only localizes asset references. The result is the
deployed site, running locally, organized as clean source — maximum fidelity by construction.

This is preferable to a component-framework rebuild (Next/Vue), which would risk breaking the
delicate GSAP/Rive/`landoGL` wiring for no fidelity gain.

## Asset localization strategy

`download-assets.js` mirrors 281 assets into `site/assets/` with **path-preserving** logic, because
the bundle constructs many URLs by `base + path`:

| Source | Local destination | Why |
|---|---|---|
| `assets.itsoffbrand.io/lando/rive/*` | `/assets/rive/*` | Rive files |
| `lando.itsoffbrand.io/rive/*` | `/assets/rive/*` | page-transition.riv |
| `lando.itsoffbrand.io/gl/**` | `/assets/gl/**` (preserved tree: `models/`, `textures/head/ktx2/`, `hdri/`, `draco/`, `basis/`, `fonts/`) | three.js models/textures/decoders |
| `*.website-files.com` images/fonts/css/js | `/assets/{img,fonts,css,js}/` (flat) | referenced as full literals in HTML/CSS |
| `unpkg.com/**`, `cdn.jsdelivr.net/**` | `/assets/cdn/<host>/**` (preserved) | Rive runtime + wasm |
| `*.cloudfront.net` (jQuery) | `/assets/js/` | |

`rewrite-paths.js` then: (a) replaces every URL via the `urlMap`, (b) patches the bundle's base
constants, (c) strips SRI/dev artifacts.

## JS base-constant patches (the bundle's constructed URLs)
```
https://lando.itsoffbrand.io/rive/   → /assets/rive/
https://lando.itsoffbrand.io/gl      → /assets/gl
https://assets.itsoffbrand.io/lando/rive/ → /assets/rive/      (fallback)
https://assets.itsoffbrand.io/lando/gl    → /assets/gl          (fallback)
https://unpkg.com/                   → /assets/cdn/unpkg/      (Rive wasm base)
https://cdn.jsdelivr.net/            → /assets/cdn/jsdelivr/   (fallback npm base)
```

## Key bugs solved (in order)

1. **Resize → `location.reload()`**: changing the Playwright viewport mid-session triggered the
   site's resize listener and destroyed the execution context. **Fix:** open a fresh context per
   page × viewport (viewport set before navigation).

2. **SRI integrity mismatch**: the rewriter modifies the CSS (font `url()` → local) and JS (base
   patches), so the original `integrity="sha384-…"` digests no longer match → browser blocks the
   file → unstyled page. **Fix:** strip `integrity`/`crossorigin` from all `<link>`/`<script>`.

3. **Rive "file may be corrupt"**: misleading error. Real cause = `rive.wasm` (from
   `unpkg.com/@rive-app/canvas-lite@2.26.4`) was skipped by the first downloader's flat-bucket logic
   (no `.wasm` case). Without the wasm, the runtime can't parse `.riv` → "corrupt".
   **Fix:** preserve npm-CDN paths and patch the wasm base to local.

4. **Stuck lime "LOAD NORRIS" preloader**: a loader counter (`loaded === total` → dismiss) never
   completed because one asset (`page-transition.riv`) 403'd. **Fix:** the root cause was bug #5.

5. **Two copies of the OFF+BRAND bundle**: the downloader's fallback sent the `dev-js` bundle to
   `/assets/data/` (unpatched), while the rewriter only patched `/assets/js/`. The HTML loaded the
   unpatched copy → hardcoded `lando.itsoffbrand.io/rive/` → `page-transition.riv` 403 → preloader
   stuck. **Fix:** route `dev-js/*` → `/assets/js/`, and make the rewriter walk **all** `.js` under
   `site/assets/` so no unpatched bundle can run.

After these fixes: **0 failed requests, 0 console errors**, preloader dismisses, full hero renders.

## What is intentionally left external
Analytics (Google Analytics proxy `/avljl…/`, GA4 id `G-P8L2KTXDN0`), Klaviyo, iubenda consent, and
social link-outs are non-visual third-party services. Their `<script>` tags remain as external refs
(or were stripped if dev artifacts). They do not affect visual/motion fidelity.

## Verification loop
`verify-local.js` serves `site/`, loads each route at production-matched viewports + scroll cadence,
screenshots frame N, and computes the mean-absolute RGB diff against the production reference frame N.
Reports land in `assets-prod/verify-report.json` + `docs/verify/`. Frames that score high are
inspected visually and root-caused (WebGL-under-software-GL differences are the main residual).
