import * as THREE from 'three';
import { CURTAIN, PROSC } from './dims.js';
import { cameraTo } from './helpers.js';

// Velvet drapery: a flat grid displaced in the vertex shader into deep folds.
// `uOpen` (0 closed → 1 gathered) slides the cloth toward its anchored edge; the folds bunch and deepen
// as it gathers, and the hem trails the top so the motion feels heavy.
const DRAPE_PARS = /* glsl */`
uniform float uOpen;
uniform float uTime;
uniform float uDir;
uniform float uWidth;
uniform float uHeight;
uniform float uFolds;
uniform float uAmp0;
uniform float uAmp1;
uniform float uGather;
uniform float uScallop;
uniform float uSwags;
varying float vFold;
varying float vT;
vec3 dPos;
vec3 dNormal;
void drapeShape(vec2 st) {
  float s = uDir > 0.0 ? st.x : 1.0 - st.x;   // 0 at the anchored edge, 1 at the leading edge
  float t = st.y;                              // 0 at the hem, 1 at the top
  float o = clamp(uOpen * 1.3 - (1.0 - t) * 0.3, 0.0, 1.0);
  o = o * o * (3.0 - 2.0 * o);
  float g = mix(1.0, uGather, o);
  float A = mix(uAmp0, uAmp1, o) * (0.82 + 0.3 * (1.0 - t));
  float k = 6.2831853 * uFolds;
  float wob = sin(t * 3.1 + s * 5.0);
  float ph = k * s + 0.6 * wob;
  float f = sin(ph) + 0.3 * sin(0.5 * ph + 1.7);
  float fp = (k + 3.0 * cos(t * 3.1 + s * 5.0)) * (cos(ph) + 0.15 * cos(0.5 * ph + 1.7));
  float sway = (1.0 - t) * 0.07 * sin(uTime * 0.7 + s * 4.0 + t * 2.0);
  float lift = uScallop * (1.0 - t) * (1.0 - abs(sin(3.14159265 * s * uSwags)));
  dPos = vec3(uDir * uWidth * s * g, t * uHeight + lift, A * f + sway);
  dNormal = normalize(vec3(-uDir * A * fp, 0.0, uWidth * g));
  vFold = f;
  vT = t;
}
`;

/** A velvet drape mesh. Pass shared uniform objects for `open` and `time` to drive several drapes together. */
export function makeDrape(ctx, o) {
  const geo = new THREE.PlaneGeometry(1, 1, o.segX, o.segY);
  const mat = ctx.mats.velvet.clone();
  const uniforms = {
    uOpen: o.open,
    uTime: o.time,
    uDir: { value: o.dir },
    uWidth: { value: o.width },
    uHeight: { value: o.height },
    uFolds: { value: o.folds },
    uAmp0: { value: o.amp0 },
    uAmp1: { value: o.amp1 ?? o.amp0 },
    uGather: { value: o.gather ?? 1 },
    uScallop: { value: o.scallop ?? 0 },
    uSwags: { value: o.swags ?? 1 },
    uHem: { value: o.hem },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DRAPE_PARS}`)
      .replace('#include <beginnormal_vertex>', 'drapeShape(uv);\nvec3 objectNormal = dNormal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = dPos;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHem;\nvarying float vFold;\nvarying float vT;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float valley = smoothstep(-1.25, 1.1, vFold);
        diffuseColor.rgb *= mix(0.3, 1.0, valley);
        if (vT < uHem) diffuseColor.rgb = vec3(0.52, 0.33, 0.09);`);
  };
  mat.customProgramCacheKey = () => 'drape';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

/** Main house curtains (two halves) and the scalloped valance above them. */
export function buildCurtains(ctx) {
  const { scene, lite } = ctx;
  const open = { value: 0 };
  const time = { value: 0 };
  const height = CURTAIN.top - CURTAIN.bottom;
  const common = {
    open, time, width: CURTAIN.width, height,
    folds: 20, amp0: 0.3, amp1: 0.78, gather: 0.175, hem: 0.016,
    segX: lite ? 90 : 200, segY: lite ? 10 : 36,
  };
  const left = makeDrape(ctx, { ...common, dir: 1 });
  left.position.set(-CURTAIN.anchor, CURTAIN.bottom, CURTAIN.z);
  const right = makeDrape(ctx, { ...common, dir: -1 });
  right.position.set(CURTAIN.anchor, CURTAIN.bottom, CURTAIN.z);

  const valanceW = PROSC.openHalfW * 2 + 1.6;
  const valance = makeDrape(ctx, {
    open: { value: 0 }, time, dir: 1, width: valanceW, height: 3.05,
    folds: 34, amp0: 0.2, hem: 0.1, scallop: 0.95, swags: 6,
    segX: lite ? 80 : 180, segY: lite ? 4 : 8,
  });
  valance.position.set(-valanceW / 2, 32.25, PROSC.z + PROSC.depth + 0.3);
  scene.add(left, right, valance);

  ctx.onFrame((t) => { time.value = t; });
  ctx.parts.curtains = { open, left, right, valance };
}

/** Step 1 · Opening: the curtains part and the camera draws back to the last row. */
export function openingCurtains(ctx, tl, dom) {
  const t0 = tl.duration();
  const { open } = ctx.parts.curtains;
  tl.to(dom.intro, { opacity: 0, y: -24, duration: 0.25, ease: 'power1.in' }, t0 + 0.02);
  tl.to(open, { value: 1, duration: 0.85, ease: 'power2.inOut' }, t0 + 0.06);
  cameraTo(tl, ctx, 'backRow', t0 + 0.1, 0.9);
  tl.to(ctx.levels, { glow: 1, stage: 0.2, duration: 0.6, ease: 'power1.inOut' }, t0 + 0.3);
  tl.set({}, {}, t0 + 1.05);
}
