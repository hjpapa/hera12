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

  // ───────── 프롤로그 보강 ─────────
  p_milkyway(x) {
    bg(x, '#141a40', '#3a3a7a');
    stars(x, 90);
    // 하늘을 가로지르는 은하수
    for (let i = 0; i < 260; i++) {
      const t = i / 260;
      const px = t * W, py = 80 + Math.sin(t * 3) * 40 + ((i * 53) % 70) - 35;
      x.globalAlpha = 0.25 + ((i * 17) % 50) / 100;
      x.fillStyle = i % 3 ? '#fff6e8' : '#cfe0ff';
      x.beginPath(); x.arc(px, py, 2 + (i % 4), 0, 7); x.fill();
    }
    x.globalAlpha = 1;
    cloud(x, 200, 470, 2.2, '#c8c8f0');
    put(x, 'hera', 300, 470, 300);
    put(x, 'hercules_baby', 620, 470, 180);
    put(x, 'hermes', 820, 480, 240, true);
  },
  p_teachers(x) {
    bg(x, '#8fd0ff', '#f6f0d8');
    hill(x, '#9cc965', 440);
    put(x, 'hercules', 512, 500, 280);
    // 배운 것들: 활 · 창 · 몽둥이 · 리라 · 마차 바퀴
    const items = [['w_bow', 170, 230], ['w_spear', 300, 170], ['w_club', 730, 170], ['w_rattle', 860, 240]];
    for (const [id, px, py] of items) put(x, id, px, py + 120, 150);
    x.strokeStyle = '#3a2618';
    x.lineWidth = 8;
    x.fillStyle = '#f5c542';
    x.beginPath(); x.moveTo(470, 60); x.quadraticCurveTo(440, 150, 512, 170); x.quadraticCurveTo(584, 150, 554, 60); x.stroke();
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(490 + i * 15, 80); x.lineTo(490 + i * 15, 160); x.lineWidth = 3; x.stroke(); }
    x.lineWidth = 8;
    x.beginPath(); x.arc(512, 170, 18, 0, 7); x.fill(); x.stroke();
  },
  p_crossroads(x) {
    bg(x, '#a8d8ff', '#fff4e0');
    // 왼쪽: 꽃과 과자가 가득한 쉬운 내리막길 / 오른쪽: 바위 오르막 끝에 빛나는 신전
    hill(x, '#9cc965', 470, 10);
    x.fillStyle = '#f0e0b0';
    x.beginPath(); x.moveTo(470, 576); x.lineTo(560, 576); x.lineTo(300, 300); x.lineTo(240, 300); x.closePath(); x.fill();
    x.fillStyle = '#c8b898';
    x.beginPath(); x.moveTo(470, 576); x.lineTo(560, 576); x.lineTo(820, 200); x.lineTo(770, 200); x.closePath(); x.fill();
    for (let i = 0; i < 18; i++) { x.fillStyle = ['#ff8fb4', '#ffd84a', '#ffffff'][i % 3]; x.beginPath(); x.arc(120 + (i * 37) % 260, 330 + (i * 23) % 120, 9, 0, 7); x.fill(); }
    temple(x, 860, 190, 0.35);
    starShape(x, 860, 60, 26);
    put(x, 'kakia', 230, 430, 220);
    put(x, 'arete', 760, 400, 220, true);
    put(x, 'hercules', 512, 560, 230);
  },

  // ───────── 과업 뒷이야기 ─────────
  s1_molorchus(x) {
    bg(x, '#f6b06a', '#fde0b8');
    hill(x, '#c8b060', 450);
    x.fillStyle = '#f4efe4'; x.fillRect(600, 380, 90, 80); x.strokeStyle = '#3a2618'; x.lineWidth = 6; x.strokeRect(600, 380, 90, 80);
    for (let i = 0; i < 6; i++) { x.globalAlpha = 0.4; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(645 + Math.sin(i) * 20, 350 - i * 40, 20 + i * 4, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    put(x, 'molorchus', 470, 500, 250);
    put(x, 'hercules_lion', 300, 510, 280);
  },
  s2_rock(x) {
    bg(x, '#9ab8a0', '#e0ecd0');
    hill(x, '#7a9a4a', 440);
    x.fillStyle = '#e8d8a8'; x.fillRect(0, 470, W, 60);
    x.fillStyle = '#9a9488'; x.strokeStyle = '#3a2618'; x.lineWidth = 8;
    x.beginPath(); x.ellipse(560, 440, 170, 110, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#f5c542'; x.beginPath(); x.arc(470, 520, 14, 0, 7); x.fill();
    put(x, 'iolaus', 250, 520, 200);
    put(x, 'hercules_lion', 840, 520, 260, true);
  },
  s3_hyperborea(x) {
    bg(x, '#1a2a50', '#7a9ac8');
    for (let i = 0; i < 5; i++) { x.globalAlpha = 0.25; x.fillStyle = ['#7af0c0', '#a0ff9a', '#8ad8ff'][i % 3]; x.fillRect(0, 60 + i * 30, W, 26); }
    x.globalAlpha = 1;
    stars(x, 50);
    hill(x, '#f4f8ff', 440, 20);
    put(x, 'deer', 640, 470, 220);
    put(x, 'artemis', 330, 480, 240);
    put(x, 'apollo', 200, 480, 240);
  },
  s4_chiron(x) {
    bg(x, '#1d2350', '#4a5aa0');
    stars(x, 80);
    hill(x, '#3a5a3a', 460);
    put(x, 'chiron', 470, 500, 300);
    put(x, 'iolaus', 760, 510, 190, true);
    starShape(x, 470, 90, 22, '#fff6c8');
  },
  s5_olympics(x) {
    bg(x, '#8fd0ff', '#fff4d8');
    x.fillStyle = '#d9a46a'; x.beginPath(); x.ellipse(512, 470, 470, 110, 0, 0, 7); x.fill();
    x.fillStyle = '#9cc965'; x.beginPath(); x.ellipse(512, 470, 380, 70, 0, 0, 7); x.fill();
    x.fillStyle = '#3a8fd8'; x.fillRect(0, 540, W, 40);
    for (let i = 0; i < 6; i++) { x.fillStyle = ['#d43c3c', '#3a8fd8', '#f5c542'][i % 3]; x.fillRect(80 + i * 170, 200, 12, 120); x.fillRect(92 + i * 170, 200, 50, 30); }
    put(x, 'hercules_lion', 512, 470, 260);
    put(x, 'villager', 250, 480, 170);
    put(x, 'villager2', 780, 480, 170, true);
  },
  s6_ares(x) {
    bg(x, '#7ab8f0', '#d8f0ff');
    x.fillStyle = '#2a7ad8'; x.fillRect(0, 380, W, 200);
    x.fillStyle = '#8a7a6a'; x.beginPath(); x.ellipse(820, 400, 140, 50, 0, Math.PI, 0); x.fill();
    for (let i = 0; i < 6; i++) put(x, 'stym_bird', 300 + i * 90, 300 - (i % 2) * 60, 90);
  },
  s7_promise(x) {
    bg(x, '#5ab8ff', '#eaf8ff');
    x.fillStyle = '#2a8ad8'; x.fillRect(0, 420, W, 160);
    put(x, 'bull', 640, 470, 250);
    put(x, 'minos', 320, 480, 250);
  },
  s8_alcestis(x) {
    bg(x, '#6a6a98', '#d8d8f0');
    temple(x, 512, 440, 0.9);
    put(x, 'thanatos', 360, 520, 260);
    put(x, 'hercules_lion', 640, 520, 270, true);
  },
  s8_return(x) {
    bg(x, '#ffd8a0', '#fff6e8');
    temple(x, 512, 440, 0.9);
    put(x, 'admetus', 330, 520, 250);
    put(x, 'alcestis', 520, 520, 240);
    put(x, 'hercules_lion', 720, 520, 270, true);
  },
  s9_hesione(x) {
    bg(x, '#5a8ad0', '#c8e0ff');
    x.fillStyle = '#2a6ab8'; x.fillRect(0, 380, W, 200);
    x.fillStyle = '#8a7a6a'; x.fillRect(150, 330, 160, 70);
    put(x, 'hesione', 230, 340, 200);
    put(x, 'sea_monster', 560, 500, 320);
    put(x, 'hercules_lion', 860, 420, 260, true);
  },
  s10_cacus(x) {
    bg(x, '#7a8aa8', '#e8e0d0');
    hill(x, '#8a9a6a', 460);
    x.fillStyle = '#2a2018'; x.beginPath(); x.ellipse(260, 470, 150, 120, 0, Math.PI, 0); x.fill();
    // 거꾸로 찍힌 발자국 (동굴에서 나오는 것처럼 보임)
    x.fillStyle = '#5a4030';
    for (let i = 0; i < 6; i++) { const px = 440 + i * 60, py = 500 + (i % 2) * 18; x.beginPath(); x.ellipse(px, py, 10, 14, 0.4, 0, 7); x.fill(); x.beginPath(); x.ellipse(px + 14, py, 10, 14, -0.4, 0, 7); x.fill(); }
    put(x, 'cacus', 240, 470, 260);
    put(x, 'cow_red', 380, 470, 120, true);
    put(x, 'hercules_lion', 880, 530, 260, true);
  },
  s11_antaeus(x) {
    bg(x, '#ffb86a', '#ffe8c0');
    hill(x, '#e8c890', 480, 10);
    put(x, 'hercules_lion', 512, 540, 280);
    x.save();
    x.translate(512, 250);
    x.rotate(-0.25);
    const src = G.sprites.source('antaeus');
    x.drawImage(src, -150, -170, 300, 300 * (src.height / src.width));
    x.restore();
  },
  s12_theseus(x) {
    bg(x, '#2a2048', '#5a4a7a');
    for (let i = 0; i < 20; i++) { x.globalAlpha = 0.35; x.fillStyle = '#8ad8ff'; x.beginPath(); x.arc((i * 131) % W, (i * 71) % 350, 10, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    x.fillStyle = '#6a5a80'; x.strokeStyle = '#3a2618'; x.lineWidth = 8;
    x.fillRect(240, 330, 180, 170); x.strokeRect(240, 330, 180, 170);
    put(x, 'theseus_free', 330, 520, 250);
    put(x, 'hercules_lion', 650, 520, 270, true);
  },
  s12_poplar(x) {
    bg(x, '#ffe8a0', '#fff8e8');
    hill(x, '#9cc965', 450);
    x.fillStyle = '#2a2018'; x.beginPath(); x.ellipse(170, 470, 140, 110, 0, Math.PI, 0); x.fill();
    for (let i = 0; i < 3; i++) { x.fillStyle = '#e8f0e8'; x.strokeStyle = '#3a2618'; x.lineWidth = 6; x.beginPath(); x.ellipse(820 + i * 40, 250 + i * 30, 60, 90, 0.3, 0, 7); x.fill(); x.stroke(); }
    put(x, 'hercules_lion', 512, 520, 280);
    put(x, 'cerberus_happy', 260, 520, 180);
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
