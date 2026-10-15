# Last Stop: landing page

A scroll-driven landing page for Last Stop, an IMAX 70mm movie palace in São Paulo. The story ("the anatomy of the perfect screening") is a pinned Three.js scene driven by GSAP ScrollTrigger: scroll down to play it, scroll up to play it backwards.

The page opens on the closed curtain with an **Enter the theatre** button and stays locked until it is pressed (trying to scroll makes the button nudge). There are no shortcuts past the story: no navigation, no skip link. The page ends on the finale, where **Book your seat** opens the premiere showtimes and **Watch the trailer** opens the trailer.

## Prompt Inicial:

```
Build a landing page for Last Stop, a luxury movie theater in São Paulo, Brazil, that shows films in IMAX 70mm film projection on a 40m x 28m screen, the largest cinema screen in the world. Audience: film lovers who care about image and sound quality and want a grand, special-occasion night out.

Goal: the visitor should check showtimes or book a seat within 30 seconds.

Core concept: "the anatomy of the perfect screening." Scrolling down opens the curtains and takes the auditorium apart one feature at a time, like a cinematic exploded-view diagram, and ends with a premiere on the big screen.

DESIGN DIRECTION
- Opulent old-Hollywood grand-cinema aesthetic: deep crimson velvet, polished gold, black lacquer, warm candlelight-amber lighting. Think a 1920s movie palace or an opera house box, rendered with modern precision.
- Typography: an elegant high-contrast serif for headlines (Didone/Art Deco feel), small-caps letter-spaced labels, a refined sans for body text (Google Fonts). Huge numbers in the serif, set in gold.
- Details: thin gold Art Deco line ornaments as section dividers, gold-outlined buttons that fill on hover, a subtle velvet texture on dark backgrounds.
- Palette as CSS custom properties: crimson, gold, black, warm ivory for text.
- Over the top in material and lighting, but disciplined in layout: generous spacing, few elements per screen, one feature at a time. No decorative gradients, no generic cards, no stock icons.

THE SCROLL STORY (Three.js scene, pinned while the story plays; progress tied directly to scroll position with GSAP ScrollTrigger, so scrolling up plays everything in reverse)

1. Opening: the page loads on heavy red velvet curtains filling the screen (3D cloth with visible folds and soft sheen), with "Last Stop" in gold and a "Scroll to enter" hint. On the first scroll they part and draw back, revealing the auditorium from the back row, the giant screen glowing in the dark. Scrolling back to the top closes them.

2. Feature breakdown. The camera moves through the space and the auditorium separates into its parts. Each part comes forward under a warm spotlight, gets explained, then steps back as the next arrives. Each step has a short headline, one or two lines of copy and one big gold number:
   a. The film: a 70mm film strip unspools across the screen; show its large frame next to a standard 35mm frame for scale. Big number: "70mm".
   b. The screen: the camera pulls back to reveal its full height and width, with a human silhouette for scale and the 1.43:1 aspect ratio outlined in gold. Big number: "40m × 28m", with the line "The largest cinema screen in the world."
   c. The projector: the projector rises out of the booth, the light beam becomes visible, and the film path through the machine is traced in gold. Big number: "1.43:1", the full IMAX frame.
   d. The sound: the speakers separate from the walls and sound waves ripple out from each channel position, including side and overhead. Big number: "12 channels".
   e. The seats: the velvet rows fan out to show the steep stadium seating and sightlines that keep the whole screen in view. Big number: "420 seats".
   Text appears beside the 3D part on desktop and below it on mobile.

3. Finale:
   - The parts reassemble. The camera glides to the center seat of the front balcony and settles facing the screen. The curtains part fully again and the house lights dim.
   - The screen lights up with a promotional takeover for "Avengers: Doomsday" in IMAX 70mm. Map an image or video texture onto the 3D screen from these placeholder files:
       /assets/promo/doomsday-keyart.jpg
       /assets/promo/doomsday-trailer.mp4 (optional; muted and looping)
     I will add the official promotional assets myself. Do not draw, recreate or invent any characters, logos or artwork for the film. Until the files exist, show a tasteful dark placeholder reading "Key art here." Create the /assets/promo/ folder with a README explaining which files go there.
   - HTML layer over the scene, in the gold serif style: the film title, "Presented in IMAX 70mm", "Premiere December 18", and two buttons: "Book your seat" and "Watch the trailer" (opens the trailer in a lightbox).
   - The screen glow spills onto the curtains, gold trim and front rows, so the promo feels projected in the room.

3D STYLE
- Simple, stylized low-poly geometry with rich lighting and materials (velvet sheen, brushed gold) rather than detailed models.
- Do not use the IMAX logo or any trademarked artwork; use only the "Last Stop" name and a simple gold wordmark you design for it.

PERFORMANCE AND FALLBACKS
- Cap pixel ratio at 2, reuse geometries and materials, pause rendering when the scene is off-screen, target 60fps on a mid-range laptop.
- Under 768px: a lighter scene (fewer objects, simpler lighting and cloth, shorter camera moves).
- With prefers-reduced-motion or no WebGL: replace the 3D story with static illustrated panels, one per step (curtains, each feature, finale). The finale panel shows the key art inside a velvet-and-gold screen frame with the same text and buttons.

RESPONSIVENESS (non-negotiable)
- Mobile-first. Check at 360px, 768px, 1280px and 1920px.
- Fluid type and spacing with clamp(); Grid/Flexbox layout; no fixed widths, no horizontal scroll.
- The canvas resizes correctly on viewport and orientation change.
- Touch targets at least 44px; text stays readable over the 3D scene with accessible contrast.

AFTER THE STORY
Now showing (poster placeholders with showtimes) → location in São Paulo and how to get there (map placeholder) → short FAQ (ticket types, accessibility, parking, dress code) → footer. These sections are calm and elegant: same palette and type, gold dividers, simple fade reveals. All copy in English.

TECH
Vite + vanilla JS + Three.js + GSAP ScrollTrigger. Three.js code in its own module, with the curtains, each feature step and the finale as separate functions so they're easy to edit or reorder. Semantic HTML, lazy-loaded images.

PROCESS
1. Before writing code, tell me in 5 lines the visual style, the camera path and how each step will look.
2. Build it.
3. Run it locally, scroll the full story forward and backward at every breakpoint, check the reduced-motion fallback and the key art placeholder, and fix anything janky, unreadable or generic before you finish.
```

## Prompt de Correcao

```
Task Overview
Implement a camera path fix and integrate specific end-sequence visual effects and database image assets.

---

1. Camera Collision & Clipping Fix (Priority)
- Issue: Camera clips through seat geometry at the start of the sequence.
- Fix: Adjust the initial camera transform and trajectory at $t = 0$ to ensure proper clearance and smooth initial motion without interior mesh obstruction.

---

2. Dynamic Media & Database Integration
- Integrate a media database/asset repository containing images for *Avengers: Doomsday*.
- Configure the end-sequence screen model to query and display these images smoothly at the conclusion of the animation.

---

3. Atmospheric & Lighting Sequence
- Color Shift: Trigger a global green ambient light/tint shift dynamically as environmental lighting darkens.
- VFX: Introduce low-lying volumetric smoke/fog particles to add depth and dramatic texture to the environment during the transition.
```

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Where things live

```
index.html                 Semantic page: header, entrance gate, story overlay text, static fallback art, dialogs
src/main.js                The entrance gate and scroll lock; chooses the 3D story or the static panels
src/ui.js                  Trailer and showtimes dialogs, optional images, fade-in of the static panels
src/promo.js               Finds the premiere pictures: local key art, VITE_PROMO_IMAGES, TMDB
src/styles.css             Design tokens (:root), layout, fallbacks, sections
src/scene/index.js         STORY order, master timeline, ScrollTrigger pin; rebuilds at the 768px breakpoint
src/scene/context.js       Renderer, camera rig (auto-framing), lights, materials, frame loop, cleanup
src/scene/shots.js         Camera keyframes, one per shot
src/scene/dims.js          Every dimension in metres (screen 40 × 28, 420 seats, ...)
src/scene/auditorium.js    The room: walls, proscenium, stage, screen, seats, balcony, booth, projector, beam, speakers
src/scene/curtains.js      Velvet drape shader, curtains + valance, and the opening step
src/scene/steps/*.js       explode, film, screen, projector, sound, seats, finale: one function each
public/assets/promo/       Promotional files for the finale (see the README in that folder)
```

### Editing the story

- **Reorder or remove steps** in the `STORY` array in `src/scene/index.js`. Each step adds its own segment to the timeline and puts back whatever it moved, so they are independent. Keep `openingCurtains` first and `finale` last.
- **Change a camera move** in `src/scene/shots.js`. A shot is a target, a direction to look from and a box to keep in view. The rig works out the distance for each viewport, and keeps the subject clear of the text panel (beside it on wide screens, above it on phones).
- **Change timing** inside each step function. Positions are in "story time"; `SCROLL_PER_UNIT` in `index.js` sets how many viewport heights of scrolling one unit takes.
- **Change copy** in `index.html`. The same markup is used over the 3D scene and in the static panels.

## Premiere pictures (TMDB) and promotional files

The finale screen plays a cross-fading slideshow (5 s per picture) of, in order:

1. `public/assets/promo/doomsday-keyart.jpg`, if you add it;
2. any image URLs in `VITE_PROMO_IMAGES` (comma-separated);
3. up to 6 backdrops of the film from **TMDB (The Movie Database)**.

To turn on TMDB, copy `.env.example` to `.env`, paste your TMDB **API Read Access Token** into `VITE_TMDB_TOKEN` (or the v3 key into `VITE_TMDB_API_KEY`), and restart `npm run dev`. The film is found by title; set `VITE_TMDB_MOVIE_ID` to skip the search. Like any front-end TMDB key, the token ends up in the page's JavaScript, so use a read-only token. TMDB's terms ask for credit; it's in the small print of the "Book your seat" dialog.

If `public/assets/promo/doomsday-trailer.mp4` exists, it plays muted on the screen instead of the stills. With no pictures at all, the screen shows the dark "Key art here" slate. The light the screen throws onto the curtains and rows takes its colour and strength from whatever is playing.

## The finale

As the house lights go down the room turns green (lights, glows, fog, the screen's spill and the projector beam), the page's gold accents switch to green, and a low bank of stage smoke drifts across the front of the stage. Scrolling back up reverses all of it. The colours are in `GREEN` in `src/scene/context.js` and `html.is-doom` in `src/styles.css`; the smoke is `src/scene/smoke.js`.

## Fallbacks and performance

- **Reduced motion:** the gate tells the visitor the story moves as they scroll; pressing the button plays the 3D story anyway, since entering is the visitor's choice.
- **No WebGL:** the gate says so, and the story is shown as static illustrated panels, one per step, ending with the finale key art inside a velvet-and-gold frame and the same buttons.
- **Under 768px wide (or under 500px tall):** a lighter scene with simpler materials and cloth, fewer objects, no sconce lights and a point light instead of the screen's area light.
- **Rendering:** the pixel ratio is capped at 2 and stepped down automatically if the machine cannot hold about 45 fps. Geometry and materials are shared, the 420 seats are instanced per row, and rendering pauses whenever the story is off screen or the tab is hidden.

## Placeholder content to replace

- **Booking links:** the showtimes in the "Book your seat" dialog point to `#book-…` anchors. Point them at your ticketing system.
- **Address:** the line in the dialog's small print is generic (Avenida Paulista).
- **Venue facts:** "the largest cinema screen in the world", 12 channels and 420 seats come from the brief. Check them before launch.
