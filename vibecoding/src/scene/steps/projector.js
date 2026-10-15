import { cameraTo, spotTo, textBeat, progress, stepStart } from '../helpers.js';

/** Step 5 · The projector rises out of the booth, its beam appears and the film path is traced in gold. */
export function stepProjector(ctx, tl, dom) {
  const p = ctx.parts.projector;
  const t0 = stepStart(tl);

  cameraTo(tl, ctx, 'projector', t0, 0.75);
  spotTo(tl, ctx, { x: -16, y: 44, z: 36, tx: 0, ty: 27, tz: p.home.z, angle: 0.24 }, t0 + 0.1, 0.5);
  tl.to(ctx.levels, { key: 1, glow: 0.3, house: 0.45, duration: 0.4 }, t0 + 0.2);

  tl.to(p.group.position, { y: p.home.y + 9.2, duration: 0.55, ease: 'power2.out' }, t0 + 0.3);
  tl.to(ctx.levels, { beam: 1, duration: 0.3 }, t0 + 0.75);
  tl.set(p.path, { visible: true }, t0 + 0.8);
  progress(tl, p.setPath, t0 + 0.8, 0.45, 'none');
  tl.to(p.reels.map((r) => r.rotation), { x: -Math.PI * 4, duration: 0.9, ease: 'none' }, t0 + 0.55);
  textBeat(tl, dom.steps.projector, t0 + 0.55, t0 + 1.38);

  // Steps back down into the booth.
  tl.to(ctx.levels, { beam: 0, duration: 0.25 }, t0 + 1.38);
  tl.set(p.path, { visible: false }, t0 + 1.45);
  tl.to(p.group.position, { y: p.home.y, duration: 0.4, ease: 'power2.inOut' }, t0 + 1.4);
  tl.set({}, {}, t0 + 1.8);
}
