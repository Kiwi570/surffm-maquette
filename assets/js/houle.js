// Houle-oscilloscope : des lignes de signal qui forment la houle, leur amplitude suit le son.
import { Renderer, Program, Mesh, Triangle } from '../vendor/ogl.mjs';

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = (lines) => /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform float uAudio;
uniform vec2 uMouse;
uniform float uWind;
uniform float uHorizon;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

const float N = ${(lines - 1).toFixed(1)};
void main() {
  vec2 uv = vUv;
  // Rien au-dessus de l'horizon : sortie immédiate.
  if (uv.y > uHorizon + 0.012) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float aspect = uRes.x / uRes.y;
  float x = uv.x * aspect;
  float md = exp(-pow((uv.x - uMouse.x) * 2.6, 2.0) - pow((uv.y - uMouse.y) * 3.2, 2.0)) * uWind;
  float gain = (0.75 + min(uAudio, 0.6) * 1.9) * (1.0 + md * 0.9);
  // Ligne la plus proche du pixel (inversion de baseY = H - depth * (H + 0.06), depth = fi^1.65).
  float dp = clamp((uHorizon - uv.y) / (uHorizon + 0.06), 0.0, 1.0);
  float center = pow(dp, 1.0 / 1.65) * N;
  float first = floor(center) - 8.0;
  vec3 col = vec3(0.0);
  for (int k = 0; k < 16; k++) {
    float idx = first + float(k);
    if (idx < 0.0 || idx > N) continue;
    float fi = idx / N;
    float depth = pow(fi, 1.65);
    float baseY = uHorizon - depth * (uHorizon + 0.06);
    float amp = mix(0.0016, 0.05, depth) * gain;
    float thick = mix(0.0008, 0.0032, depth) * (1.0 + min(uAudio, 0.6) * 0.6);
    // Rejet bon marché avant le calcul du bruit.
    if (abs(uv.y - baseY) > amp * 1.35 + thick * 2.0) continue;
    float freq = mix(22.0, 4.2, depth);
    float speed = 0.35 + depth * 0.9;
    float n = noise(vec2(x * freq * 0.32 + uTime * 0.18 * (0.5 + depth), fi * 9.0 + uTime * 0.04));
    float swell = sin(x * freq - uTime * speed + fi * 5.0) * 0.55 + (n - 0.5) * 1.5;
    float y = baseY + swell * amp;
    float line = smoothstep(thick * 1.8, 0.0, abs(uv.y - y));
    float crest = smoothstep(0.25, 0.95, swell);
    vec3 c = mix(vec3(0.86, 0.93, 0.95), vec3(0.85, 0.81, 0.08), clamp(crest * (0.25 + min(uAudio, 0.6) * 1.4), 0.0, 1.0));
    col += c * line * mix(0.18, 0.78, depth) * (0.55 + crest * 0.7);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

export function createHoule(canvas, { horizon = 0.56, still = false } = {}) {
  const state = { audio: 0, mouse: [0.5, 0.5], wind: 0, running: false, raf: 0, t: Math.random() * 100, last: 0 };
  const small = window.matchMedia('(max-width: 700px)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25);
  let renderer, program, mesh, ctx2d, mode;

  const forceNoGL = /[?&]nowebgl\b/.test(location.search);
  if (!forceNoGL && webglAvailable()) {
    try {
      renderer = new Renderer({ canvas, dpr, alpha: false, antialias: false, powerPreference: 'low-power' });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 1);
      program = new Program(gl, {
        vertex, fragment: fragment(small ? 22 : 34),
        uniforms: { uTime: { value: 0 }, uRes: { value: [1, 1] }, uAudio: { value: 0 }, uMouse: { value: [0.5, 0.5] }, uWind: { value: 0 }, uHorizon: { value: horizon } },
      });
      mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
      mode = 'webgl';
    } catch (e) { renderer = null; }
  }
  if (!renderer) { ctx2d = canvas.getContext('2d'); mode = '2d'; }
  canvas.dataset.mode = mode;

  function resize() {
    const box = canvas.parentElement, w = box.clientWidth, h = box.clientHeight;
    canvas.style.width = '100%'; canvas.style.height = '100%';
    if (mode === 'webgl') { renderer.setSize(w, h); canvas.style.width = '100%'; canvas.style.height = '100%'; program.uniforms.uRes.value = [w, h]; }
    else { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  }

  function draw2d() {
    const w = canvas.width, h = canvas.height, c = ctx2d;
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const lines = small ? 18 : 28;
    for (let i = 0; i < lines; i++) {
      const fi = i / (lines - 1), depth = Math.pow(fi, 1.65);
      const baseY = h * (1 - (horizon - depth * (horizon + 0.06)));
      const amp = h * (0.0016 + 0.048 * depth) * (0.75 + state.audio * 1.9);
      c.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const xx = x / w * (w / h);
        const s = Math.sin(xx * (22 - 17.8 * depth) - state.t * (0.35 + depth * 0.9) + fi * 5) * 0.55 + Math.sin(xx * 9.1 + state.t * 0.3 + fi * 13) * 0.35;
        const y = baseY - s * amp;
        x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      const a = 0.18 + 0.55 * depth;
      c.strokeStyle = `rgba(220, 237, 242, ${a})`;
      c.lineWidth = (0.8 + 2.4 * depth) * dpr;
      c.stroke();
    }
  }

  function frame(now) {
    const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0.016;
    state.last = now;
    state.t += dt;
    if (mode === 'webgl') {
      const u = program.uniforms;
      u.uTime.value = state.t;
      u.uAudio.value += (state.audio - u.uAudio.value) * 0.12;
      u.uMouse.value[0] += (state.mouse[0] - u.uMouse.value[0]) * 0.06;
      u.uMouse.value[1] += (state.mouse[1] - u.uMouse.value[1]) * 0.06;
      u.uWind.value += (state.wind - u.uWind.value) * 0.05;
      renderer.render({ scene: mesh });
    } else draw2d();
    if (state.running) state.raf = requestAnimationFrame(frame);
  }

  const api = {
    mode,
    setAudio(v) { state.audio = v; },
    setPointer(x, y, inside) { state.mouse = [x, 1 - y]; state.wind = inside ? 1 : 0; },
    start() { if (state.running || still) return; state.running = true; state.last = 0; state.raf = requestAnimationFrame(frame); },
    stop() { state.running = false; cancelAnimationFrame(state.raf); },
    still(v) { still = v; if (v) { api.stop(); frame(performance.now()); } else api.start(); },
    renderOnce() { frame(performance.now()); },
    resize() { resize(); if (!state.running) frame(performance.now()); },
    destroy() {
      api.stop(); window.removeEventListener('resize', onResize);
      try { renderer && renderer.gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) {}
      if (canvas.isConnected) canvas.replaceWith(canvas.cloneNode(false));
    },
  };
  const onResize = () => api.resize();
  window.addEventListener('resize', onResize);
  resize();
  frame(performance.now());
  return api;
}
