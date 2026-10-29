// 과업 6 — 스팀팔로스의 새 🐦
// 🧒 "스팀팔로스의 새 퇴치하기. 독화살로 퇴치했다"
// 숲에 숨은 새 → 아테나의 청동 딸랑이로 날려 보냄 → 독화살로 쏘아 맞힘 → 대장 새
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Enemy } from '../game/enemy.js';
import { NPC } from '../game/npc.js';
import { FlyBoss } from '../game/bosses.js';
import { rand, TAU } from '../core/util.js';

const BIRD = { sprite: 'stym_bird', hp: 22, speed: 5, ai: 'flyer', flyHeight: 3, orbitR: 6, orbitSpeed: 0.8, radius: 0.6, exp: 6, coins: [0, 2], damage: 1, cd: [2, 3.2], aggro: 16, shoots: true, shot: 'feather', shotSpeed: 11 };
const NESTS = [[-9, -22], [9, -22], [-11, -34], [11, -34], [-4, -40], [5, -40]];

export default class Labor06 extends Stage {
  constructor(p) {
    super(p);
    this.spawn = { x: 0, z: 3 };
    this.skill = 'bow';
    this.birds = [];
    this.killed = 0;
    this.total = 12;
  }

  setup() {
    G.game.setSky('#5a6a8a', '#c0c8d8', '#a8b4c4', 35, 100);
    G.game.setLight({ hemiSky: 0xc8d0e8, hemiGround: 0x4a5a4a, hemi: 1.4, sun: 1.6, sunColor: 0xd8e0ff, tint: 0xe8ecf8 });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 100, h: 100, cz: -25,
      color: 0x6a8a5a, color2: 0x4a6a4a, edge: 0x4a3a2a,
      zones: [[0, 0, 7], [0, -30, 15], [-19, -16, 3]],
      roads: [[[0, -5], [0, -16]], [[-12, -20], [-17, -17]]],
      pathColor: 0x9a9a7a,
      border: (x, z, i) => (i % 2 ? B.tree('dead', x, z, { collide: false }) : B.tree('cypress', x, z, { collide: false, color: 0x2f4a3a })),
    });
    B.water(0, -58, { w: 90, h: 26, color: 0x3a4a6a, color2: 0x8a9ab8 });
    this.flyBounds = { x: 0, z: -28, r: 22 };
    world.flyBounds = this.flyBounds;
    // 새 둥지 나무 (빽빽한 숲)
    this.nests = NESTS.map(([x, z]) => {
      B.tree('round', x, z, { color: 0x2f5a3a, s: 1.5 });
      B.tree('round', x + 1.4, z - 0.6, { color: 0x3a6a42, s: 1.1, collide: false });
      const birds = [0, 1].map(() => {
        const b = this.add(new Enemy({ ...BIRD, x, z, onDeath: () => this.birdDown() }));
        b.hidden = true;
        b.hittable = false;
        b.active = false;
        b.visual.setVisible(false);
        b.shadow.visible = false;
        b.y = 2.5;
        this.birds.push(b);
        return b;
      });
      return { x, z, birds, flushed: false };
    });
    this.pots([[4, -2], [-12, -26], [12, -28], [0, -20]]);
    this.treasurePot(-19, -16);
  }

  // 딸랑이 소리 → 근처 숲의 새가 날아오름
  onRattle(pos) {
    for (const n of this.nests) {
      if (n.flushed) continue;
      if (Math.hypot(n.x - pos.x, n.z - pos.z) > 10) continue;
      n.flushed = true;
      G.audio.play('bird');
      G.fx.burst({ x: n.x, y: 2.5, z: n.z }, { count: 14, color: [0xd8a04a, 0x6a8a4a], tile: 'leaf', size: 0.5, speed: 5, additive: false });
      for (const b of n.birds) {
        b.hidden = false;
        b.hittable = true;
        b.active = true;
        b.visual.setVisible(true);
        b.shadow.visible = true;
        b.y = 3;
        b.cooldown = rand(1.2, 2.4);
      }
      G.fx.text({ x: n.x, y: 3, z: n.z }, '푸드덕!', { color: '#ffffff', size: 1.1, cls: 'word' });
    }
  }

  birdDown() {
    this.killed++;
    this.counter(`남은 새 ${this.total - this.killed}`);
  }

  update(dt) {
    // 숨은 새의 빨간 눈 반짝
    if (Math.random() < dt * 3) {
      const n = this.nests[Math.floor(Math.random() * this.nests.length)];
      if (n && !n.flushed) {
        for (const s of [-0.18, 0.18]) G.fx.particle({ x: n.x + s, y: 2.6, z: n.z + 1.6, size: 0.35, life: 0.6, color: 0xff3a2a, tile: 'glow', additive: true, spin: 0 });
      }
    }
  }

  nextNest() {
    const p = G.player.pos;
    let best = null, bd = 1e9;
    for (const n of this.nests) {
      if (n.flushed) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  async run() {
    await this.intro();
    this.objective('호숫가 숲으로 가자', { x: 0, z: -22 });
    await until(() => G.player.pos.z < -16);
    this.checkpointAt(0, -18);
    this.cutscene(true);
    this.focus(0, -26, 0.85);
    await this.say('hercules', '새들이 나무 속에 숨어서 나오질 않아… 빨간 눈만 반짝반짝!');
    const ath = this.add(new NPC({ sprite: 'athena', x: G.player.pos.x + 3, z: G.player.pos.z - 2 }));
    G.fx.starPop(ath.pos, 1.4);
    G.audio.play('magic');
    await this.talk([
      ['athena', '헤라클레스, 이것을 쓰렴. 대장장이 신 헤파이스토스가 만든 청동 딸랑이란다.'],
      ['athena', '흔들면 큰 소리가 나서, 숨어 있던 새들이 깜짝 놀라 날아오를 거야.'],
    ]);
    await this.giveRewards();
    G.fx.starPop(ath.pos, 1.2);
    ath.world.remove(ath);
    await this.talk([
      ['glau', '부엉! 나무 가까이 가서 딸랑이(스킬 버튼)를 흔들어!'],
      ['glau', '새가 날아오르면 ↻ 버튼으로 독화살로 바꿔서 쏴! 딸랑이를 한 번 더 흔들면 새가 어지러워서 떨어져!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    this.counter(`남은 새 ${this.total}`);
    // 숲마다 돌며 새 날리기
    const flyingNow = () => this.birds.some((b) => b.alive && !b.hidden);
    while (this.killed < this.total) {
      if (flyingNow()) {
        this.objective('독화살로 새를 맞히자!');
        await until(() => !flyingNow());
      } else {
        const n = this.nextNest();
        if (!n) break;
        this.objective('숲 가까이에서 딸랑이를 흔들자!', { x: n.x, z: n.z + 2 });
        await until(() => flyingNow() || n.flushed);
      }
    }
    this.counter(null);
    G.audio.music('field');
    await wait(0.8);
    // 대장 새
    const boss = this.add(new FlyBoss({ sprite: 'stym_leader', x: 0, z: -40, hp: 420, exp: 70, coins: 20, title: '스팀팔로스의 대장 새', flyHeight: 4.2 }));
    boss.active = false;
    await this.bossIntro(boss, '스팀팔로스의 대장 새', { roar: 'bird', lines: [
      ['stym', '끼에에엑! 청동 깃털 비를 받아라!'],
      ['glau', '딸랑이로 어지럽게 해서 땅에 떨어뜨린 다음 몽둥이로 쾅! 독화살도 좋아!'],
    ] });
    boss.active = true;
    this.objective('대장 새를 물리치자!');
    await until(() => !boss.alive);
    await this.bossDown(boss);
    await this.say('glau', '부엉! 하늘이 다시 맑아졌어!');
    G.game.setSky('#8fd0ff', '#f0f4ff', '#e8f0ff', 50, 120);
    await this.complete();
  }
}

void waitReal;
void TAU;
