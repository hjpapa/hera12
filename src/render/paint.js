// 임시 그림(플레이스홀더) 화가.
// Codex가 public/assets/sprites/*.png 를 넣기 전까지 코드로 귀여운 종이 인형 캐릭터를 그린다.
// 좌표계: 각 그림은 정규화된 상자(사람 256x256, 네발짐승 320x256 등) 위에서 그리고 실제 캔버스 크기로 확대한다.
import { shadeHex } from '../core/util.js';

const OUT = '#3a2618';
const TAU = Math.PI * 2;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.lineJoin = 'round';
  x.lineCap = 'round';
  return [c, x];
}

// ───────── 기본 도형 (외곽선 먼저 → 채우기: 바깥쪽 외곽선만 남음) ─────────
function shape(x, path, fill, lw = 7, stroke = OUT) {
  x.beginPath();
  path();
  if (lw > 0) {
    x.lineWidth = lw;
    x.strokeStyle = stroke;
    x.stroke();
  }
  if (fill) {
    x.fillStyle = fill;
    x.fill();
  }
}
const circ = (x, cx, cy, r, fill, lw = 7) => shape(x, () => x.arc(cx, cy, r, 0, TAU), fill, lw);
const ell = (x, cx, cy, rx, ry, fill, lw = 7, rot = 0) => shape(x, () => x.ellipse(cx, cy, rx, ry, rot, 0, TAU), fill, lw);
const rr = (x, x0, y0, w, h, r, fill, lw = 7) => shape(x, () => x.roundRect(x0, y0, w, h, r), fill, lw);
function poly(x, pts, fill, lw = 7) {
  shape(x, () => {
    x.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
  }, fill, lw);
}
function shine(x, cx, cy, rx, ry, a = 0.35) {
  x.save();
  x.globalAlpha = a;
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, -0.5, 0, TAU);
  x.fill();
  x.restore();
}
function line(x, pts, w = 7, color = OUT) {
  x.beginPath();
  x.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
  x.lineWidth = w;
  x.strokeStyle = color;
  x.stroke();
}
function curve(x, x0, y0, cx, cy, x1, y1, w = 7, color = OUT) {
  x.beginPath();
  x.moveTo(x0, y0);
  x.quadraticCurveTo(cx, cy, x1, y1);
  x.lineWidth = w;
  x.strokeStyle = color;
  x.stroke();
}
function star(x, cx, cy, r1, r2, n, fill, lw = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i / (n * 2)) * TAU;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  poly(x, pts, fill, lw);
}

// ───────── 얼굴 ─────────
function eyes(x, cx, cy, gap, style = 'normal', size = 1, look = 2) {
  const lx = cx - gap, rx = cx + gap;
  const s = size;
  switch (style) {
    case 'happy':
      [lx, rx].forEach((ex) => curve(x, ex - 9 * s, cy + 3, ex, cy - 9 * s, ex + 9 * s, cy + 3, 6 * s));
      return;
    case 'closed':
      [lx, rx].forEach((ex) => curve(x, ex - 9 * s, cy, ex, cy + 7 * s, ex + 9 * s, cy, 5 * s));
      return;
    case 'glow':
      [lx, rx].forEach((ex) => {
        x.save();
        x.shadowColor = '#ffe86a';
        x.shadowBlur = 14;
        ell(x, ex, cy, 8 * s, 6 * s, '#ffe86a', 0);
        x.restore();
      });
      return;
    case 'dizzy':
      [lx, rx].forEach((ex) => {
        x.beginPath();
        for (let a = 0; a < TAU * 2; a += 0.3) {
          const r = 1 + a * 1.6 * s;
          x.lineTo(ex + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        x.lineWidth = 3.5;
        x.strokeStyle = OUT;
        x.stroke();
      });
      return;
    case 'small':
      [lx, rx].forEach((ex) => ell(x, ex + look * 0.5, cy, 4.5 * s, 6 * s, '#2a1a10', 0));
      return;
  }
  const red = style === 'angry' || style === 'red';
  [lx, rx].forEach((ex) => {
    ell(x, ex + look * 0.5, cy, 8.5 * s, 11 * s, red ? '#8a1010' : '#2a1a10', 0);
    if (red) ell(x, ex + look * 0.5, cy + 1, 4 * s, 5 * s, '#ff4030', 0);
    circ(x, ex + look * 0.5 + 2.5 * s, cy - 4 * s, 3.4 * s, '#ffffff', 0);
    circ(x, ex + look * 0.5 - 2.5 * s, cy + 4 * s, 1.6 * s, '#ffffff', 0);
  });
  if (style === 'angry') {
    line(x, [lx - 12 * s, cy - 16 * s, lx + 8 * s, cy - 10 * s], 6 * s);
    line(x, [rx + 12 * s, cy - 16 * s, rx - 8 * s, cy - 10 * s], 6 * s);
  }
  if (style === 'worried') {
    line(x, [lx - 10 * s, cy - 12 * s, lx + 8 * s, cy - 17 * s], 5 * s);
    line(x, [rx + 10 * s, cy - 12 * s, rx - 8 * s, cy - 17 * s], 5 * s);
  }
}

function mouth(x, cx, cy, style = 'smile', s = 1) {
  switch (style) {
    case 'grin':
      shape(x, () => { x.moveTo(cx - 12 * s, cy - 2); x.quadraticCurveTo(cx, cy + 16 * s, cx + 12 * s, cy - 2); x.closePath(); }, '#b8433a', 4);
      break;
    case 'o':
      ell(x, cx, cy + 2, 5 * s, 6 * s, '#b8433a', 4);
      break;
    case 'frown':
      curve(x, cx - 8 * s, cy + 5, cx, cy - 3, cx + 8 * s, cy + 5, 4.5 * s);
      break;
    case 'flat':
      line(x, [cx - 7 * s, cy + 2, cx + 7 * s, cy + 2], 4.5 * s);
      break;
    case 'fang':
      curve(x, cx - 10 * s, cy, cx, cy + 8 * s, cx + 10 * s, cy, 4.5 * s);
      poly(x, [cx - 6 * s, cy + 3, cx - 3 * s, cy + 10 * s, cx - 1 * s, cy + 4], '#ffffff', 2);
      poly(x, [cx + 6 * s, cy + 3, cx + 3 * s, cy + 10 * s, cx + 1 * s, cy + 4], '#ffffff', 2);
      break;
    case 'smirk':
      curve(x, cx - 8 * s, cy + 2, cx + 2, cy + 7 * s, cx + 10 * s, cy - 3, 4.5 * s);
      break;
    default:
      curve(x, cx - 8 * s, cy, cx, cy + 8 * s, cx + 8 * s, cy, 4.5 * s);
  }
}

function blush(x, cx, cy, gap, s = 1) {
  x.save();
  x.globalAlpha = 0.45;
  ell(x, cx - gap, cy, 9 * s, 5.5 * s, '#ff8a8a', 0);
  ell(x, cx + gap, cy, 9 * s, 5.5 * s, '#ff8a8a', 0);
  x.restore();
}

// ───────── 사람형 (2~2.5등신 치비) ─────────
// o: { skin, hair, hairStyle, tunic, trim, belt, cape, robe, beard, eyes, mouth, acc[], held, build, armsUp, legs }
export function humanoid(o) {
  const W = o.w || 256, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 256, H / 256);
  const build = o.build || 'normal';
  const skin = o.skin || '#f7c9a0';
  const hair = o.hair || '#5a3a22';
  const tunic = o.tunic || '#f2ede0';
  const trim = o.trim || '#d4a23a';
  let headY = 92, headR = 60, shoulderY = 142, hemY = 212, bodyHalf = 34, hemHalf = 42, legTop = 200, footY = 246;
  if (build === 'baby') { headY = 120; headR = 70; shoulderY = 180; hemY = 228; bodyHalf = 30; hemHalf = 36; legTop = 220; }
  if (build === 'kid') { headY = 104; headR = 58; shoulderY = 156; hemY = 214; bodyHalf = 28; hemHalf = 36; legTop = 206; }
  if (build === 'big') { headY = 86; headR = 56; shoulderY = 138; bodyHalf = 44; hemHalf = 46; }
  if (build === 'giant') { headY = 66; headR = 44; shoulderY = 112; hemY = 200; bodyHalf = 60; hemHalf = 56; legTop = 192; }
  if (build === 'old') { headY = 96; headR = 56; shoulderY = 144; bodyHalf = 32; }
  const cx = 128;
  const acc = o.acc || [];

  // 뒤쪽 소품
  if (acc.includes('peacock')) {
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.32;
      const px = cx + Math.cos(a) * (headR + 34), py = headY + Math.sin(a) * (headR + 34);
      line(x, [cx, headY, px, py], 5, '#2c6e49');
      ell(x, px, py, 14, 18, '#2d8f8a', 4, a + Math.PI / 2);
      ell(x, px, py, 6, 8, '#1d3c8f', 0, a + Math.PI / 2);
      circ(x, px, py, 3, '#f5c542', 0);
    }
  }
  if (o.wings) {
    ell(x, cx - 70, shoulderY + 10, 40, 22, '#ffffff', 6, -0.6);
    ell(x, cx + 70, shoulderY + 10, 40, 22, '#ffffff', 6, 0.6);
  }
  if (o.cape) {
    poly(x, [cx - bodyHalf - 4, shoulderY, cx + bodyHalf + 4, shoulderY, cx + hemHalf + 16, footY - 10, cx - hemHalf - 16, footY - 10], o.cape, 7);
  }
  if (o.hairStyle === 'long' || o.hairStyle === 'longbun') {
    rr(x, cx - headR - 4, headY - 10, (headR + 4) * 2, headR + 60, 40, hair, 7);
  }
  if (o.hood === 'lion') {
    // 사자 갈기 (머리 뒤)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      circ(x, cx + Math.cos(a) * (headR + 6), headY - 4 + Math.sin(a) * (headR + 4), 22, '#c98a2a', 6);
    }
    poly(x, [cx - bodyHalf - 6, shoulderY - 6, cx + bodyHalf + 6, shoulderY - 6, cx + bodyHalf + 24, footY - 16, cx - bodyHalf - 24, footY - 16], '#e0a640', 7);
  }
  if (o.hood === 'dark') {
    poly(x, [cx - headR - 10, headY + 10, cx, headY - headR - 30, cx + headR + 10, headY + 10, cx + hemHalf + 20, footY - 4, cx - hemHalf - 20, footY - 4], o.hoodColor || '#3d3355', 7);
  }

  // 다리
  if (!o.robe) {
    const legW = build === 'giant' ? 34 : build === 'big' ? 24 : 20;
    const gap = build === 'giant' ? 26 : 16;
    rr(x, cx - gap - legW, legTop, legW, footY - legTop - 4, 9, o.legs || skin, 6);
    rr(x, cx + gap, legTop, legW, footY - legTop - 4, 9, o.legs || skin, 6);
    rr(x, cx - gap - legW - 4, footY - 14, legW + 10, 14, 6, o.shoe || '#8a5a2b', 5);
    rr(x, cx + gap - 2, footY - 14, legW + 10, 14, 6, o.shoe || '#8a5a2b', 5);
  }

  // 몸통
  const torso = () => {
    x.moveTo(cx - bodyHalf, shoulderY);
    x.quadraticCurveTo(cx, shoulderY - 10, cx + bodyHalf, shoulderY);
    if (o.robe) {
      x.lineTo(cx + hemHalf + 10, footY - 4);
      x.quadraticCurveTo(cx, footY + 6, cx - hemHalf - 10, footY - 4);
    } else {
      x.lineTo(cx + hemHalf, hemY);
      x.quadraticCurveTo(cx, hemY + 12, cx - hemHalf, hemY);
    }
    x.closePath();
  };
  shape(x, torso, tunic, 7);
  shine(x, cx - bodyHalf * 0.4, shoulderY + 22, 10, 16, 0.25);
  // 한쪽 어깨 끈 (그리스 키톤)
  line(x, [cx - bodyHalf + 6, shoulderY + 2, cx + 10, shoulderY + 40], 6, trim);
  if (o.robe) {
    line(x, [cx - hemHalf - 6, footY - 14, cx + hemHalf + 6, footY - 14], 7, trim);
  } else {
    line(x, [cx - hemHalf + 3, hemY - 6, cx + hemHalf - 3, hemY - 6], 6, trim);
  }
  if (o.armor) {
    rr(x, cx - bodyHalf + 2, shoulderY + 4, bodyHalf * 2 - 4, 40, 12, o.armor, 6);
    shine(x, cx - 12, shoulderY + 16, 10, 6, 0.4);
  }
  if (o.belt !== false) {
    rr(x, cx - bodyHalf - 3, shoulderY + 38, (bodyHalf + 3) * 2, 12, 5, o.belt || '#8a5a2b', 5);
    if (o.beltGem) circ(x, cx, shoulderY + 44, 7, o.beltGem, 4);
  }
  if (o.chains) {
    for (let i = 0; i < 6; i++) ell(x, cx - 40 + i * 16, shoulderY + 28, 8, 5, '#9aa0a8', 4);
  }

  // 팔
  const armW = build === 'big' || build === 'giant' ? 18 : 13;
  const armL = build === 'giant' ? 40 : 30;
  if (o.armsUp) {
    ell(x, cx - bodyHalf - 6, shoulderY - 30, armW, armL + 6, skin, 6, 0.25);
    ell(x, cx + bodyHalf + 6, shoulderY - 30, armW, armL + 6, skin, 6, -0.25);
    circ(x, cx - bodyHalf - 14, shoulderY - 64, armW, skin, 6);
    circ(x, cx + bodyHalf + 14, shoulderY - 64, armW, skin, 6);
  } else {
    ell(x, cx - bodyHalf - 6, shoulderY + 26, armW, armL, skin, 6, 0.18);
    ell(x, cx + bodyHalf + 6, shoulderY + 26, armW, armL, skin, 6, -0.18);
    if (build === 'big') {
      // 근육 표시
      curve(x, cx - bodyHalf - 14, shoulderY + 18, cx - bodyHalf - 6, shoulderY + 10, cx - bodyHalf + 2, shoulderY + 18, 3);
      curve(x, cx + bodyHalf - 2, shoulderY + 18, cx + bodyHalf + 6, shoulderY + 10, cx + bodyHalf + 14, shoulderY + 18, 3);
    }
  }
  if (o.extraArms) {
    ell(x, cx - bodyHalf - 18, shoulderY + 6, armW, armL, skin, 6, 0.9);
    ell(x, cx + bodyHalf + 18, shoulderY + 6, armW, armL, skin, 6, -0.9);
  }

  // 손에 든 것 (몸 앞)
  if (o.held) drawHeld(x, o.held, cx + bodyHalf + 10, shoulderY + 48, o);
  if (o.shield) {
    circ(x, cx - bodyHalf - 8, shoulderY + 40, 30, o.shield, 7);
    circ(x, cx - bodyHalf - 8, shoulderY + 40, 14, shadeHex(o.shield, -0.25), 4);
    shine(x, cx - bodyHalf - 18, shoulderY + 28, 9, 6, 0.4);
  }

  // 머리
  const heads = o.heads || [0];
  heads.forEach((offset) => {
    const hx = cx + offset * (headR * 1.25);
    const hy = headY + Math.abs(offset) * 10;
    drawHead(x, hx, hy, headR * (offset ? 0.9 : 1), o, skin, hair, acc);
  });
  return c;
}

function drawHead(x, cx, headY, headR, o, skin, hair, acc) {
  // 귀
  circ(x, cx - headR + 2, headY + 6, 12, skin, 6);
  circ(x, cx + headR - 2, headY + 6, 12, skin, 6);
  if (o.hood === 'dark') {
    // 어두운 후드 속 얼굴
    circ(x, cx, headY + 4, headR, '#1a1424', 7);
    eyes(x, cx, headY + 4, 20, 'glow', 1);
    return;
  }
  circ(x, cx, headY, headR, skin, 7);
  shine(x, cx - headR * 0.45, headY - headR * 0.45, headR * 0.22, headR * 0.14, 0.35);
  const ey = headY + 6;
  const style = o.hairStyle || 'short';
  // 수염 (얼굴 아래)
  if (o.beard) {
    const long = o.beardLong;
    shape(x, () => {
      x.moveTo(cx - headR + 8, headY + 6);
      x.quadraticCurveTo(cx - headR + 4, headY + headR + (long ? 50 : 22), cx, headY + headR + (long ? 62 : 30));
      x.quadraticCurveTo(cx + headR - 4, headY + headR + (long ? 50 : 22), cx + headR - 8, headY + 6);
      x.quadraticCurveTo(cx, headY + 40, cx - headR + 8, headY + 6);
    }, o.beard, 7);
    if (long) for (let i = -2; i <= 2; i++) curve(x, cx + i * 12, headY + 50, cx + i * 14, headY + 70, cx + i * 12, headY + 88, 3, shadeHex(o.beard, -0.25));
  }
  // 얼굴
  if (o.face !== false) {
    eyes(x, cx, ey, headR * 0.36, o.eyes || 'normal', headR / 60);
    if (o.blush !== false) blush(x, cx, ey + 20, headR * 0.5, headR / 60);
    if (!o.beard || !o.beardLong) mouth(x, cx + 2, ey + 22, o.mouth || 'smile', headR / 60);
    else mouth(x, cx + 2, ey + 24, o.mouth || 'smile', headR / 60);
    if (o.wrinkles) {
      curve(x, cx - headR * 0.6, ey - 18, cx - headR * 0.36, ey - 22, cx - headR * 0.12, ey - 18, 3);
      curve(x, cx + headR * 0.12, ey - 18, cx + headR * 0.36, ey - 22, cx + headR * 0.6, ey - 18, 3);
    }
  }
  // 머리카락
  if (o.hood === 'lion') {
    // 사자 머리를 모자처럼 씀
    shape(x, () => { x.arc(cx, headY - 8, headR + 4, Math.PI * 1.05, Math.PI * 1.95); x.quadraticCurveTo(cx, headY - 34, cx - headR - 2, headY - 14); }, '#e0a640', 7);
    circ(x, cx - headR * 0.62, headY - headR * 0.82, 14, '#e0a640', 6);
    circ(x, cx + headR * 0.62, headY - headR * 0.82, 14, '#e0a640', 6);
    circ(x, cx - headR * 0.62, headY - headR * 0.82, 6, '#b5651d', 0);
    circ(x, cx + headR * 0.62, headY - headR * 0.82, 6, '#b5651d', 0);
    ell(x, cx - 14, headY - headR * 0.62, 6, 4, '#3a2618', 0);
    ell(x, cx + 14, headY - headR * 0.62, 6, 4, '#3a2618', 0);
    ell(x, cx, headY - headR * 0.4, 12, 8, '#f3d9a0', 4);
    poly(x, [cx - 5, headY - headR * 0.46, cx + 5, headY - headR * 0.46, cx, headY - headR * 0.38], '#3a2618', 0);
  } else if (style === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.0 + i / 8);
      circ(x, cx + Math.cos(a) * headR * 0.92, headY - 6 + Math.sin(a) * headR * 0.88, 19, hair, 6);
    }
    circ(x, cx - headR * 0.35, headY - headR * 0.72, 18, hair, 0);
    circ(x, cx + headR * 0.2, headY - headR * 0.78, 18, hair, 0);
  } else if (style === 'short' || style === 'long' || style === 'longbun' || style === 'bun') {
    shape(x, () => {
      x.arc(cx, headY - 4, headR + 3, Math.PI * 1.02, Math.PI * 1.98);
      x.quadraticCurveTo(cx + headR * 0.5, headY - headR * 0.35, cx + 8, headY - headR * 0.5);
      x.quadraticCurveTo(cx - headR * 0.4, headY - headR * 0.3, cx - headR - 2, headY - 2);
    }, hair, 7);
    if (style === 'bun' || style === 'longbun') circ(x, cx, headY - headR - 14, 22, hair, 6);
    if (style === 'long' || style === 'longbun') {
      rr(x, cx - headR - 8, headY - 10, 22, headR + 40, 11, hair, 6);
      rr(x, cx + headR - 14, headY - 10, 22, headR + 40, 11, hair, 6);
    }
  } else if (style === 'spiky') {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (1.0 + i / 8);
      const r = i % 2 ? headR + 20 : headR + 2;
      pts.push(cx + Math.cos(a) * r, headY - 4 + Math.sin(a) * r);
    }
    pts.push(cx + headR * 0.6, headY - headR * 0.45, cx - headR * 0.6, headY - headR * 0.45);
    poly(x, pts, hair, 7);
  } else if (style === 'bald') {
    curve(x, cx - 12, headY - headR + 4, cx, headY - headR - 10, cx + 10, headY - headR + 4, 4, hair);
  }

  // 머리 장식
  if (acc.includes('headband')) {
    line(x, [cx - headR + 4, headY - headR * 0.42, cx + headR - 4, headY - headR * 0.42], 9, '#d43c3c');
    line(x, [cx + headR - 6, headY - headR * 0.42, cx + headR + 16, headY - headR * 0.2], 7, '#d43c3c');
  }
  if (acc.includes('crown')) {
    poly(x, [cx - 34, headY - headR + 6, cx - 34, headY - headR - 22, cx - 18, headY - headR - 6, cx, headY - headR - 30, cx + 18, headY - headR - 6, cx + 34, headY - headR - 22, cx + 34, headY - headR + 6], '#f5c542', 6);
    circ(x, cx, headY - headR - 4, 5, '#d43c3c', 3);
  }
  if (acc.includes('dark_crown')) {
    poly(x, [cx - 36, headY - headR + 8, cx - 30, headY - headR - 26, cx - 14, headY - headR - 4, cx, headY - headR - 36, cx + 14, headY - headR - 4, cx + 30, headY - headR - 26, cx + 36, headY - headR + 8], '#3b2a5a', 6);
    circ(x, cx, headY - headR - 2, 5, '#7cf0ff', 3);
  }
  if (acc.includes('laurel')) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.08 + i * 0.12);
      ell(x, cx + Math.cos(a) * (headR + 2), headY - 6 + Math.sin(a) * (headR + 2), 10, 5, '#6fa83c', 3, a + 1.2);
      const b = Math.PI * (1.92 - i * 0.12);
      ell(x, cx + Math.cos(b) * (headR + 2), headY - 6 + Math.sin(b) * (headR + 2), 10, 5, '#6fa83c', 3, b - 1.2);
    }
  }
  if (acc.includes('flower')) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.1 + i * 0.16);
      const fx = cx + Math.cos(a) * (headR + 2), fy = headY - 6 + Math.sin(a) * (headR + 2);
      circ(x, fx, fy, 9, ['#ff8fb4', '#ffd84a', '#ffffff'][i % 3], 4);
      circ(x, fx, fy, 3, '#f5a742', 0);
    }
  }
  if (acc.includes('tiara_moon')) {
    shape(x, () => { x.arc(cx, headY - headR * 0.62, 14, Math.PI * 0.15, Math.PI * 1.85, false); x.arc(cx + 6, headY - headR * 0.62, 11, Math.PI * 1.8, Math.PI * 0.2, true); }, '#e8eef8', 4);
  }
  if (acc.includes('winged_hat')) {
    ell(x, cx, headY - headR + 6, headR + 16, 14, '#c9a46a', 6);
    shape(x, () => x.arc(cx, headY - headR + 4, headR * 0.7, Math.PI, 0), '#c9a46a', 6);
    ell(x, cx - headR - 6, headY - headR - 8, 20, 9, '#ffffff', 5, -0.6);
    ell(x, cx + headR + 6, headY - headR - 8, 20, 9, '#ffffff', 5, 0.6);
  }
  if (acc.includes('helmet')) {
    shape(x, () => { x.arc(cx, headY - 4, headR + 4, Math.PI * 1.0, Math.PI * 2.0); x.lineTo(cx + headR + 4, headY + 2); x.lineTo(cx - headR - 4, headY + 2); }, o.helmetColor || '#c99a3a', 7);
    rr(x, cx - 8, headY - headR - 40, 16, 44, 8, o.crest || '#d43c3c', 5);
    shape(x, () => { x.moveTo(cx - 8, headY - headR - 34); x.quadraticCurveTo(cx - 60, headY - headR - 50, cx - 70, headY - headR + 6); x.lineTo(cx - 8, headY - headR - 10); }, o.crest || '#d43c3c', 5);
  }
  if (acc.includes('veil')) {
    shape(x, () => { x.arc(cx, headY - 10, headR + 8, Math.PI * 1.05, Math.PI * 1.95); x.lineTo(cx + headR + 14, headY + 40); x.lineTo(cx + headR, headY + 40); x.lineTo(cx + headR - 2, headY - 10); x.lineTo(cx - headR + 2, headY - 10); x.lineTo(cx - headR, headY + 40); x.lineTo(cx - headR - 14, headY + 40); x.closePath(); }, o.veil || '#f2e8ff', 5);
  }
  if (acc.includes('sweat')) {
    shape(x, () => { x.moveTo(cx + headR - 6, headY - 30); x.quadraticCurveTo(cx + headR + 6, headY - 14, cx + headR - 6, headY - 10); x.quadraticCurveTo(cx + headR - 16, headY - 14, cx + headR - 6, headY - 30); }, '#8fd4ff', 3);
  }
}

function drawHeld(x, held, hx, hy, o) {
  switch (held) {
    case 'staff':
      line(x, [hx, hy - 110, hx, hy + 70], 9, '#8a5a2b');
      line(x, [hx, hy - 110, hx, hy + 70], 4, '#b07a42');
      curve(x, hx, hy - 110, hx + 18, hy - 128, hx + 4, hy - 140, 8, '#8a5a2b');
      break;
    case 'spear':
      line(x, [hx, hy - 120, hx, hy + 70], 8, '#8a5a2b');
      poly(x, [hx - 10, hy - 116, hx, hy - 150, hx + 10, hy - 116], '#cfd6dd', 5);
      break;
    case 'bident':
      line(x, [hx, hy - 110, hx, hy + 70], 8, '#3b2a5a');
      poly(x, [hx - 18, hy - 110, hx - 14, hy - 146, hx - 8, hy - 110], '#7c6aa0', 4);
      poly(x, [hx + 8, hy - 110, hx + 14, hy - 146, hx + 18, hy - 110], '#7c6aa0', 4);
      line(x, [hx - 18, hy - 108, hx + 18, hy - 108], 7, '#3b2a5a');
      break;
    case 'lightning':
      poly(x, [hx - 6, hy - 120, hx + 22, hy - 120, hx + 4, hy - 80, hx + 22, hy - 80, hx - 14, hy - 20, hx - 2, hy - 64, hx - 18, hy - 64], '#ffe24a', 5);
      break;
    case 'torch':
      line(x, [hx, hy - 50, hx, hy + 30], 9, '#8a5a2b');
      shape(x, () => { x.moveTo(hx - 14, hy - 50); x.quadraticCurveTo(hx - 16, hy - 80, hx, hy - 96); x.quadraticCurveTo(hx + 16, hy - 80, hx + 14, hy - 50); x.closePath(); }, '#ff8a2a', 5);
      shape(x, () => { x.moveTo(hx - 7, hy - 52); x.quadraticCurveTo(hx - 8, hy - 70, hx, hy - 80); x.quadraticCurveTo(hx + 8, hy - 70, hx + 7, hy - 52); x.closePath(); }, '#ffe24a', 0);
      break;
    case 'lantern':
      line(x, [hx, hy - 30, hx, hy - 6], 5, OUT);
      rr(x, hx - 14, hy - 6, 28, 34, 8, '#ffe28a', 5);
      x.save();
      x.globalAlpha = 0.35;
      circ(x, hx, hy + 10, 30, '#fff3a0', 0);
      x.restore();
      break;
    case 'oar':
      line(x, [hx - 10, hy - 100, hx + 10, hy + 60], 9, '#6b4a2b');
      ell(x, hx + 12, hy + 70, 12, 28, '#6b4a2b', 6, -0.12);
      break;
    case 'caduceus':
      line(x, [hx, hy - 100, hx, hy + 60], 7, '#f5c542');
      circ(x, hx, hy - 104, 8, '#f5c542', 4);
      curve(x, hx - 12, hy - 80, hx + 16, hy - 60, hx - 12, hy - 40, 4, '#5aa05a');
      curve(x, hx + 12, hy - 80, hx - 16, hy - 60, hx + 12, hy - 40, 4, '#5aa05a');
      break;
    case 'bow':
      shape(x, () => { x.arc(hx - 6, hy - 20, 50, -1.1, 1.1); }, null, 8);
      shape(x, () => { x.arc(hx - 6, hy - 20, 50, -1.1, 1.1); }, null, 4, '#b07a42');
      line(x, [hx - 6 + Math.cos(-1.1) * 50, hy - 20 + Math.sin(-1.1) * 50, hx - 6 + Math.cos(1.1) * 50, hy - 20 + Math.sin(1.1) * 50], 2, '#f2ede0');
      break;
    case 'scroll':
      rr(x, hx - 16, hy - 20, 30, 40, 6, '#f3e3b8', 5);
      break;
    case 'shovel':
      line(x, [hx, hy - 80, hx, hy + 40], 8, '#8a5a2b');
      shape(x, () => { x.moveTo(hx - 16, hy + 36); x.lineTo(hx + 16, hy + 36); x.lineTo(hx + 12, hy + 70); x.quadraticCurveTo(hx, hy + 80, hx - 12, hy + 70); x.closePath(); }, '#9aa0a8', 5);
      break;
    case 'belt':
      rr(x, hx - 26, hy - 8, 52, 16, 7, '#d43c3c', 5);
      circ(x, hx, hy, 9, '#f5c542', 4);
      break;
    case 'apple':
      circ(x, hx, hy, 16, '#f5c542', 5);
      line(x, [hx, hy - 16, hx + 4, hy - 26], 4, '#6b4a2b');
      break;
    case 'flower':
      line(x, [hx, hy - 30, hx, hy + 20], 4, '#5aa05a');
      circ(x, hx, hy - 34, 11, '#ff8fb4', 4);
      circ(x, hx, hy - 34, 4, '#ffd84a', 0);
      break;
  }
}

// ───────── 네발짐승 (오른쪽을 봄) ─────────
// o: { type:'lion'|'deer'|'boar'|'bull'|'horse'|'dog'|'cow'|'wolf'|'goat', body, belly, mane, eyes, heads, tail, ... }
export function quadruped(o) {
  const W = o.w || 320, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 320, H / 256);
  const body = o.body || '#d9a441';
  const dark = shadeHex(body, -0.22);
  const belly = o.belly || shadeHex(body, 0.35);
  const t = o.type;
  const legLong = t === 'deer' || t === 'horse' ? 1.25 : t === 'boar' ? 0.8 : 1;
  const bx = 150, by = 150 - (legLong - 1) * 40, brx = o.bodyRx || 92, bry = o.bodyRy || 50;
  const legTop = by + 20, footY = 244;
  const hoof = o.hoof || (t === 'lion' || t === 'dog' || t === 'wolf' ? shadeHex(body, -0.1) : '#4a3424');

  // 꼬리
  if (o.tail === 'snake') {
    shape(x, () => { x.moveTo(bx - brx + 10, by - 10); x.bezierCurveTo(bx - brx - 50, by - 40, bx - brx - 20, by - 110, bx - brx - 60, by - 120); }, null, 16);
    shape(x, () => { x.moveTo(bx - brx + 10, by - 10); x.bezierCurveTo(bx - brx - 50, by - 40, bx - brx - 20, by - 110, bx - brx - 60, by - 120); }, null, 9, '#5aa05a');
    circ(x, bx - brx - 62, by - 124, 12, '#5aa05a', 5);
    circ(x, bx - brx - 58, by - 128, 3, '#ffe24a', 0);
  } else if (t === 'horse') {
    shape(x, () => { x.moveTo(bx - brx + 6, by - 20); x.quadraticCurveTo(bx - brx - 50, by - 10, bx - brx - 34, by + 70); x.quadraticCurveTo(bx - brx - 10, by + 30, bx - brx + 10, by); }, o.mane || dark, 6);
  } else {
    curve(x, bx - brx + 8, by - 14, bx - brx - 30, by - 30, bx - brx - 34, by - 70, 8, OUT);
    curve(x, bx - brx + 8, by - 14, bx - brx - 30, by - 30, bx - brx - 34, by - 70, 4, body);
    if (t === 'lion' || t === 'cow' || t === 'bull') circ(x, bx - brx - 34, by - 74, 12, o.mane || dark, 5);
  }
  // 뒷다리 (뒤쪽, 어둡게)
  const legW = t === 'deer' ? 16 : t === 'boar' ? 22 : 24;
  [[bx - brx * 0.55 + 18, 0], [bx + brx * 0.55 + 10, 0]].forEach(([lx]) => {
    rr(x, lx, legTop, legW, footY - legTop, 10, dark, 6);
  });
  // 몸통
  ell(x, bx, by, brx, bry, body, 7);
  shape(x, () => x.ellipse(bx + 6, by + bry * 0.45, brx * 0.7, bry * 0.4, 0, 0, Math.PI), belly, 0);
  shine(x, bx - brx * 0.3, by - bry * 0.45, 26, 10, 0.3);
  if (o.spots) {
    [[bx - 30, by - 10, 18], [bx + 30, by + 4, 14], [bx - 4, by - 26, 10]].forEach(([sx, sy, r]) => ell(x, sx, sy, r, r * 0.8, o.spots, 0));
  }
  if (t === 'boar') {
    for (let i = 0; i < 9; i++) poly(x, [bx - 60 + i * 16, by - bry + 8, bx - 52 + i * 16, by - bry - 16, bx - 44 + i * 16, by - bry + 8], dark, 4);
  }
  if (o.saddle) rr(x, bx - 30, by - bry + 4, 60, 30, 8, o.saddle, 5);
  // 앞다리
  [[bx - brx * 0.55, 0], [bx + brx * 0.55 - 8, 0]].forEach(([lx]) => {
    rr(x, lx, legTop, legW, footY - legTop, 10, body, 6);
    rr(x, lx - 2, footY - 14, legW + 4, 14, 6, hoof, 5);
  });
  if (o.centaur) {
    // 켄타우로스: 앞쪽에 사람 상체
    const hx = bx + brx - 20;
    shape(x, () => { x.moveTo(hx - 26, by - 10); x.lineTo(hx - 22, by - 80); x.quadraticCurveTo(hx, by - 92, hx + 22, by - 80); x.lineTo(hx + 26, by - 10); x.closePath(); }, o.skin || '#f0bf92', 7);
    ell(x, hx - 30, by - 50, 11, 26, o.skin || '#f0bf92', 6, 0.25);
    ell(x, hx + 30, by - 50, 11, 26, o.skin || '#f0bf92', 6, -0.25);
    line(x, [hx - 22, by - 78, hx + 22, by - 40], 6, '#6fa83c');
    drawHead(x, hx, by - 126, 44, { hairStyle: 'curly', beard: o.beard || '#6b4a2b', eyes: 'normal', mouth: 'smile' }, o.skin || '#f0bf92', o.hair || '#6b4a2b', []);
    return c;
  }
  // 머리들
  const nHeads = o.heads || 1;
  const headPos = [];
  if (nHeads === 1) headPos.push([bx + brx - 6, by - bry - 10, 1]);
  else if (nHeads === 2) headPos.push([bx + brx - 34, by - bry - 30, 0.85], [bx + brx + 6, by - bry + 2, 0.85]);
  else headPos.push([bx + brx - 52, by - bry - 34, 0.78], [bx + brx - 6, by - bry - 44, 0.85], [bx + brx + 18, by - bry + 6, 0.78]);
  const headColors = o.headColors || [];
  headPos.forEach(([hx, hy, s], i) => {
    const eyeStyle = (o.eyesEach && o.eyesEach[i]) || o.eyes || 'normal';
    animalHead(x, t, hx, hy, s, { ...o, body: headColors[i] || body, eyesStyle: eyeStyle });
  });
  return c;
}

function animalHead(x, t, hx, hy, s, o) {
  const body = o.body;
  const dark = shadeHex(body, -0.22);
  const light = shadeHex(body, 0.4);
  x.save();
  x.translate(hx, hy);
  x.scale(s, s);
  const ey = o.eyesStyle;
  if (t === 'lion') {
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * TAU;
      circ(x, Math.cos(a) * 50, Math.sin(a) * 50, 24, o.mane || '#b5651d', 6);
    }
    circ(x, 0, 0, 50, body, 7);
    circ(x, -30, -36, 13, body, 6);
    circ(x, 30, -36, 13, body, 6);
    ell(x, 6, 20, 26, 18, light, 5);
    poly(x, [-2, 8, 14, 8, 6, 18], '#4a2a1a', 3);
    eyes(x, 4, -6, 18, ey, 0.95, 2);
    curve(x, -8, 30, 6, 38, 20, 30, 4);
    for (const d of [-1, 1]) line(x, [6 + d * 26, 20, 6 + d * 46, 16 + d * 0], 2.5, OUT);
  } else if (t === 'dog' || t === 'wolf') {
    poly(x, [-36, -20, -30, -70, -6, -36], t === 'wolf' ? dark : dark, 6);
    poly(x, [36, -20, 30, -70, 6, -36], dark, 6);
    circ(x, 0, 0, 46, body, 7);
    ell(x, 30, 18, 30, 20, light, 6);
    circ(x, 54, 12, 9, '#2a1a10', 4);
    eyes(x, 4, -6, 17, ey, 0.9, 3);
    if (ey === 'angry' || ey === 'red') mouth(x, 34, 28, 'fang', 0.9);
    else curve(x, 26, 30, 36, 38, 46, 30, 4);
    if (o.tongue) shape(x, () => { x.ellipse(36, 42, 7, 11, 0, 0, Math.PI); }, '#ff7a8a', 4);
  } else if (t === 'deer') {
    // 황금 뿔
    const ac = o.antlers || '#f5c542';
    line(x, [-14, -30, -30, -90], 9, OUT); line(x, [-14, -30, -30, -90], 5, ac);
    line(x, [-24, -66, -48, -78], 8, OUT); line(x, [-24, -66, -48, -78], 4, ac);
    line(x, [14, -30, 26, -94], 9, OUT); line(x, [14, -30, 26, -94], 5, ac);
    line(x, [20, -64, 44, -80], 8, OUT); line(x, [20, -64, 44, -80], 4, ac);
    ell(x, -36, -16, 18, 9, body, 5, -0.5);
    ell(x, 34, -18, 18, 9, body, 5, 0.5);
    ell(x, 6, 0, 34, 38, body, 7);
    ell(x, 22, 22, 18, 13, light, 5);
    circ(x, 36, 18, 6, '#2a1a10', 0);
    eyes(x, 4, -4, 14, ey, 0.85, 3);
  } else if (t === 'boar') {
    poly(x, [-34, -26, -30, -62, -8, -34], dark, 6);
    circ(x, 0, 0, 46, body, 7);
    ell(x, 40, 14, 20, 22, '#e8a0a0', 6);
    circ(x, 36, 10, 4, '#6b2a2a', 0); circ(x, 46, 10, 4, '#6b2a2a', 0);
    shape(x, () => { x.moveTo(24, 32); x.quadraticCurveTo(30, 60, 52, 52); x.quadraticCurveTo(36, 50, 34, 30); }, '#fffbe8', 5);
    eyes(x, -2, -10, 15, ey, 0.75, 3);
  } else if (t === 'bull' || t === 'cow') {
    const hc = o.horns || '#fffbe8';
    shape(x, () => { x.moveTo(-26, -30); x.quadraticCurveTo(-70, -40, -60, -86); x.quadraticCurveTo(-50, -56, -14, -40); }, hc, 6);
    shape(x, () => { x.moveTo(26, -30); x.quadraticCurveTo(70, -40, 60, -86); x.quadraticCurveTo(50, -56, 14, -40); }, hc, 6);
    ell(x, -46, -10, 18, 9, body, 5, 0.3);
    ell(x, 46, -10, 18, 9, body, 5, -0.3);
    ell(x, 0, 0, 44, 46, body, 7);
    rr(x, -30, 14, 60, 34, 16, light, 6);
    circ(x, -12, 30, 5, '#4a2a1a', 0); circ(x, 12, 30, 5, '#4a2a1a', 0);
    if (o.ring) shape(x, () => x.arc(0, 46, 10, 0, Math.PI), null, 5, '#f5c542');
    eyes(x, 0, -12, 18, ey, 0.85, 2);
  } else if (t === 'horse') {
    shape(x, () => { x.moveTo(-40, 40); x.quadraticCurveTo(-30, -50, 10, -50); x.lineTo(14, -30); x.quadraticCurveTo(-10, -20, -20, 50); }, o.mane || dark, 6);
    poly(x, [-6, -40, -2, -78, 14, -46], body, 6);
    ell(x, 6, 0, 36, 44, body, 7, -0.25);
    ell(x, 26, 32, 22, 18, light, 6, -0.25);
    circ(x, 34, 32, 4, '#4a2a1a', 0);
    eyes(x, 0, -10, 13, ey, 0.85, 3);
    shape(x, () => { x.moveTo(-34, 30); x.quadraticCurveTo(-36, -40, 4, -54); x.quadraticCurveTo(-14, -20, -16, 40); }, o.mane || dark, 0);
  } else if (t === 'goat') {
    shape(x, () => { x.moveTo(-14, -30); x.quadraticCurveTo(-50, -70, -24, -84); x.quadraticCurveTo(-32, -60, -4, -40); }, '#d9cdb0', 5);
    shape(x, () => { x.moveTo(14, -30); x.quadraticCurveTo(50, -70, 24, -84); x.quadraticCurveTo(32, -60, 4, -40); }, '#d9cdb0', 5);
    ell(x, 0, 0, 36, 40, body, 7);
    poly(x, [-6, 34, 6, 34, 0, 62], light, 5);
    eyes(x, 0, -6, 15, ey, 0.85, 2);
  }
  x.restore();
}

// ───────── 새 ─────────
export function bird(o) {
  const W = o.w || 256, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 256, H / 256);
  const body = o.body || '#b07a3a';
  const t = o.type || 'bird';
  if (t === 'owl') {
    ell(x, 128, 150, 70, 82, body, 7);
    ell(x, 128, 172, 46, 52, '#f3e3c0', 0);
    for (let i = 0; i < 3; i++) curve(x, 108, 158 + i * 16, 128, 166 + i * 16, 148, 158 + i * 16, 3, shadeHex(body, -0.2));
    ell(x, 62, 160, 22, 50, shadeHex(body, -0.15), 6, 0.2);
    ell(x, 194, 160, 22, 50, shadeHex(body, -0.15), 6, -0.2);
    poly(x, [80, 82, 70, 46, 104, 74], body, 6);
    poly(x, [176, 82, 186, 46, 152, 74], body, 6);
    circ(x, 102, 110, 26, '#ffffff', 6);
    circ(x, 154, 110, 26, '#ffffff', 6);
    circ(x, 104, 112, 13, '#2a1a10', 0);
    circ(x, 156, 112, 13, '#2a1a10', 0);
    circ(x, 108, 106, 5, '#ffffff', 0);
    circ(x, 160, 106, 5, '#ffffff', 0);
    poly(x, [120, 128, 136, 128, 128, 146], '#f5a742', 4);
    rr(x, 100, 226, 18, 12, 5, '#f5a742', 4);
    rr(x, 138, 226, 18, 12, 5, '#f5a742', 4);
    if (o.leaf) ell(x, 128, 60, 16, 7, '#6fa83c', 3, 0.3);
    return c;
  }
  if (t === 'bat') {
    shape(x, () => { x.moveTo(128, 120); x.quadraticCurveTo(70, 60, 16, 90); x.quadraticCurveTo(40, 110, 30, 140); x.quadraticCurveTo(60, 130, 70, 160); x.quadraticCurveTo(90, 140, 128, 150); }, '#4a3a6a', 6);
    shape(x, () => { x.moveTo(128, 120); x.quadraticCurveTo(186, 60, 240, 90); x.quadraticCurveTo(216, 110, 226, 140); x.quadraticCurveTo(196, 130, 186, 160); x.quadraticCurveTo(166, 140, 128, 150); }, '#4a3a6a', 6);
    poly(x, [104, 100, 100, 70, 118, 92], '#5a4a7a', 5);
    poly(x, [152, 100, 156, 70, 138, 92], '#5a4a7a', 5);
    circ(x, 128, 126, 32, '#5a4a7a', 6);
    eyes(x, 128, 122, 11, 'red', 0.7);
    mouth(x, 128, 136, 'fang', 0.7);
    return c;
  }
  if (t === 'fly') {
    x.save(); x.globalAlpha = 0.6;
    ell(x, 96, 92, 34, 22, '#d8f0ff', 5, -0.6);
    ell(x, 160, 92, 34, 22, '#d8f0ff', 5, 0.6);
    x.restore();
    ell(x, 128, 140, 40, 34, o.body || '#3a4a3a', 7);
    for (let i = 0; i < 3; i++) line(x, [100 + i * 20, 118, 100 + i * 20, 160], 4, '#6a8a4a');
    circ(x, 128, 104, 26, o.body || '#3a4a3a', 6);
    circ(x, 116, 100, 10, '#d02a2a', 4);
    circ(x, 140, 100, 10, '#d02a2a', 4);
    circ(x, 118, 97, 3, '#ffffff', 0);
    circ(x, 142, 97, 3, '#ffffff', 0);
    return c;
  }
  // 일반 새 / 독수리 / 스팀팔로스 새
  const wing = shadeHex(body, -0.18);
  const metal = o.metal;
  // 꼬리
  poly(x, [70, 150, 22, 130, 30, 160, 20, 186, 76, 172], wing, 6);
  // 뒷날개
  shape(x, () => { x.moveTo(120, 120); x.quadraticCurveTo(80, 30, 30, 40); x.quadraticCurveTo(60, 80, 70, 130); x.closePath(); }, shadeHex(wing, -0.15), 6);
  ell(x, 120, 150, 66, 50, body, 7);
  ell(x, 130, 170, 44, 26, o.belly || shadeHex(body, 0.35), 0);
  shine(x, 100, 126, 22, 10, metal ? 0.55 : 0.3);
  // 앞날개
  shape(x, () => { x.moveTo(110, 130); x.quadraticCurveTo(70, 60, 10, 74); x.quadraticCurveTo(50, 110, 40, 150); x.quadraticCurveTo(90, 170, 130, 150); x.closePath(); }, wing, 6);
  if (metal) for (let i = 0; i < 4; i++) line(x, [40 + i * 18, 92 + i * 12, 70 + i * 16, 150], 3, shadeHex(wing, 0.35));
  // 머리
  const hc = o.head || body;
  circ(x, 184, 104, 40, hc, 7);
  const beak = o.beak || '#f5a742';
  if (t === 'eagle') {
    shape(x, () => { x.moveTo(208, 96); x.quadraticCurveTo(256, 96, 244, 132); x.quadraticCurveTo(236, 116, 212, 120); x.closePath(); }, beak, 5);
  } else {
    poly(x, [212, 94, 252, 110, 212, 122], beak, 5);
  }
  eyes(x, 186, 98, 0, o.eyes || 'normal', 0.85, 3);
  if (o.crest) poly(x, [170, 70, 160, 34, 184, 64, 190, 30, 196, 66], o.crest, 5);
  // 다리
  line(x, [110, 196, 104, 236], 7, '#f5a742');
  line(x, [140, 196, 146, 236], 7, '#f5a742');
  return c;
}

// ───────── 뱀 머리 (히드라·라돈) ─────────
export function serpentHead(o) {
  const W = o.w || 256, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 256, H / 256);
  const body = o.body || '#4a9a5a';
  const belly = o.belly || '#d8e8a0';
  // 목 (아래로 이어짐)
  rr(x, 96, 150, 64, 110, 30, body, 7);
  for (let i = 0; i < 4; i++) rr(x, 108, 160 + i * 24, 40, 14, 7, belly, 3);
  // 머리
  if (o.frill) {
    for (let i = -2; i <= 2; i++) poly(x, [128 + i * 22, 86, 120 + i * 30, 30, 140 + i * 26, 80], o.frill, 5);
  }
  ell(x, 128, 110, 70, 56, body, 7);
  ell(x, 150, 132, 44, 22, belly, 5);
  shine(x, 100, 82, 22, 10, 0.3);
  // 이빨
  poly(x, [124, 140, 130, 160, 136, 140], '#ffffff', 3);
  poly(x, [166, 138, 172, 156, 178, 136], '#ffffff', 3);
  circ(x, 180, 104, 4, '#2a1a10', 0);
  eyes(x, 116, 98, 22, o.eyes || 'angry', 0.9, 4);
  if (o.crown) {
    poly(x, [92, 64, 92, 36, 108, 52, 128, 26, 148, 52, 164, 36, 164, 64], '#f5c542', 5);
    circ(x, 128, 54, 6, '#ff4a6a', 3);
  }
  return c;
}

// ───────── 큰 게 ─────────
export function crab(o) {
  const W = o.w || 320, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 320, H / 256);
  const body = o.body || '#e0603a';
  const dark = shadeHex(body, -0.25);
  for (let i = 0; i < 3; i++) {
    line(x, [110 - i * 10, 170, 50 - i * 18, 236], 10, OUT); line(x, [110 - i * 10, 170, 50 - i * 18, 236], 5, dark);
    line(x, [210 + i * 10, 170, 270 + i * 18, 236], 10, OUT); line(x, [210 + i * 10, 170, 270 + i * 18, 236], 5, dark);
  }
  // 집게
  ell(x, 50, 110, 40, 30, body, 7, -0.5);
  poly(x, [30, 84, 10, 60, 50, 80], body, 5);
  ell(x, 270, 110, 40, 30, body, 7, 0.5);
  poly(x, [290, 84, 310, 60, 270, 80], body, 5);
  line(x, [80, 140, 110, 160], 12, OUT); line(x, [240, 140, 210, 160], 12, OUT);
  ell(x, 160, 160, 100, 62, body, 7);
  shine(x, 120, 134, 30, 12, 0.35);
  line(x, [140, 110, 136, 76], 7); line(x, [180, 110, 184, 76], 7);
  circ(x, 136, 72, 16, '#ffffff', 6); circ(x, 184, 72, 16, '#ffffff', 6);
  circ(x, 138, 74, 8, '#2a1a10', 0); circ(x, 186, 74, 8, '#2a1a10', 0);
  if (o.angry) { line(x, [116, 54, 148, 62], 6); line(x, [204, 54, 172, 62], 6); }
  mouth(x, 160, 176, o.angry ? 'fang' : 'smile', 1);
  return c;
}

// ───────── 둥근 몸통 (히드라 몸, 슬라임 등) ─────────
export function blob(o) {
  const W = o.w || 320, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 320, H / 256);
  const body = o.body || '#4a9a5a';
  ell(x, 160, 180, 140, 70, body, 8);
  ell(x, 170, 206, 100, 34, o.belly || shadeHex(body, 0.35), 0);
  for (let i = 0; i < 6; i++) ell(x, 70 + i * 36, 160 - Math.sin(i) * 6, 14, 9, shadeHex(body, -0.18), 0);
  shine(x, 110, 140, 40, 14, 0.3);
  if (o.face) {
    eyes(x, 160, 170, 30, o.eyes || 'angry', 1.1);
    mouth(x, 160, 196, 'fang', 1.1);
  }
  return c;
}

// ───────── 사물 ─────────
export function prop(kind, o = {}) {
  const W = o.w || 256, H = o.h || 256;
  const [c, x] = makeCanvas(W, H);
  x.scale(W / 256, H / 256);
  switch (kind) {
    case 'amphora': {
      const g = o.gold;
      const base = g ? '#f5c542' : '#d9774b';
      const pat = g ? '#b07a12' : '#3a2618';
      shape(x, () => {
        x.moveTo(104, 40); x.lineTo(152, 40); x.lineTo(148, 70);
        x.quadraticCurveTo(220, 100, 196, 180); x.quadraticCurveTo(180, 236, 128, 244);
        x.quadraticCurveTo(76, 236, 60, 180); x.quadraticCurveTo(36, 100, 108, 70); x.closePath();
      }, base, 7);
      curve(x, 108, 58, 64, 60, 76, 110, 9);
      curve(x, 148, 58, 192, 60, 180, 110, 9);
      rr(x, 96, 30, 64, 16, 6, base, 6);
      line(x, [62, 150, 194, 150], 8, pat);
      line(x, [66, 196, 190, 196], 5, pat);
      for (let i = 0; i < 6; i++) poly(x, [80 + i * 18, 162, 88 + i * 18, 184, 96 + i * 18, 162], pat, 0);
      shine(x, 96, 110, 14, 26, g ? 0.6 : 0.35);
      if (g) {
        star(x, 128, 112, 20, 9, 5, '#fff6c8', 4);
      }
      break;
    }
    case 'poop': {
      const col = '#8a5a2b';
      ell(x, 128, 210, 90, 34, col, 7);
      ell(x, 128, 166, 66, 30, col, 7);
      ell(x, 128, 126, 44, 26, col, 7);
      shape(x, () => { x.moveTo(108, 112); x.quadraticCurveTo(128, 60, 146, 104); }, col, 7);
      shine(x, 100, 196, 18, 8, 0.3);
      shine(x, 106, 156, 14, 6, 0.3);
      eyes(x, 128, 168, 22, 'happy', 0.8);
      x.save(); x.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) curve(x, 70 + i * 50, 70, 60 + i * 50, 40, 76 + i * 50, 16, 4, '#9ab060');
      x.restore();
      break;
    }
    case 'dummy': {
      line(x, [128, 120, 128, 246], 12, '#8a5a2b');
      line(x, [60, 150, 196, 150], 10, '#8a5a2b');
      ell(x, 128, 160, 44, 56, '#e8d49a', 7);
      circ(x, 128, 86, 40, '#e8d49a', 7);
      line(x, [110, 80, 122, 92], 5); line(x, [122, 80, 110, 92], 5);
      line(x, [134, 80, 146, 92], 5); line(x, [146, 80, 134, 92], 5);
      curve(x, 112, 108, 128, 102, 144, 108, 4);
      for (let i = 0; i < 3; i++) line(x, [100, 140 + i * 18, 156, 140 + i * 18], 3, '#c9a86a');
      circ(x, 128, 170, 14, '#d43c3c', 4);
      circ(x, 128, 170, 5, '#ffffff', 0);
      break;
    }
    case 'boulder': {
      shape(x, () => { x.moveTo(40, 200); x.quadraticCurveTo(20, 110, 90, 70); x.quadraticCurveTo(150, 30, 200, 80); x.quadraticCurveTo(250, 130, 220, 210); x.quadraticCurveTo(130, 250, 40, 200); }, o.color || '#9a9488', 8);
      shine(x, 90, 100, 30, 14, 0.3);
      curve(x, 120, 120, 140, 150, 130, 180, 4, shadeHex(o.color || '#9a9488', -0.3));
      break;
    }
    case 'pelt': {
      ell(x, 128, 190, 100, 40, '#e0a640', 7);
      for (let i = 0; i < 8; i++) circ(x, 50 + i * 22, 168, 14, '#b5651d', 5);
      circ(x, 200, 160, 30, '#e0a640', 6);
      eyes(x, 200, 158, 10, 'closed', 0.6);
      break;
    }
    case 'chain': {
      for (let i = 0; i < 6; i++) {
        shape(x, () => x.ellipse(128, 30 + i * 36, 20, 26, 0, 0, TAU), null, 10);
        shape(x, () => x.ellipse(128, 30 + i * 36, 20, 26, 0, 0, TAU), null, 5, '#b8c0c8');
      }
      break;
    }
    case 'sign': {
      line(x, [128, 120, 128, 246], 12, '#8a5a2b');
      rr(x, 40, 50, 176, 90, 14, '#c9935a', 7);
      x.fillStyle = OUT;
      x.font = 'bold 54px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(o.text || '!', 128, 98);
      break;
    }
    case 'apple': {
      circ(x, 128, 150, 80, '#f5c542', 8);
      shine(x, 96, 116, 22, 30, 0.6);
      line(x, [128, 72, 140, 34], 10, '#6b4a2b');
      ell(x, 166, 50, 30, 14, '#6fa83c', 6, -0.4);
      star(x, 170, 170, 14, 6, 4, '#fffbe0', 0);
      break;
    }
    case 'chest': {
      rr(x, 40, 110, 176, 120, 14, '#a0602a', 7);
      shape(x, () => { x.moveTo(40, 120); x.quadraticCurveTo(128, 40, 216, 120); x.closePath(); }, '#b8743a', 7);
      rr(x, 112, 120, 32, 40, 6, '#f5c542', 5);
      break;
    }
  }
  return c;
}

// ───────── 무기 (플레이어 손에 붙는 부품, 손잡이가 아래쪽) ─────────
export function weapon(kind) {
  const [c, x] = makeCanvas(128, 256);
  switch (kind) {
    case 'club':
      shape(x, () => { x.moveTo(52, 246); x.lineTo(44, 120); x.quadraticCurveTo(30, 40, 64, 14); x.quadraticCurveTo(100, 40, 86, 120); x.lineTo(76, 246); x.closePath(); }, '#9a6a3a', 8);
      shine(x, 54, 70, 8, 30, 0.3);
      [[56, 70], [76, 104], [52, 140]].forEach(([kx, ky]) => circ(x, kx, ky, 6, '#6b4422', 3));
      rr(x, 48, 200, 32, 14, 5, '#d4a23a', 4);
      break;
    case 'spear':
      line(x, [64, 250, 64, 50], 12, OUT);
      line(x, [64, 250, 64, 50], 6, '#b07a42');
      poly(x, [46, 60, 64, 4, 82, 60, 64, 52], '#d8dee6', 6);
      shine(x, 58, 34, 4, 12, 0.6);
      rr(x, 52, 60, 24, 12, 4, '#d4a23a', 4);
      break;
    case 'bow':
      shape(x, () => x.arc(10, 128, 110, -1.0, 1.0), null, 12);
      shape(x, () => x.arc(10, 128, 110, -1.0, 1.0), null, 6, '#b07a42');
      line(x, [10 + Math.cos(-1) * 110, 128 + Math.sin(-1) * 110, 10 + Math.cos(1) * 110, 128 + Math.sin(1) * 110], 3, '#f2ede0');
      break;
    case 'rattle':
      line(x, [64, 250, 64, 120], 12, OUT);
      line(x, [64, 250, 64, 120], 6, '#b07a42');
      ell(x, 44, 80, 28, 44, '#d49a3a', 7, -0.3);
      ell(x, 84, 80, 28, 44, '#e8b04a', 7, 0.3);
      shine(x, 36, 64, 6, 14, 0.5);
      break;
    case 'torch':
      line(x, [64, 250, 64, 110], 14, OUT);
      line(x, [64, 250, 64, 110], 8, '#8a5a2b');
      shape(x, () => { x.moveTo(36, 116); x.quadraticCurveTo(30, 50, 64, 14); x.quadraticCurveTo(98, 50, 92, 116); x.closePath(); }, '#ff8a2a', 6);
      shape(x, () => { x.moveTo(50, 112); x.quadraticCurveTo(48, 70, 64, 48); x.quadraticCurveTo(80, 70, 78, 112); x.closePath(); }, '#ffe24a', 0);
      break;
    case 'shield':
      // 방패병의 둥근 청동 방패 (가운데 기준으로 붙임)
      ell(x, 64, 128, 54, 96, '#c8873a', 8);
      ell(x, 64, 128, 38, 74, '#e8b04a', 5);
      star(x, 64, 128, 26, 11, 5, '#fff2b0', 4);
      shine(x, 44, 76, 7, 26, 0.45);
      break;
    case 'fist':
      circ(x, 64, 200, 30, '#f7c9a0', 7);
      line(x, [48, 188, 80, 188], 3); line(x, [48, 204, 80, 204], 3);
      break;
  }
  return c;
}

// ───────── 효과 아틀라스 (4x2 칸, 칸당 64px) ─────────
export const FX_TILES = { star: 0, spark: 1, dust: 2, glow: 3, heart: 4, leaf: 5, snow: 6, drop: 7 };
export function fxAtlas() {
  const [c, x] = makeCanvas(256, 128);
  const cell = (i, fn) => {
    x.save();
    x.translate((i % 4) * 64 + 32, Math.floor(i / 4) * 64 + 32);
    fn();
    x.restore();
  };
  cell(0, () => star(x, 0, 0, 28, 12, 5, '#ffffff', 0));
  cell(1, () => {
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(0, -30); x.quadraticCurveTo(4, -4, 30, 0); x.quadraticCurveTo(4, 4, 0, 30); x.quadraticCurveTo(-4, 4, -30, 0); x.quadraticCurveTo(-4, -4, 0, -30);
    x.fill();
  });
  cell(2, () => {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.fill();
  });
  cell(3, () => {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, 31, 0, TAU); x.fill();
  });
  cell(4, () => {
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(0, 24); x.bezierCurveTo(-34, 0, -22, -30, 0, -14); x.bezierCurveTo(22, -30, 34, 0, 0, 24);
    x.fill();
  });
  cell(5, () => {
    x.fillStyle = '#ffffff';
    x.beginPath(); x.ellipse(0, 0, 26, 12, 0.6, 0, TAU); x.fill();
  });
  cell(6, () => {
    x.strokeStyle = '#ffffff';
    x.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      x.rotate(Math.PI / 3);
      x.beginPath(); x.moveTo(-26, 0); x.lineTo(26, 0); x.stroke();
    }
  });
  cell(7, () => {
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(0, -28); x.quadraticCurveTo(22, 6, 0, 24); x.quadraticCurveTo(-22, 6, 0, -28); x.fill();
  });
  return c;
}

// 땅바닥용 텍스처들
export function radialTex(inner = 'rgba(0,0,0,0.5)', outer = 'rgba(0,0,0,0)', size = 128) {
  const [c, x] = makeCanvas(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.65, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

export function crescentTex() {
  const [c, x] = makeCanvas(256, 256);
  const g = x.createRadialGradient(128, 128, 60, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.85, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(128, 128);
  x.arc(128, 128, 126, -Math.PI * 0.85, -Math.PI * 0.15);
  x.closePath();
  x.fill();
  return c;
}

// ───────── 아이콘 (UI 버튼용, 128x128) ─────────
export function icon(kind) {
  const [c, x] = makeCanvas(128, 128);
  const W = (fn) => { x.save(); fn(); x.restore(); };
  switch (kind) {
    case 'attack':
      W(() => { x.translate(64, 64); x.rotate(0.6); x.translate(-64, -64); x.drawImage(weapon('club'), 32, 0, 64, 128); });
      break;
    case 'fist':
      circ(x, 64, 66, 32, '#f7c9a0', 7);
      line(x, [42, 56, 86, 56], 4); line(x, [42, 72, 86, 72], 4);
      ell(x, 40, 84, 12, 16, '#f7c9a0', 6, 0.5);
      break;
    case 'dash':
      for (let i = 0; i < 3; i++) curve(x, 20, 40 + i * 24, 70, 30 + i * 24, 108, 44 + i * 24, 9, '#ffffff');
      for (let i = 0; i < 3; i++) curve(x, 20, 40 + i * 24, 70, 30 + i * 24, 108, 44 + i * 24, 4, '#8fd4ff');
      break;
    case 'bow':
      W(() => { x.translate(64, 64); x.rotate(-0.8); x.translate(-64, -64); x.drawImage(weapon('bow'), 24, 0, 64, 128); });
      line(x, [24, 104, 104, 24], 6);
      line(x, [24, 104, 104, 24], 3, '#c9a86a');
      poly(x, [104, 24, 84, 30, 98, 44], '#6fd46a', 4);
      break;
    case 'rattle':
      W(() => { x.translate(64, 64); x.rotate(0.5); x.translate(-64, -64); x.drawImage(weapon('rattle'), 32, 0, 64, 128); });
      for (let i = 0; i < 3; i++) curve(x, 96 + i * 8, 20, 112 + i * 8, 40, 96 + i * 8, 60, 4, '#ffffff');
      break;
    case 'spear':
      W(() => { x.translate(64, 64); x.rotate(0.78); x.translate(-64, -64); x.drawImage(weapon('spear'), 32, 0, 64, 128); });
      break;
    case 'swap':
      shape(x, () => x.arc(64, 64, 34, 0.3, Math.PI * 1.7), null, 12);
      shape(x, () => x.arc(64, 64, 34, 0.3, Math.PI * 1.7), null, 6, '#ffffff');
      poly(x, [96, 18, 104, 52, 72, 42], '#ffffff', 5);
      break;
    case 'talk':
      shape(x, () => { x.roundRect(14, 20, 100, 70, 28); x.moveTo(36, 86); x.lineTo(28, 112); x.lineTo(60, 88); }, '#ffffff', 7);
      for (let i = 0; i < 3; i++) circ(x, 40 + i * 24, 55, 7, '#3a2618', 0);
      break;
    case 'grab':
      circ(x, 64, 70, 34, '#f7c9a0', 7);
      for (let i = 0; i < 4; i++) rr(x, 36 + i * 15, 24, 14, 40, 7, '#f7c9a0', 5);
      for (let i = 0; i < 3; i++) curve(x, 18, 30 + i * 30, 6, 40 + i * 30, 18, 50 + i * 30, 4, '#ffe24a');
      break;
    case 'hug':
      shape(x, () => { x.moveTo(64, 108); x.bezierCurveTo(4, 70, 20, 14, 64, 40); x.bezierCurveTo(108, 14, 124, 70, 64, 108); }, '#ff6a8a', 7);
      shine(x, 44, 46, 10, 6, 0.6);
      break;
    case 'torch':
      x.drawImage(weapon('torch'), 32, 0, 64, 128);
      break;
    case 'push':
      x.drawImage(prop('boulder'), 4, 14, 100, 100);
      poly(x, [94, 40, 124, 64, 94, 88], '#ffe24a', 5);
      break;
    case 'heart':
      shape(x, () => { x.moveTo(64, 112); x.bezierCurveTo(0, 70, 14, 10, 64, 38); x.bezierCurveTo(114, 10, 128, 70, 64, 112); }, '#ff4a5a', 7);
      shine(x, 40, 44, 12, 8, 0.55);
      break;
    case 'star':
      star(x, 64, 66, 56, 24, 5, '#f5c542', 7);
      shine(x, 48, 50, 10, 6, 0.6);
      break;
    case 'coin':
      circ(x, 64, 64, 48, '#f5c542', 7);
      circ(x, 64, 64, 32, '#e8b030', 4);
      x.fillStyle = '#8a5a12';
      x.font = 'bold 40px serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('Δ', 64, 66);
      break;
    case 'pause':
      rr(x, 34, 28, 22, 72, 6, '#ffffff', 7);
      rr(x, 72, 28, 22, 72, 6, '#ffffff', 7);
      break;
    case 'apple':
      x.drawImage(prop('apple'), 0, 0, 128, 128);
      break;
  }
  return c;
}
