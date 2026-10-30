// 헤라클레스: 3단 콤보(자동 조준) · 구르기(무적) · 스킬(독화살/딸랑이/창) · 상황 버튼(말하기/잡기…)
import * as THREE from 'three';
import { G, hitstop } from '../core/context.js';
import { Entity } from './entity.js';
import { GEO } from '../render/billboard.js';
import { Combat } from './combat.js';
import { computeStats, expToNext } from './stats.js';
import { Arrow } from './items.js';
import { damp, dampAngle, angleDiff, clamp, easeOutCubic, TAU, rand } from '../core/util.js';

// 손 위치 (몸 그림 기준, 미터): 무기 손잡이가 여기에 붙는다
const HAND = { x: 0.44, y: 0.63 };

// 3단 콤보 표 (GAME_DESIGN.md 3장)
const COMBO = [
  { dur: 0.3, active: 0.07, mult: 1.0, knock: 3, hitstop: 0.05, reach: 2.4, arc: 150, lunge: 7, a0: 1.5, a1: -1.8, sfx: 1.0 },
  { dur: 0.3, active: 0.07, mult: 1.0, knock: 3, hitstop: 0.05, reach: 2.4, arc: 150, lunge: 7, a0: -1.8, a1: 1.2, sfx: 1.15 },
  { dur: 0.46, active: 0.15, mult: 2.0, knock: 9, hitstop: 0.11, reach: 2.8, arc: 230, lunge: 10, a0: 2.6, a1: -2.2, sfx: 0.8, big: true },
];

const SKILL_ICON = { bow: 'bow', rattle: 'rattle', spear: 'spear' };
const SKILL_CD = { bow: 0.45, rattle: 4, spear: 1.6 };

export class Player extends Entity {
  constructor(o = {}) {
    const lion = G.save.has('lion');
    super({ sprite: o.sprite || (lion ? 'hercules_lion' : 'hercules'), radius: 0.45, team: 'player', mass: 2, ...o });
    this.recalc();
    this.hp = o.hp ?? this.maxHp;
    this.state = 'move';
    this.stateT = 0;
    this.comboStep = 0;
    this.attackBuffer = 0;
    this.hitDone = false;
    this.dashCd = 0;
    this.cd = {};
    this.skills = [...G.save.data.skills];
    this.skill = o.skill && this.skills.includes(o.skill) ? o.skill : this.skills[0] || null;
    this.skillsLocked = false;
    this.weaponMode = 'club';
    this.locked = false;
    this.context = null;
    this.faints = 0;
    this.calmT = 0;
    this.regenT = 0;
    this.speedMul = 1;
    this.pendingLevelUps = 0;
    this.appleUsed = false;
    this.weaponRest = 0.5;
    this.weaponAngle = 0.5;
    this.showBowT = 0;
    this.visual.addPart('weapon', 'w_club', { x: HAND.x, y: HAND.y, z: 0.04 });
    this.addXray();
    this.spearHits = new Set();
    G.player = this;
  }

  // 나무·건물 뒤에 가려지면 노란 실루엣으로 보이게
  addXray() {
    const b = this.visual.body;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: b.mat.uniforms.map, uUv: b.mat.uniforms.uUv },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform vec4 uUv; varying vec2 vUv; void main(){ vec4 c = texture2D(map, uUv.xy + vUv * uUv.zw); if (c.a < 0.45) discard; gl_FragColor = vec4(1.0, 0.86, 0.35, 0.55); }',
      transparent: true,
      depthWrite: false,
      depthFunc: THREE.GreaterDepth,
      side: THREE.DoubleSide,
    });
    this.xray = new THREE.Mesh(GEO, mat);
    this.xray.renderOrder = 30;
    this.visual.pivot.add(this.xray);
  }

  recalc() {
    this.stats = computeStats(G.save);
    const old = this.maxHp;
    this.maxHp = this.stats.maxHp;
    if (this.hp !== undefined && this.maxHp > old) this.hp += this.maxHp - old;
    this.hp = Math.min(this.hp ?? this.maxHp, this.maxHp);
  }

  refreshLook() {
    if (this.holding) return;
    this.visual.setSprite(G.save.has('lion') ? 'hercules_lion' : 'hercules');
  }

  setWeaponMode(mode) {
    this.weaponMode = mode;
    this.visual.setPartSprite('weapon', mode === 'fist' ? 'w_fist' : 'w_club');
    G.ui.hud.updateButtons();
  }

  learnSkill(id) {
    G.save.addSkill(id);
    if (!this.skills.includes(id)) this.skills.push(id);
    this.skill = id;
    G.ui.hud.updateButtons();
  }

  setSkill(id) {
    if (this.skills.includes(id)) this.skill = id;
    G.ui.hud.updateButtons();
  }

  get canAct() {
    return !this.locked && this.alive && this.state !== 'faint' && this.state !== 'grab';
  }

  update(dt) {
    super.update(dt);
    const inp = G.input;
    const st = this.stats;
    this.stateT += dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.attackBuffer > 0) this.attackBuffer -= dt;
    if (this.showBowT > 0) {
      this.showBowT -= dt;
      if (this.showBowT <= 0) this.visual.setPartSprite('weapon', this.weaponMode === 'fist' ? 'w_fist' : 'w_club');
    }
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] -= dt;
    if (this.dashBuf > 0) this.dashBuf -= dt;
    if (this.skillBuf > 0) this.skillBuf -= dt;
    const wantDash = inp.pressed.dash || this.dashBuf > 0;
    const wantSkill = inp.pressed.skill || this.skillBuf > 0;

    // 상황 버튼
    this.context = this.canAct ? this.world.findInteract(this.pos) : null;

    if (this.canAct) {
      if (inp.pressed.attack) {
        if (this.context) {
          const c = this.context;
          inp.pressed.attack = false;
          G.audio.play('confirm');
          c.action(c);
        } else this.attackBuffer = 0.28;
      }
      if (inp.pressed.swap && this.skills.length > 1) {
        const i = this.skills.indexOf(this.skill);
        this.skill = this.skills[(i + 1) % this.skills.length];
        G.audio.play('select');
        G.ui.hud.updateButtons(true);
      }
    }

    // 이동 입력 → 월드 방향
    let mx = 0, mz = 0, mag = 0;
    if (this.canAct) {
      const f = G.rig.forward, r = G.rig.right;
      mx = r.x * inp.move.x + f.x * inp.move.y;
      mz = r.z * inp.move.x + f.z * inp.move.y;
      mag = Math.min(1, Math.hypot(mx, mz));
      if (mag > 0) { mx /= mag; mz /= mag; }
    }
    const speed = st.speed * this.speedMul * (mag > 0 ? Math.max(0.45, mag) : 0);

    switch (this.state) {
      case 'move': {
        this.vel.x = damp(this.vel.x, mx * speed, 16, dt);
        this.vel.z = damp(this.vel.z, mz * speed, 16, dt);
        if (mag > 0.05) {
          this.dirAngle = dampAngle(this.dirAngle, Math.atan2(mz, mx), 18, dt);
          this.updateFlip(mx, mz);
        }
        if (this.canAct) {
          if (this.attackBuffer > 0) this.startAttack(0);
          else if (wantDash) this.startDash(mx, mz, mag);
          else if (wantSkill) this.useSkill();
        }
        break;
      }
      case 'attack': {
        const c = COMBO[this.comboStep];
        const lungeT = 0.09;
        if (this.stateT < lungeT) {
          const d = this.dir;
          this.vel.x = d.x * c.lunge;
          this.vel.z = d.z * c.lunge;
        } else {
          this.vel.x = damp(this.vel.x, mx * speed * 0.15, 20, dt);
          this.vel.z = damp(this.vel.z, mz * speed * 0.15, 20, dt);
        }
        if (!this.hitDone && this.stateT >= c.active) this.doHit();
        const cancelOk = this.hitDone && this.stateT >= c.active + 0.06;
        if (cancelOk && this.canAct) {
          if (this.attackBuffer > 0 && this.comboStep < 2) { this.startAttack(this.comboStep + 1); break; }
          if (wantDash) { this.startDash(mx, mz, mag); break; }
          if (wantSkill) { this.useSkill(); break; }
        }
        if (this.stateT >= c.dur) {
          if (this.attackBuffer > 0 && this.comboStep < 2) this.startAttack(this.comboStep + 1);
          else if (this.attackBuffer > 0 && this.comboStep === 2) this.startAttack(0);
          else this.state = 'move';
        }
        break;
      }
      case 'dash': {
        if (this.stateT >= st.dashTime) {
          this.state = 'move';
          this.vel.multiplyScalar(0.35);
        } else if (Math.random() < 0.6) {
          G.fx.dust(this.pos, { count: 1, size: 0.7, speed: 1 });
          if (G.save.has('deer')) G.fx.sparkle(this.pos, { color: 0xffe86a, size: 0.4, h: 0.6 });
        }
        break;
      }
      case 'spear': {
        const d = this.dir;
        const sp = this.stateT < 0.26 ? 19 : 0;
        this.vel.x = d.x * sp;
        this.vel.z = d.z * sp;
        if (this.stateT < 0.3) {
          for (const e of Combat.inRadius(this.pos, 1.5, { includeProps: true })) {
            if (this.spearHits.has(e)) continue;
            this.spearHits.add(e);
            Combat.hitEnemy(e, { amount: st.atk * 2.6, from: this.pos, knock: 10, big: true, canCrit: true, type: 'spear', stunBonus: 2.2, hitstop: 0.09 });
          }
          if (Math.random() < 0.7) G.fx.particle({ x: this.pos.x, y: 1, z: this.pos.z, size: 0.8, life: 0.3, color: 0xfff6c8, tile: 'glow', additive: true });
        }
        if (this.stateT >= 0.42) {
          this.state = 'move';
          this.visual.setPartSprite('weapon', this.weaponMode === 'fist' ? 'w_fist' : 'w_club');
        }
        break;
      }
      case 'hurt': {
        this.vel.x = damp(this.vel.x, 0, 10, dt);
        this.vel.z = damp(this.vel.z, 0, 10, dt);
        if (this.stateT > 0.25) this.state = 'move';
        break;
      }
      case 'faint':
      case 'grab':
      case 'locked':
      default:
        this.vel.x = damp(this.vel.x, 0, 12, dt);
        this.vel.z = damp(this.vel.z, 0, 12, dt);
        break;
    }
    if (this.locked && this.state === 'move') {
      this.vel.x = damp(this.vel.x, 0, 12, dt);
      this.vel.z = damp(this.vel.z, 0, 12, dt);
    }
    if (this.autoWalk) this.applyAutoWalk(dt);

    // 회복
    this.calmT += dt;
    if (this.calmT > 6 && this.hp < this.maxHp && this.alive && this.state !== 'faint') {
      this.regenT += dt;
      if (this.regenT > 1.6) {
        this.regenT = 0;
        this.heal(0.5, true);
      }
    }
  }

  // 컷신용 자동 걷기
  walkTo(x, z, speed = 5) {
    return new Promise((res) => {
      this.autoWalk = { x, z, speed, res };
    });
  }

  applyAutoWalk(dt) {
    const w = this.autoWalk;
    const dx = w.x - this.pos.x, dz = w.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) {
      this.vel.set(0, 0, 0);
      this.autoWalk = null;
      w.res();
      return;
    }
    this.vel.x = (dx / d) * w.speed;
    this.vel.z = (dz / d) * w.speed;
    this.dirAngle = Math.atan2(dz, dx);
    this.updateFlip(dx, dz);
  }

  startAttack(step) {
    const c = COMBO[step];
    this.state = 'attack';
    this.stateT = 0;
    this.comboStep = step;
    this.hitDone = false;
    this.attackBuffer = 0;
    // 자동 조준
    const t = this.world.nearest(this.pos, { maxDist: 4.6, filter: (e) => e.hittable && !e.flying && e.y < 1.5 });
    const prop = t ? null : this.world.nearest(this.pos, { maxDist: 3.2, team: 'prop', filter: (e) => e.hittable });
    const target = t || prop;
    if (target) {
      const a = Math.atan2(target.pos.z - this.pos.z, target.pos.x - this.pos.x);
      const near = this.distTo(target) < 2.6 + target.radius;
      const mvA = Math.hypot(G.input.move.x, G.input.move.y) > 0.3;
      if (near || !mvA || Math.abs(angleDiff(this.dirAngle, a)) < 1.2) {
        this.dirAngle = a;
        this.updateFlip(Math.cos(a), Math.sin(a));
      }
    }
    this.weaponAngle = c.a0;
    G.audio.play('swing', { pitch: c.sfx });
  }

  doHit() {
    this.hitDone = true;
    const c = COMBO[this.comboStep];
    const fist = this.weaponMode === 'fist';
    const reach = c.reach * (fist ? 0.8 : 1);
    const d = this.dir;
    let hits = 0;
    for (const e of this.world.entities) {
      if (!e.alive || e.removed || !e.hittable) continue;
      if (e.team !== 'enemy' && e.team !== 'prop') continue;
      if (e.y > 2.2 || (e.flying && e.y > 1.6)) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach + e.radius) continue;
      const ang = Math.abs(angleDiff(this.dirAngle, Math.atan2(dz, dx)));
      if (dist > e.radius + 0.6 && ang > (c.arc * Math.PI) / 360) continue;
      const r = Combat.hitEnemy(e, { amount: this.stats.atk * c.mult, from: this.pos, knock: c.knock, big: !!c.big, canCrit: true, type: 'melee', hitstop: c.hitstop, launch: c.big ? 6 : 0, combo: this.comboStep });
      if (r) hits++;
    }
    // 휘두르기 궤적
    G.fx.slash(this.pos, this.dirAngle, { radius: reach * 0.85, flipX: this.comboStep === 1, color: c.big ? 0xfff0a0 : 0xffffff, y: 0.9 });
    if (c.big) {
      const fp = { x: this.pos.x + d.x * 1.4, z: this.pos.z + d.z * 1.4 };
      G.fx.ring(fp, { r0: 0.4, r1: 3.2, life: 0.35, color: 0xfff6c8 });
      G.fx.dust(fp, { count: 8, speed: 4, size: 1.1 });
      G.rig.shake(hits ? 0.1 : 0.18);
      if (!hits) G.audio.play('stomp');
    }
    if (hits) this.calmT = 0;
  }

  // 히트스톱 중에 누른 버튼도 기억 (멈춘 순간에 눌러도 이어지게)
  bufferInputs() {
    const p = G.input.pressed;
    if (p.attack && !this.context) this.attackBuffer = 0.28;
    if (p.dash) this.dashBuf = 0.2;
    if (p.skill) this.skillBuf = 0.2;
  }

  startDash(mx, mz, mag) {
    this.dashBuf = 0;
    if (this.dashCd > 0) return;
    let dx = mx, dz = mz;
    if (mag < 0.1) {
      const d = this.dir;
      dx = d.x;
      dz = d.z;
    }
    this.dirAngle = Math.atan2(dz, dx);
    this.updateFlip(dx, dz);
    this.state = 'dash';
    this.stateT = 0;
    this.attackBuffer = 0;
    const sp = this.stats.dashSpeed;
    this.vel.set(dx * sp, 0, dz * sp);
    this.invuln = Math.max(this.invuln, this.stats.dashTime + 0.08);
    this.dashCd = this.stats.dashTime + 0.18;
    G.audio.play('dash');
    G.fx.dust(this.pos, { count: 5, size: 0.9 });
  }

  useSkill() {
    this.skillBuf = 0;
    const s = this.skill;
    if (!s || this.skillsLocked) {
      if (this.skillsLocked) G.fx.text(this.pos, '맨손으로!', { color: '#ffe86a', size: 0.8, cls: 'word' });
      return;
    }
    if ((this.cd[s] || 0) > 0) return;
    this.cd[s] = SKILL_CD[s];
    this.calmT = 0;
    if (s === 'bow') {
      const target = this.world.nearest(this.pos, { maxDist: 18, filter: (e) => e.hittable && !e.hidden });
      let dx, dz;
      if (target) {
        dx = target.pos.x - this.pos.x;
        dz = target.pos.z - this.pos.z;
        this.dirAngle = Math.atan2(dz, dx);
        this.updateFlip(dx, dz);
      } else {
        const d = this.dir;
        dx = d.x;
        dz = d.z;
      }
      this.world.add(new Arrow({ x: this.pos.x, z: this.pos.z, dirX: dx, dirZ: dz, target, damage: this.stats.atk * 0.9 }));
      this.visual.setPartSprite('weapon', 'w_bow');
      this.showBowT = 0.3;
      this.weaponAngle = -1.3;
      this.squash(0.12, 0.12);
      G.audio.play('arrow');
    } else if (s === 'rattle') {
      G.audio.play('rattle');
      G.fx.ring(this.pos, { r0: 0.5, r1: 7.5, life: 0.5, color: 0xffd27a });
      G.fx.ring(this.pos, { r0: 0.3, r1: 5, life: 0.4, color: 0xffffff });
      G.rig.shake(0.2);
      this.visual.setPartSprite('weapon', 'w_rattle');
      this.showBowT = 0.6;
      for (const e of this.world.entities) {
        if (!e.alive || e.team !== 'enemy') continue;
        if (this.distTo(e) > 7.5 + e.radius) continue;
        if (e.onRattle) e.onRattle();
        else e.stun?.(2.5);
      }
      this.world.stage?.onRattle?.(this.pos);
    } else if (s === 'spear') {
      const target = this.world.nearest(this.pos, { maxDist: 7, filter: (e) => e.hittable && !e.flying });
      if (target) this.faceToward(target.pos.x, target.pos.z);
      this.state = 'spear';
      this.stateT = 0;
      this.spearHits.clear();
      this.visual.setPartSprite('weapon', 'w_spear');
      this.invuln = Math.max(this.invuln, 0.3);
      G.audio.play('whoosh');
      G.audio.play('dash');
    }
    G.ui.hud.updateButtons();
  }

  hurt(amount, from, { knock = 7, ignoreInvuln = false } = {}) {
    if (!this.alive || this.state === 'faint' || G.debug.god) return false;
    if (!ignoreInvuln && (this.invuln > 0 || this.state === 'dash')) return false;
    if (this.locked && !ignoreInvuln) return false;
    amount *= 1 - this.stats.defense;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = 1.0;
    this.calmT = 0;
    this.flash(0.15, 0xff5a5a);
    this.squash(0.2, 0.3);
    if (from) {
      let dx = this.pos.x - from.x, dz = this.pos.z - from.z;
      const l = Math.hypot(dx, dz) || 1;
      this.push(dx / l, dz / l, knock);
    }
    if (this.state !== 'grab') {
      this.state = 'hurt';
      this.stateT = 0;
    }
    hitstop(0.08);
    G.rig.shake(0.45);
    G.audio.play('hurt');
    G.input.vibrate(40);
    G.ui.hud.hurtFlash();
    G.ui.hud.updateHearts();
    G.fx.burst(this.pos, { count: 6, color: 0xff7a7a, tile: 'heart', size: 0.4, speed: 4, life: 0.6, additive: false });
    if (this.hp <= 0) this.faint();
    else if (this.hp <= 3 && this.stats.apple && !this.appleUsed) this.eatApple();
    return true;
  }

  eatApple() {
    this.appleUsed = true;
    this.heal(this.maxHp);
    G.fx.text(this.pos, '황금사과!', { color: '#ffd84a', size: 1.2, cls: 'word' });
    G.audio.jingle('reward');
    G.fx.burst(this.pos, { count: 16, color: 0xffd84a, tile: 'star', speed: 5 });
  }

  heal(n, quiet = false) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (this.hp > before) {
      G.ui.hud.updateHearts();
      if (!quiet) {
        G.audio.play('heart');
        G.fx.burst(this.pos, { count: 5, color: 0xff6a8a, tile: 'heart', size: 0.45, speed: 2.5, gravity: -2, life: 0.8, additive: false });
      }
    }
  }

  faint() {
    this.state = 'faint';
    this.stateT = 0;
    this.faints++;
    this.vel.set(0, 0, 0);
    G.audio.jingle('fail');
    G.ui.hud.toast('앗! 잠깐 쉬자… 다시 일어나!', 2.0);
    this.visual.roll = 0;
    setTimeout(() => this.respawn(), 1600);
  }

  respawn() {
    if (!this.alive) return;
    const cp = this.world.stage?.checkpoint || { x: 0, z: 0 };
    this.pos.set(cp.x, 0, cp.z);
    this.lastSafe = { x: cp.x, z: cp.z };
    this.hp = this.maxHp;
    this.invuln = 2.2;
    this.state = 'move';
    this.knock.set(0, 0, 0);
    G.rig.snap();
    G.ui.hud.updateHearts();
    G.fx.starPop(this.pos, 0.8);
    G.audio.play('magic');
  }

  gainExp(n) {
    const d = G.save.data;
    d.exp += n;
    let leveled = false;
    while (d.exp >= expToNext(d.level)) {
      d.exp -= expToNext(d.level);
      d.level++;
      this.pendingLevelUps++;
      leveled = true;
    }
    if (leveled) this.recalc();
    G.ui.hud.updateExp();
  }

  gainCoins(n) {
    G.save.data.coins += n;
    G.ui.hud.updateCoins();
  }

  // 그림 애니메이션 (종이 인형)
  animate(dt, v) {
    const c = COMBO[this.comboStep];
    let roll = 0, lift = 0;
    const moving = Math.hypot(this.vel.x, this.vel.z) > 0.6;
    let target = this.weaponRest;
    switch (this.state) {
      case 'move':
        if (moving) {
          lift = Math.abs(Math.sin(this.time * 13)) * 0.14;
          roll = Math.sin(this.time * 13) * 0.06;
          target = 0.35 + Math.sin(this.time * 13) * 0.15;
        } else {
          lift = Math.sin(this.time * 2.5) * 0.02 + 0.02;
          v.sy *= 1 + Math.sin(this.time * 2.5) * 0.015;
        }
        this.weaponAngle = damp(this.weaponAngle, target, 14, dt);
        break;
      case 'attack': {
        const k = clamp(this.stateT / c.active, 0, 1);
        if (this.comboStep === 2) {
          // 크게 들어 올렸다가 내려찍기
          const up = clamp(this.stateT / (c.active * 0.75), 0, 1);
          this.weaponAngle = this.stateT < c.active * 0.75 ? 0.5 + (c.a0 - 0.5) * easeOutCubic(up) : c.a0 + (c.a1 - c.a0) * easeOutCubic(clamp((this.stateT - c.active * 0.75) / (c.active * 0.3), 0, 1));
          lift = this.stateT < c.active ? Math.sin(k * Math.PI * 0.5) * 0.35 : 0;
          roll = this.stateT < c.active ? 0.15 : -0.22;
        } else {
          this.weaponAngle = c.a0 + (c.a1 - c.a0) * easeOutCubic(k);
          roll = -0.15 * Math.sin(k * Math.PI);
        }
        if (this.hitDone && this.stateT < c.active + 0.05) {
          v.sx *= 1.12;
          v.sy *= 0.9;
        }
        break;
      }
      case 'dash':
        roll = -(this.stateT / this.stats.dashTime) * TAU;
        lift = Math.sin((this.stateT / this.stats.dashTime) * Math.PI) * 0.3;
        v.sx *= 0.9;
        v.sy *= 0.85;
        break;
      case 'spear':
        this.weaponAngle = -Math.PI / 2;
        roll = -0.2;
        break;
      case 'hurt':
        roll = 0.25;
        break;
      case 'faint':
        roll = damp(v.roll, Math.PI / 2, 8, dt);
        break;
      case 'grab':
        roll = Math.sin(this.time * 30) * 0.08;
        v.sx *= 1.1;
        v.sy *= 0.92;
        break;
    }
    if (this.state !== 'faint') v.roll = roll;
    else v.roll = roll;
    v.lift = lift;
    const w = v.parts.weapon;
    if (w) {
      if (w.id === 'w_bow') {
        // 활은 가운데 손잡이를 쥐고 똑바로 세워 앞으로 내밈
        w.mesh.position.set(HAND.x + 0.12, HAND.y + 0.15 - w.h * 0.5, 0.04);
        w.mesh.rotation.z = 0;
      } else {
        w.mesh.position.set(HAND.x, HAND.y, 0.04);
        w.mesh.rotation.z = this.weaponAngle;
      }
      w.mesh.visible = this.state !== 'faint' && !this.holding;
    }
    if (this.xray) this.xray.scale.copy(v.body.mesh.scale);
    // 무적 깜빡임
    v.group.visible = !(this.invuln > 0 && this.state !== 'dash' && this.state !== 'spear' && Math.floor(this.invuln * 16) % 2 === 0 && this.invuln < 1.9);
  }
}

