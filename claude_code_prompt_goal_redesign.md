# 작업 요청: 치료 목표 설정 데이터 구조 전면 개편

`goalData.js`를 아래 설계대로 다시 구성해줘. 기존 파일은 `goalData.legacy.js`로 백업해두고,
새 구조로 `goalData.js`를 새로 작성하면 돼. UI 컴포넌트도 새 데이터 구조에 맞게 함께 수정해줘.

작업량이 많아도 괜찮으니, 아래 "생성 작업 범위"에 명시된 모든 하위카테고리/항목을
실제 콘텐츠로 빠짐없이 채워줘. 예시로 준 2개 하위카테고리(불안/공포, 가족)의 톤과
구조를 그대로 따라가면 돼.

---

## 1. 배경 / 왜 바꾸는가

기존 구조의 문제 3가지를 해결하려는 거야.

1. **영역이 너무 거칠다.** "증상" 안에 우울/불안/수면/집중/신체증상이 다 섞여 있고,
   "관계" 안에 가족/친구/연인/직장이 다 섞여 있어서 환자가 자기 상황과 맞는 항목을
   찾기 어렵다.
2. **현재 어려움 문항이 너무 추상적이다.** "이유 없이 불안하다" 같은 문장은 누구나
   끄덕일 수 있지만, "내 얘기"라고 느끼게 하려면 구체적인 상황/장면이 들어가야 한다.
3. **목표와 루틴이 단일 레벨이다.** 같은 목표라도 사람마다 출발선이 다른데
   한 문장으로만 제시되어 있다. 목표를 강도별 3단계(사다리)로 나누고,
   목표/루틴 일부를 선택형 빈칸(매드립)으로 만들어서 같은 데이터 구조 안에서도
   훨씬 개인화된 문장을 완성할 수 있게 한다.

---

## 2. 새 데이터 구조 (스키마)

### 2.1 영역 및 하위카테고리

```js
domains: ['symptom', 'function', 'relation', 'meaning']

domain_labels: {
  symptom:  '증상',
  function: '기능',
  relation: '관계',
  meaning:  '의미',
}

subcategories: {
  symptom: [
    { id: 'mood',     label: '기분 / 감정' },
    { id: 'anxiety',  label: '불안 / 두려움' },
    { id: 'sleep',    label: '수면' },
    { id: 'cognition',label: '생각 / 집중' },
    { id: 'physical', label: '신체 증상' },
    { id: 'impulse',  label: '감정 조절 / 충동' },
  ],
  function: [
    { id: 'daily_routine', label: '일상 루틴' },
    { id: 'work_study',    label: '직업 / 학업' },
    { id: 'household',     label: '집안일 / 책임' },
    { id: 'self_care',      label: '자기관리' },
  ],
  relation: [
    { id: 'family',   label: '가족' },
    { id: 'friend',   label: '친구' },
    { id: 'partner',  label: '연인 / 배우자' },
    { id: 'work_social', label: '직장 / 사회생활' },
    { id: 'isolation', label: '전반적인 고립감' },
  ],
  meaning: [
    { id: 'direction', label: '삶의 의미 / 방향' },
    { id: 'identity',  label: '자기 이해 / 정체성' },
    { id: 'enjoyment', label: '즐거움 / 취미' },
    { id: 'autonomy',  label: '주체성 / 자율성' },
  ],
}
```

### 2.2 current_states (현재의 어려움) — 2단계 선택

각 항목은 특정 하위카테고리에 속하고, 가능하면 **구체적인 상황**을 담는다.
`situational_tags`는 나중에 루틴 추천에 사용되는 상황 키워드 배열이다 (없으면 `[]`).

```js
current_states: {
  symptom: [
    {
      id: 's_anxiety_1',
      subcategory: 'anxiety',
      text: '별일 없어도 가슴이 조이고, 곧 안 좋은 일이 생길 것 같은 느낌이 든다',
      situational_tags: [],
    },
    {
      id: 's_anxiety_2',
      subcategory: 'anxiety',
      text: '지하철, 엘리베이터, 사람 많은 곳에 가면 심장이 빨라지고 그 자리를 벗어나고 싶어진다',
      situational_tags: ['subway', 'crowd'],
    },
    // ... (하위카테고리당 3~4개)
    {
      id: 's_anxiety_custom',
      subcategory: 'anxiety',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
  ],
  // ...
}
```

화면 흐름: 1단계에서 하위카테고리 카드(예: "기분/감정", "불안/두려움"...)를 보여주고,
선택하면 2단계에서 해당 하위카테고리의 `current_states` 항목들을 리스트로 보여준다.
복수 선택 가능. 하위카테고리도 복수 선택 가능.

### 2.3 goals (목표 사다리 + 매드립)

기존에는 `domain` 단위로 목표 풀이 있었지만, 새 구조에서는 **현재 상태(state) 1개당
목표 사다리 1개**를 매핑한다. 사다리는 `small / medium / large` 3단계이며,
각 단계는 고정 문장이거나, 빈칸(`blanks`)이 있는 매드립 문장일 수 있다.

```js
goals: {
  's_anxiety_2': {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_anxiety_2_s',
        template: '[장소]에 가기 전부터 미리 너무 불안해지지는 않았으면 좋겠다',
        blanks: {
          '장소': ['지하철 타기', '엘리베이터 타기', '사람 많은 곳 가기'],
        },
      },
      {
        level: 'medium',
        id: 'g_anxiety_2_m',
        template: '[정도] 큰 동요 없이 [장소]을 할 수 있었으면 좋겠다',
        blanks: {
          '정도': ['한 정거장 정도는', '한 층 정도는', '잠깐은'],
          '장소': ['지하철 타기', '엘리베이터 타기', '사람 많은 곳에 머물기'],
        },
      },
      {
        level: 'large',
        id: 'g_anxiety_2_l',
        template: '출퇴근길이나 사람 많은 곳이 더 이상 두렵지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },
  // ...
}
```

**규칙**
- `template`에서 `[빈칸이름]`을 표시하고, `blanks`에 같은 키로 선택지 배열을 둔다.
- 빈칸이 없는 단계는 `blanks: {}`.
- `is_custom: true`인 state는 goals를 만들지 않고, UI에서 자유 입력 + 사다리 3단계
  자유 입력(또는 1단계만)으로 처리한다. (아래 "UI 작업"에서 다룸)
- medium 단계는 가능하면 빈칸을 1~2개 넣어서 개인화 여지를 준다. small/large는
  빈칸 없이 단순해도 된다.

### 2.4 routines (루틴 — 강도/매드립/상황 매칭)

루틴은 목표(goal ladder item) ID와 연결되고, 추가로 `situational_tags`가 있으면
2.2의 state `situational_tags`와 매칭되어 상단에 우선 노출된다.

```js
routines: {
  'g_anxiety_2_s': [
    {
      id: 'rt_breathing',
      template: '[시점]에 [시간] 동안 복식호흡 하기',
      blanks: {
        '시점': ['아침에', '자기 전에', '집을 나서기 전에'],
        '시간': ['1분', '3분', '5분'],
      },
      situational_tags: ['subway', 'crowd'],
    },
    {
      id: 'rt_note_anxious_thought',
      template: '불안한 생각이 들 때 한 줄로 적어두기',
      blanks: {},
      situational_tags: [],
    },
    // ...
  ],
}
```

**규칙**
- 목표 사다리의 각 단계(small/medium/large)마다 루틴 풀을 둘 필요는 없다.
  보통 **목표 1개(state) 당 공통 루틴 풀**을 두고, ladder의 모든 단계가
  같은 routine pool을 참조해도 된다. 즉 `routines`의 키는 `goal_id` 단위가
  아니라 **state id 단위**(`s_anxiety_2`)로 둬도 무방하다 — 구현 편한 쪽으로 정하고,
  주석으로 명시해줘.
- 루틴 3~4개 중 최소 1개 이상은 매드립(`blanks` 있음)으로 만들어줘.
- `situational_tags`가 state와 겹치는 루틴은 추천 시 최상단에 배치.

---

## 3. 완성된 예시 데이터 (이 패턴을 그대로 따라서 전체 생성)

아래 2개 하위카테고리는 전체를 완성된 형태로 작성했어. 이 톤, 구체성, 항목 수,
빈칸 개수를 기준으로 나머지 모든 하위카테고리를 동일한 밀도로 생성해줘.

### 예시 A. symptom > anxiety (불안 / 두려움)

```js
current_states.symptom (anxiety 항목들) = [
  {
    id: 's_anxiety_1',
    subcategory: 'anxiety',
    text: '별일 없어도 가슴이 조이고, 곧 안 좋은 일이 생길 것 같은 느낌이 든다',
    situational_tags: [],
  },
  {
    id: 's_anxiety_2',
    subcategory: 'anxiety',
    text: '지하철, 엘리베이터, 사람 많은 곳에 가면 심장이 빨라지고 그 자리를 벗어나고 싶어진다',
    situational_tags: ['subway', 'crowd'],
  },
  {
    id: 's_anxiety_3',
    subcategory: 'anxiety',
    text: '잠들기 전에 안 좋은 일들이 자꾸 떠올라서 마음이 가라앉지 않는다',
    situational_tags: ['bedtime'],
  },
  {
    id: 's_anxiety_4',
    subcategory: 'anxiety',
    text: '누군가 나를 안 좋게 평가할까봐 사람들과 있을 때 늘 긴장하게 된다',
    situational_tags: ['social'],
  },
  {
    id: 's_anxiety_custom',
    subcategory: 'anxiety',
    text: '직접 입력',
    is_custom: true,
    situational_tags: [],
  },
]

goals = {
  's_anxiety_1': {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_anxiety_1_s',
        template: '불안한 느낌이 들 때, [지속시간] 안에는 조금 가라앉는 경험을 해보고 싶다',
        blanks: { '지속시간': ['몇 분', '10분', '30분'] },
      },
      {
        level: 'medium',
        id: 'g_anxiety_1_m',
        template: '[시간대]에는 불안한 느낌이 덜 찾아왔으면 좋겠다',
        blanks: { '시간대': ['하루 중 한 번쯔음', '아침 시간에', '잠들기 전에'] },
      },
      {
        level: 'large',
        id: 'g_anxiety_1_l',
        template: '불안한 느낌이 하루 전체를 덮어버리지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },
  's_anxiety_2': {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_anxiety_2_s',
        template: '[장소]에 가기 전부터 미리 너무 불안해지지는 않았으면 좋겠다',
        blanks: { '장소': ['지하철 타러', '엘리베이터 타러', '사람 많은 곳 가러'] },
      },
      {
        level: 'medium',
        id: 'g_anxiety_2_m',
        template: '[정도] 큰 동요 없이 [장소]을 할 수 있었으면 좋겠다',
        blanks: {
          '정도': ['한 정거장 정도는', '한 층 정도는', '잠깐은'],
          '장소': ['지하철 타기', '엘리베이터 타기', '사람 많은 곳에 머물기'],
        },
      },
      {
        level: 'large',
        id: 'g_anxiety_2_l',
        template: '출퇴근길이나 사람 많은 곳이 더 이상 두렵지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },
  's_anxiety_3': {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_anxiety_3_s',
        template: '잠들기 전 떠오르는 생각들을 [방법]으로 잠시 내려놓을 수 있었으면 좋겠다',
        blanks: { '방법': ['적어두는 것', '호흡으로', '다른 생각으로 돌리는 것'] },
      },
      {
        level: 'medium',
        id: 'g_anxiety_3_m',
        template: '잠들기까지 걸리는 시간이 [목표시간] 정도로 줄었으면 좋겠다',
        blanks: { '목표시간': ['30분', '20분', '10분'] },
      },
      {
        level: 'large',
        id: 'g_anxiety_3_l',
        template: '침대에 누웠을 때 마음이 비교적 편안하게 가라앉았으면 좋겠다',
        blanks: {},
      },
    ],
  },
  's_anxiety_4': {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_anxiety_4_s',
        template: '사람들과 있을 때 [부위]의 긴장이 조금은 덜했으면 좋겠다',
        blanks: { '부위': ['어깨', '목', '가슴'] },
      },
      {
        level: 'medium',
        id: 'g_anxiety_4_m',
        template: '[상황]에서 너무 평가받는다는 느낌 없이 있을 수 있었으면 좋겠다',
        blanks: { '상황': ['친한 사람들과의 자리', '회의나 모임', '낯선 사람과의 대화'] },
      },
      {
        level: 'large',
        id: 'g_anxiety_4_l',
        template: '사람들과 있는 시간이 긴장보다 편안함이 더 큰 시간이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },
}

routines = {
  's_anxiety_1': [
    {
      id: 'rt_anxiety_1_breathing',
      template: '[시점]에 [시간] 동안 복식호흡 하기',
      blanks: { '시점': ['아침에', '불안할 때', '자기 전에'], '시간': ['1분', '3분', '5분'] },
      situational_tags: [],
    },
    {
      id: 'rt_anxiety_1_note',
      template: '불안한 생각이 들 때 한 줄로 적어두기',
      blanks: {},
      situational_tags: [],
    },
    {
      id: 'rt_anxiety_1_grounding',
      template: '[방법]으로 지금 이 순간에 집중해보기',
      blanks: { '방법': ['주변 사물 5가지 찾아보기', '발바닥 감각 느껴보기', '손에 닿는 것 만져보기'] },
      situational_tags: [],
    },
  ],
  's_anxiety_2': [
    {
      id: 'rt_anxiety_2_breathing_before',
      template: '[장소] 타기 직전에 [시간] 동안 천천히 숨 쉬기',
      blanks: { '장소': ['지하철', '엘리베이터'], '시간': ['30초', '1분'] },
      situational_tags: ['subway', 'crowd'],
    },
    {
      id: 'rt_anxiety_2_safe_object',
      template: '주머니나 가방에 마음이 편해지는 물건 하나 챙기기',
      blanks: {},
      situational_tags: ['subway', 'crowd'],
    },
    {
      id: 'rt_anxiety_2_music',
      template: '이동 중에는 좋아하는 음악이나 팟캐스트 틀어두기',
      blanks: {},
      situational_tags: ['subway'],
    },
  ],
  's_anxiety_3': [
    {
      id: 'rt_anxiety_3_phone_down',
      template: '자기 전 [시간] 동안 핸드폰 내려놓기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: ['bedtime'],
    },
    {
      id: 'rt_anxiety_3_worry_note',
      template: '오늘 마음에 남는 걱정 한 가지를 적어두고 내일로 미뤄두기',
      blanks: {},
      situational_tags: ['bedtime'],
    },
    {
      id: 'rt_anxiety_3_routine_sound',
      template: '자기 전 [방법]으로 마음을 가라앉히기',
      blanks: { '방법': ['좋아하는 소리(백색소음, 음악) 듣기', '가벼운 스트레칭', '따뜻한 물 한 잔 마시기'] },
      situational_tags: ['bedtime'],
    },
  ],
  's_anxiety_4': [
    {
      id: 'rt_anxiety_4_breathing_before_social',
      template: '[상황] 전에 잠깐 호흡 가다듬기',
      blanks: { '상황': ['모임', '회의', '약속'] },
      situational_tags: ['social'],
    },
    {
      id: 'rt_anxiety_4_one_thing',
      template: '사람들과 있을 때 잘하려고 하기보다, [목표] 하나만 정해두기',
      blanks: { '목표': ['짧게 인사하기', '한 마디만 보태기', '편하게 듣기만 하기'] },
      situational_tags: ['social'],
    },
    {
      id: 'rt_anxiety_4_after_care',
      template: '사람들과 만난 후, 혼자만의 시간 [시간] 갖기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: ['social'],
    },
  ],
}
```

### 예시 B. relation > family (가족)

```js
current_states.relation (family 항목들) = [
  {
    id: 'r_family_1',
    subcategory: 'family',
    text: '집에 있어도 가족과 대화 없이 각자 방에서 시간을 보낸다',
    situational_tags: [],
  },
  {
    id: 'r_family_2',
    subcategory: 'family',
    text: '가족이 내 상태에 대해 물어보면 짜증이 나거나 피하고 싶어진다',
    situational_tags: [],
  },
  {
    id: 'r_family_3',
    subcategory: 'family',
    text: '별일 아닌데도 가족에게 화를 내고 나서 후회하는 일이 반복된다',
    situational_tags: [],
  },
  {
    id: 'r_family_4',
    subcategory: 'family',
    text: '가족에게 내가 짐이 되는 것 같아서 마음이 무겁다',
    situational_tags: [],
  },
  {
    id: 'r_family_custom',
    subcategory: 'family',
    text: '직접 입력',
    is_custom: true,
    situational_tags: [],
  },
]

goals = {
  'r_family_1': {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_family_1_s',
        template: '[가족구성원]과 짧은 인사라도 나눌 수 있었으면 좋겠다',
        blanks: { '가족구성원': ['부모님', '형제/자매', '배우자', '자녀'] },
      },
      {
        level: 'medium',
        id: 'g_family_1_m',
        template: '[빈도] 가족과 함께 식사하거나 짧게 이야기 나누는 시간이 있었으면 좋겠다',
        blanks: { '빈도': ['하루에 한 번은', '일주일에 2~3번은', '주말에는'] },
      },
      {
        level: 'large',
        id: 'g_family_1_l',
        template: '가족과 같은 공간에 있는 시간이 불편하지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },
  'r_family_2': {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_family_2_s',
        template: '가족이 물어볼 때, [반응]으로라도 대답할 수 있었으면 좋겠다',
        blanks: { '반응': ['짧게', '괜찮다고만이라도', '나중에 말한다고'] },
      },
      {
        level: 'medium',
        id: 'g_family_2_m',
        template: '내 상태에 대한 질문이 [느낌]으로 덜 느껴졌으면 좋겠다',
        blanks: { '느낌': ['부담', '간섭', '평가'] },
      },
      {
        level: 'large',
        id: 'g_family_2_l',
        template: '가족에게 내 상태를 솔직하게 이야기할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },
  'r_family_3': {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_family_3_s',
        template: '화가 날 때 [행동]을 먼저 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['그 자리를 잠깐 벗어나는 것', '숫자를 세는 것', '심호흡을 하는 것'] },
      },
      {
        level: 'medium',
        id: 'g_family_3_m',
        template: '화를 낸 뒤에 [행동]을 할 수 있었으면 좋겠다',
        blanks: { '행동': ['짧게라도 사과하는 것', '왜 그랬는지 설명하는 것', '먼저 다가가는 것'] },
      },
      {
        level: 'large',
        id: 'g_family_3_l',
        template: '작은 일로 가족에게 화를 내는 일이 줄었으면 좋겠다',
        blanks: {},
      },
    ],
  },
  'r_family_4': {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_family_4_s',
        template: '가족에게 짐이 된다는 생각이 들 때, [행동]을 떠올려볼 수 있었으면 좋겠다',
        blanks: { '행동': ['그게 사실인지 한 번 의심해보는 것', '가족이 실제로 한 말을 떠올려보는 것'] },
      },
      {
        level: 'medium',
        id: 'g_family_4_m',
        template: '가족에게 [작은것]을 표현할 수 있었으면 좋겠다',
        blanks: { '작은것': ['고맙다는 말', '미안하다는 말', '요즘 어떤지 한 마디'] },
      },
      {
        level: 'large',
        id: 'g_family_4_l',
        template: '가족과의 관계에서 내가 짐이 아니라 함께하는 사람이라는 느낌이 들었으면 좋겠다',
        blanks: {},
      },
    ],
  },
}

routines = {
  'r_family_1': [
    {
      id: 'rt_family_1_greeting',
      template: '[시점]에 가족에게 짧게 인사하기',
      blanks: { '시점': ['하루에 한 번', '아침에', '자기 전에'] },
      situational_tags: [],
    },
    {
      id: 'rt_family_1_meal',
      template: '[빈도] 가족과 같은 시간에 식사하기',
      blanks: { '빈도': ['일주일에 한 번', '일주일에 두 번', '매일 한 끼는'] },
      situational_tags: [],
    },
    {
      id: 'rt_family_1_share',
      template: '오늘 있었던 일 한 가지를 가족에게 짧게 이야기하기',
      blanks: {},
      situational_tags: [],
    },
  ],
  'r_family_2': [
    {
      id: 'rt_family_2_short_answer',
      template: '바로 답하기 어려우면 "[표현]"이라고 먼저 말해두기',
      blanks: { '표현': ['지금은 좀 힘들어', '이따 얘기해도 될까', '괜찮아, 고마워'] },
      situational_tags: [],
    },
    {
      id: 'rt_family_2_journal',
      template: '가족에게 하고 싶은 말을 먼저 일기에 적어보기',
      blanks: {},
      situational_tags: [],
    },
  ],
  'r_family_3': [
    {
      id: 'rt_family_3_pause',
      template: '화가 올라올 때 [방법]으로 잠깐 멈추기',
      blanks: { '방법': ['숨을 세 번 깊게 쉬는 것', '잠깐 다른 방으로 가는 것', '물 한 잔 마시는 것'] },
      situational_tags: [],
    },
    {
      id: 'rt_family_3_note_after',
      template: '화낸 뒤, 오늘 기분과 상황을 짧게 기록해보기',
      blanks: {},
      situational_tags: [],
    },
  ],
  'r_family_4': [
    {
      id: 'rt_family_4_thanks',
      template: '가족에게 "[표현]" 같은 말 한 마디 해보기',
      blanks: { '표현': ['고마워', '오늘 도와줘서 고마웠어', '같이 있어줘서 좋아'] },
      situational_tags: [],
    },
    {
      id: 'rt_family_4_reframe',
      template: '"짐이 된다"는 생각이 들 때, 그 생각을 적어두고 다시 읽어보기',
      blanks: {},
      situational_tags: [],
    },
  ],
}
```

---

## 4. 생성 작업 범위 (위 패턴대로 빠짐없이 작성)

각 하위카테고리마다 **current_states 4~5개(직접입력 포함) + 각 state별 목표 사다리 3단계
+ 루틴 2~3개**를 위 예시와 동일한 밀도로 작성해줘.

- **symptom**: mood(기분/감정), sleep(수면), cognition(생각/집중), physical(신체증상),
  impulse(감정조절/충동) — anxiety는 예시 A로 완성됨
- **function**: daily_routine(일상 루틴), work_study(직업/학업), household(집안일/책임),
  self_care(자기관리)
- **relation**: friend(친구), partner(연인/배우자), work_social(직장/사회생활),
  isolation(전반적인 고립감) — family는 예시 B로 완성됨
- **meaning**: direction(삶의 의미/방향), identity(자기이해/정체성), enjoyment(즐거움/취미),
  autonomy(주체성/자율성)

### 콘텐츠 작성 가이드라인 (전 항목 공통)

- **추상어 대신 장면을 그릴 것.** "불안하다"가 아니라 "지하철에서 심장이 빨라진다"처럼
  구체적 상황/신체감각/행동으로 표현.
- **목표 문장 톤은 "~됐으면 좋겠다" / "~할 수 있었으면 좋겠다"로 통일.** (바람의 언어,
  의무가 아닌 희망)
- **medium 단계에는 빈칸을 1~2개 넣어 개인화.** small/large는 빈칸 없어도 됨.
- **루틴은 2~3개 중 최소 1개는 매드립.** 빈칸 선택지는 2~3개면 충분.
- **빈도/시간 관련 빈칸은 단계적으로 구성** (예: 1분/3분/5분, 하루에 한 번/일주일에
  한 번/한 달에 한 번) — 추후 난이도 조절에 활용 가능.
- 정신과적으로 부담을 주지 않는 표현 사용. "해야 한다"가 아니라 "~해볼 수 있다",
  "~했으면 좋겠다".
- `is_custom: true` 항목은 모든 하위카테고리에 1개씩 포함 (목표/루틴은 생성하지 않음).

---

## 5. UI / 컴포넌트 작업

### 5.1 현재 어려움 선택 화면 (2단계)

- 1단계: 선택한 도메인의 `subcategories` 카드 그리드 (복수 선택 가능)
- 2단계: 선택한 하위카테고리별로 화면을 순서대로 보여주고, 해당
  `current_states` 리스트에서 복수 선택. 마지막에 "직접 입력" 카드 항상 노출.
- 진행 표시: "n / 전체 선택한 하위카테고리 수"

### 5.2 목표 사다리 선택 화면

- 선택한 각 state에 대해, 해당 `goals[state.id].ladder` 3단계를 카드로 나열
  (small / medium / large를 "조금씩 / 어느 정도 / 크게" 같은 라벨로 표시)
- 빈칸(`template`의 `[빈칸]`)이 있는 단계는 인라인 `<select>`로 렌더링하고,
  선택 즉시 문장이 완성되어 보이도록 처리 (실시간 치환)
- 사용자가 단계를 선택하면 해당 단계의 `id` + 채운 빈칸 값들을 저장
  (`selectedGoals`에 `{ goalId, filledBlanks }` 형태로)
- `is_custom` state는: 자유 텍스트 입력 1개만 받고 별도 처리 (사다리 없음)
- 기존 제약 유지: state(=목표) 선택은 영역당 최대 3개

### 5.3 루틴 추천 화면

- `routines[state.id]` 풀에서 추천 리스트 구성
- `situational_tags`가 선택한 state의 `situational_tags`와 겹치는 루틴을 상단 배치
- 매드립 루틴은 목표 화면과 동일하게 인라인 `<select>`로 빈칸 채움
- 각 루틴 카드에 **새로고침(스왑) 아이콘** 추가: 클릭 시 같은 풀에서 다른 루틴으로
  교체 (현재 보여준 적 없는 것 우선, 다 보여줬으면 처음부터 다시 순환)
- 기존 제약 유지: 전체 루틴 최대 5개

### 5.4 매드립 렌더링 공통 유틸

`template` 문자열의 `[빈칸이름]`을 파싱해서 `<select>`로 변환하고, 변경 시
실시간으로 완성된 문장을 보여주는 공통 함수를 만들어줘.

```js
// 예시 시그니처
function renderTemplate(template, blanks, selectedValues) {
  // template: '[시점]에 [시간] 동안 복식호흡 하기'
  // blanks: { 시점: [...], 시간: [...] }
  // selectedValues: { 시점: '아침에', 시간: '3분' } (없으면 blanks의 첫 값을 기본값으로)
  // return: { text: '아침에 3분 동안 복식호흡 하기', blankKeys: ['시점','시간'] }
}
```

---

## 6. 비즈니스 로직 / userSession 변경

- `selectedStates`: 기존과 동일하게 `Record<domain, string[]>` (state id 배열) 유지
- `selectedGoals`: `Record<domain, Array<{ stateId, goalId, level, filledBlanks }>>`
  형태로 변경 (최대 3개/도메인 유지)
- `selectedRoutines`: `Array<{ routineId, stateId, filledBlanks }>` (최대 5개 유지)
- `getFilteredGoals` 함수는 더 이상 필요 없음 (state:goal이 1:1이므로) →
  대신 `getGoalLadder(stateId)` 함수로 대체
- `getRecommendedRoutines(selectedStateIds)` 함수: 선택한 state들의 루틴 풀을
  모아서 situational_tags 매칭 항목을 우선 정렬, 텍스트 기준 중복 제거
- 최종적으로 저장/표시되는 목표·루틴 "완성 문장"은 항상
  `renderTemplate(...).text`로 생성 (DB에는 template id + filledBlanks만 저장)

---

## 7. 마이그레이션 / 호환성

- 기존 `goalData.js`는 `goalData.legacy.js`로 보존
- 기존에 저장된 `userSession` (localStorage `goal_session`)이 새 구조와
  맞지 않으면, `load()` 시점에 구조 검증 후 맞지 않으면 초기화
  (마이그레이션 스크립트는 별도로 만들지 않아도 됨 — 베타 단계라 데이터 손실 허용)

---

## 8. 완료 후 체크리스트

- [ ] 모든 도메인 x 모든 하위카테고리에 current_states 4~5개 (직접입력 포함) 존재
- [ ] 모든 non-custom state에 goal ladder 3단계 존재, medium에 빈칸 1~2개
- [ ] 모든 non-custom state에 routine 2~3개 존재, 최소 1개는 매드립
- [ ] renderTemplate 유틸 + 단위 테스트(간단히)
- [ ] 2단계 선택 UI (하위카테고리 → 항목)
- [ ] 목표 사다리 UI (3단계 + 인라인 빈칸)
- [ ] 루틴 추천 UI (상황 매칭 우선순위 + 스왑 버튼 + 인라인 빈칸)
- [ ] userSession 구조 변경 및 localStorage 저장/복원 검증