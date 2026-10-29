// 여러 과업에서 같이 쓰는 보스: 하늘을 나는 보스(스팀팔로스 대장 새, 캅카스 독수리)
import { G } from '../core/context.js';
import { Boss } from './enemy.js';
import { Combat } from './combat.js';
import { Shot } from './items.js';
import { wait, until } from '../core/script.js';
import { damp, rand, TAU } from '../core/util.js';

export class FlyBoss extends Boss {
  constructor(o) {
    super({ radius: 1.4, speed: 5, damage: 1, rest: [0.4, 0.9], ...o });
    this.flying = true;
    this.solid = false;
    this.y = 4;
    this.H = o.flyHeight ?? 4;
    this.orbitA = 0;
    this.shotKind = o.shotKind || 'feather';
  }

  patterns() {
    return [this.pFan, this.pDive, this.pRain, this.pDive];
  }

  // 플레이어 둘레를 빙빙
  think(dt) {
    const p = this.player;
    if (this.mode === 'follow' || this.mode === 'idle') {
      this.orbitA += dt * 0.7;
      const R = 7;
      this.moveToward(p.pos.x + Math.cos(this.orbitA) * R, p.pos.z + Math.sin(this.orbitA) * R, 6, dt, 3);
      this.y = damp(this.y, this.H + Math.sin(this.time * 2) * 0.4, 3, dt);
    } else if (this.mode === 'face') this.stop(dt, 6);
  }

  async pFan() {
    this.mode = 'face';
    await this.shoot({ kind: this.shotKind, count: 5, spread: 0.28, windup: 0.8, speed: 12, from: { x: this.pos.x, z: this.pos.z, y: this.y } });
  }

  async pRain() {
    G.audio.play('bird');
    this.mode = 'face';
    await this.lob({ kind: this.shotKind, count: 5, radius: 1.4, windup: 0.4, from: { x: this.pos.x, z: this.pos.z } });
  }

  async pDive() {
    const p = this.player;
    this.mode = 'face';
    const tx = p.pos.x, tz = p.pos.z;
    this.tele = G.fx.telegraphCircle({ x: tx, z: tz }, 2, 0.9);
    this.warn();
    G.audio.play('bird');
    await wait(0.9);
    this.clearTele();
    if (this.stopped()) return;
    this.mode = 'custom';
    let hit = false;
    const t0 = G.time;
    await until(() => {
      if (this.stopped()) return true;
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3) {
        this.vel.x = (dx / d) * 16;
        this.vel.z = (dz / d) * 16;
      }
      this.y = damp(this.y, 0.6, 9, G.dt);
      if (!hit && this.y < 1.6 && Combat.hitPlayerIfIn(this.pos, 1.8, 1, { knock: 9, air: true })) hit = true;
      return d < 0.5 || G.time - t0 > 1.0;
    });
    this.vel.set(0, 0, 0);
    // 땅 가까이에서 잠깐 머묾 → 때릴 기회!
    this.mode = 'custom';
    await wait(1.1);
    this.mode = 'follow';
  }

  onRattle() {
    this.stun(3.2);
    G.fx.text(this.pos, '어질!', { color: '#ffe86a', size: 1.2, cls: 'word' });
  }
}

export { Shot, rand, TAU };
