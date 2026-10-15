// Page behaviour that does not depend on the 3D story.
import { promoImages } from './promo.js';

export function initUI() {
  initOptionalImages();
  initTrailer();
  initTickets();
  initReveals();
  initStaticFinale();
  for (const el of document.querySelectorAll('[data-year]')) el.textContent = String(new Date().getFullYear());
}

/** Images that may not exist yet (the key art): hide them cleanly so the placeholder shows. */
function initOptionalImages() {
  for (const img of document.querySelectorAll('img[data-optional]')) {
    const miss = () => img.classList.add('is-missing');
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) miss();
    img.addEventListener('error', miss, { once: true });
    img.addEventListener('load', () => { if (img.naturalWidth === 0) miss(); });
  }
}

/** Close on the close button or a click on the backdrop, and hand focus back to whatever opened it. */
function wireDialog(dialog, onClose) {
  let opener = null;
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    onClose?.();
    opener?.focus?.({ preventScroll: true });
  });
  return (trigger) => {
    opener = trigger;
    dialog.showModal();
  };
}

/** "Watch the trailer" opens a lightbox. The video only loads when first asked for. */
function initTrailer() {
  const dialog = document.querySelector('[data-lightbox]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const video = dialog.querySelector('video');
  const missing = dialog.querySelector('.lightbox__missing');
  video.addEventListener('error', () => {
    video.hidden = true;
    missing.hidden = false;
  });
  const open = wireDialog(dialog, () => video.pause());
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-trailer]');
    if (!trigger) return;
    if (!video.src) {
      video.src = video.dataset.src;
      video.load();
    }
    open(trigger);
    if (!video.hidden) video.play().catch(() => {});
  });
}

/** "Book your seat" opens the premiere showtimes. */
function initTickets() {
  const dialog = document.querySelector('[data-tickets]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const open = wireDialog(dialog);
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-tickets-open]');
    if (trigger) open(trigger);
  });
}

/** Still-panel finale: show the first premiere picture, and turn the page green when it comes into view. */
function initStaticFinale() {
  const img = document.querySelector('.keyart img');
  promoImages().then((urls) => {
    if (!img || !urls.length || img.getAttribute('src') === urls[0]) return;
    img.addEventListener('error', () => img.classList.add('is-missing'), { once: true });
    img.classList.remove('is-missing');
    img.src = urls[0];
  });
  const finale = document.querySelector('.finale');
  if (!finale || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  new IntersectionObserver(([entry]) => {
    if (root.classList.contains('is-static')) root.classList.toggle('is-doom', entry.isIntersecting);
  }, { threshold: 0.35 }).observe(finale);
}

/** Gentle fade-in for the still panels shown without the 3D story. */
function initReveals() {
  const steps = document.querySelectorAll('.step');
  if (!('IntersectionObserver' in window)) {
    steps.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  steps.forEach((el) => io.observe(el));
}
