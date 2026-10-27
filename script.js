/* ==========================================================
   PORTAFOLI · script.js
   Tot en JavaScript pur, sense llibreries.
   ========================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-calm');
  const fine   = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root   = document.documentElement;
  const mobile = () => innerWidth <= 800;

  let hue = 75;

  /* ---------- 1. COLOR D'ACCENT (es guarda al navegador) ---------- */
  try { const saved = localStorage.getItem('hue'); if (saved) hue = +saved; } catch (e) {}

  const setHue = (h) => {
    hue = +h;
    root.style.setProperty('--hue', hue);
    $$('.hues button').forEach(b => b.classList.toggle('on', +b.dataset.hue === hue));
    try { localStorage.setItem('hue', hue); } catch (e) {}
  };
  setHue(hue);
  $$('.hues button').forEach(b => b.addEventListener('click', () => setHue(b.dataset.hue)));

  /* ---------- 2. PANTALLA DE CÀRREGA ---------- */
  const loaderNum = $('.loader-num');
  const loaderBar = $('.loader-bar i');
  const finishLoading = () => {
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
  };

  if (reduce) {
    finishLoading();
  } else {
    let count = 0;
    const step = () => {
      count = Math.min(100, count + 1 + Math.floor(Math.random() * 7));
      loaderNum.textContent = count;
      loaderBar.style.width = count + '%';
      if (count < 100) setTimeout(step, 45);
      else setTimeout(finishLoading, 350);
    };
    step();
  }

  /* ---------- 3. COMPTADORS ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = end + suffix; return; }
    const dur = 1600, t0 = performance.now();
    const f = (t) => {
      const p = clamp((t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))) + suffix;
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };

  /* ---------- 4. REVELATS I COMPTADORS AL FER SCROLL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { cio.unobserve(e.target); countUp(e.target); }
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- 5. TEXT QUE S'ENCÉN PARAULA A PARAULA ---------- */
  const aboutText = $('[data-words]');
  let words = [];
  const buildWords = (text) => {
    aboutText.textContent = '';
    words = [];
    text.trim().split(/\s+/).forEach((w) => {
      const s = document.createElement('span');
      s.className = 'w' + (reduce ? ' lit' : '');
      s.textContent = w;
      aboutText.appendChild(s);
      aboutText.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  };
  if (aboutText) {
    buildWords(aboutText.textContent);
    // i18n.js demana tornar a partir el text quan es canvia d'idioma
    aboutText.addEventListener('jm:words', (e) => { buildWords(e.detail); updateWords(); });
  }
  const updateWords = () => {
    if (!words.length || reduce) return;
    const r = aboutText.getBoundingClientRect();
    const p = clamp((innerHeight * .8 - r.top) / (r.height + innerHeight * .2));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  };

  /* ---------- 6. SCROLL: BARRA DE PROGRÉS + PROJECTES HORITZONTALS ---------- */
  const prog  = $('.progress i');
  const work  = $('.work');
  const track = $('.work-track');
  const wprog = $('.work-progress i');

  const sizeWork = () => {
    if (!work) return;
    if (mobile()) { work.style.height = ''; track.style.transform = ''; return; }
    const maxX = track.offsetWidth - innerWidth;
    work.style.height = (maxX * 1.15 + innerHeight) + 'px';
  };

  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';

    if (work && !mobile()) {
      const r = work.getBoundingClientRect();
      const total = work.offsetHeight - innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      const maxX = track.offsetWidth - innerWidth;
      track.style.transform = 'translate3d(' + (-p * maxX) + 'px,0,0)';
      wprog.style.transform = 'scaleX(' + p + ')';
    }
    updateWords();
  };

  /* ---------- 7. CURSOR PERSONALITZAT + LLUM ---------- */
  const glow = $('.glow');
  const cur  = $('.cursor');
  const lab  = $('.cursor-label');
  let mx = innerWidth / 2, my = innerHeight / 2;
  let gx = mx, gy = my, cx = mx, cy = my;
  let pointerSeen = false;

  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!pointerSeen) { pointerSeen = true; cur.classList.add('on'); }
  }, { passive: true });

  if (fine) {
    root.classList.add('has-cursor');
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, [data-cursor]');
      cur.classList.toggle('active', !!t);
      const txt = t ? t.dataset.cursor : '';
      lab.textContent = txt || '';
      lab.classList.toggle('show', !!txt);
    });
  }

  /* ---------- 8. FONS DE PARTÍCULES ---------- */
  const cv  = $('#bg');
  const ctx = cv ? cv.getContext('2d') : null;
  let W = 0, H = 0, pts = [];

  const col = (a) => 'hsl(' + hue + ' 100% 60% / ' + a + ')';

  const initBg = () => {
    if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(100, Math.round((W * H) / 16000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.5 + .5
    }));
  };

  const drawBg = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];

      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        if (pointerSeen) {
          const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
          if (d > 0 && d < 140) {
            p.x += (dx / d) * (140 - d) * .02;
            p.y += (dy / d) * (140 - d) * .02;
          }
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = col(.8);
      ctx.fill();

      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 120) {
          ctx.strokeStyle = col(((1 - d / 120) * .25).toFixed(3));
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }

      if (pointerSeen) {
        const dm = Math.hypot(p.x - mx, p.y - my);
        if (dm < 180) {
          ctx.strokeStyle = col(((1 - dm / 180) * .5).toFixed(3));
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
        }
      }
    }
  };

  /* ---------- 9. BUCLE PRINCIPAL ---------- */
  const tick = () => {
    gx += (mx - gx) * .06; gy += (my - gy) * .06;
    glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';

    if (fine) {
      cx += (mx - cx) * .2; cy += (my - cy) * .2;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      lab.style.transform = 'translate(' + (cx + 26) + 'px,' + (cy + 26) + 'px)';
    }
    drawBg();
    requestAnimationFrame(tick);
  };

  /* ---------- 10. BOTONS MAGNÈTICS ---------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (x * .3) + 'px,' + (y * .4) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 11. TARGETES 3D AMB LLUM ---------- */
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100) + '%');
      el.style.setProperty('--my', (py * 100) + '%');
      if (fine && !reduce) {
        el.style.transform = 'perspective(900px) rotateX(' + ((.5 - py) * 8) + 'deg) rotateY(' + ((px - .5) * 8) + 'deg)';
      }
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- 12. PARALLAX DELS XIPS DEL HERO ---------- */
  const chips = $$('.chip');
  if (!reduce && chips.length) {
    addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - .5;
      const ny = e.clientY / innerHeight - .5;
      chips.forEach((c) => {
        const d = +c.dataset.depth || 20;
        c.style.setProperty('--px', (nx * d) + 'px');
        c.style.setProperty('--py', (ny * d) + 'px');
      });
    }, { passive: true });
  }

  /* ---------- 13. COPIAR EL CORREU ---------- */
  $$('[data-copy]').forEach((b) => {
    b.addEventListener('click', async () => {
      const old = b.textContent;
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = window.JMI18N ? window.JMI18N.t('Copiat! ✓') : 'Copiat! ✓';
      } catch (e) {
        b.textContent = b.dataset.copy;
      }
      setTimeout(() => { b.textContent = old; }, 2000);
    });
  });

  /* ---------- 14. ANY AL FOOTER ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- 15. ARRENCADA ---------- */
  initBg();
  sizeWork();
  onScroll();

  if (reduce) drawBg(); else requestAnimationFrame(tick);

  addEventListener('scroll', onScroll, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initBg(); sizeWork(); onScroll();
      if (reduce) drawBg();
    }, 120);
  });

  // Quan carreguen les tipografies, les mides canvien: recalculem
  const refresh = () => { sizeWork(); onScroll(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
})();
