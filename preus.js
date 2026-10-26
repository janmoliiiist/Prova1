/* ==========================================================
   PREUS → PRESSUPOSTADOR · preus.js
   Només es carrega al laboratori (lab.html), després de lab.js.
   Quan algú arriba des d'una targeta de preus de la home
   (lab.html?tipus=corporate#pressupostador):
     1. deixa triat el tipus de web al pressupostador;
     2. quan la pantalla de càrrega acaba, baixa fins a l'eina.
   Tipus vàlids: landing, corporate, shop.
   ========================================================== */
(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const boot = () => {
    const box = document.querySelector('.quote');
    if (!box) return;

    /* 1. Tipus triat des de la home */
    let tipus = '';
    try { tipus = new URLSearchParams(location.search).get('tipus') || ''; } catch (e) {}
    if (/^[a-z]+$/.test(tipus)) {
      const radio = box.querySelector('input[name="q-type"][value="' + tipus + '"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));   // lab.js recalcula el preu
      }
    }

    /* 2. Baixar fins al pressupostador quan acaba la pantalla de càrrega */
    if (location.hash !== '#pressupostador') return;
    const target = document.getElementById('pressupostador');
    if (!target) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };
    if (document.body.classList.contains('ready')) { go(); return; }
    new MutationObserver(() => {
      if (document.body.classList.contains('ready')) setTimeout(go, 400);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setTimeout(go, 6000);   // xarxa de seguretat
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
