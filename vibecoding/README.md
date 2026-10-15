# Last Stop: landing page

A scroll-driven landing page for Last Stop, an IMAX 70mm movie palace in São Paulo. The story ("the anatomy of the perfect screening") is a pinned Three.js scene driven by GSAP ScrollTrigger: scroll down to play it, scroll up to play it backwards.

The page opens on the closed curtain with an **Enter the theatre** button and stays locked until it is pressed (trying to scroll makes the button nudge). There are no shortcuts past the story: no navigation, no skip link. The page ends on the finale, where **Book your seat** opens the premiere showtimes and **Watch the trailer** opens the trailer.

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build in dist/
npm run preview   # serve the production build
```

Add `?debug` to the URL to expose `window.__lastStop` (context, timeline, ScrollTrigger) in production builds.

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
