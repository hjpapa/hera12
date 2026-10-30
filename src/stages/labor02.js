// 과업 2 — 레르나의 히드라 🐍
// 🧒 "히드라 퇴치하기. 조카 이올라오스의 도움을 받아, 이올라오스는 그 자리를 횃불로 지짐"
// 머리를 쓰러뜨림 → "🔥 지져 줘!" → 이올라오스가 횃불로 치익! (늦으면 머리 두 개) → 황금 머리 → 바위로 봉인 → 독화살
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Enemy, Boss } from '../game/enemy.js';
import { Entity } from '../game/entity.js';
import { Combat } from '../game/combat.js';
import { Hazard, Shot, Breakable } from '../game/items.js';
import { rand, TAU, damp } from '../core/util.js';
import { toon } from '../render/props.js';

const TOAD = { sprite: 'toad', hp: 24, speed: 3, ai: 'hopper', radius: 0.55, exp: 6, coins: [0, 2], damage: 1, aggro: 11 };

class Crab extends Boss {
  constructor(o) {
    super({ sprite: 'crab_giant', hp: 220, radius: 1.3, speed: 3.6, damage: 1, exp: 30, coins: 12, title: '거대 게 카르키노스', ...o });
  }
  patterns() {
    return [this.pPinch, this.pPinch, this.pSide];
  }
  async pPinch() {
    await this.approach(2.4, 2.5);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.6, radius: 1.7, speed: 10, time: 0.18, damage: 1 });
  }
  async pSide() {
    await this.charge({ windup: 0.85, speed: 13, time: 0.8, stunOnWall: 1.5 });
  }
}

// 히드라 머리 하나 (몸통 옆 기준점에서 목을 빼서 공격)
class Head extends Enemy {
  constructor(o) {
    super({ sprite: o.gold ? 'hydra_head_gold' : 'hydra_head', hp: o.gold ? 220 : 60, radius: 0.9, ai: 'none', exp: o.gold ? 0 : 8, coins: [1, 2], heartChance: 0.25, superArmor: true, knockResist: 1, anchored: true, mass: 20, ...o });
    this.hydra = o.hydra;
    this.gold = !!o.gold;
    this.base = { x: o.x, z: o.z };
    this.cool = rand(1.2, 2.8);
    this.strike = null;
    this.necks = [];
    this.stunImmune = true;
    if (this.gold) this.hittable = false;
  }

  onAdd() {
    const g = new THREE.SphereGeometry(0.45, 8, 6);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(g, toon(this.gold ? 0xd8b040 : 0x4a9a5a));
      m.castShadow = true;
      this.world.root.add(m);
      this.necks.push(m);
    }
  }

  takeDamage(n, info) {
    if (this.gold && !this.hydra.goldOpen) return false;
    return super.takeDamage(n, info);
  }

  damageFilter() {
    if (this.gold && !this.hydra.goldOpen) return { blocked: true, text: '안 통해!', sound: 'ting' };
    return null;
  }

  die(info) {
    if (this.gold) {
      // 황금 머리는 죽지 않는다 → 기절
      this.hp = 1;
      this.hydra.goldDown(this);
      return;
    }
    super.die(info);
    this.hydra.headDown(this);
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
    // 흔들흔들
    const sway = Math.sin(this.time * 1.6 + this.base.x) * 0.5;
    this.pos.x = this.base.x + sway;
    this.pos.z = this.base.z;
    this.y = 1.1 + Math.sin(this.time * 2.2) * 0.25;
    this.updateFlip(p.pos.x - this.pos.x, 0);
    this.cool -= dt;
    if (this.cool <= 0 && this.hydra.fighting) {
      const d = this.distP();
      this.cool = rand(2.2, 4) * (this.gold ? 0.8 : 1);
      if (d < 7.5 && Math.random() < 0.75) {
        // 물기 (빨간 원 예고)
        const tx = p.pos.x, tz = p.pos.z;
        this.tele = G.fx.telegraphCircle({ x: tx, z: tz }, 1.5, 0.85);
        this.warn();
        G.audio.play('hiss');
        setTimeoutGame(0.85, () => {
          this.clearTele();
          if (this.alive && !this.stunned) this.strike = { x: tx, z: tz, t: 0, dur: 0.5, hit: false };
        });
      } else if (d < 14) {
        // 독 뱉기 → 독 웅덩이
        const tele = G.fx.telegraphCircle({ x: p.pos.x, z: p.pos.z }, 1.6, 1.0);
        const tx = p.pos.x, tz = p.pos.z;
        G.audio.play('poison');
        this.world.add(new Shot({
          x: this.pos.x, z: this.pos.z, y: 2, dirX: 1, dirZ: 0, kind: 'poison', damage: 1,
          lob: { tx, tz, time: 1.0, height: 4, onLand: (x, z) => {
            tele.remove();
            Combat.hitPlayerIfIn({ x, z }, 1.5, 1, { knock: 4 });
            this.world.add(new Hazard({ x, z, radius: 1.6, life: 4, damage: 1, color: 0x8af06a }));
          } },
        }));
      }
    }
  }

  syncVisual(dt) {
    super.syncVisual(dt);
    // 목: 몸통 → 머리 사이 구슬
    const b = this.hydra.body;
    for (let i = 0; i < this.necks.length; i++) {
      const k = (i + 1) / (this.necks.length + 1);
      const m = this.necks[i];
      m.visible = this.alive || this.dying;
      m.position.set(b.pos.x + (this.pos.x - b.pos.x) * k, 0.8 + (this.y + 0.6 - 0.8) * k + Math.sin(k * Math.PI) * 0.8, b.pos.z + (this.pos.z - b.pos.z) * k);
      m.scale.setScalar(1.25 - k * 0.4);
    }
  }

  dispose() {
    super.dispose();
    this.necks.forEach((m) => { m.removeFromParent(); m.geometry.dispose(); });
  }
}

// 게임 시간 기준 타이머 (일시정지 중엔 멈춤)
function setTimeoutGame(sec, fn) {
  wait(sec).then(fn);
}

export default class Labor02 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['iolaus', 'toad', 'crab_giant', 'hydra_body', 'hydra_head', 'hydra_head_gold', 'boulder']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 2 };
    this.heads = [];
    this.stumps = [];
    this.burned = 0;
  }

  setup() {
    G.game.setSky('#8fb8a0', '#dce8c8', '#c8dcc0', 35, 105);
    G.game.setLight({ hemiSky: 0xe0f0d0, hemiGround: 0x5a6a3a, hemi: 1.6, sun: 2.0, sunColor: 0xf0ffd8, tint: 0xf4fff0 });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 110, h: 120, cz: -38,
      color: 0x7a9a4a, color2: 0x5a7a3a, edge: 0x5a4a2a,
      zones: [[0, 0, 6], [0, -22, 9], [12, -30, 3], [-8, -42, 8], [0, -64, 12.5]],
      roads: [[[0, -4], [0, -14]], [[6, -26], [11, -29]], [[-4, -30], [-7, -35]], [[-5, -49], [-2, -53]]],
      pathColor: 0xa8a070,
      border: (x, z, i) => (i % 3 === 0 ? B.tree('dead', x, z, { collide: false }) : i % 3 === 1 ? B.bush(x, z, { color: 0x4a7a3a }) : B.grass(x, z, 1.2, 8, 0x8aaa4a)),
    });
    // 늪 물웅덩이 (못 들어감)
    for (const [x, z, r] of [[5, -20, 2.2], [-6, -19, 1.8], [-10, -45, 1.5], [7, -60, 2]]) {
      B.water(x, z, { r, color: 0x4a7a5a, color2: 0x9ac8a0, alpha: 0.95 });
      world.block({ type: 'circle', x, z, r: r - 0.3 });
    }
    // 레르나 호수 (히드라 뒤)
    B.water(0, -84, { w: 60, h: 22, color: 0x3a6a5a, color2: 0x8ac0a8 });
    for (let i = 0; i < 18; i++) B.grass(rand(-28, 28), rand(-74, -78), 1.4, 10, 0x6a9a4a);
    this.pots([[4, -18], [-5, -26], [3, -27], [-12, -40], [-4, -46], [8, -58], [-8, -60]]);
    this.treasurePot(13, -31);
    this.iolaus = this.follower('iolaus', -1.5, 3, { gap: 2.6, speed: 7.5 });
  }

  afterBuild() {
    this.iolaus.leader = G.player;
  }

  async run() {
    await this.intro();
    await this.talk([
      ['iolaus', '삼촌! 여기가 레르나 늪이에요. 으, 냄새…'],
      ['hercules', '이올라오스, 내 뒤에 꼭 붙어 있어!'],
    ]);
    this.objective('늪 깊숙이 들어가자', { x: 0, z: -22 });
    await this.ambush(0, -22, 8, () => this.wave(TOAD, 4, 0, -24, 4.5), { text: '독두꺼비들이다!' });
    this.checkpointAt(0, -22);
    this.objective('더 깊이!', { x: -8, z: -42 });
    await until(() => G.player.pos.z < -36);
    // 카르키노스
    const crab = this.add(new Crab({ x: -8, z: -45 }));
    crab.active = false;
    await this.say('glau', '부엉! 헤라 여신이 보낸 거대 게야! 집게를 조심해!');
    crab.active = true;
    await this.bossIntro(crab, '거대 게 카르키노스', { roar: 'hiss' });
    await until(() => !crab.alive);
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    G.audio.music('field');
    this.toast('카르키노스를 물리쳤다!', 2);
    this.checkpointAt(-6, -44);
    await wait(1);
    this.objective('히드라의 호수로!', { x: 0, z: -62 });
    await until(() => G.player.pos.z < -56);
    this.checkpointAt(0, -56);
    await this.hydraFight();
  }

  async hydraFight() {
    const W = this.world;
    const body = (this.body = this.add(new Entity({ sprite: 'hydra_body', x: 0, z: -75.5, radius: 3, solid: true, anchored: true, mass: 100, hittable: false, scale: 1.4 })));
    body.team = 'neutral';
    this.fighting = false;
    const spots = [[-6, -71], [-3.2, -69.5], [3.2, -69.5], [6, -71], [0, -71.5]];
    const hydra = this;
    const mk = (x, z, gold = false) => {
      const h = this.add(new Head({ x, z, hydra, gold }));
      this.heads.push(h);
      return h;
    };
    spots.slice(0, 4).forEach(([x, z]) => mk(x, z));
    mk(-1.6, -68.5);
    this.gold = mk(1.6, -72.5, true);
    this.initial = 5;
    this.cutscene(true);
    this.focus(0, -68, 0.95);
    await waitReal(0.4);
    G.audio.play('hiss');
    G.audio.play('roar');
    G.rig.shake(0.5);
    await this.banner('레르나의 히드라', '머리가 여럿 달린 물뱀', 1.6);
    await this.talk([
      ['hydra', '쉬이이이익!'],
      ['glau', '머리를 쓰러뜨리면 바로 "지져 줘!" 버튼을 눌러! 횃불로 지지지 않으면 머리가 두 개 나와!'],
      ['iolaus', '맡겨 주세요, 삼촌! 제 횃불이 준비됐어요!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    G.audio.music('boss');
    this.fighting = true;
    G.rig.pair = body;
    this.bossProxy = { hp: 1, maxHp: 1, title: '레르나의 히드라', alive: true, bossFrac: () => this.hydraFrac() };
    G.ui.hud.setBoss(this.bossProxy, '레르나의 히드라');
    this.objective('머리를 쓰러뜨리고 지지자!');
    this.updateCounter();
    await until(() => this.goldOpen);
    this.objective('황금 머리를 쓰러뜨리자!', this.gold, { beam: false });
    this.gold.hittable = true;
    await until(() => this.goldStunned);
    // 바위로 봉인
    const rock = this.add(new Breakable({ x: 7, z: -64, sprite: 'boulder', scale: 1.0, radius: 1.1, hits: 99 }));
    rock.hittable = false;
    this.objective('큰 바위를 굴려 황금 머리를 눌러 버리자!', rock, { beam: false });
    await this.say('glau', '황금 머리는 절대 죽지 않아! 큰 바위로 눌러 버려!');
    let pushed = false;
    const it = W.interact({ entity: rock, radius: 3, icon: 'push', label: '굴리기!', action: () => (pushed = true) });
    await until(() => pushed);
    W.removeInteract(it);
    this.fighting = false;
    this.cutscene(true);
    this.focus(3, -70, 0.85);
    G.audio.play('rock');
    const g = this.gold;
    const sx = rock.pos.x, sz = rock.pos.z;
    for (let i = 0; i <= 25; i++) {
      const k = i / 25;
      rock.pos.x = sx + (g.pos.x - sx) * k;
      rock.pos.z = sz + (g.pos.z - sz) * k;
      rock.visual.roll = -i * 0.3;
      if (i % 3 === 0) G.fx.dust(rock.pos, { count: 2 });
      await waitReal(0.035);
    }
    G.audio.play('stomp');
    G.rig.shake(0.8);
    g.setDizzy(false);
    g.visual.setVisible(false);
    g.alive = false;
    g.necks.forEach((n) => (n.visible = false));
    G.fx.starPop(g.pos, 1.5);
    // 몸통도 쓰러짐
    this.heads.forEach((h) => h.alive && h !== g && h.die());
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    body.visual.setOpacity(0.5);
    G.fx.starPop(body.pos, 2.4);
    await this.bossDown(body, { text: '과업 성공!' });
    body.visual.setVisible(false);
    this.counter(null);
    await this.talk([
      ['iolaus', '해냈어요, 삼촌! 우리 둘이 해냈어요!'],
      ['hercules', '고마워, 이올라오스. 네 횃불 덕분이야!'],
      ['hercules', '히드라의 독에 화살촉을 살짝 묻혀 두면… 아주 센 화살이 되겠는걸?'],
    ]);
    this.unfocus();
    await this.giveRewards();
    await this.say('glau', '스킬 버튼을 누르면 독화살이 나가! 자동으로 적을 따라가니까 걱정 마!');
    await this.complete();
  }

  hydraFrac() {
    if (this.goldOpen) return this.gold ? Math.max(0, this.gold.hp / this.gold.maxHp) : 0;
    const alive = this.heads.filter((h) => !h.gold && h.alive).length;
    return Math.max(0.05, 0.4 + 0.6 * (alive + this.stumps.length) / Math.max(1, this.initial + 2));
  }

  updateCounter() {
    const alive = this.heads.filter((h) => !h.gold && h.alive).length;
    this.counter(`남은 머리 ${alive} · 지진 자리 ${this.burned}`);
    G.ui.hud.updateBoss(this.bossProxy);
  }

  headDown(h) {
    // 잘린 자리: 빨갛게 빛나고 6초 안에 지져야 함
    const st = { x: h.base.x, z: h.base.z, t: 6, ring: null, it: null };
    st.ring = G.fx.telegraphCircle({ x: st.x, z: st.z }, 1.3, 6, 0xff8a2a);
    st.it = this.world.interact({ pos: { x: st.x, z: st.z }, radius: 8, icon: 'torch', label: '지져 줘!', action: () => this.burn(st) });
    this.stumps.push(st);
    this.updateCounter();
    G.fx.text({ x: st.x, y: 1, z: st.z }, '지금 지져!', { color: '#ffb84a', size: 1, cls: 'word', rise: 2 });
  }

  burn(st) {
    if (st.burning) return;
    st.burning = true;
    this.world.removeInteract(st.it);
    this.burnQueue = this.burnQueue || [];
    this.burnQueue.push(st);
    if (!this.ioBusy) this.burnLoop();
  }

  // 이올라오스가 잘린 자리를 하나씩 횃불로 지진다
  async burnLoop() {
    this.ioBusy = true;
    const io = this.iolaus;
    while (this.burnQueue.length) {
      const st = this.burnQueue.shift();
      if (G.time - (this.ioTalkT || -9) > 4) {
        this.ioTalkT = G.time;
        G.fx.text({ x: io.pos.x, y: 1.6, z: io.pos.z }, '맡겨 주세요, 삼촌!', { color: '#bfeaff', size: 0.8, cls: 'word', rise: 1.2, life: 1.4 });
        G.audio.speak('맡겨 주세요, 삼촌!', { pitch: 1.45 });
      }
      io.leader = null;
      await io.goTo(st.x, st.z + 1.2, 14, 1.6);
      G.audio.play('sizzle');
      G.audio.play('fire');
      for (let i = 0; i < 14; i++) G.fx.particle({ x: st.x + rand(-0.6, 0.6), y: 0.3, z: st.z + rand(-0.6, 0.6), vy: rand(2, 4), size: 1.2, sizeEnd: 0.2, life: 0.6, color: i % 2 ? 0xff8a2a : 0xffe24a, tile: 'glow', additive: true });
      G.fx.dust({ x: st.x, z: st.z }, { count: 6, color: 0x6a6a6a, size: 1.2 });
      this.B.patch(st.x, st.z, 1.1, 0x3a3030, 0.05);
      st.ring.remove();
      this.stumps = this.stumps.filter((s) => s !== st);
      this.burned++;
      this.updateCounter();
      G.fx.text({ x: st.x, y: 1, z: st.z }, '치이익!', { color: '#ffd84a', size: 1.2, cls: 'word' });
      await wait(0.25);
    }
    io.leader = G.player;
    this.ioBusy = false;
    this.checkGold();
  }

  regrow(st) {
    this.world.removeInteract(st.it);
    st.ring.remove();
    this.stumps = this.stumps.filter((s) => s !== st);
    const alive = this.heads.filter((h) => !h.gold && h.alive).length;
    const n = alive >= 6 ? 1 : 2;
    G.audio.play('hiss');
    this.toast(n === 2 ? '앗! 머리가 두 개 나왔어!' : '머리가 다시 났어!', 1.8);
    for (let i = 0; i < n; i++) {
      const x = st.x + (i === 0 ? -0.9 : 0.9) * (n === 2 ? 1 : 0), z = st.z + (i ? 0.4 : 0);
      const h = this.add(new Head({ x, z, hydra: this }));
      h.cool = 1.5 + i;
      this.heads.push(h);
      G.fx.starPop({ x, y: 0, z }, 0.6);
    }
    this.updateCounter();
  }

  checkGold() {
    const alive = this.heads.filter((h) => !h.gold && h.alive).length;
    if (alive === 0 && this.stumps.length === 0 && !this.goldOpen) {
      this.goldOpen = true;
      this.gold.hittable = true;
      this.toast('황금 머리가 드러났다!', 2.2);
      G.ui.hud.bossName.textContent = '히드라 · 황금 머리';
      this.updateCounter();
    }
  }

  goldDown(g) {
    if (this.goldStunned) return;
    this.goldStunned = true;
    g.stunned = true;
    g.stunT = 999;
    g.hittable = false;
    g.setDizzy(true);
    g.strike = null;
    g.pos.set(g.base.x, 0, g.base.z);
    g.y = 0.2;
    G.audio.play('star');
  }

  update(dt) {
    for (const st of [...this.stumps]) {
      if (st.burning) continue;
      st.t -= dt;
      if (st.t <= 0) this.regrow(st);
    }
    if (this.fighting) {
      const alive = this.heads.filter((h) => !h.gold && h.alive).length;
      if (alive === 0 && this.stumps.length === 0) this.checkGold();
    }
  }
}

void damp;
void TAU;
