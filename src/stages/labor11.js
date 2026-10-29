// 과업 11 — 헤스페리데스의 황금사과 🍎
// 🧒 "프로메테우스를 구해주고 하늘을 드는 아틀라스 대신 하늘을 떠받쳐 아틀라스를 속이고 황금사과를 가진 다음에
//     라돈을 죽이고 황금사과를 얻었다"
// 네레우스에게 길 묻기 → 독수리를 쫓고 쇠사슬 끊기(프로메테우스 구출) → 하늘 들기 균형 게임 → 꾀로 아틀라스 속이기
// → 세 번째 황금사과를 지키는 용 라돈
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Enemy } from '../game/enemy.js';
import { Entity } from '../game/entity.js';
import { NPC } from '../game/npc.js';
import { Breakable, Shot } from '../game/items.js';
import { Combat } from '../game/combat.js';
import { FlyBoss } from '../game/bosses.js';
import { toon } from '../render/props.js';
import { el } from '../ui/dom.js';
import { rand, clamp, TAU } from '../core/util.js';

// 라돈의 머리 (사과나무를 둘러싼 용)
class LadonHead extends Enemy {
  constructor(o) {
    super({ sprite: 'ladon_head', hp: 120, radius: 0.9, ai: 'none', exp: 15, coins: [2, 3], superArmor: true, knockResist: 1, anchored: true, mass: 20, heartChance: 0.3, stunImmune: true, ...o });
    this.base = { x: o.x, z: o.z };
    this.body = o.body;
    this.cool = rand(1.5, 3);
    this.strike = null;
    this.necks = [];
  }
  onAdd() {
    const g = new THREE.SphereGeometry(0.5, 8, 6);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(g, toon(0x3a8a6a));
      m.castShadow = true;
      this.world.root.add(m);
      this.necks.push(m);
    }
  }
  think(dt) {
    const p = this.player;
    if (this.strike) {
      const s = this.strike;
      s.t += dt;
      const k = s.t / s.dur;
      const out = k < 0.5 ? k * 2 : 2 - k * 2;
      this.pos.x = this.base.x + (s.x - this.base.x) * out;
      this.pos.z = this.base.z + (s.z - this.base.z) * out;
      this.y = 0.3 + (1 - out) * 0.8;
      if (!s.hit && k > 0.35 && k < 0.65 && Combat.hitPlayerIfIn({ x: s.x, z: s.z }, 1.5, 1, { knock: 8 })) s.hit = true;
      if (k >= 1) {
        this.strike = null;
        this.pos.set(this.base.x, 0, this.base.z);
      }
      return;
    }
    this.pos.x = this.base.x + Math.sin(this.time * 1.4 + this.base.z) * 0.5;
    this.y = 1.2 + Math.sin(this.time * 2) * 0.25;
    this.updateFlip(p.pos.x - this.pos.x, 0);
    this.cool -= dt;
    if (this.cool <= 0) {
      this.cool = rand(2.4, 4);
      const d = this.distP();
      if (d < 7) {
        const tx = p.pos.x, tz = p.pos.z;
        this.tele = G.fx.telegraphCircle({ x: tx, z: tz }, 1.5, 0.8);
        this.warn();
        wait(0.8).then(() => {
          this.clearTele();
          if (this.alive) this.strike = { x: tx, z: tz, t: 0, dur: 0.5, hit: false };
        });
      } else if (d < 16) {
        const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
        const tele = G.fx.telegraphLine(this.pos, { x: dx / d, z: dz / d }, 16, 1, 0.7);
        G.audio.play('fire');
        wait(0.7).then(() => {
          tele.remove();
          if (this.alive) this.world.add(new Shot({ x: this.pos.x, z: this.pos.z, y: 1.5, dirX: dx, dirZ: dz, kind: 'fire', speed: 12, damage: 1 }));
        });
      }
    }
  }
  syncVisual(dt) {
    super.syncVisual(dt);
    const b = this.body;
    for (let i = 0; i < this.necks.length; i++) {
      const k = (i + 1) / (this.necks.length + 1);
      const m = this.necks[i];
      m.visible = this.alive || this.dying;
      m.position.set(b.x + (this.pos.x - b.x) * k, 0.9 + (this.y + 0.6 - 0.9) * k + Math.sin(k * Math.PI) * 0.6, b.z + (this.pos.z - b.z) * k);
      m.scale.setScalar(1.2 - k * 0.4);
    }
  }
  dispose() {
    super.dispose();
    this.necks.forEach((m) => { m.removeFromParent(); m.geometry.dispose(); });
  }
}

export default class Labor11 extends Stage {
  constructor(p) {
    super(p);
    this.spawn = { x: 0, z: 4 };
    this.skill = 'bow';
  }

  setup() {
    G.game.setSky('#a8b8e8', '#fff0e0', '#f0e8f0', 55, 140);
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 110, h: 140, cz: -50,
      color: 0xa8b890, color2: 0x8a9a78, edge: 0x6a6a5a,
      zones: [[0, 2, 7], [0, -28, 12], [15, -16, 3], [0, -62, 10], [0, -94, 13]],
      roads: [[[0, -3], [0, -16]], [[8, -22], [13, -17]], [[0, -40], [0, -52]], [[0, -72], [0, -81]]],
      pathColor: 0xe0d8c0,
      border: (x, z, i) => {
        if (z > -45) return i % 2 ? B.rock(x, z, { s: rand(1, 2), color: 0x8a8a98, collide: false }) : B.tree('pine', x, z, { collide: false });
        if (z > -78) return B.rock(x, z, { s: rand(1, 1.8), color: 0xb0a090, collide: false });
        return i % 2 ? B.tree('round', x, z, { collide: false, color: 0x5aae5a }) : B.bush(x, z, { flowers: 0xffd84a });
      },
    });
    B.water(0, 22, { w: 120, h: 30, color: 0x2a8ad8, color2: 0x9ae0ff });
    for (let i = 0; i < 5; i++) B.mountain(rand(-40, 40), rand(-44, -36) - 14, { r: rand(6, 10), h: rand(12, 18), color: 0x8a8a98 });
    // 프로메테우스의 바위
    B.rock(0, -38.5, { s: 2.6, color: 0x7a7a88 });
    this.prom = this.add(new NPC({ sprite: 'prometheus', x: 0, z: -36, lookAtPlayer: false }));
    this.chains = [[-2.6, -34.5], [2.6, -34.5], [0, -32.5]].map(([x, z]) => {
      const c = this.add(new Breakable({ x, z, sprite: 'chain', radius: 0.6, hits: 3 }));
      c.hittable = false;
      return c;
    });
    // 아틀라스와 하늘
    this.atlas = this.add(new Entity({ sprite: 'atlas', x: 0, z: -69, radius: 2, anchored: true, mass: 100 }));
    this.atlas.team = 'neutral';
    this.atlas.hittable = false;
    const sky = new THREE.Group();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), new THREE.MeshToonMaterial({ color: 0x3a4ab0, emissive: 0x101850 }));
    sky.add(globe);
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      const a = rand(0, TAU), b = rand(-1.2, 1.2);
      s.position.set(Math.cos(a) * Math.cos(b) * 3.25, Math.sin(b) * 3.25, Math.sin(a) * Math.cos(b) * 3.25);
      sky.add(s);
    }
    sky.position.set(0, 9.5, -69);
    sky.userData.dynamic = true;
    B.add(sky);
    this.sky = sky;
    // 헤스페리데스 정원
    this.appleTree = B.tree('apple', 0, -103, { s: 1.4 });
    this.appleTree.userData.dynamic = true;
    this.ladonBody = this.add(new Entity({ sprite: 'ladon_body', x: 0, z: -100.5, radius: 2.4, anchored: true, mass: 100, scale: 1.3 }));
    this.ladonBody.team = 'neutral';
    this.ladonBody.hittable = false;
    B.flowers(-6, -90, 4, 16);
    B.flowers(6, -92, 4, 16);
    this.pots([[4, -22], [-6, -26], [5, -58], [-5, -60], [-9, -90], [9, -88]]);
    this.treasurePot(15, -16);
    this.nereus = this.npc('nereus', 3.5, 1, null);
  }

  async run() {
    await this.intro();
    this.cutscene(true);
    this.focus(1.5, 1, 0.7);
    await this.talk([
      ['hercules', '세상 끝 정원이 어디 있는지 아는 사람은… 바다 노인 네레우스뿐이래!'],
      ['nereus', '끄응, 놓아 다오! 알았다, 알려 주마! 먼저 캅카스 산의 프로메테우스를 찾아가거라.'],
    ]);
    G.fx.burst(this.nereus.pos, { count: 14, color: 0x9ae0ff, tile: 'drop', size: 0.5, speed: 4, additive: false });
    this.nereus.world.remove(this.nereus);
    this.unfocus();
    this.cutscene(false);
    // ── 프로메테우스 구출 ──
    this.objective('캅카스 산으로!', { x: 0, z: -26 });
    await until(() => G.player.pos.z < -20);
    this.checkpointAt(0, -20);
    this.cutscene(true);
    this.focus(0, -32, 0.85);
    await this.say('prometheus', '으으… 사람들에게 불을 준 벌로, 나는 이 바위에 묶여 있다네…');
    const eagle = this.add(new FlyBoss({ sprite: 'eagle', x: 6, z: -34, hp: 460, exp: 70, coins: 20, title: '거대 독수리', flyHeight: 4.5 }));
    eagle.active = false;
    G.audio.play('bird');
    await this.say('hercules', '저 독수리가 할아버지를 괴롭히는구나! 내가 구해 줄게요!');
    this.unfocus();
    this.cutscene(false);
    await this.bossIntro(eagle, '거대 독수리', { roar: 'bird', lines: [['glau', '독화살로 맞혀! 땅으로 내려올 때는 몽둥이로 쾅!']] });
    eagle.active = true;
    this.objective('독수리를 물리치자!');
    await until(() => !eagle.alive);
    await this.bossDown(eagle, { text: '' });
    G.audio.music('field');
    this.chains.forEach((c) => (c.hittable = true));
    for (const c of this.chains) {
      if (!c.alive) continue;
      this.objective('쇠사슬을 끊자!', c);
      await until(() => !c.alive);
    }
    this.prom.visual.setSprite('prometheus_free');
    G.fx.starPop(this.prom.pos, 1.3);
    G.audio.jingle('reward');
    this.cutscene(true);
    this.focus(0, -33, 0.75);
    await this.talk([
      ['prometheus_free', '고맙네, 헤라클레스! 드디어 자유야!'],
      ['prometheus_free', '황금사과는 아틀라스에게 부탁하게. 정원의 요정들이 그의 딸들이거든.'],
    ]);
    this.unfocus();
    this.cutscene(false);
    // ── 하늘 들기 ──
    this.checkpointAt(0, -50);
    this.objective('하늘을 떠받치는 거인 아틀라스에게!', { x: 0, z: -60 });
    await until(() => G.player.pos.z < -56);
    this.cutscene(true);
    this.focus(0, -64, 1.1);
    await this.talk([
      ['atlas', '하늘이 너무 무겁구나… 젊은이, 네가 잠깐만 하늘을 들어 준다면, 내가 사과를 따다 주마.'],
      ['hercules', '좋아요! 하늘쯤이야… 으라차!'],
    ]);
    await this.holdSky();
    // ── 아틀라스 속이기 ──
    await this.trickAtlas();
    this.unfocus();
    this.cutscene(false);
    // ── 라돈 ──
    this.checkpointAt(0, -80);
    this.objective('세 번째 황금사과가 있는 정원으로!', { x: 0, z: -90 });
    await until(() => G.player.pos.z < -84);
    await this.ladonFight();
    // 사과 따기
    this.objective('나무에서 가장 빛나는 황금사과를 따자!', { x: 0, z: -99 });
    let picked = false;
    const it = this.world.interact({ pos: { x: 0, z: -99.5 }, radius: 3.2, icon: 'apple', label: '사과 따기', action: () => (picked = true) });
    await until(() => picked);
    this.world.removeInteract(it);
    this.cutscene(true);
    G.audio.play('magic');
    for (let i = 0; i < 6; i++) {
      this.appleTree.rotation.z = Math.sin(i * 2) * 0.06;
      G.fx.sparkle({ x: 0, y: 2, z: -102 }, { size: 0.6, h: 2 });
      await waitReal(0.08);
    }
    this.appleTree.rotation.z = 0;
    G.fx.starPop(G.player.pos, 1.4);
    await this.giveRewards();
    await this.say('hercules', '황금사과 세 개! 이제 왕에게 돌아가자!');
    await this.complete();
  }

  // 하늘 들기 균형 게임: 흔들리는 하늘이 기울지 않게 조이스틱으로 (실패 없음)
  async holdSky() {
    const p = G.player;
    const atlas = this.atlas;
    p.pos.set(0, 0, -66);
    p.visual.setSprite('hercules_hold');
    p.holding = true;
    atlas.visual.setSprite('atlas_free');
    G.audio.play('stomp');
    // 하늘이 헤라클레스 위로
    for (let i = 0; i <= 20; i++) {
      this.sky.position.set(0, 9.5 - (i / 20) * 4.6, -69 + (i / 20) * 3);
      await waitReal(0.03);
    }
    await this.say('atlas_free', '후아~ 가볍다! 금방 다녀오마!');
    for (let i = 0; i < 30; i++) {
      atlas.pos.z -= 0.6;
      atlas.visual.setOpacity(1 - i / 30);
      await waitReal(0.03);
    }
    atlas.visual.setVisible(false);
    // 균형 게임 UI
    const box = el('div', 'balance', G.ui.root);
    box.innerHTML = '<div class="bl-title">하늘이 기울지 않게! 조이스틱을 좌우로</div><div class="bl-bar"><div class="bl-safe"></div><div class="bl-mark"></div></div><div class="bl-fill"><div></div></div>';
    const mark = box.querySelector('.bl-mark');
    const fill = box.querySelector('.bl-fill div');
    G.input.setVisible(true);
    G.input.btn.attack.classList.add('hidden');
    G.input.btn.dash.classList.add('hidden');
    G.input.btn.skill.classList.add('hidden');
    G.input.btn.swap.classList.add('hidden');
    let tilt = 0, vel = 0, held = 0, push = 0, pushT = 0;
    const goal = G.debug.auto ? 0.5 : 15;
    await until(() => {
      const dt = G.dt;
      pushT -= dt;
      if (pushT <= 0) {
        pushT = rand(0.8, 1.6);
        push = rand(-1, 1) * 0.9;
      }
      vel += (push - G.input.move.x * 1.6 - tilt * 0.4) * dt;
      vel *= Math.exp(-2 * dt);
      tilt = clamp(tilt + vel * dt * 2, -1, 1);
      const safe = Math.abs(tilt) < 0.35;
      if (safe) held += dt;
      else {
        G.rig.shake(0.05);
        if (Math.random() < dt * 3) G.audio.play('thud');
      }
      mark.style.left = 50 + tilt * 46 + '%';
      mark.classList.toggle('bad', !safe);
      fill.style.width = Math.min(100, (held / goal) * 100) + '%';
      this.sky.rotation.z = -tilt * 0.4;
      this.sky.position.x = tilt * 1.2;
      p.visual.roll = -tilt * 0.25;
      return held >= goal;
    });
    box.remove();
    ['attack', 'dash'].forEach((b) => G.input.btn[b].classList.remove('hidden'));
    G.ui.hud.updateButtons();
    G.input.setVisible(false);
    G.audio.jingle('star');
    this.sky.rotation.z = 0;
    this.sky.position.x = 0;
  }

  async trickAtlas() {
    const atlas = this.atlas;
    atlas.pos.set(3.5, 0, -67);
    atlas.visual.setVisible(true);
    atlas.visual.setOpacity(1);
    G.fx.starPop(atlas.pos, 1);
    await this.say('atlas_free', '하하, 사과를 따 왔다! 그런데 말이야… 사과는 내가 왕에게 갖다주마. 너는 계속 하늘을 들고 있거라!');
    for (;;) {
      const i = await this.choose('hercules', '어떻게 할까?', ['네… 알겠어요…', '좋아요! 그런데 어깨가 아파서요. 방석 좀 대게 잠깐만 들어 주실래요?']);
      if (i === 1) break;
      await this.talk([
        ['atlas_free', '하하, 착하구나! 그럼 영원히 부탁한다~'],
        ['glau', '부엉!? 헤라클레스, 이러다 영원히 하늘만 들고 있겠어! 꾀를 써야지!'],
      ]);
    }
    await this.say('atlas_free', '흠, 그래. 잠깐만이다.');
    // 아틀라스에게 하늘을 넘김
    atlas.visual.setSprite('atlas');
    atlas.pos.set(0, 0, -69);
    for (let i = 0; i <= 20; i++) {
      this.sky.position.set(0, 4.9 + (i / 20) * 4.6, -66 - (i / 20) * 3);
      await waitReal(0.03);
    }
    const p = G.player;
    p.holding = false;
    p.refreshLook();
    p.pos.set(3, 0, -63);
    G.fx.burst(p.pos, { count: 10, color: 0xf5c542, tile: 'star', size: 0.5, speed: 3 });
    await this.talk([
      ['hercules', '고마워요, 아틀라스! 사과는 제가 가져갈게요~! 하늘 잘 부탁해요!'],
      ['atlas', '어? 어어?! 이 녀석, 속였구나!!'],
      ['glau', '부엉! 그런데 바구니에 사과가 두 개뿐이야. 가장 반짝이는 세 번째 사과는 나무 위에 그대로 있어!'],
    ]);
  }

  async ladonFight() {
    const b = { x: this.ladonBody.pos.x, z: this.ladonBody.pos.z };
    const heads = [[-5, -97], [-2.6, -95], [0, -94.5], [2.6, -95], [5, -97]].map(([x, z]) => this.add(new LadonHead({ x, z, body: b })));
    heads.forEach((h) => (h.active = false));
    const proxy = { hp: 1, maxHp: 1, alive: true, title: '용 라돈', bossFrac: () => heads.reduce((s, h) => s + Math.max(0, h.alive ? h.hp : 0), 0) / (heads.length * 120) };
    this.cutscene(true);
    this.focus(0, -96, 0.95);
    G.audio.play('roar');
    G.rig.shake(0.5);
    await this.banner('용 라돈', '황금사과 나무의 문지기', 1.6);
    await this.talk([
      ['ladon', '크르르르… 이 사과는 아무도 못 가져간다!'],
      ['glau', '머리를 하나씩 쓰러뜨려! 불덩이는 빨간 선을 보고 피해!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    heads.forEach((h) => (h.active = true));
    G.audio.music('boss');
    G.ui.hud.setBoss(proxy, '용 라돈');
    G.rig.pair = this.ladonBody;
    this.objective('라돈의 머리를 모두 쓰러뜨리자!');
    await until(() => {
      G.ui.hud.updateBoss(proxy);
      return heads.every((h) => !h.alive);
    });
    proxy.alive = false;
    this.ladonBody.visual.setOpacity(0.5);
    G.fx.starPop(this.ladonBody.pos, 2.2);
    await this.bossDown(this.ladonBody);
    this.ladonBody.visual.setVisible(false);
    this.cutscene(true);
    for (let i = 0; i < 20; i++) {
      G.fx.particle({ x: rand(-2, 2), y: 1, z: -100 + rand(-1, 1), vy: rand(6, 10), drag: 0.3, size: 0.7, life: 2, color: 0xfff6c8, tile: 'star', additive: true });
      await waitReal(0.05);
    }
    await this.say('glau', '라돈이 별이 되어 하늘로 올라갔어. 북쪽 하늘의 용자리야!');
    this.cutscene(false);
  }
}
