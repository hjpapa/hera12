// 티린스 마을 (허브): 왕궁 · 별자리 제단 · 상점 · 12과업의 문. 튜토리얼 · 과업 받기 · 보고 · 엔딩.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { Stage, wait, until, waitReal } from './base.js';
import { Enemy } from '../game/enemy.js';
import { Entity } from '../game/entity.js';
import { Combat } from '../game/combat.js';
import { NPC } from '../game/npc.js';
import { LABORS, missingStars } from '../data/labors.js';
import { CONSTELLATION } from '../ui/storyart.js';
import { TAU, rand } from '../core/util.js';

const R_GATE = 27;
const gateAngle = (n) => ((120 + (n - 1) * (300 / 11)) * Math.PI) / 180;
const gatePos = (n, r = R_GATE) => ({ x: Math.cos(gateAngle(n)) * r, z: Math.sin(gateAngle(n)) * r });

// ───────── 구르기 연습장 ─────────
// 가까이 가면 바닥에 빨간 원을 그리고, 원이 다 차면 쿵! 그 순간 구르고 있으면 "완벽한 회피!"
// 연습이라 맞아도 하트는 그대로(살짝 밀려나기만), 필살기 게이지도 차지 않는다.
const PRACTICE_R = 2.2;

class DodgeDummy extends Entity {
  constructor(o) {
    super({ sprite: 'dummy', radius: 0.55, team: 'neutral', hittable: false, anchored: true, mass: 50, ...o });
    this.cool = 1.2;
    this.busy = false;
    this.tele = null;
    this.hinted = false;
    this.success = 0;
  }

  update(dt) {
    super.update(dt);
    const p = G.player;
    if (!p || !G.save.data.tutorialDone || this.busy || G.ui.cutscene) return;
    if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > 5) {
      this.cool = Math.max(this.cool, 0.8);
      return;
    }
    if (!this.hinted) {
      this.hinted = true;
      G.ui.hud.toast('구르기 연습장! 빨간 원이 다 차는 순간 구르면 완벽한 회피!', 3.5);
      G.audio.speak('구르기 연습장! 빨간 원이 다 차는 순간 굴러 봐!', { pitch: 1.3 });
    }
    this.cool -= dt;
    if (this.cool > 0) return;
    this.cool = 2.6;
    this.busy = true;
    const wu = Combat.windup(1.1);
    this.tele = G.fx.telegraphCircle(this.pos, PRACTICE_R, wu);
    this.squash(0.3, -0.15);
    G.audio.play('warn');
    wait(wu).then(() => this.slam());
  }

  slam() {
    this.busy = false;
    this.tele?.remove();
    this.tele = null;
    if (this.removed) return;
    this.squash(0.25, 0.3);
    G.audio.play('stomp');
    G.rig.shake(0.2);
    G.fx.ring(this.pos, { r0: 0.4, r1: PRACTICE_R * 1.1, life: 0.35, color: 0xffe0b0 });
    const p = G.player;
    if (!p || Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > PRACTICE_R + p.radius * 0.6) return;
    if (p.state === 'dash') {
      if (p.perfectDodge({ practice: true })) {
        this.success++;
        G.ui.hud.toast(`연습 성공 ${this.success}번! ${this.success >= 3 ? '이제 진짜 영웅이야!' : ''}`, 2);
      }
    } else {
      // 연습이라 아프지 않게: 살짝 밀려나기만
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
      p.push(dx / l, dz / l, 6);
      p.squash(0.15, 0.2);
      G.fx.text({ x: p.pos.x, y: 1.6, z: p.pos.z }, '원이 다 찰 때 굴러 봐!', { color: '#ffe86a', size: 0.9, cls: 'word' });
    }
  }

  dispose() {
    this.tele?.remove();
    super.dispose();
  }
}

function textSprite(lines, { w = 512, h = 192, bg = 'rgba(255,248,232,0.95)', color = '#3a2618' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.strokeStyle = '#3a2618';
  x.lineWidth = 12;
  x.beginPath();
  x.roundRect(8, 8, w - 16, h - 16, 40);
  x.fill();
  x.stroke();
  x.fillStyle = color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  lines.forEach((l, i) => {
    x.font = `${l.size || 56}px Jua, sans-serif`;
    x.fillStyle = l.color || color;
    x.fillText(l.text, w / 2, (h / (lines.length + 1)) * (i + 1) + (lines.length === 1 ? 0 : (i === 0 ? 6 : -6)));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(w / 110, h / 110, 1);
  return s;
}

export default class Hub extends Stage {
  constructor(p) {
    super(p);
    this.preload = ['eurystheus', 'iolaus', 'merchant', 'glau', 'villager', 'villager2', 'cerberus_happy', 'dummy']; // 처음 보일 때 멈칫하지 않게 미리 올릴 그림
    this.music = 'hub';
    this.spawn = p.report ? { x: 0, z: 1.5 } : { x: 0, z: 15 };
    this.gates = [];
  }

  setup() {
    G.game.setSky('#7cc4ff', '#fdf3dc', '#e8f4ff', 50, 140);
  }

  build(world) {
    super.build(world);
    const B = this.B;
    world.circle(0, 0, 33);
    B.ground({ r: 40, color: 0x9cc965, color2: 0x7fb050, edge: 0x9a7a52, edgeH: 4 });
    B.water(0, 0, { r: 120, y: -1.2, color: 0x3a8fd8, color2: 0x8fd0ff, alpha: 1 });
    // 마을 길
    const ring = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU;
      ring.push([Math.cos(a) * 24.5, Math.sin(a) * 24.5]);
    }
    B.path(ring, { width: 3.6, color: 0xe8d8a8 });
    B.path([[0, 18], [0, 10], [0, 3], [0, -3]], { width: 4, color: 0xe8d8a8 });
    B.patch(0, 6, 6.5, 0xf0e4c0);

    // 왕궁
    B.temple(0, -9, { w: 12, d: 7, h: 5, roof: 0xd9774b, trim: 0x8a5ab0 });
    B.column(-7.5, -4.5, { h: 3.5 });
    B.column(7.5, -4.5, { h: 3.5 });
    this.jar = B.jar(2.6, -3.2, { s: 0.75 });
    this.jar.userData.dynamic = true;
    // 별자리 제단
    B.altar(0, 6);
    this.buildConstellation();
    // 집들
    [[-12, -6, 0.3], [-15, 3, 0.9], [-11, 12, 1.4], [12, -6, -0.3], [15, 3, -0.9], [11, 13, -1.3]].forEach(([x, z, r], i) => {
      B.house(x, z, { rot: r, roof: i % 2 ? 0xd9774b : 0x3a8fd8 });
    });
    // 상점 노점
    B.fence(-9.5, 6.5, -6.5, 6.5, { collide: false });
    B.patch(-8, 5, 2.2, 0xd8c8a0);
    // 나무·꽃
    [[-9, 19], [9, 19], [-19, -2], [19, -2], [-8, -14], [8, -14], [-20, 10], [20, 10], [-3, -17], [3, -17]].forEach(([x, z], i) => B.tree(i % 3 ? 'olive' : 'cypress', x, z));
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU), d = rand(8, 22);
      B.flowers(Math.cos(a) * d, Math.sin(a) * d, 1.2, 6);
    }
    B.grass(0, 0, 30, 160, 0x6a9a3a);
    B.ringDecor(0, 0, 33.5, 38, 26, (x, z, i) => (i % 3 === 0 ? B.rock(x, z, { s: rand(0.8, 1.6), collide: false }) : B.tree(i % 2 ? 'cypress' : 'olive', x, z, { collide: false })));
    for (let i = 0; i < 6; i++) B.cloud(rand(-60, 60), rand(16, 24), rand(-80, -30), rand(2, 3.5));

    // 12과업의 문
    for (const L of LABORS) this.buildGate(L);

    // 사람들
    const save = G.save;
    this.king = this.npc('eurystheus', 0, -3.2, () => this.talkKing(), { label: '말하기', mark: false });
    this.iolaus = this.npc('iolaus', 6, -1, () => this.talkIolaus(), { wander: 3 });
    this.merchant = this.npc('merchant', -8, 4.6, () => G.ui.screens.shop(), { label: '상점', lookAtPlayer: true });
    this.glau = this.npc('glau', -2.2, 7.8, () => this.talkGlau(), { radius: 0.4 });
    this.glau.y = 1.7;
    this.npc('villager', -14, 7, () => this.say('villager', pickLine(VILLAGER)), { wander: 4 });
    this.npc('villager2', 13, 8, () => this.say('villager2', pickLine(VILLAGER2)), { wander: 4 });
    if (save.has('cerberus')) {
      const c = this.add(new NPC({ sprite: 'cerberus_happy', x: 4.5, z: 9.5, scale: 0.4, talk: () => this.say('cerberus_happy', '멍! 멍멍! (케르베로스 인형이 꼬리를 흔들어요)') }));
      c.radius = 0.8;
    }
    // 구르기 연습장 (마을 왼쪽 아래, 집 옆)
    this.add(new DodgeDummy({ x: -6, z: 12.5 }));
    const pring = new THREE.Mesh(new THREE.RingGeometry(PRACTICE_R - 0.12, PRACTICE_R + 0.12, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf5c542, transparent: true, opacity: 0.55, depthWrite: false }));
    pring.position.set(-6, 0.05, 12.5);
    this.world.root.add(pring);
    const psign = textSprite([{ text: '구르기 연습', size: 60 }], { w: 420, h: 120 });
    psign.position.set(-6, 3.4, 12.5);
    this.world.root.add(psign);
    // 항아리 (언제나 깨는 재미)
    this.pots([[-4, 16], [4, 16.5], [-17, -8], [17, -8], [-6, -12], [6, -12], [-18, 14], [18, 14]]);
    this.updateMarks();
  }

  buildGate(L) {
    const B = this.B;
    const n = L.n;
    const a = gateAngle(n);
    const p = gatePos(n);
    const rot = Math.atan2(-Math.cos(a), -Math.sin(a));
    const g = B.portal(p.x, p.z, { rot });
    // 문 뒤 미니 풍경
    const d = gatePos(n, 33.5);
    const dioramas = {
      1: () => { B.cave(d.x, d.z, { r: 2.6, rot, color: 0xc8a060 }); B.tree('olive', d.x + 3, d.z, { collide: false }); },
      2: () => { B.water(d.x, d.z, { r: 3, color: 0x4a8a6a, color2: 0x9ad0a0 }); B.tree('dead', d.x + 2.5, d.z - 1, { collide: false }); },
      3: () => { [0xff9ac0, 0x6fae4a, 0xe8903a, 0xf4f8ff].forEach((c, i) => B.tree('round', d.x + (i - 1.5) * 1.8, d.z + (i % 2), { color: c, collide: false, s: 0.7 })); },
      4: () => { B.mountain(d.x, d.z, { r: 3.5, h: 6, color: 0x8a9aa8 }); B.tree('pine', d.x + 3, d.z, { color: 'snow', collide: false }); },
      5: () => { B.stable(d.x, d.z, { w: 5, d: 3, rot }); },
      6: () => { B.water(d.x, d.z, { r: 3, color: 0x3a4a6a, color2: 0x7a8aa0 }); B.tree('dead', d.x - 2, d.z, { collide: false }); B.tree('dead', d.x + 2, d.z, { collide: false }); },
      7: () => { B.tree('palm', d.x, d.z, { collide: false }); B.tree('palm', d.x + 2.5, d.z + 1, { collide: false }); },
      8: () => { B.rock(d.x, d.z, { s: 2, color: 0x5a5060, collide: false }); B.torch(d.x + 2, d.z, { collide: false }); },
      9: () => { const t = B.add(new THREE.Mesh(new THREE.ConeGeometry(1.8, 3, 6), new THREE.MeshToonMaterial({ color: 0xd84a3a }))); t.position.set(d.x, 1.5, d.z); },
      10: () => { B.column(d.x - 1.6, d.z, { h: 5, color: 0xd8b0a0, collide: false }); B.column(d.x + 1.6, d.z, { h: 5, color: 0xd8b0a0, collide: false }); },
      11: () => { B.tree('apple', d.x, d.z, { collide: false, s: 0.7 }); },
      12: () => { B.rock(d.x, d.z, { s: 2.4, color: 0x4a3a6a, collide: false }); B.torch(d.x + 2, d.z, { collide: false }); },
    };
    dioramas[n]?.();
    const sign = textSprite([{ text: `${n}`, size: 70, color: '#b07a12' }, { text: L.title, size: 44 }], { w: 512, h: 220 });
    sign.position.set(p.x, 5.4, p.z);
    this.world.root.add(sign);
    const gate = { L, n, pos: p, ...g, sign };
    this.gates.push(gate);
    this.world.interact({
      pos: { x: p.x * 0.93, z: p.z * 0.93 },
      radius: 2.6,
      icon: 'star',
      label: '출발!',
      enabled: () => G.save.isUnlocked(n),
      action: () => this.enterGate(n),
    });
    this.world.trigger(p.x * 0.93, p.z * 0.93, 2.0, () => {
      if (!G.save.isUnlocked(n)) this.toast(`🔒 아직 열리지 않았어요. 왕에게 먼저 가 보자!`, 2);
    }, { once: false });
  }

  refreshGates() {
    for (const g of this.gates) {
      const st = G.save.laborState(g.n);
      const open = G.save.isUnlocked(g.n);
      g.veilMat.color.set(st.cleared ? 0x9fe0ff : open ? 0xffe06a : 0x666677);
      g.veilMat.opacity = open ? 0.5 : 0.25;
      if (st.cleared) {
        const stars = (st.stars || []).map((s) => (s ? '★' : '☆')).join('');
        g.sign.material.map.dispose();
        const s2 = textSprite([{ text: `${g.n}  ${stars}`, size: 60, color: '#b07a12' }, { text: g.L.title, size: 44 }], { w: 512, h: 220 });
        g.sign.material.map = s2.material.map;
        s2.material.dispose();
      }
    }
  }

  buildConstellation() {
    const grp = new THREE.Group();
    const lit = G.save.clearedCount();
    const tex = G.sprites.texture('icon_star');
    this.constStars = [];
    CONSTELLATION.forEach(([cx, cy], i) => {
      const on = G.save.laborState(i + 1).cleared;
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: on ? 0xffffff : 0x55557a, depthWrite: false, transparent: true, opacity: on ? 1 : 0.45 }));
      m.position.set((cx - 0.5) * 2.8, 5.6 - cy * 2.8, 0);
      m.scale.setScalar(on ? 0.55 : 0.3);
      grp.add(m);
      this.constStars.push(m);
    });
    grp.position.set(0, 0, 6);
    this.world.root.add(grp);
    this.constGrp = grp;
    void lit;
  }

  lightStar(i) {
    const m = this.constStars[i];
    if (!m) return;
    m.material.color.set(0xffffff);
    m.material.opacity = 1;
    m.scale.setScalar(0.55);
    const wp = new THREE.Vector3();
    m.getWorldPosition(wp);
    G.fx.burst({ x: wp.x, y: wp.y, z: wp.z }, { count: 18, color: [0xffe86a, 0xffffff], tile: 'star', size: 0.6, speed: 4, gravity: 0, yOff: 0 });
  }

  update(dt) {
    // 제단 별 반짝
    if (this.constStars) {
      const t = G.time;
      this.constStars.forEach((m, i) => {
        if (G.save.laborState(i + 1).cleared) m.scale.setScalar(0.52 + Math.sin(t * 3 + i) * 0.06);
      });
    }
    for (const g of this.gates) {
      g.veil.material.opacity = (G.save.isUnlocked(g.n) ? 0.45 : 0.2) + Math.sin(G.time * 3 + g.n) * 0.08;
    }
  }

  afterBuild() {
    this.refreshGates();
  }

  updateMarks() {
    const next = G.save.nextLabor();
    const needAssign = next <= 12 && G.save.data.assigned < next;
    this.king.setMark(needAssign && G.save.data.tutorialDone);
  }

  // ───────── 스크립트 ─────────
  async run() {
    const save = G.save;
    if (this.params.report) {
      save.data.tutorialDone = true;
      await this.report(this.params.report);
    }
    if (!save.data.tutorialDone) return this.tutorial();
    this.freeGuide();
  }

  freeGuide() {
    const next = G.save.nextLabor();
    if (next > 12) {
      this.objective('자유 모드: 과업을 다시 하며 별 3개를 모아 보자!');
      return;
    }
    if (G.save.data.assigned < next) this.objective('왕에게 가서 다음 과업을 받자', this.king);
    else {
      const g = this.gates[next - 1];
      this.objective(`과업 ${next}: ${LABORS[next - 1].title}의 문으로!`, { x: g.pos.x * 0.93, z: g.pos.z * 0.93 });
    }
  }

  async tutorial() {
    const p = G.player;
    await waitReal(0.5);
    await this.talk([
      ['glau', '부엉! 여기가 에우리스테우스 왕이 사는 티린스야.'],
      ['glau', G.isTouch ? '왼쪽 화면을 손가락으로 밀면 걸어갈 수 있어!' : '방향키(또는 WASD)로 걸어갈 수 있어!'],
    ]);
    // 허수아비
    const dummies = [[-3.5, 10.5], [0, 11.5], [3.5, 10.5]].map(([x, z]) => this.add(new Enemy({
      sprite: 'dummy', x, z, ai: 'dummy', hp: 400, exp: 0, coins: 0, heartChance: 0, anchored: true, knockResist: 1, superArmor: true, radius: 0.55, mass: 50,
    })));
    let hits = 0;
    dummies.forEach((d) => (d.onHurt = () => hits++));
    this.objective('허수아비를 때려 보자!', dummies[1]);
    await this.say('glau', G.isTouch ? '큰 버튼을 톡! 톡! 톡! 세 번 누르면 멋진 3단 공격!' : 'J 키(또는 스페이스)를 톡! 톡! 톡! 세 번 누르면 멋진 3단 공격!');
    await until(() => hits >= 6);
    await wait(0.4);
    this.objective('구르기를 두 번 해 보자!');
    await this.say('glau', G.isTouch ? '잘했어! 이번엔 바람 버튼을 눌러 휙 굴러 봐. 구르는 동안에는 공격을 맞지 않아!' : '잘했어! 이번엔 K 키(또는 Shift)로 휙 굴러 봐. 구르는 동안에는 공격을 맞지 않아!');
    let dashes = 0, was = false;
    await until(() => {
      const d = p.state === 'dash';
      if (d && !was) dashes++;
      was = d;
      return dashes >= 2;
    });
    await wait(0.5);
    const tutPots = [[-2, 4.5], [2, 4.5]].map(([x, z]) => this.pot(x, z + 13));
    this.objective('항아리를 깨 보자!', tutPots[0]);
    await this.say('glau', '항아리를 깨면 동전이나 하트가 나올지도 몰라. 히히.');
    await until(() => tutPots.every((t) => !t.alive));
    await wait(0.8);
    dummies.forEach((d) => d.die());
    G.save.data.tutorialDone = true;
    G.save.write();
    await this.say('glau', '준비됐니? 이제 왕궁에 가서 왕을 만나자! 노란 화살표를 따라가!');
    this.updateMarks();
    this.freeGuide();
  }

  async talkKing() {
    const save = G.save;
    const next = save.nextLabor();
    if (!save.data.tutorialDone) return this.say('king', '흠흠, 먼저 마을을 둘러보거라.');
    if (next > 12) {
      return this.talk([
        ['king', '흠흠… 열두 과업을 다 해낸 영웅이 또 왔구나.'],
        ['king', '다시 해 보고 싶은 과업이 있으면 문으로 가거라. 별을 더 모아 보든지!'],
      ]);
    }
    const L = LABORS[next - 1];
    if (save.data.assigned < next) {
      this.cutscene(true);
      this.focus(0, -2, 0.75);
      G.player.faceToward(this.king.pos.x, this.king.pos.z);
      await this.talk(L.intro);
      save.data.assigned = next;
      save.write();
      this.updateMarks();
      // 문이 열리는 연출
      const g = this.gates[next - 1];
      this.focus(g.pos.x, g.pos.z, 0.9);
      await waitReal(0.7);
      G.audio.play('magic');
      G.fx.starPop({ x: g.pos.x, y: 1, z: g.pos.z }, 1.6);
      this.refreshGates();
      await this.banner(`과업 ${L.n} · ${L.title}`, '의 문이 열렸다!', 1.8);
      this.unfocus();
      this.cutscene(false);
      this.freeGuide();
      const go = await this.choose('glau', '지금 바로 출발할까?', ['가자! 출발!', '마을을 좀 더 둘러볼래']);
      if (go === 0) G.game.goLabor(next);
      return;
    }
    const go = await this.choose('king', `어서 가거라! 과업 ${L.n}, ${L.title}이다!`, ['지금 갈래요!', '조금 있다가요']);
    if (go === 0) G.game.goLabor(next);
  }

  async enterGate(n) {
    const L = LABORS[n - 1];
    const st = G.save.laborState(n);
    // 다시 하는 과업이면 어떤 별이 남았는지 알려 줌
    const miss = missingStars(L, st).map((m) => m.icon + ' ' + m.text);
    const ask = !st.cleared ? `과업 ${n}, ${L.title}(으)로 출발할까?` : miss.length ? `${L.title}에 다시 가 볼까? 남은 별은 ${miss.join(', ')}!` : `${L.title}에 다시 가 볼까? 여기 별은 다 모았어!`;
    const go = await this.choose('glau', ask, ['출발!', '아직이요']);
    if (go === 0) G.game.goLabor(n);
  }

  talkIolaus() {
    const c = G.save.clearedCount();
    const lines = c >= 2 ? IOLAUS_AFTER : IOLAUS;
    return this.say('iolaus', lines[Math.floor(Math.random() * lines.length)]);
  }

  talkGlau() {
    const c = G.save.clearedCount();
    const s = G.save.starCount();
    return this.talk([
      ['glau', `부엉! 별자리 제단에 영웅의 별이 ${c}개 모였어. 열두 개가 다 모이면 무슨 일이 생길까?`],
      ['glau', `과업 별은 모두 ${s}개! 숨은 황금 항아리를 찾으면 별을 더 받을 수 있어.`],
    ]);
  }

  // 과업 보고: 왕의 반응 → 별이 제단으로
  async report(n) {
    const L = LABORS[n - 1];
    const save = G.save;
    this.cutscene(true);
    G.player.faceToward(0, -3);
    this.focus(0, -1.5, 0.7);
    await waitReal(0.6);
    if (L.jar) {
      // 왕이 항아리로 쏙!
      G.audio.play('jar');
      const k = this.king;
      await this.say(L.report[0][0], L.report[0][1]);
      k.vel.set(0, 0, 0);
      const start = { x: k.pos.x, z: k.pos.z };
      for (let i = 0; i < 12; i++) {
        k.pos.x = start.x + (this.jar.position.x - start.x) * (i / 11);
        k.y = Math.sin((i / 11) * Math.PI) * 1.6;
        await waitReal(0.03);
      }
      k.visual.setVisible(false);
      k.shadow.visible = false;
      this.jarShake = true;
      G.audio.play('jar');
      this.shakeJar();
      await this.talk(L.report.slice(1));
      this.jarShake = false;
      k.pos.set(start.x, 0, start.z);
      k.y = 0;
      k.visual.setVisible(true);
    } else {
      await this.talk(L.report);
    }
    // 별이 제단으로
    this.focus(0, 6, 0.85);
    await waitReal(0.4);
    const from = G.player.pos.clone();
    const star = this.constStars[n - 1];
    const to = new THREE.Vector3();
    star.getWorldPosition(to);
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k;
      const y = 1.5 + (to.y - 1.5) * k + Math.sin(k * Math.PI) * 3;
      G.fx.particle({ x, y, z, size: 1.2, life: 0.5, color: 0xffe86a, tile: 'star', additive: true });
      G.fx.particle({ x, y, z, size: 2.2, life: 0.25, color: 0xfff6c8, tile: 'glow', additive: true });
      if (i % 5 === 0) G.audio.play('star');
      await waitReal(0.03);
    }
    this.lightStar(n - 1);
    G.audio.jingle('star');
    G.ui.hud.flash('gold');
    await this.banner(`영웅의 별 ${save.clearedCount()} / 12`, '별자리 제단에 별이 켜졌다!', 2);
    // 과업의 뒷이야기 (신화에 전해지는 곁가지 이야기)
    if (L.side && !(save.data.sideSeen || []).includes(n)) {
      await this.say('glau', `부엉! 이번 과업에는 뒷이야기가 있어. "${L.side.title}" 들어 볼래?`);
      await G.ui.screens.storybook(L.side.pages);
      save.data.sideSeen = [...(save.data.sideSeen || []), n];
      if (L.side.card && save.addCard(L.side.card)) await G.ui.screens.card(L.side.card);
    }
    save.data.pendingReport = 0;
    save.write();
    this.refreshGates();
    this.unfocus();
    this.cutscene(false);
    this.updateMarks();
    if (n === 12 && save.clearedCount() >= 12 && !save.data.endingSeen) await this.ending();
  }

  async shakeJar() {
    const base = this.jar.position.clone();
    while (this.jarShake) {
      this.jar.position.x = base.x + rand(-0.08, 0.08);
      this.jar.rotation.z = rand(-0.08, 0.08);
      await waitReal(0.04);
    }
    this.jar.position.copy(base);
    this.jar.rotation.z = 0;
  }

  async ending() {
    this.cutscene(true);
    this.focus(0, -1.5, 0.7);
    await this.talk([
      ['king', '(항아리에서 천천히 나오며) …열두 과업을… 정말 다 해내다니.'],
      ['king', '흠흠! 헤라클레스, 너는 이제 자유다. …사실 좀 멋있었다.'],
      ['hercules', '감사합니다, 왕님! …항아리는 이제 안 쓰셔도 되겠네요!'],
      ['iolaus', '삼촌! 우리 삼촌 최고!'],
    ]);
    this.focus(0, 6, 1.0);
    await waitReal(0.6);
    // 열두 별이 하늘로
    for (let i = 0; i < 12; i++) {
      const s = this.constStars[i];
      const wp = new THREE.Vector3();
      s.getWorldPosition(wp);
      for (let j = 0; j < 6; j++) G.fx.particle({ x: wp.x, y: wp.y, z: wp.z, vy: 8 + j, size: 1, life: 1.4, color: 0xffe86a, tile: 'star', additive: true, drag: 0.2 });
      G.audio.play('star');
      await waitReal(0.12);
    }
    await this.say('glau', '부엉… 헤라클레스, 하늘을 봐. 네가 모은 열두 개의 별이야!');
    G.audio.music('ending');
    await G.ui.screens.storybook([
      { art: 'e_adventure', text: '헤라클레스는 그 뒤로도 많은 모험을 했어요. 아르고호를 타고 바다를 건너기도 하고, 사람들을 괴롭히는 괴물들을 물리쳤지요.' },
      { art: 'e_olympus', text: '오랜 세월이 흘러, 헤라클레스가 사람으로서의 삶을 마치는 날이 왔어요. 그날, 하늘에서 커다란 천둥소리가 울리고 제우스가 아들을 올림포스로 데려갔어요.' },
      { art: 'e_olympus', text: '제우스: "내 아들 헤라클레스야, 잘 해냈다. 이제 신들과 함께 영원히 살자꾸나."' },
      { art: 'e_hera', text: '헤라: "헤라클레스… 그동안 정말 미안했다. 너는 참으로 훌륭한 영웅이구나."' },
      { art: 'e_hera', text: '헤라클레스라는 이름은 \'헤라의 영광\'이라는 뜻이래요. 헤라와 헤라클레스는 마침내 화해했어요.' },
      { art: 'e_hebe', text: '헤라클레스는 청춘의 여신 헤베와 결혼하여 올림포스에서 행복하게 살았답니다.' },
      { art: 'e_stars', text: '그리고 제우스는 모두가 아들의 모험을 기억하도록, 밤하늘에 별자리를 만들었어요. 바로 헤르쿨레스자리예요!' },
    ]);
    if (G.save.addCard('hercules')) await G.ui.screens.card('hercules');
    await G.ui.screens.ending();
    G.save.data.endingSeen = true;
    G.save.write();
    G.audio.music('hub');
    this.unfocus();
    this.cutscene(false);
    this.freeGuide();
  }
}

function pickLine(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const VILLAGER = [
  '헤라클레스 님이다! 우와, 팔뚝 좀 봐!',
  '왕님은 겁이 많아서, 무서운 걸 보면 항아리에 숨는대요. 쉿!',
  '항아리를 깨도 괜찮아요. 우리 마을 항아리는 금방 다시 생기거든요!',
  '올리브 상인에게 동전을 가져가면 좋은 물건을 살 수 있어요.',
  '밤하늘의 은하수 알아요? 아기 헤라클레스 때문에 생겼대요!',
  '헤라클레스 님의 첫 이름은 "알케이데스"였대요. 델포이의 무녀가 새 이름을 지어 줬대요.',
  '헤라클레스 님은 어릴 때 활쏘기, 씨름, 마차 몰기, 리라 연주까지 다 배웠대요.',
];
const VILLAGER2 = [
  '별자리 제단의 별이 하나씩 켜질 때마다 마을이 더 밝아지는 것 같아요.',
  '아테나 여신님의 부엉이가 늘 헤라클레스 님 곁에 있대요.',
  '레벨이 오르면 힘, 체력, 빠르기 중에서 고를 수 있대요!',
  '올림픽 경기를 처음 연 사람이 헤라클레스 님이라는 이야기도 있어요!',
  '"헤라클레스"는 "헤라의 영광"이라는 뜻이래요. 신기하죠?',
  '구르는 순간에 공격을 피하면 "완벽한 회피"! 필살기 게이지가 확 차요.',
];
const IOLAUS = [
  '삼촌! 적이 빨간 원을 그리면 곧 공격한다는 뜻이에요. 휙 굴러서 피해요!',
  '삼촌, 큰 버튼을 톡톡톡 세 번 누르면 마지막에 쾅! 하고 내려찍어요.',
  '하트가 없으면 잠깐 쉬었다가 다시 일어나면 돼요. 걱정 마세요!',
];
const IOLAUS_AFTER = [
  '히드라 때 정말 재밌었어요! 치이익~ 하고 지지는 거요!',
  '삼촌, 스킬 버튼으로 독화살을 쏘면 알아서 적을 따라가요!',
  '왕님이 무효라고 했지만, 우린 진짜 해냈잖아요!',
  '삼촌, 숨은 황금 항아리는 길에서 살짝 벗어난 곳에 있대요.',
];
