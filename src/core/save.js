// 진행 저장 (localStorage). 저장이 막힌 환경(시크릿 모드 등)에서도 게임은 그대로 돈다.
const KEY = 'hercules12_save_v1';

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
    shop: { heart: 0, club: 0, bread: 0 },
    skills: [], // 'bow' | 'rattle' | 'spear'
    gear: [], // 'lion','deer','tusk','heart5','horse','belt','heart10','apple','cerberus'
    cards: [],
    settings: {
      music: 0.6,
      sfx: 0.9,
      voice: true,
      vibrate: true,
      quality: 'auto',
      unlockAll: false,
      childName: '우리 아이',
    },
  };
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
