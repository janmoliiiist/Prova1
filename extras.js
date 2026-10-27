/* ==========================================================
   EXTRES · extras.js
   Es carrega a totes les pàgines, després de script.js.
   1. Paleta d'ordres (Ctrl+K / ⌘K): salta a qualsevol secció,
      projecte o experiment, o fes una acció.
   2. So subtil opcional (clics i hovers), apagat per defecte,
      amb botó al menú per activar-lo o silenciar-lo.
   3. Codi Konami (↑ ↑ ↓ ↓ ← → ← → B A): activa un mode especial.
   JavaScript pur, sense llibreries. Cada part és independent.
   ========================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CFG = Object.assign({ email: 'janmoliiiist@gmail.com' }, window.JM || {});
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const tr = (s) => (window.JMI18N ? window.JMI18N.t(s) : s);
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };


  /* ---------- Finestra flotant lleugera (idioma, accessibilitat) ---------- */
  const popOpen = [];
  const Popover = (trigger, panel, opts = {}) => {
    panel.classList.add('pop');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    if (!panel.id) panel.id = 'pop-' + Math.random().toString(36).slice(2, 7);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panel.id);
    document.body.appendChild(panel);

    const place = () => {
      const r = trigger.getBoundingClientRect();
      const w = Math.min(panel.offsetWidth || 340, innerWidth - 16);
      const left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w));
      panel.style.top = Math.round(r.bottom + 10) + 'px';
      panel.style.left = Math.round(left) + 'px';
    };
    const isOpen = () => !panel.hidden;
    const close = (back) => {
      if (!isOpen()) return;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      const i = popOpen.indexOf(api); if (i > -1) popOpen.splice(i, 1);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
      removeEventListener('resize', place);
      if (back) trigger.focus({ preventScroll: true });
    };
    const onDown = (e) => { if (!panel.contains(e.target) && !trigger.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } };
    const onFocus = (e) => { if (!panel.contains(e.target) && !trigger.contains(e.target)) close(); };
    const open = () => {
      popOpen.slice().forEach((p) => p.close());
      if (opts.onOpen) opts.onOpen();
      panel.hidden = false;
      place();
      trigger.setAttribute('aria-expanded', 'true');
      popOpen.push(api);
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('focusin', onFocus, true);
      addEventListener('resize', place);
      const f = panel.querySelector('[data-focus], button, [href], input');
      if (f) f.focus({ preventScroll: true });
    };
    const api = { open, close, isOpen, toggle: () => (isOpen() ? close() : open()) };
    trigger.addEventListener('click', api.toggle);
    return api;
  };

  /* ---------- Avís flotant ---------- */
  let toastEl, toastT;
  const toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = tr(msg);
    // dues passades perquè la transició es repeteixi si ja era visible
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2800);
  };

  /* ==========================================================
     1. SO (WebAudio, sense fitxers)
     ========================================================== */
  const Sound = (() => {
    let on = store.get('jm-sound') === '1';
    let ctx = null, master = null, lastHover = 0;
    const listeners = [];

    const ensure = () => {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = .6;
      master.connect(ctx.destination);
      return ctx;
    };

    const tone = (f, d = .06, type = 'sine', vol = .05, when = 0, slide = 0) => {
      const c = ensure();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      const t = c.currentTime + when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + d + .03);
    };

    const SOUNDS = {
      hover:  () => tone(1250, .035, 'sine', .016),
      click:  () => tone(520, .07, 'triangle', .05, 0, 1.5),
      open:   () => { tone(440, .08, 'sine', .05); tone(660, .1, 'sine', .05, .07); },
      close:  () => { tone(660, .07, 'sine', .04); tone(440, .09, 'sine', .04, .06); },
      on:     () => { tone(523, .08, 'sine', .06); tone(784, .12, 'sine', .06, .08); },
      catch:  () => tone(880, .06, 'triangle', .05, 0, 1.4),
      hit:    () => tone(170, .2, 'sawtooth', .05, 0, .5),
      konami: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .13, 'square', .035, i * .09))
    };

    const emit = () => listeners.forEach((fn) => fn(on));

    return {
      get on() { return on; },
      onChange(fn) { listeners.push(fn); },
      play(name) {
        if (!on || !SOUNDS[name]) return;
        if (name === 'hover') {
          const now = performance.now();
          if (now - lastHover < 70) return;
          lastHover = now;
        }
        try { SOUNDS[name](); } catch (e) {}
      },
      set(v) {
        on = !!v;
        store.set('jm-sound', on ? '1' : '0');
        root.classList.toggle('snd-on', on);
        emit();
        if (on) { ensure(); try { SOUNDS.on(); } catch (e) {} }
      },
      toggle() { this.set(!on); return on; },
      init() { root.classList.toggle('snd-on', on); emit(); }
    };
  })();

  /* Sons de clic i hover (només si el so està activat) */
  const initSoundEvents = () => {
    let last = null;
    document.addEventListener('pointerover', (e) => {
      if (!Sound.on || !e.target.closest) return;
      const t = e.target.closest('a[href], button, .card, .project, .tcard');
      if (t && t !== last) Sound.play('hover');
      last = t || null;
    }, true);
    document.addEventListener('click', (e) => {
      if (!Sound.on || !e.target.closest) return;
      if (e.target.closest('a[href], button, input[type="checkbox"], input[type="radio"]')) Sound.play('click');
    }, true);
  };

  /* ==========================================================
     2. PALETA D'ORDRES
     ========================================================== */
  const Palette = (() => {
    const here = () => location.pathname.split('/').pop() || 'index.html';

    /* Navegar: si és la mateixa pàgina, fa scroll suau; si no, canvia de pàgina */
    const go = (href) => {
      const [file, hash] = href.split('#');
      if (file === here()) {
        if (!hash) { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          try { history.replaceState(null, '', '#' + hash); } catch (e) {}
          return;
        }
      }
      location.href = href;
    };

    const L = (label, href, group, kw) => ({ label, href, group, kw: kw || '' });

    const HUES = [['Llima', 75], ['Taronja', 18], ['Rosa', 320], ['Violeta', 265], ['Cian', 190]];

    const ITEMS = [
      L('Inici', 'index.html#inici', 'Pàgines', 'home portada principal'),
      L('Sobre mi', 'index.html#sobre', 'Pàgines', 'qui sóc about disseny desenvolupament'),
      L('Projectes seleccionats', 'index.html#projectes', 'Pàgines', 'portafoli treballs cas estudi'),
      L('Serveis', 'index.html#serveis', 'Pàgines', 'disseny web desenvolupament animacio seo'),
      L('Preus', 'index.html#preus', 'Pàgines', 'tarifes pressupost cost euros'),
      L('Procés de treball', 'index.html#proces', 'Pàgines', 'passos trucada llançament'),
      L('Testimonis i logos', 'index.html#confianca', 'Pàgines', 'clients confiança opinions'),
      L('Contacte', 'index.html#contacte', 'Pàgines', 'correu escriu formulari parlem'),

      L('Brasa', 'projecte-brasa.html', 'Projectes', 'restaurant web reserves cuina llenya'),
      L('Nord Arquitectura', 'projecte-nord.html', 'Projectes', 'estudi portafoli visual arquitectura'),
      L('Pulse', 'projecte-pulse.html', 'Projectes', 'saas landing dashboard analitica'),
      L('Tallers', 'projecte-tallers.html', 'Projectes', 'botiga online ecommerce'),

      L('Entrar al laboratori', 'lab.html', 'Laboratori', 'experiments shaders 3d'),
      L('Text de partícules', 'lab.html#particules', 'Laboratori', 'particules lletres fisica'),
      L('Cub 3D', 'lab.html#cub', 'Laboratori', 'css 3d inercia'),
      L('Túnel de profunditat', 'lab.html#tunel', 'Laboratori', 'scroll profunditat'),
      L('Galeria giratòria', 'lab.html#galeria', 'Laboratori', 'anell 3d carrusel'),
      L('Targetes amb capes', 'lab.html#capes', 'Laboratori', 'profunditat llum hover'),
      L('Vida artificial', 'lab.html#vida', 'Laboratori', 'constel·lacio bandada boids'),
      L('Tipografia viva', 'lab.html#tipografia', 'Laboratori', 'lletres cinetica desxifrat'),
      L('Matèria · ones, rastre i metabolles', 'lab.html#materia', 'Laboratori', 'shader webgl ones rastre'),
      L('Llanterna', 'lab.html#llanterna', 'Laboratori', 'mascara revelat'),
      L('Abans / Després', 'lab.html#abans', 'Laboratori', 'comparador redisseny'),
      L('Eines reals', 'lab.html#eines', 'Laboratori', 'pressupost color rendiment formulari tema'),
      L('Pressupostador', 'lab.html#pressupostador', 'Laboratori', 'calculadora preu estimacio')
    ];

    /* Accions: el text pot ser dinàmic (funció) */
    ITEMS.push(
      { label: 'Copia el correu', group: 'Accions', kw: 'email mail copiar contacte', run: () => {
        const done = () => toast('Correu copiat ✓');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CFG.email).then(done, () => toast(CFG.email));
        else toast(CFG.email);
      } },
      { label: 'Escriu-me un correu', group: 'Accions', kw: 'email mail contacte', run: () => { location.href = 'mailto:' + CFG.email; } },
      { label: () => Sound.on ? 'Silencia el so' : 'Activa el so', group: 'Accions', kw: 'audio so musica clics volum mute', run: () => {
        toast(Sound.toggle() ? 'So activat 🔊' : 'So silenciat 🔇');
      } },
      { label: 'Tornar a dalt', group: 'Accions', kw: 'inici amunt top', run: () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) }
    );
    HUES.forEach(([name, h]) => ITEMS.push({
      label: () => tr('Color d\'accent') + ': ' + tr(name), group: 'Accions', kw: 'tema color accent hue ' + name,
      run: () => {
        const b = $('.hues button[data-hue="' + h + '"]');
        if (b) b.click(); else root.style.setProperty('--hue', h);
        toast(tr('Color') + ': ' + tr(name));
      }
    }));

    const labelOf = (it) => tr(typeof it.label === 'function' ? it.label() : it.label);

    const score = (it, q) => {
      const label = norm(labelOf(it));
      const hay = label + ' ' + norm(it.kw) + ' ' + norm(it.group) + ' ' + norm(tr(it.group));
      if (label === q) return 120;
      if (label.startsWith(q)) return 100;
      if (label.includes(q)) return 80;
      if (hay.includes(q)) return 60;
      const toks = q.split(/\s+/).filter(Boolean);
      if (toks.length > 1 && toks.every((t) => hay.includes(t))) return 50;
      if (q.length >= 3) {                         // lletres en ordre (cerca "difusa")
        let i = 0;
        for (const ch of label) { if (ch === q[i]) i++; if (i === q.length) return 30; }
      }
      return 0;
    };

    /* ---------- DOM ---------- */
    let box, input, list, opened = false, active = 0, shown = [], prevFocus = null, closeT;

    const build = () => {
      box = document.createElement('div');
      box.className = 'pal';
      box.hidden = true;
      box.innerHTML =
        '<div class="pal-back"></div>' +
        '<div class="pal-box" role="dialog" aria-modal="true" aria-label="Paleta d\'ordres">' +
          '<input class="pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" ' +
            'aria-autocomplete="list" placeholder="Cerca o salta a…" autocomplete="off" spellcheck="false">' +
          '<ul class="pal-list" id="pal-list" role="listbox" aria-label="Resultats"></ul>' +
          '<p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navega</span><span><kbd>↵</kbd> obre</span><span><kbd>Esc</kbd> tanca</span></p>' +
        '</div>';
      document.body.appendChild(box);
      input = $('.pal-input', box);
      list = $('.pal-list', box);

      $('.pal-back', box).addEventListener('click', close);
      input.addEventListener('input', () => { active = 0; render(); });
      input.addEventListener('keydown', onKey);
      list.addEventListener('pointermove', (e) => {
        const li = e.target.closest('.pal-o');
        if (li && +li.dataset.n !== active) setActive(+li.dataset.n, false);
      });
      list.addEventListener('click', (e) => {
        const li = e.target.closest('.pal-o');
        if (li) choose(+li.dataset.n);
      });
    };

    const render = () => {
      const q = norm(input.value.trim());
      let rows;
      if (q) {
        rows = ITEMS.map((it) => ({ it, s: score(it, q) })).filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.it);
      } else rows = ITEMS.slice();
      shown = rows;

      if (!rows.length) {
        list.innerHTML = '<li class="pal-empty" role="presentation">' + tr('No he trobat res per a') + ' «' +
          input.value.replace(/[<>&"]/g, '') + '».</li>';
        input.removeAttribute('aria-activedescendant');
        return;
      }
      let html = '', lastGroup = '';
      rows.forEach((it, n) => {
        if (!q && it.group !== lastGroup) { html += '<li class="pal-h" role="presentation">' + tr(it.group) + '</li>'; lastGroup = it.group; }
        html += '<li class="pal-o" role="option" id="pal-o-' + n + '" data-n="' + n + '" aria-selected="' + (n === active) + '">' +
          '<span class="pal-t">' + labelOf(it) + '</span><span class="pal-g">' + tr(it.group) + '</span></li>';
      });
      list.classList.toggle('nq', !q);
      list.innerHTML = html;
      input.setAttribute('aria-activedescendant', 'pal-o-' + active);
    };

    const setActive = (n, scroll = true) => {
      if (!shown.length) return;
      active = (n + shown.length) % shown.length;
      $$('.pal-o', list).forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.n === active)));
      input.setAttribute('aria-activedescendant', 'pal-o-' + active);
      if (scroll) { const li = $('#pal-o-' + active, list); if (li) li.scrollIntoView({ block: 'nearest' }); }
    };

    const choose = (n) => {
      const it = shown[n];
      if (!it) return;
      close(true);
      setTimeout(() => { if (it.href) go(it.href); else if (it.run) it.run(); }, 80);
    };

    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
      else if (e.key === 'Tab') { e.preventDefault(); }          // el focus es queda al camp de cerca
    };

    const open = () => {
      if (opened) return;
      if (!box) build();
      opened = true;
      clearTimeout(closeT);
      prevFocus = document.activeElement;
      input.value = '';
      active = 0;
      render();
      box.hidden = false;
      root.classList.add('pal-open');
      requestAnimationFrame(() => { box.classList.add('open'); input.focus(); });
      Sound.play('open');
    };

    const close = (silent) => {
      if (!opened) return;
      opened = false;
      box.classList.remove('open');
      root.classList.remove('pal-open');
      closeT = setTimeout(() => { box.hidden = true; }, 220);
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus({ preventScroll: true }); } catch (e) {} }
      if (silent !== true) Sound.play('close');
    };

    return { open, close, add: (items) => ITEMS.push(...items), toggle: () => (opened ? close() : open()), get isOpen() { return opened; } };
  })();

  /* Botons del menú: cerca i so */
  const mountNav = () => {
    const right = $('.nav-right');
    if (!right) return;
    const anchor = $('.btn', right);

    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'nav-btn nav-k';
    k.setAttribute('aria-label', 'Obre la paleta d\'ordres');
    k.setAttribute('aria-keyshortcuts', (isMac ? 'Meta' : 'Control') + '+K');
    k.innerHTML =
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' +
      '<kbd>' + (isMac ? '⌘' : 'Ctrl') + ' K</kbd>';
    k.addEventListener('click', () => Palette.open());

    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'nav-btn nav-s';
    s.setAttribute('aria-pressed', 'false');
    s.setAttribute('aria-label', 'So de la web');
    s.title = 'So de la web';
    s.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
      '<g class="w-on"><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></g>' +
      '<g class="w-off"><path d="M17 9.5l5 5M22 9.5l-5 5"/></g></svg>';
    s.addEventListener('click', () => Sound.toggle());
    Sound.onChange((on) => {
      s.setAttribute('aria-pressed', String(on));
      s.title = on ? 'Silencia el so' : 'Activa el so';
    });

    right.insertBefore(k, anchor);
    right.insertBefore(s, anchor);
  };

  /* ==========================================================
     3. CODI KONAMI
     ========================================================== */
  const confetti = () => {
    if (reduce) return;
    const cv = document.createElement('canvas');
    cv.className = 'xconfetti';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hue = parseFloat(getComputedStyle(root).getPropertyValue('--hue')) || 75;
    const ps = Array.from({ length: 180 }, (_, i) => {
      const left = i % 2 === 0;
      const a = (left ? -Math.PI / 3 : -2 * Math.PI / 3) + (Math.random() - .5) * .9;
      const s = 9 + Math.random() * 11;
      return { x: left ? 0 : W, y: H, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
        c: ((hue + Math.random() * 300) % 360) };
    });
    let f = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      f++;
      for (const p of ps) {
        p.vy += .3; p.vx *= .99; p.vy *= .99;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = 'hsl(' + p.c + ' 100% 60% / ' + Math.max(0, Math.min(1, 1 - (f - 70) / 50)).toFixed(2) + ')';
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (f < 125) requestAnimationFrame(tick); else cv.remove();
    };
    tick();
  };

  const initKonami = () => {
    const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    let buf = [];
    addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && t.matches && t.matches('input, textarea, select, [contenteditable="true"]')) return;
      buf.push(String(e.key).toLowerCase());
      if (buf.length > CODE.length) buf.shift();
      if (buf.length === CODE.length && buf.every((k, i) => k === CODE[i])) {
        buf = [];
        const on = root.classList.toggle('konami');
        if (on) { confetti(); Sound.play('konami'); toast('🎮 Mode Konami activat · torna a escriure el codi per sortir'); }
        else toast('Mode Konami desactivat');
      }
    });
  };

  /* ==========================================================
     DREÇERA DE TECLAT I ARRENCADA
     ========================================================== */
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'k') {
      e.preventDefault();
      Palette.toggle();
    } else if (e.key === 'Escape' && Palette.isOpen) {
      e.preventDefault();
      Palette.close();
    }
  });

  /* Per si altres scripts (com el joc del 404) volen fer servir el so o els avisos */
  window.JMX = { sound: Sound, toast, palette: Palette, popover: Popover, store };

  const boot = () => {
    [mountNav, initSoundEvents, initKonami, () => Sound.init()].forEach((fn) => {
      try { fn(); } catch (e) { console.warn('extras.js:', e); }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
