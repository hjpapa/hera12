// 3D 소품 (로우폴리 + 툰 셰이딩). 장난감 디오라마 느낌.
// Builder 는 한 스테이지의 World 에 묶여서 소품을 추가하고 충돌 원을 등록한다.
// Codex가 manifest.models 에 GLB를 등록하면 같은 이름의 소품 대신 쓸 수 있다 (loadModels 참고).
import * as THREE from 'three';
import { SPRITE_UNIFORMS } from './billboard.js';
import { seeded, smoothNoise, TAU, lerp } from '../core/util.js';

let gradient = null;
function gradMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([120, 200, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const MATS = new Map();
export function toon(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradMap(), ...opts });
    m.userData.shared = true;
    MATS.set(key, m);
  }
  return m;
}

const GEOS = new Map();
function geo(key, make) {
  let g = GEOS.get(key);
  if (!g) {
    g = make();
    g.userData.shared = true;
    GEOS.set(key, g);
  }
  return g;
}

function mesh(g, m, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

// ───────── 물 셰이더 ─────────
const W_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vWorld;
  varying float vDepth;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    wp.y += sin(wp.x * 0.8 + uTime * 1.6) * 0.04 + cos(wp.z * 0.7 + uTime * 1.3) * 0.04;
    vWorld = wp.xz;
    vec4 mv = viewMatrix * wp;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const W_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uAlpha;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec2 uFlow;
  varying vec2 vWorld;
  varying float vDepth;
  void main() {
    vec2 p = vWorld + uFlow * uTime;
    float w = sin(p.x * 1.3 + sin(p.y * 0.9 + uTime) * 1.2) * sin(p.y * 1.1 - uTime * 0.7);
    float rip = smoothstep(0.55, 0.85, w);
    vec3 col = mix(uColor, uColor2, rip * 0.8);
    float f = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, uAlpha);
  }
`;
export const WATER_TIME = { value: 0 };

function rawColor(hex) {
  return new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
}

export function waterMaterial(color = 0x3a8fd8, color2 = 0x9fd8ff, alpha = 0.9, flow = [0, 0]) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: WATER_TIME,
      uColor: { value: rawColor(color) },
      uColor2: { value: rawColor(color2) },
      uAlpha: { value: alpha },
      uFlow: { value: new THREE.Vector2(flow[0], flow[1]) },
      ...SPRITE_UNIFORMS,
    },
    vertexShader: W_VERT,
    fragmentShader: W_FRAG,
    transparent: alpha < 1,
  });
}

// 하늘 그라데이션 배경
export function skyTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ───────── 소품 공장 ─────────
export class Builder {
  constructor(world, seed = 7) {
    this.world = world;
    this.root = world.root;
    this.rnd = seeded(seed);
  }

  r(a = 0, b = 1) {
    return a + this.rnd() * (b - a);
  }

  add(o) {
    this.root.add(o);
    return o;
  }

  collider(x, z, r) {
    this.world.addCollider(x, z, r);
  }

  // 땅: 원형 섬 또는 사각형. 색 얼룩은 꼭짓점 색으로.
  ground({ shape = 'circle', r = 30, w = 60, h = 60, x = 0, z = 0, color = 0x8fc25a, color2 = 0x76a84a, seg = 48, edge = 0x8a6a4a, edgeH = 3, noiseScale = 0.12, y = 0 } = {}) {
    let g;
    if (shape === 'circle') g = new THREE.CircleGeometry(r, seg * 2, 0, TAU);
    else g = new THREE.PlaneGeometry(w, h, Math.ceil(w / 2), Math.ceil(h / 2));
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c1 = new THREE.Color(color), c2 = new THREE.Color(color2), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) + x, pz = pos.getZ(i) + z;
      const n = smoothNoise(px * noiseScale, pz * noiseScale) * 0.7 + smoothNoise(px * noiseScale * 3, pz * noiseScale * 3) * 0.3;
      tmp.copy(c1).lerp(c2, n);
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradMap() }), false);
    m.position.set(x, y, z);
    this.add(m);
    if (edge !== null && edgeH > 0) {
      let side;
      if (shape === 'circle') side = new THREE.CylinderGeometry(r, r * 0.92, edgeH, seg * 2, 1, true);
      else side = new THREE.BoxGeometry(w, edgeH, h);
      const s = mesh(side, toon(edge, { side: THREE.DoubleSide }), false);
      s.position.set(x, y - edgeH / 2 - 0.01, z);
      this.add(s);
    }
    return m;
  }

  // 길 (폴리라인 리본): 아이들이 갈 곳을 눈으로 알 수 있게
  path(points, { width = 3, color = 0xe8d8a8, y = 0.02 } = {}) {
    const verts = [];
    const idx = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const [px, pz] = points[i];
      const [ax, az] = points[Math.max(0, i - 1)];
      const [bx, bz] = points[Math.min(n - 1, i + 1)];
      let dx = bx - ax, dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      const wob = width * (0.5 + 0.08 * Math.sin(i * 1.7));
      verts.push(px - dz * wob, y, pz + dx * wob, px + dz * wob, y, pz - dx * wob);
      if (i < n - 1) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = mesh(g, toon(color, { side: THREE.DoubleSide }), false);
    this.add(m);
    for (const [px, pz] of points) this.patch(px, pz, width * 0.55, color, y);
    return m;
  }

  patch(x, z, r, color, y = 0.025) {
    const g = geo('patch', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2));
    const m = mesh(g, toon(color), false);
    m.scale.set(r, 1, r);
    m.position.set(x, y, z);
    this.add(m);
    return m;
  }

  // 나무
  tree(kind, x, z, { s = 1, color = null, collide = true } = {}) {
    const grp = new THREE.Group();
    const r = (a, b) => this.r(a, b);
    s *= r(0.85, 1.15);
    const trunkC = kind === 'dead' ? 0x6a6070 : 0x8a5a2b;
    const trunk = mesh(geo('trunk', () => new THREE.CylinderGeometry(0.22, 0.32, 1, 6)), toon(trunkC));
    const leaf = (g, c, px, py, pz, sx, sy, sz) => {
      const m = mesh(g, toon(c));
      m.position.set(px, py, pz);
      m.scale.set(sx, sy, sz);
      grp.add(m);
      return m;
    };
    const ico = geo('ico1', () => new THREE.IcosahedronGeometry(1, 1));
    const ico0 = geo('ico0', () => new THREE.IcosahedronGeometry(1, 0));
    const cone = geo('cone', () => new THREE.ConeGeometry(1, 1, 7));
    switch (kind) {
      case 'olive': {
        trunk.scale.set(1, 1.6, 1);
        trunk.position.y = 0.8;
        trunk.rotation.z = r(-0.15, 0.15);
        grp.add(trunk);
        const c = color ?? 0x9ab46a;
        leaf(ico, c, 0, 2.0, 0, 1.3, 0.9, 1.2);
        leaf(ico, 0x86a05a, 0.7, 1.7, 0.2, 0.9, 0.7, 0.9);
        leaf(ico, 0xa8c47a, -0.6, 1.8, -0.2, 0.8, 0.6, 0.8);
        break;
      }
      case 'cypress': {
        trunk.scale.set(0.8, 0.8, 0.8);
        trunk.position.y = 0.4;
        grp.add(trunk);
        leaf(ico, color ?? 0x3f6e3a, 0, 2.2, 0, 0.75, 2.0, 0.75);
        break;
      }
      case 'pine': {
        trunk.position.y = 0.5;
        grp.add(trunk);
        const snowy = color === 'snow' || this.snow;
        const c = color && color !== 'snow' ? color : 0x3f7a4a;
        [[1.5, 1.3, 1.4], [1.15, 1.2, 2.2], [0.8, 1.1, 2.9]].forEach(([rad, h, y]) => {
          leaf(cone, c, 0, y, 0, rad, h, rad);
          if (snowy) leaf(cone, 0xf4f8ff, 0, y + h * 0.28, 0, rad * 0.6, h * 0.45, rad * 0.6);
        });
        break;
      }
      case 'round': {
        trunk.scale.set(1, 1.4, 1);
        trunk.position.y = 0.7;
        grp.add(trunk);
        const c = color ?? 0x6fae4a;
        leaf(ico, c, 0, 2.1, 0, 1.4, 1.3, 1.4);
        leaf(ico, c, 0.6, 2.6, 0.3, 0.8, 0.8, 0.8);
        break;
      }
      case 'palm': {
        for (let i = 0; i < 4; i++) {
          const t = mesh(geo('trunk', () => new THREE.CylinderGeometry(0.22, 0.32, 1, 6)), toon(0xa07a4a));
          t.position.set(i * 0.12, 0.5 + i * 0.9, 0);
          t.rotation.z = -0.12;
          t.scale.set(1 - i * 0.12, 0.95, 1 - i * 0.12);
          grp.add(t);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const l = leaf(ico0, color ?? 0x5aa04a, 0.4 + Math.cos(a) * 0.9, 3.6, Math.sin(a) * 0.9, 1.0, 0.12, 0.35);
          l.rotation.y = -a;
          l.rotation.z = -0.4;
        }
        break;
      }
      case 'dead': {
        trunk.scale.set(0.8, 2.2, 0.8);
        trunk.position.y = 1.1;
        grp.add(trunk);
        for (let i = 0; i < 3; i++) {
          const b = mesh(geo('trunk', () => new THREE.CylinderGeometry(0.22, 0.32, 1, 6)), toon(trunkC));
          b.scale.set(0.35, 1.0, 0.35);
          b.position.set(Math.cos(i * 2.1) * 0.4, 1.6 + i * 0.35, Math.sin(i * 2.1) * 0.4);
          b.rotation.set(Math.sin(i * 2.1) * 0.8, 0, -Math.cos(i * 2.1) * 0.8);
          grp.add(b);
        }
        break;
      }
      case 'apple': {
        trunk.scale.set(1.5, 2.0, 1.5);
        trunk.position.y = 1;
        grp.add(trunk);
        leaf(ico, color ?? 0x4a9a4a, 0, 3.2, 0, 2.4, 1.8, 2.4);
        leaf(ico, 0x5aae5a, 1.0, 3.8, 0.6, 1.3, 1.1, 1.3);
        const gold = toon(0xf5c542, { emissive: 0x6a4a00 });
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU;
          const ap = mesh(geo('apple', () => new THREE.IcosahedronGeometry(0.28, 1)), gold, false);
          ap.position.set(Math.cos(a) * 2.1, 2.7 + Math.sin(i * 3) * 0.6, Math.sin(a) * 2.1);
          grp.add(ap);
        }
        break;
      }
    }
    grp.position.set(x, 0, z);
    grp.scale.setScalar(s);
    grp.rotation.y = this.r(0, TAU);
    this.add(grp);
    if (collide) this.collider(x, z, 0.45 * s + (kind === 'apple' ? 0.6 : 0));
    return grp;
  }

  rock(x, z, { s = 1, color = 0x9a9488, collide = true, y = 0 } = {}) {
    const m = mesh(geo('ico0', () => new THREE.IcosahedronGeometry(1, 0)), toon(color));
    const sx = s * this.r(0.8, 1.2), sy = s * this.r(0.55, 0.9), sz = s * this.r(0.8, 1.2);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y + sy * 0.45, z);
    m.rotation.set(this.r(0, 1), this.r(0, TAU), this.r(0, 1));
    this.add(m);
    if (collide) this.collider(x, z, Math.max(sx, sz) * 0.9);
    return m;
  }

  bush(x, z, { s = 1, color = 0x5a9a4a, flowers = null } = {}) {
    const grp = new THREE.Group();
    const ico = geo('ico1', () => new THREE.IcosahedronGeometry(1, 1));
    for (let i = 0; i < 3; i++) {
      const m = mesh(ico, toon(i === 1 ? color : new THREE.Color(color).offsetHSL(0, 0, 0.05).getHex()));
      m.scale.setScalar(0.55 - i * 0.08);
      m.position.set((i - 1) * 0.45, 0.4, (i % 2) * 0.2);
      grp.add(m);
    }
    if (flowers) {
      for (let i = 0; i < 4; i++) {
        const f = mesh(geo('flower', () => new THREE.IcosahedronGeometry(0.11, 0)), toon(flowers), false);
        f.position.set(this.r(-0.7, 0.7), this.r(0.5, 0.9), this.r(-0.3, 0.4));
        grp.add(f);
      }
    }
    grp.position.set(x, 0, z);
    grp.scale.setScalar(s);
    this.add(grp);
    return grp;
  }

  flowers(x, z, r, n = 12, colors = [0xff8fb4, 0xffd84a, 0xffffff, 0xb08aff]) {
    const g = geo('flower', () => new THREE.IcosahedronGeometry(0.11, 0));
    const inst = new THREE.InstancedMesh(g, toon(0xffffff), n);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = this.r(0, TAU), d = Math.sqrt(this.rnd()) * r;
      m4.makeTranslation(x + Math.cos(a) * d, 0.12, z + Math.sin(a) * d);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, c.setHex(colors[i % colors.length]));
    }
    this.add(inst);
    return inst;
  }

  grass(x, z, r, n = 20, color = 0x6a9a3a) {
    const g = geo('blade', () => new THREE.ConeGeometry(0.08, 0.5, 3).translate(0, 0.25, 0));
    const inst = new THREE.InstancedMesh(g, toon(color), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = this.r(0, TAU), d = Math.sqrt(this.rnd()) * r;
      e.set(this.r(-0.3, 0.3), this.r(0, TAU), this.r(-0.3, 0.3));
      q.setFromEuler(e);
      const s = this.r(0.6, 1.4);
      sc.set(s, s, s);
      p.set(x + Math.cos(a) * d, 0, z + Math.sin(a) * d);
      m4.compose(p, q, sc);
      inst.setMatrixAt(i, m4);
    }
    this.add(inst);
    return inst;
  }

  column(x, z, { h = 4, broken = false, color = 0xf4efe4, collide = true, r = 0.42 } = {}) {
    const grp = new THREE.Group();
    const hh = broken ? h * this.r(0.35, 0.65) : h;
    const shaft = mesh(geo('col', () => new THREE.CylinderGeometry(1, 1.08, 1, 10)), toon(color));
    shaft.scale.set(r, hh, r);
    shaft.position.y = hh / 2 + 0.2;
    grp.add(shaft);
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    const base = mesh(box, toon(color));
    base.scale.set(r * 2.6, 0.3, r * 2.6);
    base.position.y = 0.15;
    grp.add(base);
    if (!broken) {
      const cap = mesh(box, toon(color));
      cap.scale.set(r * 2.7, 0.32, r * 2.7);
      cap.position.y = hh + 0.35;
      grp.add(cap);
    }
    grp.position.set(x, 0, z);
    this.add(grp);
    if (collide) this.collider(x, z, r * 1.3);
    return grp;
  }

  // 그리스 신전
  temple(x, z, { w = 10, d = 7, h = 5, rot = 0, color = 0xf4efe4, roof = 0xd9774b, trim = 0x3a8fd8, cols = 6, collide = true } = {}) {
    const grp = new THREE.Group();
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    for (let i = 0; i < 3; i++) {
      const st = mesh(box, toon(i % 2 ? 0xe8e0d0 : color));
      st.scale.set(w + 1.6 - i * 0.6, 0.3, d + 1.6 - i * 0.6);
      st.position.y = 0.15 + i * 0.3;
      grp.add(st);
    }
    const colH = h;
    const cylG = geo('col', () => new THREE.CylinderGeometry(1, 1.08, 1, 10));
    for (const zz of [-d / 2 + 0.6, d / 2 - 0.6]) {
      for (let i = 0; i < cols; i++) {
        const cx = -w / 2 + 0.6 + (i * (w - 1.2)) / (cols - 1);
        const c = mesh(cylG, toon(color));
        c.scale.set(0.36, colH, 0.36);
        c.position.set(cx, 0.9 + colH / 2, zz);
        grp.add(c);
      }
    }
    const wall = mesh(box, toon(0xe8e0d0));
    wall.scale.set(w - 2.4, colH, d - 2.4);
    wall.position.y = 0.9 + colH / 2;
    grp.add(wall);
    const arch = mesh(box, toon(color));
    arch.scale.set(w + 0.4, 0.6, d + 0.4);
    arch.position.y = 0.9 + colH + 0.3;
    grp.add(arch);
    const band = mesh(box, toon(trim));
    band.scale.set(w + 0.45, 0.18, d + 0.45);
    band.position.y = 0.9 + colH + 0.2;
    grp.add(band);
    // 박공 지붕
    const prism = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
    prism.rotateZ(Math.PI / 2);
    prism.rotateX(Math.PI / 6);
    const rf = mesh(prism, toon(roof));
    rf.scale.set(w + 0.8, 1.4, (d + 0.8) / 1.73);
    rf.position.y = 0.9 + colH + 0.6 + 0.7;
    grp.add(rf);
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    this.add(grp);
    if (collide) {
      // 직사각형 → 원 여러 개로 근사
      const c = Math.cos(rot), s = Math.sin(rot);
      const nx = Math.ceil(w / 2), nz = Math.ceil(d / 2);
      for (let i = 0; i <= nx; i++) {
        for (let j = 0; j <= nz; j++) {
          const lx = -w / 2 + (i * w) / nx, lz = -d / 2 + (j * d) / nz;
          this.collider(x + lx * c + lz * s, z - lx * s + lz * c, 1.3);
        }
      }
    }
    return grp;
  }

  house(x, z, { w = 4, d = 3.5, h = 2.6, rot = 0, color = 0xf4efe4, roof = 0xd9774b, door = 0x3a8fd8 } = {}) {
    const grp = new THREE.Group();
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    const b = mesh(box, toon(color));
    b.scale.set(w, h, d);
    b.position.y = h / 2;
    grp.add(b);
    const prism = geo('prism', () => new THREE.CylinderGeometry(1, 1, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(Math.PI / 6));
    const rf = mesh(prism, toon(roof));
    rf.scale.set(w + 0.5, 0.9, (d + 0.6) / 1.73);
    rf.position.y = h + 0.45;
    grp.add(rf);
    const dr = mesh(box, toon(door));
    dr.scale.set(0.9, 1.5, 0.1);
    dr.position.set(0, 0.75, d / 2 + 0.02);
    grp.add(dr);
    const win = mesh(box, toon(0x5a8fc8));
    win.scale.set(0.6, 0.6, 0.1);
    win.position.set(w * 0.28, h * 0.6, d / 2 + 0.02);
    grp.add(win);
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    this.add(grp);
    const rr = Math.max(w, d) * 0.55;
    this.collider(x, z, rr);
    return grp;
  }

  wall(x1, z1, x2, z2, { h = 1.6, t = 0.8, color = 0xd8ccb0, collide = true } = {}) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), toon(color));
    m.scale.set(len, h, t);
    m.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2);
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    this.add(m);
    if (collide) {
      const n = Math.max(1, Math.ceil(len / 0.9));
      for (let i = 0; i <= n; i++) this.collider(lerp(x1, x2, i / n), lerp(z1, z2, i / n), t * 0.75);
    }
    return m;
  }

  fence(x1, z1, x2, z2, { color = 0xb07a42, collide = true } = {}) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / 1.4));
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    for (let i = 0; i <= n; i++) {
      const p = mesh(box, toon(color));
      p.scale.set(0.2, 1.1, 0.2);
      p.position.set(lerp(x1, x2, i / n), 0.55, lerp(z1, z2, i / n));
      this.add(p);
    }
    for (const yy of [0.45, 0.85]) {
      const rail = mesh(box, toon(color));
      rail.scale.set(len, 0.12, 0.1);
      rail.position.set((x1 + x2) / 2, yy, (z1 + z2) / 2);
      rail.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      this.add(rail);
    }
    if (collide) for (let i = 0; i <= n * 2; i++) this.collider(lerp(x1, x2, i / (n * 2)), lerp(z1, z2, i / (n * 2)), 0.35);
  }

  mountain(x, z, { r = 8, h = 10, color = 0x8a8f7a, snow = true, snowColor = 0xf4f8ff } = {}) {
    const grp = new THREE.Group();
    const g = new THREE.ConeGeometry(r, h, 7, 1);
    const m = mesh(g, toon(color), false);
    m.position.y = h / 2;
    grp.add(m);
    if (snow) {
      const s = mesh(new THREE.ConeGeometry(r * 0.36, h * 0.36, 7, 1), toon(snowColor), false);
      s.position.y = h - h * 0.18 + 0.02;
      grp.add(s);
    }
    grp.position.set(x, 0, z);
    grp.rotation.y = this.r(0, TAU);
    this.add(grp);
    return grp;
  }

  cloud(x, y, z, s = 1, color = 0xffffff) {
    const grp = new THREE.Group();
    const ico = geo('ico1', () => new THREE.IcosahedronGeometry(1, 1));
    const n = 4;
    for (let i = 0; i < n; i++) {
      const m = mesh(ico, toon(color), false);
      m.scale.setScalar(this.r(0.8, 1.3));
      m.position.set((i - n / 2) * 1.1, this.r(-0.2, 0.3), this.r(-0.4, 0.4));
      grp.add(m);
    }
    grp.position.set(x, y, z);
    grp.scale.setScalar(s);
    this.add(grp);
    return grp;
  }

  water(x, z, { w = 10, h = 10, r = null, color = 0x3a8fd8, color2 = 0x9fd8ff, alpha = 0.92, y = 0.03, flow = [0, 0] } = {}) {
    const g = r ? new THREE.CircleGeometry(r, 40) : new THREE.PlaneGeometry(w, h, Math.ceil(w / 2), Math.ceil(h / 2));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, waterMaterial(color, color2, alpha, flow));
    m.position.set(x, y, z);
    m.receiveShadow = false;
    m.renderOrder = 1;
    this.add(m);
    return m;
  }

  // 과업의 문 (기둥 두 개 + 상인방 + 빛나는 막)
  portal(x, z, { rot = 0, color = 0xf4efe4, glow = 0xffe86a, label = null } = {}) {
    const grp = new THREE.Group();
    const cylG = geo('col', () => new THREE.CylinderGeometry(1, 1.08, 1, 10));
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    for (const sx of [-1.4, 1.4]) {
      const c = mesh(cylG, toon(color));
      c.scale.set(0.32, 3.4, 0.32);
      c.position.set(sx, 1.9, 0);
      grp.add(c);
      const b = mesh(box, toon(color));
      b.scale.set(0.9, 0.3, 0.9);
      b.position.set(sx, 0.15, 0);
      grp.add(b);
    }
    const lintel = mesh(box, toon(color));
    lintel.scale.set(3.8, 0.45, 0.8);
    lintel.position.y = 3.8;
    grp.add(lintel);
    const veilMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.4), veilMat);
    veil.position.y = 1.9;
    grp.add(veil);
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    this.add(grp);
    this.collider(x + Math.cos(rot) * 1.4, z - Math.sin(rot) * 1.4, 0.45);
    this.collider(x - Math.cos(rot) * 1.4, z + Math.sin(rot) * 1.4, 0.45);
    return { group: grp, veil, veilMat };
  }

  cave(x, z, { r = 4, rot = 0, color = 0x8a7a6a, collide = true } = {}) {
    const grp = new THREE.Group();
    const dome = mesh(new THREE.SphereGeometry(r, 10, 6, 0, TAU, 0, Math.PI / 2), toon(color));
    dome.scale.set(1, 0.8, 1);
    grp.add(dome);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1a1210 }));
    hole.position.set(0, 0.02, r * 0.96);
    hole.scale.set(1, 1.4, 1);
    grp.add(hole);
    for (let i = 0; i < 5; i++) {
      const rk = mesh(geo('ico0', () => new THREE.IcosahedronGeometry(1, 0)), toon(new THREE.Color(color).offsetHSL(0, 0, -0.06).getHex()));
      const a = (i / 5) * TAU;
      rk.scale.setScalar(this.r(0.6, 1.2));
      rk.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
      grp.add(rk);
    }
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    this.add(grp);
    if (collide) this.collider(x, z, r * 0.9);
    return grp;
  }

  // 에우리스테우스의 청동 항아리
  jar(x, z, { s = 1 } = {}) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI) * 0.9 + (t > 0.9 ? 0.15 : 0), t * 2.2));
    }
    const g = new THREE.LatheGeometry(pts, 14);
    const m = mesh(g, toon(0xc8883a, { emissive: 0x2a1500 }));
    const grp = new THREE.Group();
    grp.add(m);
    const rim = mesh(new THREE.TorusGeometry(0.42, 0.1, 6, 16), toon(0xe0a050));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 2.2;
    grp.add(rim);
    grp.position.set(x, 0, z);
    grp.scale.setScalar(s);
    this.add(grp);
    this.collider(x, z, 1.0 * s);
    return grp;
  }

  stable(x, z, { w = 16, d = 8, rot = 0 } = {}) {
    const grp = new THREE.Group();
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    const wood = toon(0xa0683a), dark = toon(0x7a4a2a);
    const back = mesh(box, wood); back.scale.set(w, 3, 0.4); back.position.set(0, 1.5, -d / 2); grp.add(back);
    for (const sx of [-1, 1]) {
      const side = mesh(box, wood); side.scale.set(0.4, 3, d); side.position.set((sx * w) / 2, 1.5, 0); grp.add(side);
    }
    for (let i = 0; i <= 4; i++) {
      const post = mesh(box, dark); post.scale.set(0.35, 3.2, 0.35); post.position.set(-w / 2 + (i * w) / 4, 1.6, d / 2); grp.add(post);
    }
    const prism = geo('prism', () => new THREE.CylinderGeometry(1, 1, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(Math.PI / 6));
    const rf = mesh(prism, toon(0xc0703a));
    rf.scale.set(w + 1, 1.4, (d + 1.2) / 1.73);
    rf.position.y = 3.7;
    grp.add(rf);
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    this.add(grp);
    return grp;
  }

  // 별자리 제단 (마을 한가운데)
  altar(x, z) {
    const grp = new THREE.Group();
    const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
    const cyl = new THREE.CylinderGeometry(2.6, 3, 0.6, 12);
    const b = mesh(cyl, toon(0xf4efe4)); b.position.y = 0.3; grp.add(b);
    const b2 = mesh(new THREE.CylinderGeometry(1.8, 2.2, 0.6, 12), toon(0xe8e0d0)); b2.position.y = 0.9; grp.add(b2);
    const bowl = mesh(new THREE.CylinderGeometry(1.5, 0.9, 0.6, 12), toon(0x3a4aa0)); bowl.position.y = 1.5; grp.add(bowl);
    for (let i = 0; i < 4; i++) {
      const p = mesh(box, toon(0xd4a23a));
      p.scale.set(0.3, 0.3, 0.3);
      const a = (i / 4) * TAU + Math.PI / 4;
      p.position.set(Math.cos(a) * 2.4, 0.75, Math.sin(a) * 2.4);
      grp.add(p);
    }
    grp.position.set(x, 0, z);
    this.add(grp);
    this.collider(x, z, 2.8);
    return grp;
  }

  torch(x, z, { h = 2.2, collide = true } = {}) {
    const grp = new THREE.Group();
    const pole = mesh(geo('trunk', () => new THREE.CylinderGeometry(0.22, 0.32, 1, 6)), toon(0x6a4a2a));
    pole.scale.set(0.5, h, 0.5);
    pole.position.y = h / 2;
    grp.add(pole);
    const bowl = mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.3, 8), toon(0xc8883a));
    bowl.position.y = h;
    grp.add(bowl);
    const flame = new THREE.Mesh(geo('flame', () => new THREE.ConeGeometry(0.28, 0.7, 6)), new THREE.MeshBasicMaterial({ color: 0xffa83a }));
    flame.position.y = h + 0.45;
    grp.add(flame);
    grp.position.set(x, 0, z);
    grp.userData.flame = flame;
    this.add(grp);
    if (collide) this.collider(x, z, 0.35);
    this.world.flames.push(flame);
    return grp;
  }

  boat(x, z, { color = 0x6a4a2a, s = 1, rot = 0 } = {}) {
    const grp = new THREE.Group();
    const hull = mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.8, 10, 1, false, 0, Math.PI), toon(color));
    hull.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    hull.scale.set(1, 2.6, 1);
    hull.position.y = 0.4;
    grp.add(hull);
    const deck = mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), toon(0x8a6a4a));
    deck.scale.set(1.8, 0.15, 5.4);
    deck.position.y = 0.45;
    grp.add(deck);
    grp.position.set(x, 0, z);
    grp.rotation.y = rot;
    grp.scale.setScalar(s);
    this.add(grp);
    return grp;
  }

  // 헬리오스의 황금 잔
  cup(x, z, { s = 1 } = {}) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector2(0.4 + Math.pow(t, 0.6) * 2.2, t * 1.6));
    }
    const g = new THREE.LatheGeometry(pts, 20);
    const m = mesh(g, toon(0xf5c542, { emissive: 0x5a3a00, side: THREE.DoubleSide }));
    const grp = new THREE.Group();
    grp.add(m);
    const foot = mesh(new THREE.CylinderGeometry(0.5, 0.9, 0.4, 14), toon(0xe0a830));
    foot.position.y = -0.1;
    grp.add(foot);
    grp.position.set(x, 0, z);
    grp.scale.setScalar(s);
    this.add(grp);
    return grp;
  }

  // 반원 경계 장식: 걷기 영역 바깥에 나무/바위를 둘러 심기
  ringDecor(cx, cz, r0, r1, n, fn) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.r(-0.15, 0.15);
      const d = this.r(r0, r1);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (this.world.walkable(x, z, 1.2)) continue;
      fn(x, z, i);
    }
  }

  // 영역 안 아무 곳 (걷기 영역 밖만)
  scatter(n, x0, z0, x1, z1, fn, margin = 1.5) {
    let placed = 0;
    for (let tries = 0; tries < n * 6 && placed < n; tries++) {
      const x = this.r(x0, x1), z = this.r(z0, z1);
      if (this.world.walkable(x, z, margin)) continue;
      fn(x, z, placed++);
    }
  }
}

// 소품 공통 정리: 공유 지오메트리/재질은 지우지 않는다
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => { if (!m.userData.shared) m.dispose(); });
    }
  });
}

export function updateFlames(world, t) {
  for (const f of world.flames) {
    const k = 1 + Math.sin(t * 17 + f.id) * 0.12 + Math.sin(t * 7.3 + f.id * 2) * 0.08;
    f.scale.set(1 / k, k, 1 / k);
  }
}

