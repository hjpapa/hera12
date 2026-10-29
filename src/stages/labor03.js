// 과업 3 — 케리네이아의 사슴 🦌
// 🧒 "아르테미스의 사슴 데려오기. 아르테미스한테 허락 받았음"
// 1년 동안의 추격 = 봄 → 여름 → 가을 → 겨울 숲을 달리며 황금 발자국 따라가기 → 살며시 안기 → 아르테미스의 허락
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Entity } from '../game/entity.js';
import { Follower, NPC } from '../game/npc.js';
import { rand } from '../core/util.js';

const ROUTE = [[0, -6], [6, -16], [-4, -28], [4, -40], [-6, -54], [5, -68], [-3, -82], [6, -96], [-5, -110], [3, -124], [-4, -138], [0, -150]];
const SEASONS = [
  { name: '봄', from: 0, ground: [0xa8d070, 0x90c060], tree: 0xffa8c8, tile: 'leaf', color: 0xffb8d0, z0: 4, z1: -44, sky: ['#9fd8ff', '#fff0f4'] },
  { name: '여름', from: 4, ground: [0x7fc050, 0x60a840], tree: 0x4fa040, tile: 'star', color: 0xfff6a0, z0: -44, z1: -88, sky: ['#6ac4ff', '#e8fff0'] },
  { name: '가을', from: 7, ground: [0xd8b060, 0xc09048], tree: 0xe8803a, tile: 'leaf', color: 0xe88a3a, z0: -88, z1: -118, sky: ['#ffc890', '#fff0d8'] },
  { name: '겨울', from: 9, ground: [0xeef4fa, 0xd8e4f0], tree: 'snow', tile: 'snow', color: 0xffffff, z0: -118, z1: -165, sky: ['#b8d0e8', '#f4f8ff'] },
];

class Deer extends Entity {
  constructor(o) {
    super({ sprite: 'deer', radius: 0.8, team: 'neutral', solid: false, ...o });
    this.idx = 0;
    this.running = false;
    this.speed = 13;
    this.hoofT = 0;
  }

  update(dt) {
    super.update(dt);
    const p = G.player;
    if (this.tired) return;
    if (!this.running && p && this.idx < ROUTE.length - 1 && this.distTo(p) < 7.5 && !this.waiting) {
      this.running = true;
      this.idx++;
      G.audio.play('whoosh');
      G.fx.burst(this.pos, { count: 10, color: 0xffe86a, tile: 'star', size: 0.4, speed: 4 });
    }
    if (this.running) {
      const [tx, tz] = ROUTE[this.idx];
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.5) {
        this.running = false;
        this.vel.set(0, 0, 0);
        this.onArrive?.(this.idx);
      } else {
        this.pos.x += (dx / d) * this.speed * dt;
        this.pos.z += (dz / d) * this.speed * dt;
        this.updateFlip(dx, dz);
        this.hoofT -= dt;
        if (this.hoofT <= 0) {
          this.hoofT = 0.12;
          // 황금 발자국
          G.fx.particle({ x: this.pos.x, y: 0.08, z: this.pos.z, size: 0.5, sizeEnd: 0.4, life: 8, color: 0xffd84a, tile: 'heart', additive: true, spin: 0, rot: 0, fadePow: 4 });
        }
      }
    }
  }

  animate(dt, v) {
    if (this.running) {
      v.lift = Math.abs(Math.sin(this.time * 14)) * 0.5;
      v.roll = -0.15;
    } else {
      v.lift = 0;
      v.roll = Math.sin(this.time * 2) * 0.03;
    }
    if (Math.random() < dt * 5) G.fx.sparkle(this.pos, { color: 0xffe86a, size: 0.3, h: 1.4 });
  }
}

export default class Labor03 extends Stage {
  constructor(p) {
    super(p);
    this.spawn = { x: 0, z: 4 };
    this.music = 'chase';
    this.season = 0;
  }

  setup() {
    G.game.setSky('#9fd8ff', '#fff0f4', '#f8f0f4', 50, 120);
  }

  build(world) {
    super.build(world);
    const B = this.B;
    world.road([[0, 4], ...ROUTE], 3.2);
    world.circle(0, 2, 6);
    world.circle(0, -152, 9);
    world.circle(-20, -100, 3.5);
    world.road([[-5, -104], [-18, -100]], 2);
    // 계절별 땅
    for (const s of SEASONS) {
      const h = s.z0 - s.z1;
      B.ground({ shape: 'rect', w: 90, h, x: 0, z: (s.z0 + s.z1) / 2, color: s.ground[0], color2: s.ground[1], edge: 0x8a6a4a, edgeH: 2 });
    }
    B.path([[0, 4], ...ROUTE], { width: 3.6, color: 0xe8d8b0 });
    // 겨울 강
    B.water(0, -166, { w: 90, h: 16, color: 0x6aa8d8, color2: 0xd8f0ff });
    // 계절별 나무
    this.zones = [[0, 2, 6], [0, -152, 9]];
    this.roads = [[[0, 4], ...ROUTE]];
    this.borderDecor((x, z, i) => {
      const s = SEASONS.find((ss) => z <= ss.z0 && z > ss.z1) || SEASONS[3];
      if (s.tree === 'snow') {
        this.B.snow = true;
        i % 2 ? B.tree('pine', x, z, { collide: false, color: 'snow' }) : B.rock(x, z, { color: 0xe8eef4, collide: false });
      } else B.tree(i % 4 === 0 ? 'cypress' : 'round', x, z, { collide: false, color: i % 4 === 0 ? null : s.tree });
    }, 3.6);
    for (let i = 0; i < 30; i++) {
      const z = rand(-160, 0), x = rand(-40, 40);
      if (!world.walkable(x, z, -2)) {
        const s = SEASONS.find((ss) => z <= ss.z0 && z > ss.z1) || SEASONS[3];
        if (s.tree === 'snow') B.tree('pine', x, z, { collide: false, color: 'snow' });
        else B.tree('round', x, z, { collide: false, color: s.tree, s: 1.3 });
      }
    }
    B.flowers(-3, -20, 4, 14, [0xff8fb4, 0xffd84a, 0xffffff]);
    this.pots([[5, -20], [-6, -30], [3, -60], [-5, -75], [5, -99], [-2, -128]]);
    this.treasurePot(-20, -100);
    this.deer = this.add(new Deer({ x: ROUTE[0][0], z: ROUTE[0][1] }));
  }

  update(dt) {
    // 계절 날씨
    const p = G.player;
    if (!p) return;
    const s = SEASONS[this.season];
    if (s && Math.random() < dt * (s.name === '여름' ? 4 : 18)) {
      G.fx.particle({
        x: p.pos.x + rand(-14, 14), y: rand(6, 10), z: p.pos.z + rand(-14, 6),
        vx: rand(-0.6, 0.6), vy: -rand(1, 2), vz: rand(-0.3, 0.3), drag: 0.1, gravity: 0,
        life: 5, size: s.tile === 'snow' ? 0.35 : 0.45, sizeEnd: 0.3, color: s.color, tile: s.tile, additive: s.tile === 'star', spin: rand(-2, 2), fadeIn: true,
      });
    }
    const z = p.pos.z;
    const now = SEASONS.findIndex((ss) => z <= ss.z0 && z > ss.z1);
    if (now > this.season) this.setSeason(now);
  }

  setSeason(i, quiet = false) {
    this.season = i;
    const s = SEASONS[i];
    G.game.setSky(s.sky[0], s.sky[1], s.sky[1], 50, 120);
    if (quiet) return;
    const lines = ['', '부엉! 봄이 지나고… 벌써 여름이야!', '가을이 되었어. 사슴도 조금 지친 것 같아!', '하얀 겨울이야! 일 년 동안 쫓아왔어. 조금만 더!'];
    this.banner(s.name, ['', '봄이 지나고… 여름!', '여름이 지나고… 가을!', '가을이 지나고… 겨울!'][i], 1.4);
    if (lines[i]) {
      G.fx.text({ x: G.player.pos.x, y: 1.6, z: G.player.pos.z }, s.name + '!', { color: '#ffffff', size: 1.4, cls: 'word' });
      G.audio.speak(lines[i], { pitch: 1.35 });
      this.toast(lines[i], 2.6);
    }
  }

  async run() {
    await this.intro();
    const deer = this.deer;
    this.cutscene(true);
    this.focus(deer.pos.x, deer.pos.z, 0.75);
    await waitReal(0.3);
    await this.talk([
      ['deer', '(황금 뿔이 반짝반짝 빛나요)'],
      ['hercules', '저 사슴이구나! 화살보다 빠르다던…'],
      ['glau', '부엉! 다치게 하면 안 돼. 사슴의 황금 발자국을 따라 끝까지 쫓아가자!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    this.objective('황금 발자국을 따라 사슴을 쫓아가자!', deer, { beam: false });
    // 끝까지 쫓기
    await until(() => deer.idx >= ROUTE.length - 1 && !deer.running);
    deer.tired = true;
    deer.visual.setSprite('deer_tired');
    this.checkpointAt(0, -146);
    this.objective('지친 사슴에게 살며시 다가가자', deer, { beam: false });
    await this.say('glau', '사슴이 강가에서 쉬고 있어. 살금살금 다가가서 살며시 안아 줘!');
    let hug = false;
    const it = this.world.interact({ entity: deer, radius: 3, icon: 'hug', label: '살며시 안기', action: () => (hug = true) });
    await until(() => hug);
    this.world.removeInteract(it);
    this.objective(null);
    this.cutscene(true);
    G.player.faceToward(deer.pos.x, deer.pos.z);
    G.audio.play('heart');
    G.fx.burst(deer.pos, { count: 12, color: 0xff8fb4, tile: 'heart', size: 0.5, speed: 3, gravity: -2, additive: false });
    await this.say('hercules', '쉿… 괜찮아. 다치게 하지 않을게.');
    // 아르테미스 등장
    const ar = this.add(new NPC({ sprite: 'artemis', x: deer.pos.x + 4, z: deer.pos.z - 2, lookAtPlayer: true }));
    G.fx.starPop(ar.pos, 1.4);
    G.audio.play('magic');
    this.focus((ar.pos.x + G.player.pos.x) / 2, ar.pos.z + 1, 0.7);
    await waitReal(0.5);
    await this.talk([
      ['artemis', '멈춰라! 내 사슴을 어디로 데려가느냐!'],
      ['hercules', '아르테미스 여신님, 죄송해요. 에우리스테우스 왕의 과업이라서요.'],
      ['hercules', '왕에게 보여 주기만 하고, 꼭 여신님께 돌려드릴게요. 약속해요!'],
      ['artemis', '…거짓말을 하지 않는 눈이구나. 좋다, 허락하마.'],
    ]);
    G.ui.hud.flash('gold');
    await this.banner('아르테미스의 허락!', '사슴을 데려가도 좋다', 1.8);
    await this.say('artemis', '대신 약속은 꼭 지키거라. 그리고 이건 정직한 너에게 주는 선물이다.');
    G.fx.starPop(G.player.pos, 1.2);
    await this.giveRewards();
    deer.tired = false;
    deer.visual.setSprite('deer');
    this.unfocus();
    this.cutscene(false);
    await this.say('glau', '구르기 버튼을 눌러 봐! 반짝반짝 더 멀리 굴러갈 거야!');
    await wait(1.2);
    await this.complete();
  }

  afterBuild() {
    this.setSeason(0, true);
  }
}

void Follower;
