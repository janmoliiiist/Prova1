/* ==========================================================
   ACCESSIBILITAT · a11y.js
   Es carrega a totes les pàgines, ABANS de script.js.
   1. Aplica de seguida les preferències guardades (text gran,
      contrast alt, tipografia llegible, sense animacions...).
   2. Afegeix el botó d'accessibilitat al menú, amb el seu panell.
   3. Afegeix l'enllaç «Salta al contingut» i corregeix el focus
      amb teclat a la secció de projectes.
   Les preferències es guarden només al teu navegador.
   JavaScript pur, sense llibreries.
   ========================================================== */
(() => {
  'use strict';

  const KEY = 'jm-a11y';
  const root = document.documentElement;
  const OS_CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEFAULTS = { size: 0, contrast: false, font: false, calm: false, simple: false, grid: false, links: false };

  const read = () => {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  };
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

  let prefs = read();

  /* ---------- Aplica les preferències com a classes de <html> ---------- */
  const apply = () => {
    const c = root.classList;
    c.toggle('a11y-size1', prefs.size === 1);
    c.toggle('a11y-size2', prefs.size === 2);
    c.toggle('a11y-contrast', !!prefs.contrast);
    c.toggle('a11y-font', !!prefs.font);
    c.toggle('a11y-calm', !!prefs.calm || OS_CALM);
    c.toggle('a11y-simple', !!prefs.simple);
    c.toggle('a11y-grid', !!prefs.grid);
    c.toggle('a11y-links', !!prefs.links);
    c.toggle('a11y-on', JSON.stringify(prefs) !== JSON.stringify(DEFAULTS));
  };
  apply();   // abans que s'executi script.js, que mira la classe a11y-calm

  /* ---------- A partir d'aquí cal el DOM ---------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const OPTIONS = [
    { k: 'contrast', t: 'Contrast alt', d: 'Fons més fosc, text i vores més marcats.' },
    { k: 'font', t: 'Tipografia llegible', d: 'Lletra pensada per a baixa visió i més espai entre lletres.' },
    { k: 'links', t: 'Enllaços subratllats', d: 'Subratlla els enllaços i marca més el focus del teclat.' },
    { k: 'calm', t: 'Sense animacions', d: 'Treu moviments, transicions i la pantalla de càrrega.', reload: true },
    { k: 'simple', t: 'Fons i cursor simples', d: 'Amaga les partícules, la llum i el cursor personalitzat.' },
    { k: 'grid', t: 'Projectes en quadrícula', d: 'Els projectes es veuen en una quadrícula, sense scroll horitzontal.' }
  ];
  const SIZES = [['A', 'Text normal'], ['A+', 'Text gran'], ['A++', 'Text molt gran']];

  const mount = () => {
    const right = $('.nav-right');
    if (!right || !window.JMX || !JMX.popover) return;

    /* Botó del menú */
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn nav-a';
    btn.setAttribute('aria-label', 'Accessibilitat');
    btn.title = 'Accessibilitat';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="4.6" r="1.7"/><path d="M5 8.2l7 1.3 7-1.3"/><path d="M12 9.5v4.6"/><path d="M12 14.1l-3.4 6M12 14.1l3.4 6"/></svg>' +
      '<i class="nav-dot" aria-hidden="true"></i>';
    const lang = $('.nav-l', right);
    right.insertBefore(btn, lang ? lang.nextSibling : $('.btn', right));

    /* Panell */
    const panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.setAttribute('aria-label', 'Accessibilitat');
    let h = '<div class="pop-h"><b>Accessibilitat</b><button type="button" class="pop-x" aria-label="Tanca" data-close>×</button></div>';
    h += '<div class="a11y-sz" role="group" aria-label="Mida del text">';
    SIZES.forEach(([lab, name], i) => {
      h += '<button type="button" data-size="' + i + '" aria-pressed="false" aria-label="' + name + '" class="sz sz' + i + '">' + lab + '</button>';
    });
    h += '</div>';
    OPTIONS.forEach((o) => {
      h += '<button type="button" class="a11y-sw" role="switch" aria-checked="false" data-k="' + o.k + '">' +
        '<span class="a11y-tx"><b>' + o.t + '</b><small>' + o.d + '</small></span><i class="a11y-tg" aria-hidden="true"></i></button>';
    });
    h += '<button type="button" class="a11y-reset" data-reset>Restableix-ho tot</button>';
    panel.innerHTML = h;

    const pop = JMX.popover(btn, panel);

    const sync = () => {
      $$('[data-size]', panel).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.size === prefs.size)));
      $$('.a11y-sw', panel).forEach((b) => {
        const k = b.dataset.k;
        const on = k === 'calm' ? (prefs.calm || OS_CALM) : !!prefs[k];
        b.setAttribute('aria-checked', String(on));
        if (k === 'calm') b.disabled = OS_CALM;
      });
    };
    sync();

    const change = (patch, reload) => {
      Object.assign(prefs, patch);
      write(); apply(); sync();
      if (reload) location.reload();
    };

    panel.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-close')) return pop.close(true);
      if (t.dataset.size !== undefined) return change({ size: +t.dataset.size });
      if (t.dataset.k) {
        const o = OPTIONS.find((x) => x.k === t.dataset.k);
        return change({ [o.k]: !prefs[o.k] }, o.reload);
      }
      if (t.hasAttribute('data-reset')) {
        const hadCalm = prefs.calm;
        prefs = Object.assign({}, DEFAULTS);
        write(); apply(); sync();
        if (hadCalm) location.reload();
      }
    });

    /* Accés ràpid des de la paleta Ctrl+K */
    if (JMX.palette && JMX.palette.add) {
      const toggle = (k, onMsg, offMsg, reload) => () => {
        const v = !prefs[k];
        if (window.JMX.toast) JMX.toast(v ? onMsg : offMsg);
        change({ [k]: v }, reload);
      };
      JMX.palette.add([
        { label: 'Obre el menú d\'accessibilitat', group: 'Accions', kw: 'accessibilitat accesibilidad accessibility a11y ajustos', run: () => pop.open() },
        { label: 'Contrast alt', group: 'Accions', kw: 'accessibilitat contrast visio', run: toggle('contrast', 'Contrast alt activat', 'Contrast alt desactivat') },
        { label: 'Text més gran', group: 'Accions', kw: 'accessibilitat mida lletra zoom', run: () => { const n = (prefs.size + 1) % 3; change({ size: n }); JMX.toast(SIZES[n][1]); } },
        { label: 'Sense animacions', group: 'Accions', kw: 'accessibilitat moviment reduit calma', run: toggle('calm', 'Animacions desactivades', 'Animacions activades', true) }
      ]);
    }
    window.JMA11Y = { open: pop.open, prefs: () => Object.assign({}, prefs) };
  };

  /* ---------- Salta al contingut ---------- */
  const skip = () => {
    if ($('.skip')) return;
    const main = $('main') || $('#inici') || $('.nf') || $('.case-page > *:not(header):not(nav)');
    if (!main) return;
    if (!main.id) main.id = 'contingut';
    main.setAttribute('tabindex', '-1');
    const a = document.createElement('a');
    a.className = 'skip';
    a.href = '#' + main.id;
    a.textContent = 'Salta al contingut';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      main.focus({ preventScroll: true });
      main.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    document.body.insertBefore(a, document.body.firstChild);
  };

  /* ---------- Projectes: el focus amb teclat porta el scroll fins a la targeta ---------- */
  const trackFocus = () => {
    const work = $('.work'), track = $('.work-track'), sticky = $('.work-sticky');
    if (!work || !track || !sticky) return;
    sticky.addEventListener('scroll', () => { sticky.scrollLeft = 0; });   // el navegador pot desplaçar-lo en enfocar
    track.addEventListener('focusin', (e) => {
      if (innerWidth <= 800 || root.classList.contains('a11y-grid')) return;
      const card = e.target.closest('.project');
      if (!card) return;
      const maxX = track.offsetWidth - innerWidth;
      const total = work.offsetHeight - innerHeight;
      if (maxX <= 0 || total <= 0) return;
      const want = card.offsetLeft - (innerWidth - card.offsetWidth) / 2;
      const p = Math.min(1, Math.max(0, want / maxX));
      const top = work.getBoundingClientRect().top + scrollY + p * total;
      scrollTo({ top, behavior: 'auto' });
    });
  };

  const boot = () => {
    [mount, skip, trackFocus].forEach((fn) => { try { fn(); } catch (e) { console.warn('a11y.js:', e); } });
  };
  // Els scripts amb defer s'executen amb readyState «interactive»: esperem a DOMContentLoaded perquè extras.js ja existeixi
  if (document.readyState === 'complete') boot();
  else addEventListener('DOMContentLoaded', boot);
})();
