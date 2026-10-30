// 과업 9 — 히폴리테의 허리띠 🏹
// 🧒 "아레스의 딸 히폴리테는 허리띠를 주려고 했지만 헤라클레스는 히폴리테를 죽이고 허리띠를 가져왔다"
// 친절한 여왕이 허리띠를 주려 함 → 헤라의 거짓말 → 아마존 전사들과 싸움 → 히폴리테와 결투 → 슬픈 진실
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Enemy, Boss } from '../game/enemy.js';
import { NPC } from '../game/npc.js';
import { Entity } from '../game/entity.js';
import { toon } from '../render/props.js';
import { rand, TAU } from '../core/util.js';

const AMAZON = { sprite: 'amazon', hp: 40, speed: 4, ai: 'melee', radius: 0.6, exp: 8, coins: [1, 2], damage: 1, aggro: 16 };
const ARCHER = { sprite: 'amazon_archer', hp: 30, speed: 3.6, ai: 'shooter', radius: 0.6, exp: 8, coins: [1, 2], damage: 1, aggro: 18, shot: 'javelin', shotSpeed: 13, keepDist: 8, cd: [2, 3] };

class Hippolyta extends Boss {
  constructor(o) {
    super({ sprite: 'hippolyta', hp: 680, radius: 0.8, speed: 4.6, damage: 1, exp: 90, coins: 25, title: '아마존 여왕 히폴리테', rest: [0.4, 0.8], ...o });
    this.guarding = false;
  }
  patterns() {
    return [this.pThrust, this.pDash, this.pGuard, this.pThrow, this.pThrust];
  }
  async pThrust() {
    await this.approach(2.6, 2.2);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.5, radius: 1.8, speed: 14, time: 0.2, damage: 1 });
  }
  async pDash() {
    await this.charge({ windup: 0.75, speed: 18, time: 0.8, stunOnWall: 1.8 });
  }
  async pThrow() {
    await this.shoot({ kind: 'javelin', count: 3, spread: 0.3, windup: 0.7, speed: 14 });
  }
  async pGuard() {
    this.guarding = true;
    this.mode = 'face';
    G.fx.text(this.pos, '방패!', { color: '#ffe86a', size: 1, cls: 'word' });
    const t0 = G.time;
    await until(() => {
      if (this.stopped()) return true;
      const p = this.player;
      this.faceToward(p.pos.x, p.pos.z);
      return G.time - t0 > 1.8;
    });
    this.guarding = false;
  }
  // 방패를 든 동안 앞에서 오는 공격은 막힘 → 옆이나 뒤로 돌아가서!
  damageFilter(info, dx, dz) {
    if (!this.guarding || info.type === 'poison' || info.type === 'special') return null;
    const d = this.dir;
    if (d.x * -dx + d.z * -dz > 0.3) return { blocked: true, text: '막았다!', sound: 'ting', color: '#ffffff' };
    return null;
  }
  syncVisual(dt) {
    super.syncVisual(dt);
    if (this.guarding && Math.random() < 0.3) G.fx.sparkle(this.pos, { color: 0xffe86a, size: 0.3, h: 1.6 });
  }
}

export default class Labor09 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['hippolyta', 'hippolyta_down', 'amazon', 'amazon_archer', 'hera_amazon']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 5 };
  }

  setup() {
    G.game.setSky('#78c0f0', '#fff0dc', '#f4e8d8', 55, 130);
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 110, h: 100, cz: -22,
      color: 0xb8c880, color2: 0x98b068, edge: 0x9a7a52,
      zones: [[0, 3, 8], [0, -26, 15], [17, -12, 3]],
      roads: [[[0, -3], [0, -12]], [[8, -16], [15, -12]]],
      pathColor: 0xe8d8a8,
      border: (x, z, i) => (i % 3 === 0 ? B.rock(x, z, { collide: false, color: 0xc8b8a0 }) : B.tree(i % 2 ? 'cypress' : 'olive', x, z, { collide: false })),
    });
    B.water(0, 24, { w: 120, h: 30, color: 0x2a8ad8, color2: 0x9ae0ff });
    B.boat(-4, 11, { s: 1.2, rot: 0.15 });
    // 아마존 천막
    for (const [x, z, c] of [[-11, -34, 0xd84a3a], [11, -34, 0x9a4ab0], [-13, -20, 0xe8903a], [13, -21, 0xd84a3a], [0, -42, 0xc0392b]]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.4, 7), toon(c));
      t.position.set(x, 1.7, z);
      t.castShadow = true;
      B.add(t);
      this.world.addCollider(x, z, 2.2);
    }
    // 훈련용 허수아비
    this.pots([[5, -6], [-6, -8], [-8, -28], [8, -26]]);
    this.treasurePot(17, -12);
    this.queen = this.npc('hippolyta', 0, -32, null, { lookAtPlayer: true });
    this.amazons = [[-5, -28], [5, -28], [-7, -22], [7, -22], [-3, -36], [3, -36]].map(([x, z], i) => this.npc(i % 3 === 2 ? 'amazon_archer' : 'amazon', x, z, null));
    this.hera = this.npc('hera_amazon', -9, -26, null);
  }

  async run() {
    await this.intro();
    this.objective('아마존 여왕을 만나러 가자', this.queen);
    await until(() => G.player.pos.z < -20);
    this.cutscene(true);
    G.player.faceToward(0, -32);
    this.focus(0, -27, 0.75);
    await waitReal(0.3);
    await this.talk([
      ['hippolyta', '어서 오세요, 영웅 헤라클레스. 당신의 이야기는 이곳까지 들려왔답니다.'],
      ['hippolyta', '아버지 아레스께 받은 허리띠가 필요하다고요? 좋아요, 기꺼이 드리지요.'],
      ['hercules', '정말요? 고맙습니다, 여왕님!'],
    ]);
    // 헤라의 속임수
    this.focus(this.hera.pos.x, this.hera.pos.z, 0.7);
    G.audio.play('laugh');
    for (let i = 0; i < 6; i++) G.fx.particle({ x: this.hera.pos.x + rand(-0.6, 0.6), y: 2, z: this.hera.pos.z, vy: 1, size: 0.6, life: 1.2, color: 0x2d8f8a, tile: 'leaf' });
    await this.talk([
      ['hera_amazon', '모두들! 저 남자가 여왕님을 납치하려 한다!!'],
      ['amazon', '여왕님을 지켜라!'],
      ['hercules', '아, 아니에요! 오해예요!'],
    ]);
    // 헤라는 사라지고, 아마존들이 공격
    G.fx.starPop(this.hera.pos, 0.8);
    this.hera.world.remove(this.hera);
    const foes = this.amazons.map((a) => {
      const e = this.enemy({ ...(a.sprite === 'amazon_archer' ? ARCHER : AMAZON), x: a.pos.x, z: a.pos.z });
      a.world.remove(a);
      return e;
    });
    this.queen.world.remove(this.queen);
    const q = this.add(new Hippolyta({ x: 0, z: -38 }));
    q.active = false;
    this.unfocus();
    this.cutscene(false);
    G.audio.music('boss');
    this.objective('아마존 전사들을 막아내자!');
    await this.waitDefeated(foes);
    this.checkpointAt(0, -22);
    await this.bossIntro(q, '아마존 여왕 히폴리테', { roar: 'warn', lines: [
      ['hippolyta', '나를 속였군요, 헤라클레스! 허리띠는 줄 수 없어요!'],
      ['hercules', '여왕님, 제 말 좀…! 으윽, 어쩔 수 없다!'],
      ['glau', '방패를 들면 앞에서는 안 통해! 옆이나 뒤로 돌아가서 때려!'],
    ] });
    q.active = true;
    this.objective('히폴리테 여왕과의 결투!');
    await until(() => !q.alive);
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    G.game.slowmo(0.3, 1.2);
    G.audio.music('sad');
    await waitReal(1.0);
    // 슬픈 진실
    this.cutscene(true);
    const down = this.add(new Entity({ sprite: 'hippolyta_down', x: q.pos.x, z: q.pos.z, solid: false }));
    this.focus(down.pos.x, down.pos.z, 0.6);
    G.player.faceToward(down.pos.x, down.pos.z);
    await this.say('hippolyta_down', '…이 허리띠를… 가져가세요…');
    for (let i = 0; i < 20; i++) {
      G.fx.particle({ x: down.pos.x + rand(-0.6, 0.6), y: rand(0.3, 1.6), z: down.pos.z, vy: rand(1, 2.5), size: 0.5, life: 1.5, color: 0xfff6c8, tile: 'star', additive: true });
      await waitReal(0.04);
    }
    down.visual.setOpacity(0.4);
    await waitReal(0.4);
    down.world.remove(down);
    G.audio.play('laugh');
    for (let i = 0; i < 10; i++) G.fx.particle({ x: G.player.pos.x + rand(-4, 4), y: rand(3, 5), z: G.player.pos.z + rand(-3, 1), vy: -1, size: 0.6, life: 2, color: 0x2d8f8a, tile: 'leaf', drag: 0.2 });
    await this.talk([
      ['narr', '(공작 깃털이 흩날리며 어디선가 "호호호…" 하는 웃음소리가 들려요)'],
      ['hercules', '…헤라 여신의 속임수였어. 미안해요, 히폴리테 여왕님.'],
      ['glau', '화가 날 때일수록 먼저 진실을 확인해야 해… 이 일을 잊지 말자, 헤라클레스.'],
    ]);
    this.unfocus();
    await this.giveRewards();
    await this.complete();
  }
}

void wait;
void Enemy;
void NPC;
void TAU;
