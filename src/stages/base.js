// 스테이지 기본: 스크립트에서 쓰는 도우미 모음 (대화 · 목표 · 적 소환 · 보스 · 보상 · 완료)
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
    this.stats = { kills: 0, maxCombo: 0, coins: 0 };
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
    return this.world.add(new Pot({
      x, z, gold: true,
      onBreak: () => {
        this.treasure = true;
        this.toast('★ 숨은 황금 항아리를 찾았다!', 2.6);
      },
    }));
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
  }
}
