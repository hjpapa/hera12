// 과업 8 — 디오메데스의 암말 🐎
// 🧒 "디오메데스의 암말 데려오기. 헤라클레스는 디오메데스를 죽이고 암말들을 물리쳤다"
// 폭풍의 트라키아 → 병사들 → 디오메데스 보스 → 날뛰는 암말 4마리를 진정시키기 → 배까지 데려가기
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Enemy, Boss, ShieldEnemy } from '../game/enemy.js';
import { Follower } from '../game/npc.js';
import { rand, TAU, damp } from '../core/util.js';

const SOLDIER = { sprite: 'soldier', hp: 38, speed: 3.6, ai: 'melee', radius: 0.6, exp: 7, coins: [1, 2], damage: 1, aggro: 12 };
const THROWER = { sprite: 'soldier', hp: 30, speed: 3.2, ai: 'shooter', radius: 0.6, exp: 7, coins: [1, 2], damage: 1, aggro: 15, shot: 'javelin', shotSpeed: 12, keepDist: 7, cd: [2, 3] };

class Diomedes extends Boss {
  constructor(o) {
    super({ sprite: 'diomedes', hp: 620, radius: 1.0, speed: 3.8, damage: 1, exp: 80, coins: 25, title: '디오메데스 왕', rest: [0.5, 1.0], ...o });
  }
  patterns() {
    return [this.pJavelins, this.pThrust, this.pRush, this.pCall];
  }
  async pJavelins() {
    await this.shoot({ kind: 'javelin', count: 3, spread: 0.35, windup: 0.75, speed: 13 });
  }
  async pThrust() {
    await this.approach(2.6, 2.5);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.55, radius: 1.8, speed: 13, time: 0.2, damage: 1 });
  }
  async pRush() {
    await this.charge({ windup: 0.8, speed: 16, time: 0.9, stunOnWall: 2 });
  }
  async pCall() {
    const n = this.world.enemies().filter((e) => e !== this).length;
    if (n >= 3) return this.pThrust();
    this.mode = 'face';
    G.fx.text(this.pos, '병사들아!', { color: '#ffb0a0', size: 1, cls: 'word' });
    G.audio.play('warn');
    await wait(0.6);
    for (let i = 0; i < 2; i++) {
      const a = rand(0, TAU);
      this.world.add(new Enemy({ ...SOLDIER, x: this.pos.x + Math.cos(a) * 4, z: this.pos.z + Math.sin(a) * 4, exp: 4 }));
      G.fx.starPop({ x: this.pos.x + Math.cos(a) * 4, y: 0, z: this.pos.z + Math.sin(a) * 4 }, 0.6);
    }
  }
}

// 사나운 암말: 체력이 다하면 얌전해져서 동료가 됨
class Mare extends Enemy {
  constructor(o) {
    super({ sprite: 'mare', hp: 130, speed: 4.5, ai: 'charger', radius: 0.9, exp: 12, coins: [2, 4], damage: 1, aggro: 18, chargeSpeed: 16, chargeTime: 0.9, windupCharge: 0.9, cd: [1.6, 2.6], superArmor: true, knockResist: 0.6, heartChance: 0.3, ...o });
    this.calm = false;
  }
  die() {
    if (this.calm) return;
    this.calm = true;
    this.hp = this.maxHp;
    this.team = 'neutral';
    this.hittable = false;
    this.clearTele();
    this.state = 'calm';
    this.noClip = true;
    this.solid = false;
    this.stunned = false;
    this.setDizzy(false);
    this.visual.setSprite('mare_calm');
    this.visual.bar && (this.visual.bar.g.visible = false);
    G.audio.play('neigh');
    G.audio.play('heart');
    G.fx.burst(this.pos, { count: 14, color: 0xff8fb4, tile: 'heart', size: 0.6, speed: 3, gravity: -2, additive: false });
    G.fx.text(this.pos, '얌전해졌다!', { color: '#ffb0d0', size: 1.1, cls: 'word' });
    this.onCalm?.(this);
  }
  think(dt) {
    if (!this.calm) return super.think(dt);
    // 플레이어 뒤를 졸졸
    const p = this.player;
    const tx = p.pos.x + Math.cos(this.slot) * 2.6, tz = p.pos.z + 2.2 + Math.sin(this.slot) * 1.2;
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.8) this.moveToward(tx, tz, Math.min(9, d * 3), dt);
    else this.stop(dt);
  }
}

export default class Labor08 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['soldier', 'diomedes', 'mare', 'mare_calm']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 4 };
    this.lightningT = 4;
  }

  setup() {
    G.game.setSky('#2a2a48', '#7a7a98', '#5a5a78', 30, 95);
    G.game.setLight({ hemiSky: 0xa8a8d0, hemiGround: 0x3a3040, hemi: 1.3, sun: 1.3, sunColor: 0xc8c8ff, tint: 0xd8d8f0 });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 100, h: 100, cz: -25,
      color: 0x6a6a5a, color2: 0x4a4a42, edge: 0x3a3030,
      zones: [[0, 2, 7.5], [0, -22, 10.5], [-15, -30, 3], [0, -50, 14]],
      roads: [[[0, -3], [0, -12]], [[-7, -26], [-13, -29]], [[0, -32], [0, -37]]],
      pathColor: 0x8a8070,
      border: (x, z, i) => (i % 3 === 0 ? B.rock(x, z, { s: rand(1, 1.8), color: 0x5a5060, collide: false }) : B.tree('dead', x, z, { collide: false })),
    });
    B.water(0, 22, { w: 120, h: 30, color: 0x2a3a5a, color2: 0x6a7a9a });
    this.ship = B.boat(4, 9, { s: 1.2, rot: -0.2 });
    B.stable(0, -64, { w: 14, d: 6 });
    for (const [x, z] of [[-8, -40], [8, -40], [-11, -56], [11, -56]]) B.torch(x, z);
    this.pots([[4, -18], [-6, -26], [6, -27], [-10, -48], [10, -46]]);
    this.treasurePot(-15, -31);
  }

  update(dt) {
    // 번개
    this.lightningT -= dt;
    if (this.lightningT <= 0) {
      this.lightningT = rand(5, 9);
      G.ui.hud.flash('white');
      G.audio.play('thunder');
    }
  }

  async run() {
    await this.intro();
    const pre = this.labor.prelude;
    if (pre && !(G.save.data.sideSeen || []).includes('p8')) {
      await G.ui.screens.storybook(pre.pages);
      G.save.data.sideSeen = [...(G.save.data.sideSeen || []), 'p8'];
      if (pre.card && G.save.addCard(pre.card)) await G.ui.screens.card(pre.card);
    }
    this.objective('디오메데스의 마구간으로!', { x: 0, z: -22 });
    await this.ambush(0, -20, 9, () => [...this.wave(SOLDIER, 2, 0, -24, 4), this.add(new ShieldEnemy({ ...SOLDIER, x: 0, z: -21 })), ...this.wave(THROWER, 2, 0, -28, 2)], { text: '디오메데스의 병사들이다!' });
    this.checkpointAt(0, -30);
    this.objective('앞마당으로!', { x: 0, z: -44 });
    await until(() => G.player.pos.z < -38);
    this.checkpointAt(0, -38);
    // 암말 4마리 (묶여 있음)
    this.mares = [-6, -2, 2, 6].map((x, i) => {
      const m = this.add(new Mare({ x, z: -60 }));
      m.active = false;
      m.slot = Math.PI * (0.2 + i * 0.2);
      m.onCalm = () => this.mareCalm();
      return m;
    });
    const dio = this.add(new Diomedes({ x: 0, z: -54 }));
    dio.active = false;
    await this.bossIntro(dio, '디오메데스 왕', { roar: 'thunder', lines: [
      ['diomedes', '내 말들은 아무도 못 데려간다! 덤벼라, 헤라클레스!'],
    ] });
    dio.active = true;
    this.objective('디오메데스 왕을 물리치자!');
    await until(() => !dio.alive);
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    G.game.slowmo(0.3, 1.0);
    G.ui.hud.flash('gold');
    await waitReal(1.2);
    // 2단계: 암말들이 날뜀
    this.cutscene(true);
    this.focus(0, -58, 0.9);
    G.audio.play('neigh');
    this.mares.forEach((m) => m.squash(0.4, 0.3));
    await this.talk([
      ['mare', '히히히힝!!!'],
      ['glau', '부엉! 암말들이 날뛰어! 나쁜 왕 때문에 사나워진 거야. 힘을 빼 주면 얌전해질 거야!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    G.audio.music('boss');
    this.mares.forEach((m) => (m.active = true));
    this.calmed = 0;
    this.counter('얌전해진 암말 0 / 4');
    // 노란 화살표가 아직 날뛰는 가장 가까운 암말을 가리킴 (멀리 떨어진 암말은 다가가야 움직이기 시작함)
    this.objective('날뛰는 암말들을 진정시키자!', this.nearestWildMare(), { beam: false });
    await until(() => {
      const m = this.nearestWildMare();
      if (m && G.guide.target !== m) G.guide.set(m, { beam: false });
      return this.calmed >= 4;
    });
    this.counter(null);
    G.audio.music(null);
    G.audio.jingle('victory');
    await this.banner('암말들이 얌전해졌다!', '', 1.8);
    G.audio.music('field');
    this.objective('암말들을 배까지 데려가자!', { x: 2, z: 4 });
    await until(() => G.player.pos.z > -2 && this.mares.every((m) => m.pos.z > -14));
    await this.say('hercules', '자, 모두 배에 타자! 에우리스테우스 왕에게 가는 거야!');
    await this.giveRewards();
    await this.complete();
  }

  nearestWildMare() {
    const p = G.player.pos;
    let best = null, bd = Infinity;
    for (const m of this.mares) {
      if (m.calm) continue;
      const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  mareCalm() {
    this.calmed++;
    this.counter(`얌전해진 암말 ${this.calmed} / 4`);
  }
}

void wait;
void Follower;
void damp;
