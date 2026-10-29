// ?bot : 자동 플레이 봇 (개발 테스트용). 목표 화살표를 따라가고, 적을 때리고, 상황 버튼을 누른다.
import { G } from '../core/context.js';

export function startBot() {
  let last = { x: 0, z: 0, t: 0 }, strafe = 0, sx = 0, sy = 0;
  setInterval(() => {
    const p = G.player;
    if (!p || !G.world || G.paused) return;
    const inp = G.input;
    const setStick = (x, y) => { inp.stick.x = x; inp.stick.y = y; };
    const gt0 = G.guide.target;
    if (p.context && (p.context.icon !== 'talk' || (gt0 && p.context.entity === gt0))) { setStick(0, 0); inp.press('attack'); return; }
    // 막혔으면 옆으로 비켜 가기
    if (Math.hypot(p.pos.x - last.x, p.pos.z - last.z) > 0.4) last = { x: p.pos.x, z: p.pos.z, t: G.realTime };
    else if (G.realTime - last.t > 1.5 && strafe <= 0) { strafe = 0.6; const a = Math.random() * 6.28; sx = Math.cos(a); sy = Math.sin(a); last.t = G.realTime; }
    if (strafe > 0) { strafe -= 0.09; setStick(sx, sy); return; }
    const e = G.world.nearest(p.pos, { maxDist: 22, filter: (e) => e.hittable && e.alive && !e.hidden && !e.dying });
    let t = null, prop = null;
    const gt = G.guide.target;
    if (e) t = e.pos;
    else if (gt) { t = gt.pos || gt; if (gt.team === 'prop' && gt.hittable) prop = gt; }
    if (!t) {
      // 할 일이 안 보이면 가장 가까운 상호작용(지지기, 바위 등)으로
      let best = null, bd = 1e9;
      for (const it of G.world.interactables) {
        if (it.icon === 'talk' || (it.enabled && !it.enabled())) continue;
        const ip = it.entity ? it.entity.pos : it.pos;
        const dd = Math.hypot(ip.x - p.pos.x, ip.z - p.pos.z);
        if (dd < bd) { bd = dd; best = ip; }
      }
      t = best;
    }
    if (!t) { setStick(0, 0); return; }
    // 목표 지점에 도착했는데 적이 없으면 스킬(딸랑이 등) 사용
    if (!e && !prop && Math.hypot(t.x - p.pos.x, t.z - p.pos.z) < 2.2) {
      if (p.skills.includes('rattle') && p.skill !== 'rattle') p.setSkill('rattle');
      setStick(0, 0);
      inp.press('skill');
      return;
    }
    if (e && (e.flying || e.y > 1.5) && p.skills.includes('bow') && p.skill !== 'bow') p.setSkill('bow');
    const dx = t.x - p.pos.x, dz = t.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    const tgt = e || prop;
    if (tgt && (e?.flying || e?.y > 1.5) && p.skill === 'bow') { setStick(0, 0); inp.press('skill'); return; }
    if (tgt && d < 2.3 + tgt.radius) { setStick(0, 0); inp.press('attack'); if (p.skill && Math.random() < 0.15) inp.press('skill'); }
    else setStick(dx / d, -dz / d);
  }, 90);
}
