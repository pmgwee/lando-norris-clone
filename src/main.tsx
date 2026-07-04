import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Thin React entry. The page content, styling, and all motion are driven by the real Webflow
// CSS + the OFF+BRAND bundle (GSAP/Rive/three.js) that ship in /assets — React mounts into the
// empty #app node so it's available for incremental component adoption without touching the
// 1:1 reconstruction DOM. See docs/architecture.md.
const el = document.getElementById('app');
if (el) {
  createRoot(el).render(<App />);
}
