// 입력: 플로팅 조이스틱 + 큰 버튼(터치), 키보드, 게임패드를 하나로 합친다.
import { G } from './context.js';
import { clamp } from './util.js';

const KEYMAP = {
  KeyJ: 'attack', Space: 'attack', KeyZ: 'attack', Enter: 'attack',
  KeyK: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'dash',
  KeyL: 'skill', KeyC: 'skill',
  KeyQ: 'swap', KeyV: 'swap',
  Escape: 'pause', KeyP: 'pause',
};

export class Input {
  constructor(root) {
    this.move = { x: 0, y: 0 }; // x: 화면 오른쪽, y: 화면 위쪽
    this.held = {};
    this.pressed = {};
    this.keys = new Set();
    this.locked = false; // 컷신 중 플레이어 조작 막기
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.usingKeyboard = false;
    this.padPrev = {};
    this.build(root);
    this.bindKeys();
  }

  build(root) {
    const c = document.createElement('div');
    c.id = 'controls';
    c.innerHTML = `
      <div class="stick-zone"></div>
      <div class="stick-base idle"><div class="stick-knob"></div></div>
      <div class="btn btn-attack" data-b="attack"><img alt=""><span class="lbl"></span></div>
      <div class="btn btn-dash" data-b="dash"><img alt=""></div>
      <div class="btn btn-skill" data-b="skill"><img alt=""><svg viewBox="0 0 100 100" class="cd"><circle cx="50" cy="50" r="46"/></svg></div>
      <div class="btn btn-swap" data-b="swap"><img alt=""></div>
    `;
    root.appendChild(c);
    this.el = c;
    this.zone = c.querySelector('.stick-zone');
    this.base = c.querySelector('.stick-base');
    this.knob = c.querySelector('.stick-knob');
    this.btn = {};
    c.querySelectorAll('.btn').forEach((b) => {
      const name = b.dataset.b;
      this.btn[name] = b;
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        G.audio?.unlock();
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        b.classList.add('down');
        this.press(name);
      };
      const up = (e) => {
        e.preventDefault();
        b.classList.remove('down');
        this.release(name);
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
    });

    const zone = this.zone;
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      G.audio?.unlock();
      if (this.stick.id !== null) return;
      this.stick.id = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      this.stick.ox = e.clientX;
      this.stick.oy = e.clientY;
      this.stick.x = 0;
      this.stick.y = 0;
      this.base.classList.remove('idle');
      this.base.style.left = e.clientX + 'px';
      this.base.style.top = e.clientY + 'px';
      this.knob.style.transform = 'translate(-50%,-50%)';
    });
    const moveStick = (e) => {
      if (e.pointerId !== this.stick.id) return;
      const R = this.stickRadius();
      let dx = e.clientX - this.stick.ox;
      let dy = e.clientY - this.stick.oy;
      const l = Math.hypot(dx, dy);
      if (l > R) {
        // 손가락이 멀리 가면 조이스틱 중심이 따라감 (아이들이 손을 크게 움직여도 OK)
        const over = l - R;
        this.stick.ox += (dx / l) * over;
        this.stick.oy += (dy / l) * over;
        dx = (dx / l) * R;
        dy = (dy / l) * R;
        this.base.style.left = this.stick.ox + 'px';
        this.base.style.top = this.stick.oy + 'px';
      }
      this.stick.x = dx / R;
      this.stick.y = -dy / R;
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const endStick = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.id = null;
      this.stick.x = 0;
      this.stick.y = 0;
      this.base.classList.add('idle');
      this.base.style.left = '';
      this.base.style.top = '';
      this.knob.style.transform = 'translate(-50%,-50%)';
    };
    zone.addEventListener('pointermove', moveStick);
    zone.addEventListener('pointerup', endStick);
    zone.addEventListener('pointercancel', endStick);
    zone.addEventListener('lostpointercapture', endStick);
  }

  stickRadius() {
    return clamp(Math.min(innerWidth, innerHeight) * 0.11, 42, 80);
  }

  bindKeys() {
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      G.audio?.unlock();
      this.keys.add(e.code);
      const b = KEYMAP[e.code];
      if (b) {
        this.press(b);
        e.preventDefault();
      }
      if (!this.usingKeyboard && !G.isTouch) {
        this.usingKeyboard = true;
        document.body.classList.add('keyboard');
      }
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      const b = KEYMAP[e.code];
      if (b) this.release(b);
    });
    addEventListener('blur', () => {
      this.keys.clear();
      this.held = {};
    });
  }

  press(name) {
    this.pressed[name] = true;
    this.held[name] = true;
    this.anyPress = true;
  }

  release(name) {
    this.held[name] = false;
  }

  update() {
    // 키보드
    let kx = 0, ky = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) kx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) kx += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) ky += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) ky -= 1;
    let mx = this.stick.x + kx;
    let my = this.stick.y + ky;

    // 게임패드
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { mx += ax; my -= ay; }
      const map = { 0: 'attack', 1: 'dash', 2: 'skill', 3: 'swap', 9: 'pause' };
      for (const [i, name] of Object.entries(map)) {
        const v = p.buttons[i]?.pressed;
        if (v && !this.padPrev[i]) this.press(name);
        if (!v && this.padPrev[i]) this.release(name);
        this.padPrev[i] = v;
      }
      if (p.buttons[12]?.pressed) my += 1;
      if (p.buttons[13]?.pressed) my -= 1;
      if (p.buttons[14]?.pressed) mx -= 1;
      if (p.buttons[15]?.pressed) mx += 1;
      break;
    }

    let l = Math.hypot(mx, my);
    if (l < 0.15) { mx = 0; my = 0; l = 0; }
    if (l > 1) { mx /= l; my /= l; l = 1; }
    this.move.x = mx;
    this.move.y = my;
    this.magnitude = l;
  }

  endFrame() {
    this.pressed = {};
    this.anyPress = false;
  }

  consume(name) {
    const v = this.pressed[name];
    this.pressed[name] = false;
    return !!v;
  }

  setVisible(v) {
    this.el.classList.toggle('hidden', !v);
    if (!v) {
      this.stick.id = null;
      this.stick.x = 0;
      this.stick.y = 0;
      this.base.classList.add('idle');
      this.base.style.left = '';
      this.base.style.top = '';
      this.held = {};
    }
  }

  vibrate(ms) {
    if (!G.save.data.settings.vibrate || !navigator.userActivation?.hasBeenActive) return;
    try { navigator.vibrate?.(ms); } catch (e) { /* noop */ }
  }
}
