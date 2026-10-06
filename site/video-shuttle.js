// One asset contains forward frames, an endpoint buffer, then reverse frames.
// Keeping one decoder avoids a flash when switching direction.
export function createVideoShuttle(video, { forwardEnd, reverseStart }) {
  let direction = 'forward';
  let held = false;
  let continuous = false;
  let frame = null;
  const publish = () => {
    video.dataset.direction = direction;
    video.dataset.held = String(held);
  };
  function stopAtEnd(time = video.currentTime) {
    if (continuous) {
      held=false;
      if (time >= forwardEnd - .001 && time < reverseStart) video.currentTime=reverseStart;
      direction=time >= forwardEnd - .001 ? 'reverse' : 'forward';
      publish();
      return;
    }
    if (direction === 'forward' && time >= forwardEnd - .001) {
      held = true;
      video.pause();
      // The padded still frames also protect the timeupdate-only fallback.
      if (video.currentTime >= reverseStart) video.currentTime = forwardEnd;
      publish();
    }
  }
  function watchFrame() {
    frame = null;
    if (video.paused || held) return;
    frame = video.requestVideoFrameCallback((_, metadata) => {
      stopAtEnd(metadata.mediaTime);
      watchFrame();
    });
  }
  video.addEventListener('play', () => {
    if (video.requestVideoFrameCallback && frame === null) watchFrame();
  });
  video.addEventListener('pause', () => {
    if (frame !== null) video.cancelVideoFrameCallback(frame);
    frame = null;
  });
  video.addEventListener('timeupdate', () => stopAtEnd());
  video.addEventListener('ended', () => { held = true; publish(); });
  publish();
  return {
    get held() { return held; },
    setContinuous(value) {
      continuous=value;video.loop=value;
      if (value && held) {
        video.currentTime=direction === 'forward' ? reverseStart : 0;
        held=false;
      }
      direction=video.currentTime >= reverseStart ? 'reverse' : 'forward';
      publish();
    },
    advance() {
      // A new hover during a pass must not jump or interrupt that pass.
      if (!held) return false;
      direction = direction === 'forward' ? 'reverse' : 'forward';
      held = false;
      video.currentTime = direction === 'reverse' ? reverseStart : 0;
      publish();
      return true;
    },
  };
}
