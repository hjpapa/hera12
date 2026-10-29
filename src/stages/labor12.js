// 과업 12 — 케르베로스 🐕🐕🐕
// 🧒 "헤라클레스는 카론의 도움으로 하데스에게 갔다. 헤라클레스는 케르베로스를 죽이고 케르베로스를 얻었다"
// 헤르메스의 안내 → 저승 길 → 카론의 배로 스틱스 강 건너기 → 하데스의 조건(맨손!) → 세 머리 케르베로스
// → 마지막 "꽉 잡기" (아기 때 뱀, 네메아 사자 때와 같은 힘) → 항복한 케르베로스가 동료가 됨
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Boss } from '../game/enemy.js';
import { Entity } from '../game/entity.js';
import { NPC, Follower } from '../game/npc.js';
import { Hazard } from '../game/items.js';
import { Combat } from '../game/combat.js';
import { rand, TAU } from '../core/util.js';

const BAT = { sprite: 'bat', hp: 22, speed: 5, ai: 'flyer', flyHeight: 1.4, orbitR: 4, orbitSpeed: 1.4, radius: 0.5, exp: 7, coins: [0, 2], damage: 1, cd: [2, 3], aggro: 14 };
const SKELETON = { sprite: 'skeleton', hp: 40, speed: 3.4, ai: 'melee', radius: 0.6, exp: 8, coins: [1, 2], damage: 1, aggro: 13 };

class Cerberus extends Boss {
  constructor(o) {
    super({ sprite: 'cerberus', hp: 1000, radius: 1.9, speed: 3.8, damage: 1, exp: 150, coins: 40, title: '저승의 문지기 케르베로스', rest: [0.4, 0.9], mass: 20, ...o });
    this.grabbable = false;
    this.dizzyHeads = 0;
  }
  patterns() {
    return [this.pFire, this.pBite, this.pIce, this.pTail, this.pPoison, this.pBite];
  }
  async pFire() {
    G.audio.play('bark');
    await this.shoot({ kind: 'fire', count: 3, spread: 0.3, windup: 0.8, speed: 11 });
  }
  async pIce() {
    G.audio.play('bark');
    await this.lob({ kind: 'ice', count: 3, radius: 1.6, windup: 0.5 });
  }
  async pPoison() {
    G.audio.play('bark');
    await this.lob({ kind: 'poison', count: 2, radius: 1.6, windup: 0.5, hazard: (x, z) => this.world.add(new Hazard({ x, z, radius: 1.6, life: 4 })) });
  }
  async pBite() {
    await this.approach(3.2, 2.5);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.6, radius: 2.1, speed: 12, time: 0.2, damage: 1 });
  }
  async pTail() {
    // 뱀 꼬리 휘두르기 (주변 링)
    this.mode = 'face';
    this.tele = G.fx.telegraphCircle(this.pos, 4.6, 0.95, 0x8af06a);
    this.warn();
    this.state = 'windup';
    await wait(0.95);
    this.clearTele();
    if (this.stopped()) return;
    G.audio.play('hiss');
    G.audio.play('whoosh');
    G.fx.ring(this.pos, { r0: 1.5, r1: 5, life: 0.4, color: 0x8af06a });
    Combat.hitPlayerIfIn(this.pos, 4.5, 1, { knock: 12 });
    this.state = 'chase';
    await wait(0.4);
  }
  takeDamage(n, info) {
    if (this.grabbable) return false;
    const r = super.takeDamage(n, info);
    const third = this.maxHp / 3;
    const dz = this.hp <= 0 ? 3 : this.hp <= third ? 2 : this.hp <= third * 2 ? 1 : 0;
    if (dz > this.dizzyHeads) {
      this.dizzyHeads = dz;
      if (dz < 3) {
        G.ui.hud.toast(`머리 ${dz}개가 어질어질!`, 1.6);
        G.audio.play('star');
      }
    }
    return r;
  }
  // 체력이 다하면 쓰러지지 않고 세 머리가 모두 어질어질 → 꽉 잡기!
  die() {
    if (this.grabbable) return;
    this.hp = 1;
    this.grabbable = true;
    this.stunned = true;
    this.stunT = 999;
    this.clearTele();
    this.setDizzy(true);
    G.audio.play('star');
    G.fx.text(this.pos, '세 머리 모두 어질어질~', { color: '#ffe86a', size: 1.2, cls: 'word', rise: 3 });
    this.onKO?.();
  }
  bossFrac() {
    return Math.max(0, this.hp / this.maxHp);
  }
}

export default class Labor12 extends Stage {
  constructor(p) {
    super(p);
    this.spawn = { x: 0, z: 4 };
    this.music = 'underworld';
  }

  setup() {
    G.game.setSky('#1a1430', '#4a3a6a', '#3a2a5a', 30, 95);
    G.game.setLight({ hemiSky: 0xb0a0e0, hemiGround: 0x3a2a4a, hemi: 1.4, sun: 1.2, sunColor: 0xc0b0ff, tint: 0xe0d8ff });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 100, h: 150, cz: -60,
      color: 0x5a4a72, color2: 0x42345a, edge: 0x2a2038,
      zones: [[0, 2, 7], [0, -24, 11], [-14, -30, 3], [0, -45, 6.5], [0, -90, 8], [0, -120, 13.5]],
      roads: [[[0, -3], [0, -14]], [[0, -34], [0, -40]], [[-7, -28], [-12, -30]], [[0, -97], [0, -107]]],
      pathColor: 0x7a6a92,
      border: (x, z, i) => (i % 3 === 0 ? B.rock(x, z, { s: rand(1, 1.8), color: 0x4a3a6a, collide: false }) : i % 3 === 1 ? B.tree('dead', x, z, { collide: false }) : B.flowers(x, z, 1, 5, [0xf4f0ff, 0xd8d0f0])),
    });
    B.cave(0, 9, { r: 3.4, color: 0x5a4a6a, collide: false });
    // 스틱스 강
    B.water(0, -66, { w: 100, h: 34, color: 0x2a3a4a, color2: 0x6a8a7a, flow: [0.3, 0] });
    this.boat = B.boat(0, -49.5, { s: 1.1, color: 0x3a2a3a });
    this.boat.userData.dynamic = true;
    // 하데스 궁전
    B.temple(0, -104, { w: 12, d: 5, h: 5, color: 0x6a5a80, roof: 0x2a1e3a, trim: 0x7cf0ff, collide: false });
    for (const [x, z] of [[-6, -86], [6, -86], [-9, -112], [9, -112], [-9, -128], [9, -128]]) B.torch(x, z);
    this.pots([[4, -20], [-5, -27], [5, -29], [-10, -118], [10, -122]]);
    this.treasurePot(-14, -31);
    this.hermes = this.npc('hermes', 3, -2, null);
    this.charon = this.npc('charon', 3.2, -46, null);
    this.hades = this.npc('hades', -2, -95, null);
    this.persephone = this.npc('persephone', 2, -95, null);
  }

  update(dt) {
    // 도깨비불
    if (Math.random() < dt * 6) {
      const p = G.player;
      if (p) G.fx.particle({ x: p.pos.x + rand(-12, 12), y: rand(0.5, 3), z: p.pos.z + rand(-12, 4), vy: 0.4, vx: rand(-0.3, 0.3), size: 0.5, life: 2.5, color: 0x8ad8ff, tile: 'glow', additive: true, fadeIn: true, drag: 0.2 });
    }
  }

  async run() {
    await this.intro();
    this.cutscene(true);
    this.focus(1.5, -1, 0.7);
    await this.talk([
      ['hermes', '안녕, 헤라클레스! 저승 가는 길은 내가 안내하지. 날개 신발로 휙휙~ 따라와!'],
      ['hercules', '마지막 과업이에요. 꼭 해낼 거예요!'],
    ]);
    G.fx.starPop(this.hermes.pos, 0.8);
    this.hermes.world.remove(this.hermes);
    this.unfocus();
    this.cutscene(false);
    this.objective('저승 길을 따라가자', { x: 0, z: -24 });
    await this.ambush(0, -22, 9, () => [...this.wave(BAT, 3, 0, -26, 4), ...this.wave(SKELETON, 3, 0, -24, 3)], { text: '박쥐와 해골 병사들이다!' });
    this.checkpointAt(0, -30);
    // 카론의 도움
    this.objective('스틱스 강의 뱃사공에게', this.charon);
    await until(() => G.player.pos.z < -40);
    this.cutscene(true);
    this.focus(1.5, -45, 0.7);
    await this.talk([
      ['charon', '살아 있는 자는… 이 배에 태울 수 없다…'],
      ['hercules', '카론 할아버지, 부탁드려요. 꼭 해야 하는 일이에요!'],
      ['narr', '(헤라클레스가 반짝이는 동전 오볼로스를 내밀어요)'],
      ['charon', '…흠. 그 눈빛… 겁이 없구나. 좋다, 타거라.'],
    ]);
    await this.boatRide();
    this.checkpointAt(0, -86);
    // 하데스
    this.focus(0, -92, 0.7);
    G.player.faceToward(0, -95);
    await this.talk([
      ['hades', '살아 있는 자가 여기까지 오다니… 무슨 일이냐.'],
      ['hercules', '하데스 님, 케르베로스를 잠깐만 데려가게 해 주세요. 마지막 과업이에요!'],
      ['persephone', '여보, 이 젊은이의 용기를 보세요.'],
      ['hades', '…좋다. 단, 무기는 하나도 쓰지 말고 맨손으로 이겨라.'],
      ['hercules', '맨손이라면 자신 있어요!'],
    ]);
    G.player.setWeaponMode('fist');
    G.player.skillsLocked = true;
    G.ui.hud.updateButtons();
    this.toast('몽둥이를 내려놓았다! 맨손 대결!', 2.2);
    this.unfocus();
    this.cutscene(false);
    this.objective('케르베로스가 있는 문으로', { x: 0, z: -112 });
    await until(() => G.player.pos.z < -108);
    this.checkpointAt(0, -109);
    const cer = this.add(new Cerberus({ x: 0, z: -124 }));
    cer.active = false;
    await this.bossIntro(cer, '케르베로스', { roar: 'bark', lines: [
      ['cerberus', '크르르르… 왈! 왈! 왈!!!'],
      ['glau', '불, 얼음, 독! 머리마다 다른 공격이야. 빨간 표시를 보고 피하면서 주먹으로!'],
    ] });
    cer.active = true;
    this.objective('맨손으로 케르베로스를 어질어질하게!');
    await new Promise((res) => (cer.onKO = res));
    // 꽉 잡기!
    this.objective('세 머리 모두 어질어질! 꽉 잡자!', cer, { beam: false });
    let go = false;
    const it = this.world.interact({ entity: cer, radius: 4, icon: 'grab', label: '꽉 잡기!', action: () => (go = true) });
    await until(() => go);
    this.world.removeInteract(it);
    const p = G.player;
    p.state = 'grab';
    p.pos.set(cer.pos.x - 2, 0, cer.pos.z + 0.6);
    p.faceToward(cer.pos.x, cer.pos.z);
    G.audio.play('grab');
    await this.say('hercules', '아기 때 뱀을 잡던 힘, 네메아 사자를 잡던 힘… 전부 다!! 으라차차차차!');
    let ok = false;
    while (!ok) {
      ok = await G.ui.hud.mash({ title: '꽉 잡기!', hint: '마지막 힘을 다해 톡톡톡!', goal: 22, time: 10, decay: 1.0, onTap: () => {
        cer.squash(0.1, 0.12);
        p.squash(0.08, 0.15);
        if (Math.random() < 0.5) G.fx.burst({ x: cer.pos.x - 1, y: 0, z: cer.pos.z }, { count: 3, color: 0xffe86a, speed: 4, size: 0.4, life: 0.4 });
      } });
      if (!ok) await this.say('glau', '조금만 더! 다시 한번!');
    }
    p.state = 'move';
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    G.game.slowmo(0.3, 1.2);
    G.ui.hud.flash('gold');
    G.audio.play('hit_big');
    G.rig.shake(0.8);
    await waitReal(1.2);
    // 항복 → 동료
    this.cutscene(true);
    this.focus(cer.pos.x, cer.pos.z, 0.7);
    cer.setDizzy(false);
    cer.visual.setSprite('cerberus_happy');
    cer.active = false;
    cer.team = 'neutral';
    cer.hittable = false;
    G.audio.music('hub');
    G.audio.play('bark');
    for (let i = 0; i < 3; i++) {
      G.fx.burst(cer.pos, { count: 8, color: 0xff8fb4, tile: 'heart', size: 0.6, speed: 3, gravity: -2, additive: false });
      cer.squash(0.2, 0.2);
      await waitReal(0.3);
    }
    await this.talk([
      ['cerberus_happy', '멍! (꼬리를 살랑살랑 흔들며 헤라클레스 얼굴을 핥아요)'],
      ['hercules', '하하하! 간지러워! 너도 사실은 착한 아이였구나!'],
      ['hades', '허허… 케르베로스가 저렇게 꼬리를 흔드는 건 처음 보는군.'],
    ]);
    await this.banner('케르베로스를 얻었다!', '', 1.8);
    G.player.setWeaponMode('club');
    G.player.skillsLocked = false;
    this.unfocus();
    this.cutscene(false);
    cer.world.remove(cer);
    const pal = this.add(new Follower({ sprite: 'cerberus_happy', x: cer.pos.x, z: cer.pos.z, scale: 0.6, gap: 2.8, speed: 8 }));
    pal.leader = G.player;
    await this.giveRewards();
    await this.complete();
  }

  async boatRide() {
    const p = G.player;
    const ch = this.charon;
    const boat = this.boat;
    p.pos.set(-0.6, 0, -49.5);
    ch.pos.set(0.8, 0, -50.5);
    p.noClip = true;
    ch.noClip = true;
    G.audio.play('splash');
    this.focus(0, -56, 1.0);
    const z0 = -49.5, z1 = -82;
    for (let i = 0; i <= 120; i++) {
      const z = z0 + (z1 - z0) * (i / 120);
      boat.position.z = z;
      boat.position.y = Math.sin(i * 0.2) * 0.06;
      p.pos.z = z;
      ch.pos.z = z - 1;
      p.lastSafe = { x: p.pos.x, z };
      G.rig.setFocus(0, z - 4, 1.0);
      if (i % 8 === 0) G.fx.particle({ x: rand(-6, 6), y: 0.3, z: z - rand(2, 10), vy: 1, size: 0.8, life: 1.6, color: 0x8ad8ff, tile: 'glow', additive: true });
      await waitReal(0.035);
    }
    p.pos.set(0, 0, -84);
    p.noClip = false;
    ch.pos.set(2, 0, -80);
    p.lastSafe = { x: 0, z: -84 };
    G.rig.snap();
    await this.say('charon', '…다 왔다. 하데스 님은 저 안에 계시다.');
  }
}

void Entity;
void NPC;
void TAU;
