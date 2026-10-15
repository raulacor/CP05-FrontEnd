import * as THREE from 'three';
import { ROOM } from '../dims.js';
import { cameraTo } from '../helpers.js';
import { fitArt } from '../screen-material.js';
import { buildSmoke } from '../smoke.js';
import { promoImages } from '../../promo.js';

// The optional trailer (see public/assets/promo/README.md). Stills come from src/promo.js.
export const TRAILER = '/assets/promo/doomsday-trailer.mp4';
const SLIDE_SECONDS = 5;
const FADE_SECONDS = 1.2;

/**
 * Step 8 · Finale: the room reassembles, the camera settles into the centre seat of the front balcony,
 * the house dims and turns green, smoke drifts across the stage, the curtains part and the screen
 * plays the premiere pictures.
 */
export function finale(ctx, tl, dom) {
  loadPromo(ctx);
  buildSmoke(ctx);
  const t0 = Math.max(0, tl.duration() - 0.2);
  const { left, right, ceiling, back } = ctx.parts.walls;
  const { open } = ctx.parts.curtains;
  const move = { duration: 0.6, ease: 'power2.inOut' };

  tl.to(left.group.position, { x: -ROOM.halfW, ...move }, t0);
  tl.to(right.group.position, { x: ROOM.halfW, ...move }, t0);
  tl.to(ceiling.group.position, { y: ROOM.height, ...move }, t0 + 0.05);
  tl.to(back.group.position, { z: 0, ...move }, t0 + 0.05);
  tl.to(open, { value: 0, duration: 0.5, ease: 'power2.inOut' }, t0 + 0.1);
  tl.to(ctx.levels, { house: 0.9, key: 0, glow: 0.2, stage: 0.6, duration: 0.5 }, t0 + 0.1);
  // Swing in above the stalls first, then settle back and down into the seat (never through the rows).
  cameraTo(tl, ctx, 'house', t0 + 0.1, 0.5, 'power2.in');
  cameraTo(tl, ctx, 'seat', t0 + 0.6, 0.4, 'power2.out');

  // As the house goes dark it turns green and the smoke rolls in.
  tl.to(ctx.levels, { house: 0.1, stage: 0, duration: 0.45 }, t0 + 0.9);
  tl.to(ctx.levels, { green: 1, smoke: 1, duration: 0.6, ease: 'power1.inOut' }, t0 + 0.9);
  // Curtains part fully, the premiere goes up on the screen.
  tl.to(open, { value: 1, duration: 0.6, ease: 'power2.inOut' }, t0 + 0.98);
  tl.to(ctx.levels, { art: 1, beam: 0.35, duration: 0.5 }, t0 + 1.1);
  tl.fromTo(dom.finale, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, t0 + 1.4);
  tl.set({}, {}, t0 + 2.2);
}

/**
 * Put the premiere pictures on the 3D screen: a cross-fading slideshow of the stills from src/promo.js,
 * or the muted looping trailer if that file exists. Until anything loads, the screen shows the slate.
 */
function loadPromo(ctx) {
  const mat = ctx.parts.screen.material;
  const u = mat.uniforms;
  const slides = [];      // { tex, aspect, color, gain }
  let shown = -1;         // slide in slot A
  let incoming = -1;      // slide fading in through slot B
  let fadeStart = 0;
  let nextAt = 0;
  let videoTex = null;

  const show = (i) => {
    const s = slides[i];
    u.uArt.value = s.tex;
    fitArt(mat, s.aspect, 'A');
    u.uBlend.value = 0;
    shown = i;
    setSpill(ctx, s);
  };

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  promoImages().then((urls) => {
    for (const url of urls) {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        ctx.track(tex);
        const light = spillColor(tex.image);
        if (!light) {
          // The server did not allow cross-origin use, so WebGL cannot draw this picture.
          console.warn(`[Last Stop] ${url} cannot be used as a texture (no CORS headers).`);
          tex.dispose();
          return;
        }
        slides.push({ tex, aspect: tex.image.width / tex.image.height, ...light });
        if (shown < 0) show(0);
      }, undefined, () => console.warn(`[Last Stop] Could not load ${url}`));
    }
  });

  // The trailer, when present, replaces the stills while the screen is lit.
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = TRAILER;
  video.addEventListener('loadedmetadata', () => {
    if (!video.videoWidth) return;
    videoTex = new THREE.VideoTexture(video);
    videoTex.colorSpace = THREE.SRGBColorSpace;
    ctx.track(videoTex);
  }, { once: true });
  video.addEventListener('error', () => { videoTex = null; }, { once: true });
  let nextSample = 0;

  ctx.onFrame((time) => {
    const showing = ctx.levels.art > 0.02;

    if (videoTex) {
      if (showing) {
        if (video.paused) video.play().catch(() => {});
        if (u.uArt.value !== videoTex) {
          u.uArt.value = videoTex;
          u.uBlend.value = 0;
          fitArt(mat, video.videoWidth / video.videoHeight, 'A');
        }
        if (time > nextSample && video.readyState >= 2) {
          const light = spillColor(video);
          if (light) setSpill(ctx, light);
          nextSample = time + 0.5;
        }
        return;
      }
      if (!video.paused) {
        video.pause();
        if (shown >= 0) show(shown);
      }
    }

    // Slideshow: hold each picture, then cross-fade to the next one.
    // Each picture holds before the first cross-fade too.
    if (!showing || slides.length < 2 || !nextAt) { nextAt = time + SLIDE_SECONDS; return; }
    if (incoming < 0 && time >= nextAt) {
      incoming = (shown + 1) % slides.length;
      u.uArtB.value = slides[incoming].tex;
      fitArt(mat, slides[incoming].aspect, 'B');
      fadeStart = time;
    }
    if (incoming >= 0) {
      const k = Math.min(1, (time - fadeStart) / FADE_SECONDS);
      u.uBlend.value = k * k * (3 - 2 * k);
      const a = slides[shown];
      const b = slides[incoming];
      ctx.artColor.copy(a.color).lerp(b.color, u.uBlend.value);
      ctx.artGain = a.gain + (b.gain - a.gain) * u.uBlend.value;
      if (k >= 1) {
        show(incoming);
        incoming = -1;
        nextAt = time + SLIDE_SECONDS;
      }
    }
  });
  ctx.track({ dispose() { video.pause(); video.removeAttribute('src'); video.load(); } });
}

function setSpill(ctx, light) {
  ctx.artColor.copy(light.color);
  ctx.artGain = light.gain;
}

const sampler = typeof document !== 'undefined' ? document.createElement('canvas') : null;

/**
 * Light thrown by a picture: its average hue, softened toward warm white, scaled by its brightness.
 * Returns null when the picture is cross-origin without CORS (its pixels cannot be read).
 */
function spillColor(source) {
  const size = 16;
  sampler.width = size;
  sampler.height = size;
  const g = sampler.getContext('2d', { willReadFrequently: true });
  g.drawImage(source, 0, 0, size, size);
  let d;
  try {
    d = g.getImageData(0, 0, size, size).data;
  } catch {
    return null;
  }
  let r = 0;
  let gr = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  const c = new THREE.Color().setRGB(r / n / 255, gr / n / 255, b / n / 255, THREE.SRGBColorSpace);
  const luma = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const max = Math.max(c.r, c.g, c.b, 1e-3);
  c.multiplyScalar(1 / max);
  return { color: c.lerp(new THREE.Color(0xfff1dc), 0.35), gain: Math.min(1.2, Math.max(0.25, luma * 2.2)) };
}
