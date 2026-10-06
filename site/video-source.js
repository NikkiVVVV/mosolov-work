// Prefer the smaller encode only when the browser reports efficient, smooth decoding.
export async function chooseVideoSource(project, video, capabilities = globalThis.navigator?.mediaCapabilities) {
  const fallback = {src:project.video,codec:'h264'};
  if (!project.videoWebm || project.webmBytes >= project.videoBytes || !video.canPlayType?.('video/webm; codecs="vp9"')) return fallback;
  if (!capabilities?.decodingInfo) return fallback;
  try {
    const config = {type:'file',video:{contentType:'video/webm; codecs="vp09.00.40.08"',width:project.videoWidth,height:project.videoHeight,bitrate:project.webmBitrate,framerate:project.videoFps}};
    const info = await Promise.race([capabilities.decodingInfo(config),new Promise(resolve=>setTimeout(()=>resolve(null),250))]);
    if (info?.supported && info.smooth && info.powerEfficient) return {src:project.videoWebm,codec:'vp9'};
  } catch { /* Safe MP4 path for embedded browsers with incomplete capability APIs. */ }
  return fallback;
}
