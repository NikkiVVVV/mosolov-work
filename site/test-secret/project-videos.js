import { createVideoShuttle } from './video-shuttle.js?v=44';
import { track } from './portfolio-analytics.js?v=63';

// Keep the same media element across filtering and language changes.
export function createProjectVideos(root = document.documentElement) {
  const entries = new Map();
  const byVideo = new WeakMap();
  const visibility = new IntersectionObserver(changes => {
    for (const change of changes) {
      const entry = byVideo.get(change.target);
      if (!entry) continue;
      entry.visible = change.isIntersecting && change.intersectionRatio >= .2;
      if (entry.visible) play(entry);
      else entry.video.pause();
    }
  }, {threshold:[0,.2]});
  let ready = !root.classList.contains('is-loading');
  function play(entry, restart = false) {
    if (!ready || !entry.visible || document.hidden || !entry.video.isConnected) return;
    if (restart && !entry.video.paused && !entry.video.ended) return;
    if (entry.shuttle) {
      if (restart && entry.shuttle.held) entry.shuttle.advance();
      else if (entry.shuttle.held) return;
    } else if (restart) entry.video.currentTime = 0;
    entry.video.play().catch(() => {}); // Autoplay can be blocked by device settings.
  }
  function sync() {
    for (const entry of entries.values()) {
      if (!entry.video.isConnected || !entry.visible || document.hidden) entry.video.pause();
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
        video.setAttribute('muted','');
        video.setAttribute('playsinline','');
        video.preload = 'auto';
        video.controls = false;
        video.loop = false;
        video.setAttribute('aria-hidden', 'true');
        entry = { video, visible:false, shuttle: project.shuttle ? createVideoShuttle(video, project.shuttle) : null };
        entries.set(project.id, entry);
        byVideo.set(video,entry);visibility.observe(video);
        video.addEventListener('loadeddata',()=>play(entry));
        let passStarted=false,completed=false;
        video.addEventListener('play',()=>{
          if(!passStarted){passStarted=true;completed=false;track('video_play',{project_id:project.id,direction:video.dataset.direction||'forward'});}
        });
        const complete=()=>{
          if(!completed&&(entry.shuttle?.held||video.ended)){
            completed=true;passStarted=false;track('video_complete',{project_id:project.id,direction:video.dataset.direction||'forward'});
          }
        };
        video.addEventListener('timeupdate',complete);video.addEventListener('ended',complete);
        video.addEventListener('pause',()=>queueMicrotask(complete));
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
