import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { shot } from './shots.js';

export const LITE_QUERY = '(max-width: 767.98px), (max-height: 500px)';
export const BESIDE_QUERY = '(min-width: 560px) and (min-aspect-ratio: 11/10)';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

// Light strengths (physical units, tuned by eye).
const I = {
  hemi: 1.1,
  stage: 1100,
  key: 7000,
  sconce: 120,
  screenGlow: 1.6,     // RectAreaLight luminance when the blank screen glows
  screenArt: 2.6,      // ...and when the key art is up
  pointGlow: 5000,     // lite fallback for the screen light
  pointArt: 8000,
};

/**
 * Everything the scene builders and steps share: renderer, camera rig, lights, materials,
 * per-frame hooks and cleanup. `lite` selects the lighter scene for small screens.
 */
export function createContext({ stage, canvas, lite }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040202);
  scene.fog = new THREE.FogExp2(0x050202, lite ? 0.0035 : 0.004);

  const envRT = buildEnvironment(renderer);
  scene.environment = envRT.texture;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 700);

  if (!lite) RectAreaLightUniformsLib.init();

  const mats = buildMaterials(lite);
  const lights = buildLights(scene, lite);

  const ctx = {
    THREE, lite, renderer, scene, camera, stage, mats, lights,
    time: 0,
    parts: {},
    // Animated state. GSAP tweens these plain objects; the frame loop applies them.
    rig: { dist: 40, dmax: 1e4, ...shot('curtain') },
    levels: { house: 1, stage: 1, glow: 0, art: 0, key: 0, beam: 0, ripple: 0, green: 0, smoke: 0 },
    key: { x: 0, y: 40, z: 30, tx: 0, ty: 18, tz: 0, angle: 0.4 },
    size: { w: 1, h: 1 },
    areas: null,
    beside: matchMedia(BESIDE_QUERY).matches,
    onFrame(fn) { frameFns.push(fn); },
    addCutaway(object, anchor, normal) { cutaways.push({ object, anchor: new THREE.Vector3(...anchor), normal: new THREE.Vector3(...normal) }); },
    track(disposable) { disposables.push(disposable); return disposable; },
    start, stop, wake: () => wake(), render: renderOnce, dispose, measure,
    isRunning: () => running,
    updateCamera: () => applyCamera(),
  };

  const frameFns = [];
  const cutaways = [];
  const disposables = [];

  // ---------- Camera rig ----------
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tMax = Math.tan(50 * DEG);

  function applyCamera() {
    const { w: W, h: H } = ctx.size;
    const A = W / H;
    const r = ctx.rig;
    const a = blendArea(ctx.areas, r.feat, r.fin);
    const b = ctx.beside;
    const fw = b ? r.fwA : r.fwB;
    const fh = b ? r.fhA : r.fhB;
    const tKey = Math.tan((b ? r.fovA : r.fovB) * DEG / 2);
    const dFit = Math.min(r.dmax, Math.max(fh / (2 * tKey * a.ay), fw / (2 * tKey * A * a.ax)));
    const tFix = Math.min(tMax, Math.max(fh / (2 * r.dist * a.ay), fw / (2 * r.dist * A * a.ax)));
    const d = lerp(dFit, r.dist, r.fixed);
    const t = lerp(tKey, tFix, r.fixed);

    target.set(r.tx, r.ty, r.tz);
    dir.set(r.dx, r.dy, r.dz).normalize();
    camera.position.copy(target).addScaledVector(dir, d);
    camera.lookAt(target);

    // Off-centre projection: the target lands at (cx, cy) of the viewport, clear of the text.
    const ox = (a.cx - 0.5) * W;
    const oy = (a.cy - 0.5) * H;
    const fullW = W + 2 * Math.abs(ox);
    const fullH = H + 2 * Math.abs(oy);
    camera.setViewOffset(fullW, fullH, ox < 0 ? -2 * ox : 0, oy < 0 ? -2 * oy : 0, W, H);
    camera.aspect = fullW / fullH;
    camera.fov = 2 * Math.atan(t * fullH / H) / DEG;
    camera.updateProjectionMatrix();
  }

  // ---------- Lights and levels ----------
  const sconceBase = mats.sconceGlow.color.clone();
  const coveBase = mats.coveGlow.color.clone();
  const glowColor = new THREE.Color(0xfff1dc);
  // The finale's green: the house goes emerald as the lights go down.
  const GREEN = {
    glow: new THREE.Color(0x2cf08a).multiplyScalar(2.2),
    cove: new THREE.Color(0x22e07a).multiplyScalar(1.6),
    lamp: new THREE.Color(0x35f08c),
    sky: new THREE.Color(0x1d7a46),
    ground: new THREE.Color(0x03180b),
    spill: new THREE.Color(0x6dffa8),
    fog: new THREE.Color(0x011409),
  };
  const base = {
    sky: lights.hemi.color.clone(),
    ground: lights.hemi.groundColor.clone(),
    stage: lights.stage.color.clone(),
    lamp: new THREE.Color(0xffa452),
    fog: scene.fog.color.clone(),
    background: scene.background.clone(),
  };
  let doom = false;
  ctx.artColor = new THREE.Color(0xfff1dc);
  ctx.artGain = 0.3; // the dark placeholder slate throws little light
  const spill = new THREE.Color();

  function applyLevels() {
    const L = ctx.levels;
    const house = L.house;
    const g = L.green;
    lights.hemi.intensity = I.hemi * (0.18 + 0.82 * house + 0.7 * g);
    lights.hemi.color.copy(base.sky).lerp(GREEN.sky, g);
    lights.hemi.groundColor.copy(base.ground).lerp(GREEN.ground, g);
    scene.environmentIntensity = 0.25 + 0.75 * house;
    mats.sconceGlow.color.copy(sconceBase).lerp(GREEN.glow, g).multiplyScalar(0.12 + 0.88 * house + 0.5 * g);
    mats.coveGlow.color.copy(coveBase).lerp(GREEN.cove, g).multiplyScalar(0.08 + 0.92 * house + 0.7 * g);
    for (const l of lights.sconces) {
      l.intensity = I.sconce * (house + 0.6 * g);
      l.color.copy(base.lamp).lerp(GREEN.lamp, g);
    }
    lights.stage.intensity = I.stage * L.stage;
    lights.stage.color.copy(base.stage).lerp(GREEN.lamp, g);
    scene.fog.color.copy(base.fog).lerp(GREEN.fog, g);
    scene.background.copy(base.background).lerp(GREEN.fog, g);
    // The page's gold accents follow the room.
    if ((g > 0.5) !== doom) {
      doom = g > 0.5;
      document.documentElement.classList.toggle('is-doom', doom);
    }

    const k = ctx.key;
    lights.key.intensity = I.key * L.key;
    lights.key.position.set(k.x, k.y, k.z);
    lights.key.target.position.set(k.tx, k.ty, k.tz);
    lights.key.angle = k.angle;

    const screenMat = ctx.parts.screen?.material;
    if (screenMat) {
      screenMat.uniforms.uGlow.value = L.glow;
      screenMat.uniforms.uArtMix.value = L.art;
    }
    spill.copy(glowColor).lerp(ctx.artColor, L.art).lerp(GREEN.spill, 0.5 * g);
    const screenLight = ctx.parts.screen?.light;
    if (screenLight) {
      screenLight.color.copy(spill);
      screenLight.intensity = lite
        ? I.pointGlow * L.glow * (1 - L.art) + I.pointArt * L.art * ctx.artGain
        : I.screenGlow * L.glow * (1 - L.art) + I.screenArt * L.art * ctx.artGain;
    }
  }

  // ---------- Cutaways: hide a wall while the camera is on its outside ----------
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  function applyCutaways() {
    for (const c of cutaways) {
      p.copy(c.object.position).add(c.anchor);
      v.subVectors(camera.position, p);
      c.object.visible = v.dot(c.normal) > -0.5;
    }
  }

  // ---------- Layout: where the subject may sit, clear of header and text ----------
  function measure() {
    const W = ctx.size.w;
    const H = ctx.size.h;
    const sRect = stage.getBoundingClientRect();
    // The header is fixed over the top of the pinned stage.
    const header = document.querySelector('.site-header')?.offsetHeight ?? 60;
    const top = Math.min(0.3, header / H);
    const avail = 1 - top;
    const full = { ax: 0.96, ay: avail * 0.94, cx: 0.5, cy: top + avail / 2 };

    ctx.beside = matchMedia(BESIDE_QUERY).matches;
    const steps = [...stage.querySelectorAll('.step')];
    let feature;
    if (ctx.beside && steps.length) {
      const left = Math.min(...steps.map((s) => s.getBoundingClientRect().left - sRect.left));
      const fw = Math.max(0.3, (left - 16) / W);
      feature = { ax: fw * 0.92, ay: avail * 0.9, cx: fw / 2, cy: top + avail / 2 };
    } else {
      const panel = Math.max(0, ...steps.map((s) => s.offsetHeight)) / H;
      const room = Math.max(0.25, 1 - top - panel);
      feature = { ax: 0.94, ay: room * 0.9, cx: 0.5, cy: top + room / 2 };
    }

    const fin = stage.querySelector('.finale__text');
    let finale = full;
    if (fin) {
      const finTop = (fin.getBoundingClientRect().top - sRect.top) / H;
      const room = Math.max(0.3, finTop - top);
      finale = { ax: 0.97, ay: room * 0.95, cx: 0.5, cy: top + room / 2 };
    }
    ctx.areas = { full, feature, finale };
  }

  function resize() {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    if (w === ctx.size.w && h === ctx.size.h) return;
    ctx.size.w = w;
    ctx.size.h = h;
    renderer.setSize(w, h, false);
    measure();
    if (!running) renderOnce();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // ---------- Frame loop, paused off-screen ----------
  let raf = 0;
  let running = false;
  let last = 0;
  let offSince = 0;
  let offFrames = 0;
  let slowFrames = 0;
  let sampled = 0;

  function renderOnce() {
    if (!ctx.areas) { ctx.size.w = 0; resize(); }
    applyCamera();
    applyLevels();
    for (const fn of frameFns) fn(ctx.time, 0);
    applyCutaways();
    renderer.render(scene, camera);
  }

  function frame() {
    // Pause only after the stage has been off screen for a moment; pinning briefly reshuffles layout.
    const now = performance.now();
    if (onScreen()) { offSince = 0; offFrames = 0; }
    else if (!offSince) { offSince = now; offFrames = 1; }
    else if (++offFrames >= 3 && now - offSince > 300) { stop(); return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    ctx.time += dt;
    applyCamera();
    applyLevels();
    for (const fn of frameFns) fn(ctx.time, dt);
    applyCutaways();
    renderer.render(scene, camera);
    adaptQuality(dt);
  }

  // Drop the pixel ratio in steps if the machine cannot hold ~45 fps.
  function adaptQuality(dt) {
    if (dt <= 0 || document.hidden) return;
    sampled += 1;
    if (dt > 1 / 45) slowFrames += 1;
    if (sampled >= 90) {
      if (slowFrames > 45 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
      }
      sampled = 0;
      slowFrames = 0;
    }
  }

  // The stage is pinned and moved around by ScrollTrigger, so check its box directly rather than
  // relying on an IntersectionObserver that can miss the pin/unpin transitions.
  function onScreen() {
    if (document.hidden) return false;
    const r = stage.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }
  function start() {
    if (running) return;
    running = true;
    offSince = 0;
    offFrames = 0;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  const wake = () => { if (!running) start(); };
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
  document.addEventListener('visibilitychange', wake);

  function dispose() {
    stop();
    document.documentElement.classList.remove('is-doom');
    window.removeEventListener('scroll', wake);
    window.removeEventListener('resize', wake);
    document.removeEventListener('visibilitychange', wake);
    ro.disconnect();
    for (const d of disposables) d.dispose?.();
    scene.traverse((o) => {
      o.geometry?.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) {
        for (const value of Object.values(m)) if (value?.isTexture) value.dispose();
        m.dispose();
      }
    });
    for (const m of Object.values(mats)) m.dispose?.();
    envRT.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return ctx;
}

function blendArea(areas, feat, fin) {
  const f = areas.full;
  const a = areas.feature;
  const b = areas.finale;
  const mix = (k) => f[k] + (a[k] - f[k]) * feat + (b[k] - f[k]) * fin;
  return { ax: mix('ax'), ay: mix('ay'), cx: mix('cx'), cy: mix('cy') };
}

/** A warm, dark studio for reflections: a glowing screen ahead, candle-amber strips at the sides. */
function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x060303);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const add = (hex, k, pos, scale) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) }));
    m.position.set(...pos);
    m.scale.set(...scale);
    env.add(m);
  };
  add(0xfff0da, 1.5, [0, 1.5, -14], [10, 6, 0.2]);
  add(0xffa24a, 4, [-11, 0.5, -2], [0.2, 0.6, 12]);
  add(0xffa24a, 4, [11, 0.5, -2], [0.2, 0.6, 12]);
  add(0xff9a50, 0.35, [0, 9, 0], [18, 0.2, 18]);
  add(0x6a0c16, 0.6, [0, -6, 0], [30, 0.2, 30]);
  add(0xffc070, 2, [0, 4, 12], [5, 0.6, 0.2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035);
  pmrem.dispose();
  env.traverse((o) => o.material?.dispose());
  geo.dispose();
  return rt;
}

function buildMaterials(lite) {
  const velvet = (hex) => (lite
    ? new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, envMapIntensity: 0.4 })
    : new THREE.MeshPhysicalMaterial({
      color: hex, roughness: 0.88, envMapIntensity: 0.3,
      sheen: 1, sheenColor: new THREE.Color(0xd8364a), sheenRoughness: 0.5,
    }));

  // Black lacquer: glossy, but kept low on reflections so it never reads as grey plastic.
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x080606, roughness: 0.34, envMapIntensity: 0.32 });

  return {
    velvet: velvet(0x4a0712),
    wallVelvet: velvet(0x26040a),
    seatVelvet: velvet(0x5a0915),
    gold: new THREE.MeshStandardMaterial({ color: 0xdcb05a, metalness: 1, roughness: 0.28, envMapIntensity: 1.35 }),
    brushedGold: new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 1, roughness: 0.46, envMapIntensity: 1.2 }),
    lacquer,
    carpet: new THREE.MeshStandardMaterial({ color: 0x2a050b, roughness: 1, envMapIntensity: 0.25 }),
    seatFrame: new THREE.MeshStandardMaterial({ color: 0x0d0909, roughness: 0.92, envMapIntensity: 0.1 }),
    film: new THREE.MeshStandardMaterial({ color: 0x24130a, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.9 }),
    sconceGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb064).multiplyScalar(2.2) }),
    coveGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9440).multiplyScalar(1.4) }),
    boothGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a4a).multiplyScalar(0.55) }),
    masking: new THREE.MeshBasicMaterial({ color: 0x020101 }),
    // Diagram lines: flat gold, drawn over everything so they read like an engraving.
    line: new THREE.MeshBasicMaterial({ color: 0xf2d08a, toneMapped: false, fog: false, transparent: true, depthTest: false, depthWrite: false }),
  };
}

function buildLights(scene, lite) {
  const hemi = new THREE.HemisphereLight(0x6a4030, 0x0a0405, 1);
  scene.add(hemi);

  // Footlights: warm uplight raking across the curtain folds.
  const stage = new THREE.SpotLight(0xffc49a, 0, 0, 0.78, 0.95, 2);
  stage.position.set(0, 2.6, 11.5); // between the stage lip and the front row, clear of the seats
  stage.target.position.set(0, 16, 1.5);
  scene.add(stage, stage.target);

  // The moving spotlight that picks out each feature.
  const key = new THREE.SpotLight(0xffd2a0, 0, 0, 0.4, 0.65, 2);
  scene.add(key, key.target);

  return { hemi, stage, key, sconces: [] };
}
