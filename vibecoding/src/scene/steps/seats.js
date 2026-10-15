import * as THREE from 'three';
import { SCREEN, RAKE, BALCONY, EYE } from '../dims.js';
import { cameraTo, spotTo, textBeat, progress, stepStart, bar } from '../helpers.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Step 7 · The seats: the rows fan apart to show the rake, then settle while gold sightlines draw to the screen. */
export function stepSeats(ctx, tl, dom) {
  const { rows, balcony } = ctx.parts;
  const lines = buildSightlines(ctx);
  const t0 = stepStart(tl);

  cameraTo(tl, ctx, 'seats', t0, 0.75);
  spotTo(tl, ctx, { x: 34, y: 46, z: 28, tx: 0, ty: 6, tz: 28, angle: 0.42 }, t0 + 0.1, 0.5);
  tl.to(ctx.levels, { key: 1, house: 0.5, glow: 0.5, duration: 0.4 }, t0 + 0.15);

  const spread = (r) => (r.balcony ? RAKE.rows + r.index : r.index);
  const offset = (k) => ({ y: k * 0.42, z: k * 0.55 });
  for (const r of rows) {
    const k = spread(r);
    const o = offset(k);
    tl.to(r.group.position, { y: r.home.y + o.y, z: r.home.z + o.z, duration: 0.42, ease: 'power2.out' }, t0 + 0.35 + k * 0.012);
    tl.to(r.group.position, { y: r.home.y, z: r.home.z, duration: 0.35, ease: 'power2.inOut' }, t0 + 0.95 + k * 0.006);
  }
  const ob = offset(RAKE.rows);
  tl.to(balcony.group.position, { y: balcony.home.y + ob.y, z: balcony.home.z + ob.z, duration: 0.42, ease: 'power2.out' }, t0 + 0.35 + RAKE.rows * 0.012);
  tl.to(balcony.group.position, { y: balcony.home.y, z: balcony.home.z, duration: 0.35, ease: 'power2.inOut' }, t0 + 0.95 + RAKE.rows * 0.006);

  tl.set(lines.group, { visible: true }, t0 + 1.08);
  lines.items.forEach((l, i) => progress(tl, l.set, t0 + 1.1 + i * 0.05, 0.26));
  textBeat(tl, dom.steps.seats, t0 + 0.55, t0 + 1.42);

  tl.to(lines.mat, { opacity: 0, duration: 0.22 }, t0 + 1.48);
  tl.set(lines.group, { visible: false }, t0 + 1.72);
  tl.set({}, {}, t0 + 1.8);
}

/** Sightlines from the front row, back row and balcony to the top and bottom of the screen. */
function buildSightlines(ctx) {
  const group = new THREE.Group();
  group.visible = false;
  ctx.scene.add(group);
  const mat = ctx.mats.line.clone();
  const eyes = [
    V(0, EYE, RAKE.z0),
    V(0, (RAKE.rows - 1) * RAKE.dy + EYE, RAKE.z0 + (RAKE.rows - 1) * RAKE.dz),
    V(0, BALCONY.y0 + EYE, BALCONY.z0),
  ];
  const topEdge = V(0, SCREEN.bottom + SCREEN.h, 0.1);
  const bottomEdge = V(0, SCREEN.bottom, 0.1);
  const items = [];
  const dotGeo = new THREE.SphereGeometry(0.32, 12, 10);
  for (const e of eyes) {
    for (const edge of [topEdge, bottomEdge]) {
      const b = bar(mat, e, edge, 0.09);
      group.add(b.mesh);
      items.push(b);
    }
    const dot = new THREE.Mesh(dotGeo, mat);
    dot.position.copy(e);
    dot.renderOrder = 11;
    group.add(dot);
  }
  return { group, items, mat };
}
