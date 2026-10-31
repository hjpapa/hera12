// 전역 게임 컨텍스트. 모든 모듈이 G 하나를 통해 시스템에 접근한다.
export const G = {
  renderer: null,
  scene: null,
  camera: null,
  rig: null, // CameraRig
  input: null,
  audio: null,
  ui: null,
  save: null,
  sprites: null,
  fx: null,
  game: null, // Game (스테이지 관리)
  stage: null,
  world: null,
  player: null,

  time: 0, // 게임 시간 (일시정지/히트스톱 중 멈춤)
  realTime: 0, // 실제 시간
  dt: 0,
  rawDt: 0,
  timeScale: 1,
  hitstop: 0,
  assist: false, // 도움 모드 (스테이지마다 다시 정함)
  paused: false,
  pauseReasons: new Set(),

  params: new URLSearchParams(location.search),
  isTouch: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
  debug: {},
};

export function pause(reason) {
  G.pauseReasons.add(reason);
  G.paused = true;
}

export function resume(reason) {
  G.pauseReasons.delete(reason);
  G.paused = G.pauseReasons.size > 0;
}

export function hitstop(sec) {
  G.hitstop = Math.max(G.hitstop, sec);
}
