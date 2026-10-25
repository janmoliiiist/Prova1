/* ==========================================================
   LABORATORI COMPLET (Experiments 1 a 21)
   JavaScript pur i WebGL, sense llibreries externes.
   Cada experiment s'executa de forma independent.
   ========================================================== */
(() => {
  'use strict';

  /* ---------- UTILITATS I SELECTORS DOM ---------- */
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

  /* ---------- UTILITATS AUXILIARS ---------- */
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
    cv.width = Math.round(W * dpr); 
    cv.height = Math.round(H * dpr);
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

  /* Creador de shader WebGL mínim */
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
     1. SHADER WEBGL DEL HERO
     ========================================================== */
  const initShader = () => {
    const cv = $('#fluid');
    if (!cv) return;
    const hero = cv.parentElement;

    const fs = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res; uniform vec2 u_mouse; uniform float u_time; uniform vec3 u_col; uniform float u_press;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main(){
  float asp = u_res.x / u_res.y;
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);
  vec2 m = (u_mouse - 0.5) * vec2(asp, 1.0);
  float t = u_time * 0.10;

  vec2 d = p - m; float md = length(d);
  p += normalize(d + 0.0001) * 0.09 * exp(-md * 3.5) * (1.0 + u_press * 2.5);

  vec2 q = vec2(fbm(p * 2.2 + vec2(0.0, t)), fbm(p * 2.2 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 2.2 + 3.0 * q + vec2(1.7, 9.2) + t * 1.2),
                fbm(p * 2.2 + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 2.2 + 3.0 * r);

  float lines = smoothstep(0.455, 0.5, abs(fract(f * 9.0) - 0.5));
  vec3 base = mix(vec3(0.035, 0.035, 0.042), u_col * 0.22, smoothstep(0.25, 0.95, f));
  vec3 col = base + u_col * lines * (0.10 + 0.35 * f);

  float g = exp(-md * md * 9.0);
  col += u_col * g * (0.22 + 0.35 * u_press);

  vec2 vc = uv - 0.5;
  col *= 1.0 - 1.1 * dot(vc, vc);
  gl_FragColor = vec4(col, 1.0);
}`;

    const g = makeGL(cv, fs, ['u_res', 'u_mouse', 'u_time', 'u_col', 'u_press']);
    if (!g) { cv.remove(); return; }
    const { gl, u } = g;

    const SCALE = .7;
    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = cv.width  = Math.max(2, Math.round(cv.clientWidth  * dpr * SCALE));
      h = cv.height = Math.max(2, Math.round(cv.clientHeight * dpr * SCALE));
      gl.viewport(0, 0, w, h);
    };

    let tx = .65, ty = .5, mx = tx, my = ty, press = 0, pressT = 0, visible = true;

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = 1 - (e.clientY - r.top) / r.height;
    });
    hero.addEventListener('pointerdown', () => { pressT = 1; });
    addEventListener('pointerup', () => { pressT = 0; });
    watch(hero, (on) => { visible = on; });

    const render = (t) => {
      gl.uniform2f(u.u_res, w, h);
      gl.uniform2f(u.u_mouse, mx, my);
      gl.uniform1f(u.u_time, t);
      gl.uniform3f(u.u_col, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(u.u_press, press);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    resize();
    addEventListener('resize', () => { resize(); if (reduce) render(20); });
    if (reduce) { render(20); return; }

    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible) return;
      mx += (tx - mx) * .07;
      my += (ty - my) * .07;
      press += (pressT - press) * .1;
      render(now * .001);
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     2. TEXT FET DE PARTÍCULES
     ========================================================== */
  const initParticles = () => {
    const cv = $('#ptext');
    if (!cv) return;
    const ctx = cv.getContext('2d');

    let W = 0, H = 0, parts = [], visible = false;
    let mx = -9999, my = -9999;

    const build = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      W = Math.max(2, Math.round(r.width));
      H = Math.max(2, Math.round(r.height));
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const o = off.getContext('2d');
      const text = 'JAN MOLIST';
      const family = '"Space Grotesk", Arial, sans-serif';
      let fs = H * .62;
      o.font = '700 ' + fs + 'px ' + family;
      while (o.measureText(text).width > W * .9 && fs > 20) {
        fs -= 4;
        o.font = '700 ' + fs + 'px ' + family;
      }
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillText(text, W / 2, H / 2);

      const gap = W < 600 ? 4 : 5;
      const data = o.getImageData(0, 0, W, H).data;
      const old = parts;
      parts = [];
      for (let y = 0; y < H; y += gap) {
        for (let x = 0; x < W; x += gap) {
          if (data[(y * W + x) * 4 + 3] > 128) {
            const i = parts.length;
            parts.push({
              hx: x, hy: y,
              x: old[i] ? old[i].x : Math.random() * W,
              y: old[i] ? old[i].y : Math.random() * H,
              vx: 0, vy: 0
            });
          }
        }
      }
    };

    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    cv.addEventListener('pointermove', pos);
    cv.addEventListener('pointerleave', () => { mx = my = -9999; });
    cv.addEventListener('pointerdown', (e) => {
      pos(e);
      const R = 240;
      for (const p of parts) {
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < R && d > 0) {
          const f = (1 - d / R) * 26;
          p.vx += (dx / d) * f + (Math.random() - .5) * 4;
          p.vy += (dy / d) * f + (Math.random() - .5) * 4;
        }
      }
    });

    const R = 110;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const near = [], calm = [];
      for (const p of parts) {
        if (!reduce) {
          p.vx += (p.hx - p.x) * .055;
          p.vy += (p.hy - p.y) * .055;
          const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
          if (d < R && d > 0) {
            const f = (1 - d / R) * 5;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
          p.vx *= .86; p.vy *= .86;
          p.x += p.vx; p.y += p.vy;
        } else {
          p.x = p.hx; p.y = p.hy;
        }
        (Math.abs(p.vx) + Math.abs(p.vy) > 1.6 ? near : calm).push(p);
      }
      ctx.fillStyle = accentCss(.95);
      for (const p of calm) ctx.fillRect(p.x, p.y, 2.2, 2.2);
      ctx.fillStyle = '#fff';
      for (const p of near) ctx.fillRect(p.x - .5, p.y - .5, 2.8, 2.8);
    };

    const loop = () => {
      requestAnimationFrame(loop);
      if (visible) draw();
    };

    build();
    watch(cv, (on) => { visible = on; });
    if (reduce) { for (const p of parts) { p.x = p.hx; p.y = p.hy; } draw(); }
    requestAnimationFrame(loop);

    onResize(build);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  };

  /* ==========================================================
     3. CUB 3D AMB INÈRCIA I LLUM
     ========================================================== */
  const initCube = () => {
    const stage = $('.cube-stage');
    const cube  = $('.cube');
    if (!stage || !cube) return;
    const faces = $$('.face', cube);

    const normals = [[0,0,1], [1,0,0], [0,0,-1], [-1,0,0], [0,-1,0], [0,1,0]];
    const L = (() => {
      const v = [-.45, -.75, .55];
      const m = Math.hypot(v[0], v[1], v[2]);
      return v.map((x) => x / m);
    })();

    let rx = -20, ry = 32, vx = 0, vy = .35, drag = false, lx = 0, ly = 0, visible = false;

    stage.addEventListener('pointerdown', (e) => {
      drag = true; lx = e.clientX; ly = e.clientY;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('grab');
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      ry += dx * .55; rx -= dy * .55;
      vy = dx * .55;  vx = -dy * .55;
    });
    const up = () => { drag = false; stage.classList.remove('grab'); };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);

    const shade = () => {
      const a = rx * Math.PI / 180, b = ry * Math.PI / 180;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      for (let i = 0; i < 6; i++) {
        const n = normals[i];
        const x1 = n[0] * cb + n[2] * sb, y1 = n[1], z1 = -n[0] * sb + n[2] * cb;
        const y2 = y1 * ca - z1 * sa, z2 = y1 * sa + z1 * ca;
        const lit = Math.max(0, x1 * L[0] + y2 * L[1] + z2 * L[2]);
        faces[i].style.setProperty('--sh', (.62 - .56 * lit).toFixed(3));
      }
    };

    const apply = () => {
      cube.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      shade();
    };

    watch(stage, (on) => { visible = on; });
    apply();
    if (reduce) return;

    const loop = () => {
      requestAnimationFrame(loop);
      if (!visible) return;
      if (!drag) {
        ry += vy; rx += vx;
        vx *= .94;
        vy += (.35 - vy) * .03;
      }
      apply();
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     4. TÚNEL DE PROFUNDITAT (scroll)
     ========================================================== */
  const initTunnel = () => {
    const sec = $('.tunnel');
    if (!sec || reduce) return;
    const layers = $$('.t-layer', sec);
    const scene  = $('.tunnel-scene', sec);
    const floor  = $('.t-floor', sec);
    const bar    = $('.tunnel-bar i', sec);
    const n = layers.length;

    let mx = 0, my = 0, sx = 0, sy = 0, visible = false;
    addEventListener('pointermove', (e) => {
      mx = e.clientX / innerWidth - .5;
      my = e.clientY / innerHeight - .5;
    }, { passive: true });
    watch(sec, (on) => { visible = on; });

    const update = () => {
      const r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;

      for (let i = 0; i < n; i++) {
        const d = i - p * (n - 1);
        const z = -d * 700;
        const o = d >= 0 ? clamp(1 - d * .55) : clamp(1 + d * 2.2);
        const l = layers[i];
        l.style.transform = 'translate3d(0,0,' + z.toFixed(1) + 'px)';
        l.style.opacity = o.toFixed(3);
        l.style.visibility = o <= .01 ? 'hidden' : 'visible';
      }
      floor.style.setProperty('--gy', (p * 2000).toFixed(1) + 'px');
      bar.style.transform = 'scaleX(' + p + ')';
    };

    const loop = () => {
      requestAnimationFrame(loop);
      if (!visible) return;
      sx += (mx - sx) * .06;
      sy += (my - sy) * .06;
      scene.style.transform = 'rotateY(' + (sx * 12) + 'deg) rotateX(' + (-sy * 8) + 'deg)';
      update();
    };
    update();
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     5. GALERIA EN ANELL 3D
     ========================================================== */
  const initRing = () => {
    const stage = $('.ring-stage');
    const ring  = $('.ring');
    if (!stage || !ring) return;
    const cards = $$('.ring-card', ring);
    const n = cards.length;

    let r = 0, rot = 0, vel = 0, drag = false, lx = 0, hover = false, visible = false;
    const BASE = .16;

    const layout = () => {
      const w = cards[0].offsetWidth || 280;
      r = Math.round((w / 2) / Math.tan(Math.PI / n)) + 34;
      cards.forEach((c, i) => {
        c.style.transform = 'rotateY(' + (i * 360 / n) + 'deg) translateZ(' + r + 'px)';
      });
    };
    layout();
    addEventListener('resize', layout);

    stage.addEventListener('pointerdown', (e) => {
      drag = true; lx = e.clientX;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('grab');
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - lx;
      lx = e.clientX;
      rot += dx * .35; vel = dx * .35;
    });
    const up = () => { drag = false; stage.classList.remove('grab'); };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('pointerenter', () => { hover = true; });
    stage.addEventListener('pointerleave', () => { hover = false; });

    $$('[data-ring]').forEach((b) => {
      b.addEventListener('click', () => { vel += (+b.dataset.ring) * 7; });
    });

    const apply = () => {
      ring.style.transform = 'translateZ(' + (-r) + 'px) rotateY(' + rot + 'deg)';
      for (let i = 0; i < n; i++) {
        const ang = ((((i * 360 / n + rot) % 360) + 540) % 360) - 180;
        const dk = clamp((Math.abs(ang) - 15) / 165);
        cards[i].style.setProperty('--d', (dk * .86).toFixed(3));
      }
    };

    watch(stage, (on) => { visible = on; });
    apply();
    if (reduce) return;

    const loop = () => {
      requestAnimationFrame(loop);
      if (!visible) return;
      if (!drag) {
        rot += vel;
        vel += ((hover ? 0 : BASE) - vel) * .04;
      }
      apply();
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     6. TARGETES AMB PROFUNDITAT I LLUM
     ========================================================== */
  const initDepth = () => {
    $$('.depth-card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        if (reduce) return;
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((px - .5) * 22).toFixed(2));
        c.style.setProperty('--rx', ((.5 - py) * 22).toFixed(2));
        c.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', () => {
        c.style.setProperty('--rx', 0);
        c.style.setProperty('--ry', 0);
      });
    });
  };

  /* ==========================================================
     7. CONSTEL·LACIÓ (xarxa de nodes)
     ========================================================== */
  const initNet = () => {
    const cv = $('#net');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, nodes = [], visible = false, mx = -9999, my = -9999;
    const LINK = 130, CUR = 190;

    const build = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = Math.max(2, cv.clientWidth); H = Math.max(2, cv.clientHeight);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp(W * H / 9500, 30, 110));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5
      }));
    };

    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    cv.addEventListener('pointerleave', () => { mx = my = -9999; });
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (let i = 0; i < 6; i++) {
        nodes.push({ x, y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3 });
      }
      if (nodes.length > 160) nodes.splice(0, nodes.length - 160);
    });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of nodes) {
        if (!reduce) {
          const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy);
          if (d < CUR && d > 1) { p.vx += dx / d * .02; p.vy += dy / d * .02; }
          p.vx *= .995; p.vy *= .995;
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > 1.6) { p.vx *= 1.6 / sp; p.vy *= 1.6 / sp; }
          if (sp < .12) { p.vx += (Math.random() - .5) * .05; p.vy += (Math.random() - .5) * .05; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
          if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = accentCss(((1 - d / LINK) * .45).toFixed(3));
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const dc = Math.hypot(a.x - mx, a.y - my);
        if (dc < CUR) {
          ctx.strokeStyle = accentCss(((1 - dc / CUR) * .9).toFixed(3));
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke();
        }
      }
      ctx.fillStyle = accentCss(.95);
      for (const p of nodes) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 6.283); ctx.fill(); }
    };

    build();
    watch(cv, (on) => { visible = on; });
    if (reduce) { draw(); addEventListener('resize', () => { build(); draw(); }); return; }
    const loop = () => { requestAnimationFrame(loop); if (visible) draw(); };
    requestAnimationFrame(loop);
    onResize(build);
  };

  /* ==========================================================
     8. BANDADA (boids)
     ========================================================== */
  const initFlock = () => {
    const cv = $('#flock');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, boids = [], visible = false, mx = -9999, my = -9999, scare = 0;
    const MAXV = 2.8, MINV = 1.2;

    const build = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = Math.max(2, cv.clientWidth); H = Math.max(2, cv.clientHeight);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp(W * H / 5200, 40, 120));
      boids = Array.from({ length: n }, () => {
        const a = Math.random() * 6.283;
        return { x: Math.random() * W, y: Math.random() * H, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 };
      });
    };

    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    cv.addEventListener('pointerleave', () => { mx = my = -9999; });
    cv.addEventListener('pointerdown', () => { scare = 1; });
    addEventListener('pointerup', () => { scare = 0; });

    const step = () => {
      for (const b of boids) {
        let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, n = 0;
        for (const o of boids) {
          if (o === b) continue;
          const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 3600) {
            ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
            if (d2 < 484) { sx -= dx; sy -= dy; }
          }
        }
        if (n) {
          b.vx += (ax / n - b.vx) * .05 + (cx / n - b.x) * .0016 + sx * .012;
          b.vy += (ay / n - b.vy) * .05 + (cy / n - b.y) * .0016 + sy * .012;
        }
        const dx = mx - b.x, dy = my - b.y, d = Math.hypot(dx, dy);
        if (d < 260 && d > 1) {
          const f = scare ? -.22 : .035;
          b.vx += dx / d * f; b.vy += dy / d * f;
        }
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const s = clamp(sp, MINV, MAXV) / sp;
        b.vx *= s; b.vy *= s;
        b.x += b.vx; b.y += b.vy;
        if (b.x < -10) b.x = W + 10; else if (b.x > W + 10) b.x = -10;
        if (b.y < -10) b.y = H + 10; else if (b.y > H + 10) b.y = -10;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = accentCss(.95);
      for (const b of boids) {
        const a = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, 4); ctx.lineTo(-3, 0); ctx.lineTo(-5, -4); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    build();
    watch(cv, (on) => { visible = on; });
    if (reduce) { draw(); return; }
    const loop = () => { requestAnimationFrame(loop); if (visible) { step(); draw(); } };
    requestAnimationFrame(loop);
    onResize(build);
  };

  /* ==========================================================
     9. TIPOGRAFIA VIVA
     ========================================================== */
  const initKinetic = () => {
    const el = $('.kinetic');
    if (!el) return;
    const text = el.dataset.text || el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const letters = [];
    text.split(' ').forEach((word) => {
      const w = document.createElement('span');
      w.className = 'kw'; w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'kc'; s.textContent = ch;
        w.appendChild(s); letters.push(s);
      }
      el.appendChild(w);
      el.appendChild(document.createTextNode(' '));
    });
    if (reduce) return;

    const R = 220;
    el.addEventListener('pointermove', (e) => {
      for (const s of letters) {
        const r = s.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        s.style.setProperty('--k', clamp(1 - d / R).toFixed(3));
      }
    });
    el.addEventListener('pointerleave', () => {
      for (const s of letters) s.style.setProperty('--k', 0);
    });
  };

  /* ==========================================================
     10. TEXT DESXIFRAT
     ========================================================== */
  const initScramble = () => {
    const els = $$('[data-scramble]');
    if (!els.length) return;
    const POOL = '!<>-_\\/[]{}—=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const run = (el) => {
      const final = el.dataset.scramble;
      if (reduce) { el.textContent = final; return; }
      const token = (el._tk = (el._tk || 0) + 1);
      const slots = Array.from(final, (ch, i) => ({
        ch, start: Math.floor(Math.random() * 14), end: 14 + Math.floor(Math.random() * 22) + i * 1.2
      }));
      let f = 0;
      const tick = () => {
        if (token !== el._tk) return;
        let out = '', done = 0;
        for (const s of slots) {
          if (s.ch === ' ') { out += ' '; done++; }
          else if (f >= s.end) { out += s.ch; done++; }
          else if (f >= s.start) { out += POOL[Math.floor(Math.random() * POOL.length)]; }
          else out += '\u00a0';
        }
        el.textContent = out;
        f++;
        if (done < slots.length) requestAnimationFrame(tick);
      };
      tick();
    };

    els.forEach((el) => {
      el.setAttribute('aria-label', el.dataset.scramble);
      el.textContent = el.dataset.scramble;
      const row = el.closest('li') || el;
      row.addEventListener('pointerenter', () => run(el));
    });

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: .6 });
    els.forEach((el) => io.observe(el));
  };

  /* ==========================================================
     11. GRAELLA D'ONES
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
     12. RASTRE DE LLUM
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
      if (performance.now() - lastMove > 2500) {
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
     13. METABOLLES (shader WebGL)
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
     14. LLANTERNA (revelat amb màscara)
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
     15. MARQUEE QUE REACCIONA AL SCROLL
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
        row._x = ((row._x % row._w) + row._w) % row._w;
        const track = $('.vm-track', row);
        track.style.transform = 'translateX(' + (row._x - row._w) + 'px) skewX(' + clamp(-vel * .5, -10, 10).toFixed(2) + 'deg)';
      });
    };
    requestAnimationFrame(loop);
  };

  /* ==========================================================
     16. ABANS / DESPRÉS
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
     17. PRESSUPOSTADOR
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
     18. RENDIMENT EN DIRECTE
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

    /* FPS en directe + gràfica */
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
     19. LABORATORI DE COLOR
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
     20. FORMULARI INTEL·LIGENT
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
     21. MODE CLAR / FOSC AMB REVELAT CIRCULAR
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

  /* ---------- ARRENCADA PROTEGIDA ---------- */
  [
    initShader, initParticles, initCube, initTunnel, initRing,
    initDepth, initNet, initFlock, initKinetic, initScramble,
    initWave, initTrail, initBlobs, initFlash, initVMarq,
    initBA, initQuote, initPerf, initColor, initForm, initTheme
  ].forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('Laboratori · ' + fn.name + ':', e);
    }
  });
})();
