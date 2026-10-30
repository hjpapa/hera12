// 시각 효과: 파티클(Points 하나로 한 번에 그림), 공격 예고(텔레그래프), 충격파 링, 베기 궤적, 데미지 숫자.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, TAU, clamp } from '../core/util.js';
import { fxAtlas, FX_TILES, radialTex, crescentTex } from './paint.js';

const MAX = 700;

const P_VERT = /* glsl */ `
  attribute float size;
  attribute vec4 pcolor;
  attribute float rot;
  attribute float tile;
  uniform float uScale;
  varying vec4 vColor;
  varying float vRot;
  varying float vTile;
  void main() {
    vColor = pcolor;
    vRot = rot;
    vTile = tile;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const P_FRAG = /* glsl */ `
  uniform sampler2D map;
  varying vec4 vColor;
  varying float vRot;
  varying float vTile;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    p = mat2(c, -s, s, c) * p * 1.15 + 0.5;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
    float tx = mod(vTile, 4.0);
    float ty = floor(vTile / 4.0);
    vec2 uv = vec2((tx + p.x) / 4.0, 1.0 - (ty + p.y) / 2.0);
    vec4 t = texture2D(map, uv);
    float a = t.a * vColor.a;
    if (a < 0.02) discard;
    gl_FragColor = vec4(t.rgb * vColor.rgb, a);
  }
`;

class ParticleSystem {
  constructor(tex, additive) {
    this.list = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 4);
    this.size = new Float32Array(MAX);
    this.rot = new Float32Array(MAX);
    this.tile = new Float32Array(MAX);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('rot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('tile', new THREE.BufferAttribute(this.tile, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    this.uniforms = { map: { value: tex }, uScale: { value: 500 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: P_VERT,
      fragmentShader: P_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 11 : 10;
  }

  add(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  update(dt) {
    const L = this.list;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) {
        L[i] = L[L.length - 1];
        L.pop();
      }
    }
    for (const p of L) {
      const t = p.age / p.life;
      p.vy -= p.gravity * dt;
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag; p.vy *= drag; p.vz *= drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
      p.r += p.spin * dt;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      const fade = t < 0.1 && p.fadeIn ? t / 0.1 : 1 - Math.pow(t, p.fadePow);
      this.col[n * 4] = p.cr; this.col[n * 4 + 1] = p.cg; this.col[n * 4 + 2] = p.cb; this.col[n * 4 + 3] = p.a * fade;
      this.size[n] = p.s0 + (p.s1 - p.s0) * t;
      this.rot[n] = p.r;
      this.tile[n] = p.tile;
      n++;
    }
    const g = this.geo;
    g.attributes.position.needsUpdate = true;
    g.attributes.pcolor.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.rot.needsUpdate = true;
    g.attributes.tile.needsUpdate = true;
    g.setDrawRange(0, n);
  }

  clear() {
    this.list.length = 0;
    this.geo.setDrawRange(0, 0);
  }
}

const tmpColor = new THREE.Color();
const TMP_V = new THREE.Vector3();
function rgb(hex) {
  tmpColor.setHex(hex, THREE.LinearSRGBColorSpace);
  return [tmpColor.r, tmpColor.g, tmpColor.b];
}

// ───────── 바닥 예고 셰이더 ─────────
const T_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const T_CIRCLE = /* glsl */ `
  uniform float uProgress; uniform vec3 uColor; uniform float uAlpha; uniform float uTime;
  varying vec2 vUv;
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float edge = smoothstep(0.86, 0.93, d) * (1.0 - smoothstep(0.97, 1.0, d));
    float fill = step(d, uProgress) * 0.45;
    float base = 0.16 + 0.06 * sin(uTime * 18.0);
    float a = max(edge, max(fill, base)) * uAlpha;
    gl_FragColor = vec4(uColor, a);
  }
`;
const T_LINE = /* glsl */ `
  uniform float uProgress; uniform vec3 uColor; uniform float uAlpha; uniform float uTime;
  varying vec2 vUv;
  void main(){
    float side = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    float edge = 1.0 - smoothstep(0.08, 0.16, min(vUv.x, 1.0 - vUv.x));
    float fill = step(vUv.y, uProgress) * 0.42;
    float chevron = step(0.5, fract(vUv.y * 6.0 - abs(vUv.x - 0.5) * 2.0 - uTime * 3.0)) * 0.12;
    float a = max(edge * 0.85, fill + chevron + 0.12) * side * uAlpha;
    gl_FragColor = vec4(uColor, a);
  }
`;

export class FX {
  constructor(scene) {
    const atlas = new THREE.CanvasTexture(fxAtlas());
    atlas.colorSpace = THREE.NoColorSpace;
    this.normal = new ParticleSystem(atlas, false);
    this.add = new ParticleSystem(atlas, true);
    scene.add(this.normal.points, this.add.points);
    this.scene = scene;
    this.shadowTex = new THREE.CanvasTexture(radialTex('rgba(30,20,10,0.42)', 'rgba(30,20,10,0)'));
    this.slashTex = new THREE.CanvasTexture(crescentTex());
    this.flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
    this.ringGeo = new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2);
    this.temp = []; // { mesh, t, life, update }
    this.layer = null;
    this.nums = [];
  }

  attachScene(scene) {
    if (this.scene === scene) return;
    scene.add(this.normal.points, this.add.points);
    this.scene = scene;
  }

  setScale(px) {
    this.normal.uniforms.uScale.value = px;
    this.add.uniforms.uScale.value = px;
  }

  // ───────── 파티클 ─────────
  particle(o) {
    const [cr, cg, cb] = rgb(o.color ?? 0xffffff);
    const p = {
      x: o.x, y: o.y, z: o.z,
      vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      gravity: o.gravity ?? 0, drag: o.drag ?? 1.5,
      life: o.life ?? 0.6, age: 0,
      s0: o.size ?? 0.5, s1: o.sizeEnd ?? (o.size ?? 0.5) * 0.3,
      cr, cg, cb, a: o.alpha ?? 1, fadePow: o.fadePow ?? 2, fadeIn: o.fadeIn,
      r: o.rot ?? rand(0, TAU), spin: o.spin ?? rand(-6, 6),
      tile: FX_TILES[o.tile || 'spark'] ?? 1,
      floor: o.floor,
    };
    (o.additive ? this.add : this.normal).add(p);
  }

  burst(pos, o = {}) {
    const n = o.count ?? 10;
    const sp = o.speed ?? 6;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const up = o.up ?? 0.6;
      const s = sp * rand(0.5, 1.1);
      this.particle({
        x: pos.x + rand(-0.1, 0.1), y: (pos.y ?? 0) + (o.yOff ?? 0.8) + rand(-0.1, 0.1), z: pos.z + rand(-0.1, 0.1),
        vx: Math.cos(a) * s, vy: rand(up * 0.4, up) * s + (o.lift ?? 0), vz: Math.sin(a) * s,
        gravity: o.gravity ?? 9, drag: o.drag ?? 2.2,
        life: rand(0.7, 1.1) * (o.life ?? 0.5),
        size: (o.size ?? 0.45) * rand(0.7, 1.3), sizeEnd: o.sizeEnd ?? 0.05,
        color: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color ?? 0xffe86a,
        tile: o.tile || 'star', additive: o.additive ?? true, floor: o.floor,
      });
    }
  }

  hitSpark(pos, big = false) {
    const y = pos.y;
    this.burst({ x: pos.x, y, z: pos.z }, { count: big ? 14 : 8, speed: big ? 9 : 6.5, color: [0xffffff, 0xffe86a, 0xffb84a], tile: 'spark', size: big ? 0.9 : 0.6, life: 0.3, gravity: 2, yOff: 0, up: 0.5 });
    this.burst({ x: pos.x, y, z: pos.z }, { count: big ? 6 : 3, speed: 3, color: 0xffffff, tile: 'star', size: big ? 0.6 : 0.4, life: 0.5, gravity: 4, yOff: 0 });
    this.particle({ x: pos.x, y, z: pos.z, size: big ? 3.2 : 2, sizeEnd: big ? 4.2 : 2.6, life: 0.12, color: 0xffffff, tile: 'glow', additive: true, alpha: 0.9, spin: 0 });
  }

  dust(pos, o = {}) {
    const n = o.count ?? 6;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = (o.speed ?? 2.5) * rand(0.5, 1);
      this.particle({
        x: pos.x + Math.cos(a) * 0.3, y: 0.15, z: pos.z + Math.sin(a) * 0.3,
        vx: Math.cos(a) * s, vy: rand(0.5, 1.5), vz: Math.sin(a) * s,
        drag: 3, gravity: 0.5, life: rand(0.4, 0.7) * (o.life ?? 1),
        size: (o.size ?? 0.9) * rand(0.7, 1.2), sizeEnd: (o.size ?? 0.9) * 1.6,
        color: o.color ?? 0xe8dcc0, tile: 'dust', alpha: o.alpha ?? 0.7, additive: false, spin: 0,
      });
    }
  }

  starPop(pos, scale = 1) {
    this.burst(pos, { count: Math.round(16 * scale), speed: 7 * scale, color: [0xffe86a, 0xffffff, 0x8fd4ff, 0xff9ad0], tile: 'star', size: 0.6 * scale, life: 0.8, gravity: 6, yOff: 0.9 * scale });
    this.particle({ x: pos.x, y: 0.9 * scale, z: pos.z, size: 4 * scale, sizeEnd: 6 * scale, life: 0.25, color: 0xfff6c8, tile: 'glow', additive: true, spin: 0 });
    this.ring(pos, { r0: 0.3, r1: 2.6 * scale, life: 0.35, color: 0xfff6c8 });
  }

  sparkle(pos, o = {}) {
    this.particle({
      x: pos.x + rand(-0.4, 0.4) * (o.spread ?? 1), y: (pos.y ?? 0) + rand(0.2, 1.6) * (o.h ?? 1), z: pos.z + rand(-0.4, 0.4) * (o.spread ?? 1),
      vy: o.vy ?? 0.8, life: o.life ?? 0.8, size: o.size ?? 0.35, sizeEnd: 0.02,
      color: o.color ?? 0xffe86a, tile: 'star', additive: true, drag: 1, fadeIn: true,
    });
  }

  // ───────── 바닥 원/선/링/베기 ─────────
  telegraphCircle(pos, radius, dur, color = 0xff3a2a) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 }, uColor: { value: new THREE.Color().setHex(color, THREE.LinearSRGBColorSpace) }, uAlpha: { value: 1 }, uTime: { value: 0 } },
      vertexShader: T_VERT, fragmentShader: T_CIRCLE, transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.flat, mat);
    mesh.scale.set(radius * 2, 1, radius * 2);
    mesh.position.set(pos.x, 0.05, pos.z);
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    return this.track(mesh, dur, (t, o) => {
      mat.uniforms.uProgress.value = Math.min(1, t / dur);
      mat.uniforms.uTime.value = t;
      if (o.follow) mesh.position.set(o.follow.x, 0.05, o.follow.z);
    }, true);
  }

  telegraphLine(from, dir, length, width, dur, color = 0xff3a2a) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 }, uColor: { value: new THREE.Color().setHex(color, THREE.LinearSRGBColorSpace) }, uAlpha: { value: 1 }, uTime: { value: 0 } },
      vertexShader: T_VERT, fragmentShader: T_LINE, transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.lineGeo, mat);
    mesh.scale.set(width, 1, length);
    mesh.position.set(from.x, 0.06, from.z);
    mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    return this.track(mesh, dur, (t) => {
      mat.uniforms.uProgress.value = Math.min(1, t / dur);
      mat.uniforms.uTime.value = t;
    }, true);
  }

  ring(pos, { r0 = 0.5, r1 = 3, life = 0.4, color = 0xffffff, y = 0.08, additive = true, alpha = 0.9 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHex(color, THREE.LinearSRGBColorSpace), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: alpha });
    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.position.set(pos.x, y, pos.z);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    return this.track(mesh, life, (t) => {
      const k = t / life;
      const r = r0 + (r1 - r0) * (1 - Math.pow(1 - k, 3));
      mesh.scale.set(r, 1, r);
      mat.opacity = alpha * (1 - k);
    });
  }

  slash(pos, angle, { radius = 2.2, life = 0.16, color = 0xffffff, y = 0.9, flipX = false } = {}) {
    const mat = new THREE.MeshBasicMaterial({ map: this.slashTex, color: new THREE.Color().setHex(color, THREE.LinearSRGBColorSpace), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.flat, mat);
    mesh.position.set(pos.x, y, pos.z);
    mesh.rotation.y = Math.atan2(-Math.cos(angle), -Math.sin(angle));
    mesh.scale.set(radius * 2 * (flipX ? -1 : 1), 1, radius * 2);
    mesh.renderOrder = 7;
    this.scene.add(mesh);
    return this.track(mesh, life, (t) => {
      const k = t / life;
      mat.opacity = 1 - k * k;
      const s = radius * 2 * (0.85 + 0.25 * k);
      mesh.scale.set(s * (flipX ? -1 : 1), 1, s);
    });
  }

  track(mesh, life, update, keepGeo = false) {
    const o = { mesh, t: 0, life, update, done: false, remove: () => (o.done = true) };
    this.temp.push(o);
    return o;
  }

  // ───────── 데미지 숫자·글자 (DOM) ─────────
  setLayer(el) {
    this.layer = el;
  }

  text(pos, str, { color = '#ffffff', size = 1, life = 0.9, rise = 1.6, cls = '' } = {}) {
    if (!this.layer) return;
    const el = document.createElement('div');
    el.className = 'fxnum ' + cls;
    el.textContent = str;
    el.style.color = color;
    el.style.fontSize = `calc(${size} * var(--num-size))`;
    this.layer.appendChild(el);
    this.nums.push({ el, x: pos.x + rand(-0.3, 0.3), y: (pos.y ?? 0) + 1.6, z: pos.z, t: 0, life, rise, vx: rand(-0.5, 0.5) });
    if (this.nums.length > 40) {
      const n = this.nums.shift();
      n.el.remove();
    }
  }

  damage(pos, amount, { crit = false, poison = false } = {}) {
    const n = Math.max(1, Math.round(amount));
    if (crit) this.text(pos, n + '!', { color: '#ffd84a', size: 1.5, cls: 'crit' });
    else if (poison) this.text(pos, String(n), { color: '#8af06a', size: 0.85 });
    else this.text(pos, String(n), { color: '#ffffff', size: 1 });
  }

  update(dt, rawDt) {
    this.normal.update(dt);
    this.add.update(dt);
    for (let i = this.temp.length - 1; i >= 0; i--) {
      const o = this.temp[i];
      o.t += dt;
      if (!o.done) o.update(o.t, o);
      if (o.done || o.t >= o.life) {
        o.mesh.removeFromParent();
        o.mesh.material.dispose();
        this.temp.splice(i, 1);
      }
    }
    // DOM 숫자
    const v = TMP_V;
    const w = innerWidth, h = innerHeight;
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.t += rawDt;
      const k = n.t / n.life;
      if (k >= 1) {
        n.el.remove();
        this.nums.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3);
      v.set(n.x + n.vx * k, n.y + n.rise * ease, n.z);
      v.project(G.camera);
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.7 : k < 0.22 ? 1.3 - ((k - 0.12) / 0.1) * 0.3 : 1;
      n.el.style.transform = `translate(-50%,-50%) translate(${sx}px,${sy}px) scale(${pop})`;
      n.el.style.opacity = String(clamp((1 - k) * 3, 0, 1));
    }
  }

  clear() {
    this.normal.clear();
    this.add.clear();
    for (const o of this.temp) {
      o.mesh.removeFromParent();
      o.mesh.material.dispose();
    }
    this.temp = [];
    for (const n of this.nums) n.el.remove();
    this.nums = [];
  }
}
