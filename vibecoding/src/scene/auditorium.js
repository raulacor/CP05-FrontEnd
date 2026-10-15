import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SCREEN, ROOM, STAGE, PROSC, RAKE, BALCONY, BOOTH } from './dims.js';
import { makeScreenMaterial, placeholderTexture } from './screen-material.js';
import { traceRect, glowPoints, bar } from './helpers.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const UP = V(0, 1, 0);

/** The auditorium, built from simple low-poly parts. Parts that the story animates go into ctx.parts. */
export function buildAuditorium(ctx) {
  const { parts } = ctx;
  buildFloor(ctx);
  parts.walls = {
    left: buildSideWall(ctx, -1),
    right: buildSideWall(ctx, 1),
    ceiling: buildCeiling(ctx),
    back: buildBackWall(ctx),
  };
  buildProscenium(ctx);
  buildStage(ctx);
  parts.screen = buildScreen(ctx);
  parts.rows = buildSeating(ctx);
  parts.balcony = buildBalcony(ctx);
  buildBooth(ctx);
  parts.projector = buildProjector(ctx);
  parts.beam = buildBeam(ctx);
  parts.speakers = buildSpeakers(ctx);
}

// ---------------------------------------------------------------- floor & walls

function buildFloor({ scene, mats }) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.back - ROOM.front), mats.carpet);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (ROOM.back + ROOM.front) / 2);
  scene.add(floor);
}

function buildSideWall(ctx, side) {
  const { scene, mats, lite, lights } = ctx;
  const group = new THREE.Group();
  group.position.x = side * ROOM.halfW;
  scene.add(group);

  const inward = -side;
  const z0 = PROSC.z + PROSC.depth;
  const z1 = ROOM.back;
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, ROOM.height), mats.wallVelvet);
  panel.rotation.y = inward * Math.PI / 2;
  panel.position.set(0, ROOM.height / 2, zc);
  group.add(panel);

  // Black lacquer pilasters with gold capitals and bases.
  const zs = lite ? [11, 24, 37] : [8, 14.5, 21, 27.5, 34, 40.5];
  const m = new THREE.Matrix4();
  const pil = new THREE.InstancedMesh(box(0.8, ROOM.height, 1.4), mats.lacquer, zs.length);
  const caps = new THREE.InstancedMesh(box(1.05, 0.5, 1.75), mats.gold, zs.length * 2);
  zs.forEach((z, i) => {
    pil.setMatrixAt(i, m.makeTranslation(inward * 0.4, ROOM.height / 2, z));
    caps.setMatrixAt(i * 2, m.makeTranslation(inward * 0.5, 33.6, z));
    caps.setMatrixAt(i * 2 + 1, m.makeTranslation(inward * 0.5, 2.6, z));
  });
  group.add(pil, caps);

  const cornice = new THREE.Mesh(box(0.8, 0.55, len), mats.gold);
  cornice.position.set(inward * 0.4, 36.4, zc);
  const dado = new THREE.Mesh(box(0.25, 0.2, len), mats.brushedGold);
  dado.position.set(inward * 0.13, 4.4, zc);
  const cove = new THREE.Mesh(box(0.12, 0.14, len), mats.coveGlow);
  cove.position.set(inward * 0.85, 35.9, zc);
  group.add(cornice, dado, cove);

  // Fan sconces between the pilasters.
  const sz = [];
  for (let i = 0; i < zs.length - 1; i++) sz.push((zs[i] + zs[i + 1]) / 2);
  const face = new THREE.Quaternion().setFromAxisAngle(UP, inward * Math.PI / 2);
  const one = V(1, 1, 1);
  const plate = new THREE.InstancedMesh(new THREE.CircleGeometry(0.85, 20, 0, Math.PI), mats.gold, sz.length);
  const lamp = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 16, 0, Math.PI), mats.sconceGlow, sz.length);
  const glowAt = [];
  sz.forEach((z, i) => {
    plate.setMatrixAt(i, m.compose(V(inward * 0.06, 8.6, z), face, one));
    lamp.setMatrixAt(i, m.compose(V(inward * 0.1, 8.62, z), face, one));
    glowAt.push(V(inward * 0.7, 8.9, z));
  });
  group.add(plate, lamp, glowPoints(glowAt, 5.5, 0.75));

  if (!lite) {
    for (const i of [Math.floor(sz.length / 2)]) {
      const l = new THREE.PointLight(0xffa452, 0, 18, 2);
      l.position.set(inward * 1.6, 9.2, sz[i]);
      group.add(l);
      lights.sconces.push(l);
    }
  }

  ctx.addCutaway(group, [0, ROOM.height / 2, zc], [inward, 0, 0]);
  return { group, home: group.position.clone() };
}

function buildCeiling(ctx) {
  const { scene, mats, lite } = ctx;
  const group = new THREE.Group();
  group.position.y = ROOM.height;
  scene.add(group);
  const len = ROOM.back - ROOM.front;
  const zc = (ROOM.back + ROOM.front) / 2;

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, len), mats.lacquer);
  plane.rotation.x = Math.PI / 2;
  plane.position.z = zc;
  group.add(plane);

  const ribX = lite ? [-14, 14] : [-14, 0, 14];
  for (const x of ribX) {
    const r = new THREE.Mesh(box(0.4, 0.5, len), mats.gold);
    r.position.set(x, -0.25, zc);
    group.add(r);
  }
  if (!lite) {
    for (const z of [6, 15, 24, 33, 42]) {
      const r = new THREE.Mesh(box(ROOM.halfW * 2, 0.5, 0.4), mats.brushedGold);
      r.position.set(0, -0.25, z);
      group.add(r);
    }
  }
  for (const s of [-1, 1]) {
    const cove = new THREE.Mesh(box(0.15, 0.14, len), mats.coveGlow);
    cove.position.set(s * (ROOM.halfW - 0.8), -0.7, zc);
    group.add(cove);
  }

  ctx.addCutaway(group, [0, 0, zc], [0, -1, 0]);
  return { group, home: group.position.clone() };
}

function buildBackWall(ctx) {
  const { scene, mats } = ctx;
  const group = new THREE.Group();
  scene.add(group);
  const { win } = BOOTH;

  const shape = new THREE.Shape();
  shape.moveTo(-ROOM.halfW, 0);
  shape.lineTo(ROOM.halfW, 0);
  shape.lineTo(ROOM.halfW, ROOM.height);
  shape.lineTo(-ROOM.halfW, ROOM.height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-win.halfW, win.y0);
  hole.lineTo(-win.halfW, win.y1);
  hole.lineTo(win.halfW, win.y1);
  hole.lineTo(win.halfW, win.y0);
  hole.closePath();
  shape.holes.push(hole);

  const wall = new THREE.Mesh(new THREE.ShapeGeometry(shape), mats.wallVelvet);
  wall.rotation.y = Math.PI;
  wall.position.z = ROOM.back;
  group.add(wall);

  const frame = traceRect(mats.gold, win.halfW * 2 + 0.5, win.y1 - win.y0 + 0.5, 0.22);
  frame.group.position.set(0, (win.y0 + win.y1) / 2, ROOM.back - 0.12);
  const cornice = new THREE.Mesh(box(ROOM.halfW * 2, 0.55, 0.8), mats.gold);
  cornice.position.set(0, 36.4, ROOM.back - 0.4);
  group.add(frame.group, cornice);

  ctx.addCutaway(group, [0, ROOM.height / 2, ROOM.back], [0, 0, -1]);
  return { group, home: group.position.clone() };
}

// ---------------------------------------------------------------- proscenium, stage, screen

function buildProscenium(ctx) {
  const { scene, mats, lite } = ctx;
  const shape = new THREE.Shape();
  shape.moveTo(-ROOM.halfW, 0);
  shape.lineTo(ROOM.halfW, 0);
  shape.lineTo(ROOM.halfW, ROOM.height);
  shape.lineTo(-ROOM.halfW, ROOM.height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-PROSC.openHalfW, PROSC.openBottom);
  hole.lineTo(-PROSC.openHalfW, PROSC.openTop);
  hole.lineTo(PROSC.openHalfW, PROSC.openTop);
  hole.lineTo(PROSC.openHalfW, PROSC.openBottom);
  hole.closePath();
  shape.holes.push(hole);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: PROSC.depth, bevelEnabled: false, curveSegments: 1 }), mats.lacquer);
  frame.position.z = PROSC.z;
  scene.add(frame);

  // Stepped Art Deco trims around the opening.
  const zf = PROSC.z + PROSC.depth + 0.04;
  const cy = (PROSC.openBottom + PROSC.openTop) / 2;
  const ow = PROSC.openHalfW * 2;
  const oh = PROSC.openTop - PROSC.openBottom;
  const steps = lite ? [0.4, 1.4] : [0.4, 1.15, 1.95];
  steps.forEach((o, i) => {
    const r = traceRect(i === 0 ? mats.gold : mats.brushedGold, ow + o * 2, oh + o * 2, i === 0 ? 0.24 : 0.14);
    r.group.position.set(0, cy, zf + i * 0.02);
    scene.add(r.group);
  });

  // Vertical flutes on the side bands.
  const xs = [24.4, 25.4, 26.4];
  const flutes = new THREE.InstancedMesh(box(0.13, 30, 0.12), mats.brushedGold, xs.length * 2);
  const m = new THREE.Matrix4();
  xs.forEach((x, i) => {
    flutes.setMatrixAt(i * 2, m.makeTranslation(-x, 17, zf));
    flutes.setMatrixAt(i * 2 + 1, m.makeTranslation(x, 17, zf));
  });
  scene.add(flutes);

  // The house emblem: a gold sunburst fan above the opening.
  const fan = new THREE.Group();
  fan.position.set(0, 35.55, zf + 0.12);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 6, 40, Math.PI), mats.gold);
  const arc2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.05, 6, 32, Math.PI), mats.gold);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20, 0, Math.PI), mats.gold);
  const base = new THREE.Mesh(box(5.2, 0.1, 0.1), mats.gold);
  fan.add(arc, arc2, hub, base);
  for (let i = 1; i <= 7; i++) {
    const a = (i / 8) * Math.PI;
    fan.add(bar(mats.gold, V(0, 0, 0), V(Math.cos(a) * 2.15, Math.sin(a) * 2.15, 0), 0.07).mesh);
  }
  scene.add(fan);
}

function buildStage(ctx) {
  const { scene, mats } = ctx;
  const deck = new THREE.Mesh(box(STAGE.halfW * 2, STAGE.height, STAGE.z1 - STAGE.z0), mats.lacquer);
  deck.position.set(0, STAGE.height / 2, (STAGE.z0 + STAGE.z1) / 2);
  const nosing = new THREE.Mesh(box(STAGE.halfW * 2, 0.12, 0.14), mats.gold);
  nosing.position.set(0, STAGE.height, STAGE.z1 + 0.02);
  const band = new THREE.Mesh(box(STAGE.halfW * 2, 0.08, 0.05), mats.brushedGold);
  band.position.set(0, 0.35, STAGE.z1 + 0.03);
  const strip = new THREE.Mesh(box(STAGE.halfW * 2 - 4, 0.08, 0.25), mats.sconceGlow);
  strip.position.set(0, STAGE.height + 0.05, STAGE.z1 - 0.4);
  scene.add(deck, nosing, band, strip);

  const lamps = [];
  for (let x = -20; x <= 20; x += 2.5) lamps.push(V(x, STAGE.height + 0.25, STAGE.z1 - 0.35));
  const glow = glowPoints(lamps, 1.8, 0.6);
  scene.add(glow);
  ctx.onFrame(() => { glow.material.opacity = 0.15 + 0.6 * Math.max(ctx.levels.stage, ctx.levels.house * 0.5); });
}

function buildScreen(ctx) {
  const { scene, mats, lite } = ctx;
  const group = new THREE.Group();
  scene.add(group);
  const placeholder = placeholderTexture();
  const material = makeScreenMaterial(placeholder);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), material);
  mesh.position.set(0, SCREEN.cy, 0);
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w + 1.6, SCREEN.h + 1.6), mats.masking);
  mask.position.set(0, SCREEN.cy, -0.05);
  group.add(mesh, mask);

  let light;
  if (lite) {
    light = new THREE.PointLight(0xfff1dc, 0, 0, 2);
    light.position.set(0, SCREEN.cy, 9);
  } else {
    light = new THREE.RectAreaLight(0xfff1dc, 0, SCREEN.w, SCREEN.h);
    light.position.set(0, SCREEN.cy, 0.3);
    light.lookAt(0, SCREEN.cy, 10);
  }
  group.add(light);
  ctx.track(placeholder);
  return { group, mesh, material, light, placeholder, home: group.position.clone() };
}

// ---------------------------------------------------------------- seating

function seatGeometry() {
  const cushion = box(0.62, 0.2, 0.56).translate(0, 0.5, 0);
  const back = box(0.62, 0.82, 0.14).rotateX(0.2).translate(0, 0.98, 0.3);
  const armL = box(0.08, 0.3, 0.6).translate(-0.35, 0.68, 0.02);
  const armR = box(0.08, 0.3, 0.6).translate(0.35, 0.68, 0.02);
  const base = box(0.52, 0.42, 0.44).translate(0, 0.21, 0.04);
  const velvet = mergeGeometries([cushion, back]);
  const frame = mergeGeometries([armL, armR, base]);
  return mergeGeometries([velvet, frame], true); // group 0 = velvet, group 1 = lacquer
}

function curvedBlock(width, height, depth, radius, material) {
  const geo = new THREE.BoxGeometry(width, height, depth, 28, 1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, p.getZ(i) + (radius - Math.sqrt(radius * radius - x * x)));
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function makeRow(ctx, geo, o) {
  const { scene, mats, lite } = ctx;
  const group = new THREE.Group();
  group.position.set(0, o.y, o.z);
  const seats = new THREE.InstancedMesh(geo, [mats.seatVelvet, mats.seatFrame], o.n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = V(1, 1, 1);
  for (let k = 0; k < o.n; k++) {
    const x = (k - (o.n - 1) / 2) * o.pitch;
    const z = o.curve - Math.sqrt(o.curve * o.curve - x * x);
    q.setFromAxisAngle(UP, Math.atan2(x, o.curve));
    seats.setMatrixAt(k, m.compose(V(x, 0, z), q, one));
  }
  seats.computeBoundingSphere();
  group.add(seats);
  if (o.rise > 0.05) {
    const riser = curvedBlock(o.width, o.rise, o.depth, o.curve, mats.carpet);
    riser.position.y = -o.rise / 2;
    group.add(riser);
  }
  if (!lite) {
    // Aisle step lights along each tread edge.
    const edge = curvedBlock(o.width, 0.05, 0.06, o.curve, mats.coveGlow);
    edge.position.set(0, 0.03, -o.depth / 2 + 0.03);
    group.add(edge);
  }
  scene.add(group);
  return { group, home: group.position.clone(), index: o.index, balcony: o.balcony };
}

function buildSeating(ctx) {
  const geo = seatGeometry();
  const rows = [];
  for (let i = 0; i < RAKE.rows; i++) {
    rows.push(makeRow(ctx, geo, {
      n: RAKE.seats, pitch: RAKE.pitch, curve: RAKE.curve, width: RAKE.width, depth: RAKE.dz,
      z: RAKE.z0 + i * RAKE.dz, y: i * RAKE.dy, rise: i * RAKE.dy, index: i, balcony: false,
    }));
  }
  for (let j = 0; j < BALCONY.rows; j++) {
    rows.push(makeRow(ctx, geo, {
      n: BALCONY.seats, pitch: BALCONY.pitch, curve: BALCONY.curve, width: BALCONY.width, depth: BALCONY.dz,
      z: BALCONY.z0 + j * BALCONY.dz, y: BALCONY.y0 + j * BALCONY.dy, rise: j * BALCONY.dy, index: j, balcony: true,
    }));
  }
  return rows;
}

function buildBalcony(ctx) {
  const { scene, mats, lite } = ctx;
  const group = new THREE.Group();
  scene.add(group);
  const depth = ROOM.back - BALCONY.front;
  const slab = new THREE.Mesh(box(ROOM.halfW * 2, 0.8, depth), mats.lacquer);
  slab.position.set(0, BALCONY.y0 - 0.4, BALCONY.front + depth / 2);
  const parapet = new THREE.Mesh(box(ROOM.halfW * 2, 1.1, 0.4), mats.wallVelvet);
  parapet.position.set(0, BALCONY.y0 + 0.55, BALCONY.front + 0.2);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, ROOM.halfW * 2, 12).rotateZ(Math.PI / 2), mats.gold);
  rail.position.set(0, BALCONY.y0 + 1.15, BALCONY.front + 0.2);
  const fascia = new THREE.Mesh(box(ROOM.halfW * 2, 0.14, 0.05), mats.gold);
  fascia.position.set(0, BALCONY.y0 - 0.55, BALCONY.front - 0.03);
  group.add(slab, parapet, rail, fascia);

  const lamps = [];
  for (let x = -24; x <= 24; x += lite ? 12 : 6) lamps.push(V(x, BALCONY.y0 - 1.1, BALCONY.front + 0.8));
  group.add(glowPoints(lamps, 2.4, 0.55));

  // The wall behind the stalls, under the balcony.
  const partition = new THREE.Mesh(box(ROOM.halfW * 2, BALCONY.y0 - 0.8, 0.5), mats.lacquer);
  partition.position.set(0, (BALCONY.y0 - 0.8) / 2, 33.6);
  scene.add(partition);
  return { group, home: group.position.clone() };
}

// ---------------------------------------------------------------- booth, projector, beam

function buildBooth(ctx) {
  const { scene, mats } = ctx;
  const { floor, z0, z1, halfW, height, win } = BOOTH;
  const g = new THREE.Group();
  const zc = (z0 + z1) / 2;
  const d = z1 - z0;
  const top = floor + height;
  const add = (geo, mat, x, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); g.add(mesh); };
  add(box(halfW * 2, 0.3, d), mats.lacquer, 0, floor - 0.15, zc);
  add(box(halfW * 2, height, 0.3), mats.lacquer, 0, floor + height / 2, z1);
  add(box(0.3, height, d), mats.lacquer, -halfW, floor + height / 2, zc);
  add(box(0.3, height, d), mats.lacquer, halfW, floor + height / 2, zc);
  add(box(halfW * 2, win.y0 - floor, 0.3), mats.lacquer, 0, (floor + win.y0) / 2, z0);
  add(box(halfW * 2, top - win.y1, 0.3), mats.lacquer, 0, (win.y1 + top) / 2, z0);
  const sideW = halfW - win.halfW;
  add(box(sideW, win.y1 - win.y0, 0.3), mats.lacquer, -(win.halfW + sideW / 2), (win.y0 + win.y1) / 2, z0);
  add(box(sideW, win.y1 - win.y0, 0.3), mats.lacquer, win.halfW + sideW / 2, (win.y0 + win.y1) / 2, z0);
  add(box(halfW * 2 + 0.4, 0.2, 0.2), mats.gold, 0, top, z0);
  add(box(halfW * 2 + 0.4, 0.2, 0.2), mats.gold, 0, top, z1);
  add(box(0.2, 0.2, d), mats.gold, -halfW, top, zc);
  add(box(0.2, 0.2, d), mats.gold, halfW, top, zc);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 - 0.8, height * 0.55), mats.boothGlow);
  glow.rotation.y = Math.PI;
  glow.position.set(0, floor + height * 0.4, z1 - 0.2);
  g.add(glow);
  scene.add(g);
  // Like the walls, the booth is cut away while the camera is behind it looking at the screen.
  ctx.addCutaway(g, [0, 19, z0], [0, 0, -1]);
}

function reel(ctx) {
  const { mats } = ctx;
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2, 0.07, 8, 48).rotateY(Math.PI / 2), mats.gold);
  const pack = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.2, 40).rotateZ(Math.PI / 2), mats.film);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.34, 16).rotateZ(Math.PI / 2), mats.gold);
  g.add(rim, pack, hub);
  for (let k = 0; k < 3; k++) {
    const spoke = new THREE.Mesh(box(0.06, 1.7, 0.14).translate(0, 1.1, 0), mats.gold);
    spoke.rotation.x = (k / 3) * Math.PI * 2;
    spoke.position.x = -0.12;
    g.add(spoke);
  }
  return g;
}

function buildProjector(ctx) {
  const { scene, mats } = ctx;
  const g = new THREE.Group();
  g.position.set(0, BOOTH.floor, 47.8);
  scene.add(g);
  ctx.addCutaway(g, [0, 4, BOOTH.z0 - 47.8], [0, 0, -1]);
  const add = (geo, mat, x, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); g.add(mesh); return mesh; };

  add(box(2.6, 2.8, 4.6), mats.lacquer, 0, 1.4, 0);
  add(box(2.66, 0.1, 4.66), mats.brushedGold, 0, 2.15, 0);
  add(box(0.08, 0.08, 4.6), mats.gold, -1.3, 2.8, 0);
  add(box(0.08, 0.08, 4.6), mats.gold, 1.3, 2.8, 0);
  add(new THREE.CylinderGeometry(0.42, 0.52, 1.4, 24).rotateX(Math.PI / 2), mats.lacquer, 0, 1.5, -3.0);
  add(new THREE.TorusGeometry(0.44, 0.06, 8, 32), mats.gold, 0, 1.5, -3.7);
  const glass = add(new THREE.CircleGeometry(0.38, 24), mats.sconceGlow, 0, 1.5, -3.72);
  glass.rotation.y = Math.PI;
  add(box(1.8, 1.7, 1.9), mats.lacquer, 0, 3.65, 1.0);
  for (const y of [3.25, 3.6, 3.95]) add(box(1.84, 0.06, 1.94), mats.brushedGold, 0, y, 1.0);
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), mats.lacquer, 0, 4.95, 1.0);

  const reelA = reel(ctx);
  const reelB = reel(ctx);
  reelA.position.set(-1.15, 5.7, -2.3);
  reelB.position.set(-1.15, 5.7, 2.3);
  g.add(reelA, reelB);
  add(box(0.18, 2.9, 0.18), mats.lacquer, -1.15, 4.25, -2.3);
  add(box(0.18, 2.9, 0.18), mats.lacquer, -1.15, 4.25, 2.3);

  // The film path through the machine, traced in gold on the side facing the camera.
  // (z, y) on the side face: off the supply reel, a loop above the gate, through the gate by the lens,
  // the rolling loop along the bottom, then up and out to the take-up reel.
  const yz = [
    [-1.5, 4.75], [-1.4, 3.15], [-1.6, 2.5], [-1.95, 2.15], [-1.7, 1.8], [-1.95, 1.5],
    [-1.7, 1.1], [-1.2, 0.8], [-0.6, 1.05], [0, 0.7], [0.6, 1.05], [1.2, 0.7], [1.7, 1.0],
    [1.85, 1.7], [1.55, 2.3], [1.8, 2.75], [1.6, 3.4], [1.5, 4.75],
  ];
  const curve = new THREE.CatmullRomCurve3(yz.map(([z, y]) => V(-1.42, y, z)), false, 'centripetal');
  const tubeGeo = new THREE.TubeGeometry(curve, 260, 0.055, 6, false);
  const pathMat = mats.line.clone();
  const path = new THREE.Mesh(tubeGeo, pathMat);
  path.renderOrder = 12;
  path.visible = false;
  g.add(path);
  const count = tubeGeo.index.count;
  const setPath = (p) => tubeGeo.setDrawRange(0, Math.floor((count * p) / 6) * 6);
  setPath(0);
  for (const [z, y] of [[-1.95, 1.5], [-1.2, 0.8], [1.7, 1.0], [1.55, 2.3]]) {
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 16).rotateZ(Math.PI / 2), mats.gold, -1.4, y, z);
  }

  const lens = new THREE.Object3D();
  lens.position.set(0, 1.5, -3.75);
  g.add(lens);
  return { group: g, home: g.position.clone(), reels: [reelA, reelB], path, setPath, lens };
}

/** A soft cone of projected light from the lens to the screen, updated while visible. */
function buildBeam(ctx) {
  const N = ctx.lite ? 32 : 48;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 2 * 3);
  const t = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) t[N + i] = 1;
  const index = [];
  for (let i = 0; i < N; i++) {
    const a = i;
    const b = (i + 1) % N;
    index.push(a, N + a, b, b, N + a, N + b);
  }
  geo.setIndex(index);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xffeccc) }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aT;
      varying float vT; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main() {
        vT = aT;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uOpacity; uniform vec3 uColor; uniform float uTime;
      varying float vT; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float dust = 0.78 + 0.22 * sin(vW.x * 1.3 + uTime * 0.5) * sin(vW.y * 1.9 - uTime * 0.35) * sin(vW.z * 0.7 + uTime * 0.25);
        float a = uOpacity * smoothstep(0.0, 0.04, vT) * (1.0 - 0.75 * vT) * smoothstep(0.05, 0.7, facing) * dust;
        gl_FragColor = vec4(uColor * a * 0.16, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 6;
  ctx.scene.add(mesh);

  const apex = V(0, 0, 0);
  const beamWarm = new THREE.Color(0xffeccc);
  const beamGreen = new THREE.Color(0xa8ffcf);
  ctx.onFrame((time) => {
    const level = ctx.levels.beam;
    mesh.visible = level > 0.003;
    if (!mesh.visible) return;
    const { projector, screen } = ctx.parts;
    projector.lens.getWorldPosition(apex);
    const sz = screen.group.position.z + 0.05;
    const hw = SCREEN.w / 2;
    const hh = SCREEN.h / 2;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.set([apex.x + c * 0.36, apex.y + s * 0.36, apex.z], i * 3);
      const k = 1 / Math.max(Math.abs(c) / hw, Math.abs(s) / hh);
      pos.set([c * k, SCREEN.cy + s * k, sz], (N + i) * 3);
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    mat.uniforms.uOpacity.value = level;
    mat.uniforms.uTime.value = time;
    mat.uniforms.uColor.value.copy(beamWarm).lerp(beamGreen, ctx.levels.green);
  });
  return { mesh, material: mat };
}

// ---------------------------------------------------------------- speakers

function buildSpeakers(ctx) {
  const { mats, parts } = ctx;
  const bodyGeo = box(1.5, 2.2, 0.9);
  const woofer = new THREE.TorusGeometry(0.45, 0.06, 8, 28);
  const tweeter = new THREE.TorusGeometry(0.22, 0.05, 8, 20);
  const cone = new THREE.CircleGeometry(0.42, 24);
  const list = [];
  const world = V(0, 0, 0);

  const make = (parent, pos, facing, out) => {
    const g = new THREE.Group();
    g.position.copy(pos);
    parent.add(g);
    const add = (geo, mat, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(0, y, z); g.add(mesh); };
    add(bodyGeo, mats.lacquer, 0, 0);
    add(cone, mats.carpet, -0.35, 0.455);
    add(woofer, mats.gold, -0.35, 0.46);
    add(tweeter, mats.gold, 0.6, 0.46);
    parent.updateMatrixWorld(true);
    g.getWorldPosition(world);
    g.lookAt(world.add(facing));
    list.push({ obj: g, home: pos.clone(), out: V(...out) });
  };

  const screen = parts.screen.group;
  for (const [x, y] of [[-14, 12], [0, 12], [14, 12], [-10, 26], [10, 26]]) make(screen, V(x, y, -1.6), V(0, 0, 1), [0, 0, 8]);
  const { left, right, ceiling } = parts.walls;
  for (const z of [18, 31]) {
    make(left.group, V(0.9, 14, z), V(1, 0, 0), [5.5, 0, 0]);
    make(right.group, V(-0.9, 14, z), V(-1, 0, 0), [-5.5, 0, 0]);
  }
  for (const [x, z] of [[-11, 20], [11, 20], [0, 31]]) make(ceiling.group, V(x, -1.4, z), V(0, -1, 0), [0, -6, 0]);
  return list;
}

