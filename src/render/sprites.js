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
    this.storyLoading = {};
    // 뒤에서 받는 캐릭터 그림 (첫 실행): 줄을 세워 4장씩 받고, 지금 필요한 그림은 줄 앞으로
    this.queue = [];
    this.waiting = {}; // id → { promise, resolve } (아직 못 받은 그림)
    this.progress = { done: 0, total: 0 };
    this.allLoaded = false;
    this.ready = Promise.resolve();
    this.onProgress = null;
  }

  loadOne(id, url) {
    return loadImage('assets/' + url)
      .then((img) => {
        this.images[id] = img;
        // 받기 전에 임시 그림으로 먼저 보였으면 진짜 그림으로 바꿔 끼움 (그림 비율은 sprites.js 기준으로 같음)
        const t = this.textures[id];
        if (t) {
          t.image = img;
          t.needsUpdate = true;
        }
        delete this.canvases[id];
        delete this.urls['portrait_' + id];
      })
      .catch(() => console.warn('[assets] 불러오기 실패:', id, url));
  }

  // 이 그림들을 먼저 받는다 (스테이지에 들어갈 때). 다 받으면(또는 실패하면) 끝나는 Promise
  want(ids) {
    const set = new Set(ids.filter((id) => this.waiting[id]));
    if (!set.size) return Promise.resolve();
    this.queue = [...this.queue.filter((q) => set.has(q.id)), ...this.queue.filter((q) => !set.has(q.id))];
    return Promise.all([...set].map((id) => this.waiting[id].promise));
  }

  // 아직 못 받은 그림 수 (ids 중에서)
  missing(ids) {
    return ids.filter((id) => this.waiting[id]).length;
  }

  async init() {
    try {
      const r = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (r.ok) this.manifest = { ...this.manifest, ...(await r.json()) };
    } catch (e) {
      /* manifest 없음 → 전부 임시 그림 */
    }
    // 그림을 다 받은 뒤에야 타이틀이 뜨면 휴대폰 데이터에서 한참 빈 화면이라 (약 18MB, LTE 15초)
    // 타이틀에 쓰는 그림만 먼저 받고, 나머지 캐릭터 그림은 타이틀을 띄운 뒤 뒤에서 받는다.
    // 스테이지를 열기 전에는 ready 를 기다린다 (임시 그림이 캐시에 남지 않게). 그림책 그림은 펼칠 때 받는다.
    const entries = Object.entries(this.manifest.sprites || {});
    const boot = (id) => id === 'hercules_lion' || id.startsWith('icon_');
    await Promise.all(entries.filter(([id]) => boot(id)).map(([id, url]) => this.loadOne(id, url)));
    const rest = entries.filter(([id]) => !boot(id));
    this.progress = { done: 0, total: rest.length };
    for (const [id] of rest) {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      this.waiting[id] = { promise, resolve };
    }
    this.queue = rest.map(([id, url]) => ({ id, url }));
    const worker = async () => {
      while (this.queue.length) {
        const { id, url } = this.queue.shift();
        await this.loadOne(id, url);
        this.waiting[id].resolve();
        delete this.waiting[id];
        this.progress.done++;
        this.onProgress?.(this.progress);
      }
    };
    this.ready = Promise.all([worker(), worker(), worker(), worker()]).then(() => (this.allLoaded = true));
  }

  // 그림책 그림 (펼칠 때 받음, 없으면 null)
  loadStory(id) {
    if (this.images[id]) return Promise.resolve(this.images[id]);
    const url = this.manifest.story?.[id];
    if (!url) return Promise.resolve(null);
    return (this.storyLoading[id] ||= this.loadOne(id, url).then(() => this.images[id] || null));
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

  // 스테이지가 바뀔 때: 늘 쓰는 그림(헤라클레스·무기·항아리·아이콘)만 남기고 GPU 텍스처를 내린다
  releaseUnused() {
    for (const id of Object.keys(this.textures)) {
      if (/^(hercules|w_|amphora|icon_)/.test(id)) continue;
      this.textures[id].dispose();
      delete this.textures[id];
    }
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
