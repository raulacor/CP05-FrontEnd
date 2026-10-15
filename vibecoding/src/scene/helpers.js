import * as THREE from 'three';
import { shot } from './shots.js';

// ---------- Timeline helpers ----------

/** Fade a text panel in at tIn and out at tOut (both directions on scroll). */
export function textBeat(tl, el, tIn, tOut, dy = 18) {
  if (!el) return;
  tl.fromTo(el, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, tIn);
  tl.to(el, { opacity: 0, y: -dy, duration: 0.18, ease: 'power2.in' }, tOut);
}

/** Move the camera rig to a named shot. */
export function cameraTo(tl, ctx, name, at, duration, ease = 'power2.inOut') {
  tl.to(ctx.rig, { ...shot(name), duration, ease }, at);
}

/** Move and aim the feature spotlight. */
export function spotTo(tl, ctx, params, at, duration = 0.45) {
  tl.to(ctx.key, { ...params, duration, ease: 'power2.inOut' }, at);
}

/** Tween a 0→1 progress value and hand it to a setter (for traces drawn over time). */
export function progress(tl, setter, at, duration, ease = 'power1.inOut', from = 0, to = 1) {
  const proxy = { p: from };
  setter(from);
  tl.to(proxy, { p: to, duration, ease, onUpdate: () => setter(proxy.p) }, at);
}

/** Start each step slightly before the previous one ends, so one part steps back as the next arrives. */
export function stepStart(tl, overlap = 0.2) {
  return Math.max(0, tl.duration() - overlap);
}

// ---------- Text on canvas ----------

const FONTS = {
  label: (px) => `500 ${px}px "Jost Variable", Jost, Futura, sans-serif`,
  serif: (px) => `italic 400 ${px}px "Bodoni Moda Variable", "Bodoni Moda", Didot, serif`,
};

function drawTracked(c, text, x, y, tracking) {
  if (!tracking) { c.fillText(text, x, y); return; }
  let cx = x;
  for (const ch of text) {
    c.fillText(ch, cx, y);
    cx += c.measureText(ch).width + tracking;
  }
}
function measureTracked(c, text, tracking) {
  let w = 0;
  for (const ch of text) w += c.measureText(ch).width + tracking;
  return w - tracking;
}

/** A transparent canvas texture holding one line of gold text. Returns the texture and its aspect. */
export function textTexture(text, { style = 'label', px = 96, color = '#f2d08a', tracking = 0.2, upper = true } = {}) {
  const t = upper ? text.toUpperCase() : text;
  const c = document.createElement('canvas').getContext('2d');
  c.font = FONTS[style](px);
  const track = tracking * px;
  const pad = px * 0.35;
  const w = Math.ceil(measureTracked(c, t, track) + pad * 2);
  const h = Math.ceil(px * 1.5);
  c.canvas.width = w;
  c.canvas.height = h;
  c.font = FONTS[style](px);
  c.fillStyle = color;
  c.textBaseline = 'middle';
  drawTracked(c, t, pad, h / 2, track);
  const tex = new THREE.CanvasTexture(c.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: w / h };
}

/** A flat label in world space, `height` metres tall. Always drawn on top of the scene. */
export function label(text, height, opts = {}) {
  const { texture, aspect } = textTexture(text, opts);
  const mat = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
  mesh.renderOrder = 20;
  if (opts.align === 'left') mesh.geometry.translate((height * aspect) / 2, 0, 0);
  if (opts.align === 'right') mesh.geometry.translate(-(height * aspect) / 2, 0, 0);
  return mesh;
}

// ---------- Diagram lines ----------

const UP = new THREE.Vector3(0, 1, 0);
const unitBar = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/** A thin bar from a to b that can grow from a (set(0..1)). */
export function bar(material, a, b, thickness = 0.12) {
  const mesh = new THREE.Mesh(unitBar, material);
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  mesh.renderOrder = 10;
  mesh.userData.len = len;
  mesh.userData.thickness = thickness;
  const set = (p) => {
    mesh.scale.set(thickness, Math.max(1e-4, len * p), thickness);
    mesh.visible = p > 0.001;
  };
  set(1);
  return { mesh, set };
}

/**
 * A rectangle outline (w × h, centred on the origin, in the XY plane) traced clockwise
 * from its top-left corner as progress goes 0 → 1.
 */
export function traceRect(material, w, h, thickness = 0.14) {
  const group = new THREE.Group();
  const hw = w / 2;
  const hh = h / 2;
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  const corners = [V(-hw - thickness / 2, hh), V(hw, hh), V(hw, -hh), V(-hw, -hh), V(-hw, hh + thickness / 2)];
  const edges = [];
  for (let i = 0; i < 4; i++) {
    const e = bar(material, corners[i], corners[i + 1], thickness);
    group.add(e.mesh);
    edges.push({ ...e, len: corners[i].distanceTo(corners[i + 1]) });
  }
  const total = edges.reduce((s, e) => s + e.len, 0);
  const set = (p) => {
    let remaining = p * total;
    for (const e of edges) {
      const q = Math.min(1, Math.max(0, remaining / e.len));
      e.set(q);
      remaining -= e.len;
    }
  };
  set(1);
  return { group, set };
}

// ---------- Glows ----------

let glowTex = null;
/** Soft radial dot used for lamp glows (additive sprites). */
export function glowTexture() {
  if (glowTex) return glowTex;
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,214,150,1)');
  grd.addColorStop(0.25, 'rgba(255,170,90,0.45)');
  grd.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** One Points object holding many lamp glows. */
export function glowPoints(positions, size, opacity = 0.8) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions.flatMap((p) => [p.x, p.y, p.z]), 3));
  const mat = new THREE.PointsMaterial({
    map: glowTexture(), size, sizeAttenuation: true, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 5;
  return pts;
}
