/* ==========================================================
   LABORATORI · lab2.js  (experiments 10 a 20)
   Va després de script.js i lab.js. JavaScript pur, sense
   cap llibreria. Cada experiment és independent: si un falla,
   els altres segueixen funcionant.
   ========================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- COLOR D'ACCENT COMPARTIT ---------- */
  let hue = 75;
  let rgb = [.8, 1, .2];
  const hslToRgb = (h, s, l) => {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)];
  };
  const syncHue = () => {
    hue = parseFloat(getComputedStyle(root).getPropertyValue('--hue')) || 75;
    rgb = hslToRgb((((hue % 360) + 360) % 360) / 360, 1, .6);
  };
  new MutationObserver(syncHue).observe(root, { attributes: true, attributeFilter: ['style'] });
  syncHue();
  const accentCss = (a) => 'hsl(' + hue + ' 100% 60% / ' + a + ')';

  /* ---------- UTILITATS ---------- */
  const watch = (el, cb) => {
    new IntersectionObserver((es) => cb(es[0].isIntersecting), { threshold: 0 }).observe(el);
  };
  const rel = (e, el) => {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const fit = (cv) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(2, cv.clientWidth), H = Math.max(2, cv.clientHeight);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H };
  };
  const onResize = (fn) => {
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fn, 150); });
  };
  const copy = async (text, done) => {
    try { await navigator.clipboard.writeText(text); if (done) done(true); }
    catch (e) { if (done) done(false); }
  };
  const flashText = (btn, txt) => {
    const old = btn.dataset.old || btn.textContent;
    btn.dataset.old = old;
    btn.textContent = txt;
    clearTimeout(btn._ft);
    btn._ft = setTimeout(() => { btn.textContent = old; }, 1800);
  };

  /* Confeti a pantalla completa */
  const confetti = (ox, oy) => {
    if (reduce) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ps = Array.from({ length: 160 }, () => {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.7, s = 6 + Math.random() * 10;
      return {
        x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
        r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
        c: ((hue + Math.random() * 160 - 80) % 360 + 360) % 360
      };
    });
    let f = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      f++;
      for (const p of ps) {
        p.vy += .28; p.vx *= .99; p.vy *= .99;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = 'hsl(' + p.c + ' 100% 60% / ' + clamp(1 - (f - 60) / 50).toFixed(2) + ')';
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (f < 110) requestAnimationFrame(tick); else cv.remove();
    };
    tick();
  };

  /* Programa WebGL mínim (un quadrat de pantalla completa) */
  const makeGL = (cv, fs, names) => {
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const v = mk(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}');
    const f = mk(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    names.forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
    return { gl, u };
  };

  /* ==========================================================
     10. GRAELLA D'ONES
     ========================================================== */
  const initWave = () => {
    const cv = $('#wave');
    if (!cv) return;
    const GAP = 22;
    let ctx, W = 0, H = 0, dots = [], ripples = [], visible = false;
    let mx = -9999, my = -9999, lastRip = 0, idle = 0;

    const build = () => {
      ({ ctx, W, H } = fit(cv));
      dots = [];
      const cols = Math.ceil(W / GAP) + 1, rows = Math.ceil(H / GAP) + 1;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dots.push({ x: c * GAP, y: r * GAP });
    };
    const add = (x, y, s) => { ripples.push({ x, y, t: 0, s }); if (ripples.length > 8) ripples.shift(); };

    cv.addEventListener('pointermove', (e) => {
      [mx, my] = rel(e, cv);
      const now = performance.now();
      if (now - lastRip > 150) { add(mx, my, .35); lastRip = now; }
    });
    cv.addEventListener('pointerleave', () => { mx = my = -9999; });
    cv.addEventListener('pointerdown', (e) => { const [x, y] = rel(e, cv); add(x, y, 1.5); });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = accentCss(1);
      for (const r of ripples) r.t++;
      ripples = ripples.filter((r) => r.t < 300);
      for (const d of dots) {
        let ox = 0, oy = 0, glow = 0;
        for (const r of ripples) {
          const dx = d.x - r.x, dy = d.y - r.y, dist = Math.hypot(dx, dy) || 1;
          const ring = dist - r.t * 4.2;
          const w = Math.exp(-(ring * ring) / 1800) * r.s * Math.exp(-r.t / 120);
          ox += dx / dist * w * 12; oy += dy / dist * w * 12; glow += w;
        }
        const cx = d.x - mx, cy = d.y - my, cd = Math.hypot(cx, cy);
        if (cd < 110 && cd > 0) {
          const f = 1 - cd / 110;
          ox += cx / cd * f * 14; oy += cy / cd * f * 14; glow += f * .8;
        }
        const g = clamp(glow);
        ctx.globalAlpha = .2 + g * .8;
        ctx.beginPath();
        ctx.arc(d.x + ox, d.y + oy, 1.3 + g * 2.6, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    build();
    watch(cv, (on) => { visible = on; });
    if (reduce) { draw(); onResize(() => { build(); draw(); }); return; }
    const loop = () => {
      requestAnimationFrame(loop);
      if (!visible) return;
      if (mx < -999 && ++idle > 150) { idle = 0; add(Math.random() * W, Math.random() * H, 1); }
      draw();
    };
    requestAnimationFrame(loop);
    onResize(build);
  };

  /* ==========================================================
     11. RASTRE DE LLUM
     ========================================================== */
  const initTrail = () => {
    const cv = $('#trail');
    if (!cv) return;
    let ctx, W = 0, H = 0, pts = [], sparks = [], visible = false, lastMove = -1e9, t = 0;

    const build = () => { ({ ctx, W, H } = fit(cv)); };
    const push = (x, y) => { pts.push({ x, y, l: 1 }); if (pts.length > 90) pts.shift(); };

    cv.addEventListener('pointermove', (e) => { const [x, y] = rel(e, cv); push(x, y); lastMove = performance.now(); });
    cv.addEventListener('pointerdown', (e) => {
      const [x, y] = rel(e, cv);
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * 6.283, s = 1 + Math.random() * 5;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1 });
      }
    });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if (Math.hypot(a.x - b.x, a.y - b.y) > 160) continue;
        ctx.strokeStyle = 'hsl(' + ((hue + (1 - b.l) * 70) % 360) + ' 100% 60% / ' + (b.l * .9).toFixed(3) + ')';
        ctx.lineWidth = b.l * 16 + 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const s of sparks) {
        ctx.fillStyle = accentCss(s.l.toFixed(2));
        ctx.beginPath(); ctx.arc(s.x, s.y, 1 + s.l * 2.2, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };
    const step = () => {
      if (performance.now() - lastMove > 2500) {          // si no hi ha cursor, es dibuixa sol
        t += .014;
        push(W / 2 + Math.sin(t * 1.3) * W * .36, H / 2 + Math.sin(t * 1.9 + 1) * H * .32);
      }
      for (const p of pts) p.l -= .018;
      pts = pts.filter((p) => p.l > 0);
      for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += .08; s.vx *= .985; s.l -= .016; }
      sparks = sparks.filter((s) => s.l > 0);
    };

    build();
    watch(cv, (on) => { visible = on; });
    if (reduce) { for (let i = 0; i < 40; i++) { push(W * (.1 + i * .02), H * (.5 + Math.sin(i / 5) * .2)); } draw(); return; }
    const loop = () => { requestAnimationFrame(loop); if (visible) { step(); draw(); } };
    requestAnimationFrame(loop);
    onResize(build);
  };

  /* ==========================================================
     12. METABOLLES (shader WebGL)
     ========================================================== */
  const initBlobs = () => {
    const cv = $('#blobs');
    if (!cv) return;
    const fs = `
precision mediump float;
uniform vec2 u_res; uniform vec2 u_mouse; uniform float u_time; uniform vec3 u_col; uniform float u_press;
void main(){
  float asp = u_res.x / u_res.y;
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);
  vec2 m = (u_mouse - 0.5) * vec2(asp, 1.0);
  float f = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(u_time * (0.35 + fi * 0.07) + fi * 2.1) * 0.55 * asp * 0.8,
                  cos(u_time * (0.30 + fi * 0.05) + fi * 1.3) * 0.38);
    float r = 0.075 + 0.02 * sin(fi * 3.0 + u_time);
    vec2 d = p - c;
    f += r * r / (dot(d, d) + 0.0005);
  }
  vec2 dm = p - m;
  f += (0.014 + 0.03 * u_press) / (dot(dm, dm) + 0.0005);

  float edge = smoothstep(1.0, 1.05, f);
  float rim  = smoothstep(0.7, 1.0, f) - smoothstep(1.0, 1.6, f);
  vec3 inner = mix(u_col * 0.55, u_col * 1.05 + 0.18, clamp((f - 1.0) * 0.45, 0.0, 1.0));
  vec3 col = vec3(0.04, 0.04, 0.05) + u_col * 0.10 * smoothstep(0.15, 1.0, f);
  col = mix(col, inner, edge);
  col += u_col * rim * 0.55;
  gl_FragColor = vec4(col, 1.0);
}`;
    const g = makeGL(cv, fs, ['u_res', 'u_mouse', 'u_time', 'u_col', 'u_press']);
    if (!g) { cv.remove(); return; }
    const { gl, u } = g;

    let w = 0, h = 0, tx = .5, ty = .5, mx = tx, my = ty, press = 0, pressT = 0, visible = false;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = cv.width = Math.max(2, Math.round(cv.clientWidth * dpr * .8));
      h = cv.height = Math.max(2, Math.round(cv.clientHeight * dpr * .8));
      gl.viewport(0, 0, w, h);
    };
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
    });
    cv.addEventListener('pointerdown', () => { pressT = 1; });
    addEventListener('pointerup', () => { pressT = 0; });
    watch(cv, (on) => { visible = on; });

    const render = (t) => {
      gl.uniform2f(u.u_res, w, h);
      gl.uniform2f(u.u_mouse, mx, my);
      gl.uniform1f(u.u_time, t);
      gl.uniform3f(u.u_col, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(u.u_press, press);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    resize();
    addEventListener('resize', () => { resize(); if (reduce) render(8); });
    if (reduce) { render(8); return; }
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible) return;
      mx += (tx - mx) * .08; my += (ty - my) * .08;
      press += (pressT - press) * .1;
      render(now * .001);
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     13. LLANTERNA (revelat amb màscara)
     ========================================================== */
  const initFlash = () => {
    const st = $('.flash');
    if (!st) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, r = 150, rt = 150, hover = false, visible = false, t = 0;
    const size = () => { tx = cx = st.clientWidth * .5; ty = cy = st.clientHeight * .5; };
    size();
    st.addEventListener('pointermove', (e) => { [tx, ty] = rel(e, st); hover = true; });
    st.addEventListener('pointerleave', () => { hover = false; rt = 150; });
    st.addEventListener('pointerdown', () => { rt = 320; });
    addEventListener('pointerup', () => { rt = 150; });
    watch(st, (on) => { visible = on; });

    const apply = () => {
      st.style.setProperty('--mx', cx.toFixed(1) + 'px');
      st.style.setProperty('--my', cy.toFixed(1) + 'px');
      st.style.setProperty('--r', r.toFixed(1) + 'px');
    };
    apply();
    if (reduce) { st.style.setProperty('--r', '9999px'); return; }
    const loop = () => {
      requestAnimationFrame(loop);
      if (!visible) return;
      if (!hover) {
        t += .012;
        tx = st.clientWidth * (.5 + .36 * Math.sin(t));
        ty = st.clientHeight * (.5 + .3 * Math.sin(t * 1.35 + 1));
      }
      cx += (tx - cx) * .12; cy += (ty - cy) * .12; r += (rt - r) * .12;
      apply();
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     14. MARQUEE QUE REACCIONA AL SCROLL
     ========================================================== */
  const initVMarq = () => {
    const rows = $$('.vm-row');
    if (!rows.length) return;
    let visible = false, lastY = scrollY, vel = 0, dirState = 1;
    const sec = $('.vmarq');

    const build = () => {
      rows.forEach((row, i) => {
        const track = $('.vm-track', row);
        const unit = '<span>' + row.dataset.text + '</span><i>✦</i>';
        track.innerHTML = '<div class="vm-group">' + unit + '</div>';
        const g = track.firstChild;
        let n = 0;
        while (g.offsetWidth < innerWidth * 1.1 && n++ < 14) g.innerHTML += unit;
        track.appendChild(g.cloneNode(true));
        row._w = g.offsetWidth;
        row._x = row._x || 0;
        row._dir = i % 2 ? 1 : -1;
        track.style.transform = 'translateX(' + (row._x - row._w) + 'px)';
      });
    };
    build();
    onResize(build);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    if (reduce) return;
    watch(sec, (on) => { visible = on; });

    const loop = () => {
      requestAnimationFrame(loop);
      const dy = scrollY - lastY; lastY = scrollY;
      vel += (dy - vel) * .12;
      if (!visible) return;
      if (Math.abs(vel) > .4) dirState += ((vel < 0 ? -1 : 1) - dirState) * .1;
      const sp = .9 + Math.abs(vel) * .8;
      rows.forEach((row) => {
        row._x += row._dir * sp * dirState;
        row._x = ((row._x % row._w) + row._w) % row._w;   // sempre entre 0 i w
        const track = $('.vm-track', row);
        track.style.transform = 'translateX(' + (row._x - row._w) + 'px) skewX(' + clamp(-vel * .5, -10, 10).toFixed(2) + 'deg)';
      });
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     15. ABANS / DESPRÉS
     ========================================================== */
  const initBA = () => {
    const st = $('.ba');
    if (!st) return;
    const after = $('.ba-after', st), handle = $('.ba-handle', st);
    let p = .5, dragging = false, intro = false;

    const set = (v) => {
      p = clamp(v, .02, .98);
      after.style.clipPath = 'inset(0 0 0 ' + (p * 100).toFixed(2) + '%)';
      handle.style.left = (p * 100).toFixed(2) + '%';
      handle.setAttribute('aria-valuenow', Math.round(p * 100));
    };
    const fromEvent = (e) => { const [x] = rel(e, st); set(x / st.clientWidth); };

    st.addEventListener('pointerdown', (e) => {
      dragging = true; intro = false;
      st.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    st.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    const up = () => { dragging = false; };
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
    handle.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft') set(p - .05);
      else if (k === 'ArrowRight') set(p + .05);
      else if (k === 'Home') set(.02);
      else if (k === 'End') set(.98);
      else return;
      intro = false; e.preventDefault();
    });
    set(.5);

    if (reduce) return;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      intro = true;
      const t0 = performance.now(), D = 2600;
      const f = (now) => {
        if (!intro) return;
        const k = clamp((now - t0) / D);
        set(.5 + Math.sin(k * Math.PI * 2) * .34 * (1 - k * .4));
        if (k < 1) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }, { threshold: .5 });
    io.observe(st);
  };

  /* ==========================================================
     16. PRESSUPOSTADOR
     (canvia els preus d'aquí: són de mostra)
     ========================================================== */
  const initQuote = () => {
    const box = $('.quote');
    if (!box) return;
    const TYPES = {
      landing:   { name: 'Landing page',     base: 600,  inc: 1, per: 0,   weeks: 2 },
      corporate: { name: 'Web corporativa',  base: 1400, inc: 5, per: 140, weeks: 4 },
      shop:      { name: 'Botiga en línia',  base: 3000, inc: 8, per: 160, weeks: 7 }
    };
    const EXTRAS = {
      seo:  { name: 'SEO tècnic',            price: 400, weeks: .5 },
      anim: { name: 'Animacions a mesura',   price: 500, weeks: 1 },
      i18n: { name: 'Multiidioma',           price: 450, weeks: 1 },
      blog: { name: 'Blog i gestor de contingut', price: 600, weeks: 1 },
      stat: { name: 'Analítica i conversió', price: 250, weeks: .3 }
    };
    const PACE = {
      calm:   { name: 'Sense pressa',  mult: .92, wk: 1.3 },
      normal: { name: 'Termini normal', mult: 1,   wk: 1 },
      rush:   { name: 'Urgent',        mult: 1.25, wk: .7 }
    };
    const eur = (n) => Math.round(n).toLocaleString('ca');
    const tween = (el, to, fmt) => {
      const from = el._v || 0; el._v = to;
      if (reduce) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), id = (el._id = (el._id || 0) + 1);
      const f = (t) => {
        if (id !== el._id) return;
        const k = clamp((t - t0) / 500), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    };

    const pages = $('#q-pages'), pagesO = $('#q-pages-o');
    let summary = '';

    const calc = () => {
      const type = TYPES[$('input[name="q-type"]:checked', box).value];
      const pace = PACE[$('input[name="q-pace"]:checked', box).value];
      const extras = $$('input[name="q-extra"]:checked', box).map((i) => EXTRAS[i.value]);
      const isLanding = type === TYPES.landing;
      pages.disabled = isLanding;
      if (isLanding) pages.value = 1;
      const n = +pages.value;
      pagesO.textContent = n;

      const extraPages = Math.max(0, n - type.inc);
      const lines = [[type.name, type.base]];
      if (extraPages) lines.push([extraPages + ' pàgin' + (extraPages > 1 ? 'es' : 'a') + ' addicional' + (extraPages > 1 ? 's' : ''), extraPages * type.per]);
      extras.forEach((x) => lines.push([x.name, x.price]));
      const sub = lines.reduce((s, l) => s + l[1], 0);
      const total = sub * pace.mult;
      const min = Math.round(total * .9 / 10) * 10, max = Math.round(total * 1.15 / 10) * 10;
      const wk = Math.max(1, Math.ceil((type.weeks + extras.reduce((s, x) => s + x.weeks, 0) + extraPages * .15) * pace.wk));

      tween($('#q-min'), min, eur); tween($('#q-max'), max, eur);
      $('#q-weeks').textContent = wk;
      $('.q-break').innerHTML = lines.map((l) => '<li><span>' + l[0] + '</span><b>' + eur(l[1]) + ' €</b></li>').join('') +
        (pace.mult !== 1 ? '<li><span>' + pace.name + '</span><b>' + (pace.mult > 1 ? '+' : '−') + Math.round(Math.abs(pace.mult - 1) * 100) + '%</b></li>' : '');

      summary = 'Pressupost orientatiu\n' +
        '- Tipus: ' + type.name + ' (' + n + ' pàgin' + (n > 1 ? 'es' : 'a') + ')\n' +
        (extras.length ? '- Extres: ' + extras.map((x) => x.name).join(', ') + '\n' : '') +
        '- Termini: ' + pace.name + ' (~' + wk + ' setmanes)\n' +
        '- Estimació: ' + eur(min) + '–' + eur(max) + ' €';
    };
    box.addEventListener('input', calc);
    box.addEventListener('change', calc);
    calc();

    $('#q-copy').addEventListener('click', (e) => {
      const b = e.currentTarget;
      copy(summary, (ok) => flashText(b, ok ? 'Copiat ✓' : 'No s\'ha pogut'));
    });
    $('#q-mail').addEventListener('click', () => {
      location.href = 'mailto:hola@elteudomini.cat?subject=' + encodeURIComponent('Pressupost web') +
        '&body=' + encodeURIComponent(summary + '\n\nEl meu nom:\nEl meu projecte:\n');
    });
  };

  /* ==========================================================
     17. RENDIMENT EN DIRECTE
     ========================================================== */
  const initPerf = () => {
    const box = $('.perf');
    if (!box) return;
    const cv = $('#fps-cv');
    const els = {};
    ['fps', 'load', 'fcp', 'lcp', 'size', 'req', 'dom', 'mem', 'net'].forEach((k) => { els[k] = $('#pf-' + k); });
    const rate = (el, v, good, ok) => {
      const li = el.closest('li');
      if (li) li.dataset.s = v == null ? '' : v <= good ? 'good' : v <= ok ? 'ok' : 'bad';
    };
    const fmtMs = (ms) => ms >= 1000 ? (ms / 1000).toLocaleString('ca', { maximumFractionDigits: 2 }) + ' s' : Math.round(ms) + ' ms';

    let lcp = null;
    try {
      new PerformanceObserver((list) => {
        const e = list.getEntries(); lcp = e[e.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    const read = () => {
      const byType = (t) => (performance.getEntriesByType ? performance.getEntriesByType(t) : []);
      const nav = byType('navigation')[0];
      const fcp = ((performance.getEntriesByName ? performance.getEntriesByName('first-contentful-paint') : [])[0] || {}).startTime;
      const loadMs = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : null;
      const res = byType('resource');
      const own = res.filter((r) => r.name.indexOf(location.origin) === 0);
      const bytes = own.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) + (nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0);

      els.load.textContent = loadMs ? fmtMs(loadMs) : '…'; rate(els.load, loadMs, 3000, 6000);
      els.fcp.textContent = fcp ? fmtMs(fcp) : 'n/d'; rate(els.fcp, fcp || null, 1800, 3000);
      els.lcp.textContent = lcp ? fmtMs(lcp) : 'n/d'; rate(els.lcp, lcp, 2500, 4000);
      els.size.textContent = bytes ? (bytes / 1024).toLocaleString('ca', { maximumFractionDigits: 0 }) + ' KB' : 'n/d';
      els.req.textContent = res.length;
      els.dom.textContent = document.getElementsByTagName('*').length.toLocaleString('ca');
      const mem = performance.memory;
      els.mem.textContent = mem ? (mem.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'n/d';
      const c = navigator.connection;
      els.net.textContent = c && c.effectiveType ? c.effectiveType.toUpperCase() : 'n/d';
    };
    read();
    addEventListener('load', () => setTimeout(read, 200));

    /* FPS en directe + línia */
    let ctx, W = 0, H = 0;
    const build = () => { ({ ctx, W, H } = fit(cv)); };
    build(); onResize(build);
    const hist = new Array(60).fill(0);
    let frames = 0, last = performance.now(), visible = false, lastRead = 0;
    watch(box, (on) => { visible = on; if (on) { last = performance.now(); frames = 0; } });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
      [30, 60].forEach((v) => { const y = H - (v / 75) * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
      ctx.strokeStyle = accentCss(1); ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      hist.forEach((v, i) => {
        const x = i / (hist.length - 1) * W, y = H - clamp(v / 75) * H;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    };
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible) return;
      frames++;
      if (now - last >= 500) {
        const fps = Math.round(frames * 1000 / (now - last));
        frames = 0; last = now;
        hist.push(fps); hist.shift();
        els.fps.textContent = fps;
        draw();
      }
      if (now - lastRead > 1500) { lastRead = now; read(); }
    };
    if (reduce) { els.fps.textContent = '—'; return; }
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     18. LABORATORI DE COLOR
     ========================================================== */
  const initColor = () => {
    const box = $('.clab');
    if (!box) return;
    const hex = (r, g, b) => '#' + [r, g, b].map((x) => Math.round(clamp(x) * 255).toString(16).padStart(2, '0')).join('');
    const hsl = (h, s, l) => hex(...hslToRgb((((h % 360) + 360) % 360) / 360, s / 100, l / 100));
    const lum = (h) => {
      const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255)
        .map((v) => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

    const H = $('#cl-h'), S = $('#cl-s'), L = $('#cl-l');
    const pal = $('#cl-pal');
    let colors = [];

    const render = () => {
      const h = +H.value, s = +S.value, l = +L.value;
      $('#cl-h-o').textContent = h; $('#cl-s-o').textContent = s; $('#cl-l-o').textContent = l;
      colors = [
        ['Base', hsl(h, s, l)],
        ['Complementari', hsl(h + 180, s, l)],
        ['Triada A', hsl(h + 120, s, l)],
        ['Triada B', hsl(h + 240, s, l)],
        ['Anàleg A', hsl(h + 30, s, l)],
        ['Anàleg B', hsl(h - 30, s, l)],
        ['Fosc', hsl(h, Math.min(s, 30), 8)],
        ['Clar', hsl(h, Math.min(s, 60), 94)]
      ];
      pal.innerHTML = colors.map((c, i) =>
        '<button type="button" class="cl-sw" data-i="' + i + '" style="background:' + c[1] + ';color:' + (lum(c[1]) > .4 ? '#000' : '#fff') + '">' +
        '<span>' + c[0] + '</span><b>' + c[1].toUpperCase() + '</b></button>').join('');
    };
    pal.addEventListener('click', (e) => {
      const b = e.target.closest('.cl-sw');
      if (!b) return;
      const c = colors[+b.dataset.i];
      copy(c[1].toUpperCase(), (ok) => flashText($('b', b), ok ? 'Copiat ✓' : 'Error'));
    });
    [H, S, L].forEach((i) => i.addEventListener('input', render));
    render();

    $('#cl-apply').addEventListener('click', (e) => {
      const h = +H.value;
      root.style.setProperty('--hue', h);
      try { localStorage.setItem('hue', h); } catch (er) {}
      $$('.hues button').forEach((b) => b.classList.toggle('on', +b.dataset.hue === h));
      flashText(e.currentTarget, 'Aplicat ✓');
    });
    $('#cl-css').addEventListener('click', (e) => {
      const css = ':root {\n' + colors.map((c) => '  --' + c[0].toLowerCase().replace(/[^a-z]+/g, '-') + ': ' + c[1] + ';').join('\n') + '\n}';
      copy(css, (ok) => flashText(e.currentTarget, ok ? 'CSS copiat ✓' : 'Error'));
    });

    /* Contrast WCAG */
    const fg = $('#cl-fg'), bg = $('#cl-bg'), prev = $('#cl-prev');
    const check = () => {
      prev.style.color = fg.value; prev.style.background = bg.value;
      const r = ratio(fg.value, bg.value);
      $('#cl-r').textContent = (Math.floor(r * 100) / 100).toLocaleString('ca', { minimumFractionDigits: 2 });
      const set = (id, ok) => { const li = $(id); li.dataset.ok = ok ? '1' : '0'; };
      set('#b-aa', r >= 4.5); set('#b-aal', r >= 3); set('#b-aaa', r >= 7);
    };
    [fg, bg].forEach((i) => i.addEventListener('input', check));
    $('#cl-swap').addEventListener('click', () => { const t = fg.value; fg.value = bg.value; bg.value = t; check(); });
    check();
  };

  /* ==========================================================
     19. FORMULARI INTEL·LIGENT
     ========================================================== */
  const initForm = () => {
    const form = $('.sform');
    if (!form) return;
    const rules = {
      name:  (v) => v.trim().length >= 2 ? '' : 'Escriu el teu nom (mínim 2 lletres).',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Aquest correu no sembla vàlid.',
      type:  (v) => v ? '' : 'Tria un tipus de projecte.',
      msg:   (v) => v.trim().length >= 20 ? '' : 'Explica\'ns una mica més (mínim 20 caràcters).'
    };
    const fields = $$('.sf-field', form);
    const consent = $('#sf-consent');
    const consentErr = $('.sf-check-err', form);
    const count = $('#sf-count');

    const check = (f, touch) => {
      const input = $('input, textarea, select', f);
      const msg = rules[input.dataset.rule](input.value);
      if (touch) f.classList.add('touched');
      f.classList.toggle('bad', !!msg);
      f.classList.toggle('good', !msg);
      $('.sf-err', f).textContent = msg;
      return !msg;
    };
    fields.forEach((f) => {
      const input = $('input, textarea, select', f);
      input.addEventListener('blur', () => check(f, true));
      input.addEventListener('input', () => { if (f.classList.contains('touched')) check(f, false); });
      input.addEventListener('change', () => check(f, true));
    });
    $('#sf-msg').addEventListener('input', (e) => { count.textContent = e.target.value.length + '/400'; });
    consent.addEventListener('change', () => { consentErr.hidden = consent.checked; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const okF = fields.map((f) => check(f, true));
      const okC = consent.checked;
      consentErr.hidden = okC;
      if (!okF.every(Boolean) || !okC) {
        const bad = fields.find((f) => f.classList.contains('bad'));
        if (bad) $('input, textarea, select', bad).focus();
        return;
      }
      form.classList.add('sent');
      $('.sf-done', form).hidden = false;
      const r = $('.sf-send', form).getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top);
    });

    const values = () => ({
      name: $('#sf-name').value.trim(), email: $('#sf-email').value.trim(),
      type: $('#sf-type').value, msg: $('#sf-msg').value.trim()
    });
    $('#sf-mail').addEventListener('click', () => {
      const v = values();
      location.href = 'mailto:hola@elteudomini.cat?subject=' + encodeURIComponent('Nou projecte: ' + v.type) +
        '&body=' + encodeURIComponent(v.msg + '\n\n— ' + v.name + ' (' + v.email + ')');
    });
    $('#sf-reset').addEventListener('click', () => {
      form.reset();
      form.classList.remove('sent');
      $('.sf-done', form).hidden = true;
      fields.forEach((f) => f.classList.remove('touched', 'good', 'bad'));
      count.textContent = '0/400';
    });
  };

  /* ==========================================================
     20. MODE CLAR / FOSC AMB REVELAT CIRCULAR
     ========================================================== */
  const initTheme = () => {
    const box = $('.theme');
    const view = $('.th-view', box || document);
    if (!box || !view) return;
    const glyph = (t) => t === 'dark' ? '☾' : '☀';
    let busy = false;
    $('.th-toggle', view).textContent = glyph(view.dataset.theme);

    box.addEventListener('click', (e) => {
      const btn = e.target.closest('.th-toggle');
      if (!btn || btn.closest('[inert]') || busy) return;
      const next = view.dataset.theme === 'dark' ? 'light' : 'dark';
      const apply = () => { view.dataset.theme = next; $('.th-toggle', view).textContent = glyph(next); };
      if (reduce || !view.animate) { apply(); return; }

      busy = true;
      const b = btn.getBoundingClientRect(), r = box.getBoundingClientRect();
      const x = b.left - r.left + b.width / 2, y = b.top - r.top + b.height / 2;
      const R = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));

      const clone = view.cloneNode(true);
      clone.dataset.theme = next;
      clone.setAttribute('inert', ''); clone.setAttribute('aria-hidden', 'true');
      $('.th-toggle', clone).textContent = glyph(next);
      clone.classList.add('th-clone');
      box.appendChild(clone);
      const a = clone.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
      a.onfinish = () => { apply(); clone.remove(); busy = false; };
      a.oncancel = () => { apply(); clone.remove(); busy = false; };
    });
  };

  /* ---------- ARRENCADA ---------- */
  [initWave, initTrail, initBlobs, initFlash, initVMarq, initBA, initQuote, initPerf, initColor, initForm, initTheme]
    .forEach((fn) => { try { fn(); } catch (e) { console.warn('Lab2 · ' + fn.name + ':', e); } });
})();
