// UI 묶음: HUD + 대화창 + 화면들. 스테이지 스크립트가 쓰는 짧은 도우미도 여기에.
import { G } from '../core/context.js';
import { HUD } from './hud.js';
import { Dialog } from './dialog.js';
import { Screens } from './screens.js';

export class UI {
  constructor(root) {
    this.root = root;
    this.hud = new HUD(root);
    this.dialog = new Dialog(root);
    this.screens = new Screens(root);
    this.cutscene = false;
  }

  init() {
    this.hud.init();
  }

  setCutscene(on) {
    this.cutscene = on;
    document.body.classList.toggle('cutscene', on);
    G.input.setVisible(!on && !this.dialog.open && !this.screens.open);
    if (G.player) G.player.locked = on;
  }

  update(dt, rawDt) {
    this.dialog.update(rawDt);
    this.hud.update(dt, rawDt);
  }
}
