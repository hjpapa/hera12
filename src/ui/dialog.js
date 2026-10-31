// 대화창: 얼굴 · 이름 · 타자기 글자 · 읽어주기 · 선택지. 대화 중에는 게임이 멈춘다.
import { G, pause, resume } from '../core/context.js';
import { CHARS } from '../data/characters.js';
import { el, onTap } from './dom.js';

export class Dialog {
  constructor(root) {
    this.root = el('div', 'dialog hidden', root);
    this.box = el('div', 'dlg-box', this.root);
    this.portrait = el('div', 'dlg-portrait', this.box);
    this.img = el('img', '', this.portrait);
    this.name = el('div', 'dlg-name', this.box);
    this.text = el('div', 'dlg-text', this.box);
    this.next = el('div', 'dlg-next', this.box, '▼');
    this.choices = el('div', 'dlg-choices', this.root);
    this.open = false;
    this.cur = null;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.dlg-choice')) return;
      e.preventDefault();
      G.audio.unlock();
      this.advance();
    });
  }

  speakerInfo(id) {
    const c = CHARS[id] || { name: id, sprite: null };
    let sprite = c.sprite;
    if (id === 'hercules' && G.player?.visual) sprite = G.save.has('lion') ? 'hercules_lion' : 'hercules';
    return { ...c, sprite };
  }

  show() {
    if (!this.open) {
      this.open = true;
      this.root.classList.remove('hidden');
      pause('dialog');
      G.input.setVisible(false);
      G.ui.hud.root.classList.add('dim');
    }
  }

  hide() {
    if (this.open) {
      this.open = false;
      this.root.classList.add('hidden');
      resume('dialog');
      G.audio.stopSpeak();
      if (!G.ui.cutscene) G.input.setVisible(true);
      G.ui.hud.root.classList.remove('dim');
    }
  }

  // 한 줄 보여 주고, 탭하면 넘어감
  line(speaker, text, { keepOpen = false } = {}) {
    // 이전 줄이 아직 기다리는 중이면 먼저 끝내 준다 (스크립트가 멈추지 않게)
    if (this.cur && !this.cur.choice) {
      const prev = this.cur;
      this.cur = null;
      prev.res();
    }
    return new Promise((res) => {
      this.show();
      const info = this.speakerInfo(speaker);
      this.box.classList.toggle('narr', speaker === 'narr');
      if (info.sprite) {
        this.portrait.classList.remove('none');
        this.img.src = G.sprites.portraitURL(info.sprite);
      } else this.portrait.classList.add('none');
      this.name.textContent = info.name || '';
      this.name.classList.toggle('none', !info.name);
      this.text.textContent = '';
      this.next.classList.remove('show');
      this.choices.innerHTML = '';
      const cur = (this.cur = { full: text, shown: 0, t: 0, res, keepOpen, info, done: false, startAt: performance.now(), doneAt: 0 });
      if (G.debug.auto) {
        // 테스트용 자동 진행 (?auto)
        setTimeout(() => {
          if (this.cur === cur && !cur.choice) {
            this.cur = null;
            res();
          }
        }, 40);
        return;
      }
      G.audio.speak(text, { pitch: info.pitch ?? 1, rate: info.rate ?? 1 });
    });
  }

  async talk(lines) {
    for (const [sp, tx] of lines) await this.line(sp, tx);
    this.hide();
  }

  // 선택지: 버튼 중 하나 고르기 → 번호
  choose(speaker, text, options) {
    return new Promise((res) => {
      this.line(speaker, text).then(() => {});
      const c = this.cur;
      c.choice = true;
      if (G.debug.auto) {
        // 테스트: 같은 질문이 반복되면 다음 선택지를 고른다
        this.autoCount = this.autoCount || {};
        const k = (this.autoCount[text] = (this.autoCount[text] ?? -1) + 1);
        setTimeout(() => {
          this.cur = null;
          res(k % options.length);
        }, 40);
        return;
      }
      const showChoices = () => {
        this.choices.innerHTML = '';
        options.forEach((o, i) => {
          const b = el('button', 'dlg-choice', this.choices, o);
          onTap(b, () => {
            G.audio.unlock();
            G.audio.play('confirm');
            G.audio.stopSpeak();
            this.choices.innerHTML = '';
            this.cur = null;
            res(i);
          });
        });
      };
      c.onFull = showChoices;
    });
  }

  advance() {
    const c = this.cur;
    if (!c) return;
    // 연타 보호: 공격 버튼을 톡톡 누르던 손가락에 대사가 읽기도 전에 넘어가지 않게
    // (새 줄이 뜬 뒤 0.3초, 글자가 다 나온 뒤 0.35초는 넘기지 않음)
    const now = performance.now();
    if (now - c.startAt < 300) return;
    if (c.done && now - c.doneAt < 350) return;
    if (c.shown < c.full.length) {
      c.shown = c.full.length;
      this.text.textContent = c.full;
      this.finishLine();
      return;
    }
    if (c.choice) return;
    G.audio.play('select');
    this.cur = null;
    c.res();
  }

  finishLine() {
    const c = this.cur;
    if (!c || c.done) return;
    c.done = true;
    c.doneAt = performance.now();
    if (c.choice) c.onFull?.();
    else this.next.classList.add('show');
  }

  update(dt) {
    const c = this.cur;
    if (!c) return;
    if (G.input.pressed.attack || G.input.pressed.dash) {
      G.input.pressed.attack = false;
      this.advance();
      return;
    }
    if (c.shown < c.full.length) {
      c.t += dt * 32;
      const n = Math.min(c.full.length, Math.floor(c.t));
      if (n > c.shown) {
        c.shown = n;
        this.text.textContent = c.full.slice(0, n);
        if (!G.save.data.settings.voice && n % 2 === 0) G.audio.play('talk', { pitch: c.info.pitch ?? 1 });
      }
      if (c.shown >= c.full.length) this.finishLine();
    }
  }
}
