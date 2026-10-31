// 게임 본체: 렌더러 · 조명 · 루프(히트스톱/슬로모션) · 스테이지 불러오기 · 과업 완료 처리
import * as THREE from 'three';
import { G, pause, resume } from './context.js';
import { tickScripts, resetScripts, waitReal } from './script.js';
import { World } from '../game/world.js';
import { Player } from '../game/player.js';
import { Combat } from '../game/combat.js';
import { Guide } from '../game/guide.js';
import { CameraRig } from '../render/camera.js';
import { FX } from '../render/fx.js';
import { SPRITE_UNIFORMS } from '../render/billboard.js';
import { skyTexture } from '../render/props.js';
import { LABORS } from '../data/labors.js';
import { PLAY_LOG_MAX } from './save.js';

const STAGE_MODULES = import.meta.glob('../stages/*.js');

export class Game {
  constructor() {
    this.last = performance.now();
    this.slow = null;
    this.loading = false;
    // 휴대폰 최적화: 프레임 제한, 자동 해상도
    this.acc = 0;
    this.minFrameMs = 1000 / 61;
    this.resScale = 1;
    this.perf = { ema: 16.7, t: 0, good: 0, settle: 2 };
    this.pauseFrame = false;
    G.game = this;
  }

  init() {
    const canvas = document.getElementById('game');
    // 고해상도 휴대폰은 계단 현상이 잘 안 보이므로 안티앨리어싱을 꺼서 GPU를 아낀다
    const dpr = window.devicePixelRatio || 1;
    const aa = !(G.isTouch && dpr >= 2);
    const r = new THREE.WebGLRenderer({ canvas, antialias: aa, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.type = G.isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    G.renderer = r;
    const scene = new THREE.Scene();
    G.scene = scene;
    const cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 260);
    G.camera = cam;
    G.rig = new CameraRig(cam);
    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a9a6a, 1.7);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
    sun.position.set(8, 16, 6);
    sun.castShadow = true;
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    this.sun = sun;
    G.fx = new FX(scene);
    G.guide = new Guide(scene);
    this.applyQuality();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (this.simMode) return;
      if (document.hidden) {
        pause('hidden');
        G.audio.suspend();
      } else {
        resume('hidden');
        G.audio.unlock();
        this.requestWakeLock();
      }
    });
    this.resize();
    if (G.params.has('fps')) {
      this.fpsEl = document.createElement('div');
      this.fpsEl.style.cssText = 'position:fixed;left:4px;bottom:4px;color:#fff;font:12px monospace;z-index:99;pointer-events:none;text-shadow:0 1px 2px #000';
      document.body.appendChild(this.fpsEl);
      this.fpsT = 0;
      this.fpsN = 0;
    }
    requestAnimationFrame((t) => this.frame(t));
    if (G.params.has('sim')) this.startSim();
  }

  // ?sim : 화면이 숨겨져도(테스트) 실제 시간만큼 게임을 돌린다
  startSim() {
    this.simMode = true;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      let el = Math.min((now - last) / 1000, 30);
      last = now;
      while (el > 0.0001) {
        const d = Math.min(1 / 30, el);
        el -= d;
        this.step(d, el <= 0.0001);
      }
    };
    // 숨겨진 탭에서도 멈추지 않도록 워커 타이머로 깨운다
    try {
      const src = 'setInterval(() => postMessage(0), 16);';
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = tick;
    } catch (e) {
      setInterval(tick, 16);
    }
  }

  quality() {
    const q = G.save.data.settings.quality;
    if (q !== 'auto') return q;
    if (!G.isTouch) return 'high';
    // 메모리·코어가 적은 휴대폰은 처음부터 가볍게
    const lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    return lowEnd ? 'low' : 'mid';
  }

  basePixelRatio() {
    const q = this.quality();
    const dpr = window.devicePixelRatio || 1;
    return q === 'high' ? Math.min(dpr, 2) : q === 'mid' ? Math.min(dpr, 1.5) : Math.min(dpr, 1.1);
  }

  applyPixelRatio() {
    const auto = G.save.data.settings.quality === 'auto';
    const pr = auto ? Math.max(0.75, this.basePixelRatio() * this.resScale) : this.basePixelRatio();
    if (Math.abs(G.renderer.getPixelRatio() - pr) > 0.01) {
      G.renderer.setPixelRatio(pr);
      this.resize();
    }
  }

  // 프레임이 느리면 해상도를 조금씩 낮추고, 여유가 생기면 다시 올린다 (자동 화질일 때만)
  trackPerf(ms) {
    if (G.save.data.settings.quality !== 'auto' || this.loading || document.hidden) return;
    const P = this.perf;
    P.ema = P.ema * 0.9 + Math.min(ms, 60) * 0.1;
    P.t += ms / 1000;
    if (P.settle > 0) {
      P.settle -= ms / 1000;
      return;
    }
    if (P.t < 1.5) return;
    P.t = 0;
    if (P.ema > 22 && this.resScale > 0.62) {
      this.resScale = Math.max(0.6, this.resScale - 0.15);
      P.good = 0;
      P.settle = 1;
      this.applyPixelRatio();
    } else if (P.ema > 26 && G.renderer.shadowMap.enabled && this.resScale <= 0.62) {
      // 해상도를 최대한 낮췄는데도 느리면 그림자를 끈다
      this.setShadows(false);
      P.settle = 1;
    } else if (P.ema < 17.8) {
      P.good++;
      if (P.good >= 4 && this.resScale < 1) {
        this.resScale = Math.min(1, this.resScale + 0.1);
        P.good = 0;
        P.settle = 1;
        this.applyPixelRatio();
      }
    } else P.good = 0;
  }

  setShadows(on) {
    const r = G.renderer;
    if (r.shadowMap.enabled === on) return;
    r.shadowMap.enabled = on;
    G.scene.traverse((o) => {
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true));
    });
  }

  applyQuality() {
    const q = this.quality();
    this.resScale = 1;
    this.perf.settle = 2;
    G.renderer.setPixelRatio(this.basePixelRatio());
    this.setShadows(q !== 'low');
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    G.renderer.setSize(w, h, false);
    const cam = G.camera;
    cam.aspect = w / h;
    cam.fov = w < h ? 50 : 42;
    cam.updateProjectionMatrix();
    const px = G.renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((cam.fov * Math.PI) / 360));
    G.fx.setScale(px);
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !document.hidden) this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {
      /* 지원 안 함 */
    }
  }

  // 슬로모션 (보스 마지막 일격 등)
  slowmo(scale = 0.3, dur = 1.2) {
    this.slow = { scale, t: dur };
    G.timeScale = scale;
  }

  setSky(top, bottom, fog = bottom, near = 45, far = 130) {
    G.scene.background?.dispose?.();
    G.scene.background = skyTexture(top, bottom);
    const fc = new THREE.Color(fog);
    G.scene.fog = new THREE.Fog(fc, near, far);
    SPRITE_UNIFORMS.uFogColor.value.setHex(new THREE.Color(fog).getHex(), THREE.LinearSRGBColorSpace);
    SPRITE_UNIFORMS.uFogNear.value = near;
    SPRITE_UNIFORMS.uFogFar.value = far;
  }

  setLight({ hemiSky = 0xfff4e0, hemiGround = 0x8a9a6a, hemi = 1.7, sun = 2.3, sunColor = 0xfff0d8, tint = 0xffffff } = {}) {
    this.hemi.color.set(hemiSky);
    this.hemi.groundColor.set(hemiGround);
    this.hemi.intensity = hemi;
    this.sun.intensity = sun;
    this.sun.color.set(sunColor);
    SPRITE_UNIFORMS.uTint.value.setHex(tint, THREE.LinearSRGBColorSpace);
  }

  // ───────── 스테이지 ─────────
  async loadStage(id, params = {}) {
    if (this.loading) return;
    this.loading = true;
    G.ui.setCutscene(false);
    await G.ui.screens.fade(true, 0.35);
    G.audio.stopSpeak();
    resetScripts();
    pause('loading');
    if (G.stage) {
      G.stage.dispose?.();
    }
    if (G.world) G.world.dispose();
    G.fx.clear();
    G.guide.set(null);
    G.ui.hud.setBoss(null);
    G.ui.hud.setObjective(null);
    G.ui.hud.counter(null);
    G.ui.hud.combo(0);
    Combat.reset();
    G.assist = !!G.save.data.settings.assist;
    G.rig.pair = null;
    G.rig.clearFocus();
    G.rig.zoomTarget = 1;
    G.timeScale = 1;
    G.hitstop = 0;
    this.slow = null;
    G.sprites.releaseUnused();
    G.debug.god = G.params.has('god');
    G.debug.auto = G.params.has('auto');
    G.debug.report = G.params.has('report');
    // 과업 중간 이어하기: 이어하기로 들어온 게 아니면 지움 (과업을 끝내거나 마을로 나가도 지워짐)
    if (!params.resume && G.save.data.resume) G.save.data.resume = null;

    const key = `../stages/${id}.js`;
    if (!STAGE_MODULES[key]) {
      console.error('stage not found', id);
      this.loading = false;
      resume('loading');
      return;
    }
    const mod = await STAGE_MODULES[key]();
    const StageClass = mod.default;
    const stage = new StageClass(params);
    stage.id = id;
    const world = new World();
    world.stage = stage;
    stage.world = world;
    G.stage = stage;
    G.world = world;
    G.scene.add(world.root);
    this.setLight({});
    stage.setup();
    stage.build(world);
    world.bakeStatic();
    const sp = stage.spawn || { x: 0, z: 0 };
    const player = new Player({ x: sp.x, z: sp.z, skill: stage.skill });
    world.add(player);
    if (sp.face) player.face = sp.face;
    stage.checkpoint = stage.checkpoint || { x: sp.x, z: sp.z };
    G.rig.yaw = stage.yaw || 0;
    G.rig.snap();
    G.ui.hud.updateAll();
    G.ui.hud.show(true);
    stage.afterBuild?.();
    this.prewarm(stage);
    G.audio.music(stage.music);
    resume('loading');
    this.loading = false;
    G.input.setVisible(true);
    G.save.write();
    await G.ui.screens.fade(false, 0.4);
    stage.startTime = G.time;
    stage.run().catch((e) => console.error('[stage]', e));
  }

  // 처음 보이는 순간 버벅이지 않도록 그림을 GPU에 올리고 셰이더를 미리 만든다
  prewarm(stage) {
    const r = G.renderer;
    const ids = new Set(stage.preload || []);
    for (const e of G.world.entities) if (e.sprite) ids.add(e.sprite);
    for (const id of ids) {
      try { r.initTexture(G.sprites.texture(id)); } catch (e) { /* 무시 */ }
    }
    if (!this.fxWarm) {
      // 공격 예고·충격파·베기 효과 셰이더 (처음 쓸 때 멈칫하지 않게)
      this.fxWarm = true;
      const far = { x: 0, z: -9999 };
      const tmp = [
        G.fx.telegraphCircle(far, 1, 0.1),
        G.fx.telegraphLine(far, { x: 0, z: 1 }, 1, 1, 0.1),
        G.fx.ring(far, { life: 0.1 }),
        G.fx.slash(far, 0, { life: 0.1 }),
      ];
      try { r.compile(G.scene, G.camera); } catch (e) { /* 무시 */ }
      tmp.forEach((o) => o.remove());
    } else {
      try { r.compile(G.scene, G.camera); } catch (e) { /* 무시 */ }
    }
    this.perf.settle = 2.5;
  }

  goHub(params = {}) {
    return this.loadStage('hub', params);
  }

  goLabor(n, extra = {}) {
    const L = LABORS[n - 1];
    return this.loadStage(L.stage, { n, ...extra });
  }

  // ───────── 루프 ─────────
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    if (this.simMode) return;
    // 120Hz 화면에서도 최대 60fps (배터리·발열 절약)
    const since = now - (this.prevRaf ?? now);
    this.prevRaf = now;
    this.acc = Math.min(this.acc + since, this.minFrameMs * 3);
    if (this.acc < this.minFrameMs) return;
    this.acc %= this.minFrameMs;
    const ms = now - this.last;
    const rawDt = Math.min(ms / 1000, 1 / 20);
    this.last = now;
    this.trackPerf(ms);
    // 대화·메뉴로 멈춰 있을 땐 30fps로만 그림
    let render = true;
    if (G.paused && !this.loading) {
      this.pauseFrame = !this.pauseFrame;
      render = this.pauseFrame;
    }
    this.step(rawDt, render);
  }

  step(rawDt, render) {
    G.realTime += rawDt;
    G.rawDt = rawDt;
    const inp = G.input;
    inp.update();

    if (inp.pressed.pause && G.stage && !G.ui.screens.open && !G.ui.dialog.open && !G.ui.cutscene && !this.loading) {
      G.ui.screens.pauseMenu();
    }

    if (this.slow) {
      this.slow.t -= rawDt;
      if (this.slow.t <= 0) {
        this.slow = null;
        G.timeScale = 1;
      }
    }
    let dt = rawDt * G.timeScale;
    const stopped = G.hitstop > 0;
    if (stopped) {
      G.hitstop -= rawDt;
      dt = 0;
    }
    if (G.paused) dt = 0;
    G.dt = dt;
    G.time += dt;

    const w = G.world;
    if (w && !this.loading) {
      if (dt > 0) {
        w.update(dt);
        G.stage?.update?.(dt);
        Combat.tick(dt);
      } else if (stopped && !G.paused && G.player) {
        G.player.bufferInputs();
      }
    }
    tickScripts();
    G.fx.update(dt, rawDt);
    G.rig.update(rawDt);
    G.guide.update(G.realTime);
    G.ui.update(dt, rawDt);
    this.checkLevelUp();

    const p = G.player;
    if (p) {
      this.sun.position.set(p.pos.x + 8, 16, p.pos.z + 6);
      this.sun.target.position.set(p.pos.x, 0, p.pos.z);
    }
    if (render) G.renderer.render(G.scene, G.camera);
    inp.endFrame();

    if (this.fpsEl) {
      this.fpsT += rawDt;
      this.fpsN++;
      if (this.fpsT > 0.5) {
        this.fpsEl.textContent = `${Math.round(this.fpsN / this.fpsT)} fps · ${G.renderer.info.render.calls} calls · ${G.world?.entities.length ?? 0} ent · x${G.renderer.getPixelRatio().toFixed(2)}`;
        this.fpsT = 0;
        this.fpsN = 0;
      }
    }
  }

  async checkLevelUp() {
    const p = G.player;
    if (!p || p.pendingLevelUps <= 0 || this.levelBusy) return;
    if (G.paused || G.ui.cutscene || G.ui.dialog.open || G.ui.screens.open || this.loading) return;
    // 공격 버튼을 톡톡 누르는 중에 카드 창이 뜨면 모르고 카드를 고를 수 있으니, 손이 잠깐 쉴 때 띄운다
    if (p.state !== 'move' || G.time - p.lastActT < 0.8) return;
    this.levelBusy = true;
    p.pendingLevelUps--;
    G.fx.starPop(p.pos, 1.2);
    G.fx.ring(p.pos, { r0: 0.5, r1: 5, life: 0.6, color: 0x7ad8ff });
    await waitReal(0.35);
    const key = await G.ui.screens.levelUp();
    G.save.data.picks[key]++;
    p.recalc();
    p.heal(p.maxHp, true);
    G.ui.hud.updateAll();
    G.save.write();
    this.levelBusy = false;
  }

  // ───────── 과업 완료 ─────────
  async completeLabor(n, { treasure = false, extraStar = null } = {}) {
    const L = LABORS[n - 1];
    const save = G.save;
    const prev = save.laborState(n);
    const first = !prev.cleared;
    const elapsed = G.time - (G.stage?.startTime || 0);
    let challenge = G.stage?.challengeMet ? G.stage.challengeMet(elapsed) : false;
    if (extraStar !== null) challenge = extraStar;
    const stars = [true, treasure, challenge];
    const merged = stars.map((s, i) => s || (prev.stars || [])[i] || false);
    const st = G.stage?.stats || { kills: 0, maxCombo: 0, coins: 0 };
    const newCombo = st.maxCombo > (prev.bestCombo || 0);
    save.data.labors[n] = { cleared: true, stars: merged, bestTime: Math.min(prev.bestTime || 9999, elapsed), bestCombo: Math.max(prev.bestCombo || 0, st.maxCombo) };
    // 보상 (처음 깼을 때)
    await G.stage.giveRewards?.();
    for (const c of L.cards) {
      if (save.addCard(c)) await G.ui.screens.card(c);
    }
    if (first) save.data.pendingReport = n;
    // 난이도 조정용 기록: 부모님 메뉴 "플레이 기록"에 남김. ?report 면 콘솔에도 한 줄 (G.debug.reports 에도 모아 둠)
    if (G.stage?.balanceReport) {
      const r = { at: Date.now(), ...G.stage.balanceReport(elapsed, stars) };
      const log = (save.data.playLog ||= []);
      log.push(r);
      if (log.length > PLAY_LOG_MAX) log.splice(0, log.length - PLAY_LOG_MAX);
      if (G.debug.report) {
        (G.debug.reports ||= []).push(r);
        console.log('[report] ' + JSON.stringify(r));
      }
    }
    save.write();
    await G.ui.screens.result({ n, stars, labels: ['과업 완료', '숨은 황금 항아리 찾기', L.challenge.label], time: elapsed, stats: st, newCombo: newCombo && !first });
    await this.goHub(first ? { report: n } : {});
  }
}
