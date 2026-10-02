// In-app iOS browsers can report a small viewport shorter than the visible page.
// Keep the first screen aligned with the visible area as browser bars change.
(() => {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let frame = 0;
  function update() {
    frame = 0;
    // Pinch zoom should magnify the page, not resize the scene underneath it.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const height = Math.round(viewport?.height || window.innerHeight);
    if (height > 0) root.style.setProperty('--hero-viewport-height', `${height}px`);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  update();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule, { passive: true });
  viewport?.addEventListener('resize', schedule, { passive: true });
})();
