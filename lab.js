/* ==========================================================
   LABORATORI · lab.js
   Va després de script.js. Tot en JavaScript pur i WebGL,
   sense cap llibreria.
   ========================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root   = document.documentElement;

  /* ---------- COLOR D'ACCENT COMPARTIT AMB LA RESTA DEL WEB ---------- */
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

  /* Utilitat: saber si un element és visible per no gastar bateria */
  const watch = (el, cb) => {
    new IntersectionObserver((es) => cb(es[0].isIntersecting), { threshold: 0 }).observe(el);
  };

  /* ==========================================================
     1. SHADER WEBGL DEL HERO
     ========================================================== */
  const initShader = () => {
    const cv = $('#fluid');
    if (!cv) return;
    const hero = cv.parentElement;

    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { cv.remove(); return; }

    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
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

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { cv.remove(); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    const uRes = U('u_res'), uMouse = U('u_mouse'), uTime = U('u_time'), uCol = U('u_col'), uPress = U('u_press');

    const SCALE = .7;     // resolució interna (més baix = més ràpid)
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
      gl.uniform2f(uRes, w, h);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uTime, t);
      gl.uniform3f(uCol, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(uPress, press);
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

    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(build, 150); });
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

    // Normal de cada cara (en coordenades CSS: y positiu cap avall)
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
        vy += (.35 - vy) * .03;   // torna suaument a girar sol
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
        const d = i - p * (n - 1);                  // 0 = a primer pla
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
        const ang = ((((i * 360 / n + rot) % 360) + 540) % 360) - 180;   // -180..180, 0 = davant
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

  /* ---------- ARRENCADA ---------- */
  initShader();
  initParticles();
  initCube();
  initTunnel();
  initRing();
  initDepth();
})();
