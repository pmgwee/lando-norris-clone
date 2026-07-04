# Effect — Smooth scroll (Lenis) + GSAP ScrollTrigger

> The motion backbone. Reconstruction reuses the real `offbrand.main.js`.
> Source: `offbrand.main.js`; easing also confirmed in `design-dna.json > designSystem.motion`.

## Lenis — global smooth/inertia scroll
A single Lenis instance, created once and exposed globally:
```js
this.isDesktop = window.innerWidth > 991;
this.lenis = this.createLenisInstance();
window.lenis = this.lenis;
window.landoGL.lenis.instance = this.lenis;   // WebGL reads velocity from it
// options:
{ infinite:false, lerp:0.1, smoothWheel:true, touchMultiplier:2, autoResize:true, syncTouch:true }
```
- `lerp:0.1` → smooth, slightly weighty glide (the site's "patient" feel).
- `smoothWheel:true`, `syncTouch:true` → wheel + touch both smoothed.
- `touchMultiplier:2` → amplified touch scroll.
- **Resize handling**: a `resize` listener calls `handleResize`. Note the production site reloads on
  breakpoint-crossing resizes (we observed this in capture) — the reconstruction must set viewport
  *before* navigation and treat breakpoint changes as full reloads.

## GSAP ScrollTrigger — scroll-driven choreography
- **Scrubbed timelines** use `scrub:true` with `ease:'none'` (progress maps 1:1 to scroll position).
- **Pinned + horizontal sections** (`section.is-horizontal-track`, `is-otot-*`): vertical scroll is
  converted to horizontal track translation while the section is pinned.
- **Reveal-on-scroll**: elements fade/translate in as they enter; headings use **SplitText** (char/word
  stagger) with expo eases.
- **Marquee** (`home-marquee`): continuous + scroll-velocity-coupled horizontal text band.
- `ScrollTrigger.create(...)` is used throughout; triggers refresh on Lenis scroll.

## Easing discipline (from `ease:` analysis of the bundle)
| Use | Ease |
|---|---|
| Scrubbed scroll timelines | `none` (linear to scroll) |
| Entrances / reveals | `expo.inOut`, `expo.out`, `expo.in` |
| Secondary motion | `power4`, `power3.inOut`, `power2.inOut`, `power1.inOut` |
| CSS transitions | `cubic-bezier(.19,1,.22,1)` (≈ expo.out), 0.2s / 0.6s |

**Rule:** never use bouncy/elastic eases. Motion is always decelerating (expo) or scrubbed linear.

## Inputs that drive it
1. Lenis scroll position → ScrollTrigger `scrollerProxy`/sync → all scrubbed timelines.
2. Lenis velocity → WebGL distortion + marquee speed coupling.
3. DOM `data-*` hooks on sections (`is-horizontal-track`, etc.) select which ScrollTrigger configs apply.

## Verify against
- Scrolling glides (Lenis lerp 0.1), never snaps.
- Horizontal-track sections pin and translate horizontally as you scroll vertically.
- Headings reveal via SplitText char/word stagger with expo.
- Marquee speed reacts to scroll velocity.
- On a real GPU, the helmet section reveals the lime helmet on scroll (see `webgl-landogl.md`).
