/* ==========================================================
   JOC DEL 404 · joc404.js
   "Atrapa els punts, esquiva els errors."
   Mou la pala amb el ratolí, el dit o les fletxes ← → (o A / D).
   Els punts donen punts; els blocs "404" treuen una vida.
   La millor puntuació es guarda al navegador.
   ========================================================== */
(() => {
  'use strict';

  const cv = document.getElementById('game');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const ov = document.getElementById('g-ov');
  const msg = document.getElementById('g-msg');
  const startBtn = document.getElementById('g-start');
  const live = document.getElementById('g-live');

  const snd = (n) => { try { window.JMX && window.JMX.sound.play(n); } catch (e) {} };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let W = 0, H = 0, U = 1, K = 1;
  let mode = 'ready', score = 0, lives = 3, best = +(store.get('jm-404-best') || 0);
  let items = [], parts = [], spawn = 0, flash = 0, last = 0, visible = true;
  const paddle = { x: 0, y: 0, w: 100, h: 12, target: 0 };
  const keys = { left: false, right: false };

  const hue = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hue')) || 75;
  const acc = (a = 1, l = 60) => 'hsl(' + hue() + ' 100% ' + l + '% / ' + a + ')';

  const publish = () => {
    cv.dataset.mode = mode;
    cv.dataset.score = score;
    cv.dataset.lives = lives;
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(2, cv.clientWidth);
    H = Math.max(2, cv.clientHeight);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    U = clamp(W / 800, .7, 1.3);          // mida dels elements
    K = H / 560;                          // velocitat segons l'alçada
    paddle.w = clamp(W * .16, 76, 150);
    paddle.y = H - 38 * U;
    paddle.x = clamp(paddle.x || W / 2, paddle.w / 2, W - paddle.w / 2);
    paddle.target = paddle.x;
  };

  const start = () => {
    score = 0; lives = 3; items = []; parts = []; spawn = 0; flash = 0;
    mode = 'play';
    ov.hidden = true;
    paddle.x = paddle.target = W / 2;
    last = performance.now();
    publish();
    if (live) live.textContent = 'Partida començada';
    try { cv.focus({ preventScroll: true }); } catch (e) {}
  };

  const over = () => {
    mode = 'over';
    const record = score > best;
    if (record) { best = score; store.set('jm-404-best', String(best)); }
    msg.textContent = 'Fi de la partida · ' + score + (score === 1 ? ' punt' : ' punts') +
      (record && score > 0 ? ' · Nou rècord!' : ' · Millor: ' + best);
    startBtn.textContent = 'Torna-ho a provar';
    ov.hidden = false;
    publish();
    if (live) live.textContent = msg.textContent;
    try { startBtn.focus({ preventScroll: true }); } catch (e) {}
  };

  const burst = (x, y, c) => {
    for (let i = 0; i < 9; i++) {
      const a = rand(0, 6.283), s = rand(1, 4);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, l: 1, c });
    }
  };

  const update = (dt) => {
    // pala
    if (keys.left)  paddle.target -= 14 * dt * U;
    if (keys.right) paddle.target += 14 * dt * U;
    paddle.target = clamp(paddle.target, paddle.w / 2, W - paddle.w / 2);
    paddle.x += (paddle.target - paddle.x) * Math.min(1, .3 * dt);

    // aparicions: cada cop més ràpid
    spawn -= dt;
    if (spawn <= 0) {
      spawn = Math.max(16, 52 - score * .8) * rand(.7, 1.2);
      const bug = Math.random() < .3;
      items.push({
        bug,
        x: rand(30 * U, W - 30 * U),
        y: -24,
        vy: (2.1 + Math.min(score, 70) * .05) * K * rand(.85, 1.25),
        r: (bug ? 17 : 8) * U
      });
    }

    for (const it of items) {
      it.y += it.vy * dt;
      const hitY = it.y + it.r >= paddle.y && it.y - it.r <= paddle.y + paddle.h;
      const hitX = Math.abs(it.x - paddle.x) <= paddle.w / 2 + it.r * (it.bug ? .9 : .6);
      if (!it.dead && hitY && hitX) {
        it.dead = true;
        if (it.bug) {
          lives--; flash = 1; snd('hit');
          burst(it.x, it.y, '#ff5d5d');
          if (live) live.textContent = 'Error 404! Vides: ' + lives;
          if (lives <= 0) { over(); return; }
        } else {
          score++; snd('catch');
          burst(it.x, it.y, acc(1));
          if (score % 5 === 0 && live) live.textContent = score + ' punts';
        }
        publish();
      }
    }
    items = items.filter((it) => !it.dead && it.y < H + 40);

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .12 * dt; p.l -= .03 * dt; }
    parts = parts.filter((p) => p.l > 0);
    flash = Math.max(0, flash - .04 * dt);
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    // quadrícula suau
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.lineWidth = 1;
    const g = 44 * U;
    ctx.beginPath();
    for (let x = 0; x < W; x += g) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
    for (let y = 0; y < H; y += g) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
    ctx.stroke();

    // elements
    for (const it of items) {
      if (it.bug) {
        const w = 46 * U, h = 28 * U;
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(it.x - w / 2, it.y - h / 2, w, h, 7 * U) : ctx.rect(it.x - w / 2, it.y - h / 2, w, h);
        ctx.fill();
        ctx.fillStyle = '#1a0606';
        ctx.font = '700 ' + Math.round(14 * U) + 'px "Space Grotesk", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('404', it.x, it.y + 1);
      } else {
        const gr = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.r * 3);
        gr.addColorStop(0, acc(.45)); gr.addColorStop(1, acc(0));
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r * 3, 0, 6.283); ctx.fill();
        ctx.fillStyle = acc(1);
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, 6.283); ctx.fill();
      }
    }

    // pala
    ctx.fillStyle = flash > 0 ? 'rgba(255,93,93,' + (.4 + flash * .6).toFixed(2) + ')' : acc(1);
    const px = paddle.x - paddle.w / 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, paddle.y, paddle.w, paddle.h, paddle.h / 2); else ctx.rect(px, paddle.y, paddle.w, paddle.h);
    ctx.fill();

    // partícules
    for (const p of parts) {
      ctx.globalAlpha = clamp(p.l, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;

    // marcador
    const fs = Math.round(15 * U);
    ctx.font = '500 ' + fs + 'px "Space Grotesk", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f2f0ea';
    ctx.fillText('Punts  ' + score, 20 * U, 18 * U);
    ctx.fillStyle = '#8b8b93';
    ctx.fillText('Millor  ' + Math.max(best, score), 20 * U, 18 * U + fs * 1.5);
    ctx.textAlign = 'right';
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < lives ? '#ff5d5d' : 'rgba(255,255,255,.15)';
      ctx.fillText('♥', W - 20 * U - i * fs * 1.4, 18 * U);
    }
  };

  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(3, (now - last) / 16.667);
    last = now;
    if (mode === 'play') update(dt);
    draw();
  };

  /* ---------- Entrades ---------- */
  const moveTo = (e) => {
    const r = cv.getBoundingClientRect();
    paddle.target = clamp(e.clientX - r.left, paddle.w / 2, W - paddle.w / 2);
  };
  cv.addEventListener('pointermove', moveTo);
  cv.addEventListener('pointerdown', moveTo);

  addEventListener('keydown', (e) => {
    const k = e.key;
    const l = k === 'ArrowLeft' || k === 'a' || k === 'A';
    const r = k === 'ArrowRight' || k === 'd' || k === 'D';
    if (!l && !r) return;
    if (mode === 'play') e.preventDefault();
    if (l) keys.left = true;
    if (r) keys.right = true;
  });
  addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  });
  addEventListener('blur', () => { keys.left = keys.right = false; });

  startBtn.addEventListener('click', start);

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  resize();
  publish();
  requestAnimationFrame((n) => { last = n; loop(n); });
})();
