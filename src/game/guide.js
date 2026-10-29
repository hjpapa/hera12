// 목표 안내: 플레이어 발밑 노란 화살표 + 목표 지점 빛기둥 (글을 못 읽어도 따라갈 수 있게)
import * as THREE from 'three';
import { G } from '../core/context.js';

export class Guide {
  constructor(scene) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.9);
    shape.lineTo(0.55, 0.1);
    shape.lineTo(0.22, 0.1);
    shape.lineTo(0.22, -0.5);
    shape.lineTo(-0.22, -0.5);
    shape.lineTo(-0.22, 0.1);
    shape.lineTo(-0.55, 0.1);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
    this.arrow = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.95, depthWrite: false }));
    this.arrow.renderOrder = 8;
    const outline = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x3a2618, transparent: true, opacity: 0.8, depthWrite: false }));
    outline.scale.setScalar(1.25);
    outline.position.y = -0.01;
    outline.renderOrder = 7;
    this.arrowGrp = new THREE.Group();
    this.arrowGrp.add(outline, this.arrow);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe86a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 14, 16, 1, true), beamMat);
    this.beam.position.y = 7;
    this.beamGrp = new THREE.Group();
    this.beamGrp.add(this.beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.35, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe86a, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.y = 0.06;
    this.ring = ring;
    this.beamGrp.add(ring);
    scene.add(this.arrowGrp, this.beamGrp);
    this.target = null;
    this.set(null);
  }

  set(target, { beam = true } = {}) {
    this.target = target;
    this.showBeam = beam;
    this.arrowGrp.visible = !!target;
    this.beamGrp.visible = !!target && beam;
  }

  update(t) {
    const p = G.player;
    const tg = this.target;
    if (!tg || !p) {
      this.arrowGrp.visible = false;
      this.beamGrp.visible = false;
      return;
    }
    const tp = tg.pos || tg;
    if (tg.alive === false) {
      this.set(null);
      return;
    }
    const dx = tp.x - p.pos.x, dz = tp.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    const show = d > 4.5 && !G.ui.cutscene;
    this.arrowGrp.visible = show;
    if (show) {
      const a = Math.atan2(dx, dz);
      const r = 1.9 + Math.sin(t * 6) * 0.18;
      this.arrowGrp.position.set(p.pos.x + Math.sin(a) * r, 0.08, p.pos.z + Math.cos(a) * r);
      this.arrowGrp.scale.setScalar(1.1);
      // 화살표 끝은 -z 를 향하게 만들어져 있음 → 목표 쪽으로 돌림
      this.arrowGrp.rotation.y = Math.atan2(-dx, -dz);
    }
    this.beamGrp.visible = this.showBeam && d > 2.5;
    this.beamGrp.position.set(tp.x, 0, tp.z);
    this.beam.material.opacity = 0.25 + Math.sin(t * 3) * 0.1;
    this.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
  }
}
