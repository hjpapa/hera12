// 타격 처리 한곳: 데미지 → 숫자 · 스파크 · 히트스톱 · 흔들림 · 소리 · 진동 · 넉백 · 콤보.
import * as THREE from 'three';
import { G, hitstop } from '../core/context.js';
import { rand } from '../core/util.js';

const v = new THREE.Vector3();

// 도움 모드 (같은 과업에서 두 번 쓰러지면 부엉이가 물어봄, 설정에서 항상 켤 수도 있음)
// 적의 공격 예고가 길어지고, 공격 사이에 더 오래 쉬고, 적이 조금 더 아파한다.
const ASSIST = { windup: 1.35, rest: 1.4, dealt: 1.25 };

export const Combat = {
  combo: 0,
  comboT: 0,

  // 공격 예고(빨간 원·선) 시간. 예고 표시와 실제 대기 시간에 같은 값을 써야 한다
  windup(t) {
    return G.assist ? t * ASSIST.windup : t;
  },

  // 공격과 공격 사이 쉬는 시간
  rest(t) {
    return G.assist ? t * ASSIST.rest : t;
  },

  reset() {
    this.combo = 0;
    this.comboT = 0;
  },

  // info: { amount, from(Vector3|{x,z}), knock, big, canCrit, type, poison, silent, hitstop }
  hitEnemy(e, info) {
    if (!e.alive || !e.hittable || e.removed) return null;
    if (e.invuln > 0 && !info.ignoreInvuln) return null;
    const from = info.from || G.player.pos;
    let dx = e.pos.x - from.x, dz = e.pos.z - from.z;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    e.center(v);
    if (e.flying || e.y > 0) v.y = e.y + e.height * 0.5;

    // 무적 등 특수 처리 (사자 가죽, 방패…)
    if (e.damageFilter) {
      const r = e.damageFilter(info, dx, dz);
      if (r && r.blocked) {
        G.fx.hitSpark(v, false);
        if (r.text) G.fx.text(v, r.text, { color: r.color || '#ffe86a', size: 1.2, cls: 'word' });
        G.audio.play(r.sound || 'thud');
        hitstop(info.big ? 0.08 : 0.04);
        G.rig.shake(info.big ? 0.3 : 0.15);
        G.input.vibrate(10);
        if (r.knock) e.push(dx, dz, r.knock);
        if (r.onHit) r.onHit();
        this.addCombo();
        if (info.type !== 'special') G.player?.addHero?.(info.big ? 5 : 3);
        return { blocked: true };
      }
    }

    let amount = info.amount;
    if (G.assist && e.team === 'enemy') amount *= ASSIST.dealt;
    const crit = info.canCrit && Math.random() < 0.12;
    if (crit) amount *= 1.6;
    amount *= rand(0.92, 1.08);
    if (e.stunned && info.type !== 'poison') amount *= info.stunBonus ?? 1.3;
    const dealt = e.takeDamage(amount, info);
    if (dealt === false) return null;

    if (!info.silent) {
      G.fx.damage(v, amount, { crit, poison: info.type === 'poison' });
      if (info.type !== 'poison') {
        G.fx.hitSpark(v, info.big || crit);
        const hs = info.hitstop ?? (info.big ? 0.1 : 0.05);
        hitstop(hs + (crit ? 0.03 : 0) + (e.hp <= 0 ? 0.06 : 0));
        G.rig.shake(info.big ? 0.32 : crit ? 0.25 : 0.14);
        G.audio.play(crit ? 'crit' : info.big ? 'hit_big' : 'hit', { pitch: 1 + Math.min(this.combo, 12) * 0.025 });
        G.input.vibrate(info.big ? 25 : 12);
        if (crit) G.fx.text(v, '치명타!', { color: '#ffd84a', size: 0.9, cls: 'word', rise: 2.4 });
      }
    }
    const kb = (info.knock ?? 3) * (e.stunned ? 0.5 : 1);
    if (kb) e.push(dx, dz, kb);
    if (info.launch && !e.flying && e.knockResist < 0.5) e.vy = info.launch;
    if (info.type !== 'poison') this.addCombo();
    if (info.poison) e.addPoison?.(info.poison);
    if (info.type !== 'poison' && info.type !== 'special' && e.team === 'enemy') G.player?.addHero?.(info.big ? 5 : 3);
    if (e.hp <= 0 && e.alive) {
      e.die(info);
      if (e.team === 'enemy' && info.type !== 'special') G.player?.addHero?.(8);
    }
    return { dealt: amount, crit, killed: !e.alive };
  },

  addCombo() {
    this.combo++;
    this.comboT = 2.5;
    const st = G.stage?.stats;
    if (st && this.combo > st.maxCombo) {
      st.maxCombo = this.combo;
      G.stage.checkChallenge?.();
    }
    G.ui?.hud?.combo(this.combo);
  },

  tick(dt) {
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
        G.ui?.hud?.combo(0);
      }
    }
  },

  // 원 안의 적 모두
  inRadius(pos, r, { team = 'enemy', includeProps = false } = {}) {
    return G.world.entities.filter((e) => {
      if (!e.alive || e.removed || !e.hittable) return false;
      if (e.team !== team && !(includeProps && e.team === 'prop')) return false;
      return Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) <= r + e.radius;
    });
  },

  // 적이 플레이어를 공격
  hurtPlayer(amount, from, opts = {}) {
    const p = G.player;
    if (!p || !p.alive) return false;
    return p.hurt(amount, from, opts);
  },

  // 플레이어가 원 안에 있으면 피해
  hitPlayerIfIn(pos, r, amount, opts = {}) {
    const p = G.player;
    if (!p || !p.alive) return false;
    if (p.y > 1.2 && !opts.air) return false;
    const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
    if (d <= r + p.radius * 0.6) return this.hurtPlayer(amount, pos, opts);
    return false;
  },
};
