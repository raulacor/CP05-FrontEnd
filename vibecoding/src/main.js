import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/jost';
import './styles.css';
import { initUI } from './ui.js';

const root = document.documentElement;
// Nothing scrolls until the visitor presses "Enter the theatre".
root.classList.add('js', 'is-locked');
initUI();

// Every visit starts at the curtain, even after a reload mid-story.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const stage = document.querySelector('[data-stage]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const gateNote = document.querySelector('[data-gate-note]');
const enterButton = document.querySelector('[data-enter]');

let story = null;     // the running 3D story, if any
let pending = null;   // its loading promise
let entered = false;  // the visitor pressed the button

const NOTES = {
  'reduced-motion': 'Your device is set to reduce motion. The story inside moves as you scroll.',
  'no-webgl': 'This browser has 3D graphics (WebGL) turned off, so the story will be shown as still pictures.',
  error: 'The 3D story could not start in this browser, so it is shown as still pictures.',
};

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function setNote(reason, detail = '') {
  if (!gateNote) return;
  gateNote.textContent = reason ? NOTES[reason] + (detail ? ` (${detail})` : '') : '';
  gateNote.hidden = !reason;
}

/** The illustrated panels: used without WebGL, or until a reduced-motion visitor chooses to enter. */
function useStatic(reason, detail) {
  story?.destroy();
  story = null;
  root.classList.remove('is-3d', 'is-ready');
  root.classList.add('is-static');
  setNote(reason, detail);
}

async function use3D() {
  if (story || pending) return;
  setNote(null);
  root.classList.remove('is-static');
  root.classList.add('is-3d');
  pending = import('./scene/index.js')
    .then(({ mountStory }) => mountStory(stage))
    .then((s) => {
      // Reduced motion may have been switched on while the scene loaded.
      if (reduceMotion.matches && !entered) { s.destroy(); useStatic('reduced-motion'); return; }
      story = s;
      root.classList.add('is-ready');
      // Pinning moves the stage in the DOM, which drops focus; put it back on the button.
      if (!entered) enterButton?.focus({ preventScroll: true });
    })
    .catch((err) => {
      console.error('[Last Stop] 3D story unavailable, showing illustrated panels.', err);
      useStatic('error', err?.message || String(err));
    })
    .finally(() => { pending = null; });
}

function decide() {
  if (!hasWebGL()) useStatic('no-webgl');
  // Pressing the button counts as choosing the motion, so reduced-motion visitors get the 3D story too.
  else if (reduceMotion.matches && !entered) useStatic('reduced-motion');
  else use3D();
}

function enter() {
  if (entered) return;
  entered = true;
  root.classList.remove('is-locked');
  root.classList.add('is-entered');
  decide();
  story?.refresh();
}

// Trying to scroll before entering makes the button call attention to itself.
const SCROLL_KEYS = new Set([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home']);
function nudge(event) {
  if (entered || !enterButton) return;
  if (event.type === 'keydown' && (!SCROLL_KEYS.has(event.key) || event.target === enterButton)) return;
  enterButton.classList.remove('is-nudged');
  void enterButton.offsetWidth; // restart the animation
  enterButton.classList.add('is-nudged');
}
window.addEventListener('wheel', nudge, { passive: true });
window.addEventListener('touchmove', nudge, { passive: true });
window.addEventListener('keydown', nudge);

enterButton?.addEventListener('click', enter);
enterButton?.focus({ preventScroll: true });

reduceMotion.addEventListener('change', decide);
decide();
