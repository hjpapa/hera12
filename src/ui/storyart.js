// 그림책 컷신용 임시 그림 (1024x576). Codex가 public/assets/story/<id>.png 를 넣으면 교체된다.
import { G } from '../core/context.js';
import { makeCanvas } from '../render/paint.js';

const W = 1024, H = 576;

function bg(x, top, bottom) {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
}

function stars(x, n = 60, color = '#fff6c8') {
  x.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const sx = (i * 197) % W, sy = (i * 131) % (H * 0.6);
    x.globalAlpha = 0.4 + ((i * 37) % 60) / 100;
    x.beginPath();
    x.arc(sx, sy, 1.5 + (i % 3), 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
}

function cloud(x, cx, cy, s = 1, color = '#ffffff') {
  x.fillStyle = color;
  [[0, 0, 50], [45, -18, 42], [90, 0, 48], [40, 18, 40]].forEach(([dx, dy, r]) => {
    x.beginPath();
    x.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    x.fill();
  });
}

function hill(x, color, y = 430, amp = 30) {
  x.fillStyle = color;
  x.beginPath();
  x.moveTo(0, H);
  for (let i = 0; i <= 16; i++) x.lineTo((i / 16) * W, y + Math.sin(i * 0.9) * amp);
  x.lineTo(W, H);
  x.fill();
}

function put(x, id, cx, baseY, h, flip = false) {
  const src = G.sprites.source(id);
  const w = (h * src.width) / src.height;
  x.save();
  x.translate(cx, baseY);
  if (flip) x.scale(-1, 1);
  x.drawImage(src, -w / 2, -h, w, h);
  x.restore();
}

function temple(x, cx, baseY, s = 1) {
  x.fillStyle = '#f4efe4';
  x.strokeStyle = '#3a2618';
  x.lineWidth = 6;
  const w = 360 * s, h = 200 * s;
  x.fillRect(cx - w / 2, baseY - 30 * s, w, 30 * s);
  x.strokeRect(cx - w / 2, baseY - 30 * s, w, 30 * s);
  for (let i = 0; i < 6; i++) {
    const px = cx - w / 2 + 24 * s + i * ((w - 48 * s) / 5);
    x.fillRect(px - 12 * s, baseY - 30 * s - h, 24 * s, h);
    x.strokeRect(px - 12 * s, baseY - 30 * s - h, 24 * s, h);
  }
  x.beginPath();
  x.moveTo(cx - w / 2 - 20 * s, baseY - 30 * s - h);
  x.lineTo(cx, baseY - 30 * s - h - 90 * s);
  x.lineTo(cx + w / 2 + 20 * s, baseY - 30 * s - h);
  x.closePath();
  x.fillStyle = '#d9774b';
  x.fill();
  x.stroke();
}

function starShape(x, cx, cy, r, color = '#f5c542') {
  x.fillStyle = color;
  x.strokeStyle = '#7a4a12';
  x.lineWidth = 4;
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.45 : r;
    x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  x.closePath();
  x.fill();
  x.stroke();
}

// 헤르쿨레스자리 별 위치 (대략)
export const CONSTELLATION = [
  [0.5, 0.18], [0.44, 0.3], [0.56, 0.3], [0.42, 0.45], [0.58, 0.45], [0.5, 0.38],
  [0.36, 0.6], [0.64, 0.6], [0.32, 0.78], [0.68, 0.76], [0.28, 0.9], [0.72, 0.9],
];
export const CONST_LINES = [[0, 1], [0, 2], [1, 5], [2, 5], [1, 3], [2, 4], [3, 6], [4, 7], [6, 8], [7, 9], [8, 10], [9, 11]];

function constellation(x, cx, cy, s, lit = 12) {
  x.strokeStyle = 'rgba(255,246,200,0.6)';
  x.lineWidth = 4;
  for (const [a, b] of CONST_LINES) {
    if (a >= lit || b >= lit) continue;
    const [ax, ay] = CONSTELLATION[a], [bx, by] = CONSTELLATION[b];
    x.beginPath();
    x.moveTo(cx + (ax - 0.5) * s, cy + (ay - 0.5) * s);
    x.lineTo(cx + (bx - 0.5) * s, cy + (by - 0.5) * s);
    x.stroke();
  }
  CONSTELLATION.forEach(([px, py], i) => {
    if (i < lit) starShape(x, cx + (px - 0.5) * s, cy + (py - 0.5) * s, 16, '#fff6c8');
  });
}

const SCENES = {
  p_birth(x) {
    bg(x, '#7ab8f0', '#f5e0c0');
    cloud(x, 120, 120, 1.2);
    cloud(x, 760, 90, 1);
    cloud(x, 380, 380, 2.4);
    put(x, 'zeus', 380, 420, 330);
    put(x, 'hercules_baby', 600, 430, 190);
    starShape(x, 600, 180, 30);
  },
  p_hera(x) {
    bg(x, '#2a2350', '#6a4a8a');
    stars(x, 50);
    put(x, 'hera', 280, 470, 340);
    put(x, 'snake', 600, 470, 150, true);
    put(x, 'snake', 760, 470, 150);
    x.fillStyle = '#c99a5a';
    x.fillRect(560, 470, 300, 60);
  },
  p_grow(x) {
    bg(x, '#8fd0ff', '#f0e8c8');
    hill(x, '#8fc25a', 440);
    put(x, 'hercules', 512, 500, 320);
    x.fillStyle = '#9a9488';
    x.beginPath();
    x.ellipse(512, 120, 120, 70, 0, 0, Math.PI * 2);
    x.fill();
  },
  p_curse(x) {
    bg(x, '#3a3a5a', '#6a6a8a');
    cloud(x, 150, 120, 1.5, '#4a4a6a');
    cloud(x, 650, 90, 1.8, '#4a4a6a');
    hill(x, '#5a6a4a', 460);
    put(x, 'hercules', 512, 510, 300);
    x.fillStyle = '#8fd4ff';
    x.beginPath(); x.arc(470, 250, 10, 0, 7); x.fill();
    x.beginPath(); x.arc(555, 265, 10, 0, 7); x.fill();
  },
  p_delphi(x) {
    bg(x, '#f5c890', '#f8ecd8');
    hill(x, '#b8a878', 470, 10);
    temple(x, 640, 480, 1.1);
    put(x, 'pythia', 640, 470, 220);
    put(x, 'hercules', 230, 520, 280);
  },
  p_journey(x) {
    bg(x, '#1d2350', '#4a5aa0');
    stars(x, 80);
    for (let i = 0; i < 12; i++) starShape(x, 120 + i * 72, 110 + Math.sin(i) * 30, 18, '#f5c542');
    hill(x, '#3a5a3a', 460);
    put(x, 'hercules', 512, 520, 280);
    put(x, 'glau', 640, 300, 100);
  },
  e_adventure(x) {
    bg(x, '#7ab8f0', '#3a8fd8');
    x.fillStyle = '#2a6aa8';
    x.fillRect(0, 380, W, 200);
    x.fillStyle = '#8a5a2b';
    x.beginPath(); x.moveTo(250, 400); x.lineTo(780, 400); x.lineTo(700, 470); x.lineTo(320, 470); x.closePath(); x.fill();
    x.fillStyle = '#f4efe4';
    x.beginPath(); x.moveTo(510, 120); x.lineTo(510, 390); x.lineTo(700, 390); x.closePath(); x.fill();
    put(x, 'hercules_lion', 420, 410, 200);
  },
  e_olympus(x) {
    bg(x, '#ffe8a8', '#ffffff');
    cloud(x, 100, 450, 2.6);
    cloud(x, 600, 470, 2.8);
    temple(x, 512, 380, 1.0);
    put(x, 'zeus', 330, 500, 320);
    put(x, 'hercules_lion', 690, 500, 270);
  },
  e_hera(x) {
    bg(x, '#bfe8ff', '#fff6e8');
    cloud(x, 300, 480, 2.6);
    put(x, 'hera', 380, 500, 320);
    put(x, 'hercules_lion', 650, 500, 270);
    x.fillStyle = '#ff6a8a';
    x.beginPath(); x.moveTo(512, 210); x.bezierCurveTo(470, 170, 480, 130, 512, 150); x.bezierCurveTo(544, 130, 554, 170, 512, 210); x.fill();
  },
  e_hebe(x) {
    bg(x, '#ffd8e8', '#fff6e8');
    cloud(x, 120, 470, 2.4);
    cloud(x, 650, 480, 2.4);
    put(x, 'hercules_lion', 420, 500, 280);
    put(x, 'hebe', 610, 500, 260);
    for (let i = 0; i < 20; i++) {
      x.fillStyle = ['#ff8fb4', '#ffd84a', '#ffffff'][i % 3];
      x.beginPath(); x.arc((i * 151) % W, (i * 89) % 300, 8, 0, 7); x.fill();
    }
  },
  e_stars(x) {
    bg(x, '#0d1230', '#2a3570');
    stars(x, 120);
    constellation(x, 512, 280, 460, 12);
    hill(x, '#1a2a2a', 500, 14);
  },
};

export function storyCanvas(id) {
  const img = G.sprites.storyImage(id);
  if (img) return img;
  const [c, x] = makeCanvas(W, H);
  (SCENES[id] || SCENES.p_journey)(x);
  return c;
}

export { constellation, starShape };
