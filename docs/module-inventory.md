# Module Inventory — landonorris.com (production capture)

> Single source of truth for the **structure & tech stack** of the live site.
> Captured 2026-07-04 from `https://landonorris.com`. The reconstruction must match this.
> Quantified design values live in `docs/design-dna.json`; effect mechanics in `docs/effects/`.

## 1. Tech stack

| Layer | Technology | Evidence |
|---|---|---|
| Host / CMS | **Webflow** | `data-wf-domain`, `data-wf-site="67b5a02dc5d338960b17a7e9"`, `cdn.prod.website-files.com`, Webflow jQuery + shared CSS |
| Design / build agency | **OFF+BRAND** (`itsoffbrand.io`) | custom JS bundles + Rive/GL assets on `assets.itsoffbrand.io/lando/` |
| Motion | **GSAP + ScrollTrigger** | 179 / 22 refs in `offbrand.main.js` |
| Smooth scroll | **Lenis** | 3 refs; `window.landoGL.lenis` |
| Vector animation | **Rive** (runtime + WASM) | 217+ refs; 8 `.riv` files; state-machine-driven buttons/icons/transitions |
| 3D / WebGL | **three.js** | 188 `THREE` refs; `window.landoGL` namespace; GLB models |
| Text split | **GSAP SplitText** | 3 refs (heading reveal animations) |
| Email marketing | Klaviyo | `static.klaviyo.com/onsite/js/klaviyo.js?company_id=XWvzdS` |
| Cookie consent | iubenda | `cdn.iubenda.com/cs/iubenda_cs.js` |

**Stack verdict:** This is a **Webflow-exported static site** augmented with a large (~1.4 MB) custom interaction bundle from OFF+BRAND. Because Webflow renders complete server HTML and ships a single master CSS, the highest-fidelity reconstruction **reuses the real Webflow HTML + CSS + the OFF+BRAND JS bundle**, with assets localized.

## 2. Asset graph

### CDNs / hosts
- `cdn.prod.website-files.com/<siteId>/...` — Webflow: page CSS, JS chunks, uploaded images, fonts
- `assets.itsoffbrand.io/lando/...` — OFF+BRAND: JS bundles, `/rive/*.riv`, `/gl/models/*.glb`, wasm
- `lando.itsoffbrand.io/dev-js/...` — OFF+BRAND dev host (some files 403 in prod; leftover dev `<script>` tags incl. `localhost:6645/app.js`)
- `d3e54v103j8qbb.cloudfront.net` — Webflow jQuery
- `cdn.jsdelivr.net/npm/...` — runtime-loaded npm (Rive wasm / decoder)

### Core code assets (already captured → `assets-prod/`)
| File | Bytes | Role |
|---|---|---|
| `lando.shared.css` | 186 727 | **Master stylesheet = the design system** (`:root` tokens, all components, breakpoints) |
| `offbrand.main.js` | 1 457 237 | Custom interactions: GSAP timeline, Rive wiring, `window.landoGL` THREE renderer |
| `offbrand.transitions-rive.js` | 106 783 | Rive-driven page transitions |
| `lando.schunk.js` | 36 025 | Webflow shared chunk |
| `lando.main.js` | 1 062 | Webflow page bootstrap |
| `fonts/MonaSans-Variable.woff2` | 167 476 | Body/UI variable font (wdth,wght 200–900) |
| `fonts/Brier-Bold.woff2` | 23 588 | Display/headings |
| `rive/{signature,btn-ui,circuits,reef,phrases}.riv` | — | hero icons, buttons, decorative loops |

### Dynamically loaded (discovered in JS; full list confirmed by network capture)
- Rive: `signature.riv`, `btn-ui.riv`, `circuits.riv`, `reef.riv`, `phrases.riv`, **`ln4.riv`**, **`mob-landscape.riv`**, **`page-transition.riv`** (base `https://assets.itsoffbrand.io/lando/rive/`)
- WebGL (`window.landoGL`, base `https://assets.itsoffbrand.io/lando/gl`): `/models/helmet-21.glb`, `/models/disco-02.glb`, `/models/tracks/tracks.glb`; plus `rive.wasm` / `rive_fallback.wasm`, `canvas_advanced.wasm`
- ~380 homepage images + hundreds more across pages (full set via `assets-prod/network-manifest.json`)

## 3. Page-by-page section breakdown

> Section class tokens come from the production `<section class="…">`. The `s` prefix is Webflow's base section class.

### `/` (home) — 12 sections, 133 imgs, 16 rive, 21 canvas
`home-hero` · `home-marquee` · (marquee/CTA) · `is-horizontal-track` · `is-otot-home` · `is-otot-end` · `home-helmets` · (collabs intro) · `is-lando-exe` · `is-home-collabs` · `is-callout-socials` · `is-footer`
- Headings: *Lando Norris · 2025 McLaren Formula 1 Driver · ON TRACK · OFF TRACK · Helmets · Hall of Fame · World Drivers' Champion · partners & campaigns · what's up On Socials · Always bringing the fight.*

### `/on-track` — 12 sections, 149 imgs, 30 rive, 35 canvas
`On Track` hero · bio · `is-horizontal-track` · career · `is-on-t-calendar` · `is-otot-end` · `home-helmets` · `is-callout-socials` · footer
- Headings: *On Track · Since his F1 debut with McLaren in 2019… · f1 career since 2019 · f1 result highlights · pre-f1 career 2007–2019 · upcoming 2025 schedule · Helmets Hall of Fame.*

### `/off-track` — 4 sections, 60 imgs, 9 rive, 13 canvas
`OFFTRACK` hero · `is-horizontal-track` · `is-callout-socials` · footer
- Headings: *OFFTRACK · Since his F1 debut… · Personal Projects · what's up On Socials.*

### `/calendar` — 5 sections, 550 imgs, 13 rive, 18 canvas
`is-calendar-hero` · `is-on-t-calendar` · (results) · (…) · footer
- Headings: *Upcoming 2026 calendar · The Formula 1 season is underway… · Formula 1 All Results.*

### `/partnerships` — ⚠️ returns the site's **"Page Not Found"** 404 page (verify via capture; the homepage links here so the route exists but renders 404 content). 10 imgs, 2 rive.

### `/legal/privacy-policy` & `/legal/terms-conditions` — legal content + footer. 20 imgs, 3 rive, 7 canvas each.

## 4. Effects system (summary — details in `docs/effects/`)

1. **Smooth scroll + scrub** — Lenis drives scroll; GSAP ScrollTrigger scrubs timelines → pinned/horizontal sections (`is-horizontal-track`), marquee, reveal-on-scroll.
2. **Rive interactive layer** — buttons (`btn-ui.riv`, hover/invert state machines), hero icons (`signature`/`circuits`/`reef`/`phrases`/`ln4`), page transitions (`page-transition.riv` via `transitions-rive-isolate.js`).
3. **WebGL `landoGL`** — three.js scene; **scroll-driven 3D helmet** (`helmet-21.glb`, `bounds.helmetScroll`), disco scene (`disco-02.glb`), tracks (`tracks.glb`); fed by Lenis velocity + `reveal` uniform; custom vertex/fragment shaders; `.mov` video texture likely for the "disco" effect.
4. **Text reveals** — SplitText + GSAP on headings.

## 5. External integrations (preserve as no-op / stub in reconstruction)
- Shop: `store.landonorris.com`, `landonorris.store`
- Social: TikTok, Instagram, YouTube, Twitch (link-out only)
- Klaviyo newsletter, iubenda consent banner — include scripts but they are non-visual for fidelity.

## 6. Reconstruction strategy (decision)
**Self-contained static site that reuses the real production code + localized assets.**
- Pages → root `.html` (7 pages).
- `/assets/css/lando.css` (real Webflow CSS, kept whole = design system).
- `/assets/js/` (real bundles: offbrand, transitions-rive, schunk, main, jQuery, Rive runtime).
- `/assets/{fonts,rive,gl,img}/` (localized).
- Node scripts rewrite every asset URL → local path; patch the two OFF+BRAND base constants (`/lando/rive/`, `/lando/gl`) to local.
- Dev server (Vite static / `npx serve`) for local run; Playwright verifies against production reference screenshots.

## 7. Open questions / risks
- `/partnerships` renders a 404 in production — replicate as-is once confirmed.
- WebGL under headless capture uses SwiftShader (software GL); the helmet will render but may differ slightly from GPU — note in verify.
- `localhost:6645/app.js` + `lando.itsoffbrand.io/dev-js/*` are dev artifacts; they 403/fail in prod and should be dropped in the reconstruction.
