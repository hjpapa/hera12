// 12과업 정보: 🧒 아이 시나리오, 왕과의 대화(과업 받기 / 보고), 보상, 별 조건
// 대사는 docs/SCENARIO.md 와 같다.

export const LABORS = [
  {
    n: 1, stage: 'labor01', title: '네메아의 사자', emoji: '🦁', place: '네메아 골짜기', sprite: 'lion',
    child: '왕과 대화: 네메아의 사자를 몸으로 졸라 물리치기',
    intro: [
      ['king', '흠흠! 네가 그 힘세다는 헤라클레스냐? 하나도 안 무섭게 생겼구나!'],
      ['hercules', '안녕하세요, 왕님! 과업을 주세요!'],
      ['king', '첫 번째 과업이다. 네메아 골짜기의 사자를 물리쳐라!'],
      ['king', '그 사자의 가죽은 화살도 칼도 다 튕겨 낸다지. 흐흐흐, 과연 할 수 있을까?'],
      ['hercules', '걱정 마세요. 저한테는 이 튼튼한 팔이 있다고요!'],
    ],
    report: [
      ['king', '으아악! 사, 사자다!!'],
      ['hercules', '왕님, 이건 가죽이에요. 이제 안 물어요!'],
      ['king', '(항아리 속에서) 다, 다음부터는 성문 밖에서 보여 줘!'],
    ],
    jar: true,
    rewards: [{ gear: 'lion', icon: 'heart', title: '사자 망토', desc: '하트가 1칸 늘고, 받는 피해가 줄어요!' }],
    side: {
      title: '몰로르코스와의 약속',
      card: null,
      pages: [
        { art: 's1_molorchus', text: '헤라클레스가 돌아온 날은 꼭 서른 번째 날이었어요. 몰로르코스 할아버지는 헤라클레스가 돌아오지 않는 줄 알고 슬퍼하고 있었지요.' },
        { art: 's1_molorchus', text: '\'살아 돌아왔구나!\' 두 사람은 함께 제우스 신께 감사 제사를 올렸어요. 약속을 지킨 덕분에 모두 웃을 수 있었답니다.' }
      ],
    },
    cards: ['leo'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 2, stage: 'labor02', title: '레르나의 히드라', emoji: '🐍', place: '레르나 늪', sprite: 'hydra_head',
    child: '조카 이올라오스의 도움으로, 이올라오스가 잘린 자리를 횃불로 지짐',
    intro: [
      ['king', '두 번째 과업! 레르나 늪의 히드라를 물리쳐라. 머리가 아홉 개나 달린 물뱀이지.'],
      ['king', '머리 하나를 자르면 두 개가 다시 난다던데? 크크크.'],
      ['hercules', '머리가 두 개씩이나?! 이건 혼자서는 힘들겠는데…'],
      ['iolaus', '삼촌! 저도 갈래요! 제가 횃불을 들고 따라갈게요!'],
      ['hercules', '좋아, 이올라오스! 우리 둘이 함께라면 할 수 있어!'],
    ],
    report: [
      ['king', '조카가 도와줬다고? 그건 반칙이야! 무효다, 무효!'],
      ['hercules', '에이~ 서로 돕는 것도 영웅이 하는 일이에요!'],
      ['glau', '(속닥) 신화에서는 왕이 이 과업을 인정하지 않아서 과업이 열 개에서 열두 개로 늘었대. 하지만 우리 게임에서는 당연히 인정!'],
    ],
    rewards: [{ skill: 'bow', icon: 'bow', title: '히드라 독화살', desc: '스킬 버튼으로 쏴요. 자동으로 조준돼요!' }],
    side: {
      title: '황금 머리는 바위 밑에',
      card: null,
      pages: [
        { art: 's2_rock', text: '헤라클레스는 죽지 않는 황금 머리를 레르나에서 엘라이우스로 가는 길가, 아주 큰 바위 밑에 묻었어요.' },
        { art: 's2_rock', text: '그리고 히드라의 독을 화살촉에 묻혀 두었지요. 이 독화살은 앞으로의 모험에서 여러 번 큰 힘이 되었답니다.' }
      ],
    },
    cards: ['hydra', 'cancer'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 3, stage: 'labor03', title: '케리네이아의 사슴', emoji: '🦌', place: '사계절 숲', sprite: 'deer',
    child: '아르테미스의 사슴 데려오기. 아르테미스에게 허락 받음',
    intro: [
      ['king', '세 번째 과업! 케리네이아의 황금 뿔 사슴을 산 채로 데려와라. 화살보다 빠르다지!'],
      ['hercules', '산 채로요? 그럼 절대 다치게 하면 안 되겠네요.'],
    ],
    report: [
      ['king', '오오, 황금 뿔! 이 사슴은 이제 내 거다!'],
      ['narr', '(사슴이 휙! 하고 달아나 숲으로 돌아갔어요)'],
      ['hercules', '앗, 약속대로 여신님께 돌아갔네요. 헤헤.'],
    ],
    rewards: [{ gear: 'deer', icon: 'dash', title: '아르테미스의 축복', desc: '구르기가 더 멀리, 더 빠르게!' }],
    side: {
      title: '북쪽 끝 나라까지',
      card: null,
      pages: [
        { art: 's3_hyperborea', text: '사슴을 쫓는 동안 헤라클레스는 북풍 너머 \'히페르보레오이\'라는 먼 나라까지 갔대요. 하늘에 오로라가 춤추는 곳이었지요.' },
        { art: 's3_hyperborea', text: '아르테미스의 쌍둥이 동생 아폴론도 그 이야기를 듣고 \'정말 정직한 영웅이구나!\' 하고 웃었대요.' }
      ],
    },
    cards: ['artemis'],
    challenge: { type: 'fast', label: '5분 안에 따라잡기', time: 300 },
  },
  {
    n: 4, stage: 'labor04', title: '에리만토스의 멧돼지', emoji: '🐗', place: '에리만토스 산', sprite: 'boar',
    child: '히드라의 독이 묻은 화살로 멧돼지 퇴치',
    intro: [
      ['king', '네 번째 과업! 에리만토스 산의 거대한 멧돼지를 잡아 와라! 엄니가 창처럼 뾰족하다더구나.'],
      ['hercules', '이번엔 히드라 독화살을 써 볼 차례군요!'],
    ],
    report: [
      ['king', '꺄아아악!'],
      ['narr', '(왕이 청동 항아리 속으로 쏙! 항아리가 달달달 떨려요)'],
      ['hercules', '왕님~ 어디 가세요~?'],
      ['king', '(항아리 속에서) 나, 나는 여기가 편해!'],
    ],
    jar: true,
    rewards: [{ gear: 'tusk', icon: 'attack', title: '멧돼지 엄니', desc: '공격력이 세졌어요!' }],
    side: {
      title: '영웅들의 선생님 케이론',
      card: 'chiron',
      pages: [
        { art: 's4_chiron', text: '켄타우로스 중에는 아주 지혜로운 케이론이 있었어요. 영웅들에게 활쏘기와 약초와 별 보는 법을 가르친 선생님이었지요.' },
        { art: 's4_chiron', text: '아킬레우스, 이아손 같은 영웅들도 케이론의 제자였대요. 케이론은 나중에 하늘의 별자리가 되었다고 전해져요.' }
      ],
    },
    cards: ['centaur'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 5, stage: 'labor05', title: '아우게이아스의 외양간', emoji: '🐄', place: '엘리스', sprite: 'cow',
    child: '강의 물줄기를 이용해 마구간을 한 번에 청소',
    intro: [
      ['king', '다섯 번째 과업! 아우게이아스 왕의 외양간을 하루 만에 청소해라!'],
      ['king', '소가 3000마리, 30년 동안 한 번도 안 치웠지. 우히히, 냄새가 아주 지독할 거다!'],
      ['hercules', '으… 벌써 냄새가 나는 것 같아요.'],
    ],
    report: [
      ['king', '그건 강물이 한 거지, 네가 한 게 아니잖아!'],
      ['hercules', '강물을 끌어온 건 저라고요~ 머리를 쓰는 것도 힘이에요!'],
    ],
    rewards: [{ gear: 'heart5', icon: 'heart', title: '하트 그릇', desc: '하트가 1칸 늘었어요!' }],
    side: {
      title: '올림픽의 시작',
      card: 'olympics',
      pages: [
        { art: 's5_olympics', text: '아우게이아스 왕이 약속을 안 지키자, 왕의 아들 필레우스가 \'아버지가 약속하신 걸 제가 들었어요!\' 하고 용감하게 진실을 말했어요.' },
        { art: 's5_olympics', text: '훗날 헤라클레스는 알페이오스 강가의 올림피아에서 신들께 감사하는 큰 경기를 열었대요.' },
        { art: 's5_olympics', text: '달리기, 씨름, 마차 경주… 이것이 올림픽의 시작이라는 이야기가 전해져요!' }
      ],
    },
    cards: ['alpheus'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 6, stage: 'labor06', title: '스팀팔로스의 새', emoji: '🐦', place: '스팀팔로스 호수', sprite: 'stym_bird',
    child: '독화살로 스팀팔로스의 새 퇴치',
    intro: [
      ['king', '여섯 번째 과업! 스팀팔로스 호수의 괴물 새들을 쫓아내라. 청동 부리에, 깃털을 화살처럼 쏜다지!'],
      ['hercules', '독화살이 있으니 문제없어요!'],
    ],
    report: [
      ['king', '새, 새는 싫어! 깃털 하나라도 가져왔으면 당장 버려!'],
    ],
    rewards: [{ skill: 'rattle', icon: 'rattle', title: '청동 딸랑이', desc: '주변 적을 어지럽게 만들어요!' }],
    side: {
      title: '아레스의 섬으로',
      card: null,
      pages: [
        { art: 's6_ares', text: '살아남은 스팀팔로스의 새들은 멀리 전쟁의 신 아레스의 섬으로 날아갔어요.' },
        { art: 's6_ares', text: '나중에 아르고호를 탄 영웅들이 그 섬을 지날 때, 방패를 쾅쾅 두드려 새들을 쫓아냈대요. 헤라클레스의 딸랑이 작전처럼요!' }
      ],
    },
    cards: ['athena'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 7, stage: 'labor07', title: '크레타의 황소', emoji: '🐂', place: '크레타 섬', sprite: 'bull',
    child: '크레타의 황소를 창으로 물리침',
    intro: [
      ['king', '일곱 번째 과업! 바다 건너 크레타 섬에서 미쳐 날뛰는 황소를 해결해라!'],
      ['hercules', '배를 타고 바다 건너로! 신난다!'],
    ],
    report: [
      ['king', '화, 황소가 안 따라왔지? 정말이지?'],
      ['narr', '(왕이 항아리에서 눈만 빼꼼 내밀어요)'],
    ],
    jar: true,
    rewards: [{ skill: 'spear', icon: 'spear', title: '크레타의 창', desc: '앞으로 쭉 돌진하며 찔러요. 어지러운 적에게 아주 세요!' }],
    side: {
      title: '약속을 지키는 마음',
      card: null,
      pages: [
        { art: 's7_promise', text: '미노스 왕은 포세이돈 신과의 약속을 지키지 않아서 큰일을 겪었어요. 멋진 황소가 아까워서 욕심을 냈거든요.' },
        { art: 's7_promise', text: '헤라클레스는 생각했어요. \'약속은 작은 것이라도 꼭 지켜야 해. 그게 진짜 힘센 사람이야.\'' }
      ],
    },
    cards: ['taurus'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 8, stage: 'labor08', title: '디오메데스의 암말', emoji: '🐎', place: '트라키아', sprite: 'mare',
    child: '디오메데스를 물리치고 암말들을 물리침',
    intro: [
      ['king', '여덟 번째 과업! 트라키아의 디오메데스 왕이 기르는 무시무시한 암말 네 마리를 데려와라.'],
      ['king', '그 말들은 아주 사납다지. 히히히.'],
    ],
    report: [
      ['king', '마, 말은 저쪽에 묶어 둬! 멀리! 더 멀리!'],
    ],
    rewards: [{ gear: 'horse', icon: 'dash', title: '바람의 말굽', desc: '더 빨리 달려요!' }],
    prelude: {
      title: '가는 길에 만난 친구',
      card: 'alcestis',
      pages: [
        { art: 's8_alcestis', text: '트라키아로 가는 길에 헤라클레스는 친구 아드메토스 왕의 궁전에 들렀어요. 그런데 궁전이 온통 슬픔에 잠겨 있었어요.' },
        { art: 's8_alcestis', text: '왕비 알케스티스가 남편 대신 저승으로 떠나게 된 거예요. 헤라클레스는 죽음의 신 타나토스를 기다렸다가 씨름을 걸었어요.' },
        { art: 's8_return', text: '으라차! 씨름에서 진 타나토스는 왕비를 돌려주었어요. 아드메토스 왕은 헤라클레스를 꼭 안아 주었답니다.' },
        { art: 's8_return', text: '\'고마워, 헤라클레스!\' 친구를 도운 헤라클레스는 다시 힘차게 트라키아로 떠났어요.' }
      ],
    },
    cards: ['bucephalus'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 9, stage: 'labor09', title: '히폴리테의 허리띠', emoji: '🏹', place: '아마존의 나라', sprite: 'hippolyta',
    child: '히폴리테는 허리띠를 주려 했지만, 헤라클레스는 히폴리테를 물리치고 허리띠를 가져옴',
    intro: [
      ['king', '아홉 번째 과업! 내 딸 아드메테가 아마존 여왕 히폴리테의 허리띠를 갖고 싶대.'],
      ['king', '전쟁의 신 아레스가 딸에게 준 귀한 허리띠지. 꼭 가져와라!'],
    ],
    report: [
      ['king', '오오, 아드메테가 좋아하겠군! …그런데 왜 그렇게 시무룩하냐?'],
      ['hercules', '…아무것도 아니에요.'],
    ],
    rewards: [{ gear: 'belt', icon: 'attack', title: '아레스의 허리띠', desc: '공격력이 크게 세졌어요!' }],
    side: {
      title: '트로이의 바다 괴물',
      card: 'hesione',
      pages: [
        { art: 's9_hesione', text: '아마존에서 돌아오는 길, 트로이 바닷가에서 공주 헤시오네가 바다 괴물에게 바쳐지려 하고 있었어요.' },
        { art: 's9_hesione', text: '헤라클레스는 활을 쏘고 몽둥이를 휘둘러 바다 괴물을 물리치고 공주를 구했어요. 슬픈 일 뒤에도 헤라클레스는 다시 누군가를 도왔지요.' }
      ],
    },
    cards: ['hippolyta'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 10, stage: 'labor10', title: '게리온의 소 떼', emoji: '🐮', place: '에리테이아 섬', sprite: 'geryon',
    child: '오르트로스를 물리친 뒤, 뒤쫓아 온 게리온마저 물리치고 소 떼를 데려옴',
    intro: [
      ['king', '열 번째 과업! 세상 서쪽 끝, 몸이 셋 달린 거인 게리온의 붉은 소 떼를 데려와라!'],
      ['hercules', '세상 끝까지요? 엄청 멀겠다!'],
    ],
    report: [
      ['king', '소, 소가 이렇게 많이?! 내 마당이 꽉 찼잖아!'],
    ],
    rewards: [{ gear: 'heart10', icon: 'heart', title: '하트 그릇', desc: '하트가 1칸 늘었어요!' }],
    side: {
      title: '거꾸로 찍힌 발자국',
      card: 'cacus',
      pages: [
        { art: 's10_cacus', text: '소 떼를 몰고 돌아오던 길, 이탈리아에서 불을 뿜는 거인 카쿠스가 밤에 몰래 소들을 훔쳐 갔어요.' },
        { art: 's10_cacus', text: '카쿠스는 소의 꼬리를 잡고 뒤로 끌고 갔어요. 발자국이 거꾸로 찍혀서, 소들이 동굴에서 나간 것처럼 보였지요!' },
        { art: 's10_cacus', text: '그때 동굴 안에서 \'음매~\' 하는 소리! 헤라클레스는 꾀를 알아채고 소들을 되찾았어요.' }
      ],
    },
    cards: ['pillars'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 11, stage: 'labor11', title: '헤스페리데스의 황금사과', emoji: '🍎', place: '세상의 끝', sprite: 'apple_gold',
    child: '프로메테우스를 구하고, 아틀라스 대신 하늘을 떠받쳐 아틀라스를 속이고, 라돈을 물리쳐 황금사과를 얻음',
    intro: [
      ['king', '열한 번째 과업! 세상 끝 헤스페리데스 정원의 황금사과를 가져와라.'],
      ['king', '그런데 그 정원이 어디 있는지는 아무도 몰라! 크크크.'],
      ['hercules', '그럼… 아는 사람을 찾아가야겠네요!'],
    ],
    report: [
      ['king', '화, 황금사과다! 이건 헤라 여신님의 보물인데… 나, 난 무서워서 못 갖겠다. 도로 갖다 놔!'],
      ['glau', '(신화에서도 황금사과는 결국 아테나 여신이 정원에 되돌려 놓았대!)'],
    ],
    rewards: [{ gear: 'apple', icon: 'apple', title: '황금사과', desc: '하트가 거의 없을 때 한 번, 하트를 모두 채워 줘요!' }],
    prelude: {
      title: '땅의 아들 안타이오스',
      card: 'antaeus',
      pages: [
        { art: 's11_antaeus', text: '정원으로 가는 길, 뜨거운 리비아에서 거인 안타이오스가 씨름을 걸어왔어요. 그는 땅에 발이 닿을 때마다 힘이 다시 솟았지요.' },
        { art: 's11_antaeus', text: '헤라클레스는 꾀를 냈어요. 안타이오스를 번쩍 들어 올려 땅에서 떼어 놓았더니, 힘이 쭉 빠져서 이길 수 있었답니다!' }
      ],
    },
    cards: ['draco', 'atlas'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
  {
    n: 12, stage: 'labor12', title: '케르베로스', emoji: '🐕', place: '저승', sprite: 'cerberus',
    child: '카론의 도움으로 하데스에게 가서, 케르베로스를 쓰러뜨리고 얻음',
    intro: [
      ['king', '마지막 과업이다! 저승을 지키는 머리 셋 달린 개, 케르베로스를 데려와라!'],
      ['king', '저승에 갔다가 살아 돌아온 사람은 없다지. 흐흐흐흐… 이번엔 정말 못 할걸?'],
      ['hercules', '마지막 별을 꼭 모을 거예요!'],
    ],
    report: [
      ['king', '으아아아아아! 당장 돌려보내!!!'],
      ['narr', '(왕이 항아리 속으로 쏙! 뚜껑까지 닫았어요)'],
      ['hercules', '네~ 약속대로 하데스 님께 돌려드릴게요. 잘 가, 케르베로스!'],
      ['cerberus_happy', '멍! 멍멍! 멍!'],
    ],
    jar: true,
    rewards: [{ gear: 'cerberus', icon: 'star', title: '케르베로스 친구', desc: '마을에서 케르베로스 인형이 함께해요!' }],
    side: {
      title: '하얀 포플러 잎',
      card: 'poplar',
      pages: [
        { art: 's12_poplar', text: '저승에서 나온 헤라클레스는 강가의 포플러 나뭇가지로 관을 만들어 썼대요.' },
        { art: 's12_poplar', text: '그 뒤로 포플러 잎은 앞은 짙고 뒤는 하얗게 되었다는 전설이 있어요. 저승의 그을음과 헤라클레스의 땀 때문이래요!' }
      ],
    },
    cards: ['cerberus'],
    challenge: { type: 'noFaint', label: '한 번도 쓰러지지 않기' },
  },
];

export function labor(n) {
  return LABORS[n - 1];
}
