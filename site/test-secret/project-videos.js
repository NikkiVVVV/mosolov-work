import { chooseVideoSource } from './video-source.js?v=73';
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
      entry.visible = change.isIntersecting && change.intersectionRatio > 0;
      clearTimeout(entry.pauseTimer);
      if (entry.visible) { load(entry); play(entry); }
      else {
        // Ignore a brief exit/re-entry while the browser chrome changes during scrolling.
        entry.video.autoplay=false;
        entry.pauseTimer=setTimeout(()=>{if(!entry.visible)entry.video.pause();},180);
      }
    }
  }, {threshold:[0,.01]});
  const proximity = new IntersectionObserver(changes => {
    for (const change of changes) {
      const entry=byVideo.get(change.target); if(!entry)continue;
      entry.near=change.isIntersecting; if(entry.near)load(entry);
    }
  }, {rootMargin:'320px 0px',threshold:0});
  let ready = !root.classList.contains('is-loading');
  function load(entry) {
    if (!ready || entry.loading || (!entry.near&&!entry.visible) || !entry.video.isConnected) return;
    entry.loading=true;
    chooseVideoSource(entry.project,entry.video).then(source=>{
      entry.video.dataset.codec=source.codec;
      entry.video.preload='auto';
      entry.video.src=source.src;entry.loaded=true;
      play(entry);
    });
  }
  function play(entry, restart = false) {
    if (!ready || !entry.visible || document.hidden || !entry.video.isConnected) return;
    if (!entry.loaded) {load(entry);return;}
    if (restart && !entry.video.paused && !entry.video.ended) return;
    if (entry.shuttle) {
      if (restart && entry.shuttle.held) entry.shuttle.advance();
      else if (entry.shuttle.held) return;
    } else if (restart && !entry.video.loop) entry.video.currentTime = 0;
    entry.video.muted=true;entry.video.autoplay=true;
    if (entry.playPending || (!entry.video.paused&&!entry.video.ended)) return;
    entry.playPending=true;
    entry.video.play().then(()=>{entry.video.dataset.autoplayState='playing';}).catch(error=>{
      // Keep failures observable; canplay/pageshow retry when the browser becomes ready.
      entry.video.dataset.autoplayState=error.name||'blocked';
    }).finally(()=>{entry.playPending=false;});
  }
  function sync() {
    for (const entry of entries.values()) {
      load(entry);
      if (!entry.video.isConnected || !entry.visible || document.hidden) {entry.video.autoplay=false;entry.video.pause();}
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
  globalThis.window?.addEventListener?.('pageshow',sync);
  return {
    attach(project, card) {
      let entry = entries.get(project.id);
      if (!entry) {
        const video = document.createElement('video');
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
        video.setAttribute('webkit-playsinline','');
        video.preload = 'none';
        video.controls = false;
        video.loop = project.videoLoop === true;
        video.setAttribute('aria-hidden', 'true');
        entry = { video, project, near:false, loading:false, loaded:false, playPending:false, pauseTimer:null, visible:false, shuttle: project.shuttle ? createVideoShuttle(video, project.shuttle) : null };
        entries.set(project.id, entry);
        byVideo.set(video,entry);visibility.observe(video);proximity.observe(video);
        for(const event of ['loadedmetadata','loadeddata','canplay'])video.addEventListener(event,()=>play(entry));
        let passStarted=false,completed=false;
        video.addEventListener('play',()=>{
          if(!passStarted){passStarted=true;completed=false;track('video_play',{project_id:project.id,direction:video.dataset.direction||'forward'});}
        });
        const complete=()=>{
          if(!completed&&(entry.shuttle?.held||video.ended)){
            video.autoplay=false;completed=true;passStarted=false;track('video_complete',{project_id:project.id,direction:video.dataset.direction||'forward'});
          }
        };
        video.addEventListener('timeupdate',complete);video.addEventListener('ended',complete);
        video.addEventListener('pause',()=>queueMicrotask(complete));
        video.addEventListener('error',()=>{
          if(video.dataset.codec!=='vp9')return;
          video.dataset.codec='h264';video.src=project.video;
        });
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
        card.addEventListener('click', event => {
          if (event.button > 0 || event.target?.closest?.('a,button')) return;
          play(entry, true);
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
