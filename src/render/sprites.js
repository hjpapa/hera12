// 스프라이트 저장소: manifest.json 에 등록된 PNG가 있으면 쓰고, 없으면 paint.js 로 임시 그림을 그린다.
import * as THREE from 'three';
import { SPRITES } from '../data/sprites.js';
import * as P from './paint.js';

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

const FALLBACK = { paint: 'prop:boulder', worldH: 1 };

export class SpriteBank {
  constructor() {
    this.manifest = { sprites: {}, audio: {}, music: {}, story: {}, models: {} };
    this.images = {};
    this.canvases = {};
    this.textures = {};
    this.urls = {};
  }

  async init() {
    try {
      const r = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (r.ok) this.manifest = { ...this.manifest, ...(await r.json()) };
    } catch (e) {
      /* manifest 없음 → 전부 임시 그림 */
    }
    const all = { ...(this.manifest.sprites || {}), ...(this.manifest.story || {}) };
    await Promise.all(
      Object.entries(all).map(([id, url]) =>
        loadImage('assets/' + url)
          .then((img) => (this.images[id] = img))
          .catch(() => console.warn('[assets] 불러오기 실패:', id, url)),
      ),
    );
  }

  def(id) {
    return SPRITES[id] || FALLBACK;
  }

  hasAsset(id) {
    return !!this.images[id];
  }

  // 이미지 또는 캔버스
  source(id) {
    if (this.images[id]) return this.images[id];
    if (this.canvases[id]) return this.canvases[id];
    const c = this.paint(id);
    this.canvases[id] = c;
    return c;
  }

  paint(id) {
    if (id.startsWith('icon_')) return P.icon(id.slice(5));
    const def = this.def(id);
    const o = { ...(def.o || {}) };
    const scale = 2; // 해상도 배율
    const w = (def.w || 256) * scale, h = (def.h || 256) * scale;
    o.w = w;
    o.h = h;
    const [kind, sub] = def.paint.split(':');
    switch (kind) {
      case 'humanoid': return P.humanoid(o);
      case 'quadruped': return P.quadruped(o);
      case 'bird': return P.bird(o);
      case 'serpentHead': return P.serpentHead(o);
      case 'crab': return P.crab(o);
      case 'blob': return P.blob(o);
      case 'prop': return P.prop(sub, o);
      case 'weapon': {
        const c = P.weapon(sub);
        return c;
      }
    }
    return P.prop('boulder', o);
  }

  aspect(id) {
    const s = this.source(id);
    return s.width / s.height;
  }

  texture(id) {
    if (this.textures[id]) return this.textures[id];
    const src = this.source(id);
    const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
    t.colorSpace = THREE.NoColorSpace; // 스프라이트 셰이더는 sRGB 값을 그대로 출력
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 2;
    t.needsUpdate = true;
    this.textures[id] = t;
    return t;
  }

  // UI 아이콘 data URL
  iconURL(name) {
    const id = 'icon_' + name;
    if (this.urls[id]) return this.urls[id];
    let url;
    if (this.manifest.sprites?.[id]) url = 'assets/' + this.manifest.sprites[id];
    else url = this.source(id).toDataURL();
    this.urls[id] = url;
    return url;
  }

  // 대화창 얼굴 (스프라이트 위쪽 잘라내기)
  portraitURL(id) {
    const key = 'portrait_' + id;
    if (this.urls[key]) return this.urls[key];
    if (this.manifest.sprites?.[key]) return (this.urls[key] = 'assets/' + this.manifest.sprites[key]);
    const src = this.source(id);
    const r = this.def(id).portrait || [0, 0, 1, 1];
    const sw = src.width * r[2], sh = src.height * r[3];
    const size = 256;
    const [c, x] = P.makeCanvas(size, size);
    const s = Math.min(size / sw, size / sh);
    x.drawImage(src, src.width * r[0], src.height * r[1], sw, sh, (size - sw * s) / 2, (size - sh * s) / 2, sw * s, sh * s);
    return (this.urls[key] = c.toDataURL());
  }

  // 그림책 컷신 이미지 (있으면)
  storyImage(id) {
    return this.images[id] || null;
  }
}
