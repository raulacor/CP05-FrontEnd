import * as THREE from 'three';
import { SCREEN, STAGE } from '../dims.js';
import { cameraTo, spotTo, textBeat, progress, stepStart, traceRect, bar, label } from '../helpers.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Step 4 · The screen: it comes forward, the camera pulls back, a person stands at its foot for scale. */
export function stepScreen(ctx, tl, dom) {
  const screen = ctx.parts.screen;
  const d = buildDiagram(ctx, screen.group);
  const t0 = stepStart(tl);

  cameraTo(tl, ctx, 'screen', t0, 0.7);
  tl.to(screen.group.position, { z: SCREEN.forward, duration: 0.55, ease: 'power2.inOut' }, t0 + 0.05);
  spotTo(tl, ctx, { x: 0, y: 48, z: 42, tx: 0, ty: 16, tz: SCREEN.forward, angle: 0.5 }, t0 + 0.05, 0.5);
  tl.to(ctx.levels, { glow: 1, key: 0.7, house: 0.5, duration: 0.45 }, t0 + 0.15);

  tl.set(d.group, { visible: true }, t0 + 0.4);
  tl.fromTo(d.human.scale, { y: 0.001 }, { y: 1, duration: 0.22, ease: 'back.out(2)' }, t0 + 0.48);
  progress(tl, d.outline.set, t0 + 0.6, 0.4);
  progress(tl, d.setDims, t0 + 0.85, 0.3);
  tl.fromTo(d.labelMats, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0 + 0.95);
  textBeat(tl, dom.steps.screen, t0 + 0.5, t0 + 1.35);

  // Steps back into the proscenium.
  tl.to(d.fadeMats, { opacity: 0, duration: 0.25 }, t0 + 1.35);
  tl.set(d.group, { visible: false }, t0 + 1.62);
  tl.to(screen.group.position, { z: 0, duration: 0.4, ease: 'power2.inOut' }, t0 + 1.35);
  tl.to(ctx.levels, { glow: 0.4, duration: 0.3 }, t0 + 1.4);
  tl.set({}, {}, t0 + 1.75);
}

function buildDiagram(ctx, parent) {
  const group = new THREE.Group();
  group.visible = false;
  parent.add(group);
  const lineMat = ctx.mats.line.clone();
  const z = 0.15;
  const top = SCREEN.bottom + SCREEN.h;

  // The full 1.43:1 frame, outlined in gold.
  const outline = traceRect(lineMat, SCREEN.w + 0.5, SCREEN.h + 0.5, 0.16);
  outline.group.position.set(0, SCREEN.cy, z);
  group.add(outline.group);

  // Dimension lines grow out from their centres.
  const yDim = top + 1.5;
  const xDim = SCREEN.w / 2 + 1.5;
  const parts = [
    bar(lineMat, V(0, yDim, z), V(-SCREEN.w / 2, yDim, z), 0.08),
    bar(lineMat, V(0, yDim, z), V(SCREEN.w / 2, yDim, z), 0.08),
    bar(lineMat, V(xDim, SCREEN.cy, z), V(xDim, top, z), 0.08),
    bar(lineMat, V(xDim, SCREEN.cy, z), V(xDim, SCREEN.bottom, z), 0.08),
  ];
  const ticks = [
    bar(lineMat, V(-SCREEN.w / 2, yDim - 0.7, z), V(-SCREEN.w / 2, yDim + 0.7, z), 0.08),
    bar(lineMat, V(SCREEN.w / 2, yDim - 0.7, z), V(SCREEN.w / 2, yDim + 0.7, z), 0.08),
    bar(lineMat, V(xDim - 0.7, top, z), V(xDim + 0.7, top, z), 0.08),
    bar(lineMat, V(xDim - 0.7, SCREEN.bottom, z), V(xDim + 0.7, SCREEN.bottom, z), 0.08),
  ];
  for (const p of [...parts, ...ticks]) group.add(p.mesh);
  const setDims = (p) => {
    for (const b of parts) b.set(p);
    for (const t of ticks) t.set(p > 0.96 ? 1 : 0);
  };
  setDims(0);

  const lw = label('40 m', 2.4);
  lw.position.set(0, yDim + 1.9, z);
  const lh = label('28 m', 2.4, { align: 'left' });
  lh.position.set(xDim + 1.0, SCREEN.cy, z);
  const lr = label('1.43 : 1', 1.9, { align: 'left', color: '#8a6d37' });
  lr.position.set(-SCREEN.w / 2 + 1.2, top - 2.2, z);

  // A 1.8 m person on the stage, for scale.
  const humanMat = new THREE.MeshStandardMaterial({ color: 0x050303, roughness: 0.6, transparent: true });
  const human = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 1.1, 4, 10), humanMat);
  body.position.y = 0.76;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), humanMat);
  head.position.y = 1.66;
  human.add(body, head);
  human.position.set(-14.2, STAGE.height, 0.9);
  const lp = label('1.8 m', 1.5, { align: 'left' });
  lp.position.set(-13.3, STAGE.height + 1.1, 0.95);
  group.add(lw, lh, lr, human, lp);

  const labelMats = [lw.material, lh.material, lr.material, lp.material];
  return { group, outline, setDims, human, labelMats, fadeMats: [lineMat, humanMat, ...labelMats] };
}
