// 과업 7 — 크레타의 황소 🐂
// 🧒 "크레타의 황속 죽이기. 창으로 죽였다" → 게임: 크레타의 창으로 황소를 물리침
// 미노스 왕에게 창을 받음 → 해변에서 창 연습 → 돌진하는 황소를 기둥에 쿵 → 어질어질할 때 창! → 마지막은 꼭 창으로
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Boss } from '../game/enemy.js';
import { Combat } from '../game/combat.js';
import { rand, TAU } from '../core/util.js';

const CRAB = { sprite: 'crab', hp: 26, speed: 3.4, ai: 'melee', radius: 0.6, exp: 6, coins: [0, 2], damage: 1, aggro: 11 };
const GOAT = { sprite: 'goat', hp: 40, speed: 3.5, ai: 'charger', radius: 0.7, exp: 8, coins: [1, 2], damage: 1, aggro: 13, chargeSpeed: 13, chargeTime: 0.8, cd: [1.8, 2.8] };

class BullBoss extends Boss {
  constructor(o) {
    super({ sprite: 'bull', hp: 700, radius: 1.5, speed: 4.4, damage: 2, exp: 90, coins: 25, title: '크레타의 황소', rest: [0.4, 0.9], ...o });
    this.hinted = false;
  }

  patterns() {
    return [this.pCharge, this.pCharge, this.pStomp, this.pHorn];
  }

  async pCharge() {
    await this.charge({ windup: 0.85, speed: 19, time: 1.2, stunOnWall: 3.0 });
  }

  async pStomp() {
    G.audio.play('moo');
    await this.slam({ windup: 1.0, radius: 4.6, damage: 1 });
    G.fx.ring(this.pos, { r0: 1, r1: 6, life: 0.5, color: 0xffd0a0 });
  }

  async pHorn() {
    await this.approach(3, 2.5);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.6, radius: 2, speed: 12, time: 0.2, damage: 1 });
  }

  onStun() {
    this.visual.setSprite('bull_dizzy');
  }

  onRecover() {
    this.visual.setSprite('bull');
  }

  // 마지막 일격은 꼭 창으로 (아이 시나리오: "창으로 죽였다")
  takeDamage(n, info) {
    if (this.hp - n <= 0 && info.type !== 'spear') {
      this.hp = Math.max(1, this.hp);
      if (!this.hinted) {
        this.hinted = true;
        G.ui.hud.toast('지금이야! 창(스킬 버튼)으로 마무리!', 2.6);
      }
      this.flash(0.1);
      return 0;
    }
    return super.takeDamage(n, info);
  }
}

export default class Labor07 extends Stage {
  constructor(p) {
    super(p);
    this.spawn = { x: 0, z: 4 };
    this.skill = 'spear';
  }

  setup() {
    G.game.setSky('#5ab8ff', '#eaf8ff', '#e0f4ff', 55, 140);
    G.game.setLight({ hemiSky: 0xffffff, hemiGround: 0xc8b080, hemi: 1.8, sun: 2.5, sunColor: 0xfff4e0 });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 110, h: 110, cz: -28,
      color: 0xf0dca0, color2: 0xe0c888, edge: 0xb09060,
      zones: [[0, 2, 7.5], [0, -22, 11], [16, -20, 3], [0, -50, 14]],
      roads: [[[0, -3], [0, -12]], [[8, -21], [14, -20]], [[0, -32], [0, -37]]],
      pathColor: 0xfff0c8,
      border: (x, z, i) => (i % 3 === 0 ? B.rock(x, z, { s: rand(0.8, 1.4), color: 0xd8c8a8, collide: false }) : B.tree(i % 2 ? 'palm' : 'olive', x, z, { collide: false })),
    });
    // 바다 (남쪽 항구)
    B.water(0, 22, { w: 120, h: 30, color: 0x2a8ad8, color2: 0x9ae0ff });
    this.ship = B.boat(-5, 10, { s: 1.2, rot: 0.2 });
    // 미노스 궁전 느낌의 빨간 기둥들 (황소가 부딪힐 곳)
    this.columns = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      const x = Math.cos(a) * 8, z = -50 + Math.sin(a) * 8;
      B.column(x, z, { h: 4.5, color: 0xc84a3a, r: 0.6 });
      this.columns.push({ x, z });
    }
    B.temple(0, -70, { w: 14, d: 6, h: 5, roof: 0x3a6ad8, trim: 0xc84a3a, collide: false });
    this.pots([[5, -18], [-6, -26], [-9, -44], [10, -56]]);
    this.treasurePot(16, -20);
    this.minos = this.npc('minos', 3.5, -1.5, () => this.talkMinos(), { mark: true });
  }

  async talkMinos() {
    if (this.gotSpear) return this.say('minos', '황소는 궁전 앞마당에 있소. 조심하시오!');
    this.gotSpear = true;
    this.minos.setMark(false);
    await this.talk([
      ['minos', '오오, 헤라클레스! 포세이돈 신께 바쳐야 할 황소를 내가 욕심내서 숨겼더니…'],
      ['minos', '신께서 화가 나서 황소를 미치게 하셨소. 이 크레타의 창을 쓰시오!'],
    ]);
    await this.giveRewards();
    await this.say('glau', '스킬 버튼을 누르면 창을 들고 앞으로 쭉! 어지러운 적에게 아주 세게 들어가!');
  }

  async run() {
    await this.intro();
    this.objective('미노스 왕과 이야기하자', this.minos);
    await until(() => this.gotSpear);
    this.objective('해변에서 창을 연습하자!', { x: 0, z: -22 });
    await this.ambush(0, -20, 9, () => [...this.wave(CRAB, 3, 0, -22, 4), ...this.wave(GOAT, 2, 0, -26, 2)], { text: '성난 게와 염소들이다!' });
    this.checkpointAt(0, -28);
    this.objective('궁전 앞마당으로!', { x: 0, z: -44 });
    await until(() => G.player.pos.z < -38);
    this.checkpointAt(0, -38);
    const bull = this.add(new BullBoss({ x: 0, z: -56 }));
    bull.active = false;
    await this.bossIntro(bull, '크레타의 황소', { roar: 'moo', lines: [
      ['bull', '음머어어어어!!'],
      ['glau', '부엉! 황소가 돌진하면 옆으로 구르기! 빨간 기둥에 머리를 쿵 박으면 그때 창으로 찔러!'],
    ] });
    bull.active = true;
    this.objective('황소를 기둥에 부딪히게 하고 창으로 찌르자!');
    await until(() => !bull.alive);
    G.ui.hud.flash('gold');
    await this.banner('크레타의 창!', '', 1.2);
    await this.bossDown(bull, { text: '과업 성공!' });
    // 황소가 별가루가 되어 하늘로 → 황소자리
    this.cutscene(true);
    this.focus(bull.pos.x, bull.pos.z, 0.9);
    for (let i = 0; i < 24; i++) {
      G.fx.particle({ x: bull.pos.x + rand(-1, 1), y: 1, z: bull.pos.z + rand(-1, 1), vy: rand(6, 10), drag: 0.3, size: 0.7, life: 2, color: 0xfff6c8, tile: 'star', additive: true });
      if (i % 6 === 0) G.audio.play('star');
      await waitReal(0.05);
    }
    await this.say('glau', '황소가 별이 되어 하늘로 올라갔어. 겨울밤의 황소자리야!');
    this.unfocus();
    await this.complete();
  }
}

void wait;
void Combat;
