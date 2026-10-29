// 모든 캐릭터·사물의 기본: 위치, 넉백, 높이(점프/비행), 빌보드 그림, 그림자, 피격 반응.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Billboard } from '../render/billboard.js';
import { TAU } from '../core/util.js';

const SHADOW_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
let shadowMat = null;
function getShadowMat() {
  if (!shadowMat) {
    shadowMat = new THREE.MeshBasicMaterial({ map: G.fx.shadowTex, transparent: true, depthWrite: false });
    shadowMat.userData.shared = true;
  }
  return shadowMat;
}

export class Entity {
  constructor(o = {}) {
    this.pos = new THREE.Vector3(o.x || 0, 0, o.z || 0);
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.y = o.y || 0;
    this.vy = 0;
    this.gravity = o.gravity ?? 28;
    this.radius = o.radius ?? 0.5;
    this.team = o.team ?? 'neutral';
    this.maxHp = o.hp ?? 10;
    this.hp = this.maxHp;
    this.solid = o.solid ?? true;
    this.mass = o.mass ?? 1;
    this.anchored = o.anchored ?? false;
    this.hittable = o.hittable ?? true;
    this.flying = o.flying ?? false;
    this.alive = true;
    this.removed = false;
    this.flashT = 0;
    this.flashColor = 0xffffff;
    this.squashT = 0;
    this.squashAmt = 0.25;
    this.invuln = 0;
    this.face = o.face ?? 1;
    this.dirAngle = o.angle ?? 0;
    this.time = Math.random() * 10;
    this.bobAmp = o.bob ?? 0;
    this.knockResist = o.knockResist ?? 0;
    this.sprite = o.sprite;
    this.visual = o.sprite ? new Billboard(o.sprite, { scale: o.scale || 1 }) : null;
    if (o.shadow !== false) {
      this.shadow = new THREE.Mesh(SHADOW_GEO, getShadowMat());
      const s = o.shadowSize ?? this.radius * 2.6;
      this.shadowSize = s;
      this.shadow.scale.set(s, 1, s * 0.7);
      this.shadow.renderOrder = 2;
    }
    this.name = o.name || '';
  }

  get height() {
    return this.visual ? this.visual.height : 1;
  }

  center(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.y + this.height * 0.5, this.pos.z);
  }

  get dir() {
    return { x: Math.cos(this.dirAngle), z: Math.sin(this.dirAngle) };
  }

  faceToward(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    if (dx * dx + dz * dz < 1e-6) return;
    this.dirAngle = Math.atan2(dz, dx);
    this.updateFlip(dx, dz);
  }

  updateFlip(dx, dz) {
    const r = G.rig.right;
    const s = dx * r.x + dz * r.z;
    const l = Math.hypot(dx, dz) || 1;
    if (s / l > 0.15) this.face = 1;
    else if (s / l < -0.15) this.face = -1;
  }

  distTo(e) {
    return Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
  }

  update(dt) {
    this.time += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.squashT > 0) this.squashT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.physics(dt);
  }

  physics(dt) {
    const mx = (this.vel.x + this.knock.x) * dt;
    const mz = (this.vel.z + this.knock.z) * dt;
    if (mx || mz) {
      const r = this.world.move(this, mx, mz);
      this.hitWall = r.hitWall;
    } else this.hitWall = false;
    const kd = Math.exp(-9 * dt);
    this.knock.x *= kd;
    this.knock.z *= kd;
    if (!this.flying) {
      if (this.y > 0 || this.vy > 0) {
        this.vy -= this.gravity * dt;
        this.y += this.vy * dt;
        if (this.y <= 0) {
          this.y = 0;
          const impact = this.vy;
          this.vy = 0;
          this.onLand?.(impact);
        }
      }
    }
  }

  push(dx, dz, force) {
    const k = force * (1 - this.knockResist);
    this.knock.x += dx * k;
    this.knock.z += dz * k;
  }

  flash(t = 0.1, color = 0xffffff) {
    this.flashT = t;
    this.flashColor = color;
  }

  squash(t = 0.16, amt = 0.25) {
    this.squashT = t;
    this.squashAmt = amt;
    this.squashDur = t;
  }

  syncVisual(dt) {
    const v = this.visual;
    if (v) {
      v.group.position.set(this.pos.x, this.y, this.pos.z);
      v.flip = this.face;
      // 스쿼시 & 스트레치
      let sx = 1, sy = 1;
      if (this.squashT > 0) {
        const k = this.squashT / (this.squashDur || 0.16);
        const s = Math.sin(k * Math.PI) * this.squashAmt;
        sx = 1 + s;
        sy = 1 - s;
      }
      if (this.bobAmp) v.lift = Math.abs(Math.sin(this.time * 3)) * this.bobAmp;
      v.sx = sx * (this.baseSx ?? 1);
      v.sy = sy * (this.baseSy ?? 1);
      v.setFlash(this.flashT > 0 ? 0.85 : 0, this.flashColor);
      this.animate?.(dt, v);
      v.update(dt);
    }
    if (this.shadow) {
      this.shadow.position.set(this.pos.x, 0.04, this.pos.z);
      const k = Math.max(0.35, 1 - this.y * 0.12);
      this.shadow.scale.set(this.shadowSize * k, 1, this.shadowSize * 0.7 * k);
      this.shadow.visible = this.alive || this.dying;
    }
  }

  dispose() {
    this.visual?.dispose();
    this.shadow?.removeFromParent();
    this.dizzy?.remove();
  }

  // 머리 위 빙글빙글 별 (기절)
  setDizzy(on) {
    if (on && !this.dizzy) {
      const grp = new THREE.Group();
      const tex = G.sprites.texture('icon_star');
      const stars = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
        m.scale.setScalar(0.45);
        grp.add(m);
        stars.push(m);
      }
      this.world.root.add(grp);
      this.dizzy = {
        grp,
        stars,
        remove: () => {
          grp.removeFromParent();
          stars.forEach((s) => s.material.dispose());
        },
      };
    } else if (!on && this.dizzy) {
      this.dizzy.remove();
      this.dizzy = null;
    }
    if (this.dizzy) {
      const h = this.height + this.y + 0.2;
      this.dizzy.grp.position.set(this.pos.x, h, this.pos.z);
      this.dizzy.stars.forEach((s, i) => {
        const a = this.time * 5 + (i / 3) * TAU;
        const r = Math.max(0.5, this.radius * 0.7);
        s.position.set(Math.cos(a) * r, Math.sin(a * 2) * 0.08, Math.sin(a) * r * 0.5);
      });
    }
  }
}

