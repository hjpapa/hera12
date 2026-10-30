// 투사체 · 줍는 것 · 깨지는 항아리 · 바닥 위험 지대
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Entity } from './entity.js';
import { Combat } from './combat.js';
import { toon } from '../render/props.js';
import { rand, randInt, chance, TAU } from '../core/util.js';

// ───────── 플레이어 화살 (히드라 독화살, 살짝 유도) ─────────
const ARROW_GEO = (() => {
  const shaft = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5).rotateZ(Math.PI / 2);
  return shaft;
})();
const TIP_GEO = new THREE.ConeGeometry(0.1, 0.28, 5).rotateZ(-Math.PI / 2).translate(0.62, 0, 0);

export class Arrow extends Entity {
  constructor(o) {
    super({ x: o.x, z: o.z, radius: 0.2, team: 'neutral', solid: false, hittable: false, shadow: true, shadowSize: 0.5 });
    const l = Math.hypot(o.dirX, o.dirZ) || 1;
    this.dx = o.dirX / l;
    this.dz = o.dirZ / l;
    this.speed = o.speed ?? 24;
    this.target = o.target;
    this.damage = o.damage;
    this.life = 0.9;
    this.y = 1.1;
    this.flying = true;
    this.grp = new THREE.Group();
    this.grp.add(new THREE.Mesh(ARROW_GEO, toon(0xc9a86a)));
    this.grp.add(new THREE.Mesh(TIP_GEO, toon(0x6ad44a, { emissive: 0x1a5a10 })));
    this.pierce = o.pierce ?? false;
    this.hit = new Set();
  }

  onAdd() {
    this.world.root.add(this.grp);
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return this.world.remove(this);
    const t = this.target;
    if (t && t.alive && !t.removed) {
      // 부드러운 유도 (아이들도 맞히게)
      const tx = t.pos.x - this.pos.x, tz = t.pos.z - this.pos.z;
      const tl = Math.hypot(tx, tz) || 1;
      const k = Math.min(1, dt * 9);
      this.dx += (tx / tl - this.dx) * k;
      this.dz += (tz / tl - this.dz) * k;
      const l = Math.hypot(this.dx, this.dz) || 1;
      this.dx /= l; this.dz /= l;
      const ty = t.y + t.height * 0.5;
      this.y += (ty - this.y) * Math.min(1, dt * 6);
    }
    this.pos.x += this.dx * this.speed * dt;
    this.pos.z += this.dz * this.speed * dt;
    if (Math.random() < 0.5) G.fx.particle({ x: this.pos.x, y: this.y, z: this.pos.z, size: 0.25, life: 0.25, color: 0x8af06a, tile: 'glow', additive: true });
    for (const e of this.world.entities) {
      if (!e.alive || e.removed || !e.hittable || this.hit.has(e)) continue;
      if (e.team !== 'enemy' && e.team !== 'prop') continue;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      const yOk = Math.abs((e.y + e.height * 0.5) - this.y) < Math.max(1.2, e.height * 0.6);
      if (d < e.radius + 0.35 && yOk) {
        this.hit.add(e);
        Combat.hitEnemy(e, { amount: this.damage, from: this.pos, knock: 2.5, type: 'arrow', canCrit: true, hitstop: 0.04, poison: { dps: this.damage * 0.12, time: 3 } });
        if (!this.pierce) return this.world.remove(this);
      }
    }
  }

  syncVisual() {
    this.grp.position.set(this.pos.x, this.y, this.pos.z);
    this.grp.rotation.y = Math.atan2(-this.dz, this.dx);
    if (this.shadow) {
      this.shadow.position.set(this.pos.x, 0.04, this.pos.z);
    }
  }

  dispose() {
    super.dispose();
    this.grp.removeFromParent();
  }
}

// ───────── 적 투사체 (깃털, 창, 독침, 불덩이, 바위…) ─────────
const SHOT_LOOKS = {
  feather: () => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), toon(0xd8a04a, { emissive: 0x3a2000 })); m.scale.set(1.6, 0.4, 0.6); return m; },
  javelin: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5).rotateZ(Math.PI / 2), toon(0x8a5a2b))); g.add(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 5).rotateZ(-Math.PI / 2).translate(1.0, 0, 0), toon(0xcfd6dd))); return g; },
  fire: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshBasicMaterial({ color: 0xffa040 })),
  ice: () => new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshBasicMaterial({ color: 0xbfefff })),
  poison: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: 0x8af06a })),
  rock: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), toon(0x9a9488)),
  water: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshBasicMaterial({ color: 0x9fd8ff })),
};
// 투사체 모양은 종류마다 한 번만 만들고 복제해서 씀 (휴대폰에서 메모리·GC 절약)
const SHOT_PROTO = {};
function shotMesh(kind) {
  if (!SHOT_PROTO[kind]) {
    const m = SHOT_LOOKS[kind]();
    m.traverse((o) => {
      if (o.geometry) o.geometry.userData.shared = true;
      if (o.material) o.material.userData.shared = true;
    });
    SHOT_PROTO[kind] = m;
  }
  return SHOT_PROTO[kind].clone();
}
const SHOT_COLORS = { feather: 0xffd27a, javelin: 0xffffff, fire: 0xff8a2a, ice: 0xbfefff, poison: 0x8af06a, rock: 0xc8bca8, water: 0x9fd8ff };

export class Shot extends Entity {
  constructor(o) {
    super({ x: o.x, z: o.z, radius: o.radius ?? 0.45, team: 'neutral', solid: false, hittable: false, shadowSize: 0.8 });
    this.kind = o.kind || 'feather';
    const l = Math.hypot(o.dirX, o.dirZ) || 1;
    this.dx = o.dirX / l;
    this.dz = o.dirZ / l;
    this.speed = o.speed ?? 11;
    this.damage = o.damage ?? 1;
    this.life = o.life ?? 2.2;
    this.y = o.y ?? 1.2;
    this.flying = true;
    this.noClip = true;
    this.lob = o.lob; // { tx, tz, time, onLand }
    if (this.lob) {
      this.lobT = 0;
      this.sx = o.x; this.sz = o.z;
    }
    this.mesh = shotMesh(this.kind);
    this.spin = this.kind === 'rock' || this.kind === 'ice';
  }

  onAdd() {
    this.world.root.add(this.mesh);
  }

  update(dt) {
    this.time += dt;
    if (this.lob) {
      const L = this.lob;
      this.lobT += dt;
      const k = Math.min(1, this.lobT / L.time);
      this.pos.x = this.sx + (L.tx - this.sx) * k;
      this.pos.z = this.sz + (L.tz - this.sz) * k;
      this.y = 1.5 + Math.sin(k * Math.PI) * (L.height ?? 5) - k * 1.5;
      if (k >= 1) {
        L.onLand?.(this.pos.x, this.pos.z);
        G.fx.burst({ x: this.pos.x, y: 0, z: this.pos.z }, { count: 10, color: SHOT_COLORS[this.kind], tile: 'dust', size: 0.7, speed: 4, additive: false, yOff: 0.2 });
        return this.world.remove(this);
      }
      return;
    }
    this.life -= dt;
    if (this.life <= 0) return this.world.remove(this);
    this.pos.x += this.dx * this.speed * dt;
    this.pos.z += this.dz * this.speed * dt;
    this.y += (1.2 - this.y) * Math.min(1, dt * 3);
    if (this.kind === 'fire' || this.kind === 'poison' || this.kind === 'ice') {
      if (Math.random() < 0.7) G.fx.particle({ x: this.pos.x + rand(-0.2, 0.2), y: this.y, z: this.pos.z + rand(-0.2, 0.2), size: 0.7, sizeEnd: 0.1, life: 0.35, color: SHOT_COLORS[this.kind], tile: 'glow', additive: true, vy: 0.5 });
    }
    if (!this.world.walkable(this.pos.x, this.pos.z, -6)) return this.world.remove(this);
    const p = G.player;
    if (p && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius + p.radius * 0.7 && p.y < 2) {
      if (Combat.hurtPlayer(this.damage, this.pos, { knock: 5 })) {
        G.fx.hitSpark({ x: this.pos.x, y: this.y, z: this.pos.z }, false);
        return this.world.remove(this);
      }
    }
  }

  syncVisual() {
    this.mesh.position.set(this.pos.x, this.y, this.pos.z);
    if (this.spin) this.mesh.rotation.set(this.time * 6, this.time * 4, 0);
    else this.mesh.rotation.y = Math.atan2(-this.dz, this.dx);
    if (this.shadow) {
      this.shadow.position.set(this.pos.x, 0.04, this.pos.z);
    }
  }

  dispose() {
    super.dispose();
    this.mesh.removeFromParent();
    this.mesh.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); if (o.material && !o.material.userData.shared) o.material.dispose(); });
  }
}

// ───────── 줍는 것: 경험치 구슬 · 동전 · 하트 ─────────
const PICK_MATS = {};
function pickMat(kind) {
  if (!PICK_MATS[kind]) {
    const tex = kind === 'exp' ? null : G.sprites.texture(kind === 'coin' ? 'icon_coin' : 'icon_heart');
    const m = new THREE.SpriteMaterial(kind === 'exp' ? { color: 0x7ad8ff, depthWrite: false } : { map: tex, depthWrite: false });
    if (kind === 'exp') {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(160,230,255,1)');
      g.addColorStop(1, 'rgba(60,160,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      m.map = new THREE.CanvasTexture(c);
      m.color.set(0xffffff);
      m.blending = THREE.AdditiveBlending;
    }
    PICK_MATS[kind] = m;
  }
  return PICK_MATS[kind];
}

let pickupChain = 0, pickupChainT = 0;

export class Pickup extends Entity {
  constructor(o) {
    super({ x: o.x, z: o.z, radius: 0.3, team: 'neutral', solid: false, hittable: false, shadowSize: 0.5 });
    this.kind = o.kind; // 'exp' | 'coin' | 'heart'
    this.value = o.value ?? 1;
    this.sprite3 = new THREE.Sprite(pickMat(this.kind));
    const s = this.kind === 'exp' ? 0.55 : this.kind === 'heart' ? 0.7 : 0.6;
    this.sprite3.scale.setScalar(s);
    const a = rand(0, TAU), sp = rand(1.5, 4);
    this.vel.set(Math.cos(a) * sp, 0, Math.sin(a) * sp);
    this.vy = rand(5, 8);
    this.y = 0.6;
    this.delay = 0.45;
    this.life = 14;
    this.gravity = 22;
    this.noClip = false;
  }

  onAdd() {
    this.world.root.add(this.sprite3);
  }

  onLand(v) {
    if (v < -3) this.vy = -v * 0.4;
  }

  update(dt) {
    this.time += dt;
    this.life -= dt;
    if (this.life <= 0) return this.world.remove(this);
    this.delay -= dt;
    const p = G.player;
    this.vel.multiplyScalar(Math.exp(-3 * dt));
    if (p && p.alive && this.delay <= 0) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const range = this.kind === 'exp' ? 9 : 5;
      if (d < range) {
        const sp = 6 + (range - d) * 3;
        this.vel.x = (dx / d) * sp;
        this.vel.z = (dz / d) * sp;
        this.y += (1.0 - this.y) * Math.min(1, dt * 6);
      }
      if (d < 0.7) return this.collect(p);
    }
    this.physics(dt);
  }

  collect(p) {
    pickupChain = G.realTime - pickupChainT < 0.6 ? pickupChain + 1 : 0;
    pickupChainT = G.realTime;
    const pitch = 1 + Math.min(pickupChain, 14) * 0.06;
    if (this.kind === 'exp') {
      p.gainExp(this.value);
      G.audio.play('exp', { pitch });
    } else if (this.kind === 'coin') {
      p.gainCoins(this.value);
      G.audio.play('coin', { pitch });
    } else if (this.kind === 'heart') {
      p.heal(this.value);
    }
    G.fx.particle({ x: this.pos.x, y: this.y, z: this.pos.z, size: 1.2, life: 0.18, color: this.kind === 'exp' ? 0x7ad8ff : this.kind === 'coin' ? 0xffd84a : 0xff6a8a, tile: 'glow', additive: true });
    this.world.remove(this);
  }

  syncVisual() {
    const bounce = this.delay <= 0 && this.y < 0.05 ? Math.abs(Math.sin(this.time * 4)) * 0.15 : 0;
    this.sprite3.position.set(this.pos.x, this.y + 0.35 + bounce, this.pos.z);
    if (this.life < 3) this.sprite3.visible = Math.floor(this.life * 8) % 2 === 0;
    if (this.shadow) {
      this.shadow.position.set(this.pos.x, 0.04, this.pos.z);
    }
  }

  dispose() {
    super.dispose();
    this.sprite3.removeFromParent();
  }
}

export function dropLoot(world, x, z, { exp = 0, coins = 0, heartChance = 0 } = {}) {
  // 구슬 수는 적당히 묶어서 (많이 보이되 너무 많지 않게)
  let left = exp;
  while (left > 0) {
    const v = Math.min(left, left > 30 ? 6 : left > 10 ? 3 : 1);
    world.add(new Pickup({ x, z, kind: 'exp', value: v }));
    left -= v;
  }
  for (let i = 0; i < coins; i++) world.add(new Pickup({ x, z, kind: 'coin', value: 1 }));
  const p = G.player;
  if (heartChance && p && p.hp < p.maxHp && chance(heartChance)) world.add(new Pickup({ x, z, kind: 'heart', value: 2 }));
}

// ───────── 깨지는 항아리 (황금 항아리 = 숨은 보물) ─────────
export class Pot extends Entity {
  constructor(o) {
    super({ x: o.x, z: o.z, sprite: o.gold ? 'amphora_gold' : 'amphora', radius: o.gold ? 0.55 : 0.45, team: 'prop', hp: 1, anchored: true, mass: 50 });
    this.gold = o.gold;
    this.onBreak = o.onBreak;
    this.face = chance(0.5) ? 1 : -1;
  }

  takeDamage(n) {
    this.hp = 0;
    return n;
  }

  die() {
    this.alive = false;
    G.audio.play('pot');
    G.fx.burst(this.pos, { count: 12, color: this.gold ? [0xffd84a, 0xfff6c8] : [0xd9774b, 0x3a2618, 0xe89a6a], tile: 'leaf', size: 0.45, speed: 6, gravity: 18, life: 0.8, additive: false, floor: 0.05, yOff: 0.5 });
    if (this.gold) {
      G.fx.starPop(this.pos, 1);
      G.audio.jingle('star');
      dropLoot(this.world, this.pos.x, this.pos.z, { coins: 10, exp: 10 });
    } else {
      const r = Math.random();
      if (r < 0.55) dropLoot(this.world, this.pos.x, this.pos.z, { coins: randInt(1, 3) });
      else if (r < 0.85) dropLoot(this.world, this.pos.x, this.pos.z, { heartChance: 1, coins: 1 });
    }
    this.onBreak?.(this);
    this.world.remove(this);
  }

  animate(dt, v) {
    if (this.gold) {
      v.lift = Math.abs(Math.sin(this.time * 2)) * 0.08;
      if (Math.random() < dt * 4) G.fx.sparkle(this.pos, { h: 0.8, size: 0.3 });
    }
  }
}

// ───────── 깨지는 바위 등 (여러 번 때려야 함) ─────────
export class Breakable extends Entity {
  constructor(o) {
    super({ x: o.x, z: o.z, sprite: o.sprite || 'boulder', scale: o.scale || 1, radius: o.radius ?? 1, team: 'prop', hp: o.hits ?? 3, anchored: true, mass: 100 });
    this.onBreak = o.onBreak;
    this.onHitFn = o.onHit;
    this.hits = 0;
  }

  takeDamage() {
    this.hits++;
    this.hp -= 1;
    this.flash(0.1);
    this.squash(0.15, 0.15);
    this.onHitFn?.(this);
    G.audio.play('rock');
    G.fx.dust(this.pos, { count: 5, color: 0xc8bca8, size: 0.8 });
    return 1;
  }

  die() {
    this.alive = false;
    G.audio.play('rock');
    G.rig.shake(0.3);
    G.fx.burst(this.pos, { count: 14, color: [0x9a9488, 0xc8bca8, 0x7a746a], tile: 'leaf', size: 0.6, speed: 7, gravity: 20, life: 0.9, additive: false, floor: 0.05 });
    G.fx.dust(this.pos, { count: 10, size: 1.4, speed: 4 });
    this.onBreak?.(this);
    this.world.remove(this);
  }
}

// ───────── 바닥 위험 지대 (독 웅덩이, 불) ─────────
export class Hazard extends Entity {
  constructor(o) {
    super({ x: o.x, z: o.z, radius: o.radius ?? 1.5, team: 'neutral', solid: false, hittable: false, shadow: false });
    this.life = o.life ?? 5;
    this.damage = o.damage ?? 1;
    this.color = o.color ?? 0x8af06a;
    this.tick = 0;
    const mat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.55, depthWrite: false });
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(this.radius, 24).rotateX(-Math.PI / 2), mat);
    this.disc.renderOrder = 3;
  }

  onAdd() {
    this.world.root.add(this.disc);
    this.disc.position.set(this.pos.x, 0.06, this.pos.z);
  }

  update(dt) {
    this.life -= dt;
    this.time += dt;
    if (this.life <= 0) return this.world.remove(this);
    this.disc.material.opacity = Math.min(0.55, this.life * 0.5) * (0.85 + Math.sin(this.time * 8) * 0.15);
    if (Math.random() < dt * 8) G.fx.particle({ x: this.pos.x + rand(-1, 1) * this.radius * 0.7, y: 0.1, z: this.pos.z + rand(-1, 1) * this.radius * 0.7, vy: 1.2, size: 0.4, life: 0.6, color: this.color, tile: 'glow', additive: true });
    this.tick -= dt;
    if (this.tick <= 0) {
      if (Combat.hitPlayerIfIn(this.pos, this.radius * 0.85, this.damage, { knock: 2 })) this.tick = 0.8;
    }
  }

  syncVisual() {}

  dispose() {
    super.dispose();
    this.disc.removeFromParent();
    this.disc.geometry.dispose();
    this.disc.material.dispose();
  }
}
