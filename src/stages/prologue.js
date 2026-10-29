// 프롤로그: 아기 헤라클레스와 두 마리 뱀 (연타 튜토리얼) → 그림책 → 티린스로
import { G } from '../core/context.js';
import { Stage, wait, waitReal } from './base.js';
import { Entity } from '../game/entity.js';
import { toon } from '../render/props.js';
import * as THREE from 'three';

export default class Prologue extends Stage {
  constructor(p) {
    super(p);
    this.music = 'sad';
    this.spawn = { x: 0, z: 0.4 };
  }

  setup() {
    G.game.setSky('#141a3a', '#2a2a5a', '#1a1a3a', 20, 60);
    G.game.setLight({ hemiSky: 0x8a90d0, hemiGround: 0x3a2a4a, hemi: 1.2, sun: 1.0, sunColor: 0xb0b8ff, tint: 0xd8dcff });
  }

  build(world) {
    super.build(world);
    const B = this.B;
    world.rect(-6, -5, 6, 5);
    B.ground({ shape: 'rect', w: 16, h: 12, color: 0xb07a4a, color2: 0x9a6a3a, edge: 0x6a4a2a, edgeH: 1 });
    B.wall(-8, -6, 8, -6, { h: 5, t: 0.6, color: 0xe8dcc0 });
    B.wall(-8, -6, -8, 6, { h: 5, t: 0.6, color: 0xe8dcc0 });
    B.wall(8, -6, 8, 6, { h: 5, t: 0.6, color: 0xe8dcc0 });
    B.column(-5, -5.4, { h: 4.5 });
    B.column(5, -5.4, { h: 4.5 });
    B.torch(-6.5, -4.5);
    B.torch(6.5, -4.5);
    // 요람
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 2), toon(0xc99a5a));
    cradle.position.set(0, 0.45, 0);
    B.add(cradle);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 1.7), toon(0x8fc8f0));
    blanket.position.set(0, 0.95, 0);
    B.add(blanket);
    // 창문 달빛
    const moon = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
    moon.position.set(3, 3.6, -5.65);
    B.add(moon);
  }

  afterBuild() {
    const p = G.player;
    p.visual.setSprite('hercules_baby');
    p.visual.removePart('weapon');
    p.y = 0.9;
    p.gravity = 0;
    p.shadow.visible = false;
    p.locked = true;
    this.twin = this.add(new Entity({ sprite: 'iphicles', x: 1.2, z: 0.2, solid: false }));
    this.twin.y = 0.9;
    this.twin.gravity = 0;
  }

  async run() {
    G.input.setVisible(false);
    this.cutscene(true);
    G.rig.zoomTarget = 0.55;
    await G.ui.screens.storybook([
      { art: 'p_birth', text: '아주 먼 옛날, 신들의 왕 제우스에게 아들이 태어났어요. 이름은 헤라클레스!' },
      { art: 'p_hera', text: '하지만 제우스의 아내 헤라 여신은 헤라클레스가 미웠어요. 그래서 아기 침대에 뱀 두 마리를 몰래 보냈지요.' },
    ]);
    // 뱀 두 마리가 다가온다
    const snakes = [-1, 1].map((s) => this.add(new Entity({ sprite: 'snake', x: s * 6, z: 3, solid: false, face: -s, scale: 1.5 })));
    G.audio.play('hiss');
    for (let i = 0; i < 60; i++) {
      snakes.forEach((sn, k) => {
        const s = k ? 1 : -1;
        sn.pos.x += (s * 1.4 - sn.pos.x) * 0.05;
        sn.pos.z += (1.5 - sn.pos.z) * 0.05;
        sn.visual.roll = Math.sin(G.realTime * 10 + k) * 0.15;
      });
      await waitReal(0.03);
    }
    snakes.forEach((s) => (s.y = 0.35));
    await this.talk([
      ['iphicles', '으앙! 으아앙!'],
      ['glau', '부엉! 나는 아테나 여신님의 부엉이 글라우야. 아기 헤라클레스, 뱀을 꽉 잡아!'],
      ['glau', G.isTouch ? '큰 버튼을 빠르게 톡톡톡 눌러 봐!' : 'J 키(또는 스페이스)를 빠르게 톡톡톡 눌러 봐!'],
    ]);
    G.input.setVisible(true);
    G.input.btn.dash.classList.add('hidden');
    G.input.btn.skill.classList.add('hidden');
    G.input.btn.swap.classList.add('hidden');
    let ok = false;
    while (!ok) {
      ok = await G.ui.hud.mash({ title: '꽉 잡기!', hint: '큰 버튼을 톡톡톡!', goal: 14, time: 12, decay: 0.7, onTap: (k) => {
        snakes.forEach((s) => s.squash(0.1, 0.2));
        G.player.squash(0.1, 0.15);
        if (k > 0.5) snakes.forEach((s) => s.visual.setSprite('snake_dizzy'));
      } });
      if (!ok) await this.say('glau', '조금만 더 빨리! 다시 해 보자!');
    }
    G.input.btn.dash.classList.remove('hidden');
    G.input.setVisible(false);
    G.audio.play('hit_big');
    G.rig.shake(0.6);
    snakes.forEach((s) => {
      G.fx.starPop(s.pos, 1);
      s.world.remove(s);
    });
    G.player.visual.setSprite('hercules_baby');
    await waitReal(0.6);
    await this.talk([
      ['baby', '까르르! 까르르!'],
      ['glau', '우와… 아기가 뱀을 이겼어! 이 힘, 꼭 기억해 둬. 나중에 아주 쓸모가 있을 거야.'],
    ]);
    await G.ui.screens.storybook([
      { art: 'p_grow', text: '헤라클레스는 무럭무럭 자라 세상에서 가장 힘센 청년이 되었어요.' },
      { art: 'p_curse', text: '그런데 헤라의 나쁜 마법 때문에, 헤라클레스는 아주 큰 잘못을 저지르고 말았어요. 마법이 풀리자 헤라클레스는 펑펑 울었어요.' },
      { art: 'p_delphi', text: '잘못을 씻을 방법을 묻기 위해 델포이 신전으로 가자, 무녀가 말했어요.' },
      { art: 'p_delphi', text: '"티린스의 에우리스테우스 왕을 찾아가거라. 왕이 내리는 과업을 모두 해내면, 너는 영원히 기억되는 영웅이 되리라."' },
      { art: 'p_journey', text: '헤라클레스는 길을 떠났어요. 열두 개의 과업, 열두 개의 별을 향해!' },
    ]);
    G.save.data.prologueDone = true;
    G.save.write();
    await wait(0);
    G.game.goHub();
  }
}
