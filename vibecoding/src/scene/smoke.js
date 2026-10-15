import * as THREE from 'three';

/**
 * A little stage smoke: soft billboards drifting and rising in front of the screen.
 * One draw call; shown only while ctx.levels.smoke > 0.
 */
export function buildSmoke(ctx) {
  const count = ctx.lite ? 22 : 44;
  const geo = new THREE.PlaneGeometry(1, 1);
  const seeds = new Float32Array(count * 4);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0x7dffb8) },
      uMap: { value: smokeTexture() },
    },
    vertexShader: /* glsl */`
      attribute vec4 aSeed;   // phase, speed, spin, drift
      uniform float uTime;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vec3 center = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float size = length(instanceMatrix[0].xyz);
        float life = fract(uTime * (0.018 + 0.03 * aSeed.y) + aSeed.x);
        center.y += life * 3.2;
        center.x += sin(uTime * 0.07 + aSeed.w * 6.2832) * 2.5 + (life - 0.5) * 4.0 * (aSeed.w - 0.5);
        vAlpha = smoothstep(0.0, 0.25, life) * (1.0 - smoothstep(0.55, 1.0, life));
        float a = (aSeed.z - 0.5) * 0.5 + uTime * (aSeed.y - 0.5) * 0.04;
        mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
        vec4 mv = modelViewMatrix * vec4(center, 1.0);
        // Wide, low puffs: a smoke bank rather than balls.
        mv.xy += r * (position.xy * vec2(2.2, 0.9)) * size * (0.8 + 0.45 * life);
        vUv = uv;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        float d = texture2D(uMap, vUv).r;
        gl_FragColor = vec4(uColor * d * vAlpha * uOpacity, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    p.set((Math.random() * 2 - 1) * 24, 2.2 + Math.random() * 2.4, 3 + Math.random() * 13);
    s.setScalar(6 + Math.random() * 5);
    mesh.setMatrixAt(i, m.compose(p, q, s));
    seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 8;
  ctx.scene.add(mesh);

  ctx.onFrame((time) => {
    const level = ctx.levels.smoke;
    mesh.visible = level > 0.003;
    if (!mesh.visible) return;
    mat.uniforms.uTime.value = time;
    mat.uniforms.uOpacity.value = 0.13 * level;
  });
  return mesh;
}

/** A soft, lumpy puff: overlapping radial blobs on black (red channel = density). */
function smokeTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * size * 0.16;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r;
    const rad = size * (0.08 + Math.random() * 0.18); // stays inside the square, so no hard edges
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.16)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
