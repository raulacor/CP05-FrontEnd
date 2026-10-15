import { ROOM, EXPLODE } from '../dims.js';
import { cameraTo, textBeat } from '../helpers.js';

/** Step 2 · The room comes apart: walls and ceiling draw away, the camera rises above it all. */
export function explodeRoom(ctx, tl, dom) {
  const t0 = tl.duration();
  const { left, right, ceiling, back } = ctx.parts.walls;
  const move = { duration: 0.65, ease: 'power2.inOut' };
  // Rise straight up out of the back row first (clear of the balcony), then swing out above the room.
  cameraTo(tl, ctx, 'rise', t0, 0.4, 'power2.in');
  cameraTo(tl, ctx, 'overview', t0 + 0.4, 0.6, 'power2.out');
  tl.to(left.group.position, { x: -ROOM.halfW - EXPLODE.side, ...move }, t0 + 0.2);
  tl.to(right.group.position, { x: ROOM.halfW + EXPLODE.side, ...move }, t0 + 0.2);
  tl.to(ceiling.group.position, { y: ROOM.height + EXPLODE.ceiling, ...move }, t0 + 0.25);
  tl.to(back.group.position, { z: EXPLODE.back, ...move }, t0 + 0.3);
  tl.to(ctx.levels, { house: 0.75, glow: 0.5, stage: 0, duration: 0.5 }, t0 + 0.2);
  textBeat(tl, dom.caption, t0 + 0.32, t0 + 0.86);
  tl.set({}, {}, t0 + 1.05);
}
