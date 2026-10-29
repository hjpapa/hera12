// 모든 2D 스프라이트 정의.
// - paint: 임시 그림을 그릴 화가 이름 (render/paint.js)
// - w, h : 그림 비율 (Codex가 PNG를 만들 때 같은 비율, 2배 크기 권장)
// - worldH: 게임 속 키 (미터 단위, 플레이어 ≈ 2.2)
// - portrait: 대화창 얼굴 자르기 [x, y, w, h] (0~1 비율)
// Codex 애셋: public/assets/sprites/<id>.png 를 넣고 manifest.json 의 sprites 에 등록하면 자동 교체된다.

const HERC = { build: 'big', skin: '#f0b88a', hair: '#5a3418', hairStyle: 'curly', tunic: '#f4efe4', trim: '#d4a23a', belt: '#8a5a2b', acc: ['headband'] };
const HUMAN_PORTRAIT = [0.12, 0.0, 0.76, 0.62];
const QUAD_PORTRAIT = [0.5, 0.0, 0.5, 0.62];

export const SPRITES = {
  // ── 플레이어 ──
  hercules: { paint: 'humanoid', worldH: 2.2, o: HERC, portrait: HUMAN_PORTRAIT },
  hercules_lion: { paint: 'humanoid', worldH: 2.3, o: { ...HERC, hood: 'lion', acc: [] }, portrait: [0.08, 0.0, 0.84, 0.66] },
  hercules_hold: { paint: 'humanoid', worldH: 2.3, o: { ...HERC, hood: 'lion', acc: ['sweat'], armsUp: true, eyes: 'worried', mouth: 'grin' }, portrait: [0.08, 0.1, 0.84, 0.66] },
  hercules_baby: { paint: 'humanoid', worldH: 1.4, o: { build: 'baby', skin: '#f7c9a0', hair: '#5a3418', hairStyle: 'curly', tunic: '#ffffff', trim: '#8fd4ff', belt: false, eyes: 'happy', mouth: 'grin' }, portrait: [0.1, 0.12, 0.8, 0.7] },
  iphicles: { paint: 'humanoid', worldH: 1.4, o: { build: 'baby', skin: '#f7c9a0', hair: '#c98a4a', hairStyle: 'short', tunic: '#ffffff', trim: '#ffb0c0', belt: false, eyes: 'closed', mouth: 'o' }, portrait: [0.1, 0.12, 0.8, 0.7] },

  // ── 사람·신 ──
  glau: { paint: 'bird', worldH: 1.0, o: { type: 'owl', body: '#b89a6a', leaf: true }, portrait: [0.1, 0.1, 0.8, 0.8] },
  eurystheus: { paint: 'humanoid', worldH: 2.1, o: { build: 'old', skin: '#f7d2b0', hair: '#8a7060', hairStyle: 'short', tunic: '#8a5ab0', trim: '#f5c542', robe: true, cape: '#c0392b', eyes: 'worried', mouth: 'o', beard: '#8a7060', acc: ['crown'] }, portrait: HUMAN_PORTRAIT },
  iolaus: { paint: 'humanoid', worldH: 1.8, o: { build: 'kid', skin: '#f2c194', hair: '#6b4022', hairStyle: 'spiky', tunic: '#8fc8f0', trim: '#ffffff', held: 'torch', mouth: 'grin' }, portrait: HUMAN_PORTRAIT },
  athena: { paint: 'humanoid', worldH: 2.25, o: { skin: '#f7d2b0', hair: '#4a3020', hairStyle: 'long', tunic: '#f4efe4', trim: '#3a8fd8', robe: true, shield: '#3a8fd8', held: 'spear', acc: ['helmet'], helmetColor: '#d4a23a', crest: '#3a8fd8' }, portrait: [0.12, 0.0, 0.76, 0.66] },
  artemis: { paint: 'humanoid', worldH: 2.2, o: { skin: '#f7d2b0', hair: '#b0582a', hairStyle: 'longbun', tunic: '#6aa860', trim: '#e8eef8', held: 'bow', acc: ['tiara_moon'], cape: '#e8eef8' }, portrait: HUMAN_PORTRAIT },
  hera: { paint: 'humanoid', worldH: 2.25, o: { skin: '#f7d2b0', hair: '#2a1a2a', hairStyle: 'longbun', tunic: '#2d8f8a', trim: '#f5c542', robe: true, mouth: 'smirk', acc: ['peacock', 'crown'] }, portrait: [0.0, 0.0, 1.0, 0.7] },
  zeus: { paint: 'humanoid', worldH: 2.5, o: { build: 'big', skin: '#f2c194', hair: '#f4f4f4', hairStyle: 'curly', tunic: '#ffffff', trim: '#f5c542', robe: true, cape: '#3a6fd8', beard: '#f4f4f4', beardLong: true, held: 'lightning', acc: ['laurel'] }, portrait: HUMAN_PORTRAIT },
  hebe: { paint: 'humanoid', worldH: 2.1, o: { skin: '#f7d2b0', hair: '#e0a040', hairStyle: 'long', tunic: '#ffb0c8', trim: '#ffffff', robe: true, held: 'flower', acc: ['flower'], eyes: 'happy' }, portrait: HUMAN_PORTRAIT },
  pythia: { paint: 'humanoid', worldH: 2.1, o: { skin: '#f7d2b0', hair: '#3a2a2a', hairStyle: 'long', tunic: '#f4efe4', trim: '#d4a23a', robe: true, eyes: 'closed', mouth: 'flat', acc: ['veil', 'laurel'] }, portrait: HUMAN_PORTRAIT },
  molorchus: { paint: 'humanoid', worldH: 2.0, o: { build: 'old', skin: '#e8b890', hair: '#e8e8e8', hairStyle: 'bald', tunic: '#a07a50', trim: '#6b4a2b', beard: '#f0f0f0', held: 'staff', wrinkles: true, eyes: 'small' }, portrait: HUMAN_PORTRAIT },
  pholus: { paint: 'quadruped', worldH: 2.8, o: { type: 'horse', body: '#a0704a', centaur: true, beard: '#5a3a22', hair: '#5a3a22', skin: '#f0bf92' }, portrait: [0.48, 0.0, 0.52, 0.5] },
  augeas: { paint: 'humanoid', worldH: 2.3, o: { build: 'big', skin: '#f2c194', hair: '#8a5a2b', hairStyle: 'short', tunic: '#e8903a', trim: '#f5c542', beard: '#8a5a2b', robe: true, acc: ['crown'], mouth: 'smirk' }, portrait: HUMAN_PORTRAIT },
  minos: { paint: 'humanoid', worldH: 2.2, o: { skin: '#e8b890', hair: '#2a1a1a', hairStyle: 'curly', tunic: '#c0392b', trim: '#f5c542', beard: '#2a1a1a', robe: true, acc: ['crown'], eyes: 'worried' }, portrait: HUMAN_PORTRAIT },
  diomedes: { paint: 'humanoid', worldH: 2.8, o: { build: 'big', skin: '#d8a070', hair: '#1a1010', hairStyle: 'spiky', tunic: '#4a3a3a', trim: '#c0392b', armor: '#9a6a3a', beard: '#1a1010', held: 'spear', eyes: 'angry', mouth: 'fang', cape: '#7a1a1a' }, portrait: HUMAN_PORTRAIT },
  hippolyta: { paint: 'humanoid', worldH: 2.3, o: { skin: '#e8b890', hair: '#1a1010', hairStyle: 'long', tunic: '#c0392b', trim: '#f5c542', shield: '#f5c542', held: 'spear', acc: ['helmet'], helmetColor: '#f5c542', crest: '#c0392b', beltGem: '#ff4a6a', belt: '#f5c542' }, portrait: [0.06, 0.0, 0.88, 0.66] },
  hippolyta_down: { paint: 'humanoid', worldH: 2.2, o: { skin: '#e8b890', hair: '#1a1010', hairStyle: 'long', tunic: '#c0392b', trim: '#f5c542', held: 'belt', eyes: 'closed', mouth: 'frown', belt: false }, portrait: HUMAN_PORTRAIT },
  amazon: { paint: 'humanoid', worldH: 2.15, o: { skin: '#e0a878', hair: '#3a2010', hairStyle: 'longbun', tunic: '#d86a3a', trim: '#ffffff', shield: '#c99a3a', held: 'spear', eyes: 'angry', mouth: 'flat' }, portrait: HUMAN_PORTRAIT },
  amazon_archer: { paint: 'humanoid', worldH: 2.15, o: { skin: '#e8b890', hair: '#6a3a1a', hairStyle: 'long', tunic: '#9a4ab0', trim: '#ffffff', held: 'bow', eyes: 'angry', mouth: 'flat' }, portrait: HUMAN_PORTRAIT },
  hera_amazon: { paint: 'humanoid', worldH: 2.15, o: { skin: '#f7d2b0', hair: '#2a1a2a', hairStyle: 'longbun', tunic: '#2d8f8a', trim: '#f5c542', held: 'spear', eyes: 'normal', mouth: 'smirk' }, portrait: HUMAN_PORTRAIT },
  helios: { paint: 'humanoid', worldH: 2.4, o: { build: 'big', skin: '#f7c890', hair: '#ffcf3a', hairStyle: 'spiky', tunic: '#ff9a2a', trim: '#fff2a0', robe: true, cape: '#ffcf3a', acc: ['crown'], mouth: 'grin' }, portrait: HUMAN_PORTRAIT },
  nereus: { paint: 'humanoid', worldH: 2.1, o: { build: 'old', skin: '#c8e0d8', hair: '#5aa08a', hairStyle: 'long', tunic: '#3a8fd8', trim: '#ffffff', robe: true, beard: '#d8f0f0', beardLong: true, held: 'staff', eyes: 'worried' }, portrait: HUMAN_PORTRAIT },
  geryon: { paint: 'humanoid', worldH: 4.6, w: 320, h: 256, o: { w: 320, build: 'giant', skin: '#d89070', hair: '#a0301a', hairStyle: 'spiky', tunic: '#5a3a2a', trim: '#c0392b', armor: '#8a6a4a', beard: '#a0301a', heads: [-1, 0, 1], extraArms: true, eyes: 'angry', mouth: 'fang' }, portrait: [0.1, 0.0, 0.8, 0.5] },
  prometheus: { paint: 'humanoid', worldH: 2.5, o: { build: 'big', skin: '#e8b890', hair: '#6a4a2a', hairStyle: 'curly', tunic: '#a09080', trim: '#6b4a2b', beard: '#6a4a2a', chains: true, eyes: 'worried', mouth: 'frown' }, portrait: HUMAN_PORTRAIT },
  prometheus_free: { paint: 'humanoid', worldH: 2.5, o: { build: 'big', skin: '#e8b890', hair: '#6a4a2a', hairStyle: 'curly', tunic: '#a09080', trim: '#6b4a2b', beard: '#6a4a2a', eyes: 'happy', mouth: 'grin', held: 'torch' }, portrait: HUMAN_PORTRAIT },
  atlas: { paint: 'humanoid', worldH: 6.0, o: { build: 'giant', skin: '#c89070', hair: '#8a8a8a', hairStyle: 'curly', tunic: '#7a6a5a', trim: '#4a3a2a', beard: '#9a9a9a', beardLong: true, armsUp: true, eyes: 'worried', mouth: 'grin' }, portrait: [0.18, 0.0, 0.64, 0.5] },
  atlas_free: { paint: 'humanoid', worldH: 6.0, o: { build: 'giant', skin: '#c89070', hair: '#8a8a8a', hairStyle: 'curly', tunic: '#7a6a5a', trim: '#4a3a2a', beard: '#9a9a9a', beardLong: true, eyes: 'happy', mouth: 'grin', held: 'apple' }, portrait: [0.18, 0.0, 0.64, 0.5] },
  hermes: { paint: 'humanoid', worldH: 2.2, o: { skin: '#f2c194', hair: '#e0b050', hairStyle: 'curly', tunic: '#ffffff', trim: '#3a8fd8', cape: '#e8903a', held: 'caduceus', acc: ['winged_hat'], mouth: 'grin' }, portrait: [0.06, 0.0, 0.88, 0.66] },
  charon: { paint: 'humanoid', worldH: 2.4, o: { hood: 'dark', hoodColor: '#3d3355', tunic: '#3d3355', trim: '#7a6aa0', robe: true, held: 'oar', skin: '#c8c0d8' }, portrait: [0.1, 0.0, 0.8, 0.62] },
  hades: { paint: 'humanoid', worldH: 2.6, o: { build: 'big', skin: '#c8c8e0', hair: '#1a1424', hairStyle: 'long', tunic: '#2a1e3a', trim: '#7cf0ff', robe: true, cape: '#1a1424', beard: '#1a1424', held: 'bident', acc: ['dark_crown'], eyes: 'normal', mouth: 'flat' }, portrait: HUMAN_PORTRAIT },
  persephone: { paint: 'humanoid', worldH: 2.15, o: { skin: '#f7d2b0', hair: '#8a3a2a', hairStyle: 'long', tunic: '#6aa860', trim: '#ff8fb4', robe: true, acc: ['flower'], held: 'flower' }, portrait: HUMAN_PORTRAIT },
  villager: { paint: 'humanoid', worldH: 2.05, o: { skin: '#f2c194', hair: '#3a2a1a', hairStyle: 'short', tunic: '#e8d49a', trim: '#7fae4a', mouth: 'grin' }, portrait: HUMAN_PORTRAIT },
  villager2: { paint: 'humanoid', worldH: 2.0, o: { skin: '#f7d2b0', hair: '#c98a4a', hairStyle: 'bun', tunic: '#f0a0a0', trim: '#ffffff', robe: true }, portrait: HUMAN_PORTRAIT },
  merchant: { paint: 'humanoid', worldH: 2.1, o: { build: 'big', skin: '#e8b890', hair: '#2a1a1a', hairStyle: 'bald', tunic: '#3a8fd8', trim: '#f5c542', beard: '#2a1a1a', mouth: 'grin', eyes: 'happy' }, portrait: HUMAN_PORTRAIT },
  soldier: { paint: 'humanoid', worldH: 2.15, o: { skin: '#d8a070', hair: '#1a1010', hairStyle: 'short', tunic: '#5a4a4a', trim: '#c0392b', shield: '#8a6a4a', held: 'spear', acc: ['helmet'], helmetColor: '#8a6a4a', crest: '#1a1010', eyes: 'angry', mouth: 'flat' }, portrait: HUMAN_PORTRAIT },
  skeleton: { paint: 'humanoid', worldH: 2.0, o: { skin: '#f0ece0', hair: '#f0ece0', hairStyle: 'bald', tunic: '#5a5a6a', trim: '#8a8a9a', eyes: 'red', mouth: 'fang', blush: false, shield: '#6a6a7a' }, portrait: HUMAN_PORTRAIT },

  // ── 짐승·괴물 ──
  lion: { paint: 'quadruped', worldH: 2.7, w: 320, h: 256, o: { type: 'lion', body: '#e8b04a', mane: '#b5651d', eyes: 'angry' }, portrait: QUAD_PORTRAIT },
  lion_dizzy: { paint: 'quadruped', worldH: 2.7, w: 320, h: 256, o: { type: 'lion', body: '#e8b04a', mane: '#b5651d', eyes: 'dizzy' }, portrait: QUAD_PORTRAIT },
  wolf: { paint: 'quadruped', worldH: 1.5, w: 320, h: 256, o: { type: 'wolf', body: '#8a8f9a', eyes: 'angry' }, portrait: QUAD_PORTRAIT },
  wolf_snow: { paint: 'quadruped', worldH: 1.5, w: 320, h: 256, o: { type: 'wolf', body: '#e4ecf4', eyes: 'angry' }, portrait: QUAD_PORTRAIT },
  toad: { paint: 'blob', worldH: 1.0, w: 320, h: 256, o: { body: '#7aa84a', face: true, eyes: 'angry' }, portrait: [0.2, 0.3, 0.6, 0.7] },
  crab_giant: { paint: 'crab', worldH: 2.4, w: 320, h: 256, o: { body: '#e0603a', angry: true }, portrait: [0.2, 0.0, 0.6, 0.7] },
  crab: { paint: 'crab', worldH: 1.0, w: 320, h: 256, o: { body: '#f08a4a', angry: true }, portrait: [0.2, 0.0, 0.6, 0.7] },
  hydra_body: { paint: 'blob', worldH: 2.4, w: 320, h: 256, o: { body: '#4a8a5a', belly: '#c8d890' }, portrait: [0.2, 0.3, 0.6, 0.7] },
  hydra_head: { paint: 'serpentHead', worldH: 2.2, o: { body: '#4a9a5a', belly: '#d8e8a0', eyes: 'angry', frill: '#2d6a3a' }, portrait: [0.1, 0.0, 0.8, 0.7] },
  hydra_head_gold: { paint: 'serpentHead', worldH: 2.6, o: { body: '#d8b040', belly: '#fff2b0', eyes: 'angry', crown: true, frill: '#a07a12' }, portrait: [0.1, 0.0, 0.8, 0.7] },
  snake: { paint: 'serpentHead', worldH: 1.1, o: { body: '#7ab84a', belly: '#e8f0a0', eyes: 'angry' }, portrait: [0.1, 0.0, 0.8, 0.7] },
  snake_dizzy: { paint: 'serpentHead', worldH: 1.1, o: { body: '#7ab84a', belly: '#e8f0a0', eyes: 'dizzy' }, portrait: [0.1, 0.0, 0.8, 0.7] },
  deer: { paint: 'quadruped', worldH: 2.2, w: 320, h: 256, o: { type: 'deer', body: '#c98a4a', belly: '#f4e0c0', antlers: '#f5c542', hoof: '#c98a3a', eyes: 'normal', spots: '#f4e0c0' }, portrait: QUAD_PORTRAIT },
  deer_tired: { paint: 'quadruped', worldH: 2.2, w: 320, h: 256, o: { type: 'deer', body: '#c98a4a', belly: '#f4e0c0', antlers: '#f5c542', hoof: '#c98a3a', eyes: 'closed', spots: '#f4e0c0' }, portrait: QUAD_PORTRAIT },
  boar: { paint: 'quadruped', worldH: 2.4, w: 320, h: 256, o: { type: 'boar', body: '#6b4a3a', eyes: 'angry' }, portrait: QUAD_PORTRAIT },
  boar_dizzy: { paint: 'quadruped', worldH: 2.4, w: 320, h: 256, o: { type: 'boar', body: '#6b4a3a', eyes: 'dizzy' }, portrait: QUAD_PORTRAIT },
  fly: { paint: 'bird', worldH: 0.7, o: { type: 'fly', body: '#3a4a3a' }, portrait: [0.2, 0.2, 0.6, 0.6] },
  gadfly: { paint: 'bird', worldH: 0.8, o: { type: 'fly', body: '#2d6a8a' }, portrait: [0.2, 0.2, 0.6, 0.6] },
  cow: { paint: 'quadruped', worldH: 1.9, w: 320, h: 256, o: { type: 'cow', body: '#f4efe4', spots: '#6b4a3a', horns: '#e8dcc0', eyes: 'normal' }, portrait: QUAD_PORTRAIT },
  cow_red: { paint: 'quadruped', worldH: 1.9, w: 320, h: 256, o: { type: 'cow', body: '#c04a30', horns: '#f4efe4', eyes: 'normal' }, portrait: QUAD_PORTRAIT },
  stym_bird: { paint: 'bird', worldH: 1.4, o: { body: '#b8843a', head: '#c89448', beak: '#e8c070', metal: true, eyes: 'red', crest: '#8a5a1a' }, portrait: [0.4, 0.1, 0.6, 0.6] },
  stym_leader: { paint: 'bird', worldH: 3.0, o: { body: '#9a6a2a', head: '#b07a32', beak: '#f5d080', metal: true, eyes: 'angry', crest: '#c0392b' }, portrait: [0.4, 0.1, 0.6, 0.6] },
  goat: { paint: 'quadruped', worldH: 1.5, w: 320, h: 256, o: { type: 'goat', body: '#d8c8a8', eyes: 'angry' }, portrait: QUAD_PORTRAIT },
  bull: { paint: 'quadruped', worldH: 3.1, w: 320, h: 256, o: { type: 'bull', body: '#f4efe4', horns: '#f5c542', eyes: 'angry', ring: true }, portrait: QUAD_PORTRAIT },
  bull_dizzy: { paint: 'quadruped', worldH: 3.1, w: 320, h: 256, o: { type: 'bull', body: '#f4efe4', horns: '#f5c542', eyes: 'dizzy', ring: true }, portrait: QUAD_PORTRAIT },
  mare: { paint: 'quadruped', worldH: 2.3, w: 320, h: 256, o: { type: 'horse', body: '#7a3a3a', mane: '#1a1010', eyes: 'red' }, portrait: QUAD_PORTRAIT },
  mare_calm: { paint: 'quadruped', worldH: 2.3, w: 320, h: 256, o: { type: 'horse', body: '#a06050', mane: '#3a2010', eyes: 'happy' }, portrait: QUAD_PORTRAIT },
  orthrus: { paint: 'quadruped', worldH: 2.5, w: 320, h: 256, o: { type: 'dog', body: '#5a4a4a', heads: 2, eyes: 'angry' }, portrait: QUAD_PORTRAIT },
  eagle: { paint: 'bird', worldH: 3.0, o: { type: 'eagle', body: '#7a5030', head: '#f4efe4', beak: '#f5c542', eyes: 'angry' }, portrait: [0.4, 0.1, 0.6, 0.6] },
  ladon_head: { paint: 'serpentHead', worldH: 2.4, o: { body: '#3a8a6a', belly: '#f5d070', eyes: 'angry', frill: '#f5c542' }, portrait: [0.1, 0.0, 0.8, 0.7] },
  ladon_body: { paint: 'blob', worldH: 2.0, w: 320, h: 256, o: { body: '#2d6a5a', belly: '#f5d070' }, portrait: [0.2, 0.3, 0.6, 0.7] },
  cerberus: { paint: 'quadruped', worldH: 4.0, w: 320, h: 256, o: { type: 'dog', body: '#3a3040', heads: 3, eyes: 'angry', tail: 'snake', headColors: ['#5a2a2a', '#3a3040', '#2a4a3a'] }, portrait: QUAD_PORTRAIT },
  cerberus_happy: { paint: 'quadruped', worldH: 4.0, w: 320, h: 256, o: { type: 'dog', body: '#4a4050', heads: 3, eyes: 'happy', tail: 'snake', tongue: true, headColors: ['#6a3a3a', '#4a4050', '#3a5a4a'] }, portrait: QUAD_PORTRAIT },
  bat: { paint: 'bird', worldH: 1.0, o: { type: 'bat' }, portrait: [0.2, 0.2, 0.6, 0.6] },

  // ── 사물 ──
  amphora: { paint: 'prop:amphora', worldH: 1.05, o: {} },
  amphora_gold: { paint: 'prop:amphora', worldH: 1.3, o: { gold: true } },
  poop: { paint: 'prop:poop', worldH: 1.1, o: {} },
  dummy: { paint: 'prop:dummy', worldH: 1.9, o: {} },
  boulder: { paint: 'prop:boulder', worldH: 2.2, o: {} },
  pelt: { paint: 'prop:pelt', worldH: 1.0, o: {} },
  chain: { paint: 'prop:chain', worldH: 2.2, o: {} },
  apple_gold: { paint: 'prop:apple', worldH: 0.9, o: {} },
  chest: { paint: 'prop:chest', worldH: 1.2, o: {} },

  // ── 무기 (플레이어 손 부품, 손잡이 = 아래쪽 가운데) ──
  w_club: { paint: 'weapon:club', worldH: 1.25, w: 128, h: 256 },
  w_spear: { paint: 'weapon:spear', worldH: 2.0, w: 128, h: 256 },
  w_bow: { paint: 'weapon:bow', worldH: 1.3, w: 128, h: 256 },
  w_rattle: { paint: 'weapon:rattle', worldH: 0.9, w: 128, h: 256 },
  w_torch: { paint: 'weapon:torch', worldH: 1.0, w: 128, h: 256 },
  w_fist: { paint: 'weapon:fist', worldH: 0.9, w: 128, h: 256 },
};

// UI 아이콘 (public/assets/sprites/icon_<이름>.png 로 교체 가능, 128x128)
export const ICONS = ['attack', 'fist', 'dash', 'bow', 'rattle', 'spear', 'swap', 'talk', 'grab', 'hug', 'torch', 'push', 'heart', 'star', 'coin', 'pause', 'apple'];
