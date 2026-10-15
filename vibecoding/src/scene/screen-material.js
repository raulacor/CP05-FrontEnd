import * as THREE from 'three';
import { SCREEN } from './dims.js';

export const SCREEN_ASPECT = SCREEN.w / SCREEN.h; // 1.43:1

/**
 * The projection surface: a warm blank glow, or a picture fitted inside the 1.43:1 frame.
 * Two picture slots (A and B) cross-fade with uBlend, for the finale slideshow.
 */
export function makeScreenMaterial(placeholder) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGlow: { value: 0 },
      uGlowColor: { value: new THREE.Color(0xfff1dc) },
      uArt: { value: placeholder },
      uArtScale: { value: new THREE.Vector2(1, 1) },
      uArtB: { value: placeholder },
      uArtScaleB: { value: new THREE.Vector2(1, 1) },
      uBlend: { value: 0 },
      uArtMix: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uGlow;
      uniform vec3 uGlowColor;
      uniform sampler2D uArt;
      uniform vec2 uArtScale;
      uniform sampler2D uArtB;
      uniform vec2 uArtScaleB;
      uniform float uBlend;
      uniform float uArtMix;
      varying vec2 vUv;
      vec3 picture(sampler2D tex, vec2 c, vec2 scale) {
        vec2 p = c * scale + 0.5;
        float inside = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
        return texture2D(tex, clamp(p, 0.0, 1.0)).rgb * inside;
      }
      void main() {
        vec2 c = vUv - 0.5;
        float hot = 1.0 - smoothstep(0.0, 0.9, length(c * vec2(1.0, 1.43)));
        vec3 glow = uGlowColor * uGlow * (0.62 + 0.38 * hot);
        vec3 art = mix(picture(uArt, c, uArtScale), picture(uArtB, c, uArtScaleB), uBlend);
        gl_FragColor = vec4(mix(glow, art, uArtMix), 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

/** Fit a picture of the given aspect inside the screen without cropping (letterbox / pillarbox). */
export function fitArt(material, aspect, slot = 'A') {
  const s = material.uniforms[slot === 'A' ? 'uArtScale' : 'uArtScaleB'].value;
  if (aspect >= SCREEN_ASPECT) s.set(1, aspect / SCREEN_ASPECT);
  else s.set(SCREEN_ASPECT / aspect, 1);
}

/** The dark slate shown until real pictures are available. */
export function placeholderTexture() {
  const w = 1430;
  const h = 1000;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#0e0b0a';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(207,169,94,0.55)';
  g.lineWidth = 3;
  g.strokeRect(46, 46, w - 92, h - 92);
  g.strokeStyle = 'rgba(207,169,94,0.25)';
  g.lineWidth = 2;
  g.strokeRect(66, 66, w - 132, h - 132);

  // A small Art Deco lozenge above the words.
  g.save();
  g.translate(w / 2, h / 2 - 130);
  g.strokeStyle = '#cfa95e';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(0, -26); g.lineTo(26, 0); g.lineTo(0, 26); g.lineTo(-26, 0); g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(-220, 0); g.lineTo(-44, 0); g.moveTo(44, 0); g.lineTo(220, 0);
  g.stroke();
  g.restore();

  g.fillStyle = '#e3c27f';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'italic 400 128px "Bodoni Moda Variable", "Bodoni Moda", Didot, serif';
  g.fillText('Key art here', w / 2, h / 2 + 10);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
