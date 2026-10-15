# Promotional assets: Avengers: Doomsday

Put the official promotional files for the premiere in this folder. The site picks them up automatically; no code changes needed.

| File | Required | Used for |
| --- | --- | --- |
| `doomsday-keyart.jpg` | No (TMDB images play without it) | First picture in the finale slideshow on the 3D screen, and the picture in the static finale panel. |
| `doomsday-trailer.mp4` | Optional | Plays muted and looping on the 3D screen in the finale (replacing the key art while the screen is lit), and with sound in the "Watch the trailer" lightbox. |

## Notes

- **Use the official files only.** The site does not draw or recreate any character, logo or artwork for the film.
- **Aspect ratio.** The screen is 1.43:1. Other ratios are letterboxed or pillarboxed, never cropped, so a 16:9 trailer or a portrait poster still shows in full.
- **Key art size.** About 2860 × 2000 px, JPEG quality around 80, keeps it sharp without a heavy download.
- **Trailer encoding.** H.264 MP4, 1080p, `+faststart` (moov atom first) so it starts quickly. For example:
  `ffmpeg -i trailer.mov -c:v libx264 -crf 22 -preset slow -c:a aac -b:a 160k -movflags +faststart doomsday-trailer.mp4`
- **TMDB:** with a TMDB token in `.env` (see the project README), the film's backdrops from TMDB play after this key art.
- **With no pictures at all** the 3D screen shows a dark "Key art here" slate, the static panel shows the same placeholder, and the lightbox says the trailer is coming soon.
- **Light spill.** The scene samples the average colour of the key art (or of the trailer as it plays) and casts that light onto the curtains, gold trim and front rows.
- Rights: make sure you are licensed to show these assets on the site.
