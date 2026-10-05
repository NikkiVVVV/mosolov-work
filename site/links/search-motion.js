// Decorative only: no continuous render loop, network requests or dependencies.
export function initSearchMotion(canvas, form, input) {
  const context = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let frame = 0;
  let origin = { x: 0, y: 0 };
  let started = 0;

  function draw(time = 0) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const progress = started ? (time - started) / 1400 : 1;
    const radius = Math.max(width, height) * progress;
    for (let x = 12; x < width; x += 20) {
      for (let y = 12; y < height; y += 20) {
        const distance = Math.hypot(x - origin.x, y - origin.y);
        const wave = progress < 1 ? Math.exp(-Math.pow((distance - radius) / 48, 2)) * (1 - progress) : 0;
        const edge = Math.min(1, Math.abs(x - width / 2) / (width * .4));
        const base = .025 + .12 * edge;
        context.fillStyle = `rgba(190,194,188,${base + wave * .65})`;
        const size = 2 + wave * 3;
        const push = wave * 6;
        const angle = Math.atan2(y - origin.y, x - origin.x);
        context.fillRect(x + Math.cos(angle) * push - size / 2, y + Math.sin(angle) * push - size / 2, size, size);
      }
    }
    if (started && progress < 1 && !document.hidden) frame = requestAnimationFrame(draw);
    else { frame = 0; started = 0; }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    cancelAnimationFrame(frame);
    frame = 0;
    started = 0;
    draw();
  }

  function ripple(event) {
    if (reduced.matches || document.body.classList.contains('chat-mode')) return;
    const rect = canvas.getBoundingClientRect();
    const field = form.getBoundingClientRect();
    origin = {
      x: event?.clientX ? event.clientX - rect.left : field.left + field.width / 2 - rect.left,
      y: field.top + field.height / 2 - rect.top
    };
    cancelAnimationFrame(frame);
    started = performance.now();
    frame = requestAnimationFrame(draw);
  }
  form.addEventListener('pointerdown', ripple);
  input.addEventListener('focus', () => { if (!frame) ripple(); });
  new ResizeObserver(resize).observe(canvas);
  reduced.addEventListener('change', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resize(); });

  const prompts = ['Сайты с необычной типографикой', 'Референсы с интересной анимацией', 'Инструменты для работы с 3D'];
  let promptIndex = 0;
  setInterval(() => {
    if (document.hidden || reduced.matches || input.value || document.body.classList.contains('chat-mode')) return;
    input.classList.add('changing-prompt');
    setTimeout(() => {
      if (!input.value && !document.body.classList.contains('chat-mode')) {
        promptIndex = (promptIndex + 1) % prompts.length;
        input.placeholder = prompts[promptIndex];
      }
      input.classList.remove('changing-prompt');
    }, 200);
  }, 3600);
}
