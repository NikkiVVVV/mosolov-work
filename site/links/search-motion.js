// Subtle background motion; pause when hidden, in chat or with reduced motion.
export function initSearchMotion(canvas, form, input) {
  const context = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let frame = 0;
  let origin = { x: 0, y: 0 };
  let started = 0;
  let lastDraw = 0;
  let driftFrom = {x: 0, y: 0};
  let driftTo = {x: 0, y: 0};
  let driftStarted = 0;
  let driftDuration = 10000;
  const canMove = () => !reduced.matches && !document.hidden && !document.body.classList.contains('chat-mode') && width > 0 && height > 0;
  const randomPoint = () => ({x: width * (.2 + Math.random() * .6), y: height * (.25 + Math.random() * .5)});

  function driftPosition(time) {
    if (!driftStarted) {
      driftFrom = randomPoint();
      driftTo = randomPoint();
      driftStarted = time;
    }
    if (time - driftStarted > driftDuration) {
      driftFrom = driftTo;
      driftTo = randomPoint();
      driftStarted = time;
      driftDuration = 8000 + Math.random() * 6000;
    }
    const t = Math.min(1, (time - driftStarted) / driftDuration);
    const eased = t * t * (3 - 2 * t);
    return {x: driftFrom.x + (driftTo.x - driftFrom.x) * eased, y: driftFrom.y + (driftTo.y - driftFrom.y) * eased};
  }

  function draw(time = 0) {
    if (!context) return;
    frame = 0;
    if (time && canMove() && time - lastDraw < 40) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastDraw = time;
    context.clearRect(0, 0, width, height);
    const progress = started ? (time - started) / 1400 : 1;
    const radius = Math.max(width, height) * progress;
    const drift = canMove() ? driftPosition(time) : null;
    for (let x = 12; x < width; x += 20) {
      for (let y = 12; y < height; y += 20) {
        const distance = Math.hypot(x - origin.x, y - origin.y);
        const wave = progress < 1 ? Math.exp(-Math.pow((distance - radius) / 48, 2)) * (1 - progress) : 0;
        const edge = Math.min(1, Math.abs(x - width / 2) / (width * .4));
        const base = .03 + .11 * edge;
        const glow = drift ? Math.exp(-Math.pow(Math.hypot(x - drift.x, y - drift.y) / 64, 2)) : 0;
        context.fillStyle = `rgba(190,194,188,${base + wave * .65 + glow * .16})`;
        const size = 2 + wave * 3 + glow * 1.2;
        const push = wave * 6;
        const angle = Math.atan2(y - origin.y, x - origin.x);
        context.fillRect(x + Math.cos(angle) * push - size / 2, y + Math.sin(angle) * push - size / 2, size, size);
      }
    }
    if (progress >= 1) started = 0;
    if (canMove()) frame = requestAnimationFrame(draw);
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
    driftStarted = 0;
    lastDraw = 0;
    draw();
  }

  function ripple(event) {
    if (reduced.matches || document.body.classList.contains('chat-mode')) return;
    const rect = canvas.getBoundingClientRect();
    const field = form.getBoundingClientRect();
    origin = {
      x: Number.isFinite(event?.clientX) ? event.clientX - rect.left : field.left + field.width / 2 - rect.left,
      y: Number.isFinite(event?.clientY) ? event.clientY - rect.top : field.top + field.height / 2 - rect.top
    };
    cancelAnimationFrame(frame);
    started = performance.now();
    frame = requestAnimationFrame(draw);
  }
  canvas.closest('.search-section').addEventListener('pointerdown', ripple);
  input.addEventListener('focus', () => { if (!started) ripple(); });
  new ResizeObserver(resize).observe(canvas);
  reduced.addEventListener('change', resize);
  document.addEventListener('visibilitychange', resize);
  new MutationObserver(resize).observe(document.body, {attributes: true, attributeFilter: ['class']});

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
