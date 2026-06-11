/* Scene: dusk void, mist, rain, camera, render loop + public Watch API */
(function () {
  const T = window.THREE;
  let renderer, scene, camera, clock;
  let critters = {};
  let rainObj, rainData, rainMax = 1600, rainLevel = 0.45;
  let ripples = [], mists = [], burst = [], dustPts = null, dustData = [];
  let freeCam = false, mouseX = 0, mouseY = 0, elapsed = 0;
  let lights = {}, glowSprite = null, moonSprite = null, starPts = [];
  let hearts = [], driftOn = true, mistLevel = 0.5, theme = 'dusk';
  let flames = [], fireLight = null, emberPts = null, emberData = [], clouds = [];
  let smoke = [], smokeTimer = 0, stoke = 0;
  let marshSticks = [];
  let treeGroups = [];
  let gust = 0, gustTarget = 0, gustTimer = 5, windSlant = 0.12;
  let shootTimer = 22, shoots = [];

  const THEMES = {
    dusk: {
      fog: 0x1a2236, hemiSky: 0x7a8fc8, hemiGround: 0x3a2417,
      dir: 0xffd6a0, warm: 0xff9a4d, rim: 0x4d6bd0, amb: 0x2a3450,
      glow: 0xff9a4d, rain: 0xb9cdf0, dust: 0xffc488,
      moon: 0xe8edff, moonOpacity: 0.5, mist: 0x8fa3d8
    },
    midnight: {
      fog: 0x0e1526, hemiSky: 0x5a74c0, hemiGround: 0x1c2236,
      dir: 0xaec4ff, warm: 0x7fa0e8, rim: 0x3d5ac0, amb: 0x202c4a,
      glow: 0x6f8fe0, rain: 0xa8c0ec, dust: 0xaac4ff,
      moon: 0xf2f5ff, moonOpacity: 0.85, mist: 0x7288c2
    },
    ember: {
      fog: 0x1f1714, hemiSky: 0x9a6a58, hemiGround: 0x401f10,
      dir: 0xffc080, warm: 0xff7a30, rim: 0x8a4a40, amb: 0x3a2620,
      glow: 0xff8038, rain: 0xe0bfa8, dust: 0xffb070,
      moon: 0xffd8b0, moonOpacity: 0.4, mist: 0xb08068
    }
  };
  let mode = 'idle';            // 'idle' | 'focus' | 'celebrate'
  let celebrateUntil = 0;
  let watchPulse = 0;

  const env = { mode: 'idle' };

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x1a2236, 0.045);

    camera = new T.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 4.6, 9.4);
    camera.lookAt(0, 1.3, 0);

    // ---- lights (cozy dusk) ----
    lights.hemi = new T.HemisphereLight(0x7a8fc8, 0x3a2417, 0.6);
    scene.add(lights.hemi);
    lights.dir = new T.DirectionalLight(0xffd6a0, 1.05);
    lights.dir.position.set(5, 8, 4);
    scene.add(lights.dir);
    lights.warm = new T.PointLight(0xff9a4d, 0.45, 26, 2);
    lights.warm.position.set(0, 2.4, 5.5);
    scene.add(lights.warm);
    lights.rim = new T.DirectionalLight(0x4d6bd0, 0.5);
    lights.rim.position.set(-4, 3, -5);
    scene.add(lights.rim);
    lights.amb = new T.AmbientLight(0x2a3450, 0.35);
    scene.add(lights.amb);

    // a faint warm glow disc low-center to anchor the void
    const glowTex = makeGlowTex();
    glowSprite = new T.Sprite(new T.SpriteMaterial({
      map: glowTex, color: 0xff9a4d, transparent: true, opacity: 0.5,
      depthWrite: false, blending: T.AdditiveBlending
    }));
    glowSprite.scale.set(10, 4.5, 1);
    glowSprite.position.set(0, 0.3, -3);
    glowSprite.material.opacity = 0.32;
    scene.add(glowSprite);

    // moon + halo, high left so it peeks around the watch
    moonSprite = new T.Group();
    const moonCore = new T.Sprite(new T.SpriteMaterial({
      map: glowTex, color: 0xe8edff, transparent: true, opacity: 0.9,
      depthWrite: false, blending: T.AdditiveBlending
    }));
    moonCore.scale.set(1.6, 1.6, 1);
    const moonHalo = new T.Sprite(new T.SpriteMaterial({
      map: glowTex, color: 0xbcd0ff, transparent: true, opacity: 0.22,
      depthWrite: false, blending: T.AdditiveBlending
    }));
    moonHalo.scale.set(6, 6, 1);
    moonSprite.add(moonHalo);
    moonSprite.add(moonCore);
    moonSprite.position.set(-8.5, 9.5, -14);
    scene.add(moonSprite);

    // twinkling stars: two layers blinking in counter-phase
    for (let layer = 0; layer < 2; layer++) {
      const n = 70;
      const geo = new T.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = rand(-30, 30);
        pos[i * 3 + 1] = rand(4, 18);
        pos[i * 3 + 2] = rand(-22, -12);
      }
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const pts = new T.Points(geo, new T.PointsMaterial({
        color: 0xdfe6ff, size: 0.07, transparent: true, opacity: 0.6,
        depthWrite: false, sizeAttenuation: true
      }));
      pts.frustumCulled = false;
      scene.add(pts);
      starPts.push(pts);
    }

    // ---- animals ----
    ['redpanda', 'cat', 'shiba'].forEach(type => {
      const c = new window.Critters.Critter(type);
      critters[type] = c;
      scene.add(c.group);
    });

    // ---- rain + atmosphere ----
    buildRain();
    buildRipples();
    buildMist();
    buildDust();
    buildEnvironment();
    buildFire();
    buildCampsite();

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // ---- click interactions: pet an animal, or call one over ----
    const raycaster = new T.Raycaster();
    const ndc = new T.Vector2();
    const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    canvas.addEventListener('pointermove', (e) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      let over = false;
      for (const k in critters) {
        if (!critters[k].active) continue;
        if (raycaster.intersectObject(critters[k].group, true).length) { over = true; break; }
      }
      canvas.style.cursor = over ? 'pointer' : 'default';
    });
    canvas.addEventListener('pointerdown', (e) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // hit an animal?
      for (const k in critters) {
        const c = critters[k];
        if (!c.active) continue;
        const hits = raycaster.intersectObject(c.group, true);
        if (hits.length) {
          c.pet();
          spawnHearts(c.group.position.x, c.group.position.z, c.def.bodyColor);
          if (window.Watch.onPet) window.Watch.onPet(k);
          return;
        }
      }
      // otherwise: tap the floor to call the nearest friend
      const pt = new T.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, pt)) {
        const B = window.Critters.BOUNDS;
        if (pt.x > B.xMin && pt.x < B.xMax && pt.z > B.zMin - 1 && pt.z < B.zMax + 1) {
          const x = Math.max(B.xMin + 0.5, Math.min(B.xMax - 0.5, pt.x));
          const z = Math.max(B.zMin, Math.min(B.zMax, pt.z));
          spawnRipple(pt.x, pt.z);
          let best = null, bestD = 1e9;
          for (const k in critters) {
            const c = critters[k];
            if (!c.active) continue;
            const d = Math.hypot(c.pos.x - x, c.pos.y - z);
            if (d < bestD) { bestD = d; best = c; }
          }
          if (best) best.callTo(x, z);
        }
      }
    });

    clock = new T.Clock();
    // respect reduced-motion: no camera drift/breathing
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      driftOn = false;
    }
    window.addEventListener('resize', onResize);
    animate();
  }

  // ---- campfire-forest backdrop: mountain ridges, bare trees, cloud bands ----
  function silhouetteMat(color) {
    return new T.MeshBasicMaterial({ color: color });
  }
  function buildRidge(zPos, height, color) {
    const shape = new T.Shape();
    shape.moveTo(-48, -0.5);
    let x = -48;
    while (x < 48) {
      const nx = x + rand(3.5, 7.5);
      shape.lineTo((x + nx) / 2, rand(height * 0.55, height));
      shape.lineTo(nx, rand(0.6, height * 0.3));
      x = nx;
    }
    shape.lineTo(48, -0.5);
    shape.closePath();
    const m = new T.Mesh(new T.ShapeGeometry(shape), silhouetteMat(color));
    m.position.set(0, 0, zPos);
    scene.add(m);
  }
  function buildTree(x, z, h) {
    const g = new T.Group();
    const matT = silhouetteMat(0x0f0a08);
    const trunk = new T.Mesh(new T.CylinderGeometry(0.05, 0.16, h, 5), matT);
    trunk.position.y = h / 2;
    g.add(trunk);
    const nB = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < nB; i++) {
      const f = 0.35 + (i / nB) * 0.6;          // height fraction
      const len = (1.05 - f) * h * 0.42 + 0.3;
      const br = new T.Mesh(new T.CylinderGeometry(0.012, 0.05, len, 4), matT);
      const side = i % 2 === 0 ? 1 : -1;
      br.position.y = len / 2;
      const pivot = new T.Group();
      pivot.position.y = h * f;
      pivot.rotation.z = side * rand(0.85, 1.35);
      pivot.rotation.y = rand(-0.6, 0.6);
      pivot.add(br);
      g.add(pivot);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rand(-0.3, 0.3);
    g.userData.ph = Math.random() * 6;
    scene.add(g);
    treeGroups.push(g);
  }
  function buildEnvironment() {
    // layered mountain silhouettes (fog fades the far one into the sky)
    buildRidge(-19, 4.4, 0x1c1715);
    buildRidge(-14, 2.7, 0x14100e);
    // bare trees framing the edges
    const spots = [
      [-10.5, -7.5, 7.5], [-8.2, -4.5, 6], [-6.8, -2.6, 4.6],
      [10.2, -7, 7.2], [8.0, -4.2, 5.8], [6.6, -2.8, 4.2],
      [-12.5, -10, 8.5], [12.5, -10.5, 8.2]
    ];
    for (const [x, z, h] of spots) buildTree(x, z, h);
    // slow dark cloud bands
    const tex = makeGlowTex();
    for (let i = 0; i < 4; i++) {
      const c = new T.Sprite(new T.SpriteMaterial({
        map: tex, color: 0x10181a, transparent: true,
        opacity: rand(0.35, 0.5), depthWrite: false
      }));
      c.scale.set(rand(16, 26), rand(3, 5), 1);
      c.position.set(rand(-14, 14), rand(9, 15), -17);
      c.userData.vx = rand(0.06, 0.16) * (Math.random() < 0.5 ? -1 : 1);
      scene.add(c);
      clouds.push(c);
    }
  }

  // ---- low-poly campfire ----
  const FIRE_X = -2.3, FIRE_Z = -2.4;
  function buildFire() {
    const fire = new T.Group();
    fire.position.set(FIRE_X, 0, FIRE_Z);
    const logMat = new T.MeshStandardMaterial({ color: 0x2e1a0e, flatShading: true, roughness: 0.95 });
    for (let i = 0; i < 5; i++) {
      const log = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 1.15, 5), logMat);
      const a = (i / 5) * Math.PI * 2 + 0.3;
      log.rotation.z = Math.PI / 2 - 0.28;
      log.rotation.y = a;
      log.position.set(Math.cos(a) * 0.18, 0.16, Math.sin(a) * 0.18);
      fire.add(log);
    }
    // ring of stones
    const stoneMat = new T.MeshStandardMaterial({ color: 0x3a2f28, flatShading: true, roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = new T.Mesh(new T.IcosahedronGeometry(rand(0.09, 0.15), 0), stoneMat);
      s.position.set(Math.cos(a) * 0.78, 0.07, Math.sin(a) * 0.78);
      s.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      fire.add(s);
    }
    // layered flames
    const flameDefs = [
      { r: 0.5, h: 1.15, c: 0xff4d14, o: 0.55 },
      { r: 0.34, h: 0.85, c: 0xff9226, o: 0.75 },
      { r: 0.19, h: 0.55, c: 0xffd97a, o: 0.95 }
    ];
    flameDefs.forEach((d, i) => {
      const f = new T.Mesh(
        new T.ConeGeometry(d.r, d.h, 5),
        new T.MeshBasicMaterial({
          color: d.c, transparent: true, opacity: d.o,
          blending: T.AdditiveBlending, depthWrite: false
        })
      );
      f.position.y = d.h / 2 + 0.12;
      fire.add(f);
      flames.push({ mesh: f, baseH: d.h, ph: i * 2.1 });
    });
    // fire glow sprite hugging the ground
    const fg = new T.Sprite(new T.SpriteMaterial({
      map: makeGlowTex(), color: 0xff6a20, transparent: true, opacity: 0.55,
      depthWrite: false, blending: T.AdditiveBlending
    }));
    fg.scale.set(3.6, 2.2, 1);
    fg.position.y = 0.5;
    fg.material.opacity = 0.45;
    fire.add(fg);
    scene.add(fire);
    // flickering light
    fireLight = new T.PointLight(0xff7a30, 1.5, 14, 2);
    fireLight.position.set(FIRE_X, 1.1, FIRE_Z);
    scene.add(fireLight);
    // rising embers
    const n = 26;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      emberData.push(resetEmber({}));
      pos[i * 3 + 1] = -1; // start hidden
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    emberPts = new T.Points(geo, new T.PointsMaterial({
      color: 0xffa040, size: 0.07, transparent: true, opacity: 0.9,
      depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
    }));
    emberPts.frustumCulled = false;
    scene.add(emberPts);
    // smoke wisps
    for (let i = 0; i < 9; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({
        map: makeGlowTex(), color: 0x57483c, transparent: true,
        opacity: 0, depthWrite: false
      }));
      s.visible = false;
      scene.add(s);
      smoke.push(s);
    }
    window.Critters.FIRE = { x: FIRE_X, z: FIRE_Z };
  }
  function resetEmber(e) {
    e.x = FIRE_X + rand(-0.15, 0.15); e.y = rand(0.2, 0.6); e.z = FIRE_Z + rand(-0.15, 0.15);
    e.vy = rand(0.7, 1.6); e.vx = rand(-0.12, 0.12);
    e.life = 0; e.maxLife = rand(1.2, 2.6);
    return e;
  }
  function updateFire(dt) {
    stoke = Math.max(0, stoke - stoke * dt * 1.4);
    const flare = 1 + stoke * 0.38;
    for (const f of flames) {
      const s = (1 + Math.sin(elapsed * 9 + f.ph) * 0.13 + Math.sin(elapsed * 23 + f.ph * 3) * 0.07) * flare;
      f.mesh.scale.set(1 + Math.sin(elapsed * 13 + f.ph) * 0.08, s, 1 + Math.cos(elapsed * 11 + f.ph) * 0.08);
      f.mesh.position.y = (f.baseH / 2) * s + 0.12;
      f.mesh.position.x = Math.sin(elapsed * 7 + f.ph) * 0.035;
      f.mesh.rotation.y += dt * (0.6 + f.ph * 0.2);
    }
    fireLight.intensity = (1.45 + Math.sin(elapsed * 11) * 0.18 + Math.sin(elapsed * 31) * 0.12) * (1 + stoke * 0.55);
    // marshmallow skewers sway gently in their owners' absent hands
    const swayQ = new T.Quaternion();
    const zAxis = new T.Vector3(0, 0, 1);
    for (const m of marshSticks) {
      swayQ.setFromAxisAngle(zAxis, Math.sin(elapsed * 1.2 + m.ph) * 0.028);
      m.pivot.quaternion.copy(m.baseQ).multiply(swayQ);
    }
    const arr = emberPts.geometry.attributes.position.array;
    for (let i = 0; i < emberData.length; i++) {
      const e = emberData[i];
      e.life += dt;
      if (e.life > e.maxLife) resetEmber(e);
      e.x += e.vx * dt + Math.sin(elapsed * 5 + i) * 0.004;
      e.y += e.vy * dt;
      arr[i * 3] = e.x; arr[i * 3 + 1] = e.y; arr[i * 3 + 2] = e.z;
    }
    emberPts.geometry.attributes.position.needsUpdate = true;
    // glow follows the fire
    glowSprite.position.x = FIRE_X * 0.6;
    for (const c of clouds) {
      c.position.x += c.userData.vx * dt * (1 + gust * 1.5);
      if (c.position.x > 20) c.position.x = -20;
      if (c.position.x < -20) c.position.x = 20;
    }
    // smoke wisps drifting with the wind
    smokeTimer -= dt;
    if (smokeTimer <= 0) {
      smokeTimer = rand(0.45, 0.9);
      const s = smoke.find(s => !s.visible);
      if (s) {
        s.visible = true;
        s.userData.life = 0;
        s.userData.maxLife = rand(2.6, 3.6);
        s.position.set(FIRE_X + rand(-0.1, 0.1), rand(1.0, 1.3), FIRE_Z);
        s.userData.drift = rand(-0.05, 0.12);
      }
    }
    for (const s of smoke) {
      if (!s.visible) continue;
      s.userData.life += dt;
      const t = s.userData.life / s.userData.maxLife;
      if (t >= 1) { s.visible = false; continue; }
      s.position.y += dt * 0.55;
      s.position.x += dt * (s.userData.drift + gust * 0.5) + Math.sin(elapsed * 1.7 + s.userData.maxLife * 5) * 0.004;
      const sc = 0.5 + t * 1.3;
      s.scale.set(sc, sc * 0.8, 1);
      s.material.opacity = Math.sin(t * Math.PI) * 0.15;
    }
  }

  // ---- campsite: chairs + marshmallow skewers ----
  function buildCampsite() {
    const woodMat = new T.MeshStandardMaterial({ color: 0x4f3019, flatShading: true, roughness: 0.95 });
    const woodDark = new T.MeshStandardMaterial({ color: 0x35200f, flatShading: true, roughness: 1 });

    function chair(x, z) {
      const g = new T.Group();
      for (const [lx, lz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.03, 0.035, 0.42, 5), woodDark);
        leg.position.set(lx, 0.21, lz);
        g.add(leg);
      }
      const seat = new T.Mesh(new T.BoxGeometry(0.56, 0.07, 0.46), woodMat);
      seat.position.y = 0.45;
      g.add(seat);
      for (const lx of [-0.22, 0.22]) {
        const post = new T.Mesh(new T.CylinderGeometry(0.025, 0.03, 0.52, 5), woodDark);
        post.position.set(lx, 0.72, -0.24);
        post.rotation.x = 0.16;
        g.add(post);
      }
      for (const hy of [0.7, 0.88]) {
        const slat = new T.Mesh(new T.BoxGeometry(0.5, 0.1, 0.045), woodMat);
        slat.position.set(0, hy, -0.24 - (hy - 0.45) * 0.16);
        slat.rotation.x = 0.16;
        g.add(slat);
      }
      g.position.set(x, 0, z);
      // face the fire, with a casual offset
      g.rotation.y = Math.atan2(FIRE_X - x, FIRE_Z - z) + rand(-0.14, 0.14);
      scene.add(g);
    }
    chair(FIRE_X - 1.6, FIRE_Z - 0.75);
    chair(FIRE_X - 0.15, FIRE_Z - 1.55);
    chair(FIRE_X + 1.55, FIRE_Z - 0.6);

    const stickMat = new T.MeshStandardMaterial({ color: 0x6b4a26, flatShading: true, roughness: 1 });
    function skewer(bx, bz, toastColor) {
      const pivot = new T.Group();
      pivot.position.set(bx, 0.12, bz);
      const tip = new T.Vector3(FIRE_X + rand(-0.1, 0.1), rand(0.8, 0.98), FIRE_Z + rand(-0.1, 0.1));
      const dir = tip.clone().sub(pivot.position);
      const len = dir.length();
      const stick = new T.Mesh(new T.CylinderGeometry(0.014, 0.022, len, 4), stickMat);
      stick.position.y = len / 2;
      pivot.add(stick);
      const marsh = new T.Mesh(
        new T.CylinderGeometry(0.078, 0.078, 0.12, 6),
        new T.MeshStandardMaterial({ color: 0xf6efdf, flatShading: true, roughness: 0.55 })
      );
      marsh.position.y = len - 0.03;
      pivot.add(marsh);
      // toasted ring on the fire side
      const toast = new T.Mesh(
        new T.CylinderGeometry(0.08, 0.08, 0.04, 6),
        new T.MeshStandardMaterial({ color: toastColor, flatShading: true, roughness: 0.7 })
      );
      toast.position.y = len - 0.1;
      pivot.add(toast);
      pivot.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      scene.add(pivot);
      marshSticks.push({ pivot: pivot, baseQ: pivot.quaternion.clone(), ph: Math.random() * 6 });
    }
    skewer(FIRE_X - 1.25, FIRE_Z - 0.6, 0xd9a25e);
    skewer(FIRE_X + 1.2, FIRE_Z - 0.75, 0xa5612a);
    skewer(FIRE_X + 0.35, FIRE_Z - 1.35, 0xc88b46);
  }

  // ---- shooting stars ----
  function spawnShoot() {
    const s = new T.Sprite(new T.SpriteMaterial({
      map: makeGlowTex(), color: 0xeef2ff, transparent: true, opacity: 0,
      depthWrite: false, blending: T.AdditiveBlending
    }));
    s.scale.set(2.6, 0.07, 1);
    s.position.set(rand(-16, 2), rand(11, 16), -16.5);
    s.userData.vx = rand(9, 14);
    s.userData.vy = -rand(2.5, 4);
    s.userData.life = 0;
    scene.add(s);
    shoots.push(s);
  }
  function updateShoots(dt) {
    shootTimer -= dt;
    if (shootTimer <= 0) {
      shootTimer = rand(20, 45);
      spawnShoot();
    }
    for (let i = shoots.length - 1; i >= 0; i--) {
      const s = shoots[i];
      s.userData.life += dt;
      const t = s.userData.life / 1.1;
      if (t >= 1) { scene.remove(s); s.material.dispose(); shoots.splice(i, 1); continue; }
      s.position.x += s.userData.vx * dt;
      s.position.y += s.userData.vy * dt;
      s.material.opacity = Math.sin(t * Math.PI) * 0.85;
      s.material.rotation = Math.atan2(-s.userData.vy, s.userData.vx) * -1;
    }
  }

  let glowTexCache = null;
  function makeGlowTex() {
    if (glowTexCache) return glowTexCache;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,180,110,0.5)');
    g.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    glowTexCache = new T.CanvasTexture(c);
    return glowTexCache;
  }

  // ---- Rain as falling line segments ----
  function buildRain() {
    const geo = new T.BufferGeometry();
    const positions = new Float32Array(rainMax * 2 * 3);
    rainData = [];
    for (let i = 0; i < rainMax; i++) {
      const drop = {
        x: rand(-16, 16),
        y: rand(0, 20),
        z: rand(-9, 7),
        len: rand(0.4, 0.9),
        speed: rand(9, 15)
      };
      rainData.push(drop);
      writeDrop(positions, i, drop);
    }
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    const matr = new T.LineBasicMaterial({
      color: 0xb9cdf0, transparent: true, opacity: 0.4
    });
    rainObj = new T.LineSegments(geo, matr);
    rainObj.frustumCulled = false;
    scene.add(rainObj);
    applyRainLevel();
  }

  // ---- heart particles (petting reward) ----
  let heartTex = null;
  function getHeartTex() {
    if (heartTex) return heartTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.translate(32, 30);
    ctx.fillStyle = '#ff9eb0';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-22, -10, -10, -26, 0, -12);
    ctx.bezierCurveTo(10, -26, 22, -10, 0, 8);
    ctx.fill();
    heartTex = new T.CanvasTexture(c);
    return heartTex;
  }
  function spawnHearts(x, z, tint) {
    for (let i = 0; i < 5; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({
        map: getHeartTex(), transparent: true, opacity: 0.95, depthWrite: false
      }));
      const sc = rand(0.16, 0.3);
      s.scale.set(sc, sc, 1);
      s.position.set(x + rand(-0.4, 0.4), rand(0.8, 1.4), z + rand(-0.2, 0.3));
      s.userData.v = new T.Vector3(rand(-0.4, 0.4), rand(1.2, 2.2), rand(-0.2, 0.2));
      s.userData.life = 0;
      scene.add(s);
      hearts.push(s);
    }
  }
  function updateHearts(dt) {
    for (let i = hearts.length - 1; i >= 0; i--) {
      const s = hearts[i];
      s.userData.life += dt;
      const t = s.userData.life / 1.3;
      if (t >= 1) {
        scene.remove(s); s.material.dispose(); hearts.splice(i, 1);
        continue;
      }
      s.position.addScaledVector(s.userData.v, dt);
      s.position.x += Math.sin(s.userData.life * 6) * 0.01;
      s.material.opacity = 0.95 * (1 - t * t);
    }
  }

  // ---- splash ripples where drops land ----
  function buildRipples() {
    const geo = new T.RingGeometry(1, 1.16, 22);
    for (let i = 0; i < 22; i++) {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({
        color: 0x9fb4e8, transparent: true, opacity: 0, depthWrite: false
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.015;
      m.visible = false;
      m.userData.life = 0;
      scene.add(m);
      ripples.push(m);
    }
  }
  function spawnRipple(x, z) {
    const r = ripples.find(r => !r.visible);
    if (!r) return;
    r.visible = true;
    r.userData.life = 0;
    r.position.set(x, 0.015, z);
  }
  function updateRipples(dt) {
    for (const r of ripples) {
      if (!r.visible) continue;
      r.userData.life += dt;
      const t = r.userData.life / 0.65;
      if (t >= 1) { r.visible = false; continue; }
      const s = 0.06 + t * 0.5;
      r.scale.set(s, s, s);
      r.material.opacity = 0.32 * (1 - t) * (0.3 + rainLevel * 0.7);
    }
  }

  // ---- drifting mist banks ----
  function buildMist() {
    const tex = makeGlowTex();
    for (let i = 0; i < 6; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({
        map: tex, color: 0x8fa3d8, transparent: true,
        opacity: 0.05 + Math.random() * 0.05, depthWrite: false
      }));
      s.scale.set(rand(9, 15), rand(2.5, 4.5), 1);
      s.position.set(rand(-11, 11), rand(0.4, 2.6), rand(-6, 2.5));
      s.userData.vx = rand(0.12, 0.3) * (Math.random() < 0.5 ? -1 : 1);
      scene.add(s);
      mists.push(s);
    }
  }
  function updateMist(dt) {
    for (const s of mists) {
      s.position.x += s.userData.vx * dt;
      if (s.position.x > 15) s.position.x = -15;
      if (s.position.x < -15) s.position.x = 15;
      const base = s.userData.baseOp != null ? s.userData.baseOp : (s.userData.baseOp = s.material.opacity);
      s.material.opacity = base * mistLevel * 2;
    }
  }

  // ---- floating amber dust motes ----
  function buildDust() {
    const n = 42;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const d = {
        x: rand(-9, 9), y: rand(0.3, 4.5), z: rand(-5, 3.5),
        ph: Math.random() * Math.PI * 2, sp: rand(0.3, 0.8)
      };
      dustData.push(d);
      pos[i * 3] = d.x; pos[i * 3 + 1] = d.y; pos[i * 3 + 2] = d.z;
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    dustPts = new T.Points(geo, new T.PointsMaterial({
      color: 0xffc488, size: 0.055, transparent: true, opacity: 0.55,
      depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
    }));
    dustPts.frustumCulled = false;
    scene.add(dustPts);
  }
  function updateDust(dt) {
    elapsed += dt;
    const arr = dustPts.geometry.attributes.position.array;
    for (let i = 0; i < dustData.length; i++) {
      const d = dustData[i];
      arr[i * 3] = d.x + Math.sin(elapsed * d.sp + d.ph) * 0.6;
      arr[i * 3 + 1] = d.y + Math.sin(elapsed * d.sp * 0.7 + d.ph * 2) * 0.35;
    }
    dustPts.geometry.attributes.position.needsUpdate = true;
  }

  // ---- celebration sparkle burst ----
  function celebrateBurst() {
    const tex = makeGlowTex();
    for (let i = 0; i < 28; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({
        map: tex, color: i % 3 ? 0xffc079 : 0xfff0dc,
        transparent: true, opacity: 0.95, depthWrite: false,
        blending: T.AdditiveBlending
      }));
      const sc = rand(0.12, 0.38);
      s.scale.set(sc, sc, 1);
      s.position.set(rand(-1.2, 1.2), rand(0.8, 2.4), rand(-0.5, 1.8));
      s.userData.v = new T.Vector3(rand(-2.4, 2.4), rand(2.5, 5.5), rand(-1.2, 1.2));
      s.userData.life = 0;
      scene.add(s);
      burst.push(s);
    }
  }
  function updateBurst(dt) {
    for (let i = burst.length - 1; i >= 0; i--) {
      const s = burst[i];
      s.userData.life += dt;
      const t = s.userData.life / 1.5;
      if (t >= 1) {
        scene.remove(s);
        s.material.dispose();
        burst.splice(i, 1);
        continue;
      }
      s.userData.v.y -= 4.2 * dt;
      s.position.addScaledVector(s.userData.v, dt);
      if (s.position.y < 0.05) { s.position.y = 0.05; s.userData.v.y *= -0.4; }
      s.material.opacity = 0.95 * (1 - t);
    }
  }

  function writeDrop(arr, i, d) {
    const o = i * 6;
    const slant = windSlant;
    arr[o] = d.x; arr[o + 1] = d.y; arr[o + 2] = d.z;
    arr[o + 3] = d.x - d.len * slant; arr[o + 4] = d.y - d.len; arr[o + 5] = d.z;
  }

  function applyRainLevel() {
    const count = Math.round(rainMax * rainLevel);
    rainObj.geometry.setDrawRange(0, count * 2);
    rainObj.material.opacity = 0.18 + rainLevel * 0.34;
  }

  function updateRain(dt) {
    const count = Math.round(rainMax * rainLevel);
    const arr = rainObj.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const d = rainData[i];
      d.y -= d.speed * dt;
      d.x -= d.speed * windSlant * dt;
      if (d.y < 0) {
        if (d.z > -4 && d.z < 5 && Math.abs(d.x) < 11 && Math.random() < 0.22) {
          spawnRipple(d.x, d.z);
        }
        d.y = rand(16, 22);
        d.x = rand(-16, 16);
        d.z = rand(-9, 7);
      }
      writeDrop(arr, i, d);
    }
    rainObj.geometry.attributes.position.needsUpdate = true;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    let dt = clock.getDelta();
    if (dt > 0.05) dt = 0.05;

    // mode resolution
    let effMode = mode;
    if (mode === 'celebrate' && performance.now() > celebrateUntil) {
      mode = 'idle';
      effMode = 'idle';
    }
    env.mode = mode;

    for (const k in critters) critters[k].update(dt, env);
    updateRain(dt);
    updateRipples(dt);
    updateMist(dt);
    updateDust(dt);
    updateBurst(dt);
    updateHearts(dt);
    updateFire(dt);
    updateShoots(dt);

    // wind gusts: sway trees, slant rain, hurry the mist
    gustTimer -= dt;
    if (gustTimer <= 0) {
      gustTimer = rand(5, 11);
      gustTarget = Math.random() < 0.45 ? rand(0.4, 1) : rand(0, 0.2);
    }
    gust += (gustTarget - gust) * Math.min(1, dt * 0.7);
    windSlant = 0.12 + gust * 0.22;
    for (const g of treeGroups) {
      g.rotation.z = Math.sin(elapsed * 0.7 + g.userData.ph) * 0.012 * (1 + gust * 2.2);
    }

    // star twinkle
    starPts[0].material.opacity = 0.35 + Math.sin(elapsed * 0.9) * 0.25;
    starPts[1].material.opacity = 0.35 + Math.cos(elapsed * 1.3) * 0.25;

    // gentle camera parallax + slow cinematic breathing
    if (!freeCam && driftOn) {
      camera.position.x += (mouseX * 0.55 - camera.position.x) * Math.min(1, dt * 2);
      camera.position.y += (4.6 - mouseY * 0.3 + Math.sin(elapsed * 0.09) * 0.14 - camera.position.y) * Math.min(1, dt * 2);
      camera.position.z = 9.4 + Math.sin(elapsed * 0.07) * 0.35;
      camera.lookAt(0, 1.3, 0);
    }

    renderer.render(scene, camera);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---- Public API ----
  window.Watch = {
    init,
    setRain(level0to100) {
      rainLevel = Math.max(0, Math.min(1, level0to100 / 100));
      if (rainObj) applyRainLevel();
    },
    setAnimalActive(type, on) {
      if (critters[type]) critters[type].setActive(on);
    },
    setMode(m) {
      const prev = mode;
      mode = m;
      env.mode = m;
      if (m === 'focus' && prev !== 'focus') {
        // everyone perks up + re-gathers
        for (const k in critters) {
          critters[k].perk();
          critters[k].pickTarget('focus');
          critters[k].state = 'walk';
        }
      }
    },
    setTheme(name) {
      const t = THEMES[name];
      if (!t) return;
      theme = name;
      scene.fog.color.setHex(t.fog);
      lights.hemi.color.setHex(t.hemiSky);
      lights.hemi.groundColor.setHex(t.hemiGround);
      lights.dir.color.setHex(t.dir);
      lights.warm.color.setHex(t.warm);
      lights.rim.color.setHex(t.rim);
      lights.amb.color.setHex(t.amb);
      glowSprite.material.color.setHex(t.glow);
      rainObj.material.color.setHex(t.rain);
      dustPts.material.color.setHex(t.dust);
      moonSprite.children[1].material.color.setHex(t.moon);
      moonSprite.children[1].material.opacity = t.moonOpacity + 0.25;
      moonSprite.children[0].material.opacity = t.moonOpacity * 0.35;
      for (const s of mists) s.material.color.setHex(t.mist);
      document.body.className = 'theme-' + name;
    },
    setMist(level0to100) {
      mistLevel = Math.max(0, Math.min(1, level0to100 / 100));
    },
    setDust(on) {
      if (dustPts) dustPts.visible = !!on;
    },
    setDrift(on) { driftOn = !!on; },
    setPace(mul) {
      for (const k in critters) critters[k].speedMul = mul;
    },
    celebrate(durationSec) {
      mode = 'celebrate';
      env.mode = 'celebrate';
      celebrateUntil = performance.now() + (durationSec || 6) * 1000;
      for (const k in critters) critters[k].perk();
      celebrateBurst();
      this.stoke(1.6);
    },
    stoke(power) {
      stoke = Math.min(2.2, stoke + (power || 0.6));
      // a puff of fast embers
      let n = 0;
      for (const e of emberData) {
        if (n >= 8) break;
        if (e.life > e.maxLife * 0.5) {
          resetEmber(e);
          e.vy *= 1.9;
          e.vx *= 2.2;
          n++;
        }
      }
    },
    _step(frames, dt) {
      frames = frames || 60; dt = dt || 0.033;
      for (let f = 0; f < frames; f++) {
        for (const k in critters) critters[k].update(dt, env);
        updateRain(dt);
      }
      renderer.render(scene, camera);
    },
    _special(type, name, t) {
      const c = critters[type];
      if (!c) return;
      c.state = 'special';
      c.special = name;
      c.specialT = t || 0;
      c.restTimer = 99;
    },
    _inspect() {
      const order = ['redpanda', 'cat', 'shiba'];
      order.forEach((t, i) => {
        const c = critters[t];
        if (!c) return;
        c.active = true; c.group.visible = true;
        c.pos.set(-3.0 + i * 3.0, 0);
        c.target.copy(c.pos);
        c.heading = 0.6; c.state = 'idle'; c.restTimer = 99999;
        c.walking = false; c.sitAmt = 0; c.bob = 0;
        c.earPerk = 0; c.celebT = 0;
        c.group.position.set(c.pos.x, 0, c.pos.y);
        c.group.rotation.y = 0.6;
      });
      freeCam = true;
      camera.position.set(0, 1.4, 6.5);
      camera.lookAt(0, 0.6, 0);
      document.getElementById('ui').style.display = 'none';
      document.getElementById('bottom').style.display = 'none';
    }
  };
})();
