// Small DOM/CSS orb: no WebGL context or animation loop per message.
export function replyOrb() {
  const dots = Array.from({length: 96}, (_, i) => {
    const y = 1 - 2 * (i + .5) / 96;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    return `<i style="--x:${(radius * Math.cos(angle) * 16).toFixed(2)}px;--y:${(y * 16).toFixed(2)}px;--z:${(radius * Math.sin(angle) * 16).toFixed(2)}px"></i>`;
  }).join('');
  return `<span class="reply-orb" aria-hidden="true"><span class="reply-orb-sphere">${dots}</span></span>`;
}
