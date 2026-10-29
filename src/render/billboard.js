// 종이 인형 빌보드: 항상 카메라를 바라보는 그룹 안에 몸통·무기 같은 2D 부품을 붙인다.
// 그룹 로컬 좌표: x = 화면 오른쪽, y = 위, z = 카메라 쪽.
import * as THREE from 'three';
import { G } from '../core/context.js';

export const GEO = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
const GEO_CENTER = new THREE.PlaneGeometry(1, 1);

export const SPRITE_UNIFORMS = {
  uFogColor: { value: new THREE.Color(1, 1, 1) },
  uFogNear: { value: 40 },
  uFogFar: { value: 120 },
  uTint: { value: new THREE.Color(1, 1, 1) },
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec4 uUv;
  uniform float uFlash;
  uniform vec3 uFlashColor;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uTint;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec4 c = texture2D(map, uUv.xy + vUv * uUv.zw);
    if (c.a < 0.45) discard;
    vec3 col = c.rgb * uColor * uTint;
    col = mix(col, uFlashColor, uFlash);
    float f = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

export function spriteMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uUv: { value: new THREE.Vector4(0, 0, 1, 1) },
      uFlash: { value: 0 },
      uFlashColor: { value: new THREE.Color(1, 1, 1) },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      ...SPRITE_UNIFORMS,
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  });
}

export class Billboard {
  constructor(id, { scale = 1 } = {}) {
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    this.scale = scale;
    this.parts = {};
    this.flip = 1;
    this.sx = 1;
    this.sy = 1;
    this.roll = 0;
    this.lift = 0;
    this.body = this.makePart(id, scale);
    this.pivot.add(this.body.mesh);
    this.bar = null;
  }

  makePart(id, scale = 1, center = false) {
    const tex = G.sprites.texture(id);
    const mat = spriteMaterial(tex);
    const mesh = new THREE.Mesh(center ? GEO_CENTER : GEO, mat);
    const h = G.sprites.def(id).worldH * scale;
    const w = h * G.sprites.aspect(id);
    mesh.scale.set(w, h, 1);
    return { mesh, mat, id, w, h, scale };
  }

  get height() {
    return this.body.h;
  }

  get width() {
    return this.body.w;
  }

  setSprite(id) {
    if (this.body.id === id) return;
    const b = this.body;
    b.id = id;
    b.mat.uniforms.map.value = G.sprites.texture(id);
    b.h = G.sprites.def(id).worldH * b.scale;
    b.w = b.h * G.sprites.aspect(id);
    b.mesh.scale.set(b.w, b.h, 1);
  }

  // 부품 추가 (손잡이/아래쪽 가운데가 x,y 에 오도록)
  addPart(name, id, { x = 0, y = 0, z = 0.02, scale = 1, center = false } = {}) {
    const p = this.makePart(id, scale * this.scale, center);
    p.mesh.position.set(x, y, z);
    this.pivot.add(p.mesh);
    this.parts[name] = p;
    return p;
  }

  setPartSprite(name, id) {
    const p = this.parts[name];
    if (!p || p.id === id) return;
    p.id = id;
    p.mat.uniforms.map.value = G.sprites.texture(id);
    p.h = G.sprites.def(id).worldH * p.scale;
    p.w = p.h * G.sprites.aspect(id);
    p.mesh.scale.set(p.w, p.h, 1);
  }

  removePart(name) {
    const p = this.parts[name];
    if (!p) return;
    this.pivot.remove(p.mesh);
    p.mat.dispose();
    delete this.parts[name];
  }

  setFlash(v, color = 0xffffff) {
    this.body.mat.uniforms.uFlash.value = v;
    this.body.mat.uniforms.uFlashColor.value.setHex(color, THREE.LinearSRGBColorSpace);
    for (const p of Object.values(this.parts)) {
      p.mat.uniforms.uFlash.value = v;
      p.mat.uniforms.uFlashColor.value.setHex(color, THREE.LinearSRGBColorSpace);
    }
  }

  setOpacity(v) {
    const all = [this.body, ...Object.values(this.parts)];
    for (const p of all) {
      p.mat.uniforms.uOpacity.value = v;
      p.mat.transparent = v < 0.999;
    }
  }

  setColor(hex) {
    this.body.mat.uniforms.uColor.value.setHex(hex, THREE.LinearSRGBColorSpace);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  // 머리 위 체력 바
  showBar(frac, color = 0xff5a4a) {
    if (!this.bar) {
      const bg = new THREE.Mesh(GEO_CENTER, new THREE.MeshBasicMaterial({ color: 0x2a1a10, depthTest: true }));
      const fg = new THREE.Mesh(GEO_CENTER, new THREE.MeshBasicMaterial({ color }));
      const w = Math.min(1.6, Math.max(0.9, this.body.w * 0.6));
      bg.scale.set(w + 0.08, 0.2, 1);
      fg.scale.set(w, 0.12, 1);
      fg.position.z = 0.01;
      const g = new THREE.Group();
      g.add(bg, fg);
      g.position.y = this.body.h + 0.35;
      this.group.add(g);
      this.bar = { g, fg, w, t: 0 };
    }
    this.bar.fg.scale.x = Math.max(0.001, this.bar.w * frac);
    this.bar.fg.position.x = -(this.bar.w - this.bar.w * frac) / 2;
    this.bar.g.visible = true;
    this.bar.t = 3;
  }

  update(dt) {
    this.group.quaternion.copy(G.camera.quaternion);
    this.pivot.scale.set(this.flip * this.sx, this.sy, 1);
    this.pivot.rotation.z = this.roll * this.flip;
    this.pivot.position.y = this.lift;
    if (this.bar && this.bar.t > 0) {
      this.bar.t -= dt;
      if (this.bar.t <= 0) this.bar.g.visible = false;
    }
  }

  dispose() {
    this.body.mat.dispose();
    for (const p of Object.values(this.parts)) p.mat.dispose();
    if (this.bar) {
      this.bar.g.children.forEach((m) => m.material.dispose());
    }
    this.group.removeFromParent();
  }
}
