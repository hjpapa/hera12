// HUD: 하트 · 레벨/경험치 · 동전 · 목표 · 보스 체력 · 콤보 · 알림 · 배너 · 연타 게이지 · 상황 버튼
import { G } from '../core/context.js';
import { el, onTap } from './dom.js';
import { expToNext } from '../game/stats.js';
import { waitReal } from '../core/script.js';

const PRAISE = { 5: '멋져!', 10: '대단해!', 20: '진짜 영웅!', 30: '전설이야!', 50: '신들도 깜짝!' };

export class HUD {
  constructor(root) {
    this.root = el('div', 'hud', root);
    const top = el('div', 'hud-top', this.root);
    const left = el('div', 'hud-left', top);
    this.hearts = el('div', 'hearts', left);
    const lv = el('div', 'lvrow', left);
    this.lv = el('div', 'lv', lv, 'Lv.1');
    const eb = el('div', 'expbar', lv);
    this.expFill = el('div', 'fill', eb);
    this.center = el('div', 'hud-center', top);
    this.objective = el('div', 'objective hidden', this.center);
    this.bossEl = el('div', 'boss hidden', this.center);
    this.bossName = el('div', 'bname', this.bossEl);
    const bb = el('div', 'bbar', this.bossEl);
    this.bossLag = el('div', 'lag', bb);
    this.bossFill = el('div', 'fill', bb);
    this.counterEl = el('div', 'counter hidden', this.center);
    const right = el('div', 'hud-right', top);
    this.breadEl = el('div', 'coins bread hidden', right); // 가진 꿀빵 (상점)
    this.coins = el('div', 'coins', right);
    this.coinImg = el('img', '', this.coins);
    this.coinTxt = el('span', '', this.coins, '0');
    this.pauseBtn = el('div', 'pausebtn', right);
    this.pauseImg = el('img', '', this.pauseBtn);
    onTap(this.pauseBtn, () => G.input.press('pause'));

    this.comboEl = el('div', 'combo hidden', this.root);
    this.toastEl = el('div', 'toast hidden', this.root);
    this.bannerEl = el('div', 'banner hidden', this.root);
    this.flashEl = el('div', 'screenflash', root);
    this.vignette = el('div', 'vignette', root);
    this.fxLayer = el('div', 'fxlayer', root);
    this.mashEl = el('div', 'mash hidden', this.root);
    this.ctxLabel = null;
    this.boss = null;
    this.lagFrac = 1;
    this.lastHp = -1;
  }

  init() {
    this.coinImg.src = G.sprites.iconURL('coin');
    this.pauseImg.src = G.sprites.iconURL('pause');
    G.fx.setLayer(this.fxLayer);
    const b = G.input.btn;
    b.dash.querySelector('img').src = G.sprites.iconURL('dash');
    b.swap.querySelector('img').src = G.sprites.iconURL('swap');
    b.special.querySelector('img').src = G.sprites.iconURL('star');
    this.heroRing = b.special.querySelector('.gauge circle');
    this.ctxLabel = b.attack.querySelector('.lbl');
    this.attackImg = b.attack.querySelector('img');
    this.skillImg = b.skill.querySelector('img');
    this.skillRing = b.skill.querySelector('.cd circle');
    this.updateAll();
  }

  show(v) {
    this.root.classList.toggle('hidden', !v);
  }

  updateAll() {
    this.updateHero();
    this.updateHearts();
    this.updateExp();
    this.updateCoins();
    this.updateBread();
    this.updateButtons();
  }

  updateBread() {
    const n = G.save.data.shop.bread || 0;
    this.breadEl.classList.toggle('hidden', n <= 0);
    this.breadEl.textContent = `🍯 ${n}`;
  }

  updateHearts() {
    const p = G.player;
    if (!p) return;
    const n = Math.ceil(p.maxHp / 2);
    if (this.hearts.children.length !== n) {
      this.hearts.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const h = el('div', 'heart', this.hearts);
        el('div', 'hfill', h);
      }
    }
    const hp = Math.max(0, p.hp);
    [...this.hearts.children].forEach((h, i) => {
      const f = Math.max(0, Math.min(1, (hp - i * 2) / 2));
      h.firstChild.style.width = f * 100 + '%';
      h.classList.toggle('empty', f <= 0);
    });
    if (this.lastHp > hp) {
      this.hearts.classList.remove('shake');
      void this.hearts.offsetWidth;
      this.hearts.classList.add('shake');
    }
    this.lastHp = hp;
    this.vignette.classList.toggle('low', hp > 0 && hp <= 2);
  }

  // 필살기 게이지: 별 버튼 테두리가 차오르고, 가득 차면 반짝반짝
  updateHero() {
    const p = G.player;
    const b = G.input.btn.special;
    if (!p || !b || !this.heroRing) return;
    const k = Math.min(1, (p.hero || 0) / 100);
    this.heroRing.style.strokeDashoffset = String(289 * (1 - k));
    b.classList.toggle('ready', k >= 1);
  }

  updateExp() {
    const d = G.save.data;
    this.lv.textContent = 'Lv.' + d.level;
    this.expFill.style.width = Math.min(100, (d.exp / expToNext(d.level)) * 100) + '%';
  }

  updateCoins() {
    this.coinTxt.textContent = G.save.data.coins.toLocaleString('ko-KR');
    this.coins.classList.remove('bump');
    void this.coins.offsetWidth;
    this.coins.classList.add('bump');
  }

  updateButtons(flash = false) {
    const p = G.player;
    if (!p || !this.skillImg) return;
    const b = G.input.btn;
    const has = !!p.skill;
    b.skill.classList.toggle('hidden', !has);
    b.swap.classList.toggle('hidden', !(p.skills.length > 1));
    b.skill.classList.toggle('locked', p.skillsLocked);
    if (has) this.skillImg.src = G.sprites.iconURL(p.skill);
    if (flash) {
      b.skill.classList.remove('pop');
      void b.skill.offsetWidth;
      b.skill.classList.add('pop');
    }
  }

  setObjective(text) {
    if (!text) {
      this.objective.classList.add('hidden');
      return;
    }
    this.objective.innerHTML = '<span class="star">★</span> ' + text;
    this.objective.classList.remove('hidden');
    this.objective.classList.remove('pop');
    void this.objective.offsetWidth;
    this.objective.classList.add('pop');
  }

  setBoss(e, name) {
    // 보스 체력 바가 켜져 있던 시간 = 보스전 시간 (?report 밸런스 기록)
    if (this.boss && this.boss !== e) G.stage?.bossFightEnd?.(this.boss);
    if (e && e !== this.boss) G.stage?.bossFightStart?.(e, name || e.title);
    this.boss = e;
    if (!e) {
      this.bossEl.classList.add('hidden');
      return;
    }
    this.bossName.textContent = name || e.title || '';
    this.bossEl.classList.remove('hidden');
    this.lagFrac = 1;
    this.updateBoss(e);
  }

  updateBoss(e) {
    if (e !== this.boss) return;
    const f = e.bossFrac ? e.bossFrac() : Math.max(0, e.hp / e.maxHp);
    this.bossFill.style.width = f * 100 + '%';
    if (e.bossColor) this.bossFill.style.background = e.bossColor;
  }

  counter(text) {
    if (text === null || text === undefined) {
      this.counterEl.classList.add('hidden');
      return;
    }
    this.counterEl.textContent = text;
    this.counterEl.classList.remove('hidden');
    this.counterEl.classList.remove('pop');
    void this.counterEl.offsetWidth;
    this.counterEl.classList.add('pop');
  }

  combo(n) {
    if (n < 2) {
      this.comboEl.classList.add('hidden');
      return;
    }
    const praise = PRAISE[n];
    this.comboEl.innerHTML = `<b>${n}</b> 콤보!` + (praise ? `<div class="praise">${praise}</div>` : '');
    this.comboEl.classList.remove('hidden');
    this.comboEl.classList.remove('pop');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('pop');
    if (praise) G.audio.play('star');
  }

  toast(text, dur = 2.2) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.remove('pop');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('pop');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), dur * 1000);
  }

  async banner(title, sub = '', dur = 2.4) {
    if (G.debug.auto) dur = 0.2;
    this.bannerEl.innerHTML = `<div class="btitle">${title}</div>` + (sub ? `<div class="bsub">${sub}</div>` : '');
    this.bannerEl.classList.remove('hidden', 'out');
    this.bannerEl.classList.remove('pop');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('pop');
    G.audio.play('door');
    await waitReal(dur);
    this.bannerEl.classList.add('out');
    await waitReal(0.4);
    this.bannerEl.classList.add('hidden');
  }

  hurtFlash() {
    this.flashEl.className = 'screenflash red';
    void this.flashEl.offsetWidth;
    this.flashEl.className = 'screenflash red go';
  }

  flash(kind = 'white') {
    this.flashEl.className = 'screenflash ' + kind;
    void this.flashEl.offsetWidth;
    this.flashEl.className = 'screenflash ' + kind + ' go';
  }

  // 연타 게이지: 큰 버튼을 빠르게 눌러 채우기 → Promise<boolean>
  mash({ title = '꽉 잡기!', hint = '큰 버튼을 톡톡톡!', goal = 18, time = 8, decay = 1.2, onTap: tapFn = null } = {}) {
    return new Promise((res) => {
      this.mashEl.innerHTML = `<div class="mtitle">${title}</div><div class="mbar"><div class="mfill"></div></div><div class="mhint">${hint}</div>`;
      this.mashEl.classList.remove('hidden');
      const fill = this.mashEl.querySelector('.mfill');
      const st = { v: 0, t: time, goal, decay, res, fill, tapFn };
      this.mashState = st;
      G.input.btn.attack.classList.add('mashing');
      if (this.ctxLabel) this.ctxLabel.textContent = '톡톡!';
      if (G.debug.auto) st.v = goal * 2;
    });
  }

  updateMash(dt) {
    const st = this.mashState;
    if (!st) return;
    const inp = G.input;
    if (inp.pressed.attack) {
      inp.pressed.attack = false;
      st.v += 1;
      G.audio.play('mash', { p: st.v / st.goal });
      G.input.vibrate(8);
      G.rig.shake(0.08);
      st.tapFn?.(st.v / st.goal);
      st.fill.parentElement.classList.remove('bump');
      void st.fill.offsetWidth;
      st.fill.parentElement.classList.add('bump');
    }
    st.v = Math.max(0, st.v - st.decay * dt);
    st.t -= dt;
    st.fill.style.width = Math.min(100, (st.v / st.goal) * 100) + '%';
    const done = st.v >= st.goal;
    if (done || st.t <= 0) {
      this.mashState = null;
      this.mashEl.classList.add('hidden');
      G.input.btn.attack.classList.remove('mashing');
      st.res(done);
    }
  }

  update(dt, rawDt) {
    const p = G.player;
    this.updateMash(rawDt);
    if (!p || !this.ctxLabel) return;
    // 상황에 따라 큰 버튼 바뀜
    const c = p.context;
    const icon = this.mashState ? 'grab' : c ? c.icon : p.weaponMode === 'fist' ? 'fist' : 'attack';
    const label = this.mashState ? '톡톡!' : c ? c.label : '';
    if (this.curIcon !== icon) {
      this.curIcon = icon;
      this.attackImg.src = G.sprites.iconURL(icon);
      G.input.btn.attack.classList.toggle('context', !!c);
    }
    if (this.ctxLabel.textContent !== label) this.ctxLabel.textContent = label;
    // 스킬 쿨타임 링
    if (p.skill && this.skillRing) {
      const cdMax = { bow: 0.45, rattle: 4, spear: 1.6 }[p.skill] || 1;
      const k = Math.max(0, (p.cd[p.skill] || 0) / cdMax);
      const off = Math.round(289 * (1 - k));
      if (off !== this.lastRing) {
        this.lastRing = off;
        this.skillRing.style.strokeDashoffset = String(off);
        G.input.btn.skill.classList.toggle('cooling', k > 0);
      }
    }
    // 보스 체력 잔상
    if (this.boss) {
      const f = this.boss.bossFrac ? this.boss.bossFrac() : Math.max(0, this.boss.hp / this.boss.maxHp);
      const lag = this.lagFrac + (f - this.lagFrac) * Math.min(1, rawDt * 3);
      if (Math.abs(lag - this.lagFrac) > 0.001) this.bossLag.style.width = lag * 100 + '%';
      this.lagFrac = lag;
    }
  }
}
