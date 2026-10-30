// 과업 5 — 아우게이아스의 외양간 🐄💩
// 🧒 "강의 물줄기를 이용해 마구간을 한번에 청소했다"
// 삽질 한 번 → "백 년 걸리겠어!" → 두 강(알페이오스·페네이오스)을 막은 바위 깨기 → 물길이 한 칸씩 → 대청소!
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Entity } from '../game/entity.js';
import { Breakable } from '../game/items.js';
import { waterMaterial } from '../render/props.js';
import { rand, TAU } from '../core/util.js';

const FLY = { sprite: 'fly', hp: 14, speed: 4, ai: 'flyer', flyHeight: 1.2, orbitR: 3, orbitSpeed: 1.6, radius: 0.4, exp: 3, coins: [0, 1], damage: 1, cd: [2.2, 3.4], aggro: 12, heartChance: 0.1 };

const RIVERS = {
  W: { name: '알페이오스 강', pts: [[-34, -72], [-27, -58], [-20, -48], [-13, -40], [-7, -34]] },
  E: { name: '페네이오스 강', pts: [[34, -72], [27, -58], [20, -48], [13, -40], [7, -34]] },
};

const STRIP_GEO = new THREE.PlaneGeometry(1, 1, 1, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.5);

export default class Labor05 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['augeas', 'poop', 'cow', 'fly', 'boulder']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 4 };
    this.poops = [];
    this.strips = { W: [], E: [] };
    this.progress = { W: 0, E: 0 };
  }

  setup() {
    G.game.setSky('#8fd0ff', '#fff4d8', '#f8f0dc', 55, 130);
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 120, h: 110, cz: -30,
      color: 0xa8c870, color2: 0x8ab05a, edge: 0x8a6a40,
      zones: [[0, 0, 7], [0, -22, 12], [-20, -50, 11], [20, -50, 11], [-14, -6, 3]],
      roads: [[[0, -5], [0, -12]], [[-8, -28], [-17, -42]], [[8, -28], [17, -42]], [[-5, -3], [-12, -5]], [[-12, -50], [0, -47], [12, -50]]],
      pathColor: 0xd8c8a0,
      border: (x, z, i) => (i % 4 === 0 ? B.tree('olive', x, z, { collide: false }) : i % 4 === 1 ? B.bush(x, z, { flowers: 0xffd84a }) : B.grass(x, z, 1.2, 10, 0x7aa04a)),
    });
    // 외양간
    B.stable(0, -36, { w: 18, d: 9 });
    world.block({ type: 'rect', x0: -9.5, z0: -41, x1: 9.5, z1: -31.5 });
    B.fence(-12, -10, -6, -10);
    B.fence(6, -10, 12, -10);
    // 응가 더미 (외양간 안팎)
    const spots = [[-6, -36], [-2, -38], [3, -35], [7, -37], [-4, -33.5], [5, -33], [0, -34], [-8, -32.5], [8.5, -33], [-3, -29.5], [3, -29], [0, -27], [-6, -27], [6, -27]];
    spots.forEach(([x, z], i) => {
      const e = this.add(new Entity({ sprite: 'poop', x, z, solid: z > -31, anchored: true, mass: 50, radius: 0.8, scale: i < 9 ? 1.5 : 1.1 }));
      e.face = i % 2 ? 1 : -1;
      this.poops.push(e);
    });
    // 소들
    this.cows = [[-7, -39], [-1, -40], [6, -39.5], [2, -38.5]].map(([x, z]) => {
      const c = this.add(new Entity({ sprite: 'cow', x, z, solid: false }));
      c.face = Math.random() < 0.5 ? 1 : -1;
      return c;
    });
    // 두 강: 물길(처음엔 첫 칸만), 바위 3개씩
    for (const key of ['W', 'E']) {
      const R = RIVERS[key];
      B.water(R.pts[0][0], R.pts[0][1] - 8, { w: 20, h: 10, color: 0x3a8fd8, color2: 0xa8e0ff, flow: [0, 0.6] });
      for (let i = 0; i < R.pts.length - 1; i++) {
        const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1];
        // 흙 물길
        B.path([[ax, az], [bx, bz]], { width: 3.4, color: 0x8a6a40, y: 0.012 });
        const m = new THREE.Mesh(STRIP_GEO, waterMaterial(0x3a8fd8, 0xa8e0ff, 0.95, [0, 1.5]));
        m.position.set(ax, 0.05, az);
        m.rotation.y = Math.atan2(-(bx - ax), -(bz - az));
        m.userData.len = Math.hypot(bx - ax, bz - az);
        m.scale.set(2.6, 1, i === 0 ? m.userData.len : 0.001);
        m.userData.dynamic = true;
        m.renderOrder = 2;
        B.add(m);
        this.strips[key].push(m);
      }
      // 강을 막은 바위
      R.boulders = [1, 2, 3].map((i) => {
        const [x, z] = R.pts[i];
        const b = this.add(new Breakable({ x, z, sprite: 'boulder', scale: 0.9, radius: 1.1, hits: 4, onBreak: () => this.openRiver(key, i) }));
        b.hittable = false;
        return b;
      });
    }
    this.pots([[4, -2], [-10, -20], [10, -20], [-26, -44], [26, -44]]);
    this.treasurePot(-15, -6);
    this.augeas = this.npc('augeas', 3.5, -4, () => this.say('augeas', '하루 만에 다 치운다고? 하하! 그게 되면 내 소의 10분의 1을 주지!'), { radius: 0.7 });
  }

  // 바위가 깨지면 물이 한 칸 흘러 들어감
  async openRiver(key, i) {
    const m = this.strips[key][i];
    G.audio.play('splash');
    this.progress[key] = i;
    const len = m.userData.len;
    for (let k = 1; k <= 20; k++) {
      m.scale.z = (len * k) / 20;
      await waitReal(0.03);
    }
    G.fx.burst({ x: m.position.x, y: 0, z: m.position.z }, { count: 8, color: 0xa8e0ff, tile: 'drop', size: 0.5, speed: 4, additive: false });
    if (i === 3) {
      this.toast(`${RIVERS[key].name}이 외양간에 닿았다!`, 2.2);
      G.audio.jingle('star');
    }
  }

  async run() {
    await this.intro();
    this.objective('외양간으로 가 보자', { x: 0, z: -24 });
    await until(() => G.player.pos.z < -16);
    this.checkpointAt(0, -18);
    // 삽질 개그
    this.cutscene(true);
    this.focus(0, -28, 0.75);
    await waitReal(0.4);
    await this.talk([
      ['hercules', '으악! 응가가 산처럼 쌓였어!'],
      ['augeas', '하하! 30년 동안 한 번도 안 치웠거든. 하루 만에 치우면 소의 10분의 1을 주지!'],
    ]);
    G.audio.play('swing');
    G.player.squash(0.3, 0.3);
    G.fx.dust({ x: 0, z: -27 }, { count: 8, color: 0x8a5a2b });
    await waitReal(0.6);
    await this.talk([
      ['hercules', '(삽으로 한 번 퍼 보고) …이러다간 백 년 걸리겠어!'],
      ['glau', '부엉! 헤라클레스, 저기 두 강을 봐. 알페이오스 강과 페네이오스 강!'],
      ['hercules', '그래! 강물을 끌어오면 한 번에 씻어 낼 수 있겠다!'],
      ['glau', '강물을 막고 있는 바위들을 몽둥이로 깨부숴! 양쪽 강 모두!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    for (const key of ['W', 'E']) RIVERS[key].boulders.forEach((b) => (b.hittable = true));
    // 똥파리 떼
    this.flies = this.wave(FLY, 4, 0, -24, 5);
    this.flyTimer = 6;
    const left = () => ['W', 'E'].reduce((s, k) => s + RIVERS[k].boulders.filter((b) => b.alive).length, 0);
    const nextBoulder = () => {
      for (const k of ['W', 'E']) for (const b of RIVERS[k].boulders) if (b.alive) return b;
      return null;
    };
    this.objective('강을 막은 바위를 깨자!', nextBoulder());
    this.counter(`남은 바위 ${left()}`);
    this.working = true;
    let last = left();
    await until(() => {
      const n = left();
      if (n !== last) {
        last = n;
        this.counter(`남은 바위 ${n}`);
        const nb = nextBoulder();
        if (nb) this.objective('강을 막은 바위를 깨자!', nb);
      }
      return n === 0;
    });
    this.working = false;
    this.counter(null);
    await wait(1.0);
    await this.bigWash();
  }

  update(dt) {
    if (!this.working) return;
    this.flyTimer -= dt;
    if (this.flyTimer <= 0) {
      this.flyTimer = 7;
      const alive = this.world.enemies().length;
      if (alive < 5) {
        const p = this.poops[Math.floor(Math.random() * this.poops.length)];
        this.wave(FLY, 2, p.pos.x, p.pos.z + 2, 1);
        G.audio.play('bird');
      }
    }
  }

  async bigWash() {
    G.world.enemies().forEach((e) => e.die());
    this.cutscene(true);
    this.objective(null);
    G.player.pos.set(0, 0, -16);
    G.player.faceToward(0, -30);
    this.focus(0, -26, 1.15);
    await waitReal(0.5);
    await this.say('hercules', '간다! 강물아, 외양간을 씻어 줘!');
    G.audio.play('rush');
    G.audio.music(null);
    // 큰 물결이 북쪽에서 남쪽으로
    const wave = new THREE.Mesh(STRIP_GEO, waterMaterial(0x5aa8f0, 0xd8f4ff, 0.9, [0, 3]));
    wave.rotation.y = Math.PI;
    wave.position.set(0, 0.25, -44);
    wave.scale.set(24, 1, 0.01);
    wave.renderOrder = 3;
    this.world.root.add(wave);
    let cleaned = 0;
    const sorted = [...this.poops].sort((a, b) => a.pos.z - b.pos.z);
    for (let k = 0; k <= 60; k++) {
      const front = -44 + (k / 60) * 30;
      wave.scale.z = front + 44;
      G.rig.shake(0.08);
      for (const p of sorted) {
        if (!p.cleaned && p.pos.z < front) {
          p.cleaned = true;
          cleaned++;
          G.fx.starPop(p.pos, 0.9);
          G.audio.play('pop');
          p.world.remove(p);
          this.counter(`깨끗! ×${cleaned * 214}`);
        }
      }
      if (k % 3 === 0) {
        for (let i = 0; i < 4; i++) G.fx.particle({ x: rand(-11, 11), y: 0.4, z: front, vy: rand(2, 5), vz: rand(1, 3), gravity: 9, size: 0.6, life: 0.7, color: 0xd8f4ff, tile: 'drop' });
      }
      await waitReal(0.05);
    }
    this.counter('깨끗! ×3000');
    G.ui.hud.flash('white');
    for (const c of this.cows) {
      G.fx.burst(c.pos, { count: 10, color: [0xffffff, 0xffe86a], tile: 'star', size: 0.5, speed: 3 });
      G.fx.text(c.pos, '음매~♪', { color: '#ffffff', size: 1, cls: 'word' });
      G.audio.play('moo');
      await waitReal(0.25);
    }
    for (let k = 0; k <= 20; k++) {
      wave.material.uniforms.uAlpha.value = 0.9 * (1 - k / 20);
      await waitReal(0.04);
    }
    wave.removeFromParent();
    G.audio.jingle('victory');
    await this.banner('대청소 성공!', '외양간이 반짝반짝!', 2);
    this.counter(null);
    await this.talk([
      ['augeas', '이, 이럴 수가! 정말 하루 만에…!'],
      ['augeas', '(작은 목소리로) …소를 주긴 아깝군…'],
      ['hercules', '약속은 약속이에요, 왕님!'],
    ]);
    this.unfocus();
    await this.giveRewards();
    await this.complete();
  }
}

void TAU;
