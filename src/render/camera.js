// 고정 각도 3인칭 카메라: 부드럽게 따라가기, 보스전 자동 줌, 컷신 포커스, 흔들림.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { damp, rand, clamp } from '../core/util.js';

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0;
    this.dist = 14;
    this.height = 11;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.target = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.focus = null; // { x, z, zoom } 컷신용
    this.pair = null; // 보스: 플레이어와 함께 화면에 담을 대상
    this.trauma = 0;
    this.lead = new THREE.Vector3();
  }

  get forward() {
    // 화면 위쪽 방향 (땅 위)
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  get right() {
    return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
  }

  shake(amount) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  setFocus(x, z, zoom = 0.8) {
    this.focus = { x, z, zoom };
  }

  clearFocus() {
    this.focus = null;
  }

  snap() {
    this.update(10, true);
  }

  update(dt, instant = false) {
    const p = G.player;
    let tx = 0, tz = 0, zoom = this.zoomTarget;
    if (this.focus) {
      tx = this.focus.x;
      tz = this.focus.z;
      zoom = this.focus.zoom;
    } else if (p) {
      tx = p.pos.x;
      tz = p.pos.z;
      // 진행 방향을 조금 더 보여 줌
      this.lead.x = damp(this.lead.x, p.vel.x * 0.22, 3, dt);
      this.lead.z = damp(this.lead.z, p.vel.z * 0.22, 3, dt);
      tx += this.lead.x;
      tz += this.lead.z;
      const q = this.pair && this.pair.alive !== false ? this.pair : null;
      if (q) {
        const dx = q.pos.x - p.pos.x, dz = q.pos.z - p.pos.z;
        const d = Math.hypot(dx, dz);
        tx = p.pos.x + dx * 0.4;
        tz = p.pos.z + dz * 0.4;
        zoom = Math.max(zoom, clamp(0.9 + d / 16, 1, 1.75));
      }
    }
    const portrait = innerHeight > innerWidth;
    const aspectZoom = portrait ? 1.45 : 1;
    const k = instant ? 1 : 1 - Math.exp(-5 * dt);
    this.target.x += (tx - this.target.x) * k;
    this.target.z += (tz - this.target.z) * k;
    this.zoom = instant ? zoom : damp(this.zoom, zoom, 3, dt);
    const z = this.zoom * aspectZoom;
    const cx = this.target.x + Math.sin(this.yaw) * this.dist * z;
    const cz = this.target.z + Math.cos(this.yaw) * this.dist * z;
    const cy = this.height * z;
    // 흔들림 (히트스톱 중에도 계속 → 묵직함)
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const s = this.trauma * this.trauma;
    const ox = s * rand(-1, 1) * 0.6, oy = s * rand(-1, 1) * 0.45;
    this.cam.position.set(cx + ox, cy + oy, cz);
    this.look.set(this.target.x + ox * 0.5, 1.1 + oy * 0.5, this.target.z);
    this.cam.lookAt(this.look);
    if (s > 0) this.cam.rotateZ(s * rand(-1, 1) * 0.03);
  }
}
