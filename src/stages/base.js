// 스테이지 기본: 스크립트에서 쓰는 도우미 모음 (대화 · 목표 · 적 소환 · 보스 · 보상 · 완료)
import * as THREE from 'three';
import { G } from '../core/context.js';
import { wait, until, waitReal } from '../core/script.js';
import { Builder } from '../render/props.js';
import { Enemy } from '../game/enemy.js';
import { NPC, Follower } from '../game/npc.js';
import { Pot } from '../game/items.js';
import { LABORS } from '../data/labors.js';
import { TAU, rand } from '../core/util.js';

export { wait, until, waitReal };

export class Stage {
  constructor(params = {}) {
    this.params = params;
    this.n = params.n || 0;
    this.music = 'field';
    this.spawn = { x: 0, z: 0 };
    this.yaw = 0;
    this.skill = null;
    this.treasure = false;
    this.rewardsGiven = false;
    // 결과 화면 기록 + 도전 판정 (hurts: 맞은 횟수, damage: 잃은 하트(반 칸 단위), perfects: 완벽한 회피 횟수)
    this.stats = { kills: 0, maxCombo: 0, coins: 0, hurts: 0, damage: 0, perfects: 0 };
    this.bossLog = []; // 보스전 시간 (?report)
    this.preload = [];
  }

  get labor() {
    return LABORS[this.n - 1];
  }

  // 하늘·안개·빛
  setup() {
    G.game.setSky('#8fd0ff', '#f4ecd8', '#e8eef0', 45, 130);
  }

  build(world) {
    this.B = new Builder(world, 11);
  }

  async run() {}

  update(dt) {}

  // 공통 지형: 넓은 땅 + 걷기 영역(원·길) + 길 표시 + 가장자리 꾸미기
  // zones: [[x, z, r]], roads: [[[x,z],[x,z],...], ...]
  buildLevel({ w = 140, h = 140, cx = 0, cz = 0, color = 0x9cc965, color2 = 0x7fb050, edge = 0x9a7a52, zones = [], roads = [], roadW = 5, pathColor = 0xe8d8a8, paths = true, border = null, borderStep = 3.2 } = {}) {
    const B = this.B;
    const W = this.world;
    for (const [x, z, r] of zones) W.circle(x, z, r);
    for (const rd of roads) W.road(rd, roadW / 2);
    B.ground({ shape: 'rect', w, h, x: cx, z: cz, color, color2, edge, edgeH: 2 });
    if (paths) {
      for (const rd of roads) B.path(rd, { width: roadW * 0.6, color: pathColor });
      for (const [x, z, r] of zones) B.patch(x, z, r * 0.8, pathColor, 0.015);
    }
    this.zones = zones;
    this.roads = roads;
    if (border) this.borderDecor(border, borderStep);
  }

  // 걷기 영역 가장자리를 따라 나무/바위를 심어 길이 막힌 것처럼 보이게
  borderDecor(fn, step = 3.2) {
    const W = this.world;
    const pts = [];
    for (const [x, z, r] of this.zones || []) {
      const n = Math.max(6, Math.round((TAU * (r + 1.8)) / step));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.1, 0.1);
        const d = r + rand(1.4, 2.6);
        pts.push([x + Math.cos(a) * d, z + Math.sin(a) * d]);
      }
    }
    for (const rd of this.roads || []) {
      for (let i = 0; i < rd.length - 1; i++) {
        const [ax, az] = rd[i], [bx, bz] = rd[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const nx = -(bz - az) / len, nz = (bx - ax) / len;
        const n = Math.ceil(len / step);
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          for (const sd of [-1, 1]) {
            const off = 2.5 + 1.4 + rand(0, 1.2);
            pts.push([ax + (bx - ax) * t + nx * off * sd, az + (bz - az) * t + nz * off * sd]);
          }
        }
      }
    }
    let i = 0;
    for (const [x, z] of pts) {
      if (W.walkable(x, z, -1.0)) continue;
      fn(x, z, i++);
    }
  }

  // ───────── 대화 ─────────
  say(speaker, text) {
    return G.ui.dialog.talk([[speaker, text]]);
  }

  talk(lines) {
    return G.ui.dialog.talk(lines);
  }

  async choose(speaker, text, options) {
    const i = await G.ui.dialog.choose(speaker, text, options);
    G.ui.dialog.hide();
    return i;
  }

  // ───────── 연출 ─────────
  cutscene(on) {
    G.ui.setCutscene(on);
    if (on) {
      G.player.vel.set(0, 0, 0);
      G.player.state = 'move';
    }
  }

  focus(x, z, zoom = 0.8) {
    if (typeof x === 'object') {
      zoom = z ?? 0.8;
      z = x.pos ? x.pos.z : x.z;
      x = x.pos ? x.pos.x : x.x;
    }
    G.rig.setFocus(x, z, zoom);
  }

  unfocus() {
    G.rig.clearFocus();
  }

  banner(title, sub, dur) {
    return G.ui.hud.banner(title, sub, dur);
  }

  toast(text, dur) {
    G.ui.hud.toast(text, dur);
  }

  objective(text, target = null, opts) {
    G.ui.hud.setObjective(text);
    G.guide.set(target, opts);
    if (text) G.audio.play('select');
  }

  counter(text) {
    G.ui.hud.counter(text);
  }

  checkpointAt(x, z) {
    this.checkpoint = { x, z };
  }

  // ───────── 엔티티 ─────────
  add(e) {
    return this.world.add(e);
  }

  enemy(cfg) {
    return this.world.add(new Enemy(cfg));
  }

  // 원 모양으로 여러 마리
  wave(cfg, n, cx, cz, r = 4) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.3, 0.3);
      list.push(this.enemy({ ...cfg, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }));
    }
    return list;
  }

  async waitDefeated(list) {
    await until(() => list.every((e) => !e.alive));
  }

  // 근처에 오면 적 무리 등장 → 다 물리칠 때까지 기다림
  async ambush(x, z, r, spawnFn, { text = null } = {}) {
    await until(() => G.player && Math.hypot(G.player.pos.x - x, G.player.pos.z - z) < r);
    if (text) this.toast(text);
    const list = spawnFn();
    G.audio.music('field');
    await this.waitDefeated(list);
    return list;
  }

  npc(sprite, x, z, talk, o = {}) {
    return this.world.add(new NPC({ sprite, x, z, talk, ...o }));
  }

  follower(sprite, x, z, o = {}) {
    return this.world.add(new Follower({ sprite, x, z, ...o }));
  }

  pot(x, z) {
    return this.world.add(new Pot({ x, z }));
  }

  pots(list) {
    list.forEach(([x, z]) => this.pot(x, z));
  }

  // 숨은 황금 항아리 = 별 하나
  treasurePot(x, z) {
    const pot = this.world.add(new Pot({
      x, z, gold: true,
      onBreak: () => {
        this.treasure = true;
        this.toast('★ 숨은 황금 항아리를 찾았다!', 2.6);
        if (this.mapBeam) {
          // 보물 지도는 항아리를 찾았을 때 다 쓴 것으로
          this.mapBeam.removeFromParent();
          this.mapBeam.geometry.dispose();
          this.mapBeam.material.dispose();
          this.mapBeam = null;
          G.save.data.shop.map = Math.max(0, (G.save.data.shop.map || 0) - 1);
          G.save.write();
        }
      },
    }));
    // 부엉이 보물 지도(상점)가 있고 아직 못 찾은 항아리면 위에 황금 빛기둥
    if (G.save.data.shop.map > 0 && this.n && !G.save.laborState(this.n).stars?.[1]) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffb84a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 24, 12, 1, true), mat);
      beam.position.set(x, 12, z);
      beam.userData.dynamic = true;
      this.world.root.add(beam);
      this.world.onUpdate(() => {
        if (this.mapBeam) mat.opacity = 0.3 + Math.sin(G.time * 4) * 0.12;
      });
      this.mapBeam = beam;
    }
    return pot;
  }

  // ───────── 보스 ─────────
  async bossIntro(boss, name, { zoom = 0.9, lines = null, roar = 'roar' } = {}) {
    this.cutscene(true);
    this.focus(boss.pos.x, boss.pos.z, zoom);
    await waitReal(0.5);
    G.audio.play(roar);
    G.rig.shake(0.5);
    boss.squash(0.4, 0.3);
    await this.banner(name, '', 1.6);
    if (lines) await this.talk(lines);
    this.unfocus();
    this.cutscene(false);
    G.audio.music('boss');
    G.ui.hud.setBoss(boss, name);
    G.rig.pair = boss;
    boss.cry = roar; // 화날 때도 같은 울음소리
    boss.start?.();
  }

  async bossDown(boss, { text = '과업 성공!', slow = true } = {}) {
    if (slow) G.game.slowmo(0.25, 1.3);
    G.rig.shake(0.7);
    G.ui.hud.flash('gold');
    G.input.vibrate([40, 40, 80]);
    G.ui.hud.setBoss(null);
    G.rig.pair = null;
    G.world.enemies().forEach((e) => e !== boss && e.die());
    await waitReal(1.4);
    G.audio.music(null);
    G.audio.jingle('victory');
    if (text) await this.banner(text, '', 2);
  }

  // ───────── 보상 ─────────
  async giveRewards() {
    if (this.rewardsGiven || !this.labor) return;
    this.rewardsGiven = true;
    const first = !G.save.laborState(this.n).cleared || !this.labor.rewards.every((r) => (r.gear ? G.save.has(r.gear) : G.save.has(r.skill)));
    for (const r of this.labor.rewards) {
      const had = r.gear ? G.save.has(r.gear) : G.save.has(r.skill);
      if (had) continue;
      if (r.gear) G.save.addGear(r.gear);
      if (r.skill) G.player.learnSkill(r.skill);
      G.player.recalc();
      G.player.refreshLook();
      G.ui.hud.updateAll();
      await G.ui.screens.reward({ icon: r.icon, title: r.title, desc: r.desc });
    }
    void first;
    G.save.write();
  }

  // ───────── 도전 (과업별 세 번째 별) ─────────
  // labors.js 의 challenge: { type, label, n | time }
  challengeMet(elapsed = G.time - (this.startTime || 0)) {
    const c = this.labor?.challenge;
    if (!c) return false;
    const st = this.stats;
    switch (c.type) {
      case 'noFaint': return (G.player?.faints || 0) === 0;
      case 'fast': return elapsed <= c.time;
      case 'combo': return st.maxCombo >= c.n;
      case 'perfect': return st.perfects >= c.n;
      case 'hurtMax': return st.hurts <= c.n;
    }
    return false;
  }

  // 모으는 도전(콤보·완벽한 회피)은 이룬 순간 바로 칭찬, "n번까지만 맞기"는 마지막 한 번 남았을 때 살짝 알려 줌
  checkChallenge() {
    const c = this.labor?.challenge;
    if (!c || this.challengeShown) return;
    if (c.type === 'hurtMax') {
      if (this.stats.hurts !== c.n) return;
      this.challengeShown = true;
      this.toast('조심조심! 더 맞으면 도전은 다음 기회에', 2.6);
      return;
    }
    if (c.type !== 'combo' && c.type !== 'perfect') return;
    if (!this.challengeMet()) return;
    this.challengeShown = true;
    this.toast(`★ 도전 성공! ${c.label}`, 2.6);
    G.audio.jingle('star');
    G.audio.speak('도전 성공! ' + c.label, { pitch: 1.35 });
  }

  // ───────── 도움 모드 ─────────
  // 같은 과업에서 두 번 쓰러지면 부엉이가 한 번 물어본다
  async onRespawn(p) {
    if (G.assist || this.assistAsked || p.faints < 2 || !this.labor) return;
    this.assistAsked = true;
    await until(() => !G.ui.dialog.open && !G.ui.cutscene && !G.ui.screens.open && !G.game.loading);
    if (G.stage !== this || G.assist) return;
    const i = await this.choose('glau', '부엉! 조금 어렵지? 내가 도와줄까? 적들이 천천히 공격하게 해 줄게!', ['도와줘!', '혼자 해 볼래!']);
    if (i === 0) this.setAssist(true);
  }

  setAssist(on) {
    G.assist = on;
    if (!on) return;
    const p = G.player;
    if (p) {
      G.fx.starPop(p.pos, 0.9);
      G.fx.burst(p.pos, { count: 10, color: [0x8fe0ff, 0xffffff], tile: 'star', size: 0.45, speed: 4, gravity: -1 });
    }
    G.audio.play('magic');
    this.toast('🦉 도움 모드! 적들이 천천히 공격해요', 2.8);
  }

  // ───────── 과업 중간 이어하기 ─────────
  // 보스 앞에 오면 저장해 둔다. 앱이 꺼진 뒤 타이틀에서 이어하기를 누르면 그 과업의 보스 앞에서 시작
  get resuming() {
    return !!this.params.resume;
  }

  saveResume() {
    G.save.data.resume = { n: this.n, at: Date.now() };
    G.save.write();
  }

  // 이어하기로 들어왔을 때: 정해 둔 자리로 옮기고 그곳을 체크포인트로
  async resumeHere(x, z) {
    const p = G.player;
    p.pos.set(x, 0, z);
    p.lastSafe = { x, z };
    p.vel.set(0, 0, 0);
    this.checkpointAt(x, z);
    G.rig.snap();
    await this.banner('보스 앞에서 다시 시작!', '', 1.6);
  }

  // ───────── 밸런스 기록 (?report) ─────────
  bossFightStart(e, name) {
    if (this.bossLog.some((b) => b.e === e && b.end === null)) return;
    this.bossLog.push({ e, name, start: G.time, end: null });
  }

  bossFightEnd(e) {
    const b = this.bossLog.find((x) => x.e === e && x.end === null);
    if (b) b.end = G.time;
  }

  balanceReport(elapsed, stars) {
    const p = G.player;
    const st = this.stats;
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      n: this.n,
      title: this.labor?.title,
      sec: Math.round(elapsed),
      level: G.save.data.level,
      atk: r1(p.stats.atk),
      hearts: p.maxHp / 2,
      faints: p.faints,
      hurts: st.hurts,
      lostHearts: r1(st.damage / 2),
      kills: st.kills,
      maxCombo: st.maxCombo,
      perfects: st.perfects,
      coins: st.coins,
      assist: G.assist,
      stars,
      // 체력 바가 꺼지지 않고 끝난 보스전은 과업이 끝난 때까지로 셈
      bosses: this.bossLog.map((b) => ({ name: b.name, sec: Math.round((b.end ?? G.time) - b.start) })),
    };
  }

  async complete(opts = {}) {
    G.guide.set(null);
    G.ui.hud.setObjective(null);
    this.cutscene(false);
    await G.game.completeLabor(this.n, { treasure: this.treasure, ...opts });
  }

  // 시작 배너
  async intro() {
    const L = this.labor;
    if (!L) return;
    await this.banner(`과업 ${L.n} · ${L.title}`, L.place, 2.4);
    const c = L.challenge;
    if (c) {
      const done = G.save.laborState(L.n).stars?.[2];
      this.toast(`${done ? '★' : '☆'} 도전: ${c.label}`, 3.2);
      if (!done) G.audio.speak('도전! ' + c.label, { pitch: 1.2 });
    }
    if (this.mapBeam) wait(3.4).then(() => this.mapBeam && this.toast('🗺 보물 지도: 황금 빛기둥 아래에 항아리가 있어!', 3));
    // 다시 하는 과업인데 황금 항아리를 아직 못 찾았으면 한 번 알려 줌
    else if (G.save.laborState(L.n).cleared && !G.save.laborState(L.n).stars?.[1]) wait(3.4).then(() => !this.treasure && this.toast('🏺 이 과업 어딘가에 숨은 황금 항아리가 있어!', 3));
  }
}
