# Effect — Rive vector layer (buttons, icons, page transitions)

> Rive (.riv) state machines drive all the vector micro-interactions. Reconstruction reuses the real
> runtime (loaded from CDN/jsdelivr) + the real `.riv` files.

## The 8 `.riv` files (base `https://assets.itsoffbrand.io/lando/rive/`)
| File | Role |
|---|---|
| `btn-ui.riv` | **Interactive buttons** — hover/press/invert state machines (primary CTA, nav) |
| `signature.riv` | Hero/section decorative loop — Lando signature line-art |
| `circuits.riv` | Circuit/track line-art motif (topographic flow on hero) |
| `reef.riv` | Decorative loop |
| `phrases.riv` | Animated phrase/wordmark loop |
| `ln4.riv` | "LN4" logo mark animation (hero icon variant `c-home-hero-icon = ln4`) |
| `mob-landscape.riv` | Mobile-only landscape decorative loop |
| `page-transition.riv` | **Page transition** overlay (loaded via `transitions-rive-isolate.js`) |

## How Rive is wired (data attributes)
The OFF+BRAND bundle scans for `data-rive-*` attributes and instantiates Rive canvases:
```
data-rive-file             → which .riv (key: signature/btn-ui/circuits/…)
data-rive-artboard         → artboard name inside the file
data-rive-state-machine    → state machine to run
data-rive-fit              → fit mode (cover/contain/…)
data-rive-input            → numeric input name(s) to drive
data-rive-input-track      → which scroll track feeds the input
data-rive-color-input      → color input name
data-rive-input-color      → color value to inject
data-rive-input-weight     → numeric weight input
data-rive-btn-invert       → button invert flag
data-rive-circuit-hover    → hover-driven circuit input
data-rive-hover            → hover-triggered state
data-rive-instant-play     → play immediately on load
data-rive-scrolltrigger / -start / -end / -target → bind a Rive input to a ScrollTrigger range
data-rive-placeholder      → placeholder shown until Rive inits
```

## Runtime
- Rive JS runtime + `rive.wasm` (fallback `rive_fallback.wasm`) loaded from `cdn.jsdelivr.net/npm/…`.
- Advanced canvas renderer uses `canvas_advanced.wasm`.
- Each Rive canvas is a `<canvas>` element (the page has ~7–35 canvases depending on route).

## Page transitions
`transitions-rive-isolate.js` (106 KB) runs `page-transition.riv` as an overlay during route changes
(on link click → play out-transition → navigate → play in-transition). This is the smooth,
vector "wipe" between `/`, `/on-track`, etc.

## Reconstruction approach
- Keep all `data-rive-*` attributes in the HTML (they ARE the wiring).
- Localize the 8 `.riv` files to `/assets/rive/`.
- Patch the OFF+BRAND base constant `/lando/rive/` → `/assets/rive/`.
- Keep the Rive runtime loading from jsdelivr (or localize it; appears in the network manifest).
- Keep `transitions-rive-isolate.js` as-is.

## Verify against
- Buttons animate on hover/press (state machine) with the invert/lime behavior.
- Hero shows the `ln4` + `signature`/`circuits` loops on load.
- Navigating between pages plays the Rive transition overlay.
- Inputs coupled via `data-rive-scrolltrigger-*` animate as you scroll.
