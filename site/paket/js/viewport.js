// In-app iOS browsers can report a small viewport shorter than the visible page.
// Keep the first screen aligned with the visible area as browser bars change.
(() => {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let frame = 0;
  let previousHeight = 0;
  function update() {
    frame = 0;
    // Pinch zoom should magnify the page, not resize the scene underneath it.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const height = Math.round(viewport?.height || window.innerHeight);
    if (height > 0 && height !== previousHeight) {
      previousHeight = height;
      root.style.setProperty('--hero-viewport-height', `${height}px`);
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function settle() {
    // Intro releases overflow:hidden. Let browser chrome and layout settle first.
    schedule();
    requestAnimationFrame(() => requestAnimationFrame(schedule));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', settle, { once: true });
  } else settle();
  window.addEventListener('load', settle, { once: true });
  window.addEventListener('bag-ready', settle, { once: true });
  document.fonts?.ready.then(settle);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', settle, { passive: true });
  window.addEventListener('orientationchange', settle, { passive: true });
  viewport?.addEventListener('resize', schedule, { passive: true });
  viewport?.addEventListener('scroll', schedule, { passive: true });
})();
