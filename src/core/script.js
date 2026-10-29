// 스테이지 스크립트용 비동기 대기 도구.
// 스테이지가 바뀌면 resetScripts()로 대기 목록을 비워서 이전 스크립트가 다시 깨어나지 않게 한다.
import { G } from './context.js';

let waits = [];
let realWaits = [];
let conds = [];

export function wait(sec) {
  return new Promise((r) => waits.push({ t: G.time + sec, r }));
}

export function waitReal(sec) {
  return new Promise((r) => realWaits.push({ t: G.realTime + sec, r }));
}

export function until(fn) {
  return new Promise((r) => conds.push({ fn, r }));
}

export function nextFrame() {
  return until(() => true);
}

export function tickScripts() {
  if (waits.length) {
    const ready = waits.filter((w) => G.time >= w.t);
    if (ready.length) {
      waits = waits.filter((w) => G.time < w.t);
      ready.forEach((w) => w.r());
    }
  }
  if (realWaits.length) {
    const ready = realWaits.filter((w) => G.realTime >= w.t);
    if (ready.length) {
      realWaits = realWaits.filter((w) => G.realTime < w.t);
      ready.forEach((w) => w.r());
    }
  }
  if (conds.length) {
    const keep = [];
    const ready = [];
    for (const c of conds) {
      let ok = false;
      try { ok = c.fn(); } catch (e) { console.error(e); ok = true; }
      (ok ? ready : keep).push(c);
    }
    conds = keep;
    ready.forEach((c) => c.r());
  }
}

export function resetScripts() {
  waits = [];
  realWaits = [];
  conds = [];
}
