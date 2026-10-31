// 진행 저장 (localStorage). 저장이 막힌 환경(시크릿 모드 등)에서도 게임은 그대로 돈다.
const KEY = 'hercules12_save_v1';
export const PLAY_LOG_MAX = 60;

function fresh() {
  return {
    version: 1,
    prologueDone: false,
    tutorialDone: false,
    assigned: 0, // 왕에게 받은 과업 번호 (가장 최근)
    labors: {}, // { [n]: { cleared, stars:[bool,bool,bool], bestTime } }
    pendingReport: 0, // 과업을 마치고 왕에게 보고할 번호
    endingSeen: false,
    level: 1,
    exp: 0,
    picks: { atk: 0, hp: 0, spd: 0 },
    coins: 0,
    shop: { heart: 0, club: 0, bread: 0, map: 0 }, // bread: 가진 꿀빵 수, map: 가진 보물 지도 수
    skills: [], // 'bow' | 'rattle' | 'spear'
    gear: [], // 'lion','deer','tusk','heart5','horse','belt','heart10','apple','cerberus'
    cards: [],
    playLog: [], // 과업을 마칠 때마다 한 줄 (부모님 메뉴 "플레이 기록", 최근 PLAY_LOG_MAX 개)
    settings: {
      music: 0.6,
      sfx: 0.9,
      voice: true,
      vibrate: true,
      quality: 'auto',
      unlockAll: false,
      assist: false, // 항상 도움 모드 (적이 천천히 공격)
      playTime: 0, // 놀이 시간 알림 (분, 0 = 끔)
      childName: '우리 아이',
    },
  };
}

// ───────── 저장 코드 (다른 기기·홈 화면 앱으로 옮기기) ─────────
// 아이폰은 사파리와 "홈 화면에 추가"한 앱이 저장소를 따로 쓰고, 사파리는 오래 안 쓴 사이트의 저장을 지울 수 있다.
const CODE_PREFIX = 'H12-';
const QUALITIES = ['auto', 'high', 'mid', 'low'];

// 밖에서 들어온 데이터는 아는 칸만, 알맞은 값만 골라 담는다 (숫자는 숫자로, 이름표는 짧은 영문 id 로)
function sanitize(d) {
  if (!d || typeof d !== 'object' || d.version !== 1) return null;
  const base = fresh();
  const num = (v, def, min = 0, max = 1e9) => (v !== null && v !== '' && Number.isFinite(+v) ? Math.min(max, Math.max(min, +v)) : def);
  const bool = (v) => v === true;
  const ids = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && /^[a-z0-9_]{1,24}$/.test(x)))] : []);
  const out = base;
  out.prologueDone = bool(d.prologueDone);
  out.tutorialDone = bool(d.tutorialDone);
  out.endingSeen = bool(d.endingSeen);
  out.specialHint = bool(d.specialHint);
  out.shieldHint = bool(d.shieldHint);
  out.assigned = num(d.assigned, 0, 0, 12);
  out.pendingReport = num(d.pendingReport, 0, 0, 12);
  out.level = Math.floor(num(d.level, 1, 1, 99));
  out.exp = num(d.exp, 0);
  out.coins = Math.floor(num(d.coins, 0));
  out.hero = num(d.hero, 0, 0, 100);
  for (const k of Object.keys(base.picks)) out.picks[k] = Math.floor(num(d.picks?.[k], 0, 0, 99));
  for (const k of Object.keys(base.shop)) out.shop[k] = Math.floor(num(d.shop?.[k], 0, 0, 9));
  out.skills = ids(d.skills);
  out.gear = ids(d.gear);
  out.cards = ids(d.cards);
  out.sideSeen = Array.isArray(d.sideSeen) ? d.sideSeen.filter((x) => (Number.isInteger(x) && x >= 1 && x <= 12) || (typeof x === 'string' && /^p\d{1,2}$/.test(x))) : [];
  for (let n = 1; n <= 12; n++) {
    const l = d.labors?.[n];
    if (!l || typeof l !== 'object') continue;
    out.labors[n] = { cleared: bool(l.cleared), stars: [0, 1, 2].map((i) => bool(l.stars?.[i])), bestTime: num(l.bestTime, 9999), bestCombo: Math.floor(num(l.bestCombo, 0)) };
  }
  const s = d.settings || {};
  out.settings.music = num(s.music, base.settings.music, 0, 1);
  out.settings.sfx = num(s.sfx, base.settings.sfx, 0, 1);
  for (const k of ['voice', 'vibrate', 'unlockAll', 'assist']) out.settings[k] = typeof s[k] === 'boolean' ? s[k] : base.settings[k];
  out.settings.quality = QUALITIES.includes(s.quality) ? s.quality : 'auto';
  out.settings.playTime = [0, 20, 30, 45].includes(s.playTime) ? s.playTime : 0;
  out.settings.childName = typeof s.childName === 'string' && s.childName.trim() ? s.childName.trim().slice(0, 12) : base.settings.childName;
  return out;
}

export class Save {
  constructor() {
    this.data = fresh();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const base = fresh();
        this.data = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, picks: { ...base.picks, ...(d.picks || {}) }, shop: { ...base.shop, ...(d.shop || {}) } };
      }
    } catch (e) {
      console.warn('save load failed', e);
    }
  }

  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      /* 저장 불가 환경 */
    }
  }

  // 플레이 기록은 이 기기 것이므로 빼서 코드를 짧게
  exportCode() {
    const { playLog, ...rest } = this.data;
    void playLog;
    const bytes = new TextEncoder().encode(JSON.stringify(rest));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return CODE_PREFIX + btoa(bin);
  }

  // 잘못된 코드면 null
  static parseCode(code) {
    try {
      const t = String(code || '').replace(/\s+/g, '');
      if (!t.startsWith(CODE_PREFIX)) return null;
      const bin = atob(t.slice(CODE_PREFIX.length));
      const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
      return sanitize(d);
    } catch (e) {
      return null;
    }
  }

  // 진행을 코드의 것으로 바꿈 (이 기기의 플레이 기록은 그대로)
  importData(d) {
    const log = this.data.playLog;
    this.data = d;
    this.data.playLog = log || [];
    this.write();
  }

  reset() {
    const settings = this.data.settings;
    this.data = fresh();
    this.data.settings = settings;
    this.write();
  }

  get hasProgress() {
    return this.data.prologueDone;
  }

  laborState(n) {
    return this.data.labors[n] || { cleared: false, stars: [false, false, false] };
  }

  clearedCount() {
    return Object.values(this.data.labors).filter((l) => l.cleared).length;
  }

  starCount() {
    return Object.values(this.data.labors).reduce((s, l) => s + (l.stars || []).filter(Boolean).length, 0);
  }

  // 다음으로 해야 할 과업 번호 (1~12), 다 했으면 13
  nextLabor() {
    for (let n = 1; n <= 12; n++) if (!this.laborState(n).cleared) return n;
    return 13;
  }

  isUnlocked(n) {
    if (this.data.settings.unlockAll) return true;
    if (this.laborState(n).cleared) return true;
    return n <= this.data.assigned;
  }

  has(key) {
    return this.data.gear.includes(key) || this.data.skills.includes(key);
  }

  addGear(key) {
    if (!this.data.gear.includes(key)) this.data.gear.push(key);
  }

  addSkill(key) {
    if (!this.data.skills.includes(key)) this.data.skills.push(key);
  }

  addCard(key) {
    if (!this.data.cards.includes(key)) {
      this.data.cards.push(key);
      return true;
    }
    return false;
  }
}
