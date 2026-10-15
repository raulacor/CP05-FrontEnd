// Camera keyframes.
//
// A shot names what the camera looks at (target), the direction it looks from (dir, any length),
// and the box that must fit in view (fit = [width, height] in metres). The rig works out the
// distance for the current viewport, so a shot frames well from 360px phones to 1920px screens.
//
//   fov    vertical field of view in degrees: [text beside the scene, text below the scene]
//   fitB   optional fit box for portrait/mobile layouts (text below the scene)
//   frame  which part of the viewport the subject owns: 'full', 'feature' (beside/above the text) or 'finale'
//   fixed  a fixed camera distance; the field of view widens instead to fit the box (used for real seats)

export const SHOTS = {
  // Fixed distance (the lens widens on narrow screens), so the pull-back to the back row is one straight move.
  curtain:   { target: [0, 17.5, 1.5], dir: [0, 0.02, 1], fit: [14, 12], fov: [36, 50], frame: 'full', fixed: 22 },
  // Behind and above the last row of the stalls, clear of the seat backs, looking over the whole rake.
  backRow:   { target: [0, 12, 0], dir: [0, -1.2, 32.6], fit: [56, 44], fitB: [38, 44], fov: [46, 70], frame: 'full', fixed: 32.62 },
  rise:      { target: [0, 16, 0], dir: [0, 6, 30], fit: [56, 40], fitB: [38, 40], fov: [46, 70], frame: 'full', fixed: 30.6 },
  overview:  { target: [0, 13, 20], dir: [-0.62, 0.62, 0.78], fit: [70, 50], fov: [40, 52], frame: 'full' },
  film:      { target: [-0.5, 17, 8], dir: [-0.12, 0.03, 1], fit: [15, 11], fov: [44, 60], frame: 'feature' },
  screen:    { target: [0, 17.5, 5.5], dir: [-0.15, 0.32, 0.93], fit: [50, 36], fov: [38, 52], frame: 'feature' },
  projector: { target: [0, 28.2, 47.4], dir: [-1, 0.24, -0.46], fit: [13, 12], fov: [36, 50], frame: 'feature' },
  sound:     { target: [0, 19, 20], dir: [0.55, 0.8, 0.8], fit: [74, 50], fov: [40, 52], frame: 'feature' },
  seats:     { target: [0, 17, 21], dir: [1, 0.08, 0.1], fit: [50, 36], fov: [36, 50], frame: 'feature' },
  house:     { target: [0, 18, 0], dir: [0, 4, 30], fit: [41, 29], fov: [56, 90], frame: 'finale', fixed: 30.27 },
  seat:      { target: [0, 18, 0], dir: [0.4, -5.55, 36.75], fit: [41, 29], fov: [56, 90], frame: 'finale', fixed: 37.17 },
};

const FRAMES = { full: [0, 0], feature: [1, 0], finale: [0, 1] };

/** Flatten a shot into the numeric rig values GSAP tweens. */
export function shot(name) {
  const s = SHOTS[name];
  if (!s) throw new Error(`Unknown shot "${name}"`);
  const [feat, fin] = FRAMES[s.frame];
  // Unit-length directions, so blending between two shots weighs them equally.
  const len = Math.hypot(...s.dir);
  const out = {
    tx: s.target[0], ty: s.target[1], tz: s.target[2],
    dx: s.dir[0] / len, dy: s.dir[1] / len, dz: s.dir[2] / len,
    fwA: s.fit[0], fhA: s.fit[1],
    fwB: (s.fitB ?? s.fit)[0], fhB: (s.fitB ?? s.fit)[1],
    fovA: s.fov[0], fovB: s.fov[1],
    feat, fin,
    fixed: s.fixed ? 1 : 0,
  };
  if (s.fixed) out.dist = s.fixed;
  return out;
}
