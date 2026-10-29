// 전체 화면 창들: 타이틀 · 일시정지 · 설정 · 과업 지도 · 레벨업 · 결과 · 그림책 · 보상 · 도감 · 상점
import { G, pause, resume } from '../core/context.js';
import { el, onTap } from './dom.js';
import { LABORS } from '../data/labors.js';
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

  async fade(on, dur = 0.35) {
    this.fadeEl.style.transitionDuration = dur + 's';
    this.fadeEl.classList.toggle('on', on);
    await waitReal(dur);
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
      el('div', 'credit', o, '원작 시나리오 · ' + G.save.data.settings.childName);
    });
  }

  // ───────── 일시정지 ─────────
  pauseMenu() {
    if (this.open) return;
    const o = this.overlay('menu');
    const box = el('div', 'panel', o);
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
    const box = el('div', 'panel wide', o);
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
    const nrow = el('div', 'srow', grid, '<span>✏️ 원작자 이름</span>');
    const ni = el('input', 'name-in', nrow);
    ni.value = s.childName;
    ni.maxLength = 12;
    ni.addEventListener('change', () => {
      s.childName = ni.value.trim() || '우리 아이';
      G.save.write();
    });
    el('div', 'sgroup', grid, '부모님 메뉴');
    toggle('🔓 모든 과업 열기', 'unlockAll');
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
      const box = el('div', 'panel map', o);
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
        if (!open) el('div', 'llock', card, '🔒');
        if (open && travel) {
          onTap(card, () => {
            G.audio.play('confirm');
            this.close(o);
            res(L.n);
          });
        }
      }
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
      PICKS.forEach((p, i) => {
        const c = el('div', 'pick', row, `<div class="pi">${p.icon}</div><div class="pt">${p.title}</div><div class="pd">${p.desc}</div>`);
        c.style.animationDelay = i * 0.08 + 's';
        onTap(c, () => {
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
  result({ n, stars, labels, time }) {
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
      const next = () => {
        i++;
        if (i >= pages.length) {
          G.audio.stopSpeak();
          this.close(o);
          res();
          return;
        }
        const p = pages[i];
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
        next();
      });
      next();
      void hint;
    });
  }

  // ───────── 카드 도감 ─────────
  cardBook() {
    const o = this.overlay('menu');
    const box = el('div', 'panel map', o);
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
      const box = el('div', 'panel', o);
      el('div', 'ptitle', box, '🫒 올리브 상점');
      const coins = el('div', 'pinfo', box);
      const list = el('div', 'shoplist', box);
      const items = [
        { key: 'heart', title: '❤️ 하트 그릇', desc: '하트 1칸 늘리기', max: 3, cost: (n) => 60 + n * 60 },
        { key: 'club', title: '🪵 단단한 몽둥이', desc: '공격력 올리기', max: 3, cost: (n) => 80 + n * 70 },
      ];
      const draw = () => {
        coins.innerHTML = `가진 동전: <b>${G.save.data.coins}</b>`;
        list.innerHTML = '';
        for (const it of items) {
          const n = G.save.data.shop[it.key];
          const row = el('div', 'shoprow', list, `<div><b>${it.title}</b><br><small>${it.desc} (${n}/${it.max})</small></div>`);
          if (n >= it.max) el('div', 'sold', row, '다 샀어요');
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
        <div class="cl"><b>원작 시나리오</b><br>${G.save.data.settings.childName}</div>
        <div class="cl"><b>게임 만들기</b><br>Claude · Codex</div>
        <div class="cl"><b>참고한 이야기</b><br>그리스 신화 · 아폴로도로스 『비블리오테케』</div>
        <div class="cl big">끝 · 그리고 새로운 시작!</div>`;
      G.audio.music('ending');
      setTimeout(() => this.button(o, '마을로 돌아가기', 'gold big', () => { this.close(o); res(); }), 5200);
    });
  }
}
