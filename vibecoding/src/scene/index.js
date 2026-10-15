import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createContext, LITE_QUERY } from './context.js';
import { buildAuditorium } from './auditorium.js';
import { buildCurtains, openingCurtains } from './curtains.js';
import { explodeRoom } from './steps/explode.js';
import { stepFilm } from './steps/film.js';
import { stepScreen } from './steps/screen.js';
import { stepProjector } from './steps/projector.js';
import { stepSound } from './steps/sound.js';
import { stepSeats } from './steps/seats.js';
import { finale } from './steps/finale.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * The story, in order. Each step appends its own segment to one master timeline and puts back
 * whatever it moved, so steps can be reordered or removed here. The finale reassembles the room.
 */
export const STORY = [
  openingCurtains,
  explodeRoom,
  stepFilm,
  stepScreen,
  stepProjector,
  stepSound,
  stepSeats,
  finale,
];

// Viewport heights of scrolling per unit of story time.
const SCROLL_PER_UNIT = { full: 0.85, lite: 0.7 };

/** Build the pinned 3D story inside `stage`. Rebuilds itself when crossing the small-screen breakpoint. */
export async function mountStory(stage) {
  await fontsReady();
  const liteQuery = matchMedia(LITE_QUERY);
  let current = build(liteQuery.matches);

  const onChange = () => {
    current.destroy();
    current = build(liteQuery.matches);
    ScrollTrigger.refresh();
    current.wake();
  };
  liteQuery.addEventListener('change', onChange);

  return {
    // Re-measure after the page unlocks (the scrollbar appearing changes the layout).
    refresh() {
      ScrollTrigger.refresh();
      current.wake();
    },
    destroy() {
      liteQuery.removeEventListener('change', onChange);
      current.destroy();
    },
  };

  function build(lite) {
    // A fresh canvas per build, so the old WebGL context can be released.
    const canvas = document.createElement('canvas');
    canvas.className = 'story__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.querySelector('.story__canvas').replaceWith(canvas);

    const dom = {
      intro: stage.querySelector('[data-intro]'),
      caption: stage.querySelector('[data-caption]'),
      finale: stage.querySelector('[data-finale]'),
      steps: Object.fromEntries([...stage.querySelectorAll('[data-step]')].map((el) => [el.dataset.step, el])),
    };
    const overlays = [dom.intro, dom.caption, dom.finale, ...Object.values(dom.steps)];
    gsap.set(overlays, { clearProps: 'all' });

    const ctx = createContext({ stage, canvas, lite });
    buildAuditorium(ctx);
    buildCurtains(ctx);

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    for (const step of STORY) step(ctx, tl, dom);

    const perUnit = lite ? SCROLL_PER_UNIT.lite : SCROLL_PER_UNIT.full;
    const st = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * tl.duration() * perUnit)}`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.6,
      animation: tl,
      onUpdate: () => ctx.wake(),
      onToggle: () => ctx.wake(),
    });

    ctx.measure();
    ctx.render();
    ctx.start();

    if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
      window.__lastStop = { ctx, tl, st, gsap, ScrollTrigger };
    }

    return {
      wake: () => ctx.wake(),
      destroy() {
        st.kill(true);
        tl.kill();
        gsap.set(overlays, { clearProps: 'all' });
        ctx.dispose();
      },
    };
  }
}

function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const loads = Promise.all([
    document.fonts.load('500 64px "Jost Variable"'),
    document.fonts.load('italic 400 64px "Bodoni Moda Variable"'),
  ]);
  return Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
}
