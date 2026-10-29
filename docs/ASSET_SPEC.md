# 🎨 애셋 명세서 (Codex 작업용)

게임은 **애셋 없이도 완전히 돌아갑니다** (코드로 그린 임시 그림 + 코드로 만든 소리).
아래 규칙대로 파일을 넣고 `public/assets/manifest.json` 에 등록하면 **자동으로 교체**됩니다. 게임 코드는 고칠 필요가 없습니다.

- 확인 페이지: `npm run dev` 후 `http://localhost:5173/?gallery` → 모든 스프라이트가 한눈에 보임 (초록 테두리 = 등록된 애셋)
- 스프라이트 기준표: [`src/data/sprites.js`](../src/data/sprites.js) (id · 비율 · 게임 속 키)
- 효과음 id: [`src/core/audio.js`](../src/core/audio.js) 의 `SFX`, 음악 id: `SONGS`, 짧은 음악: `JINGLES`

---

## 1. 등록 방법

```json
// public/assets/manifest.json
{
  "sprites": {
    "hercules": "sprites/hercules.png",
    "hercules_lion": "sprites/hercules_lion.png",
    "icon_attack": "sprites/icon_attack.png",
    "portrait_hercules": "sprites/portrait_hercules.png"
  },
  "audio":  { "hit": "audio/hit.ogg", "jingle_victory": "audio/victory.ogg" },
  "music":  { "hub": "music/hub.ogg", "boss": "music/boss.ogg" },
  "story":  { "p_birth": "story/p_birth.png" },
  "models": {}
}
```

- 경로는 `public/assets/` 기준 상대 경로
- 등록하지 않은 id는 계속 임시 그림/합성음을 씀 → **하나씩 천천히 바꿔도 됨**

---

## 2. 그림 스타일 (모든 2D 공통)

| 항목 | 규칙 |
|---|---|
| 느낌 | 귀여운 종이 인형 · 그림책. 2~2.5등신 치비 |
| 외곽선 | 굵은 짙은 갈색 `#3a2618`, 약 6~8px (512px 기준) |
| 채색 | 평면 채색 + 하이라이트 1개 (흰색 30% 타원), 그라데이션 최소 |
| 얼굴 | 큰 눈(흰 하이라이트 2개), 분홍 볼터치, 작은 입 |
| 팔레트 | 에게해 파랑 `#3a8fd8`, 올리브 `#7fae4a`, 테라코타 `#d9774b`, 대리석 `#f4efe4`, 황금 `#f5c542`, 밤하늘 `#1d2350` |
| 금지 | 피·상처·무서운 표정. 괴물도 동그랗고 귀엽게 (화난 눈썹 정도만) |
| 배경 | **투명 PNG** (알파 0.5 미만은 잘림 → 반투명 그림자 넣지 말 것) |

### 기준점 · 방향 · 크기
- **캐릭터**: 발바닥이 그림 **아래쪽 가운데**에 닿게. 위·좌우 여백은 조금만.
- **방향**: 정면(살짝 오른쪽을 봄) 또는 오른쪽. 왼쪽은 게임이 좌우 반전.
- **비율**: `sprites.js` 의 `w:h` (기본 1:1, 네발짐승·게·히드라 몸통·게리온 = 5:4, 무기 = 1:2)
- **크기**: 비율 그대로 **2배 해상도 권장** → 1:1 은 512×512, 5:4 는 640×512, 무기는 256×512
- 게임 속 키(`worldH`)는 코드가 맞춰 주므로 그림 속 캐릭터는 세로를 꽉 채워도 됨

### 무기 (플레이어 손에 붙는 부품)
- `w_club`, `w_spear`, `w_bow`, `w_rattle`, `w_torch`, `w_fist` — **손잡이가 아래쪽 가운데**, 위쪽으로 뻗은 모양
- 게임이 손잡이를 축으로 휘두름 (회전) → 손잡이가 정확히 아래 가운데여야 자연스러움

---

## 3. 스프라이트 목록

### 플레이어
| id | 설명 | 비고 |
|---|---|---|
| `hercules` | 기본 헤라클레스: 갈색 곱슬머리, 빨간 머리띠, 흰 키톤(금색 테두리), 갈색 허리띠, 근육질 치비 | 과업 1 전 |
| `hercules_lion` | 사자 머리 망토를 쓴 헤라클레스 (사자 얼굴이 모자처럼, 갈기가 어깨까지) | **가장 많이 보이는 그림** |
| `hercules_hold` | 두 팔을 머리 위로 들고 땀 흘리는 모습 (하늘 떠받치기) | 과업 11 |
| `hercules_baby` | 아기 헤라클레스, 흰 포대기, 활짝 웃음 | 프롤로그 |
| `iphicles` | 쌍둥이 동생 아기, 우는 얼굴 | 프롤로그 |

### 사람 · 신
| id | 설명 |
|---|---|
| `glau` | 아테나의 부엉이 길잡이. 둥글고 귀여움, 머리에 올리브 잎 하나 |
| `eurystheus` | 겁 많은 왕: 금관, 보라 로브, 빨간 망토, 걱정스러운 눈, 작은 수염 |
| `iolaus` | 조카 (어린이 체형), 삐죽 머리, 하늘색 옷, 횃불 |
| `athena` | 투구(파란 깃), 창, 파란 원형 방패, 흰 드레스 |
| `artemis` | 초승달 머리장식, 활, 초록 짧은 옷, 흰 망토 |
| `hera` | 공작 깃털 장식 + 금관, 청록 드레스, 새침한 미소 |
| `zeus` | 흰 수염(길게), 월계관, 번개, 파란 망토 |
| `hebe` | 꽃관, 분홍 드레스, 꽃 한 송이 |
| `pythia` | 델포이 무녀: 베일, 월계관, 눈 감음 |
| `molorchus` | 양치기 할아버지: 대머리, 흰 수염, 지팡이 |
| `pholus` | 친절한 켄타우로스 (말 몸 + 사람 상체), 갈색 수염 · 비율 5:4 |
| `augeas` | 통통한 왕: 금관, 주황 로브, 능글맞은 미소 |
| `minos` | 크레타 왕: 금관, 검은 수염, 빨간 로브 |
| `diomedes` | 사나운 왕(보스): 검은 수염, 청동 갑옷, 창, 빨간 망토 |
| `hippolyta` | 아마존 여왕: 금빛 투구(빨간 깃), 금 방패, 창, **빨간 보석 허리띠** |
| `hippolyta_down` | 쓰러져 허리띠를 내미는 모습 (슬프지만 무섭지 않게) |
| `amazon`, `amazon_archer` | 아마존 전사 (창+방패 / 활) |
| `hera_amazon` | 아마존으로 변장한 헤라 (청록 옷, 새침한 미소 — 눈치챌 수 있게) |
| `helios` | 태양신: 빛나는 금발, 왕관, 주황 로브 |
| `nereus` | 바다 노인: 미역 같은 초록 긴 머리, 하늘색 긴 수염 |
| `geryon` | 몸 셋 거인(보스): 머리 셋, 팔 여섯, 붉은 머리 · 비율 5:4 |
| `prometheus` / `prometheus_free` | 쇠사슬에 묶인 티탄 / 풀려나 횃불을 든 모습 |
| `atlas` / `atlas_free` | 하늘을 받친 거인(팔 위로) / 황금사과를 든 거인 |
| `hermes` | 날개 모자, 지팡이(카두케우스), 주황 망토 |
| `charon` | 저승 뱃사공: 짙은 보라 후드, 노란 빛나는 눈, 노 (무섭지 않게!) |
| `hades` | 검보라 왕관(하늘색 보석), 검은 수염, 두 갈래 창 |
| `persephone` | 꽃관, 초록-분홍 드레스 |
| `villager`, `villager2`, `merchant` | 마을 사람들, 올리브 상인 |
| `soldier` | 트라키아 병사 (청동 투구, 방패, 창) |
| `skeleton` | 귀여운 해골 병사 (빨간 눈, 방패) |

### 짐승 · 괴물 (네발짐승은 오른쪽을 봄, 비율 5:4)
| id | 설명 |
|---|---|
| `lion` / `lion_dizzy` | 네메아의 사자: 황금 털, 큰 갈기 / 눈이 빙글빙글 |
| `wolf`, `wolf_snow` | 회색 늑대 / 하얀 눈늑대 |
| `toad` | 독두꺼비 (둥근 초록) |
| `crab_giant`, `crab` | 거대 게 카르키노스 / 작은 게 |
| `hydra_body` | 히드라 몸통 (목 없는 둥근 몸, 비늘) |
| `hydra_head`, `hydra_head_gold` | 히드라 머리 + 목 일부 (1:1, 목이 아래로) / 황금 왕관 쓴 불멸의 머리 |
| `snake`, `snake_dizzy` | 프롤로그 뱀 |
| `deer`, `deer_tired` | 황금 뿔·청동 발굽 사슴 / 지쳐서 눈 감은 모습 |
| `boar`, `boar_dizzy` | 거대 멧돼지 (엄니, 등 갈기) |
| `fly`, `gadfly` | 똥파리 / 헤라의 쇠파리 |
| `cow`, `cow_red` | 얼룩소 / 게리온의 붉은 소 |
| `stym_bird`, `stym_leader` | 청동 부리·쇠 깃털 새 / 대장 새 |
| `goat` | 성난 염소 |
| `bull`, `bull_dizzy` | 크레타의 흰 황소, 금빛 뿔, 코뚜레 |
| `mare`, `mare_calm` | 빨간 눈의 사나운 암말 / 얌전해져서 웃는 암말 |
| `orthrus` | 머리 둘 달린 개 |
| `eagle` | 거대 독수리 (흰 머리, 금빛 부리) |
| `ladon_head`, `ladon_body` | 용 라돈 머리(금빛 볏) / 몸통 |
| `cerberus`, `cerberus_happy` | 머리 셋(빨강·검정·초록 톤) + 뱀 꼬리 / 혀 내밀고 웃는 모습 |
| `bat` | 저승 박쥐 |

### 사물
`amphora`(테라코타 항아리, 검은 그리스 무늬), `amphora_gold`(숨은 황금 항아리, 별 무늬), `poop`(웃는 응가 더미 — 아이들이 좋아함), `dummy`(허수아비), `boulder`(큰 바위), `pelt`(사자 가죽), `chain`(쇠사슬, 세로), `apple_gold`(황금사과), `chest`

### UI 아이콘 (`icon_<이름>`, 256×256, 투명)
`attack`(몽둥이) · `fist` · `dash`(바람) · `bow` · `rattle` · `spear` · `swap`(↻) · `talk`(말풍선) · `grab`(꽉 쥔 손) · `hug`(하트) · `torch` · `push`(바위+화살표) · `heart` · `star` · `coin`(드라크마) · `pause` · `apple`

### 대화창 얼굴 (선택)
`portrait_<id>` (512×512) — 없으면 스프라이트 위쪽을 잘라 씀. 표정이 잘 보이는 상반신.

### 그림책 컷신 (`story`, 1920×1080 또는 1024×576, 16:9)
| id | 장면 |
|---|---|
| `p_birth` | 구름 위 제우스가 아기 헤라클레스를 안고 기뻐함 |
| `p_hera` | 밤, 화난 헤라가 요람 쪽으로 뱀 두 마리를 보냄 (무섭지 않게) |
| `p_grow` | 힘센 청년이 된 헤라클레스가 큰 바위를 번쩍 |
| `p_curse` | 먹구름 아래 펑펑 우는 헤라클레스 (비극은 보여 주지 않음) |
| `p_delphi` | 델포이 신전, 무녀가 신탁을 전함 |
| `p_journey` | 밤하늘 12개의 별을 향해 길을 떠나는 헤라클레스와 부엉이 |
| `e_adventure` | 아르고호를 탄 헤라클레스 |
| `e_olympus` | 올림포스 구름 신전, 제우스가 헤라클레스를 맞이함 |
| `e_hera` | 헤라와 헤라클레스의 화해 (하트) |
| `e_hebe` | 헤라클레스와 청춘의 여신 헤베의 결혼, 꽃잎 |
| `e_stars` | 밤하늘에 완성된 헤르쿨레스자리 |

---

## 4. 소리

- 형식: `.ogg` 또는 `.mp3` (모바일 호환 위해 mp3 권장), 모노 가능, 44.1kHz, -14 LUFS 정도
- 효과음은 **짧게** (대부분 0.1~0.6초), 시작에 무음 없이
- 저작권: CC0 또는 직접 제작한 것만

| id | 쓰임 |
|---|---|
| `swing` `hit` `hit_big` `crit` | 휘두르기 · 일반 타격 · 3타 내려찍기 · 치명타 (타격감의 핵심!) |
| `thud` `ting` | 사자에게 "쿵!" · 화살이 튕김 "팅!" |
| `enemy_die` `boss_die` | 적이 별가루로 · 보스 쓰러짐 |
| `hurt` `dash` `arrow` | 맞음 · 구르기 · 화살 |
| `coin` `exp` `heart` | 줍기 (게임이 피치를 올려 연속감 냄) |
| `talk` `select` `confirm` `warn` | UI · 적 공격 예고 "!" |
| `pot` `rock` `stomp` `whoosh` | 항아리 · 바위 · 쿵 · 휙 |
| `roar` `hiss` `bark` `moo` `neigh` `squeal` `bird` | 사자 · 히드라 · 개 · 소 · 말 · 멧돼지 · 새 |
| `splash` `rush` | 물 · 강물이 쏟아짐(2.5초) |
| `rattle` `grab` `mash` | 청동 딸랑이 · 꽉 잡기 · 연타 |
| `fire` `ice` `poison` `sizzle` `magic` `thunder` `door` `pop` `laugh` `jar` `star` `charge` | 기타 |
| `jingle_victory` `jingle_levelup` `jingle_star` `jingle_fail` `jingle_reward` | 짧은 음악 (1~3초) |

### 배경 음악 (`music`, 루프)
| id | 분위기 |
|---|---|
| `hub` | 티린스 마을: 평화로운 리라(하프) + 피리, 도리안 음계 |
| `field` | 모험: 경쾌한 행진 |
| `chase` | 사슴 추격: 빠르고 밝게 |
| `boss` | 보스전: 긴장감, 북 |
| `sad` | 히폴리테의 슬픈 진실 |
| `underworld` | 저승: 신비롭고 어둡지만 무섭지 않게 |
| `ending` | 엔딩: 웅장하고 따뜻하게 |

---

## 5. (선택) 3D 소품 모델
지금은 코드로 만든 로우폴리 소품을 씀. GLB 교체는 아직 연결 전이므로 **우선순위 낮음**.

## 6. 앱 아이콘
`public/icons/icon-192.png`, `public/icons/icon-512.png` — `public/icons/icon.svg` 디자인(밤하늘 + 웃는 금빛 별) 기준. 홈 화면 추가 시 사용.

## 7. 작업 순서 추천 (효과 큰 것부터)
1. `hercules_lion`, `hercules` + 무기 6종 (가장 오래 보임)
2. UI 아이콘 17종 (버튼은 아이가 계속 봄)
3. 보스 12종 + 일반 적
4. 타격 효과음 (`swing` `hit` `hit_big` `crit` `enemy_die`)
5. NPC · 사물 · 그림책 컷신 · 음악
