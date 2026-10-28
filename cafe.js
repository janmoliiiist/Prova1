/* ==========================================================
   CAFÈ 3D · cafe.js
   Carrega l'escena 3D (cafe3d.js) quan s'acosta a la pantalla i la lliga al scroll.
   Si el dispositiu no suporta WebGL, mostra la foto en lloc de l'escena.
   Control lliscant per a teclat, mòbil i qui no vol fer scroll.
   ========================================================== */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-calm');

  const boot = () => {
    const sec = $('#cafe');
    if (!sec) return;
    const cv = $('.cf-cv', sec), fb = $('.cf-fallback', sec), cards = $('.cf-cards', sec);
    const chaps = $$('.chap', sec), rail = $('.rail i', sec), range = $('.sc-range input', sec);
    let dragging = false, scene = null, loading = false, failed = false, visible = false;
    let cur = 0, raf = 0, last = 0;

    const total = () => sec.offsetHeight - innerHeight;
    const progress = () => { const t = total(); return t > 0 ? clamp(-sec.getBoundingClientRect().top / t) : 0; };
    const goto = (p) => scrollTo({ top: sec.getBoundingClientRect().top + scrollY + p * total(), behavior: 'auto' });

    if (range) {
      range.addEventListener('input', () => { dragging = true; goto(range.value / 1000); });
      range.addEventListener('change', () => { dragging = false; });
    }

    const ui = (p) => {
      chaps.forEach((c) => c.classList.toggle('on', p >= +c.dataset.from && p < +c.dataset.to));
      if (cards) cards.classList.toggle('on', p > 0.88);
      if (rail) rail.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      if (range && !dragging) range.value = Math.round(p * 1000);
    };

    const useFallback = () => { failed = true; if (fb) fb.hidden = false; };

    const load = async () => {
      if (loading || scene || failed) return;
      loading = true;
      try {
        const test = document.createElement('canvas');
        if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('sense WebGL');
        const mod = await import('./cafe3d.js');
        scene = mod.createScene(cv, { latteURL: 'imatges/cafe/latte.webp' });
        kick();
      } catch (e) { console.warn('cafe.js:', e); useFallback(); }
    };

    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      const p = progress();
      const still = calm();
      const dt = Math.min(0.1, Math.max(0.001, (now - (last || now)) / 1000)); last = now;
      cur = still ? p : cur + (p - cur) * (1 - Math.exp(-dt * 7));     // suavitzat independent dels fps
      if (Math.abs(p - cur) < 0.0005) cur = p;
      ui(p);
      if (scene) scene.render(cur, still ? 2.2 : now / 1000);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

    new IntersectionObserver((es) => {
      es.forEach((e) => {
        visible = e.isIntersecting;
        if (visible) { load(); kick(); }
      });
    }, { rootMargin: '60% 0px' }).observe(sec);
    // la càrrega comença una mica abans que es vegi
    new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) load(); }, { rootMargin: '25% 0px' }).observe(sec);

    addEventListener('resize', () => { if (scene) scene.resize(); });
    addEventListener('scroll', kick, { passive: true });
    ui(0);
  };

  if (document.readyState === 'complete') boot();
  else addEventListener('DOMContentLoaded', boot);
})();
