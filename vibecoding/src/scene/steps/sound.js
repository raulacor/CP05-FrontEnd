import * as THREE from 'three';
import { cameraTo, spotTo, textBeat, stepStart } from '../helpers.js';

const RINGS = 3;

/** Step 6 · The sound: the twelve speakers leave the walls and ripples spread from every channel. */
export function stepSound(ctx, tl, dom) {
  const speakers = ctx.parts.speakers;
  buildRipples(ctx, speakers);
  const t0 = stepStart(tl);

  cameraTo(tl, ctx, 'sound', t0, 0.75);
  spotTo(tl, ctx, { x: 6, y: 80, z: 30, tx: 0, ty: 14, tz: 20, angle: 0.5 }, t0 + 0.1, 0.5);
  tl.to(ctx.levels, { key: 0.8, house: 0.4, glow: 0.35, duration: 0.4 }, t0 + 0.15);

  speakers.forEach((s, i) => {
    tl.to(s.obj.position, {
      x: s.home.x + s.out.x, y: s.home.y + s.out.y, z: s.home.z + s.out.z,
      duration: 0.45, ease: 'power3.out',
    }, t0 + 0.35 + i * 0.025);
  });
  tl.to(ctx.levels, { ripple: 1, duration: 0.3 }, t0 + 0.62);
  textBeat(tl, dom.steps.sound, t0 + 0.55, t0 + 1.38);

  // Steps back onto the walls.
  tl.to(ctx.levels, { ripple: 0, duration: 0.25 }, t0 + 1.32);
  speakers.forEach((s, i) => {
    tl.to(s.obj.position, { x: s.home.x, y: s.home.y, z: s.home.z, duration: 0.35, ease: 'power2.inOut' }, t0 + 1.4 + i * 0.01);
  });
  tl.set({}, {}, t0 + 1.8);
}

/** Expanding gold shells in front of each speaker; brightest at the rim, like a wavefront. */
function buildRipples(ctx, speakers) {
  const geo = new THREE.SphereGeometry(1, ctx.lite ? 18 : 28, ctx.lite ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vC;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vV = cameraPosition - w.xyz;
        vC = instanceColor;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vC;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        gl_FragColor = vec4(vC * pow(rim, 2.6) * 1.8, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const count = speakers.length * RINGS;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 7;
  const gold = new THREE.Color(0xf4c56a);
  const black = new THREE.Color(0, 0, 0);
  for (let i = 0; i < count; i++) mesh.setColorAt(i, black);
  ctx.scene.add(mesh);

  const m = new THREE.Matrix4();
  const wp = new THREE.Vector3();
  const wq = new THREE.Quaternion();
  const fwd = new THREE.Vector3();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const col = new THREE.Color();

  ctx.onFrame((time) => {
    const level = ctx.levels.ripple;
    mesh.visible = level > 0.003;
    if (!mesh.visible) return;
    speakers.forEach((sp, k) => {
      sp.obj.getWorldPosition(wp);
      sp.obj.getWorldQuaternion(wq);
      fwd.set(0, 0, 1).applyQuaternion(wq);
      for (let j = 0; j < RINGS; j++) {
        const ph = (time * 0.5 + j / RINGS + k * 0.137) % 1;
        const r = 0.9 + ph * 6.5;
        const a = Math.pow(1 - ph, 1.5) * Math.min(1, ph * 5) * level;
        m.compose(p.copy(wp).addScaledVector(fwd, 0.5), wq, s.setScalar(r));
        mesh.setMatrixAt(k * RINGS + j, m);
        mesh.setColorAt(k * RINGS + j, col.copy(gold).multiplyScalar(a));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  });
}
