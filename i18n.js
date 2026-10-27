/* ==========================================================
   IDIOMES · i18n.js
   Català (per defecte), castellà i anglès.
   Es carrega a totes les pàgines. El català és el text que hi ha
   escrit a l'HTML; les traduccions viuen a i18n-data.js, que només
   es descarrega quan algú tria un altre idioma.

   Com funciona: busca tots els textos de la pàgina i, si l'idioma
   no és el català, els canvia pel seu equivalent del diccionari.
   També vigila els textos que altres scripts afegeixen després.
   Si una frase no és al diccionari, es queda en català (no es trenca res).

   Per afegir o corregir una traducció: obre i18n-data.js. Cada línia
   és  ["text en català", "text en castellà", "text en anglès"].
   JavaScript pur, sense llibreries.
   ========================================================== */
(() => {
  'use strict';

  const LANGS = [['ca', 'Català'], ['es', 'Castellano'], ['en', 'English']];
  const OGL = { ca: 'ca_ES', es: 'es_ES', en: 'en_GB' };
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'data-cursor', 'data-text', 'data-scramble'];
  const SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };
  const META = 'meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:image:alt"],meta[name="twitter:title"],meta[name="twitter:description"]';
  const root = document.documentElement;
  const SELF = document.currentScript && document.currentScript.src;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  let lang = 'ca';
  let DICT = null;            // Map: català normalitzat -> [castellà, anglès]
  let loading = null;
  let mo = null;

  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

  /* ---------- Diccionari ---------- */
  const find = (core) => {
    if (lang === 'ca' || !DICT) return undefined;
    const r = DICT.get(norm(core));
    if (!r) return undefined;
    const v = r[lang === 'es' ? 0 : 1];
    return typeof v === 'string' ? v : undefined;
  };

  /* Tradueix un text conservant els espais del voltant */
  const translate = (src) => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(src);
    if (!m[2]) return src;
    const hit = find(m[2]);
    return hit === undefined ? src : m[1] + hit + m[3];
  };

  const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : s);
  const t = (s, v) => fill(translate(String(s)), v);

  /* ---------- Nodes de text i atributs ---------- */
  const tn = new WeakMap();   // node -> { src, out }
  const doText = (n) => {
    const p = n.parentElement;
    if (!p || SKIP[p.tagName] || p.closest('[data-words], .kinetic, [data-no-i18n]')) return;
    const cur = n.nodeValue;
    let rec = tn.get(n);
    if (!rec || cur !== rec.out) { rec = { src: cur, out: cur }; tn.set(n, rec); }   // text nou o canviat per un altre script
    const target = lang === 'ca' ? rec.src : translate(rec.src);
    if (target !== cur) n.nodeValue = target;
    rec.out = target;
  };

  const an = new WeakMap();   // element -> { attr: { src, out } }
  const doAttr = (el, a) => {
    if (!el.hasAttribute(a)) return;
    let m = an.get(el);
    if (!m) { m = {}; an.set(el, m); }
    const cur = el.getAttribute(a);
    let rec = m[a];
    if (!rec || cur !== rec.out) { rec = { src: cur, out: cur }; m[a] = rec; }
    const target = lang === 'ca' ? rec.src : translate(rec.src);
    if (target !== cur) el.setAttribute(a, target);
    rec.out = target;
  };
  const doAttrs = (el) => ATTRS.forEach((a) => doAttr(el, a));
  const ATTR_SEL = ATTRS.map((a) => '[' + a + ']').join(',');

  const walk = (node) => {
    if (node.nodeType === 3) return doText(node);
    if (node.nodeType !== 1) return;
    if (SKIP[node.tagName]) return;
    const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) doText(n);
    if (node.matches(ATTR_SEL)) doAttrs(node);
    node.querySelectorAll(ATTR_SEL).forEach(doAttrs);
  };

  /* Etiquetes <meta> (descripció i xarxes socials) */
  const doMeta = () => {
    document.querySelectorAll(META).forEach((m) => doAttr(m, 'content'));
    const l = document.querySelector('meta[property="og:locale"]');
    if (l) l.setAttribute('content', OGL[lang]);
  };

  /* Text que s'encén paraula a paraula (script.js el reconstrueix) */
  const doWords = () => {
    document.querySelectorAll('[data-words]').forEach((el) => {
      if (el._src === undefined) {
        const spans = el.querySelectorAll('span');
        el._src = (spans.length ? Array.from(spans, (s) => s.textContent).join(' ') : el.textContent).trim();
        el._out = el._src;
      }
      const target = lang === 'ca' ? el._src : translate(el._src);
      if (target !== el._out) {
        el._out = target;
        el.dispatchEvent(new CustomEvent('jm:words', { detail: target }));
      }
    });
  };

  /* ---------- Vigilant: tradueix el que altres scripts afegeixen ---------- */
  const startWatch = () => {
    if (mo) return;
    mo = new MutationObserver((recs) => {
      recs.forEach((r) => {
        if (r.type === 'childList') r.addedNodes.forEach(walk);
        else if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') doAttr(r.target, r.attributeName);
      });
      mo.takeRecords();     // ignora els canvis que acabem de fer nosaltres
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  const stopWatch = () => { if (mo) { mo.disconnect(); mo = null; } };

  /* ---------- Carrega del diccionari (només si cal) ---------- */
  const load = () => {
    if (DICT) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = SELF ? new URL('i18n-data.js', SELF).href : 'i18n-data.js';
      s.onload = () => {
        DICT = new Map();
        (window.JM_I18N || []).forEach((row) => DICT.set(norm(row[0]), [row[1], row[2]]));
        ok();
      };
      s.onerror = () => { loading = null; ko(new Error('i18n-data.js')); };
      document.head.appendChild(s);
    });
    return loading;
  };

  /* ---------- Canvi d'idioma ---------- */
  const labels = [];          // callbacks per refrescar la interfície del selector
  const apply = () => {
    root.lang = lang;
    stopWatch();
    walk(document.documentElement);
    doMeta();
    doWords();
    mo = null; if (lang !== 'ca') startWatch();
    labels.forEach((fn) => fn());
    document.dispatchEvent(new CustomEvent('jm:lang', { detail: lang }));
  };

  const set = (l, persist = true) => {
    if (!LANGS.some((x) => x[0] === l)) return Promise.resolve();
    lang = l;
    if (persist) store.set('jm-lang', l);
    if (l === 'ca') { apply(); return Promise.resolve(); }
    return load().then(apply, () => {
      lang = 'ca'; apply();
      if (window.JMX && JMX.toast) JMX.toast('No s\'ha pogut carregar la traducció');
    });
  };

  /* ---------- Interfície: botó al menú ---------- */
  const mount = () => {
    const right = document.querySelector('.nav-right');
    if (!right || !window.JMX || !JMX.popover) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn nav-l';
    btn.setAttribute('aria-label', 'Idioma');
    btn.title = 'Idioma';
    const code = document.createElement('span');
    code.setAttribute('aria-hidden', 'true');
    btn.appendChild(code);
    const a11y = right.querySelector('.nav-a');
    right.insertBefore(btn, a11y || right.querySelector('.btn'));

    const panel = document.createElement('div');
    panel.className = 'lang-panel';
    panel.setAttribute('aria-label', 'Idioma');
    const group = document.createElement('div');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Idioma');
    LANGS.forEach(([c, name]) => {
      const o = document.createElement('button');
      o.type = 'button';
      o.className = 'lang-o';
      o.dataset.l = c;
      o.setAttribute('role', 'radio');
      o.setAttribute('lang', c);
      o.innerHTML = '<span></span><small aria-hidden="true"></small>';
      o.firstChild.textContent = name;
      o.lastChild.textContent = c.toUpperCase();
      group.appendChild(o);
    });
    panel.appendChild(group);
    const pop = JMX.popover(btn, panel);
    group.addEventListener('click', (e) => {
      const o = e.target.closest('.lang-o');
      if (!o) return;
      set(o.dataset.l).then(() => pop.close(true));
    });

    const refresh = () => {
      code.textContent = lang.toUpperCase();
      btn.setAttribute('aria-label', lang.toUpperCase() + ' · ' + t('Idioma'));   // el nom accessible ha d'incloure el text visible
      group.querySelectorAll('.lang-o').forEach((o) => o.setAttribute('aria-checked', String(o.dataset.l === lang)));
    };
    labels.push(refresh);
    refresh();

    /* Paleta Ctrl+K */
    if (JMX.palette && JMX.palette.add) {
      JMX.palette.add(LANGS.map(([c, name]) => ({
        label: 'Idioma: ' + name, group: 'Accions',
        kw: 'idioma language lengua llengua catala castellano espanol english angles',
        run: () => { set(c); }
      })));
    }
  };

  /* ---------- Suggeriment per a qui té el navegador en castellà o anglès ---------- */
  const HINT = {
    es: ['¿Prefieres ver la web en castellano?', 'Sí, cambiar', 'No, gracias'],
    en: ['Would you like to view this site in English?', 'Yes, switch', 'No, thanks']
  };
  const hint = () => {
    if (store.get('jm-lang') || store.get('jm-lang-hint') || lang !== 'ca') return;
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ca']);
    const first = String(prefs[0] || 'ca').slice(0, 2).toLowerCase();
    if (!HINT[first]) return;
    const [msg, yes, no] = HINT[first];
    const bar = document.createElement('div');
    bar.className = 'lang-hint';
    bar.setAttribute('role', 'region');
    bar.setAttribute('lang', first);
    bar.setAttribute('aria-label', 'Language');
    bar.innerHTML = '<p></p><div><button type="button" class="btn btn-sm" data-y></button><button type="button" class="btn btn-sm btn-ghost" data-n></button></div>';
    bar.querySelector('p').textContent = msg;
    bar.querySelector('[data-y]').textContent = yes;
    bar.querySelector('[data-n]').textContent = no;
    const done = () => { store.set('jm-lang-hint', '1'); bar.remove(); };
    bar.querySelector('[data-y]').addEventListener('click', () => { done(); set(first); });
    bar.querySelector('[data-n]').addEventListener('click', done);
    setTimeout(() => document.body.appendChild(bar), 2500);
  };

  /* ---------- Arrencada ---------- */
  window.JMI18N = {
    t,
    set,
    get lang() { return lang; },
    locale: () => lang,
    langs: LANGS.map((x) => x[0])
  };

  const boot = () => {
    let want = store.get('jm-lang');
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q && LANGS.some((x) => x[0] === q)) { want = q; store.set('jm-lang', q); }
    } catch (e) {}
    try { mount(); } catch (e) { console.warn('i18n.js:', e); }
    if (want && want !== 'ca') set(want, false);
    else { root.lang = 'ca'; hint(); }
  };
  // Amb defer, l'script s'executa abans de DOMContentLoaded: esperem que extras.js hagi creat window.JMX
  if (document.readyState === 'complete') boot();
  else addEventListener('DOMContentLoaded', boot);
})();
