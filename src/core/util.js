export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const sign = (v) => (v < 0 ? -1 : 1);

// 프레임 독립적 감쇠 보간
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function dampAngle(a, b, lambda, dt) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export function angleDiff(a, b) {
  return ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t) =>
  t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function distXZ(a, b) {
  return dist2(a.x, a.z, b.x, b.z);
}

export function dirXZ(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, z: dz / l };
}

// 선분 (ax,az)-(bx,bz) 와 점 사이 거리
export function distToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const l2 = abx * abx + abz * abz || 1;
  const t = clamp(((px - ax) * abx + (pz - az) * abz) / l2, 0, 1);
  return dist2(px, pz, ax + abx * t, az + abz * t);
}

// 시드 랜덤 (꾸미기 배치가 매번 같도록)
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// 2D 값 노이즈 (지형 색 얼룩용)
export function noise2(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = noise2(ix, iy), b = noise2(ix + 1, iy), c = noise2(ix, iy + 1), d = noise2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

export function shadeHex(hex, amt) {
  // amt: -1(검정) ~ 1(흰색)
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  if (amt >= 0) {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  } else {
    r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
  }
  const h = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

export function formatNum(n) {
  return Math.round(n).toLocaleString('ko-KR');
}
