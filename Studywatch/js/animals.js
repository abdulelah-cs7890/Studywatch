/* Low-poly 3D study animals: red panda, cat, shiba — built from faceted primitives */
(function () {
  const T = window.THREE;

  function mat(color, rough) {
    return new T.MeshStandardMaterial({
      color: color,
      flatShading: true,
      roughness: rough == null ? 0.85 : rough,
      metalness: 0.0
    });
  }

  // faceted ellipsoid
  function blob(rx, ry, rz, color, rough) {
    const g = new T.SphereGeometry(1, 7, 5);
    const m = new T.Mesh(g, mat(color, rough));
    m.scale.set(rx, ry, rz);
    return m;
  }
  function ico(r, color) {
    return new T.Mesh(new T.IcosahedronGeometry(r, 0), mat(color));
  }
  function box(w, h, d, color) {
    return new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
  }
  function cone(r, h, color, seg) {
    return new T.Mesh(new T.ConeGeometry(r, h, seg || 4), mat(color));
  }
  function cyl(rt, rb, h, color, seg) {
    return new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 6), mat(color));
  }

  // soft round contact shadow texture
  let shadowTex = null;
  function getShadowTex() {
    if (shadowTex) return shadowTex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    shadowTex = new T.CanvasTexture(c);
    return shadowTex;
  }

  // Zzz text sprite
  let zTex = null;
  function getZTex() {
    if (zTex) return zTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240, 236, 255, 0.95)';
    ctx.fillText('z', 32, 34);
    zTex = new T.CanvasTexture(c);
    return zTex;
  }

  function makeShadow(radius) {
    const m = new T.Mesh(
      new T.PlaneGeometry(radius * 2, radius * 2),
      new T.MeshBasicMaterial({ map: getShadowTex(), transparent: true, depthWrite: false, opacity: 0.5 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    return m;
  }

  // build a leg, pivoting from the hip (top)
  function makeLeg(color, len, thick) {
    const pivot = new T.Group();
    const l = cyl(thick * 0.8, thick, len, color, 5);
    l.position.y = -len / 2;
    pivot.add(l);
    // paw
    const paw = blob(thick * 1.1, thick * 0.7, thick * 1.3, color);
    paw.position.y = -len;
    pivot.add(paw);
    pivot.userData.len = len;
    return pivot;
  }

  // ---- Animal definitions ----
  const DEFS = {
    redpanda: {
      bodyColor: 0xb9531f, faceColor: 0xf2e4cf, darkColor: 0x2a1a12,
      bodyR: [0.55, 0.5, 0.78], headR: 0.5, legLen: 0.42, legThick: 0.13,
      eyeY: 0.08, scale: 0.62,
      speedR: [0.8, 1.1], gaitBob: 0.06, walkSway: 0.13, tailAmp: 1,
      specials: ['rear'],
      build(parts, color) {
        // cream face overlay
        const face = blob(0.42, 0.4, 0.32, color.faceColor);
        face.position.set(0, parts.headY, 0.28);
        parts.pose.add(face);
        // rust mask patches around eyes
        for (const sx of [-1, 1]) {
          const patch = blob(0.12, 0.16, 0.08, color.bodyColor);
          patch.position.set(sx * 0.18, parts.headY + 0.02, 0.5);
          parts.pose.add(patch);
        }
        // ears — rounded, rust w/ cream inner
        for (const sx of [-1, 1]) {
          const ear = blob(0.16, 0.16, 0.07, color.bodyColor);
          ear.position.set(sx * 0.34, parts.headY + 0.42, 0.02);
          const inner = blob(0.09, 0.09, 0.05, color.faceColor);
          inner.position.set(sx * 0.34, parts.headY + 0.42, 0.06);
          parts.pose.add(ear); parts.pose.add(inner);
          parts.ears.push(ear); parts.ears.push(inner);
        }
        // ringed tail — chain of alternating spheres, curving up
        const tail = new T.Group();
        let py = 0, pz = -0.7, ang = 0;
        for (let i = 0; i < 6; i++) {
          const c = i % 2 === 0 ? color.bodyColor : color.darkColor;
          const seg = blob(0.17 - i * 0.012, 0.17 - i * 0.012, 0.17 - i * 0.012, c);
          ang += 0.28;
          pz -= 0.2 * Math.cos(ang);
          py += 0.2 * Math.sin(ang) + 0.04;
          seg.position.set(0, py, pz);
          tail.add(seg);
        }
        tail.position.set(0, parts.bodyY, -0.1);
        parts.pose.add(tail);
        parts.tail = tail;
        // little dark snout tip
        const nose = blob(0.06, 0.05, 0.05, color.darkColor);
        nose.position.set(0, parts.headY - 0.04, 0.6);
        parts.pose.add(nose);
      }
    },
    cat: {
      bodyColor: 0x8b94a6, faceColor: 0xe7ebf2, darkColor: 0x4a5161,
      bodyR: [0.42, 0.42, 0.7], headR: 0.42, legLen: 0.5, legThick: 0.1,
      eyeY: 0.05, scale: 0.6,
      speedR: [1.0, 1.4], gaitBob: 0.035, walkSway: 0.03, tailAmp: 0.8,
      specials: ['pounce', 'groom'],
      build(parts, color) {
        // white muzzle + chest + socks
        const muzzle = blob(0.22, 0.18, 0.18, color.faceColor);
        muzzle.position.set(0, parts.headY - 0.1, 0.34);
        parts.pose.add(muzzle);
        const chest = blob(0.24, 0.34, 0.26, color.faceColor);
        chest.position.set(0, parts.bodyY - 0.04, 0.4);
        parts.pose.add(chest);
        // triangular ears, grey with pink inner
        for (const sx of [-1, 1]) {
          const ear = cone(0.17, 0.34, color.bodyColor, 4);
          ear.position.set(sx * 0.22, parts.headY + 0.42, 0);
          ear.rotation.z = sx * 0.1;
          const inner = cone(0.09, 0.2, 0xd98aa0, 4);
          inner.position.set(sx * 0.22, parts.headY + 0.4, 0.05);
          inner.rotation.z = sx * 0.1;
          parts.pose.add(ear); parts.pose.add(inner);
          parts.ears.push(ear);
        }
        // long thin tail curving up, grey with dark tip
        const tail = new T.Group();
        let py = 0.0, pz = -0.62, ang = 0;
        for (let i = 0; i < 7; i++) {
          const c = i >= 5 ? color.darkColor : color.bodyColor;
          const seg = blob(0.1 - i * 0.006, 0.1 - i * 0.006, 0.1 - i * 0.006, c);
          ang += 0.34;
          pz -= 0.13 * Math.cos(ang);
          py += 0.17 * Math.sin(ang) + 0.05;
          seg.position.set(0, py, pz);
          tail.add(seg);
        }
        tail.position.set(0, parts.bodyY, -0.05);
        parts.pose.add(tail);
        parts.tail = tail;
        const nose = blob(0.05, 0.04, 0.04, 0xd98aa0);
        nose.position.set(0, parts.headY - 0.08, 0.54);
        parts.pose.add(nose);
      }
    },
    shiba: {
      bodyColor: 0xd49a5a, faceColor: 0xf3ead8, darkColor: 0x6b4a2a,
      bodyR: [0.5, 0.48, 0.74], headR: 0.46, legLen: 0.46, legThick: 0.12,
      eyeY: 0.06, scale: 0.62,
      speedR: [1.4, 1.8], gaitBob: 0.11, walkSway: 0.06, tailAmp: 1.8,
      specials: ['zoomie', 'shake'],
      build(parts, color) {
        // cream cheeks + muzzle + chest
        const muzzle = blob(0.26, 0.2, 0.2, color.faceColor);
        muzzle.position.set(0, parts.headY - 0.1, 0.36);
        parts.pose.add(muzzle);
        for (const sx of [-1, 1]) {
          const cheek = blob(0.18, 0.18, 0.14, color.faceColor);
          cheek.position.set(sx * 0.26, parts.headY - 0.06, 0.18);
          parts.pose.add(cheek);
        }
        const chest = blob(0.3, 0.36, 0.26, color.faceColor);
        chest.position.set(0, parts.bodyY - 0.06, 0.42);
        parts.pose.add(chest);
        // pointy triangular ears, tan
        for (const sx of [-1, 1]) {
          const ear = cone(0.16, 0.3, color.bodyColor, 4);
          ear.position.set(sx * 0.26, parts.headY + 0.38, 0.02);
          ear.rotation.z = sx * 0.18;
          parts.pose.add(ear);
          parts.ears.push(ear);
        }
        // curled tail — fan of segments curving up over back
        const tail = new T.Group();
        let py = 0.1, pz = -0.6, ang = -0.2;
        for (let i = 0; i < 5; i++) {
          const seg = blob(0.2 - i * 0.02, 0.2 - i * 0.02, 0.2 - i * 0.02,
            i % 2 ? color.faceColor : color.bodyColor);
          ang += 0.5;
          pz += 0.16 * Math.cos(ang);
          py += 0.18 * Math.sin(ang) + 0.05;
          seg.position.set(0, py, pz);
          tail.add(seg);
        }
        tail.position.set(0, parts.bodyY + 0.1, -0.1);
        parts.pose.add(tail);
        parts.tail = tail;
        const nose = blob(0.06, 0.05, 0.05, color.darkColor);
        nose.position.set(0, parts.headY - 0.12, 0.55);
        parts.pose.add(nose);
      }
    }
  };

  function buildAnimal(type) {
    const def = DEFS[type];
    const group = new T.Group();
    const pose = new T.Group(); // handles bob / sit tilt
    group.add(pose);

    const parts = { pose: pose, ears: [], legs: [], tail: null, eyes: [] };
    parts.bodyY = def.legLen + 0.45;
    parts.headY = parts.bodyY + 0.5;

    // body
    const body = blob(def.bodyR[0], def.bodyR[1], def.bodyR[2], def.bodyColor);
    body.position.set(0, parts.bodyY, 0);
    body.rotation.x = -0.08;
    pose.add(body);

    // head
    const head = ico(def.headR, def.bodyColor);
    head.position.set(0, parts.headY, 0.3);
    pose.add(head);
    parts.head = head;

    // eyes
    for (const sx of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.07, 8, 8), mat(0x14100c, 0.4));
      eye.position.set(sx * 0.2, parts.headY + def.eyeY, 0.58);
      pose.add(eye);
      parts.eyes.push(eye);
      const glint = new T.Mesh(new T.SphereGeometry(0.025, 6, 6),
        new T.MeshBasicMaterial({ color: 0xfff2dc }));
      glint.position.set(sx * 0.2 + 0.02, parts.headY + def.eyeY + 0.03, 0.63);
      pose.add(glint);
      eye.userData.glint = glint;
    }

    // legs (diagonal gait pairs)
    const hipX = def.bodyR[0] * 0.7;
    const hipZ = def.bodyR[2] * 0.62;
    const legPos = [
      [hipX, hipZ], [-hipX, hipZ], [hipX, -hipZ], [-hipX, -hipZ]
    ];
    for (const [lx, lz] of legPos) {
      const leg = makeLeg(def.darkColor === 0x2a1a12 ? def.darkColor : def.bodyColor, def.legLen, def.legThick);
      leg.position.set(lx, def.legLen + 0.1, lz);
      pose.add(leg);
      parts.legs.push(leg);
    }

    // animal-specific extras
    const color = {
      bodyColor: def.bodyColor, faceColor: def.faceColor, darkColor: def.darkColor
    };
    def.build(parts, color);

    group.scale.setScalar(def.scale);
    const shadow = makeShadow(0.85 * def.scale);
    group.add(shadow);
    parts.shadow = shadow;

    // wet-floor reflection: faint colored glow pooled under the body
    const sheen = new T.Mesh(
      new T.PlaneGeometry(2.2, 1.4),
      new T.MeshBasicMaterial({
        map: getShadowTex(), transparent: true, depthWrite: false,
        color: def.bodyColor, opacity: 0.16, blending: T.AdditiveBlending
      })
    );
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.y = 0.01;
    group.add(sheen);

    // Zzz sprites for sleeping (hidden by default)
    parts.zzz = [];
    for (let i = 0; i < 3; i++) {
      const z = new T.Sprite(new T.SpriteMaterial({
        map: getZTex(), transparent: true, opacity: 0, depthWrite: false
      }));
      const s = 0.22 + i * 0.08;
      z.scale.set(s, s, 1);
      z.userData.i = i;
      group.add(z);
      parts.zzz.push(z);
    }

    return { group, pose, parts, type, def };
  }

  // ---- Behavior ----
  const BOUNDS = { xMin: -7, xMax: 7, zMin: -1.2, zMax: 3.6 };

  class Critter {
    constructor(type) {
      const a = buildAnimal(type);
      this.type = type;
      this.group = a.group;
      this.pose = a.pose;
      this.parts = a.parts;
      this.def = a.def;

      this.pos = new T.Vector2(
        rand(BOUNDS.xMin + 1, BOUNDS.xMax - 1),
        rand(BOUNDS.zMin, BOUNDS.zMax)
      );
      this.target = this.pos.clone();
      this.heading = rand(-Math.PI, Math.PI);
      this.phase = Math.random() * 10;
      this.state = 'walk';
      this.restTimer = 0;
      this.speed = rand(this.def.speedR[0], this.def.speedR[1]);
      this.special = null;
      this.specialT = 0;
      this.bob = 0;
      this.sitAmt = 0;       // 0..1 how much sitting/lying
      this.earPerk = 0;      // 0..1
      this.celebT = 0;
      this.spin = 0;
      this.blinkT = rand(2, 6);
      this.petT = 0;
      this.speedMul = 1;
      this.zT = Math.random() * 3;
      this.celebSpot = null;
      this.active = true;
      this.opacity = 1;
      this.group.position.set(this.pos.x, 0, this.pos.y);
      this.pickTarget('idle');
    }

    setActive(on) {
      this.active = on;
      this.group.visible = on;
    }

    pickTarget(mode) {
      if (mode === 'focus') {
        // gather loosely around the campfire
        const F = window.Critters.FIRE || { x: 0, z: 0 };
        const ang = rand(-Math.PI, Math.PI);
        const r = rand(1.8, 3.2);
        let x = F.x + Math.cos(ang) * r;
        let z = F.z + 0.8 + Math.sin(ang) * r * 0.6;
        x = clamp(x, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
        z = clamp(z, BOUNDS.zMin, BOUNDS.zMax);
        this.target.set(x, z);
      } else {
        this.target.set(
          rand(BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5),
          rand(BOUNDS.zMin, BOUNDS.zMax)
        );
      }
    }

    perk() { this.earPerk = 1; this.bobBoost = 1; }

    pet() {
      this.petT = 0.9;
      this.earPerk = 1;
      // wake up if sleeping
      if (this.state === 'sleep') { this.state = 'idle'; this.restTimer = rand(1.5, 3); }
    }

    callTo(x, z) {
      this.target.set(x, z);
      this.state = 'walk';
      this.earPerk = 1;
    }

    update(dt, env) {
      if (!this.active) return;
      const mode = env.mode;

      // celebrate overrides
      if (mode === 'celebrate') {
        this.celebrate(dt);
        this.applyPose(dt);
        return;
      } else {
        this.celebT = 0;
        this.celebSpot = null;
        this.spin *= Math.pow(0.001, dt);
      }

      // decay perk
      this.earPerk = Math.max(0, this.earPerk - dt * 0.6);

      if (this.state === 'walk') {
        const dx = this.target.x - this.pos.x;
        const dz = this.target.y - this.pos.y;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25) {
          // arrived -> choose a rest
          this.beginRest(mode);
        } else {
          const spd = this.speed * this.speedMul;
          const step = Math.min(dist, spd * dt);
          const nx = dx / dist, nz = dz / dist;
          this.pos.x += nx * step;
          this.pos.y += nz * step;
          // face heading
          const desired = Math.atan2(nx, nz);
          this.heading = lerpAngle(this.heading, desired, Math.min(1, dt * 6));
          this.phase += dt * spd * 5.2;
          this.walking = true;
        }
      } else {
        // resting / performing a special move
        this.walking = false;
        this.restTimer -= dt;
        // settle to face the fire while warming up
        if (this.warmHeading != null) {
          this.heading = lerpAngle(this.heading, this.warmHeading, Math.min(1, dt * 3));
          if (this.restTimer <= 0) this.warmHeading = null;
        }
        if (this.state === 'special') {
          this.specialT += dt;
          this.updateSpecial(dt);
        }
        if (this.restTimer <= 0) {
          this.special = null;
          this.pickTarget(mode);
          this.state = 'walk';
        }
      }

      // sit amount target depends on state
      let sitTarget = 0;
      if (this.state === 'sit') sitTarget = 0.5;
      else if (this.state === 'sleep') sitTarget = 1.0;
      this.sitAmt = lerp(this.sitAmt, sitTarget, Math.min(1, dt * 3));

      this.applyTransform();
      this.applyPose(dt);
    }

    beginRest(mode) {
      // arrived to warm up by the fire: sit facing the flames
      if (this.warmPending) {
        this.warmPending = false;
        const F = window.Critters.FIRE;
        if (F) {
          this.state = Math.random() < 0.35 ? 'sleep' : 'sit';
          this.restTimer = rand(6, 12);
          this.warmHeading = Math.atan2(F.x - this.pos.x, F.z - this.pos.y);
          return;
        }
      }
      // sometimes wander over to the fire instead of resting here
      const F = window.Critters.FIRE;
      if (F && !this.warmPending && Math.random() < 0.2) {
        const a = rand(-Math.PI, Math.PI);
        const r = rand(1.3, 2.0);
        const tx = clamp(F.x + Math.cos(a) * r, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
        const tz = clamp(F.z + Math.sin(a) * r, BOUNDS.zMin + 0.1, BOUNDS.zMax);
        this.target.set(tx, tz);
        this.state = 'walk';
        this.warmPending = true;
        return;
      }
      // chance to perform this animal's signature move
      const sp = this.def.specials || [];
      if (sp.length && Math.random() < (mode === 'focus' ? 0.18 : 0.42)) {
        this.state = 'special';
        this.special = sp[Math.floor(Math.random() * sp.length)];
        this.specialT = 0;
        this.restTimer = { rear: 3.2, groom: 3.6, pounce: 1.35, zoomie: 3.4, shake: 1.0 }[this.special] || 2;
        return;
      }
      const roll = Math.random();
      // in focus mode, calmer (more sit/sleep)
      if (mode === 'focus') {
        if (roll < 0.45) this.state = 'sit';
        else if (roll < 0.7) this.state = 'sleep';
        else this.state = 'idle';
        this.restTimer = rand(3.5, 7);
      } else {
        if (roll < 0.3) this.state = 'sit';
        else if (roll < 0.42) this.state = 'sleep';
        else this.state = 'idle';
        this.restTimer = rand(1.6, 4.5);
      }
    }

    // signature move motion (position-level)
    updateSpecial(dt) {
      const s = this.special;
      const B = BOUNDS;
      if (s === 'zoomie') {
        // gleeful circular sprint
        this.heading += 2.6 * dt;
        if (this.pos.x < B.xMin + 1 || this.pos.x > B.xMax - 1 ||
            this.pos.y < B.zMin + 0.4 || this.pos.y > B.zMax - 0.4) {
          const toC = Math.atan2(-this.pos.x, 1.2 - this.pos.y);
          this.heading = lerpAngle(this.heading, toC, Math.min(1, dt * 5));
        }
        const spd = 3.6 * this.speedMul;
        this.pos.x += Math.sin(this.heading) * spd * dt;
        this.pos.y += Math.cos(this.heading) * spd * dt;
        this.pos.x = clamp(this.pos.x, B.xMin, B.xMax);
        this.pos.y = clamp(this.pos.y, B.zMin, B.zMax);
        this.phase += dt * 13;
        this.walking = true;
        this.bob = Math.abs(Math.sin(this.phase)) * 0.17;
      } else if (s === 'pounce') {
        // crouch + butt wiggle, then spring forward
        if (this.specialT >= 0.75 && this.specialT < 1.1) {
          const lt = (this.specialT - 0.75) / 0.35;
          const spd = 4.4;
          this.pos.x += Math.sin(this.heading) * spd * dt;
          this.pos.y += Math.cos(this.heading) * spd * dt;
          this.pos.x = clamp(this.pos.x, B.xMin, B.xMax);
          this.pos.y = clamp(this.pos.y, B.zMin, B.zMax);
          this.bob = Math.sin(lt * Math.PI) * 0.5;
        }
      }
      this.group.position.set(this.pos.x, 0, this.pos.y);
      this.group.rotation.y = this.heading;
    }

    celebrate(dt) {
      this.celebT += dt;
      this.earPerk = 1;
      this.sitAmt = 0;
      // pick a party spot near the campfire once
      if (!this.celebSpot) {
        const F = window.Critters.FIRE || { x: 0, z: 0 };
        const ang = rand(-Math.PI * 0.85, Math.PI * 0.85);
        this.celebSpot = {
          x: clamp(F.x + Math.cos(ang) * rand(1.6, 2.4), BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5),
          z: clamp(F.z + 1.0 + Math.sin(ang) * rand(0.8, 1.4), BOUNDS.zMin, BOUNDS.zMax)
        };
      }
      const dx = this.celebSpot.x - this.pos.x;
      const dz = this.celebSpot.z - this.pos.y;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.35) {
        // sprint to the watch
        const spd = this.speed * this.speedMul * 2.1;
        const step = Math.min(dist, spd * dt);
        this.pos.x += dx / dist * step;
        this.pos.y += dz / dist * step;
        const desired = Math.atan2(dx / dist, dz / dist);
        this.heading = lerpAngle(this.heading, desired, Math.min(1, dt * 8));
        this.phase += dt * spd * 5.2;
        this.walking = true;
        this.bob = Math.abs(Math.sin(this.phase)) * 0.1;
        this.group.position.set(this.pos.x, 0, this.pos.y);
        this.group.rotation.y = this.heading;
      } else {
        // party: hop + spin facing the watch
        this.walking = false;
        this.phase += dt * 4;
        this.heading += 5.5 * dt;
        this.bob = Math.abs(Math.sin(this.celebT * 7)) * 0.5;
        this.group.position.set(this.pos.x, 0, this.pos.y);
        this.group.rotation.y = this.heading;
      }
    }

    applyTransform() {
      this.group.position.set(this.pos.x, 0, this.pos.y);
      this.group.rotation.y = this.heading;
      // walking bob (specials manage their own bounce)
      if (!(this.state === 'special' && (this.special === 'zoomie' || this.special === 'pounce'))) {
        const targetBob = this.walking ? Math.abs(Math.sin(this.phase)) * (this.def.gaitBob || 0.07) : 0;
        this.bob = lerp(this.bob, targetBob, Math.min(1, 0.2));
      }
    }

    applyPose(dt) {
      const p = this.parts;
      // pet hop: a happy little jump
      if (this.petT > 0) {
        this.petT -= dt;
        const t = 1 - Math.max(0, this.petT) / 0.9;
        this.bob = Math.max(this.bob, Math.sin(Math.min(1, t * 2) * Math.PI) * 0.42);
      }
      // special-move ease (in + out)
      let spK = 0;
      if (this.state === 'special') {
        spK = Math.min(Math.min(1, this.specialT * 2.5), Math.min(1, Math.max(0, this.restTimer) * 2.5));
      }

      // body height + tilt (sit crouch, rear-up, pounce crouch)
      let rotX = -this.sitAmt * 0.22;
      let posY = this.bob - this.sitAmt * 0.22;
      if (this.special === 'rear') { rotX = -0.85 * spK; posY += 0.2 * spK; }
      if (this.special === 'groom') { rotX = -0.08 * spK; posY -= 0.08 * spK; }
      if (this.special === 'pounce' && this.specialT < 0.75) { rotX = 0.16 * spK; posY -= 0.13 * spK; }
      this.pose.position.y = posY;
      this.pose.rotation.x = lerp(this.pose.rotation.x, rotX, Math.min(1, dt * 5));

      // body roll: waddle sway while walking, shiba shake, cat butt-wiggle
      let rotZ = this.walking ? Math.sin(this.phase) * (this.def.walkSway || 0.05) : 0;
      if (this.special === 'shake') rotZ = Math.sin(this.specialT * 40) * 0.3 * spK;
      if (this.special === 'pounce' && this.specialT < 0.75) rotZ = Math.sin(this.specialT * 16) * 0.07;
      this.pose.rotation.z = lerp(this.pose.rotation.z, rotZ, Math.min(1, dt * 12));

      // legs
      const amp = this.walking ? 0.7 : 0.0;
      const legs = p.legs;
      if (legs.length === 4) {
        // diagonal gait: legs[0]=FR,1=FL,2=BR,3=BL  (pos order: FR,FL,BR,BL)
        const a = Math.sin(this.phase);
        const b = Math.sin(this.phase + Math.PI);
        legs[0].rotation.x = a * amp;
        legs[3].rotation.x = a * amp;
        legs[1].rotation.x = b * amp;
        legs[2].rotation.x = b * amp;
        // when sitting, fold back legs / lower
        const fold = this.sitAmt;
        legs[2].rotation.x = lerp(legs[2].rotation.x, 1.1, fold);
        legs[3].rotation.x = lerp(legs[3].rotation.x, 1.1, fold);
        // rear-up: front paws lift
        if (this.special === 'rear') {
          legs[0].rotation.x = lerp(legs[0].rotation.x, -1.25 * spK, Math.min(1, dt * 5));
          legs[1].rotation.x = lerp(legs[1].rotation.x, -1.05 * spK, Math.min(1, dt * 5));
        }
      }

      // ears perk
      const perk = this.earPerk;
      for (const ear of p.ears) {
        if (ear.userData.baseRotZ == null) ear.userData.baseRotZ = ear.rotation.z;
        ear.rotation.x = lerp(ear.rotation.x, -perk * 0.3, Math.min(1, dt * 6));
      }

      // tail sway / wag
      if (p.tail) {
        const wag = this.state === 'celebrate' || this.celebT > 0 ? 6 : (this.walking ? 3 : 1.2);
        const tamp = (this.celebT > 0 ? 0.5 : 0.18) * (this.def.tailAmp || 1);
        p.tail.rotation.y = Math.sin(this.phase * wag * 0.4) * tamp;
        p.tail.rotation.x = lerp(p.tail.rotation.x, -this.sitAmt * 0.3, Math.min(1, dt * 4));
      }

      // sleeping Zzz
      const sleeping = this.state === 'sleep' && this.sitAmt > 0.7;
      this.zT += dt;
      for (const z of p.zzz) {
        const cycle = 2.4;
        const t = ((this.zT + z.userData.i * 0.8) % cycle) / cycle;
        if (sleeping) {
          z.material.opacity = Math.sin(t * Math.PI) * 0.8;
          z.position.set(
            0.35 + t * 0.3 + z.userData.i * 0.1,
            (this.parts.headY || 1.2) + 0.3 + t * 0.8,
            0.2
          );
        } else {
          z.material.opacity = Math.max(0, z.material.opacity - dt * 3);
        }
      }

      // eye blinks + closed eyes while sleeping
      this.blinkT -= dt;
      if (this.blinkT <= 0) this.blinkT = rand(2.5, 6.5);
      const closed = sleeping || this.blinkT < 0.12;
      for (const eye of p.eyes) {
        eye.scale.y = lerp(eye.scale.y, closed ? 0.12 : 1, Math.min(1, dt * 18));
        if (eye.userData.glint) eye.userData.glint.visible = !closed;
      }

      // head gentle look (groom: head tucked down, bobbing)
      if (p.head) {
        let headX;
        if (this.special === 'groom') {
          headX = (0.55 + Math.sin(this.specialT * 7) * 0.12) * spK;
        } else {
          const lookUp = this.earPerk * 0.15 + (this.sitAmt > 0.7 ? -0.1 : 0);
          headX = -lookUp;
          if (this.special === 'rear') headX = -0.35 * spK;
        }
        p.head.rotation.x = lerp(p.head.rotation.x, headX, Math.min(1, dt * 4));
      }
    }
  }

  // helpers
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  window.Critters = { Critter, BOUNDS };
})();
