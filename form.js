/* ==========================================================
   FORMULARIS QUE ENVIEN DE VERITAT · form.js
   - Formulari de contacte de la home (.cform)
   - Formulari "intel·ligent" del laboratori (.sform): quan lab.js
     el valida i mostra el final, aquest fitxer l'envia de debò.
   Servei: Web3Forms (https://web3forms.com). Configuració a config.js.
   Va després de config.js i, al laboratori, després de lab.js.
   ========================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (s, v) => (window.JMI18N ? window.JMI18N.t(s, v) : String(s).replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)));
  const CFG = Object.assign({ email: '', web3formsKey: '', subject: 'Nou missatge' }, window.JM || {});
  const hasKey = !!CFG.web3formsKey && CFG.web3formsKey !== 'EL_TEU_ACCESS_KEY';

  /* ---------- Enviament (Web3Forms) ---------- */
  const send = async ({ name, email, message, topic }) => {
    if (!hasKey) return { ok: false, reason: 'nokey' };
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: CFG.web3formsKey,
          subject: CFG.subject + (topic ? ' · ' + topic : ''),
          from_name: 'Portafoli web',
          name, email, message,
          botcheck: ''
        })
      });
      const data = await res.json().catch(() => ({}));
      return data.success ? { ok: true } : { ok: false, reason: 'server', msg: data.message };
    } catch (e) {
      return { ok: false, reason: 'network' };
    }
  };

  const mailtoHref = ({ name, email, message, topic }) =>
    'mailto:' + CFG.email +
    '?subject=' + encodeURIComponent(CFG.subject + (topic ? ' · ' + topic : '')) +
    '&body=' + encodeURIComponent((message || '') + '\n\n— ' + (name || '') + ' (' + (email || '') + ')');

  /* ---------- Petita explosió de partícules ---------- */
  const burst = (host) => {
    if (reduce) return;
    const box = document.createElement('div');
    box.className = 'cf-burst';
    box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('i');
      const a = (i / 18) * Math.PI * 2 + Math.random() * .3;
      const d = 70 + Math.random() * 70;
      s.style.setProperty('--x', Math.cos(a) * d + 'px');
      s.style.setProperty('--y', Math.sin(a) * d + 'px');
      s.style.setProperty('--h', (60 + Math.random() * 40) + '');
      s.style.animationDelay = (Math.random() * .12) + 's';
      box.appendChild(s);
    }
    host.appendChild(box);
    setTimeout(() => box.remove(), 1400);
  };

  /* ==========================================================
     A. FORMULARI DE LA HOME
     ========================================================== */
  const initContact = () => {
    const form = $('.cform');
    if (!form) return;

    const rules = {
      name:    (v) => v.trim().length >= 2 ? '' : T('Escriu el teu nom.'),
      email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : T('Aquest correu no sembla vàlid.'),
      message: (v) => v.trim().length >= 15 ? '' : T('Explica\'m una mica més (mínim 15 caràcters).')
    };
    const fields = $$('.cf-field[data-field]', form);
    const consent = $('input[name="consent"]', form);
    const consentErr = $('.cf-consent-err', form);
    const status = $('.cf-status', form);
    const btn = $('.cf-send', form);
    const hp = $('input[name="botcheck"]', form);

    const check = (f, touch) => {
      const input = $('input, textarea', f);
      const msg = rules[f.dataset.field](input.value);
      if (touch) f.classList.add('touched');
      f.classList.toggle('bad', !!msg && f.classList.contains('touched'));
      f.classList.toggle('good', !msg && f.classList.contains('touched'));
      $('.cf-err', f).textContent = f.classList.contains('touched') ? msg : '';
      return !msg;
    };

    fields.forEach((f) => {
      const input = $('input, textarea', f);
      input.addEventListener('blur', () => check(f, true));
      input.addEventListener('input', () => { if (f.classList.contains('touched')) check(f, false); });
    });
    consent.addEventListener('change', () => { consentErr.hidden = consent.checked; });

    const values = () => ({
      name: $('[name="name"]', form).value.trim(),
      email: $('[name="email"]', form).value.trim(),
      message: $('[name="message"]', form).value.trim(),
      topic: ($('[name="topic"]', form) || {}).value || ''
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (hp && hp.checked) return;              // un robot ha marcat el camp ocult
      const ok = fields.map((f) => check(f, true));
      consentErr.hidden = consent.checked;
      if (!ok.every(Boolean) || !consent.checked) {
        const bad = fields.find((f) => f.classList.contains('bad'));
        if (bad) $('input, textarea', bad).focus();
        return;
      }

      const v = values();
      status.textContent = '';
      status.classList.remove('err');
      btn.disabled = true;
      form.classList.add('sending');
      const label = btn.textContent;
      btn.textContent = T('Enviant…');

      const r = await send(v);

      form.classList.remove('sending');
      btn.disabled = false;
      btn.textContent = label;

      if (r.ok) {
        form.classList.add('sent');
        const ok = $('.cf-ok', form);
        ok.focus({ preventScroll: true });
        burst($('.cf-check', form).parentElement);
        return;
      }
      status.classList.add('err');
      if (r.reason === 'nokey') {
        status.innerHTML = T('L\'enviament automàtic encara no està configurat.') + ' ' +
          '<a href="' + mailtoHref(v).replace(/"/g, '&quot;') + '">' + T('Obre el correu amb el missatge ja escrit →') + '</a>';
      } else {
        status.innerHTML = T('No s\'ha pogut enviar. Torna-ho a provar o') + ' ' +
          '<a href="' + mailtoHref(v).replace(/"/g, '&quot;') + '">' + T('escriu-me per correu →') + '</a>';
      }
    });

    $('.cf-again', form).addEventListener('click', () => {
      form.reset();
      form.classList.remove('sent');
      fields.forEach((f) => { f.classList.remove('touched', 'good', 'bad'); $('.cf-err', f).textContent = ''; });
      status.textContent = '';
      $('input', form).focus();
    });
  };

  /* ==========================================================
     B. FORMULARI DEL LABORATORI (.sform)
     lab.js el valida i, quan és correcte, mostra .sf-done.
     Aquí observem aquest moment i fem l'enviament real.
     ========================================================== */
  const initLabForm = () => {
    const form = $('.sform');
    const done = form && $('.sf-done', form);
    if (!done) return;
    const h = $('h4', done), p = $('p', done), mailBtn = $('#sf-mail', done);
    const orig = { h: h.textContent, p: p.textContent, m: mailBtn ? mailBtn.textContent : '' };
    let busy = false;

    const run = async () => {
      if (busy) return;
      busy = true;
      const v = {
        name: ($('#sf-name') || {}).value || '',
        email: ($('#sf-email') || {}).value || '',
        topic: ($('#sf-type') || {}).value || '',
        message: ($('#sf-msg') || {}).value || ''
      };
      if (!hasKey) {
        h.textContent = T('Gairebé fet! 🎉');
        p.textContent = T('L\'enviament automàtic encara no està configurat: prem el botó i s\'obrirà el teu correu amb el missatge ja escrit.');
        busy = false;
        return;
      }
      h.textContent = T('Enviant…');
      p.textContent = T('Un moment, estic enviant el teu missatge.');
      if (mailBtn) mailBtn.hidden = true;
      const r = await send(v);
      if (r.ok) {
        h.textContent = T('Enviat! 🎉');
        p.textContent = T('Gràcies, {name}. T\'he rebut el missatge i et respondré en menys de 24 hores.', { name: v.name.split(' ')[0] || '' });
      } else {
        h.textContent = T('Ups, no s\'ha pogut enviar');
        p.textContent = T('Pot ser un problema de connexió. Pots obrir el correu amb el missatge ja escrit i enviar-lo des d\'allà.');
        if (mailBtn) mailBtn.hidden = false;
      }
      busy = false;
    };

    const restore = () => {
      h.textContent = orig.h; p.textContent = orig.p;
      if (mailBtn) { mailBtn.hidden = false; mailBtn.textContent = orig.m; }
    };

    new MutationObserver(() => { done.hidden ? restore() : run(); })
      .observe(done, { attributes: true, attributeFilter: ['hidden'] });
  };

  /* ---------- ARRENCADA ---------- */
  const boot = () => {
    [initContact, initLabForm].forEach((fn) => {
      try { fn(); } catch (e) { console.warn('form.js · ' + fn.name + ':', e); }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
