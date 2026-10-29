// 플레이어 능력치 = 레벨 + 레벨업 선택 + 과업 장비 + 상점 구매
// 체력 단위: 반 칸 하트 (2 = 하트 1개)

export function expToNext(level) {
  return Math.round(24 * Math.pow(level, 1.32));
}

export function computeStats(save) {
  const d = save.data;
  const has = (k) => d.gear.includes(k);
  let maxHp = 10 + d.picks.hp + d.shop.heart * 2;
  if (has('lion')) maxHp += 2;
  if (has('heart5')) maxHp += 2;
  if (has('heart10')) maxHp += 2;
  maxHp = Math.min(maxHp, 28);
  let atk = 10 + (d.level - 1) * 1.5 + d.picks.atk * 3 + d.shop.club * 4;
  if (has('tusk')) atk += 5;
  if (has('belt')) atk += 10;
  let speed = 6.4 * (1 + d.picks.spd * 0.04);
  if (has('horse')) speed += 0.7;
  const deer = has('deer');
  return {
    maxHp,
    atk,
    speed: Math.min(speed, 9.5),
    dashSpeed: (deer ? 22 : 17) * (1 + d.picks.spd * 0.02),
    dashTime: deer ? 0.26 : 0.22,
    defense: has('lion') ? 0.25 : 0,
    apple: has('apple'),
  };
}

export const PICKS = [
  { key: 'atk', icon: '💪', title: '힘', desc: '공격력이 세져요' },
  { key: 'hp', icon: '❤️', title: '체력', desc: '하트가 반 칸 늘어요' },
  { key: 'spd', icon: '⚡', title: '빠르기', desc: '더 빨리 달리고 굴러요' },
];
