// Pictures for the premiere, in the order they play on the 3D screen:
//   1. your official key art, if public/assets/promo/doomsday-keyart.jpg exists;
//   2. any image URLs listed in VITE_PROMO_IMAGES (comma-separated) in .env;
//   3. backdrops for the film from TMDB (The Movie Database), when a TMDB key is set in .env.
// Nothing is drawn or recreated: these are the film's published images.

const API = 'https://api.themoviedb.org/3';
const IMAGE = 'https://image.tmdb.org/t/p/w1280';
export const LOCAL_KEY_ART = '/assets/promo/doomsday-keyart.jpg';
const FILM = { title: 'Avengers: Doomsday', year: 2026 };
const MAX_IMAGES = 6;

let pending = null;

/** Image URLs for the finale (may be empty). Fetched once per page view. */
export function promoImages() {
  pending ??= load();
  return pending;
}

async function load() {
  const urls = [];
  if (await isImage(LOCAL_KEY_ART)) urls.push(LOCAL_KEY_ART);
  const listed = (import.meta.env.VITE_PROMO_IMAGES || '').split(',').map((u) => u.trim()).filter(Boolean);
  urls.push(...listed);
  try {
    urls.push(...(await tmdbBackdrops()));
  } catch (err) {
    console.info(`[Last Stop] TMDB images not loaded: ${err.message}`);
  }
  return urls;
}

async function isImage(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && (res.headers.get('content-type') || '').startsWith('image/');
  } catch {
    return false;
  }
}

async function tmdbBackdrops() {
  const token = import.meta.env.VITE_TMDB_TOKEN;      // v4 "API Read Access Token"
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;   // or the v3 "API Key"
  if (!token && !apiKey) throw new Error('add VITE_TMDB_TOKEN (or VITE_TMDB_API_KEY) to .env');

  const get = async (path, params = {}) => {
    const url = new URL(API + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!token) url.searchParams.set('api_key', apiKey);
    const headers = { accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`TMDB answered ${res.status} for ${path}`);
    return res.json();
  };

  let id = import.meta.env.VITE_TMDB_MOVIE_ID;
  if (!id) {
    const { results = [] } = await get('/search/movie', { query: FILM.title, primary_release_year: FILM.year });
    const hit = results.find((r) => r.title?.toLowerCase() === FILM.title.toLowerCase()) ?? results[0];
    if (!hit) throw new Error(`no TMDB match for "${FILM.title}"`);
    id = hit.id;
  }

  // Backdrops are wide (16:9), which suits the 1.43:1 screen. Text-free and English ones both qualify.
  const { backdrops = [] } = await get(`/movie/${id}/images`, { include_image_language: 'en,null' });
  return backdrops
    .filter((b) => b.width >= 1280)
    .sort((a, b) => (b.vote_average - a.vote_average) || (b.width - a.width))
    .slice(0, MAX_IMAGES)
    .map((b) => IMAGE + b.file_path);
}
