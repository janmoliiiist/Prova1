/* ==========================================================
   ESCENES · escenes.js
   Tres efectes lligats al scroll que surten d'una sola foto real:
   1. Detalls   : la càmera viatja pels punts clau de la foto.
   2. Fondària  : cotxe retallat i fons es mouen a velocitats diferents.
   3. Color     : una cortina va canviant la pintura del cotxe.
   Cada escena té també un control lliscant (teclat, mòbil, i qui no
   vol fer scroll). JavaScript pur, sense llibreries.
   ========================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('a11y-calm');
  const T = (s, v) => (window.JMI18N ? window.JMI18N.t(s, v) : String(s).replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)));

  const scenes = [];

  /* Progrés d'una escena: 0 quan entra, 1 quan acaba el recorregut enganxat */
  const progressOf = (sec) => {
    const total = sec.offsetHeight - innerHeight;
    return total > 0 ? clamp(-sec.getBoundingClientRect().top / total) : 0;
  };
  const scrollToProgress = (sec, p) => {
    const total = sec.offsetHeight - innerHeight;
    const top = sec.getBoundingClientRect().top + scrollY + p * total;
    scrollTo({ top, behavior: 'auto' });
  };

  /* Parts comunes: capítols, barra lateral i control lliscant */
  const common = (sec) => {
    const chaps = $$('.chap', sec);
    const rail = $('.rail i', sec);
    const range = $('.sc-range input', sec);
    let dragging = false;
    if (range) {
      range.addEventListener('input', () => { dragging = true; scrollToProgress(sec, range.value / 1000); });
      range.addEventListener('change', () => { dragging = false; });
    }
    return (p) => {
      chaps.forEach((c) => {
        if (c.classList.contains('on-always')) return;
        c.classList.toggle('on', p >= +c.dataset.from && p < +c.dataset.to);
      });
      if (rail) rail.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      if (range && !dragging) range.value = Math.round(p * 1000);
    };
  };

  /* ==========================================================
     CÀMERA SOBRE LA FOTO
     Cada capa mesura com la foto (993 × 1689). Un "pla" és: quin punt
     de la foto és al centre (cx, cy) i quants píxels de la foto caben
     d'ample a la pantalla (w). La capa es mou i s'escala perquè això es compleixi.
     ========================================================== */
  const place = (el, cx, cy, w) => {
    const vw = innerWidth, vh = innerHeight, s = vw / w, hh = w * vh / vw;
    // la càmera no surt mai de la foto (si no, es veurien vores negres)
    cx = w >= 993 ? 496.5 : clamp(cx, w / 2, 993 - w / 2);
    cy = hh >= 1689 ? 844.5 : clamp(cy, hh / 2, 1689 - hh / 2);
    el.style.transform = 'translate3d(' + (vw / 2 - cx * s).toFixed(1) + 'px,' + (vh / 2 - cy * s).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ==========================================================
     1. DETALLS: la càmera viatja pels punts clau de la foto
     ========================================================== */
  const initTour = (sec) => {
    const cam = $('.tour-cam', sec);
    const base = common(sec);
    const wide = () => ({ cx: 496, cy: 845, w: Math.max(993, 1689 * innerWidth / innerHeight) });
    const keys = () => [
      wide(),
      { cx: 585, cy: 1185, w: 1000 },   // el conjunt
      { cx: 420, cy: 1290, w: 640 },    // els fars i el capó
      { cx: 590, cy: 1035, w: 560 },    // l'interior a través del vidre
      { cx: 770, cy: 1300, w: 640 },    // la roda i la porta
      wide()
    ];
    let cur = 0;
    return {
      sec,
      update(p, instant) {
        base(p);
        cur = instant ? p : cur + (p - cur) * 0.14;
        if (Math.abs(p - cur) < 0.0004) cur = p;
        const K = keys(), n = K.length - 1;
        const f = clamp(cur) * n, i = Math.min(n - 1, Math.floor(f));
        // petita pausa a cada punt clau perquè la imatge descansi
        const u = smooth(clamp((f - i - 0.18) / 0.64));
        const a = K[i], b = K[i + 1];
        place(cam, lerp(a.cx, b.cx, u), lerp(a.cy, b.cy, u), lerp(a.w, b.w, u));
        return cur !== p;
      }
    };
  };

  /* ==========================================================
     2. FONDÀRIA: cotxe i fons es mouen a velocitats diferents
     ========================================================== */
  const initDepth = (sec) => {
    const back = $('.dp-back', sec), car = $('.dp-car', sec);
    const base = common(sec);
    const c0 = { cx: 520, cy: 1200, w: 900 }, c1 = { cx: 610, cy: 1175, w: 720 };
    let cur = 0;
    return {
      sec,
      update(p, instant) {
        base(p);
        cur = instant ? p : cur + (p - cur) * 0.14;
        if (Math.abs(p - cur) < 0.0004) cur = p;
        const e = smooth(clamp(cur));
        const cx = lerp(c0.cx, c1.cx, e), cy = lerp(c0.cy, c1.cy, e), w = lerp(c0.w, c1.w, e);
        place(car, cx, cy, w);
        // el fons es mou menys: sembla que està més lluny
        place(back, lerp(c0.cx, cx, 0.45), lerp(c0.cy, cy, 0.45), lerp(c0.w, w, 0.55));
        return cur !== p;
      }
    };
  };

  /* ==========================================================
     3. COLOR: una cortina va canviant la pintura del cotxe
     ========================================================== */
  const initColor = (sec) => {
    const cam = $('.co-base', sec);
    const cars = $$('.co-car', sec);
    const btns = $$('.swatches button', sec);
    const base = common(sec);
    let cur = 0, last = -1;
    btns.forEach((b) => b.addEventListener('click', () => scrollToProgress(sec, +b.dataset.i / 3)));
    return {
      sec,
      update(p, instant) {
        base(p);
        cur = instant ? p : cur + (p - cur) * 0.16;
        if (Math.abs(p - cur) < 0.0004) cur = p;
        place(cam, 500, 1195, innerWidth > innerHeight ? 1000 : 860);
        cars.forEach((c, k) => {
          const t = smooth(clamp(cur * 3 - k));
          c.style.clipPath = 'inset(0 ' + ((1 - t) * 100).toFixed(2) + '% 0 0)';
        });
        const idx = Math.round(clamp(cur) * 3);
        if (idx !== last) { last = idx; btns.forEach((b, k) => b.setAttribute('aria-pressed', k === idx ? 'true' : 'false')); }
        return cur !== p;
      }
    };
  };

  /* ---------- Bucle: només treballa mentre hi ha escenes a la vista ---------- */
  const boot = () => {
    const makers = { tour: initTour, depth: initDepth, colors: initColor };
    $$('.scene').forEach((sec) => {
      const kind = Object.keys(makers).find((k) => sec.classList.contains(k));
      if (!kind) return;
      try { const s = makers[kind](sec); s.visible = false; scenes.push(s); } catch (e) { console.warn('escenes.js:', kind, e); }
    });

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { const s = scenes.find((x) => x.sec === e.target); if (s) { s.visible = e.isIntersecting; s.sec._dirty = true; } });
      kick();
    }, { rootMargin: '40% 0px' });
    scenes.forEach((s) => io.observe(s.sec));

    let running = false;
    const frame = () => {
      let moving = false;
      scenes.forEach((s) => {
        if (!s.visible) return;
        const p = progressOf(s.sec);
        if (s.update(p, calm())) moving = true;
      });
      if (moving || scenes.some((s) => s.sec._dirty && s.visible)) {
        scenes.forEach((s) => { s.sec._dirty = false; });
        requestAnimationFrame(frame);
      } else running = false;
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { scenes.forEach((s) => { s.sec._dirty = true; }); kick(); });
    document.addEventListener('jm:lang', kick);
    kick();
  };

  if (document.readyState === 'complete') boot();
  else addEventListener('DOMContentLoaded', boot);
})();
