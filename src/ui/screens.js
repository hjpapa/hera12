// 전체 화면 창들: 타이틀 · 일시정지 · 설정 · 과업 지도 · 레벨업 · 결과 · 그림책 · 보상 · 도감 · 상점
import { G, pause, resume } from '../core/context.js';
import { el, onTap, esc } from './dom.js';
import { Save } from '../core/save.js';
import { LABORS, missingStars } from '../data/labors.js';
import { CARDS } from '../data/cards.js';
import { PICKS } from '../game/stats.js';
import { storyCanvas, CONSTELLATION, CONST_LINES } from './storyart.js';
import { waitReal } from '../core/script.js';

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone;
}

export async function goFullscreen() {
  try {
    const d = document.documentElement;
    if (!document.fullscreenElement && d.requestFullscreen) await d.requestFullscreen({ navigationUI: 'hide' });
    else if (d.webkitRequestFullscreen) d.webkitRequestFullscreen();
  } catch (e) {
    /* 지원 안 함 */
  }
  try {
    await screen.orientation?.lock?.('landscape');
  } catch (e) {
    /* 지원 안 함 */
  }
}

export class Screens {
  constructor(root) {
    this.uiRoot = root;
    this.root = el('div', 'screens', root);
    this.fadeEl = el('div', 'fade', root);
    this.stack = [];
  }

  get open() {
    return this.stack.length > 0;
  }

  overlay(cls, { pauseGame = true } = {}) {
    const o = el('div', 'overlay ' + cls, this.root);
    this.stack.push(o);
    if (pauseGame) pause('screen');
    G.input.setVisible(false);
    requestAnimationFrame(() => o.classList.add('in'));
    return o;
  }

  close(o) {
    this.stack = this.stack.filter((s) => s !== o);
    o.classList.remove('in');
    o.classList.add('out');
    setTimeout(() => o.remove(), 250);
    if (!this.stack.length) {
      resume('screen');
      if (!G.ui.cutscene && !G.ui.dialog.open) G.input.setVisible(true);
    }
  }

  // 첫 실행: 이 장면에 필요한 그림을 아직 받는 중이면 진행 막대를 보여 주며 기다림
  // (나머지 그림은 뒤에서 계속 받고, 받는 대로 임시 그림이 진짜 그림으로 바뀜)
  async waitAssets(ids) {
    const S = G.sprites;
    const total = S.missing(ids);
    if (!total) return;
    const wait = S.want(ids);
    const box = el('div', 'assetload', this.uiRoot);
    el('div', 'altitle', box, '그림을 불러오는 중…');
    const fill = el('div', 'alfill', el('div', 'albar', box));
    const show = () => (fill.style.width = Math.round(((total - S.missing(ids)) / total) * 100) + '%');
    show();
    S.onProgress = show;
    await wait;
    S.onProgress = null;
    box.remove();
  }

  async fade(on, dur = 0.35) {
    this.fadeEl.style.transitionDuration = dur + 's';
    this.fadeEl.classList.toggle('on', on);
    await waitReal(dur);
  }

  // 창(스크롤됨) + 오른쪽 위에 항상 보이는 ✕ 닫기. 창이 길어 아래 "닫기"가 화면 밖에 있어도 닫을 수 있게
  panel(o, cls, onClose) {
    const wrap = el('div', 'pwrap', o);
    const box = el('div', cls, wrap);
    const x = el('button', 'pclose', wrap, '✕');
    x.setAttribute('aria-label', '닫기');
    onTap(x, () => {
      G.audio.play('confirm');
      onClose();
    });
    return box;
  }

  button(parent, html, cls = '', fn = null) {
    const b = el('button', 'btn-ui ' + cls, parent, html);
    if (fn) onTap(b, () => {
      G.audio.unlock();
      G.audio.play('confirm');
      fn();
    });
    return b;
  }

  // ───────── 타이틀 ─────────
  title() {
    return new Promise((res) => {
      const o = this.overlay('title', { pauseGame: false });
      const sky = el('div', 'title-sky', o);
      for (let i = 0; i < 40; i++) {
        const s = el('div', 'tstar', sky);
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 70 + '%';
        s.style.animationDelay = Math.random() * 3 + 's';
      }
      const c = el('div', 'title-center', o);
      const hero = el('img', 'title-hero', c);
      hero.src = G.sprites.portraitURL('hercules_lion');
      el('div', 'logo', c, '헤라클레스의<br><span>열두 별</span>');
      el('div', 'logo-sub', c, '꼬마 영웅의 12과업 대모험');
      const btns = el('div', 'title-btns', c);
      const start = async (mode) => {
        G.audio.unlock();
        if (G.isTouch) await goFullscreen();
        this.close(o);
        res(mode);
      };
      if (G.save.hasProgress) {
        this.button(btns, '▶ 이어하기', 'big gold', () => start('continue'));
        this.button(btns, '처음부터', 'small', async () => {
          if (await this.confirm('처음부터 다시 할까요?<br><small>지금까지 모은 별이 사라져요.</small>', '처음부터', '아니요')) start('new');
        });
      } else {
        this.button(btns, '▶ 모험 시작!', 'big gold', () => start('new'));
      }
      const row = el('div', 'title-row', c);
      if (!G.isTouch || !isIOS()) this.button(row, '⛶ 전체 화면', 'small', () => goFullscreen());
      this.button(row, '⚙ 설정', 'small', () => this.settings());
      if (isIOS() && !isStandalone()) {
        el('div', 'ios-hint', c, '아이폰: 아래 <b>공유 버튼</b> → <b>홈 화면에 추가</b>를 하면 전체 화면으로 할 수 있어요!');
      }
      el('div', 'credit', o, '원작 시나리오 · ' + esc(G.save.data.settings.childName));
    });
  }

  // ───────── 일시정지 ─────────
  pauseMenu() {
    if (this.open) return;
    const o = this.overlay('menu');
    const box = this.panel(o, 'panel', () => this.close(o));
    el('div', 'ptitle', box, '잠깐 쉬어요');
    const stars = G.save.starCount();
    el('div', 'pinfo', box, `★ ${stars} / 36 &nbsp; · &nbsp; 과업 ${G.save.clearedCount()} / 12`);
    const list = el('div', 'plist', box);
    this.button(list, '▶ 계속하기', 'big gold', () => this.close(o));
    this.button(list, '🗺 과업 지도', '', async () => {
      const n = await this.laborMap({ travel: true });
      if (n) {
        this.close(o);
        G.game.goLabor(n);
      }
    });
    if (G.stage && G.stage.id !== 'hub') {
      this.button(list, '🏛 마을로 돌아가기', '', async () => {
        if (await this.confirm('과업을 그만두고 마을로 갈까요?', '마을로', '계속하기')) {
          this.close(o);
          G.game.goHub();
        }
      });
    }
    this.button(list, '🃏 카드 도감', '', () => this.cardBook());
    this.button(list, '⚙ 설정', '', () => this.settings());
  }

  // ───────── 설정 ─────────
  settings() {
    const o = this.overlay('menu');
    const box = this.panel(o, 'panel wide', () => this.close(o));
    el('div', 'ptitle', box, '설정');
    const s = G.save.data.settings;
    const grid = el('div', 'settings', box);
    const slider = (label, key, after) => {
      const row = el('label', 'srow', grid, `<span>${label}</span>`);
      const inp = el('input', '', row);
      inp.type = 'range';
      inp.min = 0;
      inp.max = 1;
      inp.step = 0.05;
      inp.value = s[key];
      inp.addEventListener('input', () => {
        s[key] = parseFloat(inp.value);
        after?.();
        G.save.write();
      });
    };
    const toggle = (label, key, after) => {
      const row = el('div', 'srow', grid, `<span>${label}</span>`);
      const b = el('button', 'tgl' + (s[key] ? ' on' : ''), row, s[key] ? '켜짐' : '꺼짐');
      onTap(b, () => {
        s[key] = !s[key];
        b.classList.toggle('on', s[key]);
        b.textContent = s[key] ? '켜짐' : '꺼짐';
        after?.();
        G.save.write();
        G.audio.play('select');
      });
    };
    slider('🎵 음악', 'music', () => G.audio.applyVolumes());
    slider('🔊 효과음', 'sfx', () => G.audio.applyVolumes());
    toggle('🗣 대사 읽어주기', 'voice', () => { if (!s.voice) G.audio.stopSpeak(); });
    toggle('📳 진동', 'vibrate');
    const qrow = el('div', 'srow', grid, '<span>🖼 화질</span>');
    const qs = el('div', 'seg', qrow);
    [['auto', '자동'], ['high', '높음'], ['mid', '보통'], ['low', '낮음']].forEach(([k, t]) => {
      const b = el('button', 'segb' + (s.quality === k ? ' on' : ''), qs, t);
      onTap(b, () => {
        s.quality = k;
        qs.querySelectorAll('.segb').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        G.save.write();
        G.game.applyQuality();
      });
    });
    const trow = el('div', 'srow', grid, '<span>⏰ 놀이 시간 알림</span>');
    const ts = el('div', 'seg', trow);
    [[0, '끄기'], [20, '20분'], [30, '30분'], [45, '45분']].forEach(([k, t]) => {
      const b = el('button', 'segb' + ((s.playTime || 0) === k ? ' on' : ''), ts, t);
      onTap(b, () => {
        s.playTime = k;
        ts.querySelectorAll('.segb').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        G.save.write();
        G.audio.play('select');
      });
    });
    const nrow = el('div', 'srow', grid, '<span>✏️ 원작자 이름</span>');
    const ni = el('input', 'name-in', nrow);
    ni.value = s.childName;
    ni.maxLength = 12;
    ni.addEventListener('change', () => {
      s.childName = ni.value.trim() || '우리 아이';
      G.save.write();
    });
    el('div', 'sgroup', grid, '부모님 메뉴');
    toggle('🦉 항상 도움 모드', 'assist', () => { G.assist = s.assist; });
    toggle('🔓 모든 과업 열기', 'unlockAll');
    const crow = el('div', 'srow', grid, '<span>💾 저장 코드</span>');
    onTap(el('button', 'tgl', crow, '열기'), () => { G.audio.play('select'); this.saveCode(); });
    const lrow = el('div', 'srow', grid, '<span>📊 플레이 기록</span>');
    onTap(el('button', 'tgl', lrow, '보기'), () => { G.audio.play('select'); this.playLog(); });
    const rrow = el('div', 'srow', grid, '<span>🗑 처음부터 다시</span>');
    const rb = el('button', 'tgl danger', rrow, '지우기');
    onTap(rb, async () => {
      if (await this.confirm('정말 모든 진행을 지울까요?', '지우기', '아니요')) {
        G.save.reset();
        location.reload();
      }
    });
    this.button(box, '닫기', 'gold', () => this.close(o));
  }

  // ───────── 진행이 멈췄을 때 (과업 진행 코드 오류) ─────────
  stageError() {
    return new Promise((res) => {
      const o = this.overlay('menu confirm');
      const box = el('div', 'panel', o);
      el('div', 'ptitle', box, '앗, 길을 잃었어!');
      el('div', 'cmsg', box, '다시 해 볼까?<br><small>보스 앞까지 왔으면 거기서부터 다시 해요.</small>');
      G.audio.speak('앗, 길을 잃었어! 다시 해 볼까?', { pitch: 1.2 });
      const row = el('div', 'crow', box);
      this.button(row, '다시 하기', 'gold', () => { this.close(o); res(true); });
      this.button(row, '마을로', '', () => { this.close(o); res(false); });
    });
  }

  // ───────── 놀이 시간 알림 ─────────
  // true: 조금 더 하기, false: 오늘은 그만 (쉬는 화면)
  async playTimeUp(min) {
    const i = await G.ui.dialog.choose('glau', `부엉! 벌써 ${min}분이나 모험했어. 오늘은 여기까지 할까? 지금까지 한 건 다 저장돼 있어!`, ['그만할래', '조금만 더 할래']);
    G.ui.dialog.hide();
    if (i === 1) return true;
    G.save.write();
    G.audio.music(null);
    G.audio.jingle('star');
    const o = this.overlay('rest');
    el('div', 'rest-moon', o, '🌙');
    el('div', 'rest-title', o, '오늘 모험 끝!');
    el('div', 'rest-sub', o, `영웅의 별 ★ ${G.save.starCount()} / 36 · 과업 ${G.save.clearedCount()} / 12`);
    el('div', 'rest-sub', o, '푹 쉬고, 내일 또 만나요!');
    G.audio.speak('오늘 모험 끝! 푹 쉬고, 내일 또 만나요!', { pitch: 1.2 });
    this.button(o, '처음 화면으로', 'small', () => location.reload());
    return new Promise(() => {}); // 처음 화면으로 갈 때까지 그대로
  }

  // ───────── 플레이 기록 (부모님용: 아이와 해 본 뒤 난이도 조정) ─────────
  playLog() {
    const o = this.overlay('menu');
    const box = this.panel(o, 'panel wide', () => this.close(o));
    el('div', 'ptitle', box, '📊 플레이 기록');
    const log = [...(G.save.data.playLog || [])].reverse();
    if (!log.length) {
      el('div', 'pinfo', box, '아직 기록이 없어요. 과업을 하나 마치면 여기에 남아요.');
    } else {
      el('div', 'loghelp', box, '시간은 대화·멈춤을 뺀 게임 시간이에요. 보스전이 너무 짧거나 길면 <b>src/game/enemy.js</b> 의 <b>BOSS_HP_SCALE</b> 을 바꿔 보세요.');
      const t = el('table', 'logtable', el('div', 'logwrap', box));
      const head = el('tr', '', el('thead', '', t));
      ['날짜', '과업', '시간', '레벨', '쓰러짐', '맞음', '보스전', '도움', '별'].forEach((h) => (el('th', '', head).textContent = h));
      const body = el('tbody', '', t);
      const two = (v) => String(v).padStart(2, '0');
      const mmss = (s) => `${Math.floor(s / 60)}:${two(Math.floor(s % 60))}`;
      for (const r of log) {
        const d = new Date(r.at || 0);
        const tr = el('tr', '', body);
        const cell = (v) => (el('td', '', tr).textContent = v);
        cell(r.at ? `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}` : '-');
        cell(`${r.n} ${r.title || ''}`);
        cell(mmss(+r.sec || 0));
        cell(r.level ?? '-');
        cell(r.faints ?? '-');
        cell(r.hurts ?? '-');
        cell((r.bosses || []).map((b) => `${b.name} ${b.sec}초`).join('\n') || '-');
        cell(r.assist ? '🦉' : '');
        cell((r.stars || []).map((s) => (s ? '★' : '☆')).join(''));
      }
      this.button(box, '기록 지우기', 'small', async () => {
        if (await this.confirm('플레이 기록을 모두 지울까요?<br><small>게임 진행은 그대로예요.</small>', '지우기', '아니요')) {
          G.save.data.playLog = [];
          G.save.write();
          this.close(o);
        }
      });
    }
    this.button(box, '닫기', 'gold', () => this.close(o));
  }

  // ───────── 저장 코드 (부모님용: 다른 기기·홈 화면 앱으로 옮기기) ─────────
  saveCode() {
    const o = this.overlay('menu');
    const box = this.panel(o, 'panel wide', () => this.close(o));
    el('div', 'ptitle', box, '💾 저장 코드');
    el('div', 'loghelp', box, '다른 기기나 홈 화면 앱으로 진행을 옮길 때 써요. 아이폰은 사파리와 홈 화면 앱의 저장이 따로라서, 옮기려면 이 코드가 필요해요.');
    el('div', 'csub', box, '이 기기의 저장 코드');
    const out = el('textarea', 'codebox', box);
    out.readOnly = true;
    out.value = G.save.exportCode();
    const copyBtn = this.button(box, '📋 복사하기', 'small', async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(out.value);
        ok = true;
      } catch (e) {
        out.focus();
        out.setSelectionRange(0, out.value.length);
        try { ok = document.execCommand('copy'); } catch (e2) { /* 지원 안 함 */ }
      }
      copyBtn.textContent = ok ? '✔ 복사했어요' : '코드를 길게 눌러 복사해 주세요';
    });
    el('div', 'csub', box, '다른 기기의 코드 불러오기');
    const inp = el('textarea', 'codebox', box);
    inp.placeholder = 'H12- 로 시작하는 코드를 붙여 넣어 주세요';
    const msg = el('div', 'loghelp', box);
    this.button(box, '📥 불러오기', 'small', async () => {
      const d = Save.parseCode(inp.value);
      if (!d) {
        msg.textContent = '코드가 올바르지 않아요. 처음부터 끝까지 빠짐없이 붙여 넣었는지 확인해 주세요.';
        G.audio.play('warn');
        return;
      }
      const cleared = Object.values(d.labors).filter((l) => l.cleared).length;
      if (await this.confirm(`이 코드로 바꿀까요?<br><small>과업 ${cleared} / 12 · Lv.${d.level} · 동전 ${d.coins}<br>지금 이 기기의 진행은 이 코드의 진행으로 바뀌어요.</small>`, '바꾸기', '아니요')) {
        G.save.importData(d);
        location.reload();
      }
    });
    this.button(box, '닫기', 'gold', () => this.close(o));
  }

  // ───────── 확인 ─────────
  confirm(html, yes = '네', no = '아니요') {
    return new Promise((res) => {
      const o = this.overlay('menu confirm');
      const box = el('div', 'panel', o);
      el('div', 'cmsg', box, html);
      const row = el('div', 'crow', box);
      this.button(row, yes, 'gold', () => { this.close(o); res(true); });
      this.button(row, no, '', () => { this.close(o); res(false); });
    });
  }

  // ───────── 과업 지도 ─────────
  laborMap({ travel = true } = {}) {
    return new Promise((res) => {
      const o = this.overlay('menu map');
      const box = this.panel(o, 'panel map', () => { this.close(o); res(null); });
      el('div', 'ptitle', box, '🗺 열두 과업 지도');
      const grid = el('div', 'mapgrid', box);
      for (const L of LABORS) {
        const st = G.save.laborState(L.n);
        const open = G.save.isUnlocked(L.n);
        const card = el('div', 'lcard' + (st.cleared ? ' cleared' : open ? ' open' : ' locked'), grid);
        el('div', 'lnum', card, L.n);
        const im = el('img', 'limg', card);
        im.src = G.sprites.portraitURL(L.sprite);
        el('div', 'lname', card, L.title);
        el('div', 'lstars', card, (st.stars || [false, false, false]).map((s) => (s ? '★' : '☆')).join(''));
        if (st.cleared) el('div', 'lmiss', card, missingStars(L, st).map((m) => m.icon).join(' ') || '✨');
        if (!open) el('div', 'llock', card, '🔒');
        if (open && travel) {
          onTap(card, () => {
            G.audio.play('confirm');
            this.close(o);
            res(L.n);
          });
        }
      }
      el('div', 'mhelp', box, '남은 별: 🏺 숨은 황금 항아리 · 🎯 도전 · ✨ 다 모았어요');
      el('div', 'mhelp', box, G.save.data.settings.unlockAll ? '모든 과업이 열려 있어요 (부모님 메뉴)' : '왕에게 말을 걸면 다음 과업이 열려요');
      this.button(box, '닫기', '', () => { this.close(o); res(null); });
    });
  }

  // ───────── 레벨 업 ─────────
  levelUp() {
    if (G.debug.auto) return Promise.resolve('atk');
    return new Promise((res) => {
      const o = this.overlay('levelup');
      el('div', 'lvtitle', o, `레벨 업! <b>Lv.${G.save.data.level}</b>`);
      el('div', 'lvsub', o, '하나를 골라 더 강해지자!');
      const row = el('div', 'picks', o);
      G.audio.jingle('levelup');
      // 창이 뜬 직후의 터치는 무시 (공격 버튼을 누르던 손가락이 카드를 잘못 고르지 않게)
      const readyAt = performance.now() + 600;
      PICKS.forEach((p, i) => {
        const c = el('div', 'pick', row, `<div class="pi">${p.icon}</div><div class="pt">${p.title}</div><div class="pd">${p.desc}</div>`);
        c.style.animationDelay = i * 0.08 + 's';
        onTap(c, () => {
          if (performance.now() < readyAt) return;
          G.audio.play('confirm');
          this.close(o);
          res(p.key);
        });
      });
    });
  }

  // ───────── 보상 팝업 ─────────
  reward({ icon, title, desc, kind = '새로운 힘!' }) {
    if (G.debug.auto) return Promise.resolve();
    return new Promise((res) => {
      const o = this.overlay('reward');
      const box = el('div', 'rbox', o);
      el('div', 'rkind', box, kind);
      const im = el('img', 'ricon', box);
      im.src = icon.startsWith('data:') || icon.includes('/') ? icon : G.sprites.iconURL(icon);
      el('div', 'rtitle', box, title);
      el('div', 'rdesc', box, desc);
      G.audio.jingle('reward');
      G.audio.speak(title + '! ' + desc);
      this.button(box, '좋아!', 'gold big', () => { this.close(o); res(); });
    });
  }

  card(id) {
    const c = CARDS[id];
    return this.reward({ icon: G.sprites.portraitURL(c.sprite), title: c.title, desc: c.text, kind: c.star ? '⭐ 별자리 카드!' : '🃏 신화 카드!' });
  }

  // ───────── 과업 결과 ─────────
  result({ n, stars, labels, time, stats = null, newCombo = false }) {
    if (G.debug.auto) {
      console.log('[result]', n, stars);
      return Promise.resolve();
    }
    return new Promise((res) => {
      const L = LABORS[n - 1];
      const o = this.overlay('result');
      el('div', 'rs-title', o, `과업 ${n} 성공!`);
      el('div', 'rs-name', o, L.title);
      const row = el('div', 'rs-stars', o);
      const items = el('div', 'rs-items', o);
      stars.forEach((s, i) => {
        const st = el('div', 'rs-star' + (s ? ' got' : ''), row, '★');
        el('div', 'rs-item' + (s ? ' got' : ''), items, (s ? '✔ ' : '· ') + labels[i]);
        if (s) setTimeout(() => { st.classList.add('pop'); G.audio.jingle('star'); }, 500 + i * 450);
      });
      if (stats) {
        const rec = el('div', 'rs-rec', o);
        el('div', 'rec', rec, `<b>${stats.maxCombo}</b>최고 콤보${newCombo ? '<i>새 기록!</i>' : ''}`);
        el('div', 'rec', rec, `<b>${stats.kills}</b>물리친 적`);
        el('div', 'rec', rec, `<b>${stats.coins}</b>모은 동전`);
      }
      if (time) el('div', 'rs-time', o, `걸린 시간 ${Math.floor(time / 60)}분 ${Math.floor(time % 60)}초`);
      setTimeout(() => this.button(o, '마을로!', 'gold big', () => { this.close(o); res(); }), 1700);
      G.audio.jingle('victory');
    });
  }

  // ───────── 그림책 ─────────
  storybook(pages) {
    if (G.debug.auto) return Promise.resolve();
    return new Promise((res) => {
      const o = this.overlay('story');
      const frame = el('div', 'sframe', o);
      const cv = el('div', 'sart', frame);
      const txt = el('div', 'stext', o);
      const hint = el('div', 'shint', o, '화면을 톡! 눌러 넘겨요');
      const skip = el('button', 'sskip', o, '건너뛰기 ▶▶');
      let i = -1;
      let busy = false;
      // 그림책 그림은 펼칠 때 받는다: 모든 장을 미리 받기 시작하고, 넘길 때 그 장의 그림을 기다림 (최대 8초, 못 받으면 임시 그림)
      pages.forEach((pg) => G.sprites.loadStory(pg.art));
      const next = async () => {
        if (busy) return;
        i++;
        if (i >= pages.length) {
          G.audio.stopSpeak();
          this.close(o);
          res();
          return;
        }
        const p = pages[i];
        if (!G.sprites.storyImage(p.art)) {
          busy = true;
          txt.textContent = '그림책을 펼치는 중…';
          await Promise.race([G.sprites.loadStory(p.art), waitReal(8)]);
          busy = false;
          if (i >= pages.length) return; // 기다리는 동안 건너뛰기
        }
        cv.innerHTML = '';
        const c = storyCanvas(p.art);
        c.classList?.add('scanvas');
        if (c instanceof HTMLImageElement) {
          const im = el('img', 'scanvas', cv);
          im.src = c.src;
        } else cv.appendChild(c);
        frame.classList.remove('turn');
        void frame.offsetWidth;
        frame.classList.add('turn');
        txt.innerHTML = p.text;
        G.audio.speak(p.text.replace(/<[^>]+>/g, ''), { rate: 0.95 });
        G.audio.play('select');
      };
      onTap(o, () => next());
      onTap(skip, () => {
        i = pages.length;
        busy = false;
        next();
      });
      next();
      void hint;
    });
  }

  // ───────── 카드 도감 ─────────
  cardBook() {
    const o = this.overlay('menu');
    const box = this.panel(o, 'panel map', () => this.close(o));
    const got = G.save.data.cards;
    el('div', 'ptitle', box, `🃏 카드 도감 (${got.length} / ${Object.keys(CARDS).length})`);
    const grid = el('div', 'cardgrid', box);
    for (const [id, c] of Object.entries(CARDS)) {
      const has = got.includes(id);
      const d = el('div', 'ccard' + (has ? ' got' : ''), grid);
      if (has) {
        const im = el('img', '', d);
        im.src = G.sprites.portraitURL(c.sprite);
        el('div', 'cname', d, (c.star ? '⭐ ' : '') + c.title);
        onTap(d, () => this.card(id));
      } else el('div', 'cname', d, '?');
    }
    this.button(box, '닫기', '', () => this.close(o));
  }

  // ───────── 상점 ─────────
  shop() {
    return new Promise((res) => {
      const o = this.overlay('menu');
      const box = this.panel(o, 'panel wide', () => { this.close(o); res(); });
      el('div', 'ptitle', box, '🫒 올리브 상점');
      const coins = el('div', 'pinfo', box);
      const list = el('div', 'shoplist', box);
      // 황금 항아리를 모두 찾았으면 보물 지도는 필요 없음
      const allFound = () => Array.from({ length: 12 }, (_, i) => G.save.laborState(i + 1).stars?.[1]).every(Boolean);
      const items = [
        { key: 'heart', title: '❤️ 하트 그릇', desc: '하트 1칸 늘리기', max: 3, cost: (n) => 60 + n * 60 },
        { key: 'club', title: '🪵 단단한 몽둥이', desc: '공격력 올리기', max: 3, cost: (n) => 80 + n * 70 },
        // 아래 둘은 쓰면 줄어들어서 다시 살 수 있음 (max = 한 번에 가질 수 있는 수)
        { key: 'bread', title: '🍯 꿀빵', desc: '하트가 조금 남으면 알아서 냠냠! (하트 3칸)', max: 3, cost: () => 30, full: '가방이 꽉 찼어요' },
        { key: 'map', title: '🗺 부엉이 보물 지도', desc: '숨은 황금 항아리 위에 빛기둥이 보여요', max: 1, cost: () => 50, full: '이미 가지고 있어요', done: allFound },
      ];
      const draw = () => {
        coins.innerHTML = `가진 동전: <b>${G.save.data.coins}</b>`;
        list.innerHTML = '';
        for (const it of items) {
          const n = G.save.data.shop[it.key];
          const row = el('div', 'shoprow', list, `<div><b>${it.title}</b><br><small>${it.desc} (${n}/${it.max})</small></div>`);
          if (it.done?.()) el('div', 'sold', row, '다 찾았어요');
          else if (n >= it.max) el('div', 'sold', row, it.full || '다 샀어요');
          else {
            const cost = it.cost(n);
            const b = this.button(row, `🪙 ${cost}`, G.save.data.coins >= cost ? 'gold' : 'disabled', () => {
              if (G.save.data.coins < cost) {
                G.audio.play('warn');
                return;
              }
              G.save.data.coins -= cost;
              G.save.data.shop[it.key]++;
              G.save.write();
              G.player?.recalc();
              G.ui.hud.updateAll();
              G.audio.jingle('reward');
              draw();
            });
            void b;
          }
        }
      };
      draw();
      this.button(box, '닫기', '', () => { this.close(o); res(); });
    });
  }

  // ───────── 엔딩 별자리 + 크레딧 ─────────
  ending() {
    if (G.debug.auto) return Promise.resolve();
    return new Promise((res) => {
      const o = this.overlay('ending');
      const sky = el('div', 'esky', o);
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.classList.add('const');
      sky.appendChild(svg);
      CONST_LINES.forEach(([a, b], i) => {
        const l = document.createElementNS(svgNS, 'line');
        l.setAttribute('x1', CONSTELLATION[a][0] * 100);
        l.setAttribute('y1', CONSTELLATION[a][1] * 100);
        l.setAttribute('x2', CONSTELLATION[b][0] * 100);
        l.setAttribute('y2', CONSTELLATION[b][1] * 100);
        l.style.animationDelay = 1.2 + i * 0.25 + 's';
        svg.appendChild(l);
      });
      CONSTELLATION.forEach(([x, y], i) => {
        const s = el('div', 'estar', sky, '★');
        s.style.left = x * 100 + '%';
        s.style.top = y * 100 + '%';
        s.style.animationDelay = i * 0.12 + 's';
      });
      const hero = el('img', 'ehero', sky);
      hero.src = G.sprites.portraitURL('hercules_lion');
      const cr = el('div', 'credits', o);
      cr.innerHTML = `
        <div class="ct">헤르쿨레스자리</div>
        <div class="cs">맑은 여름밤, 하늘을 올려다보면 지금도 헤라클레스를 만날 수 있어요.</div>
        <div class="cl"><b>원작 시나리오</b><br>${esc(G.save.data.settings.childName)}</div>
        <div class="cl"><b>게임 만들기</b><br>Claude · Codex</div>
        <div class="cl"><b>참고한 이야기</b><br>그리스 신화 · 아폴로도로스 『비블리오테케』</div>
        <div class="cl big">끝 · 그리고 새로운 시작!</div>`;
      G.audio.music('ending');
      setTimeout(() => this.button(o, '마을로 돌아가기', 'gold big', () => { this.close(o); res(); }), 5200);
    });
  }
}
