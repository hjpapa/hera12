// 과업 10 — 게리온의 소 떼 🐮
// 🧒 "괴물 개 오르트로스를 죽인 뒤 뒤쫓아온 게리온마저 죽이고 소 떼를 데려왔다"
// 땅끝의 산을 쪼개 헤라클레스의 기둥 → 헬리오스의 황금 잔 타고 바다 건너기 → 오르트로스 → 소 모으기
// → 뒤쫓아 온 게리온 → "한 발로 셋을!" → 헤라의 쇠파리로 흩어진 소 다시 모으기
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Boss } from '../game/enemy.js';
import { Breakable, Pickup, Shot, Arrow } from '../game/items.js';
import { Follower, NPC } from '../game/npc.js';
import { Combat } from '../game/combat.js';
import { rand, TAU } from '../core/util.js';

class Orthrus extends Boss {
  constructor(o) {
    super({ sprite: 'orthrus', hp: 440, radius: 1.2, speed: 5, damage: 1, exp: 60, coins: 15, title: '머리 둘 달린 개 오르트로스', rest: [0.3, 0.7], ...o });
  }
  patterns() {
    return [this.pDouble, this.pDouble, this.pRush];
  }
  async pDouble() {
    G.audio.play('bark');
    await this.approach(2.6, 2.2);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.5, radius: 1.7, speed: 12, time: 0.16, damage: 1 });
    if (this.stopped()) return;
    G.audio.play('bark');
    await this.lunge({ windup: 0.35, radius: 1.7, speed: 12, time: 0.16, damage: 1 });
  }
  async pRush() {
    await this.charge({ windup: 0.8, speed: 17, time: 0.9, stunOnWall: 2 });
  }
}

class Geryon extends Boss {
  constructor(o) {
    super({ sprite: 'geryon', hp: 1000, radius: 1.8, speed: 3.2, damage: 2, exp: 120, coins: 30, title: '몸이 셋 달린 거인 게리온', rest: [0.6, 1.1], mass: 20, ...o });
    this.walkBob = 0.5;
  }
  patterns() {
    return [this.pSmash, this.pRocks, this.pSpin, this.pSmash];
  }
  async pSmash() {
    await this.approach(3.5, 2.5);
    if (this.stopped()) return;
    const p = this.player;
    const d = this.dir;
    await this.slam({ windup: 0.95, radius: 3, at: { x: this.pos.x + d.x * 2.5, z: this.pos.z + d.z * 2.5 }, damage: 2 });
    void p;
  }
  async pRocks() {
    await this.lob({ kind: 'rock', count: 3, radius: 1.8, damage: 1, windup: 0.6, time: 1.2 });
  }
  async pSpin() {
    this.mode = 'face';
    this.tele = G.fx.telegraphCircle(this.pos, 5, 1.0);
    this.warn();
    this.state = 'windup';
    await wait(1.0);
    this.clearTele();
    if (this.stopped()) return;
    G.audio.play('whoosh');
    G.audio.play('stomp');
    G.rig.shake(0.5);
    G.fx.ring(this.pos, { r0: 1, r1: 5.5, life: 0.4, color: 0xffc8a0 });
    Combat.hitPlayerIfIn(this.pos, 5, 1, { knock: 13 });
    this.state = 'chase';
    await wait(0.5);
  }
  // 세 머리마다 체력 칸 (보스 바에 표시)
  takeDamage(n, info) {
    const before = this.hp;
    const r = super.takeDamage(n, info);
    const seg = this.maxHp / 3;
    if (Math.ceil(before / seg) > Math.ceil(Math.max(0, this.hp) / seg) && this.hp > 0) {
      G.ui.hud.toast('게리온의 머리 하나가 어질어질!', 1.6);
      G.audio.play('star');
    }
    // 마지막은 독화살 한 발로 세 몸을 한꺼번에 (연출)
    if (this.hp <= this.maxHp * 0.08 && !this.finale) {
      this.finale = true;
      this.hp = Math.max(1, this.hp);
      this.onFinale?.();
    }
    return r;
  }
}

class Cow extends Follower {
  constructor(o) {
    super({ sprite: 'cow_red', radius: 0.8, gap: 2.5, speed: 7, ...o });
    this.joined = false;
  }
  update(dt) {
    const p = G.player;
    if (!this.joined && p && this.distTo(p) < 3.2 && !this.scattering) {
      this.joined = true;
      this.leader = p;
      G.audio.play('moo');
      G.fx.burst(this.pos, { count: 6, color: 0xff8fb4, tile: 'heart', size: 0.4, speed: 2, gravity: -2, additive: false });
      this.onJoin?.(this);
    }
    super.update(dt);
  }
}

export default class Labor10 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['helios', 'orthrus', 'geryon', 'cow_red', 'boulder']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 4 };
    this.skill = 'bow';
  }

  setup() {
    G.game.setSky('#ffb87a', '#ffe8c8', '#f8d8b8', 60, 150);
    G.game.setLight({ hemiSky: 0xffe0c0, hemiGround: 0xa07050, hemi: 1.7, sun: 2.3, sunColor: 0xffd0a0 });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    // 땅끝 (남쪽) → 바다 → 에리테이아 섬 (북쪽)
    world.circle(0, 2, 8);
    world.capsule(0, -4, 0, -16, 2.6);
    world.circle(0, -20, 7);
    world.circle(13, -14, 3);
    world.capsule(5, -17, 11, -14, 2);
    world.circle(0, -94, 15);
    world.capsule(0, -79, 0, -82, 4);
    B.ground({ shape: 'rect', w: 60, h: 34, x: 0, z: -7, color: 0xe8c890, color2: 0xd8b070, edge: 0xa07848 });
    B.ground({ shape: 'rect', w: 70, h: 40, x: 0, z: -96, color: 0xc89070, color2: 0xa86a50, edge: 0x7a4a32 });
    B.water(0, -52, { w: 140, h: 62, color: 0x2a6ad8, color2: 0xffc890, flow: [0, 0.4] });
    B.path([[0, 2], [0, -20]], { width: 3.4, color: 0xf8e0b0 });
    this.zones = [[0, 2, 8], [0, -20, 7], [0, -94, 15]];
    this.roads = [[[0, -4], [0, -16]]];
    this.borderDecor((x, z, i) => (i % 2 ? B.rock(x, z, { s: rand(1, 1.8), color: z < -70 ? 0xa05a40 : 0xd0a878, collide: false }) : B.tree(z < -70 ? 'round' : 'palm', x, z, { collide: false, color: z < -70 ? 0xc04a30 : null })), 3.6);
    // 길을 막은 큰 산
    this.mountainBlock = world.block({ type: 'capsule', ax: -4, az: -9, bx: 4, bz: -9, r: 2.2 });
    this.mount = B.mountain(0, -9, { r: 5, h: 9, color: 0xb08868, snow: false });
    this.mount.userData.dynamic = true;
    this.rock = this.add(new Breakable({ x: 0, z: -6.5, sprite: 'boulder', scale: 1.4, radius: 1.4, hits: 99 }));
    this.rock.hittable = false;
    this.pots([[5, 4], [-5, -20], [5, -22]]);
    this.treasurePot(13, -14);
    // 섬: 붉은 소 6마리
    this.cows = [[-8, -100], [-4, -104], [3, -105], [8, -100], [-9, -92], [9, -91]].map(([x, z]) => {
      const c = this.add(new Cow({ x, z }));
      c.onJoin = () => this.cowJoined();
      return c;
    });
    this.pots([[-10, -86], [10, -86]]);
  }

  cowJoined() {
    const n = this.cows.filter((c) => c.joined).length;
    if (this.countCows) this.counter(`모은 소 ${n} / 6`);
  }

  async run() {
    await this.intro();
    // 1) 헤라클레스의 기둥
    this.objective('길을 막은 산을 쾅쾅 쳐 보자!', this.rock);
    await this.say('hercules', '커다란 산이 길을 막고 있네… 이 정도쯤이야!');
    this.rock.hittable = true;
    await until(() => this.rock.hits >= 6);
    this.rock.hittable = false;
    this.cutscene(true);
    this.focus(0, -9, 0.9);
    G.audio.play('thunder');
    G.rig.shake(1);
    for (let i = 0; i < 20; i++) {
      this.mount.scale.set(1 - i * 0.05, 1 - i * 0.05, 1 - i * 0.05);
      G.fx.dust({ x: rand(-3, 3), z: -9 + rand(-2, 2) }, { count: 2, size: 2, color: 0xc8a888 });
      await waitReal(0.04);
    }
    this.mount.visible = false;
    this.rock.world.remove(this.rock);
    this.world.unblock(this.mountainBlock);
    this.B.column(-4.5, -9, { h: 8, color: 0xe8d0b0, r: 0.9 });
    this.B.column(4.5, -9, { h: 8, color: 0xe8d0b0, r: 0.9 });
    G.fx.starPop({ x: -4.5, y: 0, z: -9 }, 1.4);
    G.fx.starPop({ x: 4.5, y: 0, z: -9 }, 1.4);
    await this.say('glau', '우와! 산이 둘로 갈라졌어! 이 두 기둥을 사람들은 "헤라클레스의 기둥"이라고 부르게 될 거야!');
    this.unfocus();
    this.cutscene(false);
    // 2) 헬리오스의 황금 잔
    this.objective('바닷가로 가자', { x: 0, z: -20 });
    await until(() => G.player.pos.z < -17);
    this.checkpointAt(0, -20);
    this.cutscene(true);
    G.player.faceToward(0, -40);
    this.focus(0, -26, 0.85);
    await this.say('hercules', '너무 더워!! 해님, 좀 살살 비춰 주세요!');
    this.add(new Arrow({ x: G.player.pos.x, z: G.player.pos.z, dirX: 0, dirZ: -1, damage: 0 }));
    G.audio.play('arrow');
    await waitReal(0.6);
    const helios = this.add(new NPC({ sprite: 'helios', x: 3, z: -25 }));
    helios.y = 2.5;
    G.fx.starPop(helios.pos, 1.6);
    G.audio.play('magic');
    G.ui.hud.flash('gold');
    await this.say('helios', '하하하! 태양에게 활을 겨누다니, 배짱 한번 좋구나! 내 황금 잔을 빌려주마.');
    G.fx.starPop(helios.pos, 1);
    helios.world.remove(helios);
    this.unfocus();
    this.cutscene(false);
    await this.cupRide(-24, -78);
    this.checkpointAt(0, -84);
    // 3) 오르트로스
    const orth = this.add(new Orthrus({ x: 0, z: -96 }));
    orth.active = false;
    await this.bossIntro(orth, '오르트로스', { roar: 'bark', lines: [['orthrus', '왈! 왈왈! (머리 둘이 동시에 짖어요)']] });
    orth.active = true;
    this.objective('오르트로스를 물리치자!');
    await until(() => !orth.alive);
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    G.audio.music('field');
    this.toast('오르트로스를 물리쳤다!', 2);
    // 4) 소 모으기
    this.countCows = true;
    this.cowJoined();
    await this.gatherCows('붉은 소들에게 다가가 모으자!');
    this.counter(null);
    // 5) 뒤쫓아 온 게리온
    this.cutscene(true);
    const ger = this.add(new Geryon({ x: 0, z: -108 }));
    ger.active = false;
    this.focus(0, -102, 1.0);
    for (let i = 0; i < 3; i++) {
      G.audio.play('stomp');
      G.rig.shake(0.5);
      await waitReal(0.45);
    }
    await this.talk([
      ['geryon', '거기 서라!!! 내 소를 돌려놔라!!!'],
      ['hercules', '뒤쫓아 왔구나! 좋아, 덤벼라!'],
    ]);
    this.cows.forEach((c) => { c.leader = null; c.goTo(c.pos.x + rand(-2, 2), -84 + rand(-2, 2), 8); });
    this.unfocus();
    this.cutscene(false);
    ger.active = true;
    await this.bossIntro(ger, '거인 게리온', { roar: 'roar' });
    this.objective('게리온을 물리치자!');
    await new Promise((res) => (ger.onFinale = res));
    // 한 발로 셋을!
    ger.active = false;
    ger.clearTele();
    this.cutscene(true);
    this.focus((ger.pos.x + G.player.pos.x) / 2, (ger.pos.z + G.player.pos.z) / 2, 0.8);
    await this.say('hercules', '한 발로 셋을! 히드라 독화살!');
    G.game.slowmo(0.25, 2);
    G.player.faceToward(ger.pos.x, ger.pos.z);
    this.add(new Arrow({ x: G.player.pos.x, z: G.player.pos.z, dirX: ger.pos.x - G.player.pos.x, dirZ: ger.pos.z - G.player.pos.z, target: ger, damage: 999, pierce: true }));
    G.audio.play('arrow');
    await until(() => !ger.alive);
    this.cutscene(false);
    await this.bossDown(ger);
    // 6) 헤라의 쇠파리
    this.cutscene(true);
    await this.say('glau', '부엉! 헤라가 쇠파리를 보내서 소들이 흩어졌어! 다시 모아!');
    for (const c of this.cows) {
      c.joined = false;
      c.leader = null;
      c.scattering = true;
      const a = rand(0, TAU), d = rand(7, 12);
      c.goTo(Math.cos(a) * d, -94 + Math.sin(a) * d, 12).then(() => (c.scattering = false));
      G.fx.particle({ x: c.pos.x, y: 2, z: c.pos.z, size: 0.5, life: 1, color: 0x2d6a8a, tile: 'glow' });
    }
    G.audio.play('bird');
    this.cutscene(false);
    this.counter('모은 소 0 / 6');
    await this.gatherCows('흩어진 소들을 다시 모으자!');
    this.counter(null);
    this.objective('황금 잔으로 돌아가자!', { x: 0, z: -82 });
    await until(() => G.player.pos.z > -84);
    await this.say('hercules', '모두 황금 잔에 타자! 에우리스테우스 왕에게 가는 거야!');
    await this.giveRewards();
    await this.complete();
  }

  // 가장 가까운 소를 화살표로 가리키며 다 모을 때까지
  async gatherCows(text) {
    let t = 0;
    let cur = null;
    await until(() => {
      t -= G.dt;
      if (t <= 0 || (cur && cur.joined)) {
        t = 0.5;
        const p = G.player.pos;
        const left = this.cows.filter((c) => !c.joined);
        left.sort((a, b) => Math.hypot(a.pos.x - p.x, a.pos.z - p.z) - Math.hypot(b.pos.x - p.x, b.pos.z - p.z));
        if (left[0] !== cur) {
          cur = left[0] || null;
          this.objective(text, cur, { beam: false });
        }
      }
      return this.cows.every((c) => c.joined);
    });
  }

  // 황금 잔 타고 바다 건너기: 앞으로 자동, 좌우는 조이스틱
  async cupRide(z0, z1) {
    const W = this.world;
    const lane = { type: 'rect', x0: -9, z0: z1 - 3, x1: 9, z1: z0 + 2 };
    W.areas.push(lane);
    const cup = this.B.cup(0, z0, { s: 0.9 });
    cup.userData.dynamic = true;
    const p = G.player;
    p.pos.set(0, 0, z0);
    G.rig.snap();
    G.audio.music('chase');
    this.objective('황금 잔을 타고 바다를 건너자! 동전을 모으고 파도를 피해!');
    // 동전 길
    for (let z = z0 - 6; z > z1 + 4; z -= 2.2) {
      const x = Math.sin(z * 0.35) * 5;
      const c = this.add(new Pickup({ x, z, kind: 'coin', value: 1 }));
      c.vel.set(0, 0, 0);
      c.vy = 0;
      c.y = 0.4;
      c.delay = 99;
      c.life = 999;
    }
    this.riding = true;
    let waveT = 1.5;
    await until(() => {
      // 앞으로 자동 진행
      p.pos.z -= 6.5 * G.dt;
      p.vel.z = 0;
      cup.position.set(p.pos.x, -0.4 + Math.sin(G.time * 3) * 0.08, p.pos.z);
      cup.rotation.z = Math.sin(G.time * 2) * 0.05;
      // 근처 동전 줍기
      for (const e of W.entities) if (e.kind === 'coin' && e.delay > 50 && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 1.6) e.collect(p);
      waveT -= G.dt;
      if (waveT <= 0) {
        waveT = rand(1.4, 2.2);
        const x = rand(-7, 7);
        W.add(new Shot({ x, z: p.pos.z - 16, y: 0.5, dirX: 0, dirZ: 1, kind: 'water', speed: 7, damage: 1, life: 4, radius: 0.9 }));
      }
      return p.pos.z <= z1;
    });
    this.riding = false;
    W.areas = W.areas.filter((a) => a !== lane);
    cup.position.set(0, -0.4, z1 + 3);
    G.audio.music('field');
    this.toast('에리테이아 섬에 도착!', 2);
  }
}

void Breakable;
