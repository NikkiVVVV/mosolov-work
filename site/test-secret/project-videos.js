import { createVideoShuttle } from './video-shuttle.js?v=44';

// Keep the same media element across filtering and language changes.
export function createProjectVideos(root = document.documentElement) {
  const entries = new Map();
  let ready = !root.classList.contains('is-loading');
  function play(entry, restart = false) {
    if (!ready || document.hidden || !entry.video.isConnected) return;
    if (restart && !entry.video.paused && !entry.video.ended) return;
    if (entry.shuttle) {
      if (restart && entry.shuttle.held) entry.shuttle.advance();
      else if (entry.shuttle.held) return;
    } else if (restart) entry.video.currentTime = 0;
    entry.video.play().catch(() => {}); // Autoplay can be blocked by device settings.
  }
  function sync() {
    for (const entry of entries.values()) {
      if (!entry.video.isConnected || document.hidden) entry.video.pause();
      else if (!entry.video.ended) play(entry);
    }
  }
  const observer = new MutationObserver(() => {
    if (!root.classList.contains('is-loading')) {
      ready = true;
      observer.disconnect();
      sync();
    }
  });
  if (!ready) observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  return {
    attach(project, card) {
      let entry = entries.get(project.id);
      if (!entry) {
        const video = document.createElement('video');
        video.src = project.video;
        video.poster = project.poster || '';
        if (project.videoWidth && project.videoHeight) {
          video.width = project.videoWidth;
          video.height = project.videoHeight;
        }
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.controls = false;
        video.loop = false;
        video.setAttribute('aria-hidden', 'true');
        entry = { video, shuttle: project.shuttle ? createVideoShuttle(video, project.shuttle) : null };
        entries.set(project.id, entry);
      }
      // Each new mouse entry replays once; leaving does not interrupt the clip.
      card.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') play(entry, true);
      });
      card.addEventListener('focusin', event => {
        if (!card.contains(event.relatedTarget)) play(entry, true);
      });
      if (entry.shuttle) {
        card.tabIndex = 0;
        card.addEventListener('pointerup', event => {
          if (event.pointerType === 'touch') play(entry, true);
        });
        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            play(entry, true);
          }
        });
      }
      return entry.video;
    },
    sync,
  };
}
