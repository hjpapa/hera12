// 스테이지 하나의 세계: 걷기 영역(원·사각형·길 캡슐의 합집합), 충돌 원, 엔티티, 상호작용 대상.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { dist2, distToSegment, clamp } from '../core/util.js';
import { disposeTree, updateFlames, WATER_TIME } from '../render/props.js';

function inside(s, x, z, m) {
  switch (s.type) {
    case 'circle': return dist2(x, z, s.x, s.z) <= s.r - m;
    case 'rect': return x >= s.x0 + m && x <= s.x1 - m && z >= s.z0 + m && z <= s.z1 - m;
    case 'capsule': return distToSegment(x, z, s.ax, s.az, s.bx, s.bz) <= s.r - m;
  }
  return false;
}

export class World {
  constructor() {
    this.root = new THREE.Group();
    this.entities = [];
    this.colliders = [];
    this.areas = [];
    this.blocks = [];
    this.interactables = [];
    this.triggers = [];
    this.flames = [];
    this.updaters = [];
    this.flyBounds = null;
  }

  // ───────── 걷기 영역 ─────────
  circle(x, z, r) { this.areas.push({ type: 'circle', x, z, r }); return this; }
  rect(x0, z0, x1, z1) { this.areas.push({ type: 'rect', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }); return this; }
  capsule(ax, az, bx, bz, r) { this.areas.push({ type: 'capsule', ax, az, bx, bz, r }); return this; }
  // 점들을 이은 길
  road(points, r) {
    for (let i = 0; i < points.length - 1; i++) this.capsule(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], r);
    return this;
  }
  block(shape) {
    this.blocks.push(shape);
    return shape;
  }
  unblock(shape) {
    this.blocks = this.blocks.filter((b) => b !== shape);
  }

  walkable(x, z, margin = 0) {
    let ok = false;
    for (const a of this.areas) if (inside(a, x, z, margin)) { ok = true; break; }
    if (!ok) return false;
    for (const b of this.blocks) if (inside(b, x, z, -margin)) return false;
    return true;
  }

  addCollider(x, z, r) {
    const c = { x, z, r, on: true };
    this.colliders.push(c);
    return c;
  }

  removeCollider(c) {
    this.colliders = this.colliders.filter((o) => o !== c);
  }

  // ───────── 엔티티 ─────────
  add(e) {
    e.world = this;
    this.entities.push(e);
    if (e.visual) this.root.add(e.visual.group);
    if (e.shadow) this.root.add(e.shadow);
    e.onAdd?.();
    return e;
  }

  remove(e) {
    e.removed = true;
  }

  enemies() {
    return this.entities.filter((e) => e.team === 'enemy' && e.alive && !e.removed);
  }

  nearest(pos, { maxDist = Infinity, filter = null, team = 'enemy' } = {}) {
    let best = null, bd = maxDist;
    for (const e of this.entities) {
      if (!e.alive || e.removed || (team && e.team !== team)) continue;
      if (filter && !filter(e)) continue;
      const d = dist2(pos.x, pos.z, e.pos.x, e.pos.z) - e.radius;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // 축별로 나눠 움직여서 벽을 따라 미끄러지게
  move(e, dx, dz) {
    const p = e.pos;
    if (e.flying || e.noClip) {
      p.x += dx;
      p.z += dz;
      if (this.flyBounds) {
        const fb = this.flyBounds;
        const d = dist2(p.x, p.z, fb.x, fb.z);
        if (d > fb.r) { p.x = fb.x + ((p.x - fb.x) / d) * fb.r; p.z = fb.z + ((p.z - fb.z) / d) * fb.r; }
      }
      return { hitWall: false };
    }
    let hitWall = false;
    const m = e.radius * 0.6;
    if (dx) {
      if (this.walkable(p.x + dx, p.z, m)) p.x += dx;
      else hitWall = true;
    }
    if (dz) {
      if (this.walkable(p.x, p.z + dz, m)) p.z += dz;
      else hitWall = true;
    }
    // 고정 장애물 밀어내기
    for (const c of this.colliders) {
      if (!c.on) continue;
      const ddx = p.x - c.x, ddz = p.z - c.z;
      const rr = c.r + e.radius;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001;
        const push = rr - d;
        const nx = p.x + (ddx / d) * push, nz = p.z + (ddz / d) * push;
        if (this.walkable(nx, nz, m * 0.5)) { p.x = nx; p.z = nz; }
        hitWall = true;
      }
    }
    // 밀려났다가 영역 밖으로 나가면 가장 가까운 안쪽으로
    if (!this.walkable(p.x, p.z, 0)) {
      if (e.lastSafe) { p.x = e.lastSafe.x; p.z = e.lastSafe.z; }
    } else {
      e.lastSafe = e.lastSafe || { x: 0, z: 0 };
      e.lastSafe.x = p.x;
      e.lastSafe.z = p.z;
    }
    return { hitWall };
  }

  separate() {
    const L = this.entities;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      if (!a.solid || !a.alive || a.removed) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        if (!b.solid || !b.alive || b.removed) continue;
        if (a.flying !== b.flying) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) * 0.5;
          const ta = b.mass / (a.mass + b.mass), tb = a.mass / (a.mass + b.mass);
          const nx = dx / d, nz = dz / d;
          if (!a.anchored) this.move(a, -nx * push * ta * 2, -nz * push * ta * 2);
          if (!b.anchored) this.move(b, nx * push * tb * 2, nz * push * tb * 2);
        }
      }
    }
  }

  // ───────── 상호작용 (큰 버튼이 바뀜) ─────────
  interact(o) {
    // o: { pos:{x,z} 또는 entity, radius, icon, label, enabled(), action() }
    this.interactables.push(o);
    return o;
  }

  removeInteract(o) {
    this.interactables = this.interactables.filter((i) => i !== o);
  }

  findInteract(pos) {
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const p = it.entity ? it.entity.pos : it.pos;
      const d = dist2(pos.x, pos.z, p.x, p.z);
      if (d <= (it.radius ?? 2.2) && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // 영역 트리거 (한 번만 또는 반복)
  trigger(x, z, r, fn, { once = true } = {}) {
    const t = { x, z, r, fn, once, done: false, inside: false };
    this.triggers.push(t);
    return t;
  }

  onUpdate(fn) {
    this.updaters.push(fn);
    return fn;
  }

  update(dt) {
    WATER_TIME.value += dt;
    for (const e of this.entities) {
      if (!e.removed) e.update(dt);
    }
    this.separate();
    for (const e of this.entities) if (!e.removed) e.syncVisual(dt);
    // 지워진 엔티티 정리
    if (this.entities.some((e) => e.removed)) {
      this.entities = this.entities.filter((e) => {
        if (e.removed) {
          e.dispose();
          return false;
        }
        return true;
      });
    }
    const p = G.player;
    if (p && p.alive) {
      for (const t of this.triggers) {
        if (t.done) continue;
        const inside = dist2(p.pos.x, p.pos.z, t.x, t.z) <= t.r;
        if (inside && !t.inside) {
          t.fn(t);
          if (t.once) t.done = true;
        }
        t.inside = inside;
      }
    }
    for (const fn of this.updaters) fn(dt);
    updateFlames(this, G.time);
  }

  // 움직이지 않는 소품을 재질별로 하나로 합쳐 그리기 횟수를 줄인다 (휴대폰 성능).
  // 움직이는 소품은 userData.dynamic = true 로 표시하면 그대로 둔다.
  bakeStatic() {
    this.root.updateMatrixWorld(true);
    const groups = new Map();
    const remove = [];
    this.root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
      const m = o.material;
      if (m.transparent || m.isShaderMaterial || !m.isMeshToonMaterial) return;
      for (let a = o; a && a !== this.root; a = a.parent) if (a.userData.dynamic || a.userData.entity) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'color' && m.vertexColors)) g.deleteAttribute(k);
      g.applyMatrix4(o.matrixWorld);
      const key = m.uuid + (o.castShadow ? 's' : 'n');
      if (!groups.has(key)) groups.set(key, { m, cast: o.castShadow, list: [] });
      groups.get(key).list.push(g);
      remove.push(o);
    });
    for (const o of remove) {
      o.removeFromParent();
      if (!o.geometry.userData.shared) o.geometry.dispose();
    }
    for (const { m, cast, list } of groups.values()) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      this.root.add(mesh);
    }
  }

  dispose() {
    for (const e of this.entities) e.dispose();
    this.entities = [];
    disposeTree(this.root);
    this.root.removeFromParent();
  }

  clampToArea(x, z, r) {
    return { x: clamp(x, -r, r), z: clamp(z, -r, r) };
  }
}
