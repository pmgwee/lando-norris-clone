import { useEffect } from 'react';

/**
 * App is intentionally a no-op render for now.
 *
 * The live visual + motion layer is the real Webflow CSS (`/assets/css/lando-offbrand.*.css`)
 * plus the OFF+BRAND bundle (`/assets/js/lando.OFF_BRAND.gold-android-fix-03.js`) which wires
 * GSAP, Rive, and the three.js `landoGL` scene. This React component exists so the project is a
 * proper React/TS app you can grow into: port sections into components one at a time, use
 * `@gsap/react` useLayoutEffect + refs for motion, and Tailwind utilities for new UI — all
 * without disturbing the 1:1 reconstruction.
 *
 * Example starter hook (left disabled): re-run a ScrollTrigger refresh after route changes.
 */
export default function App() {
  useEffect(() => {
    // If/when you drive scroll motion via React, refresh ScrollTrigger here, e.g.:
    //   window.ScrollTrigger?.refresh();
  }, []);
  return null;
}
