// 적: 설정만 바꿔서 여러 종류를 만든다 (melee · hopper · charger · flyer · shooter · dummy).
// 모든 공격은 미리 예고(빨간 원/선/"!")를 보여 준다.
// Boss 는 async 패턴(brain)으로 움직이고, 각 과업 파일에서 상속해 만든다.
import { G } from '../core/context.js';
import { Entity } from './entity.js';
import { Combat } from './combat.js';
import { Shot, dropLoot } from './items.js';
import { wait, until } from '../core/script.js';
import { rand, randInt, clamp, damp, dampAngle, TAU, pick } from '../core/util.js';

// ───────── 공격 차례 ─────────
// 여러 마리가 한꺼번에 덤비면 빨간 예고가 겹쳐서 아이가 보고 피하기 어렵다.
// 동시에 공격하는 일반 적은 최대 2마리(보스전·도움 모드에서는 1마리), 공격을 시작하는 사이에는 조금씩 간격을 둔다.
// 차례를 못 받은 적은 조금 떨어져서 플레이어 둘레를 돌며 기다린다.
const TURN_GAP = 0.45;
let lastTurn = -99;

function attackSlots() {
  return G.assist || G.ui.hud.boss ? 1 : 2;
}

export class Enemy extends Entity {
  constructor(o) {
    super({ team: 'enemy', ...o });
    this.cfg = {
      ai: 'melee', speed: 3, aggro: 11, range: 1.9, windup: 0.6, cd: [1.2, 2.2], damage: 1,
      lunge: 10, lungeTime: 0.18, exp: 5, coins: [0, 2], heartChance: 0.15, flyHeight: 2.6,
      shot: 'feather', shotSpeed: 11, keepDist: 7, chargeSpeed: 15, chargeTime: 0.9,
      ...o,
    };
    this.state = 'idle';
    this.stateT = 0;
    this.cooldown = rand(0.6, 1.6);
    this.stunned = false;
    this.stunT = 0;
    this.poison = null;
    this.superArmor = o.superArmor ?? false;
    this.stunImmune = o.stunImmune ?? false;
    this.onDeath = o.onDeath;
    this.home = { x: this.pos.x, z: this.pos.z };
    this.dying = false;
    this.tele = null;
    this.hidden = false;
    this.orbitA = rand(0, TAU);
    this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    this.wu = 0; // 이번 공격의 예고 시간 (도움 모드면 길어짐)
    this.active = o.active ?? true;
    if (this.cfg.ai === 'flyer') {
      this.flying = true;
      this.y = this.cfg.flyHeight;
      this.solid = false;
    }
  }

  get player() {
    return G.player;
  }

  // 지금 공격하는 중인지 (예고 포함). 동시에 공격하는 수를 셀 때 쓴다
  get attacking() {
    if (this.stunned || !this.active) return false;
    const s = this.state;
    if (s === 'hop') return !!this.hopTarget?.attack;
    return s === 'windup' || s === 'attack' || s === 'charge' || s === 'aim' || s === 'dive';
  }

  slotsFull() {
    const max = attackSlots();
    let n = 0;
    for (const o of this.world.entities) {
      if (o === this || o.team !== 'enemy' || !o.alive || o.removed || o.boss) continue;
      if (o.attacking && ++n >= max) return true;
    }
    return false;
  }

  // 공격 차례 받기 (받으면 true)
  claimTurn() {
    if (G.time - lastTurn < TURN_GAP || this.slotsFull()) return false;
    lastTurn = G.time;
    return true;
  }

  resetCooldown() {
    this.cooldown = Combat.rest(rand(this.cfg.cd[0], this.cfg.cd[1]));
  }

  // 차례를 기다리며 플레이어 둘레를 천천히 돌기
  circle(dt, R) {
    const p = this.player;
    const a = Math.atan2(this.pos.z - p.pos.z, this.pos.x - p.pos.x) + this.orbitDir * 0.5;
    this.moveToward(p.pos.x + Math.cos(a) * R, p.pos.z + Math.sin(a) * R, this.cfg.speed * 0.7, dt);
    this.faceToward(p.pos.x, p.pos.z);
  }

  distP() {
    const p = this.player;
    return p ? Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) : 999;
  }

  takeDamage(n, info) {
    if (this.invulnerable) return false;
    this.hp -= n;
    this.flash(0.1);
    this.squash(0.16, 0.22);
    this.visual?.showBar(Math.max(0, this.hp / this.maxHp), this.boss ? 0xffb84a : 0xff5a4a);
    if (!this.superArmor && !this.stunned && info.type !== 'poison' && this.hp > 0) {
      this.clearTele();
      this.state = 'hurt';
      this.stateT = 0;
      this.vel.set(0, 0, 0);
    }
    this.onHurt?.(n, info);
    return n;
  }

  stun(t = 2.5) {
    if (this.stunImmune || !this.alive) return;
    this.stunned = true;
    this.stunT = Math.max(this.stunT, t);
    this.clearTele();
    this.vel.set(0, 0, 0);
    this.onStun?.();
  }

  addPoison(p) {
    if (!this.alive) return;
    this.poison = { dps: p.dps, time: p.time, tick: 0.5 };
  }

  clearTele() {
    if (this.tele) {
      this.tele.remove();
      this.tele = null;
    }
  }

  die(info) {
    if (!this.alive) return;
    this.alive = false;
    this.dying = true;
    this.dieT = 0;
    if (G.stage?.stats) G.stage.stats.kills++;
    this.solid = false;
    this.clearTele();
    this.setDizzy(false);
    G.audio.play(this.boss ? 'boss_die' : 'enemy_die');
    const c = this.cfg.coins;
    dropLoot(this.world, this.pos.x, this.pos.z, { exp: this.cfg.exp, coins: Array.isArray(c) ? randInt(c[0], c[1]) : c, heartChance: this.cfg.heartChance });
    this.onDeath?.(this, info);
  }

  update(dt) {
    super.update(dt);
    this.stateT += dt;
    if (this.dying) {
      this.dieT += dt;
      const k = this.dieT / 0.38;
      this.flashT = 0.05;
      if (this.visual) {
        this.visual.setOpacity(Math.max(0, 1 - k * 0.6));
      }
      this.vel.set(0, 0, 0);
      if (k >= 1) {
        G.fx.starPop({ x: this.pos.x, y: this.y, z: this.pos.z }, this.boss ? 2 : Math.max(0.7, this.height / 2));
        this.world.remove(this);
      }
      return;
    }
    if (this.poison) {
      const P = this.poison;
      P.time -= dt;
      P.tick -= dt;
      if (P.tick <= 0) {
        P.tick = 0.5;
        Combat.hitEnemy(this, { amount: P.dps * 0.5, type: 'poison', knock: 0, ignoreInvuln: true });
        if (this.alive) G.fx.burst(this.pos, { count: 3, color: 0x8af06a, tile: 'glow', size: 0.4, speed: 1.5, gravity: -3, life: 0.6, yOff: this.height * 0.6 });
      }
      if (P.time <= 0) this.poison = null;
    }
    if (this.stunned) {
      this.stunT -= dt;
      this.setDizzy(true);
      this.vel.x = damp(this.vel.x, 0, 10, dt);
      this.vel.z = damp(this.vel.z, 0, 10, dt);
      if (this.flying && this.y > 0.6) this.y = Math.max(0.6, this.y - dt * 6);
      if (this.stunT <= 0) {
        this.stunned = false;
        this.setDizzy(false);
        this.state = 'chase';
        this.stateT = 0;
        this.onRecover?.();
      }
      return;
    }
    if (!this.active || !this.player || !this.player.alive) {
      this.vel.x = damp(this.vel.x, 0, 8, dt);
      this.vel.z = damp(this.vel.z, 0, 8, dt);
      return;
    }
    if (this.player.state === 'faint' || this.player.locked) {
      // 플레이어가 쉬는 동안은 공격 멈춤 (아이 배려)
      this.clearTele();
      if (this.state !== 'hurt') this.state = 'idle';
      this.vel.x = damp(this.vel.x, 0, 8, dt);
      this.vel.z = damp(this.vel.z, 0, 8, dt);
      return;
    }
    if (this.cooldown > 0) this.cooldown -= dt;
    this.think(dt);
  }

  think(dt) {
    const fn = AI[this.cfg.ai];
    if (fn) fn(this, dt);
  }

  moveToward(x, z, speed, dt, k = 8) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    this.vel.x = damp(this.vel.x, (dx / d) * speed, k, dt);
    this.vel.z = damp(this.vel.z, (dz / d) * speed, k, dt);
    this.dirAngle = dampAngle(this.dirAngle, Math.atan2(dz, dx), 10, dt);
    this.updateFlip(dx, dz);
  }

  stop(dt, k = 10) {
    this.vel.x = damp(this.vel.x, 0, k, dt);
    this.vel.z = damp(this.vel.z, 0, k, dt);
  }

  warn() {
    G.fx.text({ x: this.pos.x, y: this.y + this.height * 0.6, z: this.pos.z }, '!', { color: '#ff4a3a', size: 1.4, cls: 'warn', life: 0.6, rise: 0.6 });
    G.audio.play('warn');
  }

  animate(dt, v) {
    v.lift = 0;
    v.roll = 0;
    v.sway = 0;
    if (this.state === 'windup') {
      v.sx *= 1 + Math.sin(this.time * 40) * 0.03;
      v.roll = 0.12;
    } else if (this.stunned) {
      v.roll = Math.sin(this.time * 6) * 0.1;
    } else if (!this.flying) {
      this.walkAnim(v);
    }
    if (this.flying && !this.stunned) {
      v.sy *= 1 + Math.sin(this.time * 14) * 0.06;
    }
  }
}

// ───────── 일반 적 행동 ─────────
const AI = {
  dummy(e, dt) {
    e.stop(dt);
    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + dt * 40);
  },

  melee(e, dt) {
    const p = e.player;
    const d = e.distP();
    switch (e.state) {
      case 'idle':
        e.stop(dt);
        if (d < e.cfg.aggro) e.state = 'chase';
        break;
      case 'chase':
        if (d > e.cfg.aggro * 1.6) { e.state = 'idle'; break; }
        // 다른 적들이 공격 중이면 조금 떨어져서 차례를 기다림
        if (e.cooldown <= 0 && e.slotsFull()) { e.circle(dt, e.cfg.range + 1.6); break; }
        if (d < e.cfg.range && e.cooldown <= 0) {
          if (!e.claimTurn()) {
            e.stop(dt);
            e.faceToward(p.pos.x, p.pos.z);
            break;
          }
          e.state = 'windup';
          e.stateT = 0;
          e.wu = Combat.windup(e.cfg.windup);
          e.faceToward(p.pos.x, p.pos.z);
          e.lockX = p.pos.x;
          e.lockZ = p.pos.z;
          const dir = e.dir;
          const tx = e.pos.x + dir.x * e.cfg.lunge * e.cfg.lungeTime * 0.7, tz = e.pos.z + dir.z * e.cfg.lunge * e.cfg.lungeTime * 0.7;
          e.tele = G.fx.telegraphCircle({ x: tx, z: tz }, 1.3, e.wu);
          e.warn();
        } else if (d > e.cfg.range * 0.7) e.moveToward(p.pos.x, p.pos.z, e.cfg.speed, dt);
        else {
          e.stop(dt);
          e.faceToward(p.pos.x, p.pos.z);
        }
        break;
      case 'windup':
        e.stop(dt, 14);
        if (e.stateT >= e.wu) {
          e.clearTele();
          e.state = 'attack';
          e.stateT = 0;
          e.didHit = false;
          G.audio.play('swing', { pitch: 0.8 });
        }
        break;
      case 'attack': {
        const dir = e.dir;
        e.vel.x = dir.x * e.cfg.lunge;
        e.vel.z = dir.z * e.cfg.lunge;
        if (!e.didHit && Combat.hitPlayerIfIn(e.pos, e.radius + 0.7, e.cfg.damage, { knock: 7 })) e.didHit = true;
        if (e.stateT >= e.cfg.lungeTime) {
          e.state = 'recover';
          e.stateT = 0;
        }
        break;
      }
      case 'recover':
        e.stop(dt, 6);
        if (e.stateT > 0.55) {
          e.state = 'chase';
          e.resetCooldown();
        }
        break;
      case 'hurt':
        e.stop(dt, 4);
        if (e.stateT > 0.28) e.state = 'chase';
        break;
    }
  },

  hopper(e, dt) {
    const p = e.player;
    const d = e.distP();
    switch (e.state) {
      case 'idle':
        e.stop(dt);
        if (d < e.cfg.aggro) { e.state = 'chase'; e.stateT = 0; }
        break;
      case 'chase':
        e.stop(dt, 12);
        if (e.stateT > 0.7 && e.y <= 0) {
          const want = d < 4 && e.cooldown <= 0;
          const near = want && e.claimTurn();
          let tx = e.pos.x + ((p.pos.x - e.pos.x) / d) * 3;
          let tz = e.pos.z + ((p.pos.z - e.pos.z) / d) * 3;
          if (near) {
            tx = p.pos.x;
            tz = p.pos.z;
          } else if (want) {
            // 차례를 기다리며 옆으로 깡충
            const a = Math.atan2(e.pos.z - p.pos.z, e.pos.x - p.pos.x) + e.orbitDir * 0.7;
            tx = p.pos.x + Math.cos(a) * 4.2;
            tz = p.pos.z + Math.sin(a) * 4.2;
          }
          e.faceToward(tx, tz);
          e.hopTarget = { x: tx, z: tz, attack: near };
          if (near) {
            e.wu = Combat.windup(0.55);
            e.tele = G.fx.telegraphCircle({ x: tx, z: tz }, 1.4, e.wu);
            e.warn();
            e.state = 'windup';
          } else e.state = 'hop';
          e.stateT = 0;
        }
        break;
      case 'windup':
        e.stop(dt);
        if (e.stateT > e.wu) { e.state = 'hop'; e.stateT = 0; }
        break;
      case 'hop': {
        if (e.stateT < 0.02) {
          const T = 0.5;
          e.vy = 7;
          e.gravity = 28;
          const h = e.hopTarget;
          e.vel.set((h.x - e.pos.x) / T, 0, (h.z - e.pos.z) / T);
          G.audio.play('pop');
        }
        if (e.stateT > 0.1 && e.y <= 0) {
          e.vel.set(0, 0, 0);
          if (e.hopTarget.attack) {
            e.clearTele();
            Combat.hitPlayerIfIn(e.pos, 1.5, e.cfg.damage, { knock: 6 });
            G.fx.dust(e.pos, { count: 6 });
            e.resetCooldown();
          }
          e.state = 'chase';
          e.stateT = 0;
        }
        break;
      }
      case 'hurt':
        e.stop(dt, 4);
        if (e.stateT > 0.3) { e.state = 'chase'; e.stateT = 0; }
        break;
    }
  },

  charger(e, dt) {
    const p = e.player;
    const d = e.distP();
    switch (e.state) {
      case 'idle':
        e.stop(dt);
        if (d < e.cfg.aggro) e.state = 'chase';
        break;
      case 'chase':
        if (d < e.cfg.aggro && e.cooldown <= 0 && e.claimTurn()) {
          e.state = 'windup';
          e.stateT = 0;
          e.wu = Combat.windup(e.cfg.windupCharge ?? 0.9);
          e.faceToward(p.pos.x, p.pos.z);
          e.tele = G.fx.telegraphLine(e.pos, e.dir, e.cfg.chargeSpeed * e.cfg.chargeTime, e.radius * 2 + 0.8, e.wu);
          e.warn();
          G.audio.play('charge');
        } else if (d > 5) e.moveToward(p.pos.x, p.pos.z, e.cfg.speed, dt);
        else {
          e.stop(dt);
          e.faceToward(p.pos.x, p.pos.z);
        }
        break;
      case 'windup':
        e.stop(dt, 14);
        if (Math.random() < 0.4) G.fx.dust(e.pos, { count: 1, size: 0.6 });
        if (e.stateT >= e.wu) {
          e.clearTele();
          e.state = 'charge';
          e.stateT = 0;
          e.didHit = false;
        }
        break;
      case 'charge': {
        const dir = e.dir;
        e.vel.x = dir.x * e.cfg.chargeSpeed;
        e.vel.z = dir.z * e.cfg.chargeSpeed;
        if (Math.random() < 0.6) G.fx.dust(e.pos, { count: 1, size: 0.9 });
        if (!e.didHit && Combat.hitPlayerIfIn(e.pos, e.radius + 0.5, e.cfg.damage, { knock: 11 })) e.didHit = true;
        if (e.hitWall && e.stateT > 0.1) {
          G.rig.shake(0.35);
          G.audio.play('thud');
          G.fx.dust(e.pos, { count: 10, size: 1.2, speed: 4 });
          e.vel.set(0, 0, 0);
          e.stun(e.cfg.wallStun ?? 1.6);
          e.onWall?.();
          break;
        }
        if (e.stateT >= e.cfg.chargeTime) {
          e.state = 'recover';
          e.stateT = 0;
        }
        break;
      }
      case 'recover':
        e.stop(dt, 4);
        if (e.stateT > 0.7) {
          e.state = 'chase';
          e.resetCooldown();
        }
        break;
      case 'hurt':
        e.stop(dt, 4);
        if (e.stateT > 0.3) e.state = 'chase';
        break;
    }
  },

  flyer(e, dt) {
    const p = e.player;
    const d = e.distP();
    const H = e.cfg.flyHeight;
    switch (e.state) {
      case 'idle':
      case 'chase': {
        if (d > e.cfg.aggro * 1.8) { e.stop(dt, 3); break; }
        e.orbitA += dt * (e.cfg.orbitSpeed ?? 0.9);
        const R = e.cfg.orbitR ?? 5;
        e.moveToward(p.pos.x + Math.cos(e.orbitA) * R, p.pos.z + Math.sin(e.orbitA) * R, e.cfg.speed, dt, 4);
        e.y = damp(e.y, H + Math.sin(e.time * 2) * 0.3, 3, dt);
        if (e.cooldown <= 0 && d < e.cfg.aggro && e.claimTurn()) {
          e.stateT = 0;
          if (e.cfg.shoots && Math.random() < 0.6) {
            e.state = 'aim';
            e.wu = Combat.windup(0.7);
            e.faceToward(p.pos.x, p.pos.z);
            e.tele = G.fx.telegraphLine(e.pos, e.dir, 14, 0.9, e.wu);
          } else {
            e.state = 'windup';
            e.wu = Combat.windup(0.8);
            e.diveX = p.pos.x;
            e.diveZ = p.pos.z;
            e.tele = G.fx.telegraphCircle({ x: p.pos.x, z: p.pos.z }, 1.4, e.wu);
          }
          e.warn();
        }
        break;
      }
      case 'aim':
        e.stop(dt, 6);
        if (e.stateT >= e.wu) {
          e.clearTele();
          const dir = e.dir;
          e.world.add(new Shot({ x: e.pos.x, z: e.pos.z, y: e.y, dirX: dir.x, dirZ: dir.z, kind: e.cfg.shot, speed: e.cfg.shotSpeed, damage: e.cfg.damage }));
          G.audio.play('whoosh');
          e.state = 'chase';
          e.resetCooldown();
        }
        break;
      case 'windup':
        e.stop(dt, 6);
        e.y = damp(e.y, H + 0.8, 6, dt);
        if (e.stateT >= e.wu) {
          e.clearTele();
          e.state = 'dive';
          e.stateT = 0;
          e.didHit = false;
          e.faceToward(e.diveX, e.diveZ);
          G.audio.play('bird');
        }
        break;
      case 'dive': {
        const dx = e.diveX - e.pos.x, dz = e.diveZ - e.pos.z;
        const dd = Math.hypot(dx, dz);
        const sp = 14;
        if (dd > 0.4) {
          e.vel.x = (dx / dd) * sp;
          e.vel.z = (dz / dd) * sp;
        }
        e.y = damp(e.y, 0.5, 10, dt);
        if (!e.didHit && e.y < 1.4 && Combat.hitPlayerIfIn(e.pos, e.radius + 0.6, e.cfg.damage, { knock: 6, air: true })) e.didHit = true;
        if (dd < 0.6 || e.stateT > 0.9) {
          e.state = 'low';
          e.stateT = 0;
        }
        break;
      }
      case 'low':
        e.stop(dt, 3);
        if (e.stateT > 0.9) {
          e.state = 'chase';
          e.resetCooldown();
        }
        break;
      case 'hurt':
        e.stop(dt, 4);
        if (e.stateT > 0.3) e.state = 'chase';
        break;
    }
  },

  shooter(e, dt) {
    const p = e.player;
    const d = e.distP();
    switch (e.state) {
      case 'idle':
        e.stop(dt);
        if (d < e.cfg.aggro) e.state = 'chase';
        break;
      case 'chase':
        if (d < e.cfg.keepDist - 2) {
          const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
          e.moveToward(e.pos.x + dx, e.pos.z + dz, e.cfg.speed, dt);
          e.faceToward(p.pos.x, p.pos.z);
        } else if (d > e.cfg.keepDist + 2) e.moveToward(p.pos.x, p.pos.z, e.cfg.speed, dt);
        else {
          e.stop(dt);
          e.faceToward(p.pos.x, p.pos.z);
        }
        if (e.cooldown <= 0 && d < e.cfg.aggro && e.claimTurn()) {
          e.state = 'windup';
          e.stateT = 0;
          e.wu = Combat.windup(0.75);
          e.faceToward(p.pos.x, p.pos.z);
          e.tele = G.fx.telegraphLine(e.pos, e.dir, 15, 0.9, e.wu);
          e.warn();
        }
        break;
      case 'windup':
        e.stop(dt, 12);
        if (e.stateT >= e.wu) {
          e.clearTele();
          const dir = e.dir;
          e.world.add(new Shot({ x: e.pos.x, z: e.pos.z, dirX: dir.x, dirZ: dir.z, kind: e.cfg.shot, speed: e.cfg.shotSpeed, damage: e.cfg.damage }));
          G.audio.play('whoosh');
          e.state = 'recover';
          e.stateT = 0;
        }
        break;
      case 'recover':
        e.stop(dt);
        if (e.stateT > 0.6) {
          e.state = 'chase';
          e.resetCooldown();
        }
        break;
      case 'hurt':
        e.stop(dt, 4);
        if (e.stateT > 0.3) e.state = 'chase';
        break;
    }
  },
};

// ───────── 보스 ─────────
// 하위 클래스는 patterns() 에서 async 함수 목록을 돌려주고, 필요하면 think() 를 덮어쓴다.
export class Boss extends Enemy {
  constructor(o) {
    super({ superArmor: true, knockResist: 0.85, mass: 8, heartChance: 0, ...o, boss: true });
    this.boss = true;
    this.title = o.title || '';
    this.mode = 'idle'; // 'follow' | 'idle' | 'custom'
    this.followSpeed = o.speed ?? 3;
    this.rest = o.rest ?? [0.6, 1.2];
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.brain();
  }

  stopped() {
    return !this.alive || this.removed || this.stunned || !this.active;
  }

  async brain() {
    while (this.alive && !this.removed) {
      if (!this.active || this.stunned || !this.player || this.player.state === 'faint' || this.player.locked) {
        this.mode = 'idle';
        await wait(0.15);
        continue;
      }
      const list = this.patterns();
      const fn = this.choosePattern ? this.choosePattern(list) : pick(list);
      try {
        await fn.call(this);
      } catch (e) {
        console.error(e);
      }
      this.clearTele();
      if (!this.alive) break;
      this.mode = 'follow';
      await wait(Combat.rest(rand(this.rest[0], this.rest[1])));
    }
  }

  patterns() {
    return [this.pBite];
  }

  think(dt) {
    const p = this.player;
    if (this.mode === 'follow') {
      if (this.distP() > (this.followDist ?? 3)) this.moveToward(p.pos.x, p.pos.z, this.followSpeed, dt);
      else {
        this.stop(dt);
        this.faceToward(p.pos.x, p.pos.z);
      }
    } else if (this.mode === 'idle') this.stop(dt);
    else if (this.mode === 'face') {
      this.stop(dt, 14);
    }
    this.thinkExtra?.(dt);
  }

  takeDamage(n, info) {
    const r = super.takeDamage(n, info);
    G.ui.hud.updateBoss(this);
    return r;
  }

  // ── 공용 패턴 조각 ──
  async approach(dist = 3, timeout = 3) {
    this.mode = 'follow';
    this.followDist = dist;
    const t0 = G.time;
    await until(() => this.stopped() || this.distP() <= dist + 0.3 || G.time - t0 > timeout);
    this.mode = 'idle';
  }

  async pBite() {
    await this.approach(this.cfg.range ?? 2.5);
    if (this.stopped()) return;
    await this.lunge({});
  }

  async lunge({ windup = 0.65, radius = 1.6, speed = 12, time = 0.2, damage = this.cfg.damage, knock = 8 } = {}) {
    const p = this.player;
    windup = Combat.windup(windup);
    this.mode = 'face';
    this.faceToward(p.pos.x, p.pos.z);
    const dir = this.dir;
    const reach = speed * time * 0.75;
    this.tele = G.fx.telegraphCircle({ x: this.pos.x + dir.x * (reach + this.radius), z: this.pos.z + dir.z * (reach + this.radius) }, radius, windup);
    this.warn();
    this.state = 'windup';
    await wait(windup);
    this.clearTele();
    this.state = 'attack';
    if (this.stopped()) return;
    G.audio.play('swing', { pitch: 0.7 });
    this.mode = 'custom';
    let hit = false;
    const t0 = G.time;
    await until(() => {
      if (this.stopped()) return true;
      this.vel.x = dir.x * speed;
      this.vel.z = dir.z * speed;
      if (!hit && Combat.hitPlayerIfIn({ x: this.pos.x + dir.x * this.radius * 0.6, z: this.pos.z + dir.z * this.radius * 0.6 }, radius, damage, { knock })) hit = true;
      return G.time - t0 >= time;
    });
    this.vel.set(0, 0, 0);
    this.state = 'recover';
    this.mode = 'idle';
    await wait(0.35);
    this.state = 'chase';
  }

  async charge({ windup = 0.9, speed = 16, time = 1.0, width = null, damage = this.cfg.damage, stunOnWall = 2.2, onWall = null } = {}) {
    const p = this.player;
    windup = Combat.windup(windup);
    this.mode = 'face';
    this.faceToward(p.pos.x, p.pos.z);
    const dir = this.dir;
    this.tele = G.fx.telegraphLine(this.pos, dir, speed * time, width ?? this.radius * 2 + 0.6, windup);
    this.warn();
    G.audio.play('charge');
    this.state = 'windup';
    await wait(windup);
    this.clearTele();
    if (this.stopped()) return;
    this.state = 'charge';
    this.mode = 'custom';
    let hit = false;
    const t0 = G.time;
    let walled = false;
    await until(() => {
      if (this.stopped()) return true;
      this.vel.x = dir.x * speed;
      this.vel.z = dir.z * speed;
      if (Math.random() < 0.7) G.fx.dust(this.pos, { count: 1, size: 1.2 });
      if (!hit && Combat.hitPlayerIfIn(this.pos, this.radius + 0.3, damage, { knock: 12 })) hit = true;
      if (this.hitWall && G.time - t0 > 0.12) {
        walled = true;
        return true;
      }
      return G.time - t0 >= time;
    });
    this.vel.set(0, 0, 0);
    this.state = 'recover';
    if (walled) {
      G.rig.shake(0.5);
      G.audio.play('thud');
      G.fx.dust(this.pos, { count: 14, size: 1.6, speed: 5 });
      onWall?.();
      if (stunOnWall) this.stun(stunOnWall);
      return;
    }
    this.mode = 'idle';
    await wait(0.4);
  }

  async slam({ windup = 1.0, radius = 3.5, at = null, damage = this.cfg.damage + 1, jump = false } = {}) {
    const p = this.player;
    windup = Combat.windup(windup);
    const target = at || (jump ? { x: p.pos.x, z: p.pos.z } : { x: this.pos.x, z: this.pos.z });
    this.mode = 'face';
    this.faceToward(p.pos.x, p.pos.z);
    this.tele = G.fx.telegraphCircle(target, radius, windup);
    this.warn();
    this.state = 'windup';
    if (jump) {
      this.vy = 12;
      this.gravity = 24;
      const T = windup;
      this.mode = 'custom';
      this.vel.set((target.x - this.pos.x) / T, 0, (target.z - this.pos.z) / T);
      this.noClip = true;
    }
    await wait(windup);
    this.noClip = false;
    this.vel.set(0, 0, 0);
    this.clearTele();
    if (!this.alive) return;
    this.state = 'attack';
    G.audio.play('stomp');
    G.rig.shake(0.55);
    G.input.vibrate(30);
    G.fx.ring(target, { r0: 0.5, r1: radius * 1.1, life: 0.4, color: 0xffe0b0 });
    G.fx.dust(target, { count: 14, size: 1.6, speed: 6 });
    Combat.hitPlayerIfIn(target, radius, damage, { knock: 10 });
    this.mode = 'idle';
    await wait(0.5);
    this.state = 'chase';
  }

  async shoot({ kind = 'fire', count = 1, spread = 0.35, windup = 0.7, speed = 11, damage = this.cfg.damage, from = null } = {}) {
    const p = this.player;
    windup = Combat.windup(windup);
    this.mode = 'face';
    this.faceToward(p.pos.x, p.pos.z);
    const base = Math.atan2(p.pos.z - this.pos.z, p.pos.x - this.pos.x);
    const o = from || this.pos;
    const teles = [];
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      teles.push(G.fx.telegraphLine(o, { x: Math.cos(a), z: Math.sin(a) }, 14, 0.9, windup));
    }
    this.warn();
    this.state = 'windup';
    await wait(windup);
    teles.forEach((t) => t.remove());
    if (this.stopped()) return;
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      this.world.add(new Shot({ x: o.x, z: o.z, y: (o.y ?? 1.4), dirX: Math.cos(a), dirZ: Math.sin(a), kind, speed, damage }));
    }
    G.audio.play(kind === 'fire' ? 'fire' : kind === 'ice' ? 'ice' : kind === 'poison' ? 'poison' : 'whoosh');
    this.state = 'recover';
    this.mode = 'idle';
    await wait(0.4);
  }

  // 플레이어 근처에 포물선으로 던지기 (독침, 바위)
  async lob({ kind = 'poison', count = 1, windup = 0.4, radius = 1.6, damage = this.cfg.damage, hazard = null, from = null, time = 1.0 } = {}) {
    const p = this.player;
    time = Combat.windup(time); // 날아가는 동안 떨어질 자리가 빨갛게 보이므로, 이 시간이 곧 예고 시간
    this.mode = 'face';
    this.faceToward(p.pos.x, p.pos.z);
    this.state = 'windup';
    await wait(windup);
    if (this.stopped()) return;
    const o = from || this.pos;
    for (let i = 0; i < count; i++) {
      const tx = p.pos.x + (i ? rand(-3, 3) : 0), tz = p.pos.z + (i ? rand(-3, 3) : 0);
      const tele = G.fx.telegraphCircle({ x: tx, z: tz }, radius, time);
      this.world.add(new Shot({
        x: o.x, z: o.z, y: 2, dirX: 1, dirZ: 0, kind, damage,
        lob: {
          tx, tz, time, height: 5,
          onLand: (x, z) => {
            tele.remove();
            Combat.hitPlayerIfIn({ x, z }, radius, damage, { knock: 6 });
            if (hazard) hazard(x, z);
          },
        },
      }));
    }
    G.audio.play('whoosh');
    this.state = 'recover';
    this.mode = 'idle';
    await wait(0.3);
  }

  die(info) {
    if (!this.alive) return;
    super.die(info);
    G.ui.hud.updateBoss(this);
  }
}
