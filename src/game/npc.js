// 말을 거는 사람들과 따라오는 동료(이올라오스, 사슴, 암말, 소 떼, 케르베로스)
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Entity } from './entity.js';
import { damp, dampAngle, rand, TAU } from '../core/util.js';

let markTex = null;
function markTexture() {
  if (!markTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#ffd84a';
    x.strokeStyle = '#3a2618';
    x.lineWidth = 10;
    x.beginPath();
    x.arc(64, 64, 52, 0, Math.PI * 2);
    x.stroke();
    x.fill();
    x.fillStyle = '#3a2618';
    x.font = 'bold 84px sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('!', 64, 70);
    markTex = new THREE.CanvasTexture(c);
  }
  return markTex;
}

export class NPC extends Entity {
  constructor(o) {
    super({ team: 'neutral', radius: o.radius ?? 0.5, mass: 50, anchored: true, ...o });
    this.speaker = o.speaker || o.sprite;
    this.talk = o.talk;
    this.wander = o.wander ?? 0;
    this.home = { x: this.pos.x, z: this.pos.z };
    this.lookAtPlayer = o.lookAtPlayer ?? true;
    this.icon = o.icon || 'talk';
    this.label = o.label || '말하기';
    this.wanderT = rand(1, 3);
    this.mark = null;
    if (o.mark) this.setMark(true);
  }

  onAdd() {
    if (this.talk) {
      this.it = this.world.interact({
        entity: this,
        radius: this.talkRadius ?? 2.6,
        icon: this.icon,
        label: this.label,
        enabled: () => !!this.talk && this.alive,
        action: () => this.talk(this),
      });
    }
  }

  setMark(on) {
    if (on && !this.mark) {
      this.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTexture(), depthWrite: false }));
      this.mark.scale.setScalar(0.8);
      this.world ? this.world.root.add(this.mark) : (this.pendingMark = true);
    } else if (!on && this.mark) {
      this.mark.removeFromParent();
      this.mark.material.dispose();
      this.mark = null;
    }
  }

  update(dt) {
    super.update(dt);
    if (this.pendingMark && this.world) {
      this.world.root.add(this.mark);
      this.pendingMark = false;
    }
    const p = G.player;
    if (this.wander && !this.busy) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(2, 4);
        const a = rand(0, TAU), r = rand(0, this.wander);
        this.goal = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
      }
      if (this.goal) {
        const dx = this.goal.x - this.pos.x, dz = this.goal.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.3) {
          this.vel.x = damp(this.vel.x, (dx / d) * 1.6, 6, dt);
          this.vel.z = damp(this.vel.z, (dz / d) * 1.6, 6, dt);
          this.updateFlip(dx, dz);
        } else this.goal = null;
      } else {
        this.vel.multiplyScalar(0.8);
      }
    }
    if (p && this.lookAtPlayer && this.distTo(p) < 5 && !this.goal) this.updateFlip(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
  }

  animate(dt, v) {
    v.lift = 0;
    v.roll = 0;
    if (!this.walkAnim(v)) v.sy *= 1 + Math.sin(this.time * 2.2) * 0.012;
    if (this.mark) {
      this.mark.position.set(this.pos.x, this.y + this.height + 0.6 + Math.sin(this.time * 4) * 0.12, this.pos.z);
    }
  }

  dispose() {
    super.dispose();
    this.setMark(false);
    if (this.it) this.world.removeInteract(this.it);
  }
}

// 따라오는 동료: leader 뒤를 일정 거리로 졸졸
export class Follower extends Entity {
  constructor(o) {
    super({ team: 'neutral', radius: o.radius ?? 0.5, mass: 0.5, ...o });
    this.leader = o.leader || null;
    this.gap = o.gap ?? 2.2;
    this.speed = o.speed ?? 7;
    this.offset = o.offset ?? { x: 0, z: 0 };
    this.solid = o.solid ?? false;
    this.noClip = o.noClip ?? true; // 동료는 길에 걸리지 않게
    this.walkBob = o.walkBob ?? 1;
    this.task = null; // { x, z, speed, res }
  }

  goTo(x, z, speed = 9, maxTime = 2.5) {
    return new Promise((res) => {
      this.task = { x, z, speed, res, t: 0, maxTime };
    });
  }

  update(dt) {
    super.update(dt);
    if (this.task) {
      const t = this.task;
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      t.t += dt;
      if (d < 0.4 || t.t > t.maxTime) {
        // 길이 막혀도 기다리지 않게 (시간이 지나면 도착한 것으로)
        if (d >= 0.4) this.pos.set(t.x, 0, t.z);
        this.vel.set(0, 0, 0);
        this.task = null;
        t.res();
      } else {
        this.vel.x = (dx / d) * t.speed;
        this.vel.z = (dz / d) * t.speed;
        this.updateFlip(dx, dz);
      }
      return;
    }
    const L = this.leader;
    if (!L) {
      this.vel.multiplyScalar(0.85);
      return;
    }
    const tx = L.pos.x + this.offset.x, tz = L.pos.z + this.offset.z;
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > this.gap) {
      const sp = Math.min(this.speed * (d > this.gap * 3 ? 1.6 : 1), (d - this.gap) * 4 + 2);
      this.vel.x = damp(this.vel.x, (dx / d) * sp, 8, dt);
      this.vel.z = damp(this.vel.z, (dz / d) * sp, 8, dt);
      this.updateFlip(dx, dz);
      this.dirAngle = dampAngle(this.dirAngle, Math.atan2(dz, dx), 8, dt);
    } else {
      this.vel.x = damp(this.vel.x, 0, 8, dt);
      this.vel.z = damp(this.vel.z, 0, 8, dt);
      if (d > 0.1 && L.pos) this.updateFlip(L.pos.x - this.pos.x, L.pos.z - this.pos.z);
    }
    // 너무 멀어지면 순간이동 (길 잃지 않게)
    if (d > 25) {
      this.pos.set(tx - (dx / d) * this.gap, 0, tz - (dz / d) * this.gap);
    }
  }

  animate(dt, v) {
    v.lift = 0;
    v.roll = 0;
    if (!this.walkAnim(v)) v.sy *= 1 + Math.sin(this.time * 2.4) * 0.015;
  }
}
