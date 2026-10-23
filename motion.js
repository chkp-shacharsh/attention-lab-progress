/* global document, window, matchMedia, requestAnimationFrame, cancelAnimationFrame, IntersectionObserver */
'use strict';

// Decorative geometry only. No measurements, storage, analytics or network calls.
const canvas = document.querySelector('#attention-field');
const context = canvas.getContext('2d');
const motionButton = document.querySelector('.motion-toggle');
const motionLabel = document.querySelector('.motion-label');
const motionIcon = document.querySelector('.motion-icon');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduceMotion.matches;
let visible = true;
let frame = 0;
let previousTime = 0;
let phase = 0;
let width = 0;
let height = 0;
let pointerX = 0;
let pointerY = 0;
let easedX = 0;
let easedY = 0;

function draw() {
  context.clearRect(0, 0, width, height);
  const scale = Math.min(width / 2.65, height / 2.6);
  const cx = width * 0.5;
  const cy = height * 0.49;
  const tilt = -0.46 + easedX * 0.08;
  const pitch = 0.72 + Math.sin(phase * 0.28) * 0.12 + easedY * 0.06;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const points = [];
  const lines = 64;
  const around = width < 400 ? 65 : 90;
  for (let row = 0; row < lines; row += 1) {
    const v = (row / lines) * Math.PI * 2;
    for (let col = 0; col < around; col += 1) {
      const u = (col / around) * Math.PI * 2;
      const ripple = 0.04 * Math.sin(u * 4 + v * 3 + phase * 0.7);
      const ring = 0.82 + (0.32 + ripple) * Math.cos(v);
      const x = ring * Math.cos(u + phase * 0.095);
      const y = ring * Math.sin(u + phase * 0.095);
      const z = (0.43 + ripple) * Math.sin(v) + 0.07 * Math.sin(u * 3 + phase * 0.3);
      const ry = y * cp - z * sp;
      const rz = y * sp + z * cp;
      const px = x * ct - ry * st;
      const py = x * st + ry * ct;
      points.push({x:cx + px * scale,y:cy + py * scale,z:rz});
    }
  }
  points.sort((a,b) => a.z - b.z);
  for (const p of points) {
    const depth = (p.z + 1.2) / 2.4;
    context.beginPath();
    context.arc(p.x,p.y,0.43 + depth * 0.77,0,Math.PI * 2);
    context.fillStyle = `rgba(44,87,221,${0.12 + depth * 0.66})`;
    context.fill();
  }
  context.strokeStyle = 'rgba(91,125,218,0.2)';
  context.lineWidth = 0.6;
  context.beginPath();
  context.ellipse(cx,cy,scale * 1.42,scale * 0.8,-0.38,0,Math.PI * 2);
  context.stroke();
  const satellite = phase * 0.17 + 1.1;
  const sx = Math.cos(satellite) * scale * 1.42;
  const sy = Math.sin(satellite) * scale * 0.8;
  context.beginPath();
  context.arc(cx + sx * Math.cos(-0.38) - sy * Math.sin(-0.38),cy + sx * Math.sin(-0.38) + sy * Math.cos(-0.38),3,0,Math.PI * 2);
  context.fillStyle = '#3157e9';
  context.fill();
}

function tick(time) {
  if (paused || !visible || document.hidden) { frame = 0; previousTime = 0; return; }
  // Cap to about 30 fps; use elapsed time to avoid refresh-rate dependent motion.
  if (!previousTime || time - previousTime >= 32) {
    const elapsed = previousTime ? Math.min(time - previousTime,100) / 1000 : 0;
    previousTime = time;
    phase += elapsed;
    easedX += (pointerX - easedX) * 0.035;
    easedY += (pointerY - easedY) * 0.035;
    draw();
  }
  frame = requestAnimationFrame(tick);
}

function syncMotion() {
  motionButton.setAttribute('aria-pressed',String(paused));
  motionLabel.textContent = paused ? 'Resume motion' : 'Pause motion';
  motionIcon.textContent = paused ? '▷' : 'Ⅱ';
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
  if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
}

if (context) {
  canvas.parentElement.classList.add('canvas-ready');
  motionButton.hidden = false;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const dpr = Math.min(window.devicePixelRatio || 1,2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
    draw();
  };
  resize();
  window.addEventListener('resize',resize);
  canvas.addEventListener('pointermove',event => {
    if (paused) return;
    const bounds = canvas.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / width - 0.5;
    pointerY = (event.clientY - bounds.top) / height - 0.5;
  });
  canvas.addEventListener('pointerleave',() => { pointerX = 0; pointerY = 0; });
  motionButton.addEventListener('click',() => { paused = !paused; syncMotion(); });
  reduceMotion.addEventListener('change',event => { paused = event.matches; syncMotion(); });
  document.addEventListener('visibilitychange',syncMotion);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); }).observe(canvas);
  }
  syncMotion();
}

const filters = document.querySelector('.roadmap-filters');
const stages = [...document.querySelectorAll('.roadmap-item')];
filters.hidden = false;
filters.addEventListener('click',event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  for (const item of filters.querySelectorAll('button')) {
    const active = item === button;
    item.classList.toggle('active',active);
    item.setAttribute('aria-pressed',String(active));
  }
  let count = 0;
  for (const stage of stages) {
    stage.hidden = button.dataset.filter !== 'all' && stage.dataset.stage !== button.dataset.filter;
    if (!stage.hidden) count += 1;
  }
  document.querySelector('#filter-announcement').textContent = `${count} roadmap stages shown.`;
});
