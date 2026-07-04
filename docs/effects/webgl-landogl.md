# Effect — WebGL `landoGL` (three.js helmet scene)

> The most complex effect on the site. This doc is the spec; the reconstruction **reuses the
> real `offbrand.main.js` bundle + the real `.glb` models**, so fidelity is guaranteed by code reuse.
> Source: `assets-prod/offbrand.main.js` (lines ~5635–5650), `assets-prod/design-dna.json`.

## What it is
A custom **three.js** scene (`window.landoGL`) that renders a **scroll-driven 3D helmet** as a
**lime wireframe/distorted outline** on the light hero background, with **cursor interaction**.
Desktop-only (`window.innerWidth > 991`). On scroll, the helmet is *revealed* (not always visible).

## Runtime surface (verbatim from JS)
```js
window.landoGL = {
  reveal: 1,                                   // 0..1 reveal progress (scroll-bound)
  lenis:  { velocity: 0, instance: null },     // fed from Lenis each frame
  bounds: { helmetScroll: { width, height, left, top } }, // target rect for the helmet
  params: { headScene: { /* shader params below */ } }
}
```

## `headScene` shader parameters (authoritative)
| Param | Value | Meaning |
|---|---|---|
| `REVEAL_DURATION` | `1.1` | Seconds to complete the scroll reveal |
| `COLOR_OUTLINE` | `#CBCBB9` | Helmet outline color (grey) |
| `COLOR_FOREGROUND` | `#D2FF00` | **Helmet fill = lime** (signature accent) |
| `COLOR_BACKGROUND` | `#F8F8F3` | Scene background (matches hero light surface) |
| `COLOR_CURSOR_FOREGROUND` | `#CFD2C5` | Cursor brush foreground |
| `COLOR_CURSOR_BACKGROUND` | `#E8E8DF` | Cursor brush background |
| `COLOR_CURSOR_OUTLINE` | `#E8E8DF` | Cursor brush outline |
| `COLOR_FILTER` | `#50593F` | Scene color filter (olive cast) |
| `SCALE` | `1` | Helmet scale |
| `SPEED` | `0.1` | Animation speed |
| `THICKNESS` | `0.000005` | Outline thickness |
| `OUTLINE` | `true` | Render outline pass |
| `SHOW_HELMET_PERMANENTLY` | `false` | Helmet only visible during/after scroll reveal |
| `DISTORT_SCALE` | `1` / `DISTORT_INTENSITY` `0.5` | Vertex distortion |
| `NOISE_DETAIL` | `3` | Noise octaves |
| `CURSOR_INTENSITY` | `0.15` / `CURSOR_SCALE` `3` / `CURSOR_BOUNCE` `-0.75` | Cursor reactive brush |
| `REVEAL_SIZE` | `25` | Reveal sweep size |
| `IS_WIREFRAME_ANIMATING` | `true` | Wireframe animates |
| `VARIANT` | `"Lime"` | Color variant (lime chosen for prod) |

## Asset loading
- Loader stack: **GLTFLoader + DRACOLoader + MeshoptDecoder** (models are DRACO+meshopt compressed).
- `setDecoderPath(...)` points to a DRACO decoder (URL appears in the network manifest — localize it).
- Models (base `https://assets.itsoffbrand.io/lando/gl`):
  - `models/helmet-21.glb` — the hero helmet
  - `models/disco-02.glb` — the "disco" section scene
  - `models/tracks/tracks.glb` — track geometry
- Also loads a `.mov` video texture (disco) + Rive wasm.

## Inputs that drive it
1. **Scroll reveal** — `landoGL.reveal` is bound to scroll progress through the helmet section (`bounds.helmetScroll`); goes 0→1 over `REVEAL_DURATION`.
2. **Lenis velocity** — `landoGL.lenis.velocity` each frame → helmet distortion/speed reacts to scroll speed.
3. **Cursor** — mouse position → `CURSOR_*` brush (a reactive lime smear that bounces).

## Reconstruction approach (decision)
**Reuse the bundle.** The reconstruction ships the real `offbrand.main.js` unchanged except for
patching the two base-URL constants:
- `https://assets.itsoffbrand.io/lando/rive/` → `/assets/rive/`
- `https://assets.itsoffbrand.io/lando/gl`     → `/assets/gl`

…so the same GLBs, shaders, and params run locally. No shader re-derivation needed; this file is the
extracted spec for verification.

## Verify against
- Helmet renders in lime (`#D2FF00`) on light bg (`#F8F8F3`) — desktop only.
- Helmet not visible at scroll 0 (`SHOW_HELMET_PERMANENTLY:false`); reveals on scroll into the helmet section.
- Reacts to cursor; distortion scales with scroll velocity.
- `window.landoGL` exists and `reveal`/`lenis.velocity` update on interaction.
