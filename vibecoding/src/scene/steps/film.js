import * as THREE from 'three';
import { SCREEN } from '../dims.js';
import { cameraTo, spotTo, textBeat, progress, stepStart, traceRect, label } from '../helpers.js';

const MM = 0.09; // metres in the scene per millimetre of film
const IMAX = { gauge: 70, pitch: 15 * 4.75, frameW: 70.41, frameH: 52.63 }; // 15 perforations, runs sideways
const STD = { gauge: 35, pitch: 4 * 4.75, frameW: 24.89, frameH: 18.67 };    // 4 perforations, runs vertically

const STRIP = { x0: -30, x1: 28, z: 8 };
const FRAME_X = -3.5; // the 70mm frame that gets outlined
const STD_X = 4.2;    // where the 35mm strip comes down
const SPOOL_R = 2.2;

/** Step 3 · The film: a 70mm strip unspools across the screen, one frame outlined beside a 35mm frame. */
export function stepFilm(ctx, tl, dom) {
  const film = buildFilm(ctx);
  const t0 = stepStart(tl);

  cameraTo(tl, ctx, 'film', t0, 0.6);
  spotTo(tl, ctx, { x: -4, y: 40, z: 34, tx: 0, ty: SCREEN.cy, tz: STRIP.z, angle: 0.36 }, t0 + 0.1);
  tl.to(ctx.levels, { key: 1, glow: 0.07, house: 0.55, duration: 0.4 }, t0 + 0.12);

  tl.set(film.group, { visible: true }, t0 + 0.15);
  tl.to(film.clip, { constant: STRIP.x1, duration: 0.7, ease: 'power1.inOut' }, t0 + 0.22);
  tl.to(film.spool.rotation, { y: -Math.PI * 6, duration: 0.7, ease: 'power1.inOut' }, t0 + 0.22);
  tl.to(film.pack.scale, { x: 0.66, z: 0.66, duration: 0.7, ease: 'power1.inOut' }, t0 + 0.22);
  progress(tl, film.trace70.set, t0 + 0.8, 0.3);
  tl.fromTo(film.std.position, { y: 18 }, { y: 0, duration: 0.4, ease: 'power3.out' }, t0 + 0.85);
  progress(tl, film.trace35.set, t0 + 1.1, 0.18);
  tl.fromTo(film.labelMats, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0 + 1.0);
  textBeat(tl, dom.steps.film, t0 + 0.45, t0 + 1.3);

  // Steps back: the strip slides behind the screen.
  tl.to(film.group.position, { z: -4, y: SCREEN.cy + 2, duration: 0.35, ease: 'power2.in' }, t0 + 1.32);
  tl.to(film.fadeMats, { opacity: 0, duration: 0.3 }, t0 + 1.35);
  tl.set(film.group, { visible: false }, t0 + 1.68);
  tl.set({}, {}, t0 + 1.7);
}

function buildFilm(ctx) {
  const { mats } = ctx;
  const group = new THREE.Group();
  group.position.set(0, SCREEN.cy, 0);
  group.visible = false;
  ctx.scene.add(group);

  // 70mm strip, revealed left to right by a moving clipping plane.
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), STRIP.x0);
  const len = STRIP.x1 - STRIP.x0;
  const tex70 = filmTexture(IMAX, 'h');
  tex70.repeat.set(len / (IMAX.pitch * MM), 1);
  const u0 = (FRAME_X - STRIP.x0) / len;
  tex70.offset.x = 0.5 - ((u0 * tex70.repeat.x) % 1);
  const stripMat = filmMaterial(tex70, [clip]);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, IMAX.gauge * MM), stripMat);
  strip.position.set((STRIP.x0 + STRIP.x1) / 2, 0, STRIP.z);
  group.add(strip);

  // The spool it comes off.
  const spool = new THREE.Group();
  spool.position.set(STRIP.x0, 0, STRIP.z - SPOOL_R);
  const pack = new THREE.Mesh(new THREE.CylinderGeometry(SPOOL_R, SPOOL_R, IMAX.gauge * MM - 0.2, 40), mats.film);
  const flangeGeo = new THREE.CylinderGeometry(SPOOL_R + 0.35, SPOOL_R + 0.35, 0.12, 40);
  const top = new THREE.Mesh(flangeGeo, mats.gold);
  top.position.y = (IMAX.gauge * MM) / 2;
  const bottom = new THREE.Mesh(flangeGeo, mats.gold);
  bottom.position.y = -(IMAX.gauge * MM) / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, IMAX.gauge * MM + 0.4, 16), mats.gold);
  spool.add(pack, top, bottom, hub);
  group.add(spool);

  const lineMat = mats.line.clone();
  const trace70 = traceRect(lineMat, IMAX.frameW * MM + 0.16, IMAX.frameH * MM + 0.16, 0.08);
  trace70.group.position.set(FRAME_X, 0, STRIP.z + 0.05);
  group.add(trace70.group);

  // 35mm strip at the same scale, dropping in vertically.
  const stdLen = 10;
  const tex35 = filmTexture(STD, 'v');
  tex35.repeat.set(1, stdLen / (STD.pitch * MM));
  tex35.offset.y = 0.5 - ((0.5 * tex35.repeat.y) % 1);
  const stdMat = filmMaterial(tex35, []);
  const std = new THREE.Group();
  const stdStrip = new THREE.Mesh(new THREE.PlaneGeometry(STD.gauge * MM, stdLen), stdMat);
  std.add(stdStrip);
  const trace35 = traceRect(lineMat, STD.frameW * MM + 0.12, STD.frameH * MM + 0.12, 0.06);
  trace35.group.position.z = 0.05;
  std.add(trace35.group);
  const stdHolder = new THREE.Group();
  stdHolder.position.set(STD_X, 0, STRIP.z + 0.35);
  stdHolder.add(std);
  group.add(stdHolder);

  // Both labels sit below the strips, clear of the film.
  const below = -stdLen / 2 - 0.7;
  const l70 = label('70 mm · 15 perf', 0.6);
  l70.position.set(FRAME_X, below, STRIP.z + 0.1);
  const l35 = label('35 mm · 4 perf', 0.6);
  l35.position.set(STD_X, below, STRIP.z + 0.4);
  group.add(l70, l35);

  const labelMats = [l70.material, l35.material];
  return {
    group, clip, spool, pack, trace70, trace35, std, labelMats,
    fadeMats: [stripMat, stdMat, lineMat, ...labelMats],
  };
}

function filmMaterial(map, clippingPlanes) {
  return new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.6,
    roughness: 0.45, metalness: 0, envMapIntensity: 0.6,
    transparent: true, side: THREE.DoubleSide, clippingPlanes,
  });
}

/** One frame of film as a repeating tile: base, perforations, picture area and edge print. */
function filmTexture(spec, run) {
  const pxmm = 14.4;
  const along = spec.pitch * pxmm;
  const across = spec.gauge * pxmm;
  const W = Math.round(run === 'h' ? along : across);
  const H = Math.round(run === 'h' ? across : along);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#1c0f08';
  g.fillRect(0, 0, W, H);

  const perfs = spec.pitch / 4.75;
  const pa = 1.98 * pxmm; // along the film
  const pc = 2.79 * pxmm; // across the film
  const inset = (spec.gauge === 70 ? 2.4 : 2.0) * pxmm;
  g.fillStyle = 'rgba(240, 226, 196, 0.82)';
  for (let i = 0; i < perfs; i++) {
    const a = (i + 0.5) * 4.75 * pxmm - pa / 2;
    if (run === 'h') {
      roundRect(g, a, inset, pa, pc, pa * 0.25);
      roundRect(g, a, H - inset - pc, pa, pc, pa * 0.25);
    } else {
      roundRect(g, inset, a, pc, pa, pa * 0.25);
      roundRect(g, W - inset - pc, a, pc, pa, pa * 0.25);
    }
  }

  const fw = (run === 'h' ? spec.frameW : spec.frameW) * pxmm;
  const fh = spec.frameH * pxmm;
  const x = (W - fw) / 2;
  const y = (H - fh) / 2;
  paintFrame(g, x, y, fw, fh);

  g.fillStyle = 'rgba(214, 170, 96, 0.75)';
  g.font = `500 ${Math.round(1.5 * pxmm)}px "Jost Variable", Jost, sans-serif`;
  g.textBaseline = 'middle';
  if (run === 'h') g.fillText('LAST STOP  ·  IMAX 15/70', 4 * pxmm, H - 6.6 * pxmm);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

/** A dusk horizon, abstract enough to read as "a picture" at any size. */
function paintFrame(g, x, y, w, h) {
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, Math.min(w, h) * 0.02);
  g.clip();
  g.fillStyle = '#3d1708';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#7a3313';
  g.fillRect(x, y + h * 0.38, w, h * 0.3);
  g.fillStyle = '#c4672a';
  g.fillRect(x, y + h * 0.52, w, h * 0.16);
  g.fillStyle = '#ffd38a';
  g.beginPath();
  g.arc(x + w * 0.64, y + h * 0.6, h * 0.11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2a0e05';
  g.beginPath();
  g.moveTo(x, y + h * 0.66);
  g.quadraticCurveTo(x + w * 0.3, y + h * 0.56, x + w * 0.55, y + h * 0.68);
  g.quadraticCurveTo(x + w * 0.8, y + h * 0.6, x + w, y + h * 0.64);
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.fill();
  g.fillStyle = '#0f0503';
  g.beginPath();
  g.moveTo(x, y + h * 0.8);
  g.quadraticCurveTo(x + w * 0.45, y + h * 0.7, x + w * 0.75, y + h * 0.8);
  g.quadraticCurveTo(x + w * 0.9, y + h * 0.84, x + w, y + h * 0.8);
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.fill();
  g.restore();
}
