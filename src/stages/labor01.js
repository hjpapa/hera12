// 과업 1 — 네메아의 사자 🦁
// 🧒 "왕과 대화: 네메아의 사자 죽이기, 몸으로 졸라 죽이기"
// 무기가 안 통하는 사자 → 몽둥이로 어질어질 → 꽉 잡기(연타) → 동굴 입구 막기 → 2라운드 → 몸으로 졸라 물리치기
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Boss, BOSS_HP_SCALE } from '../game/enemy.js';
import { Combat } from '../game/combat.js';
import { Arrow, Breakable } from '../game/items.js';
import { rand } from '../core/util.js';

const WOLF = { sprite: 'wolf', hp: 28, speed: 4.2, ai: 'melee', radius: 0.6, exp: 6, coins: [0, 2], damage: 1, aggro: 12 };

class LionBoss extends Boss {
  constructor(o) {
    super({ sprite: 'lion', hp: 100, radius: 1.3, speed: 4.5, damage: 2, exp: 60, coins: 20, title: '네메아의 사자', ...o });
    this.daze = 0;
    this.grabbable = false;
    this.bossColor = 'linear-gradient(180deg,#fff27a,#f5b942)';
  }

  bossFrac() {
    return this.daze / 100;
  }

  // 가죽에 무기가 안 통함 → 피해 대신 "어질어질"이 쌓임
  damageFilter(info) {
    if (this.grabbable || this.fleeing) return { blocked: true, text: '쿵!', sound: 'thud' };
    if (info.type === 'arrow' || info.type === 'poison') return { blocked: true, text: '팅!', sound: 'ting', color: '#ffffff' };
    const add = (info.type === 'special' ? 50 : info.big ? 22 : 9) / BOSS_HP_SCALE;
    this.daze = Math.min(100, this.daze + add);
    this.flash(0.1);
    this.squash(0.18, 0.18);
    G.ui.hud.updateBoss(this);
    if (this.daze >= 100) this.knockout();
    return { blocked: true, text: info.big ? '쿠웅!' : '쿵!', sound: info.big ? 'hit_big' : 'thud', knock: info.big ? 2 : 0.5 };
  }

  knockout() {
    this.stunned = true;
    this.stunT = 6;
    this.clearTele();
    this.grabbable = true;
    this.visual.setSprite('lion_dizzy');
    G.audio.play('star');
    G.fx.text(this.pos, '어질어질~', { color: '#ffe86a', size: 1.2, cls: 'word', rise: 2.6 });
    this.onKO?.();
  }

  onRecover() {
    this.grabbable = false;
    this.daze = 35;
    this.visual.setSprite('lion');
    G.ui.hud.updateBoss(this);
  }

  patterns() {
    return [this.pSwipe, this.pSwipe, this.pPounce, this.pRoar];
  }

  async pSwipe() {
    await this.approach(2.6, 2.5);
    if (this.stopped()) return;
    await this.lunge({ windup: 0.6, radius: 1.8, speed: 11, time: 0.18, damage: 1 });
  }

  async pPounce() {
    if (this.stopped()) return;
    G.audio.play('roar');
    await this.slam({ windup: 0.95, radius: 2.4, jump: true, damage: 2 });
  }

  async pRoar() {
    this.mode = 'face';
    const wu = Combat.windup(0.9);
    this.tele = G.fx.telegraphCircle(this.pos, 5, wu);
    this.warn();
    this.state = 'windup';
    await wait(wu);
    this.clearTele();
    if (this.stopped()) return;
    G.audio.play('roar');
    G.rig.shake(0.5);
    G.fx.ring(this.pos, { r0: 1, r1: 6, life: 0.5, color: 0xffd27a });
    G.fx.ring(this.pos, { r0: 0.5, r1: 4.5, life: 0.4, color: 0xffffff });
    const p = this.player;
    if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 5.2) p.hurt(1, this.pos, { knock: 15 });
    this.state = 'chase';
    await wait(0.5);
  }

  animate(dt, v) {
    super.animate(dt, v);
    if (this.grabbable) v.roll = Math.sin(this.time * 4) * 0.15;
  }
}

export default class Labor01 extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['molorchus', 'wolf', 'lion', 'lion_dizzy', 'boulder']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.spawn = { x: 0, z: 3 };
  }

  setup() {
    G.game.setSky('#f6c47a', '#fde8c0', '#fbe2b8', 50, 120);
    G.game.setLight({ hemiSky: 0xffe8c0, hemiGround: 0xa08a50, hemi: 1.6, sun: 2.4, sunColor: 0xffe0b0 });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    this.buildLevel({
      w: 120, h: 130, cz: -40,
      color: 0xc8c070, color2: 0xa8a85a, edge: 0x8a7040,
      zones: [[0, 0, 7], [-4, -24, 9], [-14, -40, 3.2], [6, -48, 11], [6, -76, 8.5]],
      roads: [[[0, -4], [-3, -14], [-4, -17]], [[-4, -31], [2, -40], [5, -38]], [[-9, -29], [-13, -37]], [[6, -58], [6, -68]]],
      roadW: 5,
      pathColor: 0xe8d8a8,
      border: (x, z, i) => (i % 4 === 0 ? B.rock(x, z, { s: rand(0.8, 1.6), color: 0xb09a70, collide: false }) : B.tree(i % 3 ? 'olive' : 'cypress', x, z, { collide: false, color: i % 3 ? 0xa8b060 : null })),
    });
    // 몰로르코스의 집
    B.house(-4.5, 1.5, { rot: 0.4, roof: 0xd9774b });
    B.fence(2, 4, 6, 4, { collide: false });
    this.pots([[3.5, -3], [-2, -5.5]]);
    // 늑대 골짜기
    this.pots([[-9, -22], [1, -27], [-6, -30]]);
    this.treasurePot(-14, -41);
    // 사자 골짜기 + 동굴
    for (const [x, z] of [[-3, -46], [15, -42], [-2, -56], [0, -53]]) B.rock(x, z, { s: 1.4, color: 0xb09a70 });
    // 동굴 (입구 두 개)
    B.cave(6, -64, { r: 5, color: 0xa08a6a, collide: false });
    B.cave(14.5, -78, { r: 3.2, rot: -Math.PI / 2, color: 0x9a846a });
    world.capsule(6, -76, 14, -77, 2.2); // 두 번째 입구 쪽 길 (바위로 막힘)
    this.secondExit = world.block({ type: 'circle', x: 13.5, z: -77, r: 2.4 });
    this.caveBlock = world.block({ type: 'capsule', ax: 6, az: -60, bx: 6, bz: -66, r: 3.2 });
    // 동굴 안은 어둡게
    B.patch(6, -76, 8.5, 0x6a5a48, 0.02);
    this.pots([[1, -80], [11, -72]]);
    // 막을 바위
    this.boulder = this.add(new Breakable({ x: 14, z: -59, sprite: 'boulder', scale: 1.1, radius: 1.2, hits: 99 }));
    this.boulder.alive = false; // 처음엔 못 때림
    this.boulder.hittable = false;
    this.molorchus = this.npc('molorchus', 3, -1.5, () => this.talkMolorchus(), { mark: true });
  }

  talkMolorchus() {
    this.molorchusTalked = true;
    return this.talk([
      ['molorchus', '젊은이, 사자를 잡으러 가는 겐가? 그 사자 때문에 양들이 밤마다 덜덜 떤다네.'],
      ['hercules', '제가 꼭 물리칠게요, 할아버지!'],
      ['molorchus', '30일 안에 돌아오면 제우스 신께 감사 제사를 올리겠네. 조심하게!'],
    ]);
  }

  async run() {
    await this.intro();
    // 과업 중간 이어하기: 앱이 꺼졌다 다시 들어왔으면 보스 앞에서 바로 시작
    if (this.resuming) {
      this.molorchus.setMark(false);
      await this.resumeHere(4, -40);
    } else {
      this.objective('양치기 할아버지와 이야기하자', this.molorchus);
      await until(() => this.molorchusTalked || G.player.pos.z < -6);
      this.molorchus.setMark(false);
      // 늑대 골짜기
      this.objective('골짜기로 가자', { x: -4, z: -24 });
      await this.ambush(-4, -24, 8, () => this.wave(WOLF, 3, -4, -26, 4), { text: '늑대들이 나타났다!' });
      this.checkpointAt(-4, -24);
      G.audio.music('field');
      this.objective('사자를 찾아 더 들어가자', { x: 6, z: -46 });
      await until(() => G.player.pos.z < -40 && G.player.pos.x > -4);
      this.checkpointAt(4, -40);
    }
    this.saveResume();

    // 사자 등장 + 화살이 팅!
    const lion = (this.lion = this.add(new LionBoss({ x: 6, z: -54 })));
    lion.active = false;
    this.cutscene(true);
    this.focus(5, -50, 0.75);
    G.player.faceToward(lion.pos.x, lion.pos.z);
    await waitReal(0.4);
    G.audio.play('roar');
    G.rig.shake(0.6);
    lion.squash(0.5, 0.3);
    await this.say('lion', '크아아앙!');
    for (let i = 0; i < 2; i++) {
      this.add(new Arrow({ x: G.player.pos.x, z: G.player.pos.z, dirX: lion.pos.x - G.player.pos.x, dirZ: lion.pos.z - G.player.pos.z, target: lion, damage: 5 }));
      G.audio.play('arrow');
      await waitReal(0.45);
    }
    await waitReal(0.5);
    await this.talk([
      ['hercules', '어?! 화살이 튕겨 나왔어!'],
      ['glau', '부엉! 사자 가죽에는 무기가 안 통해. 몽둥이로 쾅쾅 때려서 어질어질하게 만들어!'],
    ]);
    this.unfocus();
    this.cutscene(false);
    lion.active = true;
    await this.bossIntro(lion, '네메아의 사자', { zoom: 0.85 });
    G.ui.hud.bossName.textContent = '네메아의 사자 · 어질어질 게이지';
    this.objective('사자를 때려 어질어질하게 만들자!');

    // 1라운드: 꽉 잡기 → 사자가 빠져나가 동굴로
    await this.grabRound(lion, false);
    lion.fleeing = true;
    lion.active = false;
    lion.stunned = false;
    lion.setDizzy(false);
    lion.visual.setSprite('lion');
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    this.cutscene(true);
    this.focus(6, -58, 0.9);
    G.audio.play('roar');
    lion.noClip = true;
    await this.runTo(lion, 6, -62, 13);
    lion.visual.setVisible(false);
    lion.shadow.visible = false;
    lion.pos.set(6, 0, -80);
    await this.say('glau', '사자가 동굴로 도망갔어! 동굴 입구가 두 개야. 큰 바위로 한쪽을 막아야 사자가 도망 못 가!');
    this.unfocus();
    this.cutscene(false);
    G.audio.music('field');

    // 바위 밀어 입구 막기
    const b = this.boulder;
    b.alive = true;
    b.hittable = true;
    this.objective('바위를 쾅쾅 쳐서 굴리자!', b);
    await until(() => b.hits >= 3);
    b.alive = false;
    b.hittable = false;
    this.cutscene(true);
    this.focus(14, -64, 0.9);
    G.audio.play('rock');
    for (let i = 0; i <= 30; i++) {
      b.pos.x = 14 + (12.5 - 14) * (i / 30);
      b.pos.z = -59 + (-77 + 59) * (i / 30);
      b.visual.roll = -i * 0.25;
      if (i % 4 === 0) G.fx.dust(b.pos, { count: 2, size: 1 });
      await waitReal(0.03);
    }
    G.rig.shake(0.6);
    G.audio.play('stomp');
    await this.say('hercules', '좋아, 이제 사자는 독 안에 든 쥐… 아니, 동굴 안에 든 사자다!');
    this.world.unblock(this.caveBlock);
    this.unfocus();
    this.cutscene(false);
    this.checkpointAt(6, -58);

    // 2라운드 (동굴 안)
    this.objective('동굴 안으로 들어가자', { x: 6, z: -72 });
    await until(() => G.player.pos.z < -69);
    lion.fleeing = false;
    lion.noClip = false;
    lion.pos.set(6, 0, -80);
    lion.visual.setVisible(true);
    lion.shadow.visible = true;
    lion.daze = 0;
    lion.active = true;
    G.game.setLight({ hemiSky: 0xd8b890, hemiGround: 0x5a4a3a, hemi: 1.1, sun: 1.4, sunColor: 0xffc890, tint: 0xe8d8c8 });
    await this.bossIntro(lion, '네메아의 사자', { zoom: 0.85 });
    G.ui.hud.bossName.textContent = '네메아의 사자 · 어질어질 게이지';
    this.objective('다시 어질어질하게 만들고 꽉 잡자!');
    this.checkpointAt(6, -71);
    await this.grabRound(lion, true);

    // 몸으로 졸라 물리치기 성공!
    lion.grabbable = false;
    G.player.state = 'move';
    lion.hittable = false;
    lion.die({});
    await this.bossDown(lion, { text: '과업 성공!' });
    G.game.setLight({});
    // 사자 가죽 → 망토
    this.cutscene(true);
    this.focus(G.player.pos.x, G.player.pos.z, 0.6);
    await this.say('glau', '사자의 발톱으로 가죽을 다듬으면 멋진 망토가 될 거야!');
    G.ui.hud.flash('gold');
    G.fx.starPop(G.player.pos, 1.5);
    await this.giveRewards();
    await this.say('hercules', '와아! 이제 나는 사자 망토의 헤라클레스다!');
    await this.complete();
  }

  // 어질어질 → 꽉 잡기 연타. final=true 면 성공할 때까지
  async grabRound(lion, final) {
    for (;;) {
      await until(() => lion.grabbable);
      this.objective('사자가 어질어질! 다가가서 꽉 잡자!', lion, { beam: false });
      const it = this.world.interact({ entity: lion, radius: 3.4, icon: 'grab', label: '꽉 잡기!', enabled: () => lion.grabbable, action: () => (this.grabbing = true) });
      this.grabbing = false;
      await until(() => this.grabbing || !lion.grabbable);
      this.world.removeInteract(it);
      if (!this.grabbing) {
        this.objective('다시 어질어질하게 만들자!');
        continue;
      }
      // 꽉 잡기!
      const p = G.player;
      lion.stunT = 99;
      p.state = 'grab';
      p.vel.set(0, 0, 0);
      const side = p.pos.x < lion.pos.x ? -1 : 1;
      p.pos.set(lion.pos.x + side * 1.4, 0, lion.pos.z + 0.3);
      p.faceToward(lion.pos.x, lion.pos.z);
      G.audio.play('grab');
      if (final) this.toast('아기 때 뱀을 잡던 그 힘으로!', 2);
      const ok = await G.ui.hud.mash({
        title: final ? '몸으로 꽉!' : '꽉 잡기!', hint: '큰 버튼을 톡톡톡!', goal: final ? 16 : 10, time: 7, decay: 1.0,
        onTap: () => {
          lion.squash(0.1, 0.18);
          p.squash(0.08, 0.15);
          if (Math.random() < 0.5) G.fx.burst({ x: (p.pos.x + lion.pos.x) / 2, y: 0, z: lion.pos.z }, { count: 3, color: 0xffe86a, speed: 4, size: 0.4, life: 0.4 });
        },
      });
      if (final && ok) {
        await this.say('hercules', '으라차차차! 이 힘이 바로 헤라클레스의 힘이다!');
        return;
      }
      // 사자가 몸부림쳐서 빠져나감
      p.state = 'move';
      lion.stunned = false;
      lion.setDizzy(false);
      lion.onRecover();
      lion.grabbable = false;
      G.audio.play('roar');
      G.rig.shake(0.5);
      p.push(side, 0, 10);
      if (!final) {
        await this.say('glau', ok ? '대단해! 사자가 깜짝 놀랐어… 앗, 그래도 빠져나갔어!' : '앗, 빠져나갔어! 괜찮아, 다시 해 보자!');
        return;
      }
      this.toast('앗, 빠져나갔다! 다시 어질어질하게!', 2);
      lion.daze = 50;
      G.ui.hud.updateBoss(lion);
    }
  }

  async runTo(e, x, z, speed) {
    await until(() => {
      const dx = x - e.pos.x, dz = z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6) return true;
      e.pos.x += (dx / d) * speed * G.dt;
      e.pos.z += (dz / d) * speed * G.dt;
      e.updateFlip(dx, dz);
      if (Math.random() < 0.5) G.fx.dust(e.pos, { count: 1, size: 1 });
      return false;
    });
  }

}
