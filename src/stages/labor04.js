// 과업 4 — 에리만토스의 멧돼지 🐗
// 🧒 "히드라의 독이 달린 화살로 멧돼지를 퇴치했다"
// 눈 덮인 산, 켄타우로스 폴로스의 힌트 → 돌진 피하기 → 바위/나무에 쿵 → 독화살! → 깊은 눈에 빠진 멧돼지 마무리
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Boss } from '../game/enemy.js';
import { rand } from '../core/util.js';

const WOLF = { sprite: 'wolf_snow', hp: 34, speed: 4.4, ai: 'melee', radius: 0.6, exp: 7, coins: [0, 2], damage: 1, aggro: 12 };

class BoarBoss extends Boss {
  constructor(o) {
    super({ sprite: 'boar', hp: 520, radius: 1.3, speed: 4.2, damage: 2, exp: 70, coins: 20, title: '에리만토스의 멧돼지', rest: [0.5, 1.0], ...o });
  }
  patterns() {
    return [this.pCharge, this.pCharge, this.pTusk, this.pSnow];
  }
  async pCharge() {
    await this.charge({ windup: 0.9, speed: 17, time: 1.1, stunOnWall: 2.6 });
  }
  async pTusk() {
    await this.approach(2.8, 2.5);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.6, radius: 1.9, speed: 12, time: 0.2, damage: 1 });
  }
  async pSnow() {
    G.audio.play('squeal');
    await this.lob({ kind: 'ice', count: 3, radius: 1.5, damage: 1, windup: 0.5 });
  }
  onStun() {
    this.visual.setSprite('boar_dizzy');
  }
  onRecover() {
    if (!this.stuck) this.visual.setSprite('boar');
  }
}

export default class Labor04 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['pholus', 'wolf_snow', 'boar', 'boar_dizzy']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 3 };
    this.skill = 'bow';
  }

  setup() {
    G.game.setSky('#a8c8e8', '#f0f6ff', '#e8f0f8', 40, 110);
    G.game.setLight({ hemiSky: 0xf0f6ff, hemiGround: 0x9ab0c8, hemi: 1.8, sun: 2.0, sunColor: 0xf0f4ff });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    B.snow = true;
    this.buildLevel({
      w: 110, h: 110, cz: -35,
      color: 0xf4f8fc, color2: 0xdce8f4, edge: 0x9aa8b8,
      zones: [[0, 0, 7], [0, -24, 9], [14, -26, 3], [0, -50, 12.5], [0, -71, 6]],
      roads: [[[0, -5], [0, -16]], [[7, -25], [12, -26]], [[0, -32], [0, -40]], [[0, -61], [0, -66]]],
      pathColor: 0xc8d4e0,
      border: (x, z, i) => (i % 3 === 0 ? B.rock(x, z, { s: rand(0.9, 1.6), color: 0xc8d0dc, collide: false }) : B.tree('pine', x, z, { collide: false, color: 'snow' })),
    });
    for (let i = 0; i < 8; i++) B.mountain(rand(-50, 50), rand(-90, -80), { r: rand(8, 14), h: rand(10, 18), color: 0x9aa8b8 });
    // 폴로스의 동굴
    B.cave(-6, -2, { r: 3, color: 0xa8a8b0 });
    // 멧돼지 경기장: 부딪힐 바위·나무
    for (const [x, z] of [[-7, -46], [7, -45], [-5, -56], [6, -57], [0, -43]]) {
      if (Math.random() < 0.5) B.rock(x, z, { s: 1.5, color: 0xb8c0cc });
      else B.tree('pine', x, z, { color: 'snow', s: 1.2 });
    }
    // 깊은 눈
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      B.rock(Math.cos(a) * 3.5, -71 + Math.sin(a) * 3.5, { s: rand(1.2, 1.8), color: 0xffffff, collide: false });
    }
    B.patch(0, -71, 5, 0xffffff, 0.04);
    this.pots([[4, -20], [-5, -28], [3, -30], [-9, -52], [9, -50]]);
    this.treasurePot(15, -27);
    this.pholus = this.npc('pholus', -3, -3.5, () => this.talkPholus(), { mark: true, radius: 0.9 });
  }

  talkPholus() {
    this.pholusTalked = true;
    this.pholus.setMark(false);
    return this.talk([
      ['pholus', '어서 오게, 헤라클레스! 나는 켄타우로스 폴로스라네.'],
      ['pholus', '멧돼지는 아주 빠르지만, 깊은 눈 속에서는 꼼짝을 못 한다네. 기억해 두게!'],
    ]);
  }

  update(dt) {
    const p = G.player;
    if (p && Math.random() < dt * 14) {
      G.fx.particle({ x: p.pos.x + rand(-14, 14), y: rand(6, 10), z: p.pos.z + rand(-14, 6), vx: rand(-0.5, 0.5), vy: -rand(1, 2), drag: 0.1, life: 5, size: 0.3, sizeEnd: 0.25, color: 0xffffff, tile: 'snow', fadeIn: true });
    }
  }

  async run() {
    await this.intro();
    // 과업 중간 이어하기: 앱이 꺼졌다 다시 들어왔으면 보스 앞에서 바로 시작
    if (this.resuming) {
      await this.resumeHere(0, -40);
    } else {
      this.objective('켄타우로스 폴로스와 이야기하자', this.pholus);
      await until(() => this.pholusTalked || G.player.pos.z < -8);
      this.objective('눈 덮인 산을 오르자', { x: 0, z: -24 });
      await this.ambush(0, -24, 8, () => this.wave(WOLF, 4, 0, -26, 4.5), { text: '하얀 눈늑대들이다!' });
      this.checkpointAt(0, -26);
      this.objective('멧돼지를 찾자', { x: 0, z: -48 });
      await until(() => G.player.pos.z < -40);
      this.checkpointAt(0, -40);
    }
    this.saveResume();
    const boar = this.add(new BoarBoss({ x: 0, z: -55 }));
    boar.active = false;
    await this.bossIntro(boar, '에리만토스의 멧돼지', { roar: 'squeal', lines: [
      ['boar', '꾸에에엑!'],
      ['glau', '부엉! 스킬 버튼을 눌러 독화살을 쏴! 내가 자동으로 조준해 줄게!'],
      ['glau', '멧돼지가 돌진하면 옆으로 구르기! 바위나 나무에 쿵 부딪히면 기회야!'],
    ] });
    boar.active = true;
    this.objective('독화살로 멧돼지를 물리치자!');
    // 체력이 조금 남으면 깊은 눈으로 도망
    await until(() => boar.hp <= boar.maxHp * 0.3 || !boar.alive);
    if (boar.alive) {
      boar.active = false;
      boar.clearTele();
      boar.stunned = false;
      boar.invulnerable = true;
      boar.noClip = true;
      G.audio.play('squeal');
      this.toast('멧돼지가 깊은 눈 쪽으로 도망간다!', 2);
      await until(() => {
        const dx = 0 - boar.pos.x, dz = -71 - boar.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) return true;
        boar.vel.set((dx / d) * 11, 0, (dz / d) * 11);
        boar.updateFlip(dx, dz);
        return false;
      });
      boar.vel.set(0, 0, 0);
      boar.noClip = false;
      boar.knockResist = 1;
      boar.stuck = true;
      boar.invulnerable = false;
      boar.stun(999);
      boar.visual.setSprite('boar_dizzy');
      G.fx.burst(boar.pos, { count: 20, color: 0xffffff, tile: 'snow', size: 0.6, speed: 6 });
      G.audio.play('splash');
      await this.say('hercules', '폴로스 아저씨 말대로야! 깊은 눈에 푹 빠졌어. 이제 끝이다!');
      this.objective('눈에 빠진 멧돼지를 마무리하자!', boar, { beam: false });
      await until(() => !boar.alive);
    }
    await this.bossDown(boar);
    await this.giveRewards();
    await this.complete();
  }
}

void wait;
void waitReal;
