const wrap = (value, span) => ((value + span / 2) % span + span) % span - span / 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// Concave wall with a continuous pincushion projection. DOM hit regions
// follow the same curved boundaries as the canvas, retaining keyboard access.
export class ProjectSphere {
  constructor(stage, onOpen) {
    this.stage = stage;
    this.host = stage.querySelector('#sphere-items');
    this.canvas = stage.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.onOpen = onOpen;
    this.rotation = { x: .08, y: .12 };
    this.velocity = { x: 0, y: 0 };
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.paused = this.reduced.matches;
    this.active = false;
    this.visible = true;
    this.items = [];
    this.frame = 0;
    this.lastInteraction = 0;
    this.hovered = false;
    document.fonts.ready.then(() => this.render());
    this.reduced.addEventListener('change', () => {
      if (this.reduced.matches) { this.paused = true; this.velocity = { x: 0, y: 0 }; }
      this.onMotionChange?.(); this.wake();
    });
    new ResizeObserver(() => this.resize()).observe(stage);
    new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.wake(); }).observe(stage);
    document.addEventListener('visibilitychange', () => this.wake());
    stage.addEventListener('pointerdown', e => this.down(e));
    stage.addEventListener('pointermove', e => this.move(e));
    stage.addEventListener('pointerup', e => this.up(e));
    stage.addEventListener('pointercancel', () => this.cancel());
    stage.addEventListener('lostpointercapture', () => this.cancel());
    stage.addEventListener('pointerenter', () => { this.hovered = true; });
    stage.addEventListener('pointerleave', () => { this.hovered = false; this.wake(); });
    stage.addEventListener('focusin', e => { this.focused = e.target.matches(':focus-visible'); });
    stage.addEventListener('focusout', e => { this.focused = stage.contains(e.relatedTarget) && e.relatedTarget.matches(':focus-visible'); this.wake(); });
    stage.addEventListener('keydown', e => this.key(e));
    stage.addEventListener('click', e => {
      if (this.suppressClick) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  setProjects(projects) {
    this.host.replaceChildren();
    this.items = [];
    // Periodic rows supply a continuous wall while the content is wireframes.
    for (let row = -3; row <= 3; row++) for (let col = -3; col <= 3; col++) {
      const project = projects[((row + 3) * 7 + col + 3) % projects.length];
      const element = document.createElement('button');
      element.type = 'button'; element.className = 'sphere-item';
      element.setAttribute('aria-label', `Работа ${project.id} — макет`);
      element.tabIndex = -1;
      const item = { element, project, row, col };
      element.addEventListener('click', () => { if (!this.suppressClick) this.onOpen(project); });
      element.addEventListener('pointerenter', () => { this.highlight = item; this.render(); });
      element.addEventListener('pointerleave', () => { this.highlight = null; this.render(); });
      element.addEventListener('focus', () => { this.highlight = item; this.render(); });
      element.addEventListener('blur', () => { this.highlight = null; this.render(); });
      this.host.append(element); this.items.push(item);
    }
    this.resize(); this.wake();
  }

  resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    if (!width || !height) return;
    this.width = width; this.height = height;
    this.cellW = width / (width < 400 ? 2.3 : 3.1);
    this.cellH = this.cellW * 1.15;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  project(x, y) {
    const nx = x / (this.width / 2), ny = y / (this.height / 2);
    // Edges expand rather than disappearing behind a convex silhouette.
    const depth = 1 + .29 * (nx * nx + ny * ny);
    return [this.width / 2 + x * depth, this.height / 2 + y * depth];
  }

  boundary(x, y, w, h) {
    const points = [], segments = 10;
    for (let i = 0; i <= segments; i++) points.push(this.project(x + w * i / segments, y));
    for (let i = 1; i <= segments; i++) points.push(this.project(x + w, y + h * i / segments));
    for (let i = 1; i <= segments; i++) points.push(this.project(x + w - w * i / segments, y + h));
    for (let i = 1; i <= segments; i++) points.push(this.project(x, y + h - h * i / segments));
    return points;
  }

  path(points) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) c.lineTo(...points[i]);
    c.closePath();
  }

  fillRect(x, y, w, h, color) {
    this.path(this.boundary(x, y, w, h));
    this.ctx.fillStyle = color; this.ctx.fill();
  }

  render() {
    if (!this.width || !this.ctx) return;
    const c = this.ctx, closest = new Map();
    c.clearRect(0, 0, this.width, this.height);
    const ox = this.rotation.y * this.width / 2.5;
    const oy = -this.rotation.x * this.width / 2.5;
    for (const item of this.items) {
      const { element, project, row, col } = item;
      const x = wrap(col * this.cellW + ox, this.cellW * 7) - this.cellW / 2;
      const y = wrap(row * this.cellH + oy, this.cellH * 7) - this.cellH / 2;
      const points = this.boundary(x, y, this.cellW, this.cellH);
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      const left = Math.min(...xs), top = Math.min(...ys);
      const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
      const visible = left < this.width && top < this.height && left + width > 0 && top + height > 0;
      element.hidden = !visible;
      element.tabIndex = -1; element.setAttribute('aria-hidden', 'true');
      if (!visible) continue;
      element.style.width = `${width}px`; element.style.height = `${height}px`;
      element.style.transform = `translate(${left}px, ${top}px)`;
      element.style.clipPath = `polygon(${points.map(p => `${(p[0] - left) / width * 100}% ${(p[1] - top) / height * 100}%`).join(',')})`;
      const highlighted = this.highlight === item && !this.pointer?.dragging;
      this.path(points); c.fillStyle = highlighted ? '#e6e7df' : '#fff'; c.fill();
      c.strokeStyle = '#ddded7'; c.lineWidth = .7; c.stroke();
      const pad = this.cellW * .12;
      const coverY = y + this.cellH * .16;
      const coverH = this.cellH * .57;
      this.fillRect(x + pad, coverY, this.cellW - pad * 2, coverH, highlighted ? '#d3d6cb' : '#eaeae4');
      this.fillRect(x + pad, y + this.cellH * .81, this.cellW * .5, 4, '#d7d9d0');
      this.fillRect(x + pad, y + this.cellH * .87, this.cellW * .32, 3, '#eeeee8');
      const centre = this.project(x + this.cellW / 2, coverY + coverH / 2);
      const epsilon = this.project(x + this.cellW / 2 + 1, coverY + coverH / 2);
      c.save(); c.translate(...centre); c.rotate(Math.atan2(epsilon[1] - centre[1], epsilon[0] - centre[0]));
      c.font = '12px Werkzeug, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#696b65'; c.fillText(project.id, 0, 0); c.restore();
      const distance = Math.hypot(centre[0] - this.width / 2, centre[1] - this.height / 2);
      const inside = centre[0] > 12 && centre[0] < this.width - 12 && centre[1] > 12 && centre[1] < this.height - 12;
      if (inside && (!closest.has(project.id) || closest.get(project.id).distance > distance)) closest.set(project.id, { element, distance });
    }
    for (const { element } of closest.values()) { element.tabIndex = 0; element.removeAttribute('aria-hidden'); }
  }

  setActive(active) { this.active = active; if (active) this.resize(); this.wake(); }
  setPaused(paused) { this.paused = paused; if (paused) this.velocity = { x: 0, y: 0 }; this.wake(); }
  wake() {
    if (this.frame || !this.active || !this.visible || document.hidden) return;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  tick(time) {
    this.frame = 0;
    if (!this.active || !this.visible || document.hidden) return;
    const dt = Math.min((time - this.lastTime) / 1000, .035);
    this.lastTime = time;
    const inertial = !this.reduced.matches && !this.paused && !this.pointer;
    if (inertial && !this.focused) {
      this.rotation.x += this.velocity.x * dt;
      this.rotation.y += this.velocity.y * dt;
      const damping = Math.exp(-3.4 * dt);
      this.velocity.x *= damping; this.velocity.y *= damping;
      if (!this.hovered && time - this.lastInteraction > 1800) this.rotation.y += .075 * dt;
    }
    this.render();
    if (this.pointer || (!this.paused && !this.reduced.matches)) this.frame = requestAnimationFrame(t => this.tick(t));
  }

  down(e) {
    if (e.button !== 0 || this.pointer) return;
    this.focused = false;
    this.suppressClick = false;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, time: performance.now(), dragging: false };
    this.velocity = { x: 0, y: 0 }; this.lastInteraction = performance.now();
    this.wake();
  }

  move(e) {
    const p = this.pointer; if (!p || p.id !== e.pointerId) return;
    const now = performance.now(), dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.dragging && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 5) {
      p.dragging = true; this.suppressClick = true;
      this.stage.setPointerCapture(e.pointerId); this.stage.classList.add('dragging');
    }
    if (p.dragging) {
      const factor = 2.5 / this.width, dt = Math.max((now - p.time) / 1000, .008);
      this.rotation.y += dx * factor; this.rotation.x -= dy * factor;
        this.velocity.y = clamp(dx * factor / dt, -3.5, 3.5);
      this.velocity.x = clamp(-dy * factor / dt, -3.5, 3.5);
      this.render();
    }
    Object.assign(p, { x: e.clientX, y: e.clientY, time: now });
    this.lastInteraction = now;
  }

  up(e) {
    if (this.pointer?.id !== e.pointerId) return;
    if (performance.now() - this.pointer.time > 100) this.velocity = { x: 0, y: 0 };
    this.pointer = null; this.stage.classList.remove('dragging');
    if (this.stage.hasPointerCapture(e.pointerId)) this.stage.releasePointerCapture(e.pointerId);
    this.lastInteraction = performance.now(); this.wake();
    // Release click follows pointerup in the same task; keyboard clicks later
    // must not inherit drag suppression.
    setTimeout(() => { this.suppressClick = false; }, 0);
  }

  cancel() { this.pointer = null; this.stage.classList.remove('dragging'); this.wake(); }

  key(e) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    this.focused = true; this.suppressClick = false;
    e.preventDefault(); this.velocity = { x: 0, y: 0 };
    if (e.key === 'ArrowLeft') this.rotation.y -= .14;
    if (e.key === 'ArrowRight') this.rotation.y += .14;
    if (e.key === 'ArrowUp') this.rotation.x += .14;
    if (e.key === 'ArrowDown') this.rotation.x -= .14;
    this.lastInteraction = performance.now(); this.render();
  }
}
