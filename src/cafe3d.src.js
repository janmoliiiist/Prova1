/* ==========================================================
   CAFÈ 3D · cafe3d.src.js  (codi font)
   Escena 3D amb Three.js: un gra de cafè que es converteix en raig,
   s'omple una tassa i apareix el latte art (textura treta d'una foto real).
   Es compila amb esbuild (només el que es fa servir de Three.js):
     npx esbuild src/cafe3d.src.js --bundle --minify --format=esm --outfile=cafe3d.js
   Exporta createScene(canvas, opcions) -> { render(p, temps), resize(), dispose() }
   ========================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, ACESFilmicToneMapping,
  DirectionalLight, SphereGeometry, CylinderGeometry, CircleGeometry, RingGeometry, PlaneGeometry,
  LatheGeometry, TubeGeometry, Vector2, Vector3, SplineCurve, CatmullRomCurve3, Group, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, TextureLoader,
  InstancedMesh, Object3D, SRGBColorSpace, Sprite, SpriteMaterial, DoubleSide, AdditiveBlending
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sm = (t) => t * t * (3 - 2 * t);
const seg = (p, a, b) => sm(clamp((p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Textures procedurals petites ---------- */
const blobTexture = (size, base, n, dark, light) => {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    const px = rnd() * size, py = rnd() * size, r = 6 + rnd() * size * 0.12;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const col = rnd() > 0.5 ? dark : light;
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
};
const softDot = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
};

/* ---------- Geometries ---------- */
const makeBeanGeometry = () => {
  const g = new SphereGeometry(1, 72, 56);
  const pos = g.attributes.position, v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x, y = v.y * 0.62, z = v.z * 0.74;
    // clivella central en forma de S pel cantó +y
    const zc = 0.13 * Math.sin(x * 2.7);
    const d = z - zc;
    const groove = Math.exp(-(d * d) / 0.0065) * Math.max(0, v.y) * 0.2 * (1 - x * x * 0.55);
    y -= groove;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
};
const smoothProfile = (pts, n = 110) => new SplineCurve(pts.map(([r, y]) => new Vector2(r, y))).getPoints(n).map((p) => new Vector2(Math.max(0, p.x), p.y));

const CUP = {
  outer: [[0, 0], [0.34, 0], [0.4, 0.035], [0.56, 0.17], [0.8, 0.48], [0.96, 0.78], [1.0, 0.9]],
  rim: [[1.0, 0.9], [0.985, 0.935], [0.95, 0.94], [0.925, 0.915]],
  inner: [[0.925, 0.915], [0.9, 0.85], [0.78, 0.56], [0.55, 0.24], [0.3, 0.13], [0, 0.11]]
};
// radi interior de la tassa a una alçada (per ajustar el disc del cafè)
const innerR = (h) => {
  const P = [[0.11, 0.0], [0.13, 0.3], [0.24, 0.55], [0.56, 0.78], [0.85, 0.9], [0.915, 0.925]];
  for (let i = 1; i < P.length; i++) if (h <= P[i][0]) { const t = (h - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return lerp(P[i - 1][1], P[i][1], t); }
  return 0.915;
};

export function createScene(canvas, opts = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new Scene();
  const pm = new PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const key = new DirectionalLight(0xfff1de, 1.9); key.position.set(3, 6, 4); scene.add(key);
  const rim = new DirectionalLight(0xffc99a, 1.5); rim.position.set(-5, 3, -4); scene.add(rim);

  const cam = new PerspectiveCamera(30, 1, 0.1, 80);

  /* ----- Gra de cafè ----- */
  const beanGeo = makeBeanGeometry();
  const beanTex = blobTexture(256, '#44230f', 520, 'rgba(15,6,2,.22)', 'rgba(150,85,40,.12)');
  const beanMat = new MeshPhysicalMaterial({
    color: 0xffffff, map: beanTex, bumpMap: beanTex, bumpScale: 1.2,
    roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.32
  });
  const bean = new Mesh(beanGeo, beanMat); scene.add(bean);

  const minis = [];
  [[-3.3, 1.1, -1.2, .3], [3.5, .5, -1.5, .26], [-2.7, -1.5, .4, .2], [2.9, -1.3, .3, .24], [-4.3, -.1, -2, .3], [4.4, 1.7, -2.2, .22], [1, 2.3, -1.6, .2], [-1.2, -2.2, -.8, .18]]
    .forEach(([x, y, z, s], i) => {
      const m = new Mesh(beanGeo, beanMat); m.userData = { x, y, z, s, i }; scene.add(m); minis.push(m);
    });

  /* ----- Tassa + plat ----- */
  const cupGroup = new Group(); scene.add(cupGroup);
  const porcelain = new MeshPhysicalMaterial({ color: 0x9fc4ca, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.18, side: DoubleSide });

  const cupPts = smoothProfile([...CUP.outer, ...CUP.rim.slice(1), ...CUP.inner.slice(1)], 220);
  const cup = new Mesh(new LatheGeometry(cupPts, 96), porcelain); cup.position.y = 0.06; cupGroup.add(cup);

  const saucerPts = smoothProfile([[0, 0], [0.5, 0.0], [1.2, 0.04], [1.62, 0.13], [1.77, 0.2], [1.79, 0.225], [1.75, 0.235], [1.6, 0.175], [1.2, 0.085], [0.78, 0.055], [0.66, 0.055], [0, 0.05]], 160);
  const saucer = new Mesh(new LatheGeometry(saucerPts, 96), porcelain); cupGroup.add(saucer);

  const handleCurve = new CatmullRomCurve3([
    new Vector3(0.96, 0.82, 0), new Vector3(1.22, 0.86, 0), new Vector3(1.46, 0.68, 0),
    new Vector3(1.4, 0.42, 0), new Vector3(1.12, 0.26, 0), new Vector3(0.78, 0.3, 0)
  ]);
  const handle = new Mesh(new TubeGeometry(handleCurve, 48, 0.062, 14, false), porcelain);
  handle.position.y = 0.06; cupGroup.add(handle);

  /* ----- Cafè (superfície) + latte art ----- */
  const coffeeMat = new MeshPhysicalMaterial({ color: 0x3a1c0c, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const coffee = new Mesh(new CircleGeometry(1, 72), coffeeMat); coffee.rotation.x = -Math.PI / 2; cupGroup.add(coffee);
  const latteMat = new MeshStandardMaterial({ roughness: 0.5, metalness: 0, transparent: true, opacity: 0, depthWrite: false });
  const latte = new Mesh(new CircleGeometry(1, 72), latteMat); latte.rotation.x = -Math.PI / 2; latte.rotation.z = 0.35; cupGroup.add(latte);
  new TextureLoader().load(opts.latteURL, (t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 4; latteMat.map = t; latteMat.needsUpdate = true; });

  /* ----- Ombra de contacte ----- */
  const shC = document.createElement('canvas'); shC.width = shC.height = 128;
  { const x = shC.getContext('2d'); const g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(40,18,6,.55)'); g.addColorStop(1, 'rgba(40,18,6,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: new CanvasTexture(shC), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  /* ----- Raig de cafè ----- */
  const SEG = 52, RAD = 16;
  const streamGeo = new CylinderGeometry(1, 1, 1, RAD, SEG, true);
  const base = streamGeo.attributes.position.array.slice();
  const streamMat = new MeshPhysicalMaterial({ color: 0x4b2412, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03, side: DoubleSide });
  const stream = new Mesh(streamGeo, streamMat); stream.frustumCulled = false; scene.add(stream);
  const updateStream = (time, topY, botY, r0, sway) => {
    const pos = streamGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
      const t = 0.5 - by;                                   // 0 dalt, 1 baix
      const y = lerp(topY, botY, t);
      const taper = 1 - 0.42 * Math.pow(t, 0.8);
      const wob = 1 + 0.16 * Math.sin(t * 17 - time * 9) + 0.07 * Math.sin(t * 31 - time * 13);
      const rad = r0 * taper * wob * (0.25 + 0.75 * Math.min(1, t * 9));   // s'estreny a la font
      const ox = sway * Math.sin(t * 3.2 + time * 1.7) * t, oz = sway * 0.6 * Math.cos(t * 2.6 + time * 1.3) * t;
      pos.setXYZ(i, bx * rad + ox, y, bz * rad + oz);
    }
    pos.needsUpdate = true; streamGeo.computeVertexNormals();
  };

  /* ----- Esquitxos + anell ----- */
  const N_DROPS = 22;
  const drops = new InstancedMesh(new SphereGeometry(0.035, 10, 8), streamMat, N_DROPS); drops.frustumCulled = false; scene.add(drops);
  const ring = new Mesh(new RingGeometry(0.8, 1, 48), new MeshBasicMaterial({ color: 0xe8b98a, transparent: true, opacity: 0.4, side: DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const dummy = new Object3D();

  /* ----- Vapor ----- */
  const dot = softDot();
  const steam = [];
  for (let i = 0; i < 9; i++) {
    const s = new Sprite(new SpriteMaterial({ map: dot, transparent: true, opacity: 0, depthWrite: false, color: 0xfff6ea }));
    s.userData = { i }; scene.add(s); steam.push(s);
  }

  const target = new Vector3();
  let W = 1, H = 1, aspect = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W < 800 ? 1.5 : 1.75));
    renderer.setSize(W, H, false);
    aspect = W / H; cam.aspect = aspect; cam.updateProjectionMatrix();
  };

  /* ==========================================================
     LÍNIA DE TEMPS (p: 0 → 1)
     0 – .22  el gra
     .22 – .42  el gra s'enlaira i en surt el raig; la tassa puja
     .42 – .64  la tassa s'omple
     .64 – .8   el raig s'atura i apareix el latte art
     .8 – 1     la càmera baixa i mira la tassa des de dalt
     ========================================================== */
  const render = (p, time = 0) => {
    // gra
    const rise = seg(p, 0.22, 0.46);
    bean.position.set(0, lerp(0.25, 3.4, rise), 0);
    bean.scale.setScalar(lerp(1.05, 0.8, rise));
    bean.rotation.set(1.05 + 0.18 * Math.sin(time * 0.6), Math.sin(time * 0.4) * 0.5 + p * 5, -0.25);
    bean.visible = rise < 0.99;

    // grans petits de fons
    const fade = 1 - seg(p, 0.14, 0.34);
    minis.forEach((m) => {
      const u = m.userData;
      m.visible = fade > 0.01;
      m.position.set(u.x, u.y + Math.sin(time * 0.8 + u.i * 1.7) * 0.16 - p * 1.6, u.z);
      m.scale.setScalar(u.s * fade * 1.6);
      m.rotation.set(time * 0.3 + u.i, time * 0.4 + p * 5 + u.i * 2, u.i);
    });

    // tassa
    const up = seg(p, 0.22, 0.42);
    const fin = seg(p, 0.8, 1);
    const cupScale = lerp(1, 1.1, fin);
    cupGroup.position.set(0, lerp(-6.2, -1.25, up), 0);
    cupGroup.scale.setScalar(cupScale);
    cupGroup.rotation.y = lerp(-0.7, 0.2, up) - fin * 0.8;
    cupGroup.visible = up > 0.001;
    shadow.position.set(0, cupGroup.position.y + 0.012, 0);
    shadow.scale.setScalar(4.6 * cupScale);
    shadow.visible = cupGroup.visible;

    // cafè
    const level = lerp(0.3, 0.8, seg(p, 0.4, 0.64));
    const ly = 0.06 + level;
    const lr = innerR(level) - 0.004;
    coffee.position.y = ly; coffee.scale.setScalar(lr);
    latte.position.y = ly + 0.003; latte.scale.setScalar(lr * 0.99);
    latteMat.opacity = seg(p, 0.66, 0.8);

    // raig
    const surfaceY = cupGroup.position.y + ly * cupScale;
    const flow = seg(p, 0.24, 0.34);
    const cut = seg(p, 0.64, 0.72);
    const topY = lerp(bean.position.y - 0.3 * bean.scale.y, surfaceY + 0.05, cut);
    const r0 = 0.105 * flow * (1 - cut * 0.5);
    const active = flow > 0.02 && cut < 0.999 && up > 0.5;
    stream.visible = active;
    if (active) updateStream(time, Math.max(topY, surfaceY + 0.1), surfaceY + 0.02, r0, 0.05);

    // esquitxos i anell
    const splash = active ? flow * (1 - cut) : 0;
    drops.visible = ring.visible = splash > 0.05;
    if (drops.visible) {
      for (let i = 0; i < N_DROPS; i++) {
        const ph = (time * 1.1 + i / N_DROPS) % 1, t = ph * 0.55;
        const a = i * 2.39996, v = 0.55 + (i % 5) * 0.1;
        dummy.position.set(Math.cos(a) * v * t * 0.9, surfaceY + 0.02 + (2.3 * t - 4.2 * t * t) * 0.5, Math.sin(a) * v * t * 0.9);
        dummy.scale.setScalar(splash * (1 - ph * 0.4));
        dummy.updateMatrix(); drops.setMatrixAt(i, dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
      const rp = (time * 1.4) % 1;
      ring.position.set(0, surfaceY + 0.01, 0);
      ring.scale.setScalar(0.12 + rp * 0.3);
      ring.material.opacity = 0.35 * splash * (1 - rp);
    }

    // vapor
    const st = seg(p, 0.72, 0.84);
    steam.forEach((s) => {
      const i = s.userData.i, ph = (time * 0.18 + i / steam.length) % 1;
      s.visible = st > 0.01;
      s.position.set(Math.sin(i * 2.1 + time * 0.5) * 0.25 * cupScale, cupGroup.position.y + (1.05 + ph * 1.5) * cupScale, Math.cos(i * 1.3) * 0.2);
      s.scale.setScalar((0.7 + ph * 1.2) * cupScale);
      s.material.opacity = st * 0.2 * Math.sin(ph * Math.PI);
    });

    // càmera
    const focusY = lerp(lerp(0.25, -0.2, seg(p, 0.2, 0.42)), cupGroup.position.y + 0.55 * cupScale, fin);
    target.set(0, focusY, 0);
    let rad = lerp(6, 7.8, seg(p, 0.2, 0.42));
    rad = lerp(rad, 6.6, fin);
    rad = Math.max(rad, 2.3 / (0.268 * aspect));          // en pantalles estretes ens allunyem
    const elev = lerp(0.08, 1.12, fin);
    cam.position.set(0, focusY + Math.sin(elev) * rad, Math.cos(elev) * rad);
    cam.lookAt(target);
    renderer.render(scene, cam);
  };

  const dispose = () => { renderer.dispose(); };
  resize();
  return { render, resize, dispose };
}
