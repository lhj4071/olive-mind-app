// src/constants/goalData.ts
// 치료 목표 설정 + 루틴 연동 — 새 데이터 구조 (v2)
// 기존 구조는 goalData.legacy.ts 에 보존됨.

// ── 타입 정의 ──────────────────────────────────────────────────────────────────

export type Domain = 'symptom' | 'function' | 'relation' | 'meaning';

export interface SubcategoryDef {
  id: string;
  label: string;
}

export interface CurrentStateItem {
  id: string;
  subcategory: string;
  text: string;
  is_custom?: boolean;
  situational_tags: string[];
}

export interface GoalLadderLevel {
  level: 'small' | 'medium' | 'large';
  id: string;
  template: string;
  blanks: Record<string, string[]>;
}

export interface GoalDefinition {
  domain: Domain;
  ladder: GoalLadderLevel[];
}

export interface RoutineItem {
  id: string;
  template: string;
  blanks: Record<string, string[]>;
  situational_tags: string[];
  emoji?: string;
}

// ── 도메인 목록 ────────────────────────────────────────────────────────────────

export const DOMAINS: Domain[] = ['symptom', 'function', 'relation', 'meaning'];

export const DOMAIN_LABELS: Record<Domain, string> = {
  symptom:  '증상',
  function: '기능',
  relation: '관계',
  meaning:  '의미',
};

// ── 하위카테고리 (2.1절) ───────────────────────────────────────────────────────

export const SUBCATEGORIES: Record<Domain, SubcategoryDef[]> = {
  symptom: [
    { id: 'mood',      label: '기분 / 감정' },
    { id: 'anxiety',   label: '불안 / 두려움' },
    { id: 'sleep',     label: '수면' },
    { id: 'cognition', label: '생각 / 집중' },
    { id: 'physical',  label: '신체 증상' },
    { id: 'impulse',   label: '감정 조절 / 충동' },
  ],
  function: [
    { id: 'daily_routine', label: '일상 루틴' },
    { id: 'work_study',    label: '직업 / 학업' },
    { id: 'household',     label: '집안일 / 책임' },
    { id: 'self_care',     label: '자기관리' },
  ],
  relation: [
    { id: 'family',      label: '가족' },
    { id: 'friend',      label: '친구' },
    { id: 'partner',     label: '연인 / 배우자' },
    { id: 'work_social', label: '직장 / 사회생활' },
    { id: 'isolation',   label: '전반적인 고립감' },
  ],
  meaning: [
    { id: 'direction', label: '삶의 의미 / 방향' },
    { id: 'identity',  label: '자기 이해 / 정체성' },
    { id: 'enjoyment', label: '즐거움 / 취미' },
    { id: 'autonomy',  label: '주체성 / 자율성' },
  ],
};

// ── 현재 상태 데이터 ───────────────────────────────────────────────────────────
// 채워진 하위카테고리: symptom > mood/anxiety/sleep/cognition/physical/impulse
//                      function > daily_routine/work_study/household/self_care
//                      relation > family/friend/partner/work_social/isolation
//                      meaning > direction
// 모든 하위카테고리 채워짐.

export const CURRENT_STATES: Record<Domain, CurrentStateItem[]> = {
  symptom: [
    // ── mood (기분 / 감정) ────────────────────────────────────────────────────
    {
      id: 's_mood_1',
      subcategory: 'mood',
      text: '아침에 눈을 뜨는 순간부터 이유 모를 무거움이 느껴지고, 하루를 시작하기가 몹시 싫다',
      situational_tags: ['morning'],
    },
    {
      id: 's_mood_2',
      subcategory: 'mood',
      text: '예전에 좋아하던 것들을 해도 즐거운 느낌이 전혀 들지 않고 그냥 시간이 흘러간다',
      situational_tags: [],
    },
    {
      id: 's_mood_3',
      subcategory: 'mood',
      text: '별일 아닌데도 눈물이 나거나, 이유 없이 감정이 울컥 올라와서 당황스럽다',
      situational_tags: [],
    },
    {
      id: 's_mood_4',
      subcategory: 'mood',
      text: '기분이 갑자기 뚝 떨어지는 순간이 있고, 그게 언제 올지 몰라서 두렵다',
      situational_tags: [],
    },
    {
      id: 's_mood_custom',
      subcategory: 'mood',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── anxiety (불안 / 두려움) ────────────────────────────────────────────────
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
    // ── sleep (수면) ──────────────────────────────────────────────────────────
    {
      id: 's_sleep_1',
      subcategory: 'sleep',
      text: '누워도 한참 동안 잠이 오지 않고, 잠드는 데 1시간 이상 걸릴 때가 많다',
      situational_tags: ['bedtime'],
    },
    {
      id: 's_sleep_2',
      subcategory: 'sleep',
      text: '자다가 여러 번 깨고, 한 번 깨면 다시 잠들기가 어렵다',
      situational_tags: ['bedtime'],
    },
    {
      id: 's_sleep_3',
      subcategory: 'sleep',
      text: '충분히 잔 것 같은데도 아침에 일어나면 여전히 피곤하고 개운한 느낌이 없다',
      situational_tags: ['morning'],
    },
    {
      id: 's_sleep_4',
      subcategory: 'sleep',
      text: '주말이나 쉬는 날에 너무 많이 자고 나서 오히려 더 무기력해지고 리듬이 무너진다',
      situational_tags: [],
    },
    {
      id: 's_sleep_custom',
      subcategory: 'sleep',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── cognition (생각 / 집중) ───────────────────────────────────────────────
    {
      id: 's_cog_1',
      subcategory: 'cognition',
      text: '한 가지 일을 시작해도 금방 딴생각이 나고, 10분 이상 집중하기가 어렵다',
      situational_tags: ['work_study'],
    },
    {
      id: 's_cog_2',
      subcategory: 'cognition',
      text: '평소에 쉽게 하던 일인데 지금은 머릿속이 안개 낀 것처럼 흐릿하고 느리다',
      situational_tags: [],
    },
    {
      id: 's_cog_3',
      subcategory: 'cognition',
      text: '머릿속에서 같은 걱정이나 생각이 계속 맴돌고, 그만하려 해도 잘 안 된다',
      situational_tags: [],
    },
    {
      id: 's_cog_4',
      subcategory: 'cognition',
      text: '결정해야 할 일이 생기면 뭘 골라야 할지 몰라서 계속 미루고 결정을 피하게 된다',
      situational_tags: [],
    },
    {
      id: 's_cog_custom',
      subcategory: 'cognition',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── physical (신체 증상) ──────────────────────────────────────────────────
    {
      id: 's_phy_1',
      subcategory: 'physical',
      text: '온몸이 늘 무겁고 피곤한데, 푹 쉬어도 좀처럼 나아지지 않는다',
      situational_tags: [],
    },
    {
      id: 's_phy_2',
      subcategory: 'physical',
      text: '두통이나 어깨·목의 통증이 자주 있고, 몸에 긴장이 늘 쌓여 있는 것 같다',
      situational_tags: [],
    },
    {
      id: 's_phy_3',
      subcategory: 'physical',
      text: '긴장하거나 스트레스를 받으면 속이 불편하거나 식욕이 뚝 떨어진다',
      situational_tags: ['stress'],
    },
    {
      id: 's_phy_4',
      subcategory: 'physical',
      text: '몸 움직이기가 싫고, 운동이나 산책을 한동안 전혀 못 하고 있다',
      situational_tags: [],
    },
    {
      id: 's_phy_custom',
      subcategory: 'physical',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── impulse (감정 조절 / 충동) ───────────────────────────────────────────
    {
      id: 's_imp_1',
      subcategory: 'impulse',
      text: '작은 일에도 욱 하고 폭발하고 나서 후회하는 패턴이 반복된다',
      situational_tags: [],
    },
    {
      id: 's_imp_2',
      subcategory: 'impulse',
      text: '화가 나거나 감정이 격해지면 폭식을 하거나 술을 마시게 된다',
      situational_tags: [],
    },
    {
      id: 's_imp_3',
      subcategory: 'impulse',
      text: '충동적으로 한 행동(충동구매, SNS 과몰입, 폭식 등)을 나중에 후회하는 일이 잦다',
      situational_tags: [],
    },
    {
      id: 's_imp_4',
      subcategory: 'impulse',
      text: '감정이 너무 격해지면 물건을 부수거나 소리를 지르는 식으로 분출하고 싶어진다',
      situational_tags: [],
    },
    {
      id: 's_imp_custom',
      subcategory: 'impulse',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
  ],

  function: [
    // ── daily_routine (일상 루틴) ─────────────────────────────────────────────
    {
      id: 'f_dr_1',
      subcategory: 'daily_routine',
      text: '아침에 일어나는 것 자체가 너무 힘들고, 기상 시간이 매일 들쑥날쑥하다',
      situational_tags: ['morning'],
    },
    {
      id: 'f_dr_2',
      subcategory: 'daily_routine',
      text: '밥을 제대로 못 챙겨 먹거나, 먹더라도 끼니를 건너뛰는 날이 많다',
      situational_tags: [],
    },
    {
      id: 'f_dr_3',
      subcategory: 'daily_routine',
      text: '씻거나 옷 입는 것 같은 기본적인 준비조차 너무 버겁게 느껴진다',
      situational_tags: ['morning'],
    },
    {
      id: 'f_dr_4',
      subcategory: 'daily_routine',
      text: '하루가 어떻게 지나갔는지 모르게 흘러가고, 아무것도 못 한 것 같은 날이 반복된다',
      situational_tags: [],
    },
    {
      id: 'f_dr_custom',
      subcategory: 'daily_routine',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── work_study (직업 / 학업) ──────────────────────────────────────────────
    {
      id: 'f_ws_1',
      subcategory: 'work_study',
      text: '출근이나 등교를 매번 버티듯 간신히 가고 있고, 집을 나서기 전부터 이미 지쳐 있다',
      situational_tags: ['morning', 'work_study'],
    },
    {
      id: 'f_ws_2',
      subcategory: 'work_study',
      text: '일이나 공부를 시작하면 30분도 집중하기 어렵고, 자꾸 딴짓을 하게 된다',
      situational_tags: ['work_study'],
    },
    {
      id: 'f_ws_3',
      subcategory: 'work_study',
      text: '마감이나 해야 할 일을 자꾸 미루다가 결국 마지막에 몰아서 하게 된다',
      situational_tags: ['work_study'],
    },
    {
      id: 'f_ws_4',
      subcategory: 'work_study',
      text: '직장이나 학교에서 동료·친구들과 소통하는 것이 피하고 싶고 에너지를 너무 많이 쏟는다',
      situational_tags: ['work_study', 'social'],
    },
    {
      id: 'f_ws_custom',
      subcategory: 'work_study',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── household (집안일 / 책임) ─────────────────────────────────────────────
    {
      id: 'f_hh_1',
      subcategory: 'household',
      text: '집안일이 손에 잡히지 않아 설거지, 빨래, 청소가 계속 쌓여만 간다',
      situational_tags: [],
    },
    {
      id: 'f_hh_2',
      subcategory: 'household',
      text: '청구서 납부, 행정 처리, 약속 확인 같은 것들을 자꾸 미루고 있다',
      situational_tags: [],
    },
    {
      id: 'f_hh_3',
      subcategory: 'household',
      text: '장 보거나 음식을 준비하는 것 같은 기본적인 생활 관리가 안 되고 있다',
      situational_tags: [],
    },
    {
      id: 'f_hh_4',
      subcategory: 'household',
      text: '가족이나 반려동물 등 돌봐야 하는 존재가 있는데, 그 책임이 너무 버겁게 느껴진다',
      situational_tags: [],
    },
    {
      id: 'f_hh_custom',
      subcategory: 'household',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── self_care (자기관리) ──────────────────────────────────────────────────
    {
      id: 'f_sc_1',
      subcategory: 'self_care',
      text: '약 먹는 것조차 자꾸 잊어버리거나, 병원 예약을 계속 미루고 있다',
      situational_tags: [],
    },
    {
      id: 'f_sc_2',
      subcategory: 'self_care',
      text: '샤워, 머리 감기 같은 기본적인 몸 관리를 며칠씩 미루고 있다',
      situational_tags: [],
    },
    {
      id: 'f_sc_3',
      subcategory: 'self_care',
      text: '좋아하는 것이나 쉬는 것을 스스로에게 허락하지 못하고 항상 뭔가 해야 한다는 압박을 느낀다',
      situational_tags: [],
    },
    {
      id: 'f_sc_4',
      subcategory: 'self_care',
      text: '몸이 보내는 신호(배고픔, 피로, 통증)를 무시하고 계속 억지로 버티고 있다',
      situational_tags: [],
    },
    {
      id: 'f_sc_custom',
      subcategory: 'self_care',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
  ],

  relation: [
    // ── family (가족) ─────────────────────────────────────────────────────────
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
    // ── friend (친구) ─────────────────────────────────────────────────────────
    {
      id: 'r_fr_1',
      subcategory: 'friend',
      text: '친한 친구에게 연락을 오래 안 하고 있고, 먼저 연락하기가 어렵다',
      situational_tags: [],
    },
    {
      id: 'r_fr_2',
      subcategory: 'friend',
      text: '친구가 연락을 해와도 답장하기 싫거나 만나는 게 부담스러워서 계속 피하게 된다',
      situational_tags: [],
    },
    {
      id: 'r_fr_3',
      subcategory: 'friend',
      text: '친구들과 있을 때 예전처럼 편하지 않고, 겉도는 느낌이 든다',
      situational_tags: ['social'],
    },
    {
      id: 'r_fr_4',
      subcategory: 'friend',
      text: '비슷한 또래의 친구들이 잘 지내는 것 같아서 비교가 되고 마음이 무거워진다',
      situational_tags: [],
    },
    {
      id: 'r_fr_custom',
      subcategory: 'friend',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── partner (연인 / 배우자) ───────────────────────────────────────────────
    {
      id: 'r_pt_1',
      subcategory: 'partner',
      text: '예전보다 파트너와 대화가 많이 줄었고, 같이 있어도 각자 시간을 보내는 날이 많아졌다',
      situational_tags: [],
    },
    {
      id: 'r_pt_2',
      subcategory: 'partner',
      text: '파트너가 내 상태에 대해 걱정하거나 물어볼 때 짜증이 나거나 미안해진다',
      situational_tags: [],
    },
    {
      id: 'r_pt_3',
      subcategory: 'partner',
      text: '작은 일에도 파트너와 다투게 되고, 같은 패턴이 반복되는 것 같다',
      situational_tags: [],
    },
    {
      id: 'r_pt_4',
      subcategory: 'partner',
      text: '파트너에게 내 감정이나 힘든 것을 솔직하게 말하기가 어렵다',
      situational_tags: [],
    },
    {
      id: 'r_pt_custom',
      subcategory: 'partner',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── work_social (직장 / 사회생활) ────────────────────────────────────────
    {
      id: 'r_ws_1',
      subcategory: 'work_social',
      text: '직장에서 동료들과 어울리는 것이 에너지를 너무 많이 쏟아야 해서 점점 피하게 된다',
      situational_tags: ['work_study', 'social'],
    },
    {
      id: 'r_ws_2',
      subcategory: 'work_social',
      text: '회의나 발표, 전화 같은 상황이 생기면 지나치게 긴장되고 피하고 싶어진다',
      situational_tags: ['work_study'],
    },
    {
      id: 'r_ws_3',
      subcategory: 'work_social',
      text: '직장에서 실수를 하거나 혼날까봐 늘 눈치를 보고 긴장한 채로 지낸다',
      situational_tags: ['work_study'],
    },
    {
      id: 'r_ws_4',
      subcategory: 'work_social',
      text: '모임, 회식, 네트워킹 자리에 나가야 할 때 극도로 불안하거나 핑계를 대고 빠지게 된다',
      situational_tags: ['social'],
    },
    {
      id: 'r_ws_custom',
      subcategory: 'work_social',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── isolation (전반적인 고립감) ──────────────────────────────────────────────
    {
      id: 'r_iso_1',
      subcategory: 'isolation',
      text: '연락하고 싶은 사람이 없고, 하루 종일 아무와도 말을 안 해도 예전처럼 이상하게 느껴지지 않는다',
      situational_tags: [],
    },
    {
      id: 'r_iso_2',
      subcategory: 'isolation',
      text: '사람들과 같은 공간에 있어도 유리벽 너머로 보는 것처럼 멀게 느껴지고, 혼자인 것 같다',
      situational_tags: ['social'],
    },
    {
      id: 'r_iso_3',
      subcategory: 'isolation',
      text: '연락이 와도 답장을 미루다 결국 안 하게 되고, 점점 사람들이 멀어지는 것 같다',
      situational_tags: [],
    },
    {
      id: 'r_iso_4',
      subcategory: 'isolation',
      text: '내 힘든 것을 털어놓아도 아무도 이해 못 할 것 같아서 혼자 삼키게 된다',
      situational_tags: [],
    },
    {
      id: 'r_iso_custom',
      subcategory: 'isolation',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
  ],

  // ── meaning ───────────────────────────────────────────────────────────────────
  meaning: [
    // ── direction (삶의 의미 / 방향) ──────────────────────────────────────────
    {
      id: 'm_dir_1',
      subcategory: 'direction',
      text: '예전에는 하고 싶은 것이 있었는데, 요즘은 무엇을 하고 싶은지조차 모르겠다',
      situational_tags: [],
    },
    {
      id: 'm_dir_2',
      subcategory: 'direction',
      text: '매일 같은 하루가 반복되는데 이 삶이 어디로 가고 있는지 모르겠다는 생각이 든다',
      situational_tags: [],
    },
    {
      id: 'm_dir_3',
      subcategory: 'direction',
      text: '남들은 목표를 가지고 열심히 살아가는 것 같은데, 나만 뒤처지는 것 같아서 조급해진다',
      situational_tags: [],
    },
    {
      id: 'm_dir_4',
      subcategory: 'direction',
      text: '지금 하는 일(학업/직장/생활)이 의미 있는지 모르겠고, 계속해야 하는 이유를 잃어버렸다',
      situational_tags: ['work_study'],
    },
    {
      id: 'm_dir_custom',
      subcategory: 'direction',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── identity (자기 이해 / 정체성) ────────────────────────────────────────────
    {
      id: 'm_id_1',
      subcategory: 'identity',
      text: '내가 어떤 사람인지, 무엇을 중요하게 여기는지 점점 모르겠다는 느낌이 든다',
      situational_tags: [],
    },
    {
      id: 'm_id_2',
      subcategory: 'identity',
      text: '상황이나 상대방에 따라 내가 달라지는 것 같아서, 진짜 내가 어디 있는지 모르겠다',
      situational_tags: ['social'],
    },
    {
      id: 'm_id_3',
      subcategory: 'identity',
      text: '예전의 나와 지금의 내가 너무 달라서, 지금 이 모습이 진짜 나인지 낯설다',
      situational_tags: [],
    },
    {
      id: 'm_id_4',
      subcategory: 'identity',
      text: '남의 기대나 역할에 맞추다 보니, 내가 진짜 원하는 것이 뭔지 사라져버린 것 같다',
      situational_tags: [],
    },
    {
      id: 'm_id_custom',
      subcategory: 'identity',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── enjoyment (즐거움 / 취미) ─────────────────────────────────────────────
    {
      id: 'm_enj_1',
      subcategory: 'enjoyment',
      text: '예전에는 좋아했던 것들인데, 요즘은 막상 해보면 예전만큼 재미가 없거나 하고 싶지 않다',
      situational_tags: [],
    },
    {
      id: 'm_enj_2',
      subcategory: 'enjoyment',
      text: '뭔가 해보고 싶다는 생각은 드는데, 실제로 시작하려면 몸이 안 움직여진다',
      situational_tags: [],
    },
    {
      id: 'm_enj_3',
      subcategory: 'enjoyment',
      text: '즐거운 것을 해도 죄책감이 들거나, 지금 이걸 즐길 자격이 없다는 생각이 따라온다',
      situational_tags: [],
    },
    {
      id: 'm_enj_4',
      subcategory: 'enjoyment',
      text: '주말이나 쉬는 날에도 무엇을 해야 할지 모르겠고, 그냥 멍하니 시간이 지나버린다',
      situational_tags: [],
    },
    {
      id: 'm_enj_custom',
      subcategory: 'enjoyment',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
    // ── autonomy (주체성 / 자율성) ───────────────────────────────────────────────
    {
      id: 'm_aut_1',
      subcategory: 'autonomy',
      text: '하고 싶지 않은 일도 거절하지 못하고 떠맡게 되고, 나중에 지쳐서 후회한다',
      situational_tags: ['social', 'work_study'],
    },
    {
      id: 'm_aut_2',
      subcategory: 'autonomy',
      text: '무슨 일을 결정할 때 내 의견보다 남이 뭘 원하는지를 먼저 생각하게 된다',
      situational_tags: [],
    },
    {
      id: 'm_aut_3',
      subcategory: 'autonomy',
      text: '내가 선택한 것이 맞는지 자꾸 의심이 되고, 선택 후에도 불안이 가시지 않는다',
      situational_tags: [],
    },
    {
      id: 'm_aut_4',
      subcategory: 'autonomy',
      text: '누군가 내 일정이나 계획을 바꾸려 하면 화가 나거나 무기력해지고, 내 삶을 내가 통제하지 못하는 느낌이 든다',
      situational_tags: [],
    },
    {
      id: 'm_aut_custom',
      subcategory: 'autonomy',
      text: '직접 입력',
      is_custom: true,
      situational_tags: [],
    },
  ],
};

// ── 목표 사다리 (state id → GoalDefinition) ───────────────────────────────────
// is_custom 항목(s_anxiety_custom, r_family_custom)은 자유 입력으로 처리하므로 제외.

export const GOALS: Record<string, GoalDefinition> = {
  // ── symptom > mood ───────────────────────────────────────────────────────────
  s_mood_1: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_mood_1_s',
        template: '아침에 눈을 뜨고 [행동] 하나만 바로 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['물 한 잔 마시기', '커튼 열기', '크게 기지개 켜기'] },
      },
      {
        level: 'medium',
        id: 'g_mood_1_m',
        template: '[시간대]만큼은 아침의 무거운 기분이 조금 덜했으면 좋겠다',
        blanks: { '시간대': ['아침 30분은', '집을 나서기 전까지는', '일어난 직후만큼은'] },
      },
      {
        level: 'large',
        id: 'g_mood_1_l',
        template: '아침에 눈을 떴을 때 하루가 그나마 기대되는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_mood_2: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_mood_2_s',
        template: '예전에 좋아했던 [활동]을 [시간] 만이라도 다시 해볼 수 있었으면 좋겠다',
        blanks: {
          '활동': ['음악 듣기', '산책', '취미 활동'],
          '시간': ['5분', '10분', '잠깐'],
        },
      },
      {
        level: 'medium',
        id: 'g_mood_2_m',
        template: '[활동]을 할 때 예전보다 조금이라도 마음이 움직이는 순간이 있었으면 좋겠다',
        blanks: { '활동': ['음악을 들을 때', '밖에 나가면', '좋아했던 것을 할 때'] },
      },
      {
        level: 'large',
        id: 'g_mood_2_l',
        template: '무언가를 하고 싶다는 마음이 자연스럽게 생기는 날이 왔으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_mood_3: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_mood_3_s',
        template: '감정이 올라올 때 [행동] 하나라도 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['잠깐 멈추는 것', '심호흡하는 것', '그 자리를 잠깐 벗어나는 것'] },
      },
      {
        level: 'medium',
        id: 'g_mood_3_m',
        template: '감정이 올라오는 순간을 [방법]으로 표현해볼 수 있었으면 좋겠다',
        blanks: { '방법': ['일기에 적는 것', '한 단어로 이름 붙이는 것', '그림으로 그리는 것'] },
      },
      {
        level: 'large',
        id: 'g_mood_3_l',
        template: '갑자기 감정이 올라와도 완전히 휩쓸리지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_mood_4: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_mood_4_s',
        template: '기분이 뚝 떨어졌을 때 [행동] 하나는 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['그 자리를 잠깐 벗어나기', '좋아하는 음악 틀기', '물 한 잔 마시기'] },
      },
      {
        level: 'medium',
        id: 'g_mood_4_m',
        template: '기분이 떨어진 뒤 [시간] 안에는 조금 회복되는 경험을 해봤으면 좋겠다',
        blanks: { '시간': ['30분', '1시간', '반나절'] },
      },
      {
        level: 'large',
        id: 'g_mood_4_l',
        template: '기분이 뚝 떨어지는 날이 줄고, 떨어져도 예전만큼 오래 가지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── symptom > sleep ──────────────────────────────────────────────────────────
  s_sleep_1: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_sleep_1_s',
        template: '잠들기 전 [방법]으로 몸과 마음을 조금 가라앉혀볼 수 있었으면 좋겠다',
        blanks: { '방법': ['호흡으로', '따뜻한 물 한 잔으로', '조용한 음악으로'] },
      },
      {
        level: 'medium',
        id: 'g_sleep_1_m',
        template: '잠드는 데 걸리는 시간이 [목표시간] 정도로 줄었으면 좋겠다',
        blanks: { '목표시간': ['30분', '20분', '10분'] },
      },
      {
        level: 'large',
        id: 'g_sleep_1_l',
        template: '누웠을 때 자연스럽게 잠이 드는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_sleep_2: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_sleep_2_s',
        template: '자다가 깼을 때 [행동]으로 다시 잠들어볼 수 있었으면 좋겠다',
        blanks: { '행동': ['눈 감고 호흡에 집중하는 것', '핸드폰 보지 않는 것', '몸의 힘을 빼는 것'] },
      },
      {
        level: 'medium',
        id: 'g_sleep_2_m',
        template: '밤에 깨는 횟수가 [횟수] 줄었으면 좋겠다',
        blanks: { '횟수': ['한 번 이하로', '두 번 이하로', '예전보다 절반으로'] },
      },
      {
        level: 'large',
        id: 'g_sleep_2_l',
        template: '한 번 잠들면 중간에 거의 깨지 않고 쭉 자는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_sleep_3: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_sleep_3_s',
        template: '아침에 일어나서 [행동] 하나로 몸을 깨워볼 수 있었으면 좋겠다',
        blanks: { '행동': ['가벼운 스트레칭', '햇빛 쬐기', '찬물로 세수하기'] },
      },
      {
        level: 'medium',
        id: 'g_sleep_3_m',
        template: '[날]만큼은 아침에 일어날 때 조금 덜 피곤한 경험이 있었으면 좋겠다',
        blanks: { '날': ['주말에는', '쉬는 날에는', '일주일에 하루는'] },
      },
      {
        level: 'large',
        id: 'g_sleep_3_l',
        template: '자고 나면 나름 개운하다는 느낌이 드는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_sleep_4: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_sleep_4_s',
        template: '주말에도 평소보다 [시간] 정도만 더 자는 것을 목표로 해볼 수 있었으면 좋겠다',
        blanks: { '시간': ['1시간', '2시간'] },
      },
      {
        level: 'medium',
        id: 'g_sleep_4_m',
        template: '쉬는 날에도 [활동]을 해서 낮에 너무 처지지 않았으면 좋겠다',
        blanks: { '활동': ['짧게 산책하기', '가벼운 스트레칭', '밖에 잠깐 나가는 것'] },
      },
      {
        level: 'large',
        id: 'g_sleep_4_l',
        template: '쉬는 날에도 일어나서 적당히 움직이는 게 자연스러워졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── symptom > anxiety ────────────────────────────────────────────────────────
  s_anxiety_1: {
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
        blanks: { '시간대': ['하루 중 한 번쯤', '아침 시간에', '잠들기 전에'] },
      },
      {
        level: 'large',
        id: 'g_anxiety_1_l',
        template: '불안한 느낌이 하루 전체를 덮어버리지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_anxiety_2: {
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

  s_anxiety_3: {
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

  s_anxiety_4: {
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

  // ── relation > family ────────────────────────────────────────────────────────
  r_family_1: {
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

  r_family_2: {
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

  r_family_3: {
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

  r_family_4: {
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

  // ── symptom > cognition ──────────────────────────────────────────────────────
  s_cog_1: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_cog_1_s',
        template: '[시간] 동안만 한 가지 일에 집중해보는 시도를 해볼 수 있었으면 좋겠다',
        blanks: { '시간': ['5분', '10분', '15분'] },
      },
      {
        level: 'medium',
        id: 'g_cog_1_m',
        template: '[방해 요소]를 줄이고 나서 집중하는 시간이 조금 더 늘었으면 좋겠다',
        blanks: { '방해 요소': ['핸드폰 알림', '주변 소음', '동시에 여러 창 띄우는 것'] },
      },
      {
        level: 'large',
        id: 'g_cog_1_l',
        template: '한 가지 일을 시작하면 어느 정도 끝까지 해낼 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_cog_2: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_cog_2_s',
        template: '오늘 해야 할 것 중 [범위] 하나만 정해서 해볼 수 있었으면 좋겠다',
        blanks: { '범위': ['제일 작은 것', '5분 안에 되는 것', '가장 쉬운 것'] },
      },
      {
        level: 'medium',
        id: 'g_cog_2_m',
        template: '[시간대]에는 머리가 조금 더 맑아지는 날이 있었으면 좋겠다',
        blanks: { '시간대': ['오전에', '점심 후에', '산책 뒤에'] },
      },
      {
        level: 'large',
        id: 'g_cog_2_l',
        template: '생각이 이전처럼 또렷하게 정리되는 날이 다시 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_cog_3: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_cog_3_s',
        template: '같은 생각이 맴돌 때 [방법]으로 잠깐이라도 멈춰볼 수 있었으면 좋겠다',
        blanks: { '방법': ['적어두는 것', '호흡으로 전환하는 것', '다른 활동으로 넘어가는 것'] },
      },
      {
        level: 'medium',
        id: 'g_cog_3_m',
        template: '맴도는 생각을 [방법]으로 정리해보는 시간을 가질 수 있었으면 좋겠다',
        blanks: { '방법': ['종이에 전부 쏟아내는 것', '걱정 시간을 따로 정해두는 것', '치료자와 나누는 것'] },
      },
      {
        level: 'large',
        id: 'g_cog_3_l',
        template: '생각이 맴돌기 시작해도 자동으로 빠져들지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_cog_4: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_cog_4_s',
        template: '오늘 작은 결정 하나를 [방법]으로 그냥 골라볼 수 있었으면 좋겠다',
        blanks: { '방법': ['동전 던지기로', '떠오르는 대로', '타이머 1분 안에'] },
      },
      {
        level: 'medium',
        id: 'g_cog_4_m',
        template: '결정을 [방식]으로 나눠서 하나씩 골라볼 수 있었으면 좋겠다',
        blanks: { '방식': ['딱 두 가지 선택지로 좁혀서', '오늘 것과 내일 것으로 나눠서', '지금 당장 것부터'] },
      },
      {
        level: 'large',
        id: 'g_cog_4_l',
        template: '결정이 필요할 때 너무 오래 끌지 않고 선택할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── symptom > physical ───────────────────────────────────────────────────────
  s_phy_1: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_phy_1_s',
        template: '하루 중 [시간] 만이라도 편안하게 몸을 쉬게 해줄 수 있었으면 좋겠다',
        blanks: { '시간': ['10분', '20분', '30분'] },
      },
      {
        level: 'medium',
        id: 'g_phy_1_m',
        template: '[날]에는 몸이 조금 더 가볍게 느껴지는 경험이 있었으면 좋겠다',
        blanks: { '날': ['주 1~2일은', '주말에는', '저녁 시간에는'] },
      },
      {
        level: 'large',
        id: 'g_phy_1_l',
        template: '쉬고 나면 몸이 어느 정도 회복된다는 느낌이 드는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_phy_2: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_phy_2_s',
        template: '몸이 긴장됐을 때 [부위]를 [방법]으로 한 번 풀어줄 수 있었으면 좋겠다',
        blanks: {
          '부위': ['어깨', '목', '머리'],
          '방법': ['스트레칭으로', '마사지로', '따뜻하게 찜질해서'],
        },
      },
      {
        level: 'medium',
        id: 'g_phy_2_m',
        template: '[빈도] 몸 긴장을 의식적으로 푸는 시간을 가질 수 있었으면 좋겠다',
        blanks: { '빈도': ['하루에 한 번', '일주일에 2~3번', '긴장 느낄 때마다'] },
      },
      {
        level: 'large',
        id: 'g_phy_2_l',
        template: '두통이나 어깨·목 통증 없이 하루를 보내는 날이 늘었으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_phy_3: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_phy_3_s',
        template: '스트레스를 받을 때 몸이 반응하는 것을 [방법]으로 알아차려볼 수 있었으면 좋겠다',
        blanks: { '방법': ['잠깐 멈추고 몸 살피는 것', '일기에 적어두는 것', '숨 한 번 고르는 것'] },
      },
      {
        level: 'medium',
        id: 'g_phy_3_m',
        template: '[식사]를 조금이라도 챙겨 먹을 수 있었으면 좋겠다',
        blanks: { '식사': ['하루 한 끼는', '속 부담 없는 것으로', '정해진 시간에'] },
      },
      {
        level: 'large',
        id: 'g_phy_3_l',
        template: '스트레스를 받아도 몸이 이전보다 덜 반응하게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_phy_4: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_phy_4_s',
        template: '오늘 [활동] 하나만 해볼 수 있었으면 좋겠다',
        blanks: { '활동': ['잠깐 걷기', '가벼운 스트레칭', '계단 한 번 이용하기'] },
      },
      {
        level: 'medium',
        id: 'g_phy_4_m',
        template: '[빈도] 몸을 움직이는 시간이 생겼으면 좋겠다',
        blanks: { '빈도': ['일주일에 2번', '하루에 10분', '주말 오전에'] },
      },
      {
        level: 'large',
        id: 'g_phy_4_l',
        template: '규칙적으로 몸을 움직이는 게 생활의 일부가 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── symptom > impulse ────────────────────────────────────────────────────────
  s_imp_1: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_imp_1_s',
        template: '욱 하는 느낌이 올라올 때 [행동] 하나를 먼저 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['숨 한 번 고르는 것', '그 자리를 잠깐 벗어나는 것', '손을 꽉 쥐었다 펴는 것'] },
      },
      {
        level: 'medium',
        id: 'g_imp_1_m',
        template: '폭발하고 나서 [행동]을 할 수 있었으면 좋겠다',
        blanks: { '행동': ['짧게라도 사과하는 것', '왜 그랬는지 돌아보는 것', '그 상황을 기록해두는 것'] },
      },
      {
        level: 'large',
        id: 'g_imp_1_l',
        template: '작은 일에 폭발하는 횟수가 예전보다 줄었으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_imp_2: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_imp_2_s',
        template: '충동이 느껴질 때 [방법]으로 잠깐 멈춰볼 수 있었으면 좋겠다',
        blanks: { '방법': ['물 한 잔 마시는 것', '타이머 10분 기다려보는 것', '일단 자리를 벗어나는 것'] },
      },
      {
        level: 'medium',
        id: 'g_imp_2_m',
        template: '감정이 격해졌을 때 [대안]으로 풀어보는 날이 생겼으면 좋겠다',
        blanks: { '대안': ['걷거나 몸을 움직이는 것', '일기나 메모를 쓰는 것', '좋아하는 음악 듣는 것'] },
      },
      {
        level: 'large',
        id: 'g_imp_2_l',
        template: '힘들 때 음식이나 술 외의 방법으로 감정을 달래는 날이 늘었으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_imp_3: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_imp_3_s',
        template: '충동이 느껴질 때 [시간] 동안 기다려보는 것을 목표로 해볼 수 있었으면 좋겠다',
        blanks: { '시간': ['5분', '10분', '30분'] },
      },
      {
        level: 'medium',
        id: 'g_imp_3_m',
        template: '충동적인 행동을 하기 전에 [방법]을 먼저 해볼 수 있었으면 좋겠다',
        blanks: { '방법': ['한 번 적어보는 것', '다른 사람에게 말해보는 것', '내일로 미뤄보는 것'] },
      },
      {
        level: 'large',
        id: 'g_imp_3_l',
        template: '나중에 후회할 행동을 하기 전에 스스로 브레이크를 걸 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  s_imp_4: {
    domain: 'symptom',
    ladder: [
      {
        level: 'small',
        id: 'g_imp_4_s',
        template: '감정이 극도로 격해질 때 [방법]으로 몸에 신호를 보내볼 수 있었으면 좋겠다',
        blanks: { '방법': ['냉수에 손 담그는 것', '얼음을 쥐는 것', '크게 숨을 내뱉는 것'] },
      },
      {
        level: 'medium',
        id: 'g_imp_4_m',
        template: '감정이 한계까지 가기 전에 [신호]를 미리 알아차릴 수 있었으면 좋겠다',
        blanks: { '신호': ['몸이 긴장되는 느낌', '목소리가 커지는 것', '가슴이 조여드는 것'] },
      },
      {
        level: 'large',
        id: 'g_imp_4_l',
        template: '감정이 한계를 넘기 전에 도움을 요청하거나 안전하게 풀 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── function > daily_routine ──────────────────────────────────────────────────
  f_dr_1: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_dr_1_s',
        template: '오늘은 [시간]에 일어나보는 것을 목표로 해볼 수 있었으면 좋겠다',
        blanks: { '시간': ['7시', '8시', '9시'] },
      },
      {
        level: 'medium',
        id: 'g_dr_1_m',
        template: '주 [횟수] 정도는 비슷한 시간에 일어나는 날이 생겼으면 좋겠다',
        blanks: { '횟수': ['2~3일', '3~4일', '5일'] },
      },
      {
        level: 'large',
        id: 'g_dr_1_l',
        template: '정해진 시간에 일어나는 게 몸에 익어서 자연스러워졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_dr_2: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_dr_2_s',
        template: '오늘 [한 끼]만이라도 챙겨 먹을 수 있었으면 좋겠다',
        blanks: { '한 끼': ['아침', '점심', '저녁'] },
      },
      {
        level: 'medium',
        id: 'g_dr_2_m',
        template: '하루에 [끼니]는 정해진 시간에 먹는 날이 생겼으면 좋겠다',
        blanks: { '끼니': ['한 끼', '두 끼', '세 끼'] },
      },
      {
        level: 'large',
        id: 'g_dr_2_l',
        template: '하루 세 끼를 크게 거르지 않고 먹는 게 자연스러워졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_dr_3: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_dr_3_s',
        template: '오늘 [준비 단계] 하나만 먼저 해볼 수 있었으면 좋겠다',
        blanks: { '준비 단계': ['세수만', '이 닦기만', '옷 갈아입기만'] },
      },
      {
        level: 'medium',
        id: 'g_dr_3_m',
        template: '[준비]를 [시간] 안에 해볼 수 있었으면 좋겠다',
        blanks: {
          '준비': ['씻고 옷 입는 것', '외출 준비', '아침 루틴'],
          '시간': ['15분', '20분', '30분'],
        },
      },
      {
        level: 'large',
        id: 'g_dr_3_l',
        template: '아침 준비가 버거운 일이 아니라 그냥 하는 일로 느껴졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_dr_4: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_dr_4_s',
        template: '오늘 딱 [한 가지]만 해보는 것을 목표로 잡아볼 수 있었으면 좋겠다',
        blanks: { '한 가지': ['5분짜리 일', '미루던 것 하나', '오늘 가장 작은 것'] },
      },
      {
        level: 'medium',
        id: 'g_dr_4_m',
        template: '하루가 끝날 때 [방법]으로 오늘을 정리해볼 수 있었으면 좋겠다',
        blanks: { '방법': ['오늘 한 것 하나 적기', '내일 할 것 하나 정하기', '잠깐 돌아보기'] },
      },
      {
        level: 'large',
        id: 'g_dr_4_l',
        template: '하루를 보내고 나서 "뭔가 했다"는 느낌이 드는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── function > work_study ────────────────────────────────────────────────────
  f_ws_1: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_ws_1_s',
        template: '집을 나서기 전에 [행동] 하나로 마음을 준비해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['좋아하는 음악 한 곡 듣기', '따뜻한 음료 한 잔', '5분 일찍 준비 마치기'] },
      },
      {
        level: 'medium',
        id: 'g_ws_1_m',
        template: '일주일 중 [횟수]는 버티는 느낌 없이 출발할 수 있는 날이 생겼으면 좋겠다',
        blanks: { '횟수': ['하루', '2~3일', '절반 이상'] },
      },
      {
        level: 'large',
        id: 'g_ws_1_l',
        template: '출근이나 등교가 "버티는 일"이 아니라 그냥 하는 일이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_ws_2: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_ws_2_s',
        template: '일이나 공부를 시작하면 [시간] 동안만 딴짓 없이 해볼 수 있었으면 좋겠다',
        blanks: { '시간': ['10분', '15분', '25분'] },
      },
      {
        level: 'medium',
        id: 'g_ws_2_m',
        template: '[방해 요소]를 줄여서 집중하는 시간이 이전보다 조금 더 늘었으면 좋겠다',
        blanks: { '방해 요소': ['핸드폰', 'SNS 알림', '관계없는 탭들'] },
      },
      {
        level: 'large',
        id: 'g_ws_2_l',
        template: '필요할 때 적어도 한 시간은 집중해서 일할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_ws_3: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_ws_3_s',
        template: '오늘 미루고 있는 일 중 [범위] 하나만 시작해볼 수 있었으면 좋겠다',
        blanks: { '범위': ['제일 작은 것', '5분 안에 되는 것', '가장 쉬운 것'] },
      },
      {
        level: 'medium',
        id: 'g_ws_3_m',
        template: '마감 [기간] 전에 시작하는 날이 생겼으면 좋겠다',
        blanks: { '기간': ['하루', '이틀', '일주일'] },
      },
      {
        level: 'large',
        id: 'g_ws_3_l',
        template: '할 일을 계획대로 미리 끝내는 경험이 쌓였으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_ws_4: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_ws_4_s',
        template: '[상황]에서 짧은 교류 하나만 해볼 수 있었으면 좋겠다',
        blanks: { '상황': ['회의에서', '점심 시간에', '지나치면서'] },
      },
      {
        level: 'medium',
        id: 'g_ws_4_m',
        template: '소통이 끝난 후 [방법]으로 나만의 회복 시간을 가질 수 있었으면 좋겠다',
        blanks: { '방법': ['잠깐 혼자 있는 것', '가볍게 산책하는 것', '음악 들으며 쉬는 것'] },
      },
      {
        level: 'large',
        id: 'g_ws_4_l',
        template: '직장이나 학교에서의 소통이 지금보다 덜 에너지를 빼앗는 날이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── function > household ─────────────────────────────────────────────────────
  f_hh_1: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_hh_1_s',
        template: '오늘 [집안일] 하나만 해볼 수 있었으면 좋겠다',
        blanks: { '집안일': ['설거지', '빨래 돌리기', '방 바닥 쓸기'] },
      },
      {
        level: 'medium',
        id: 'g_hh_1_m',
        template: '일주일에 [횟수] 집안일 하나를 해결하는 날이 생겼으면 좋겠다',
        blanks: { '횟수': ['2~3번', '3~4번', '5번'] },
      },
      {
        level: 'large',
        id: 'g_hh_1_l',
        template: '집안일이 크게 쌓이지 않을 정도로 조금씩 유지되는 날이 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_hh_2: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_hh_2_s',
        template: '밀린 것 중 [범위] 하나만 오늘 처리해볼 수 있었으면 좋겠다',
        blanks: { '범위': ['가장 급한 것', '가장 쉬운 것', '5분 안에 되는 것'] },
      },
      {
        level: 'medium',
        id: 'g_hh_2_m',
        template: '해야 할 일을 [방법]으로 정리해서 하나씩 해볼 수 있었으면 좋겠다',
        blanks: { '방법': ['메모에 적어두는 것', '달력에 표시하는 것', '알람을 설정해두는 것'] },
      },
      {
        level: 'large',
        id: 'g_hh_2_l',
        template: '중요한 것을 마감 전에 처리하는 게 자연스러워졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_hh_3: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_hh_3_s',
        template: '오늘 [생활 관리] 하나만 챙겨볼 수 있었으면 좋겠다',
        blanks: { '생활 관리': ['냉장고 확인하기', '필요한 것 하나 주문하기', '오늘 먹을 것 정해두기'] },
      },
      {
        level: 'medium',
        id: 'g_hh_3_m',
        template: '[빈도] 생활에 필요한 것을 미리 준비해두는 날이 생겼으면 좋겠다',
        blanks: { '빈도': ['일주일에 한 번', '주말에', '필요해지기 전에'] },
      },
      {
        level: 'large',
        id: 'g_hh_3_l',
        template: '기본적인 생활이 크게 무너지지 않도록 유지할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_hh_4: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_hh_4_s',
        template: '오늘 돌봄 중 [책임] 하나만 최선을 다하고 나머지는 최소로 해볼 수 있었으면 좋겠다',
        blanks: { '책임': ['꼭 필요한 것', '안전 확인', '기본 끼니'] },
      },
      {
        level: 'medium',
        id: 'g_hh_4_m',
        template: '돌봄 사이에 [시간] 나만의 회복 시간을 가질 수 있었으면 좋겠다',
        blanks: { '시간': ['10분', '20분', '30분'] },
      },
      {
        level: 'large',
        id: 'g_hh_4_l',
        template: '돌봐야 하는 책임이 있어도 내가 완전히 소진되지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── function > self_care ─────────────────────────────────────────────────────
  f_sc_1: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_sc_1_s',
        template: '[건강 챙기기] 하나를 오늘 바로 해볼 수 있었으면 좋겠다',
        blanks: { '건강 챙기기': ['약 챙겨 먹기', '병원 예약 전화하기', '처방전 받으러 가기'] },
      },
      {
        level: 'medium',
        id: 'g_sc_1_m',
        template: '[빈도] 약이나 치료를 빠짐없이 챙기는 날이 생겼으면 좋겠다',
        blanks: { '빈도': ['매일', '주 5일 이상', '먹어야 할 때마다'] },
      },
      {
        level: 'large',
        id: 'g_sc_1_l',
        template: '나의 건강 관리가 빠지지 않는 루틴이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_sc_2: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_sc_2_s',
        template: '오늘 [위생] 하나만 해볼 수 있었으면 좋겠다',
        blanks: { '위생': ['샤워', '머리 감기', '세수'] },
      },
      {
        level: 'medium',
        id: 'g_sc_2_m',
        template: '[빈도] 기본적인 몸 관리를 하는 날이 생겼으면 좋겠다',
        blanks: { '빈도': ['이틀에 한 번', '매일', '주 3회 이상'] },
      },
      {
        level: 'large',
        id: 'g_sc_2_l',
        template: '기본적인 몸 관리가 의식하지 않아도 되는 일이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_sc_3: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_sc_3_s',
        template: '오늘 [활동] 하나를 죄책감 없이 나에게 허락해볼 수 있었으면 좋겠다',
        blanks: { '활동': ['그냥 쉬기', '좋아하는 것 하기', '아무것도 안 하기'] },
      },
      {
        level: 'medium',
        id: 'g_sc_3_m',
        template: '[빈도] 내가 원하는 것을 의식적으로 허락하는 시간을 가질 수 있었으면 좋겠다',
        blanks: { '빈도': ['하루에 한 번', '일주일에 2~3번', '주말에'] },
      },
      {
        level: 'large',
        id: 'g_sc_3_l',
        template: '나를 챙기는 것이 이기적이라는 느낌 없이 자연스러워졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  f_sc_4: {
    domain: 'function',
    ladder: [
      {
        level: 'small',
        id: 'g_sc_4_s',
        template: '몸이 힘들다는 신호를 보낼 때 [행동]을 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['잠깐 쉬기', '뭔가 먹기', '하던 것을 멈추기'] },
      },
      {
        level: 'medium',
        id: 'g_sc_4_m',
        template: '[신호]가 올 때 무시하지 않고 바로 반응해볼 수 있었으면 좋겠다',
        blanks: { '신호': ['배고프다는 느낌', '피로가 쌓이는 것', '통증'] },
      },
      {
        level: 'large',
        id: 'g_sc_4_l',
        template: '몸의 신호에 반응하는 것이 자연스럽게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── relation > friend ────────────────────────────────────────────────────────
  r_fr_1: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_fr_1_s',
        template: '[친구]에게 짧은 메시지 하나 보낼 수 있었으면 좋겠다',
        blanks: { '친구': ['오래 못 연락한 친구', '가장 편한 친구', '생각나는 친구'] },
      },
      {
        level: 'medium',
        id: 'g_fr_1_m',
        template: '[빈도] 한 명에게 먼저 연락하는 날이 생겼으면 좋겠다',
        blanks: { '빈도': ['한 달에 한 번', '2주에 한 번', '일주일에 한 번'] },
      },
      {
        level: 'large',
        id: 'g_fr_1_l',
        template: '친구에게 먼저 연락하는 것이 부담 없이 자연스러워졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_fr_2: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_fr_2_s',
        template: '연락이 왔을 때 [반응]으로라도 답할 수 있었으면 좋겠다',
        blanks: { '반응': ['짧게', '이모티콘으로', '나중에 답한다고'] },
      },
      {
        level: 'medium',
        id: 'g_fr_2_m',
        template: '[상황]에서 만남을 거절하지 않고 나가볼 수 있었으면 좋겠다',
        blanks: { '상황': ['가볍게 커피 마시는 것', '짧게 산책하는 것', '오래된 친구와의 만남'] },
      },
      {
        level: 'large',
        id: 'g_fr_2_l',
        template: '친구의 연락이나 약속이 더 이상 부담으로 느껴지지 않게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_fr_3: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_fr_3_s',
        template: '친구들과 있을 때 [행동] 하나만 해볼 수 있었으면 좋겠다',
        blanks: { '행동': ['짧게 대화 한 번', '잘 듣기', '한 마디만 보태기'] },
      },
      {
        level: 'medium',
        id: 'g_fr_3_m',
        template: '[상황]에서 겉도는 느낌이 조금 덜해졌으면 좋겠다',
        blanks: { '상황': ['소수와 있을 때', '가벼운 자리에서', '오래 아는 친구들과'] },
      },
      {
        level: 'large',
        id: 'g_fr_3_l',
        template: '친구들과 있을 때 예전처럼 편안한 느낌이 다시 드는 날이 왔으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_fr_4: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_fr_4_s',
        template: '비교가 될 때 [방법]으로 잠깐 멈춰볼 수 있었으면 좋겠다',
        blanks: { '방법': ['그 생각을 적어두는 것', '지금 내 상황에 집중하는 것', '다른 것에 주의를 돌리는 것'] },
      },
      {
        level: 'medium',
        id: 'g_fr_4_m',
        template: '내가 지금 [잘 하고 있는 것]을 떠올려볼 수 있었으면 좋겠다',
        blanks: { '잘 하고 있는 것': ['나름 버티고 있는 것', '나에게 맞는 속도로 가고 있는 것', '치료를 받고 있는 것'] },
      },
      {
        level: 'large',
        id: 'g_fr_4_l',
        template: '남과 비교하는 생각이 줄고, 내 속도를 인정하게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── relation > partner (연인 / 배우자) ───────────────────────────────────────

  r_pt_1: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_pt_1_s',
        template: '하루에 [빈도] 파트너와 짧게라도 오늘 어땠는지 물어볼 수 있었으면 좋겠다',
        blanks: { '빈도': ['한 번', '두 번'] },
      },
      {
        level: 'medium',
        id: 'g_pt_1_m',
        template: '[시간] 동안 핸드폰 없이 파트너와 함께 있는 시간이 생겼으면 좋겠다',
        blanks: { '시간': ['10분', '15분', '30분'] },
      },
      {
        level: 'large',
        id: 'g_pt_1_l',
        template: '파트너와 대화가 자연스럽게 늘어서 함께 있는 시간이 편안해졌으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_pt_2: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_pt_2_s',
        template: '파트너가 걱정할 때 [반응] 정도만 해볼 수 있었으면 좋겠다',
        blanks: { '반응': ['"나 괜찮아" 한 마디', '"지금 좀 힘들어" 짧게', '"잠깐 혼자 있고 싶어" 말하기'] },
      },
      {
        level: 'medium',
        id: 'g_pt_2_m',
        template: '짜증이 나거나 미안할 때 [방법]으로 감정을 알아채고 멈출 수 있었으면 좋겠다',
        blanks: { '방법': ['심호흡 한 번', '자리를 잠깐 피하는 것', '속으로 세 번 세는 것'] },
      },
      {
        level: 'large',
        id: 'g_pt_2_l',
        template: '파트너의 걱정을 짜증 없이 받아들이고 내 감정을 솔직하게 나눌 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_pt_3: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_pt_3_s',
        template: '다툼이 시작될 것 같을 때 [행동]으로 잠깐 멈출 수 있었으면 좋겠다',
        blanks: { '행동': ['자리를 잠깐 피하기', '"잠깐 쉬고 얘기하자" 말하기', '심호흡 세 번 하기'] },
      },
      {
        level: 'medium',
        id: 'g_pt_3_m',
        template: '다툼이 끝난 후 [시점]에 나의 감정과 파트너의 감정을 각각 돌아볼 수 있었으면 좋겠다',
        blanks: { '시점': ['30분 뒤', '그날 저녁', '다음 날 아침'] },
      },
      {
        level: 'large',
        id: 'g_pt_3_l',
        template: '반복되는 다툼 패턴을 파트너와 함께 알아채고 평온하게 대화할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_pt_4: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_pt_4_s',
        template: '오늘 힘들었던 것 중 하나를 파트너에게 [방식]으로 꺼낼 수 있었으면 좋겠다',
        blanks: { '방식': ['말로 짧게', '문자로', '"나 좀 힘들어" 한 마디로'] },
      },
      {
        level: 'medium',
        id: 'g_pt_4_m',
        template: '[상황]에서 내가 어떤 기분인지 파트너에게 말로 설명해볼 수 있었으면 좋겠다',
        blanks: { '상황': ['화가 날 때', '불안할 때', '무기력할 때'] },
      },
      {
        level: 'large',
        id: 'g_pt_4_l',
        template: '파트너에게 내 감정을 솔직하게 말하는 것이 자연스럽게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── relation > work_social (직장 / 사회생활) ──────────────────────────────────

  r_ws_1: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_rws_1_s',
        template: '동료와의 짧은 대화 [빈도]만이라도 무리 없이 해볼 수 있었으면 좋겠다',
        blanks: { '빈도': ['하루 한 번', '일주일에 두 번'] },
      },
      {
        level: 'medium',
        id: 'g_rws_1_m',
        template: '직장에서 동료와 함께하는 시간이 [길이] 정도는 너무 지치지 않게 됐으면 좋겠다',
        blanks: { '길이': ['10분', '점심 한 번', '30분'] },
      },
      {
        level: 'large',
        id: 'g_rws_1_l',
        template: '직장에서 동료들과 어울리는 것이 예전처럼 자연스럽게 느껴지게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_ws_2: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_rws_2_s',
        template: '[상황] 직전에 [방법]으로 긴장을 조금 낮출 수 있었으면 좋겠다',
        blanks: {
          '상황': ['회의', '발표', '전화'],
          '방법': ['심호흡 세 번', '물 한 모금 마시기', '잠깐 자리 피하기'],
        },
      },
      {
        level: 'medium',
        id: 'g_rws_2_m',
        template: '[상황]에서 긴장이 되더라도 완전히 피하지 않고 끝까지 해볼 수 있었으면 좋겠다',
        blanks: { '상황': ['짧은 회의', '소수 앞 발표', '전화 한 통'] },
      },
      {
        level: 'large',
        id: 'g_rws_2_l',
        template: '회의나 발표 자리가 두려움 없이 참여할 수 있는 상황이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_ws_3: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_rws_3_s',
        template: '실수를 했을 때 [방법]으로 스스로 다독일 수 있었으면 좋겠다',
        blanks: { '방법': ['메모 한 줄 남기기', '"다음엔 다르게 하면 돼" 말하기', '잠깐 자리를 피하기'] },
      },
      {
        level: 'medium',
        id: 'g_rws_3_m',
        template: '실수 후 [시간] 안에 지나치게 혼내지 않고 그 상황에서 벗어날 수 있었으면 좋겠다',
        blanks: { '시간': ['30분', '1시간', '퇴근 전'] },
      },
      {
        level: 'large',
        id: 'g_rws_3_l',
        template: '직장에서 실수를 해도 지나치게 자책하지 않고 다음 일에 집중할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_ws_4: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_rws_4_s',
        template: '모임 전에 [방법]으로 불안을 조금 낮춘 상태로 나갈 수 있었으면 좋겠다',
        blanks: { '방법': ['참석 시간을 미리 정하기', '도착 전 심호흡하기', '혼자만의 시간 만들기'] },
      },
      {
        level: 'medium',
        id: 'g_rws_4_m',
        template: '사회적 자리에 나가서 [시간] 정도는 어떻게든 버틸 수 있었으면 좋겠다',
        blanks: { '시간': ['30분', '1시간', '자리가 끝날 때까지'] },
      },
      {
        level: 'large',
        id: 'g_rws_4_l',
        template: '모임이나 회식에 나가는 것이 극도의 불안 없이 결정할 수 있는 일이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── relation > isolation (전반적인 고립감) ───────────────────────────────────

  r_iso_1: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_iso_1_s',
        template: '오늘 [방법]으로 한 명과라도 연결된 느낌을 가져볼 수 있었으면 좋겠다',
        blanks: { '방법': ['짧은 문자', '안부 메시지', '이모티콘 하나'] },
      },
      {
        level: 'medium',
        id: 'g_iso_1_m',
        template: '[빈도] [방식]으로 누군가와 짧게 연결되는 시간이 생겼으면 좋겠다',
        blanks: {
          '빈도': ['이틀에 한 번은', '일주일에 두 번은'],
          '방식': ['문자나 메시지로', '직접 만나서', '전화로'],
        },
      },
      {
        level: 'large',
        id: 'g_iso_1_l',
        template: '혼자 있는 것과 연결된 것 사이에서 나만의 균형을 찾을 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_iso_2: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_iso_2_s',
        template: '사람들과 있을 때 멀게 느껴지더라도 [방법]으로 그 자리에 머물 수 있었으면 좋겠다',
        blanks: { '방법': ['숨을 고르면서', '아무것도 안 해도 되니까 그냥 앉아서', '그냥 듣기만 하면서'] },
      },
      {
        level: 'medium',
        id: 'g_iso_2_m',
        template: '[상황]에서 유리벽 너머 느낌이 아닌 실제로 함께 있다는 느낌을 [빈도]라도 느껴봤으면 좋겠다',
        blanks: {
          '상황': ['익숙한 사람들과 있을 때', '조용한 자리에서', '일대일로 있을 때'],
          '빈도': ['한 번이라도', '잠깐이라도'],
        },
      },
      {
        level: 'large',
        id: 'g_iso_2_l',
        template: '사람들과 함께 있을 때 온전히 그 자리에 있다는 느낌이 드는 날이 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_iso_3: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_iso_3_s',
        template: '연락이 왔을 때 [시간] 안에 짧게라도 답장해볼 수 있었으면 좋겠다',
        blanks: { '시간': ['그날 안에', '몇 시간 안에', '바로'] },
      },
      {
        level: 'medium',
        id: 'g_iso_3_m',
        template: '[빈도] [대상]에게 먼저 연락을 해볼 수 있었으면 좋겠다',
        blanks: {
          '빈도': ['일주일에 한 번은', '한 달에 한 번은'],
          '대상': ['가장 편한 사람', '가족 중 한 명', '오래 못 본 친구'],
        },
      },
      {
        level: 'large',
        id: 'g_iso_3_l',
        template: '연락을 피하지 않고 자연스럽게 사람들과 이어져 있을 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  r_iso_4: {
    domain: 'relation',
    ladder: [
      {
        level: 'small',
        id: 'g_iso_4_s',
        template: '지금 힘들다는 것을 [대상]에게 [방식]으로라도 알릴 수 있었으면 좋겠다',
        blanks: {
          '대상': ['치료자', '가장 믿을 수 있는 사람', '일기'],
          '방식': ['한 마디로', '문자 한 줄로', '글로'],
        },
      },
      {
        level: 'medium',
        id: 'g_iso_4_m',
        template: '내 어려움을 [대상]에게 털어놨을 때 [느낌]이 들었으면 좋겠다',
        blanks: {
          '대상': ['치료자', '가까운 사람'],
          '느낌': ['조금 덜 혼자인 느낌', '조금 가벼워지는 느낌'],
        },
      },
      {
        level: 'large',
        id: 'g_iso_4_l',
        template: '힘든 것을 혼자 삼키지 않고 믿을 수 있는 사람에게 털어놓을 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── meaning > direction (삶의 의미 / 방향) ───────────────────────────────────

  m_dir_1: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_dir_1_s',
        template: '예전에 좋아했던 것들을 [방법]으로 떠올려보는 시간이 있었으면 좋겠다',
        blanks: { '방법': ['메모에 적으면서', '사진이나 기록을 보면서', '가만히 생각해보면서'] },
      },
      {
        level: 'medium',
        id: 'g_dir_1_m',
        template: '[한 가지]라도 다시 해보거나 가까이 가보는 날이 [빈도] 생겼으면 좋겠다',
        blanks: {
          '한 가지': ['예전에 좋아했던 것', '한 번이라도 해보고 싶었던 것', '그냥 끌리는 것'],
          '빈도': ['한 번이라도', '일주일에 한 번'],
        },
      },
      {
        level: 'large',
        id: 'g_dir_1_l',
        template: '내가 무엇을 원하는지가 조금씩 보이기 시작했으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_dir_2: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_dir_2_s',
        template: '오늘 하루 중 [느낌]이라도 드는 순간이 하나 있었으면 좋겠다',
        blanks: { '느낌': ['내일도 다시 해보고 싶다는', '나쁘지 않았다는', '이건 내 것 같다는'] },
      },
      {
        level: 'medium',
        id: 'g_dir_2_m',
        template: '[기간] 후 내가 어떤 모습이길 원하는지를 [방식]으로 그려봤으면 좋겠다',
        blanks: {
          '기간': ['1달', '3달', '반년'],
          '방식': ['일기에 적으면서', '마음속으로 조용히'],
        },
      },
      {
        level: 'large',
        id: 'g_dir_2_l',
        template: '하루하루가 어딘가로 이어지고 있다는 느낌이 드는 삶을 살게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_dir_3: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_dir_3_s',
        template: '남과 비교가 될 때 [방법]으로 지금 나의 상황으로 돌아올 수 있었으면 좋겠다',
        blanks: { '방법': ['그 자리를 잠깐 피하는 것', '지금 내가 하고 있는 것 하나를 떠올리는 것', '숨을 한 번 크게 쉬는 것'] },
      },
      {
        level: 'medium',
        id: 'g_dir_3_m',
        template: '[기준]으로 나를 [방식]으로 봐줄 수 있는 날이 늘었으면 좋겠다',
        blanks: {
          '기준': ['남이 아닌 어제의 나', '내가 할 수 있는 것'],
          '방식': ['조금 더 너그럽게', '있는 그대로'],
        },
      },
      {
        level: 'large',
        id: 'g_dir_3_l',
        template: '남과 비교하는 것보다 내가 원하는 방향으로 가고 있는지를 기준으로 삼을 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_dir_4: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_dir_4_s',
        template: '지금 하는 일 안에서 [작은 것]이라도 의미 있다고 느낀 순간을 찾아볼 수 있었으면 좋겠다',
        blanks: { '작은 것': ['딱 하나', '아주 작은 부분', '별것 아니더라도'] },
      },
      {
        level: 'medium',
        id: 'g_dir_4_m',
        template: '내가 이것을 왜 시작했는지를 [방식]으로 다시 떠올려볼 수 있었으면 좋겠다',
        blanks: { '방식': ['일기에 쓰면서', '가만히 앉아서', '치료자와 이야기하면서'] },
      },
      {
        level: 'large',
        id: 'g_dir_4_l',
        template: '지금 하는 일이 나에게 어떤 의미가 있는지를 조금씩 알아가게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── meaning > identity (자기 이해 / 정체성) ──────────────────────────────────

  m_id_1: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_id_1_s',
        template: '내가 중요하게 여기는 것을 [방법]으로 하나라도 찾아볼 수 있었으면 좋겠다',
        blanks: { '방법': ['메모에 적으면서', '과거를 떠올리면서', '지금 마음이 끌리는 것 보면서'] },
      },
      {
        level: 'medium',
        id: 'g_id_1_m',
        template: '"나는 [가치]를 중요하게 여기는 사람인 것 같다"고 [방식]으로 말해볼 수 있었으면 좋겠다',
        blanks: {
          '가치': ['솔직함', '연결', '평온함', '성장'],
          '방식': ['일기에 써보는 것으로', '치료자에게 이야기하는 것으로'],
        },
      },
      {
        level: 'large',
        id: 'g_id_1_l',
        template: '내가 어떤 사람인지에 대해 조금씩 윤곽이 생기기 시작했으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_id_2: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_id_2_s',
        template: '상황에 따라 달라지는 나를 발견했을 때 [방법]으로 그냥 알아채는 것에서 시작할 수 있었으면 좋겠다',
        blanks: { '방법': ['판단 없이', '"또 맞추고 있네" 하고', '잠깐 멈추고'] },
      },
      {
        level: 'medium',
        id: 'g_id_2_m',
        template: '[상황]에서 남의 기대가 아닌 내가 원하는 것이 뭔지 [방식]으로 한 번이라도 떠올려볼 수 있었으면 좋겠다',
        blanks: {
          '상황': ['결정을 앞에 두고', '맞추다 지칠 때', '혼자 있을 때'],
          '방식': ['속으로만이라도', '짧게 적어보면서'],
        },
      },
      {
        level: 'large',
        id: 'g_id_2_l',
        template: '누군가와 함께 있을 때도 나 자신을 잃지 않고 있다는 느낌이 드는 날이 왔으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_id_3: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_id_3_s',
        template: '지금 나와 예전 나 사이에서 변하지 않은 것 [개수]라도 찾아볼 수 있었으면 좋겠다',
        blanks: { '개수': ['하나', '두 가지'] },
      },
      {
        level: 'medium',
        id: 'g_id_3_m',
        template: '지금 이 모습도 나의 일부라고 [방식]으로 받아들여볼 수 있었으면 좋겠다',
        blanks: { '방식': ['억지로가 아닌 그냥', '잠시 멈추고', '일기에 써보면서'] },
      },
      {
        level: 'large',
        id: 'g_id_3_l',
        template: '달라진 모습을 포함해서 이것도 나라는 느낌이 조금씩 생겼으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_id_4: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_id_4_s',
        template: '오늘 하루 중 남을 위해서가 아닌 나를 위해 한 것이 [개수]라도 있었으면 좋겠다',
        blanks: { '개수': ['하나', '작은 것 하나'] },
      },
      {
        level: 'medium',
        id: 'g_id_4_m',
        template: '"나는 [것]을 원한다"고 [방식]으로 표현해볼 수 있었으면 좋겠다',
        blanks: {
          '것': ['이렇게 하고 싶다', '이건 하고 싶지 않다', '이게 더 편하다'],
          '방식': ['속으로만이라도', '일기에', '치료자에게'],
        },
      },
      {
        level: 'large',
        id: 'g_id_4_l',
        template: '남의 기대보다 내가 원하는 것을 기준으로 선택할 수 있는 날이 늘었으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── meaning > enjoyment (즐거움 / 취미) ──────────────────────────────────────

  m_enj_1: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_enj_1_s',
        template: '예전에 좋아했던 것을 [방법]으로 한 번만 다시 가까이 가봤으면 좋겠다',
        blanks: { '방법': ['그냥 틀어두기만', '잠깐 들여다보기만', '5분만 해보기'] },
      },
      {
        level: 'medium',
        id: 'g_enj_1_m',
        template: '[활동]을 할 때 "재미없다"는 판단보다 [느낌]에 집중해볼 수 있었으면 좋겠다',
        blanks: {
          '활동': ['예전에 좋아했던 것', '그냥 끌리는 것'],
          '느낌': ['몸의 감각', '지금 이 순간'],
        },
      },
      {
        level: 'large',
        id: 'g_enj_1_l',
        template: '뭔가를 하면서 시간 가는 줄 모르는 순간이 다시 오게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_enj_2: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_enj_2_s',
        template: '하고 싶은 마음이 들 때 [시간] 안에 몸을 먼저 움직여볼 수 있었으면 좋겠다',
        blanks: { '시간': ['5분', '10분', '생각하기 전에'] },
      },
      {
        level: 'medium',
        id: 'g_enj_2_m',
        template: '[활동]을 시작하기 위한 가장 작은 첫 걸음 하나를 [방식]으로 정해둘 수 있었으면 좋겠다',
        blanks: {
          '활동': ['해보고 싶은 것', '하고 싶었던 것'],
          '방식': ['메모에 적어두는 것으로', '자기 전에 떠올려두는 것으로'],
        },
      },
      {
        level: 'large',
        id: 'g_enj_2_l',
        template: '해보고 싶다는 마음이 들면 크게 준비하지 않아도 그냥 시작할 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_enj_3: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_enj_3_s',
        template: '즐거운 것을 하면서 죄책감이 올라올 때 [방법]으로 그 생각을 잠깐 옆에 두어볼 수 있었으면 좋겠다',
        blanks: { '방법': ['그냥 알아채기만', '"또 왔네" 하고', '숨 한 번 쉬고'] },
      },
      {
        level: 'medium',
        id: 'g_enj_3_m',
        template: '"지금 이걸 즐겨도 된다"고 [방식]으로 스스로에게 [빈도] 허락해볼 수 있었으면 좋겠다',
        blanks: {
          '방식': ['소리 내어', '마음속으로'],
          '빈도': ['한 번이라도', '하루에 한 번'],
        },
      },
      {
        level: 'large',
        id: 'g_enj_3_l',
        template: '즐거운 것을 즐기면서 죄책감 없이 그 시간을 온전히 보낼 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_enj_4: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_enj_4_s',
        template: '쉬는 날 [시간] 동안 뭘 할지 한 가지만 미리 정해두고 시작할 수 있었으면 좋겠다',
        blanks: { '시간': ['30분', '1시간', '오전 중'] },
      },
      {
        level: 'medium',
        id: 'g_enj_4_m',
        template: '쉬는 날 [활동] 하나를 [방식]으로 정해두고 해볼 수 있었으면 좋겠다',
        blanks: {
          '활동': ['나가는 것', '만드는 것', '보거나 듣는 것'],
          '방식': ['전날 밤에 미리', '일어나자마자'],
        },
      },
      {
        level: 'large',
        id: 'g_enj_4_l',
        template: '쉬는 날이 멍하니 지나가지 않고 내가 원하는 대로 보낼 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  // ── meaning > autonomy (주체성 / 자율성) ─────────────────────────────────────

  m_aut_1: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_aut_1_s',
        template: '하고 싶지 않은 일이 생겼을 때 바로 수락하기 전에 [행동]이라도 할 수 있었으면 좋겠다',
        blanks: { '행동': ['잠깐 생각하는 시간 갖기', '"잠깐 생각해볼게요" 말하기', '속으로 한 번 따져보기'] },
      },
      {
        level: 'medium',
        id: 'g_aut_1_m',
        template: '[상황]에서 [표현]으로라도 내 부담을 전달할 수 있었으면 좋겠다',
        blanks: {
          '상황': ['일이 너무 쌓였을 때', '또 부탁이 왔을 때', '이미 지쳐 있을 때'],
          '표현': ['"지금은 좀 어렵겠어요"', '"다음에 도울게요"', '"이번엔 어려울 것 같아요"'],
        },
      },
      {
        level: 'large',
        id: 'g_aut_1_l',
        template: '하고 싶지 않은 일을 거절했을 때 지나친 죄책감 없이 내 결정을 받아들일 수 있게 됐으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_aut_2: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_aut_2_s',
        template: '결정 앞에서 "내가 원하는 건 뭐지?"를 [방식]으로 한 번이라도 먼저 물어볼 수 있었으면 좋겠다',
        blanks: { '방식': ['속으로만이라도', '짧게 적어보면서', '잠깐 눈 감고'] },
      },
      {
        level: 'medium',
        id: 'g_aut_2_m',
        template: '[작은 결정]부터 남의 눈치 없이 [방식]으로 선택해볼 수 있었으면 좋겠다',
        blanks: {
          '작은 결정': ['오늘 먹을 것', '오늘 입을 것', '오늘 어디 갈지'],
          '방식': ['내가 원하는 대로', '그냥 끌리는 대로'],
        },
      },
      {
        level: 'large',
        id: 'g_aut_2_l',
        template: '중요한 결정을 내릴 때 내 의견이 가장 먼저 기준이 되는 날이 왔으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_aut_3: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_aut_3_s',
        template: '선택 후 의심이 올라올 때 [방법]으로 그 생각을 잠깐 내려놓을 수 있었으면 좋겠다',
        blanks: { '방법': ['그냥 알아채기만', '"또 왔네" 하고', '다른 것에 잠시 집중하기'] },
      },
      {
        level: 'medium',
        id: 'g_aut_3_m',
        template: '"내가 선택한 이유"를 [방식]으로 [시점]에 한 번 적어두고 그것을 믿어볼 수 있었으면 좋겠다',
        blanks: {
          '방식': ['한 줄로', '단어 두세 개로'],
          '시점': ['결정 직후', '불안해질 때'],
        },
      },
      {
        level: 'large',
        id: 'g_aut_3_l',
        template: '내가 선택한 것을 자꾸 되돌아보며 후회하는 시간이 줄었으면 좋겠다',
        blanks: {},
      },
    ],
  },

  m_aut_4: {
    domain: 'meaning',
    ladder: [
      {
        level: 'small',
        id: 'g_aut_4_s',
        template: '하루 중 [범위]만이라도 내가 직접 정한 계획대로 움직여볼 수 있었으면 좋겠다',
        blanks: { '범위': ['아침 시간', '저녁 시간', '퇴근 후 1시간'] },
      },
      {
        level: 'medium',
        id: 'g_aut_4_m',
        template: '내 계획이 바뀌었을 때 [방법]으로 감정을 추스르고 다시 조율할 수 있었으면 좋겠다',
        blanks: { '방법': ['잠깐 멈추고 숨 고르기', '"이건 바꿀 수 없어도 이건 내가 정할 수 있어" 생각하기', '할 수 있는 것 하나 찾기'] },
      },
      {
        level: 'large',
        id: 'g_aut_4_l',
        template: '내 삶의 크고 작은 일들을 내가 주도하고 있다는 느낌이 드는 날이 늘었으면 좋겠다',
        blanks: {},
      },
    ],
  },
};

// ── 루틴 데이터 (state id → RoutineItem[]) ────────────────────────────────────
// 키를 goal id가 아닌 state id 단위로 관리한다.
// 한 state에 속한 모든 ladder 단계가 동일한 루틴 풀을 참조한다.

export const ROUTINES: Record<string, RoutineItem[]> = {
  // ── symptom > mood ───────────────────────────────────────────────────────────
  s_mood_1: [
    {
      id: 'rt_mood_1_morning_habit',
      template: '눈 뜨자마자 [행동] 바로 하기',
      blanks: { '행동': ['물 한 잔 마시기', '커튼 열기', '크게 기지개 켜기'] },
      situational_tags: ['morning'],
      emoji: '☀️',
    },
    {
      id: 'rt_mood_1_emotion_note',
      template: '오늘 아침 기분을 한 단어로 적어두기',
      blanks: {},
      situational_tags: ['morning'],
      emoji: '📝',
    },
    {
      id: 'rt_mood_1_sun',
      template: '[시간] 동안 햇빛 쬐기',
      blanks: { '시간': ['5분', '10분', '15분'] },
      situational_tags: ['morning'],
      emoji: '🌅',
    },
  ],

  s_mood_2: [
    {
      id: 'rt_mood_2_hobby_try',
      template: '예전에 좋아했던 것 [시간] 만 해보기',
      blanks: { '시간': ['5분', '10분', '잠깐'] },
      situational_tags: [],
      emoji: '🌱',
    },
    {
      id: 'rt_mood_2_music',
      template: '좋아하는 음악 한 곡 틀어두기',
      blanks: {},
      situational_tags: [],
      emoji: '🎵',
    },
    {
      id: 'rt_mood_2_record',
      template: '오늘 조금이라도 좋았던 순간 하나 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  s_mood_3: [
    {
      id: 'rt_mood_3_label',
      template: '지금 내 감정을 한 단어로 이름 붙여보기',
      blanks: {},
      situational_tags: [],
      emoji: '💬',
    },
    {
      id: 'rt_mood_3_journal',
      template: '[시점] 오늘 감정을 일기로 짧게 적어보기',
      blanks: { '시점': ['자기 전에', '저녁에', '생각날 때'] },
      situational_tags: [],
      emoji: '📔',
    },
    {
      id: 'rt_mood_3_breathing',
      template: '감정이 올라올 때 천천히 숨 세 번 쉬고 멈추기',
      blanks: {},
      situational_tags: [],
      emoji: '🧘',
    },
  ],

  s_mood_4: [
    {
      id: 'rt_mood_4_playlist',
      template: '기분이 떨어질 때 켜두는 플레이리스트를 미리 만들어두기',
      blanks: {},
      situational_tags: [],
      emoji: '🎵',
    },
    {
      id: 'rt_mood_4_walk',
      template: '기분이 가라앉을 때 밖에 나가 [시간] 걷기',
      blanks: { '시간': ['5분', '10분', '20분'] },
      situational_tags: [],
      emoji: '🚶',
    },
    {
      id: 'rt_mood_4_note',
      template: '오늘 기분이 갑자기 떨어진 상황을 짧게 기록해두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  // ── symptom > sleep ──────────────────────────────────────────────────────────
  s_sleep_1: [
    {
      id: 'rt_sleep_1_phone',
      template: '자기 전 [시간] 동안 핸드폰 내려놓기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: ['bedtime'],
      emoji: '📵',
    },
    {
      id: 'rt_sleep_1_ritual',
      template: '자기 전 [방법]으로 수면 준비하기',
      blanks: { '방법': ['따뜻한 물 한 잔 마시기', '가벼운 스트레칭', '좋아하는 음악 틀기'] },
      situational_tags: ['bedtime'],
      emoji: '🌙',
    },
    {
      id: 'rt_sleep_1_breathing',
      template: '누운 채로 천천히 복식호흡 하기',
      blanks: {},
      situational_tags: ['bedtime'],
      emoji: '🧘',
    },
  ],

  s_sleep_2: [
    {
      id: 'rt_sleep_2_no_phone',
      template: '자다 깼을 때 핸드폰 보지 않기',
      blanks: {},
      situational_tags: ['bedtime'],
      emoji: '📵',
    },
    {
      id: 'rt_sleep_2_relax',
      template: '다시 잠들기 위해 [방법] 해보기',
      blanks: { '방법': ['눈 감고 호흡에 집중하기', '온몸 힘 빼고 이완하기', '백색소음 틀기'] },
      situational_tags: ['bedtime'],
      emoji: '🌿',
    },
    {
      id: 'rt_sleep_2_log',
      template: '자다 깬 시간과 그때 떠오른 생각을 짧게 기록해두기',
      blanks: {},
      situational_tags: ['bedtime'],
      emoji: '📝',
    },
  ],

  s_sleep_3: [
    {
      id: 'rt_sleep_3_curtain',
      template: '일어나자마자 커튼 열고 햇빛 쬐기',
      blanks: {},
      situational_tags: ['morning'],
      emoji: '☀️',
    },
    {
      id: 'rt_sleep_3_stretch',
      template: '아침에 일어나서 [시간] 스트레칭 하기',
      blanks: { '시간': ['3분', '5분', '10분'] },
      situational_tags: ['morning'],
      emoji: '🏃',
    },
    {
      id: 'rt_sleep_3_water',
      template: '일어나자마자 물 한 잔 마시기',
      blanks: {},
      situational_tags: ['morning'],
      emoji: '💧',
    },
  ],

  s_sleep_4: [
    {
      id: 'rt_sleep_4_alarm',
      template: '주말에도 평일과 [시간차] 이내로 알람 맞추기',
      blanks: { '시간차': ['1시간', '2시간'] },
      situational_tags: [],
      emoji: '⏰',
    },
    {
      id: 'rt_sleep_4_walk',
      template: '늦게 일어난 날에도 밖에 나가 [시간] 걷기',
      blanks: { '시간': ['10분', '20분'] },
      situational_tags: [],
      emoji: '🚶',
    },
  ],

  // ── symptom > anxiety ────────────────────────────────────────────────────────
  s_anxiety_1: [
    {
      id: 'rt_anxiety_1_breathing',
      template: '[시점] [시간] 동안 복식호흡 하기',
      blanks: { '시점': ['아침에', '불안할 때', '자기 전에'], '시간': ['1분', '3분', '5분'] },
      situational_tags: [],
      emoji: '🧘',
    },
    {
      id: 'rt_anxiety_1_note',
      template: '불안한 생각이 들 때 한 줄로 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_anxiety_1_grounding',
      template: '[방법]으로 지금 이 순간에 집중해보기',
      blanks: { '방법': ['주변 사물 5가지 찾아보기', '발바닥 감각 느껴보기', '손에 닿는 것 만져보기'] },
      situational_tags: [],
      emoji: '🌿',
    },
  ],

  s_anxiety_2: [
    {
      id: 'rt_anxiety_2_breathing_before',
      template: '[장소] 타기 직전에 [시간] 동안 천천히 숨 쉬기',
      blanks: { '장소': ['지하철', '엘리베이터'], '시간': ['30초', '1분'] },
      situational_tags: ['subway', 'crowd'],
      emoji: '🧘',
    },
    {
      id: 'rt_anxiety_2_safe_object',
      template: '주머니나 가방에 마음이 편해지는 물건 하나 챙기기',
      blanks: {},
      situational_tags: ['subway', 'crowd'],
      emoji: '🪬',
    },
    {
      id: 'rt_anxiety_2_music',
      template: '이동 중에는 좋아하는 음악이나 팟캐스트 틀어두기',
      blanks: {},
      situational_tags: ['subway'],
      emoji: '🎵',
    },
  ],

  s_anxiety_3: [
    {
      id: 'rt_anxiety_3_phone_down',
      template: '자기 전 [시간] 동안 핸드폰 내려놓기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: ['bedtime'],
      emoji: '📵',
    },
    {
      id: 'rt_anxiety_3_worry_note',
      template: '오늘 마음에 남는 걱정 한 가지를 적어두고 내일로 미뤄두기',
      blanks: {},
      situational_tags: ['bedtime'],
      emoji: '📝',
    },
    {
      id: 'rt_anxiety_3_routine_sound',
      template: '자기 전 [방법]으로 마음을 가라앉히기',
      blanks: { '방법': ['좋아하는 소리(백색소음, 음악) 듣기', '가벼운 스트레칭', '따뜻한 물 한 잔 마시기'] },
      situational_tags: ['bedtime'],
      emoji: '🌙',
    },
  ],

  s_anxiety_4: [
    {
      id: 'rt_anxiety_4_breathing_before_social',
      template: '[상황] 전에 잠깐 호흡 가다듬기',
      blanks: { '상황': ['모임', '회의', '약속'] },
      situational_tags: ['social'],
      emoji: '🧘',
    },
    {
      id: 'rt_anxiety_4_one_thing',
      template: '사람들과 있을 때 잘하려고 하기보다, [목표] 하나만 정해두기',
      blanks: { '목표': ['짧게 인사하기', '한 마디만 보태기', '편하게 듣기만 하기'] },
      situational_tags: ['social'],
      emoji: '🎯',
    },
    {
      id: 'rt_anxiety_4_after_care',
      template: '사람들과 만난 후, 혼자만의 시간 [시간] 갖기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: ['social'],
      emoji: '🛋️',
    },
  ],

  // ── relation > family ────────────────────────────────────────────────────────
  r_family_1: [
    {
      id: 'rt_family_1_greeting',
      template: '[시점]에 가족에게 짧게 인사하기',
      blanks: { '시점': ['하루에 한 번', '아침에', '자기 전에'] },
      situational_tags: [],
      emoji: '👋',
    },
    {
      id: 'rt_family_1_meal',
      template: '[빈도] 가족과 같은 시간에 식사하기',
      blanks: { '빈도': ['일주일에 한 번', '일주일에 두 번', '매일 한 끼는'] },
      situational_tags: [],
      emoji: '🍽️',
    },
    {
      id: 'rt_family_1_share',
      template: '오늘 있었던 일 한 가지를 가족에게 짧게 이야기하기',
      blanks: {},
      situational_tags: [],
      emoji: '💬',
    },
  ],

  r_family_2: [
    {
      id: 'rt_family_2_short_answer',
      template: '바로 답하기 어려우면 "[표현]"이라고 먼저 말해두기',
      blanks: { '표현': ['지금은 좀 힘들어', '이따 얘기해도 될까', '괜찮아, 고마워'] },
      situational_tags: [],
      emoji: '🗣️',
    },
    {
      id: 'rt_family_2_journal',
      template: '가족에게 하고 싶은 말을 먼저 일기에 적어보기',
      blanks: {},
      situational_tags: [],
      emoji: '📔',
    },
  ],

  r_family_3: [
    {
      id: 'rt_family_3_pause',
      template: '화가 올라올 때 [방법]으로 잠깐 멈추기',
      blanks: { '방법': ['숨을 세 번 깊게 쉬는 것', '잠깐 다른 방으로 가는 것', '물 한 잔 마시는 것'] },
      situational_tags: [],
      emoji: '⏸️',
    },
    {
      id: 'rt_family_3_note_after',
      template: '화낸 뒤, 오늘 기분과 상황을 짧게 기록해보기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  r_family_4: [
    {
      id: 'rt_family_4_thanks',
      template: '가족에게 "[표현]" 같은 말 한 마디 해보기',
      blanks: { '표현': ['고마워', '오늘 도와줘서 고마웠어', '같이 있어줘서 좋아'] },
      situational_tags: [],
      emoji: '💛',
    },
    {
      id: 'rt_family_4_reframe',
      template: '"짐이 된다"는 생각이 들 때, 그 생각을 적어두고 다시 읽어보기',
      blanks: {},
      situational_tags: [],
      emoji: '🔄',
    },
  ],

  // ── symptom > cognition ──────────────────────────────────────────────────────
  s_cog_1: [
    {
      id: 'rt_cog_1_timer',
      template: '[시간] 동안 타이머 켜고 한 가지 일만 하기',
      blanks: { '시간': ['10분', '15분', '25분'] },
      situational_tags: ['work_study'],
      emoji: '⏱️',
    },
    {
      id: 'rt_cog_1_phone',
      template: '집중하는 동안 핸드폰 뒤집어 두거나 다른 방에 두기',
      blanks: {},
      situational_tags: ['work_study'],
      emoji: '📵',
    },
    {
      id: 'rt_cog_1_task_pick',
      template: '오늘 할 일 중 딱 한 가지만 골라 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  s_cog_2: [
    {
      id: 'rt_cog_2_small',
      template: '오늘 할 일을 [크기]로 쪼개서 하나씩 하기',
      blanks: { '크기': ['5분짜리', '아주 작은 것', '한 단계씩'] },
      situational_tags: [],
      emoji: '🧩',
    },
    {
      id: 'rt_cog_2_walk',
      template: '머리가 안 돌아갈 때 밖에 나가 [시간] 걷기',
      blanks: { '시간': ['5분', '10분'] },
      situational_tags: [],
      emoji: '🚶',
    },
    {
      id: 'rt_cog_2_water',
      template: '물 한 잔 마시고 잠깐 눈 감고 쉬기',
      blanks: {},
      situational_tags: [],
      emoji: '💧',
    },
  ],

  s_cog_3: [
    {
      id: 'rt_cog_3_dump',
      template: '머릿속에 맴도는 생각을 종이에 [시간] 동안 전부 쏟아내기',
      blanks: { '시간': ['3분', '5분', '10분'] },
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_cog_3_worry_box',
      template: '맴도는 걱정을 적어두고 \'걱정 시간\'을 따로 정해두기',
      blanks: {},
      situational_tags: [],
      emoji: '📦',
    },
    {
      id: 'rt_cog_3_grounding',
      template: '생각이 돌 때 주변에서 [개수]가지 사물 찾아보며 지금 여기에 집중하기',
      blanks: { '개수': ['3', '5'] },
      situational_tags: [],
      emoji: '🌿',
    },
  ],

  s_cog_4: [
    {
      id: 'rt_cog_4_timer_decide',
      template: '결정할 때 [시간] 타이머 맞추고 그 안에 고르기',
      blanks: { '시간': ['1분', '2분', '3분'] },
      situational_tags: [],
      emoji: '⏱️',
    },
    {
      id: 'rt_cog_4_two_options',
      template: '선택지를 딱 두 가지로 좁힌 뒤 하나 고르기',
      blanks: {},
      situational_tags: [],
      emoji: '🎯',
    },
  ],

  // ── symptom > physical ───────────────────────────────────────────────────────
  s_phy_1: [
    {
      id: 'rt_phy_1_rest',
      template: '[시간] 동안 눈 감고 아무것도 안 하고 쉬기',
      blanks: { '시간': ['5분', '10분', '20분'] },
      situational_tags: [],
      emoji: '😴',
    },
    {
      id: 'rt_phy_1_walk',
      template: '기분 전환 겸 밖에 나가 [시간] 가볍게 걷기',
      blanks: { '시간': ['10분', '20분'] },
      situational_tags: [],
      emoji: '🚶',
    },
    {
      id: 'rt_phy_1_water',
      template: '오늘 물 [양] 마시기',
      blanks: { '양': ['500ml', '1L', '2L'] },
      situational_tags: [],
      emoji: '💧',
    },
  ],

  s_phy_2: [
    {
      id: 'rt_phy_2_stretch',
      template: '[시점]에 어깨·목 스트레칭 [시간] 하기',
      blanks: { '시점': ['아침에', '점심에', '자기 전에'], '시간': ['3분', '5분'] },
      situational_tags: [],
      emoji: '🏃',
    },
    {
      id: 'rt_phy_2_heat',
      template: '긴장된 부위에 따뜻하게 찜질 또는 마사지 하기',
      blanks: {},
      situational_tags: [],
      emoji: '🌡️',
    },
  ],

  s_phy_3: [
    {
      id: 'rt_phy_3_meal',
      template: '[때] 속이 편한 음식으로 한 끼 챙겨 먹기',
      blanks: { '때': ['아침에', '점심에', '저녁에'] },
      situational_tags: ['stress'],
      emoji: '🍚',
    },
    {
      id: 'rt_phy_3_breathe',
      template: '식사 전 숨 세 번 깊게 쉬고 천천히 먹기',
      blanks: {},
      situational_tags: ['stress'],
      emoji: '🧘',
    },
    {
      id: 'rt_phy_3_body_note',
      template: '오늘 속 상태와 식욕을 한 줄로 기록해두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  s_phy_4: [
    {
      id: 'rt_phy_4_walk',
      template: '오늘 [시간] 걷기',
      blanks: { '시간': ['5분', '10분', '20분'] },
      situational_tags: [],
      emoji: '🚶',
    },
    {
      id: 'rt_phy_4_stretch',
      template: '자리에서 일어날 때마다 [동작] 한 번 하기',
      blanks: { '동작': ['어깨 돌리기', '기지개 켜기', '목 좌우로 젖히기'] },
      situational_tags: [],
      emoji: '🏃',
    },
  ],

  // ── symptom > impulse ────────────────────────────────────────────────────────
  s_imp_1: [
    {
      id: 'rt_imp_1_count',
      template: '욱 하는 느낌이 올라올 때 숫자 [숫자]까지 세고 멈추기',
      blanks: { '숫자': ['5', '10'] },
      situational_tags: [],
      emoji: '✋',
    },
    {
      id: 'rt_imp_1_cool',
      template: '화나는 상황에서 자리를 벗어나 [시간] 혼자 있기',
      blanks: { '시간': ['5분', '10분'] },
      situational_tags: [],
      emoji: '🚶',
    },
    {
      id: 'rt_imp_1_log',
      template: '오늘 욱 했던 상황과 그때 기분을 짧게 기록해두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  s_imp_2: [
    {
      id: 'rt_imp_2_wait',
      template: '충동이 느껴질 때 타이머 [시간] 맞추고 기다려보기',
      blanks: { '시간': ['5분', '10분', '20분'] },
      situational_tags: [],
      emoji: '⏱️',
    },
    {
      id: 'rt_imp_2_walk',
      template: '충동 대신 밖에 나가 [시간] 걷기',
      blanks: { '시간': ['5분', '10분'] },
      situational_tags: [],
      emoji: '🚶',
    },
    {
      id: 'rt_imp_2_note',
      template: '충동이 올라온 상황과 그 전에 무슨 일이 있었는지 짧게 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  s_imp_3: [
    {
      id: 'rt_imp_3_pause_check',
      template: '충동이 느껴질 때 "나중에도 하고 싶을까?" 한 번 물어보기',
      blanks: {},
      situational_tags: [],
      emoji: '💭',
    },
    {
      id: 'rt_imp_3_delay',
      template: '충동적으로 하려는 행동을 [시간] 미뤄보기',
      blanks: { '시간': ['10분', '30분', '하루'] },
      situational_tags: [],
      emoji: '⏱️',
    },
    {
      id: 'rt_imp_3_log',
      template: '오늘 충동이 느껴졌던 상황과 결과를 기록해두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  s_imp_4: [
    {
      id: 'rt_imp_4_cold',
      template: '감정이 극도로 격해질 때 차가운 물에 손 담그거나 얼음 쥐기',
      blanks: {},
      situational_tags: [],
      emoji: '🧊',
    },
    {
      id: 'rt_imp_4_breathe',
      template: '그 자리에서 숨을 [방법]으로 크게 내쉬기',
      blanks: { '방법': ['천천히', '길게', '입으로'] },
      situational_tags: [],
      emoji: '💨',
    },
  ],

  // ── function > daily_routine ──────────────────────────────────────────────────
  f_dr_1: [
    {
      id: 'rt_dr_1_alarm',
      template: '같은 시간에 알람 [개수]개 맞춰두기',
      blanks: { '개수': ['1', '2', '3'] },
      situational_tags: ['morning'],
      emoji: '⏰',
    },
    {
      id: 'rt_dr_1_curtain',
      template: '일어나자마자 커튼 열고 햇빛 먼저 쬐기',
      blanks: {},
      situational_tags: ['morning'],
      emoji: '🌅',
    },
    {
      id: 'rt_dr_1_water',
      template: '일어나면 가장 먼저 물 한 잔 마시기',
      blanks: {},
      situational_tags: ['morning'],
      emoji: '💧',
    },
  ],

  f_dr_2: [
    {
      id: 'rt_dr_2_meal_time',
      template: '[끼니]만이라도 시간을 정해서 먹기',
      blanks: { '끼니': ['아침', '점심', '저녁'] },
      situational_tags: [],
      emoji: '🍽️',
    },
    {
      id: 'rt_dr_2_prep',
      template: '전날 밤에 내일 먹을 것 [방식]으로 미리 준비해두기',
      blanks: { '방식': ['간단하게', '사 두거나', '배달 예약으로'] },
      situational_tags: [],
      emoji: '🛒',
    },
  ],

  f_dr_3: [
    {
      id: 'rt_dr_3_one_step',
      template: '아침에 [준비] 하나만 먼저 하기',
      blanks: { '준비': ['세수', '이 닦기', '옷 갈아입기'] },
      situational_tags: ['morning'],
      emoji: '🪥',
    },
    {
      id: 'rt_dr_3_clothes',
      template: '잠들기 전에 내일 입을 옷을 미리 꺼내두기',
      blanks: {},
      situational_tags: [],
      emoji: '👔',
    },
    {
      id: 'rt_dr_3_timer',
      template: '준비 시간에 [시간] 타이머 맞추고 그 안에 해보기',
      blanks: { '시간': ['10분', '15분', '20분'] },
      situational_tags: ['morning'],
      emoji: '⏱️',
    },
  ],

  f_dr_4: [
    {
      id: 'rt_dr_4_one_task',
      template: '오늘 딱 [크기] 일 하나를 아침에 적어두기',
      blanks: { '크기': ['5분짜리', '가장 작은', '쉬운'] },
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_dr_4_review',
      template: '하루 끝에 오늘 한 것 하나만 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '✅',
    },
  ],

  // ── function > work_study ────────────────────────────────────────────────────
  f_ws_1: [
    {
      id: 'rt_ws_1_music',
      template: '집을 나서기 전 좋아하는 음악 한 곡 틀어두기',
      blanks: {},
      situational_tags: ['morning', 'work_study'],
      emoji: '🎵',
    },
    {
      id: 'rt_ws_1_bag',
      template: '전날 밤에 내일 가방을 미리 싸두기',
      blanks: {},
      situational_tags: ['morning'],
      emoji: '🎒',
    },
    {
      id: 'rt_ws_1_reward',
      template: '오늘 [보상]을 미리 정해두고 출발하기',
      blanks: { '보상': ['좋아하는 음료', '점심에 먹고 싶은 것', '퇴근 후 작은 것'] },
      situational_tags: ['morning', 'work_study'],
      emoji: '🎁',
    },
  ],

  f_ws_2: [
    {
      id: 'rt_ws_2_timer',
      template: '[집중시간] 집중 + [휴식시간] 쉬기',
      blanks: { '집중시간': ['25분', '15분'], '휴식시간': ['5분', '3분'] },
      situational_tags: ['work_study'],
      emoji: '⏱️',
    },
    {
      id: 'rt_ws_2_phone',
      template: '집중하는 동안 핸드폰 다른 곳에 두거나 뒤집어 두기',
      blanks: {},
      situational_tags: ['work_study'],
      emoji: '📵',
    },
    {
      id: 'rt_ws_2_task_start',
      template: '시작하기 싫을 때 딱 [시간]만 해보고 그만해도 된다고 생각하기',
      blanks: { '시간': ['2분', '5분'] },
      situational_tags: ['work_study'],
      emoji: '🚀',
    },
  ],

  f_ws_3: [
    {
      id: 'rt_ws_3_smallest',
      template: '미루던 일의 딱 첫 단계만 오늘 하기',
      blanks: {},
      situational_tags: ['work_study'],
      emoji: '🐣',
    },
    {
      id: 'rt_ws_3_when',
      template: '오늘 할 일을 "언제" 할지까지 구체적으로 정해두기',
      blanks: {},
      situational_tags: ['work_study'],
      emoji: '📅',
    },
    {
      id: 'rt_ws_3_split',
      template: '큰 과제를 [개수]단계로 나눠서 오늘은 첫 단계만 하기',
      blanks: { '개수': ['2', '3', '5'] },
      situational_tags: ['work_study'],
      emoji: '🧩',
    },
  ],

  f_ws_4: [
    {
      id: 'rt_ws_4_after',
      template: '소통이 끝난 후 [시간] 혼자 쉬는 시간 갖기',
      blanks: { '시간': ['5분', '10분', '20분'] },
      situational_tags: ['work_study', 'social'],
      emoji: '🛋️',
    },
    {
      id: 'rt_ws_4_one',
      template: '오늘 직장/학교에서 [범위]만 교류하는 것을 목표로 하기',
      blanks: { '범위': ['인사 한 번', '짧은 대화 하나', '꼭 필요한 것만'] },
      situational_tags: ['work_study', 'social'],
      emoji: '🎯',
    },
  ],

  // ── function > household ─────────────────────────────────────────────────────
  f_hh_1: [
    {
      id: 'rt_hh_1_one_thing',
      template: '오늘 집안일 딱 [한 가지]만 고르기',
      blanks: { '한 가지': ['설거지', '빨래', '바닥 쓸기'] },
      situational_tags: [],
      emoji: '🏠',
    },
    {
      id: 'rt_hh_1_timer',
      template: '[시간] 타이머 맞추고 그 시간 동안만 집안일 하기',
      blanks: { '시간': ['10분', '15분', '20분'] },
      situational_tags: [],
      emoji: '⏱️',
    },
  ],

  f_hh_2: [
    {
      id: 'rt_hh_2_list',
      template: '밀린 할 일을 모두 적은 뒤 가장 급한 것 하나에 동그라미 치기',
      blanks: {},
      situational_tags: [],
      emoji: '📋',
    },
    {
      id: 'rt_hh_2_alarm',
      template: '처리해야 할 날짜에 [언제] 미리 알람 맞춰두기',
      blanks: { '언제': ['하루 전', '이틀 전', '일주일 전'] },
      situational_tags: [],
      emoji: '🔔',
    },
    {
      id: 'rt_hh_2_small',
      template: '5분 안에 되는 것부터 골라서 바로 하기',
      blanks: {},
      situational_tags: [],
      emoji: '⚡',
    },
  ],

  f_hh_3: [
    {
      id: 'rt_hh_3_check',
      template: '일주일에 [빈도] 냉장고·생필품 확인하기',
      blanks: { '빈도': ['한 번', '두 번'] },
      situational_tags: [],
      emoji: '🛒',
    },
    {
      id: 'rt_hh_3_note',
      template: '장 보거나 주문할 것을 생각날 때마다 메모에 바로 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  f_hh_4: [
    {
      id: 'rt_hh_4_me_time',
      template: '돌봄 사이사이 [시간] 나만의 회복 시간 갖기',
      blanks: { '시간': ['10분', '20분'] },
      situational_tags: [],
      emoji: '🛋️',
    },
    {
      id: 'rt_hh_4_minimum',
      template: '오늘 돌봄 중 [한 가지]만 최선을 다하고 나머지는 최소로 하기',
      blanks: { '한 가지': ['끼니 챙기기', '안전 확인', '기본 위생'] },
      situational_tags: [],
      emoji: '💛',
    },
  ],

  // ── function > self_care ─────────────────────────────────────────────────────
  f_sc_1: [
    {
      id: 'rt_sc_1_alarm',
      template: '약 먹는 시간에 매일 알람 맞춰두기',
      blanks: {},
      situational_tags: [],
      emoji: '💊',
    },
    {
      id: 'rt_sc_1_reminder',
      template: '[이벤트] 할 때마다 약 챙기기로 연결하기',
      blanks: { '이벤트': ['밥 먹고', '양치하고', '커피 마시고'] },
      situational_tags: [],
      emoji: '🔗',
    },
    {
      id: 'rt_sc_1_track',
      template: '오늘 약을 먹었는지 체크리스트나 앱에 표시해두기',
      blanks: {},
      situational_tags: [],
      emoji: '✅',
    },
  ],

  f_sc_2: [
    {
      id: 'rt_sc_2_minimal',
      template: '오늘 [위생] 하나만 하기',
      blanks: { '위생': ['샤워', '세수', '머리 감기'] },
      situational_tags: [],
      emoji: '🚿',
    },
    {
      id: 'rt_sc_2_music',
      template: '샤워나 몸 관리할 때 좋아하는 음악 틀어두기',
      blanks: {},
      situational_tags: [],
      emoji: '🎵',
    },
  ],

  f_sc_3: [
    {
      id: 'rt_sc_3_permission',
      template: '오늘 [활동] [시간] 하기',
      blanks: { '활동': ['그냥 쉬기', '좋아하는 것 하기'], '시간': ['10분', '30분'] },
      situational_tags: [],
      emoji: '🌱',
    },
    {
      id: 'rt_sc_3_note',
      template: '오늘 나를 위해 한 것 하나 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
  ],

  f_sc_4: [
    {
      id: 'rt_sc_4_body_check',
      template: '하루에 [빈도] 지금 몸이 어떤지 잠깐 체크해보기',
      blanks: { '빈도': ['한 번', '두 번', '세 번'] },
      situational_tags: [],
      emoji: '🔍',
    },
    {
      id: 'rt_sc_4_respond',
      template: '피곤하다는 느낌이 오면 [행동]으로 바로 반응해보기',
      blanks: { '행동': ['5분 눕기', '물 한 잔 마시기', '하던 것 잠깐 멈추기'] },
      situational_tags: [],
      emoji: '💚',
    },
  ],

  // ── relation > friend ────────────────────────────────────────────────────────
  r_fr_1: [
    {
      id: 'rt_fr_1_message',
      template: '오래 못 연락한 친구에게 [내용] 짧게 보내기',
      blanks: { '내용': ['안부 한 마디', '재밌는 것 공유하기', '생각났다고'] },
      situational_tags: [],
      emoji: '💬',
    },
    {
      id: 'rt_fr_1_photo',
      template: '생각날 때 친구에게 사진이나 밈 하나 보내기',
      blanks: {},
      situational_tags: [],
      emoji: '📸',
    },
    {
      id: 'rt_fr_1_schedule',
      template: '한 달에 한 번 친구와 만날 날을 미리 잡아두기',
      blanks: {},
      situational_tags: [],
      emoji: '📅',
    },
  ],

  r_fr_2: [
    {
      id: 'rt_fr_2_short',
      template: '답장이 부담스러울 때 [표현]으로 짧게 반응하기',
      blanks: { '표현': ['이모티콘', '나중에 얘기해', '오케이'] },
      situational_tags: [],
      emoji: '💬',
    },
    {
      id: 'rt_fr_2_small_meet',
      template: '부담 없는 [만남]으로 짧게 만나보기',
      blanks: { '만남': ['커피 한 잔', '산책 30분', '간단한 밥'] },
      situational_tags: ['social'],
      emoji: '☕',
    },
  ],

  r_fr_3: [
    {
      id: 'rt_fr_3_one_goal',
      template: '모임에서 [목표] 하나만 목표로 두기',
      blanks: { '목표': ['인사 잘 하기', '한 마디씩만 하기', '들어주기'] },
      situational_tags: ['social'],
      emoji: '🎯',
    },
    {
      id: 'rt_fr_3_rest',
      template: '모임 후 [시간] 혼자 회복 시간 갖기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: ['social'],
      emoji: '🛋️',
    },
  ],

  r_fr_4: [
    {
      id: 'rt_fr_4_compare_note',
      template: '비교가 되는 순간을 적어두고 그때 내 감정 관찰하기',
      blanks: {},
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_fr_4_my_pace',
      template: '오늘 내가 잘 한 것 하나 찾아서 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '✨',
    },
    {
      id: 'rt_fr_4_limit',
      template: 'SNS에서 비교가 될 때 [시간] 동안 내려두기',
      blanks: { '시간': ['10분', '30분', '오늘 하루'] },
      situational_tags: [],
      emoji: '📵',
    },
  ],

  // ── relation > partner (연인 / 배우자) ───────────────────────────────────────
  r_pt_1: [
    {
      id: 'rt_pt_1_check_in',
      template: '저녁에 파트너에게 "오늘 어땠어?" 한 마디 건네기',
      blanks: {},
      situational_tags: [],
      emoji: '💬',
    },
    {
      id: 'rt_pt_1_no_phone',
      template: '식사 중 [시간] 동안 핸드폰 내려두고 파트너와 같이 있기',
      blanks: { '시간': ['10분', '식사 내내'] },
      situational_tags: [],
      emoji: '🍽️',
    },
    {
      id: 'rt_pt_1_small_share',
      template: '오늘 있었던 것 중 하나를 파트너에게 짧게 이야기하기',
      blanks: {},
      situational_tags: [],
      emoji: '🗣️',
    },
  ],

  r_pt_2: [
    {
      id: 'rt_pt_2_breathe',
      template: '파트너의 말에 반응하기 전 [숫자]번 심호흡하기',
      blanks: { '숫자': ['3', '5'] },
      situational_tags: [],
      emoji: '🧘',
    },
    {
      id: 'rt_pt_2_signal',
      template: '지금 힘들 때 "잠깐 혼자 있고 싶어"라고 파트너에게 알리기',
      blanks: {},
      situational_tags: [],
      emoji: '🤚',
    },
    {
      id: 'rt_pt_2_journal',
      template: '짜증이 났던 순간을 [형식]으로 기록해두기',
      blanks: { '형식': ['한 줄', '감정 단어 하나'] },
      situational_tags: [],
      emoji: '📓',
    },
  ],

  r_pt_3: [
    {
      id: 'rt_pt_3_pause',
      template: '다툼 시작 신호가 보이면 "10분만 쉬고 얘기하자" 말하기',
      blanks: {},
      situational_tags: [],
      emoji: '⏸️',
    },
    {
      id: 'rt_pt_3_reflect',
      template: '다툼 후 [시점]에 내가 느낀 감정을 한 줄로 적어두기',
      blanks: { '시점': ['30분 뒤', '그날 자기 전'] },
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_pt_3_pattern',
      template: '반복되는 다툼 상황 하나를 적고 "그때 나는 뭘 원했나" 생각해보기',
      blanks: {},
      situational_tags: [],
      emoji: '🔍',
    },
  ],

  r_pt_4: [
    {
      id: 'rt_pt_4_one_feeling',
      template: '오늘 힘들었던 감정 하나를 파트너에게 [방식]으로 전하기',
      blanks: { '방식': ['말로 짧게', '문자 한 줄로'] },
      situational_tags: [],
      emoji: '💌',
    },
    {
      id: 'rt_pt_4_emotion_label',
      template: '대화하기 전에 지금 내 감정을 단어 하나로 스스로 정해두기',
      blanks: {},
      situational_tags: [],
      emoji: '🏷️',
    },
    {
      id: 'rt_pt_4_rehearse',
      template: '"나 [감정]해"라는 문장을 머릿속으로 한 번 연습하고 말하기',
      blanks: { '감정': ['불안', '속상', '지쳐'] },
      situational_tags: [],
      emoji: '🎙️',
    },
  ],

  // ── relation > work_social (직장 / 사회생활) ──────────────────────────────────
  r_ws_1: [
    {
      id: 'rt_rws_1_small_talk',
      template: '동료에게 [주제]로 짧게 말 걸기',
      blanks: { '주제': ['날씨 얘기', '"오늘 점심 뭐 먹었어요?" 한 마디', '"주말 잘 보냈어요?" 한 마디'] },
      situational_tags: ['work_study', 'social'],
      emoji: '👋',
    },
    {
      id: 'rt_rws_1_energy_budget',
      template: '오늘 동료와 함께할 시간을 [시간]으로 미리 정해두기',
      blanks: { '시간': ['점심 시간만', '30분'] },
      situational_tags: ['work_study'],
      emoji: '⏱️',
    },
    {
      id: 'rt_rws_1_recharge',
      template: '대화 후 [시간] 혼자 조용히 있을 시간 확보하기',
      blanks: { '시간': ['5분', '10분', '15분'] },
      situational_tags: ['social'],
      emoji: '🔋',
    },
  ],

  r_ws_2: [
    {
      id: 'rt_rws_2_pre_breathe',
      template: '[상황] 직전 화장실에서 심호흡 [횟수]번 하기',
      blanks: {
        '상황': ['회의', '발표', '전화'],
        '횟수': ['3', '5'],
      },
      situational_tags: ['work_study'],
      emoji: '🌬️',
    },
    {
      id: 'rt_rws_2_prepare',
      template: '[상황]에서 할 말을 미리 [방식]으로 정리해두기',
      blanks: {
        '상황': ['회의', '발표', '전화'],
        '방식': ['메모 한 줄', '키워드 세 개'],
      },
      situational_tags: ['work_study'],
      emoji: '📋',
    },
    {
      id: 'rt_rws_2_debrief',
      template: '[상황] 후 "나 해냈다" 한 마디 스스로에게 해주기',
      blanks: { '상황': ['회의', '발표', '전화'] },
      situational_tags: ['work_study'],
      emoji: '🏅',
    },
  ],

  r_ws_3: [
    {
      id: 'rt_rws_3_self_talk',
      template: '실수 후 "다음엔 [대안]" 한 문장만 적어두기',
      blanks: { '대안': ['이렇게 하면 돼', '다르게 해볼게', '천천히 해볼게'] },
      situational_tags: ['work_study'],
      emoji: '✏️',
    },
    {
      id: 'rt_rws_3_body_reset',
      template: '긴장이 올라올 때 자리에서 일어나 [행동]하기',
      blanks: { '행동': ['물 마시러 가기', '잠깐 창밖 보기', '계단 한 층 오르내리기'] },
      situational_tags: ['work_study'],
      emoji: '🚶',
    },
    {
      id: 'rt_rws_3_done_list',
      template: '퇴근 전 오늘 잘 된 일 하나를 메모에 남기기',
      blanks: {},
      situational_tags: ['work_study'],
      emoji: '✅',
    },
  ],

  r_ws_4: [
    {
      id: 'rt_rws_4_time_limit',
      template: '모임에 나가기 전 "나는 [시간]만 있다가 와도 된다"고 스스로 허락하기',
      blanks: { '시간': ['30분', '1시간', '식사 끝날 때까지'] },
      situational_tags: ['social'],
      emoji: '⌚',
    },
    {
      id: 'rt_rws_4_exit_plan',
      template: '모임 전 자연스럽게 나올 수 있는 이유를 [개수] 정도 미리 생각해두기',
      blanks: { '개수': ['하나', '두 가지'] },
      situational_tags: ['social'],
      emoji: '🚪',
    },
    {
      id: 'rt_rws_4_debrief',
      template: '모임 후 "오늘 [것]이 괜찮았다"는 점 하나 찾아보기',
      blanks: { '것': ['이 대화', '이 음식', '이 자리에 나온'] },
      situational_tags: ['social'],
      emoji: '🌱',
    },
  ],

  // ── relation > isolation (전반적인 고립감) ───────────────────────────────────
  r_iso_1: [
    {
      id: 'rt_iso_1_text',
      template: '오늘 생각난 [대상]에게 안부 문자 하나 보내기',
      blanks: { '대상': ['친구', '가족', '오래 못 본 사람'] },
      situational_tags: [],
      emoji: '💬',
    },
    {
      id: 'rt_iso_1_log',
      template: '오늘 연락한 사람이 한 명이라도 있으면 "오늘 연결됐다"고 기록하기',
      blanks: {},
      situational_tags: [],
      emoji: '📋',
    },
    {
      id: 'rt_iso_1_low_bar',
      template: '부담 없이 연결되는 방법 하나 시도해보기 — [방법]',
      blanks: { '방법': ['좋아하는 콘텐츠 댓글 하나 남기기', '온라인 커뮤니티 글 읽기', '이모티콘만 보내기'] },
      situational_tags: [],
      emoji: '🌐',
    },
  ],

  r_iso_2: [
    {
      id: 'rt_iso_2_anchor',
      template: '누군가와 함께 있을 때 [감각]에 잠깐 집중해보기',
      blanks: { '감각': ['목소리 소리', '방의 온도', '발이 닿는 바닥 감각'] },
      situational_tags: ['social'],
      emoji: '🎯',
    },
    {
      id: 'rt_iso_2_eye',
      template: '대화 중 상대방 눈을 [시간]만이라도 보려고 해보기',
      blanks: { '시간': ['1~2초', '3~4초'] },
      situational_tags: ['social'],
      emoji: '👁️',
    },
    {
      id: 'rt_iso_2_note',
      template: '오늘 실제로 연결된 것 같았던 순간 한 장면 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '✍️',
    },
  ],

  r_iso_3: [
    {
      id: 'rt_iso_3_reply',
      template: '연락이 왔을 때 [표현]으로라도 빠르게 답하기',
      blanks: { '표현': ['이모티콘 하나', '"ㅎㅎ" 한 글자', '"나중에 연락할게"'] },
      situational_tags: [],
      emoji: '📩',
    },
    {
      id: 'rt_iso_3_first',
      template: '오래 연락 못 한 사람 한 명에게 [방식]으로 먼저 연락해보기',
      blanks: { '방식': ['짧은 메시지', '이모티콘 하나', '"잘 지내?" 한 마디'] },
      situational_tags: [],
      emoji: '📲',
    },
    {
      id: 'rt_iso_3_diary',
      template: '오늘 답장을 미뤘다면 "왜 미뤘지?"를 한 줄로만 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '📓',
    },
  ],

  r_iso_4: [
    {
      id: 'rt_iso_4_say',
      template: '치료자(또는 일기)에게 "[감정]"이라고 그냥 털어놓기',
      blanks: { '감정': ['요즘 너무 외롭다', '아무도 이해 못 할 것 같다', '말해도 뭐가 달라지나 싶다'] },
      situational_tags: [],
      emoji: '🗣️',
    },
    {
      id: 'rt_iso_4_small_share',
      template: '오늘 힘들었던 것 한 가지를 [대상]에게 [방식]으로 꺼내보기',
      blanks: {
        '대상': ['치료자', '가장 편한 사람', '일기에'],
        '방식': ['말로', '문자로', '글로'],
      },
      situational_tags: [],
      emoji: '💌',
    },
    {
      id: 'rt_iso_4_reframe',
      template: '"말해도 이해 못 받을 것 같다"는 생각이 들 때, 그 생각을 한 줄로만 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '🔍',
    },
  ],

  // ── meaning > direction (삶의 의미 / 방향) ───────────────────────────────────
  m_dir_1: [
    {
      id: 'rt_dir_1_list',
      template: '예전에 즐거웠던 것들을 [개수] 적어보기',
      blanks: { '개수': ['3가지', '5가지', '생각나는 만큼'] },
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_dir_1_try',
      template: '오늘 딱 [시간]만 예전에 좋아했던 것 한 가지 다시 해보기',
      blanks: { '시간': ['5분', '10분', '15분'] },
      situational_tags: [],
      emoji: '🌱',
    },
    {
      id: 'rt_dir_1_notice',
      template: '오늘 "이건 나쁘지 않았다"는 순간 하나 찾아 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '✨',
    },
  ],

  m_dir_2: [
    {
      id: 'rt_dir_2_future',
      template: '"[기간] 후 나는 ___했으면 좋겠다"를 한 문장으로 적어보기',
      blanks: { '기간': ['1달', '3달', '반년'] },
      situational_tags: [],
      emoji: '🔭',
    },
    {
      id: 'rt_dir_2_micro',
      template: '내일 할 수 있는 아주 작은 것 하나를 [방식]으로 정해두기',
      blanks: { '방식': ['메모에 적어두기', '자기 전에 떠올려두기'] },
      situational_tags: [],
      emoji: '🎯',
    },
    {
      id: 'rt_dir_2_meaning_log',
      template: '오늘 "이걸 해서 다행이다"는 것 하나 기록하기',
      blanks: {},
      situational_tags: [],
      emoji: '📖',
    },
  ],

  m_dir_3: [
    {
      id: 'rt_dir_3_redirect',
      template: '비교가 되는 순간 [동작]으로 자리 피하기',
      blanks: { '동작': ['SNS 끄기', '다른 것 보기', '일어나서 물 마시러 가기'] },
      situational_tags: [],
      emoji: '⏹️',
    },
    {
      id: 'rt_dir_3_my_list',
      template: '내가 이번 주 한 것 중 잘 된 것 [개수] 적어두기',
      blanks: { '개수': ['하나', '두 가지', '세 가지'] },
      situational_tags: [],
      emoji: '✅',
    },
    {
      id: 'rt_dir_3_self_talk',
      template: '조급함이 올라올 때 "나는 지금 내 속도로 가고 있다"고 [방식]으로 되새기기',
      blanks: { '방식': ['소리 내어 말하기', '마음속으로 한 번', '적어두기'] },
      situational_tags: [],
      emoji: '🧘',
    },
  ],

  m_dir_4: [
    {
      id: 'rt_dir_4_why',
      template: '오늘 한 일 중 하나를 고르고 "내가 이걸 하는 이유"를 [방식]으로 적어보기',
      blanks: { '방식': ['단어 하나로', '한 문장으로', '두 줄로'] },
      situational_tags: ['work_study'],
      emoji: '🔎',
    },
    {
      id: 'rt_dir_4_small_meaning',
      template: '오늘 [상황]에서 의미 있다고 느낀 점 하나 찾아보기',
      blanks: { '상황': ['일하면서', '공부하면서', '사람을 만나면서'] },
      situational_tags: ['work_study'],
      emoji: '💡',
    },
    {
      id: 'rt_dir_4_origin',
      template: '이것을 왜 시작했는지 기억나는 이유를 [방식]으로 적어두기',
      blanks: { '방식': ['단어 하나로', '한 문장으로'] },
      situational_tags: [],
      emoji: '🌿',
    },
  ],

  // ── meaning > identity (자기 이해 / 정체성) ──────────────────────────────────
  m_id_1: [
    {
      id: 'rt_id_1_values',
      template: '"나에게 중요한 것"을 [개수] 적어보기 — 잘 모르겠어도 일단 쓰기',
      blanks: { '개수': ['3가지', '5가지', '생각나는 만큼'] },
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_id_1_moment',
      template: '오늘 하루 중 "이건 내가 원한 거다"는 순간 하나 찾아서 적어두기',
      blanks: {},
      situational_tags: [],
      emoji: '🎯',
    },
    {
      id: 'rt_id_1_who',
      template: '"내가 닮고 싶은 사람은 [사람]이고, 그 이유는 [이유]이다" 한 줄 써보기',
      blanks: {
        '사람': ['아는 사람', '유명한 사람', '책 속 인물'],
        '이유': ['그 사람의 태도', '그 사람의 가치관', '그 사람의 모습'],
      },
      situational_tags: [],
      emoji: '🪞',
    },
  ],

  m_id_2: [
    {
      id: 'rt_id_2_catch',
      template: '오늘 맞추고 있다는 느낌이 들었던 순간을 [방식]으로 알아채기',
      blanks: { '방식': ['그냥 알아채기만', '잠깐 메모해두기', '"또 하고 있네" 하고'] },
      situational_tags: ['social'],
      emoji: '👀',
    },
    {
      id: 'rt_id_2_want',
      template: '오늘 결정 하나를 앞에 두고 "내가 원하는 건 뭐지?"를 [방식]으로 한 번 떠올리기',
      blanks: { '방식': ['속으로만이라도', '일기에 한 줄로'] },
      situational_tags: [],
      emoji: '💭',
    },
    {
      id: 'rt_id_2_rest',
      template: '혼자 있는 시간 [시간]을 의도적으로 만들어서 아무 역할 없이 있어보기',
      blanks: { '시간': ['10분', '20분', '30분'] },
      situational_tags: [],
      emoji: '🌙',
    },
  ],

  m_id_3: [
    {
      id: 'rt_id_3_constant',
      template: '예전과 지금 모두 변하지 않은 것 [개수] 찾아보기',
      blanks: { '개수': ['하나', '두 가지'] },
      situational_tags: [],
      emoji: '🔗',
    },
    {
      id: 'rt_id_3_letter',
      template: '예전의 나에게 [형식]으로 짧게 편지 써보기',
      blanks: { '형식': ['한 문장', '두 줄', '세 줄'] },
      situational_tags: [],
      emoji: '✉️',
    },
    {
      id: 'rt_id_3_accept',
      template: '"지금 이 모습도 나야"를 [방식]으로 한 번 말해보기',
      blanks: { '방식': ['소리 내어', '마음속으로', '거울 보면서'] },
      situational_tags: [],
      emoji: '🤝',
    },
  ],

  m_id_4: [
    {
      id: 'rt_id_4_for_me',
      template: '오늘 딱 [시간]만 남이 아닌 나를 위한 것 하나 해보기',
      blanks: { '시간': ['5분', '10분', '짧게라도'] },
      situational_tags: [],
      emoji: '🌸',
    },
    {
      id: 'rt_id_4_no',
      template: '오늘 한 가지는 "[표현]"이라고 말해보기',
      blanks: { '표현': ['그건 좀 어렵겠어', '나는 이게 더 편해', '나는 이건 안 할 것 같아'] },
      situational_tags: [],
      emoji: '🙅',
    },
    {
      id: 'rt_id_4_want_log',
      template: '"내가 원하는 것"을 단어로만 [개수] 적어두기 — 이유 없어도 됨',
      blanks: { '개수': ['하나', '세 개', '생각나는 만큼'] },
      situational_tags: [],
      emoji: '💡',
    },
  ],

  // ── meaning > enjoyment (즐거움 / 취미) ──────────────────────────────────────
  m_enj_1: [
    {
      id: 'rt_enj_1_revisit',
      template: '예전에 좋아했던 [활동]을 [시간]만 다시 해보기',
      blanks: {
        '활동': ['음악', '영상', '책', '게임', '그림'],
        '시간': ['5분', '10분', '그냥 틀어두기만'],
      },
      situational_tags: [],
      emoji: '🎵',
    },
    {
      id: 'rt_enj_1_sense',
      template: '하는 동안 몸에서 어떤 감각이 느껴지는지 [방식]으로 알아채보기',
      blanks: { '방식': ['그냥 느끼기만', '한 단어로 적어두기'] },
      situational_tags: [],
      emoji: '✨',
    },
    {
      id: 'rt_enj_1_no_judge',
      template: '"재미없었다"는 결론을 내리기 전에 [기간]은 판단 없이 해보기',
      blanks: { '기간': ['일주일', '3번'] },
      situational_tags: [],
      emoji: '⏳',
    },
  ],

  m_enj_2: [
    {
      id: 'rt_enj_2_two_min',
      template: '하고 싶다는 생각이 들면 생각하기 전에 [행동] 먼저 하기',
      blanks: { '행동': ['일어나기', '재료 꺼내기', '켜기', '신발 신기'] },
      situational_tags: [],
      emoji: '🚀',
    },
    {
      id: 'rt_enj_2_tiny_step',
      template: '[활동]을 시작하기 위한 가장 작은 첫 걸음을 [방식]으로 적어두기',
      blanks: {
        '활동': ['해보고 싶은 것', '오늘 하려던 것'],
        '방식': ['메모에', '폰 메모에'],
      },
      situational_tags: [],
      emoji: '👣',
    },
    {
      id: 'rt_enj_2_plan',
      template: '내일 [시간]에 [활동]을 하기로 지금 바로 정해두기',
      blanks: {
        '시간': ['아침', '점심 후', '저녁'],
        '활동': ['하고 싶은 것 하나', '작은 것 하나'],
      },
      situational_tags: [],
      emoji: '📅',
    },
  ],

  m_enj_3: [
    {
      id: 'rt_enj_3_permission',
      template: '"지금 이걸 즐겨도 된다"고 [방식]으로 스스로에게 말해주기',
      blanks: { '방식': ['소리 내어', '마음속으로', '적어두고 보기'] },
      situational_tags: [],
      emoji: '🔓',
    },
    {
      id: 'rt_enj_3_guilt_note',
      template: '죄책감이 올라올 때 그 생각을 [방식]으로 적어두고 나서 계속하기',
      blanks: { '방식': ['한 줄로', '단어 하나로'] },
      situational_tags: [],
      emoji: '📓',
    },
    {
      id: 'rt_enj_3_after',
      template: '즐거운 것을 한 뒤 "오늘 [것]을 했다"고 하루 기록에 남기기',
      blanks: { '것': ['이것', '좋아하는 것', '나를 위한 것'] },
      situational_tags: [],
      emoji: '✅',
    },
  ],

  m_enj_4: [
    {
      id: 'rt_enj_4_plan_ahead',
      template: '쉬는 날 전날 밤에 "[시간]에 [활동] 하기" 딱 하나만 적어두기',
      blanks: {
        '시간': ['오전 중', '오후에', '일어나자마자'],
        '활동': ['해보고 싶은 것', '나가는 것', '보거나 듣는 것'],
      },
      situational_tags: [],
      emoji: '📋',
    },
    {
      id: 'rt_enj_4_timer',
      template: '[시간] 타이머 켜고 그 시간 동안만 하고 싶은 것 하기',
      blanks: { '시간': ['20분', '30분', '1시간'] },
      situational_tags: [],
      emoji: '⏱️',
    },
    {
      id: 'rt_enj_4_review',
      template: '쉬는 날이 끝날 때 "오늘 [것]이 좋았다"는 것 하나 찾아보기',
      blanks: { '것': ['이 시간', '이 활동', '이 순간'] },
      situational_tags: [],
      emoji: '🌅',
    },
  ],

  // ── meaning > autonomy (주체성 / 자율성) ─────────────────────────────────────
  m_aut_1: [
    {
      id: 'rt_aut_1_pause',
      template: '부탁을 받았을 때 바로 대답하기 전에 "[표현]"으로 시간 벌기',
      blanks: { '표현': ['잠깐 생각해볼게요', '오늘 저녁에 확인하고 연락드릴게요', '먼저 확인하고 알려드릴게요'] },
      situational_tags: ['social', 'work_study'],
      emoji: '⏸️',
    },
    {
      id: 'rt_aut_1_log',
      template: '오늘 떠맡은 것이 있으면 "왜 수락했지?"를 [방식]으로 짧게 적어보기',
      blanks: { '방식': ['한 줄로', '단어 하나로'] },
      situational_tags: [],
      emoji: '📝',
    },
    {
      id: 'rt_aut_1_small_no',
      template: '오늘 [상황]에서 작은 거절 하나 연습해보기',
      blanks: { '상황': ['별로 중요하지 않은 것', '부담이 덜한 상황', '혼자 결정할 수 있는 것'] },
      situational_tags: [],
      emoji: '🙅',
    },
  ],

  m_aut_2: [
    {
      id: 'rt_aut_2_me_first',
      template: '오늘 결정 하나 앞에서 남보다 나를 먼저 묻기 — "나는 [것]이 어때?"',
      blanks: { '것': ['이게', '저게', '이 상황이'] },
      situational_tags: [],
      emoji: '🪞',
    },
    {
      id: 'rt_aut_2_tiny_choice',
      template: '오늘 [작은 것] 하나는 남 눈치 없이 내가 원하는 대로 정하기',
      blanks: { '작은 것': ['먹을 것', '입을 것', '쉬는 방식'] },
      situational_tags: [],
      emoji: '🎯',
    },
    {
      id: 'rt_aut_2_want_log',
      template: '"내가 원하는 것"을 [방식]으로 [개수] 적어두기 — 이유 없어도 됨',
      blanks: {
        '방식': ['단어로만', '짧은 문장으로'],
        '개수': ['하나', '세 개'],
      },
      situational_tags: [],
      emoji: '💡',
    },
  ],

  m_aut_3: [
    {
      id: 'rt_aut_3_reason',
      template: '결정을 내린 직후 "내가 이걸 선택한 이유"를 [방식]으로 적어두기',
      blanks: { '방식': ['단어 하나로', '한 문장으로'] },
      situational_tags: [],
      emoji: '📌',
    },
    {
      id: 'rt_aut_3_catch_doubt',
      template: '의심이 올라올 때 "이 생각이 사실인가, 아니면 불안인가?" 한 번 물어보기',
      blanks: {},
      situational_tags: [],
      emoji: '🔍',
    },
    {
      id: 'rt_aut_3_trust',
      template: '지난 [기간] 안에 내가 잘 선택한 것 하나 찾아보기',
      blanks: { '기간': ['일주일', '한 달', '최근'] },
      situational_tags: [],
      emoji: '✅',
    },
  ],

  m_aut_4: [
    {
      id: 'rt_aut_4_own_block',
      template: '오늘 [시간]만큼은 내가 정한 것만 하는 시간으로 지켜보기',
      blanks: { '시간': ['아침 30분', '퇴근 후 1시간', '저녁 시간'] },
      situational_tags: [],
      emoji: '🔒',
    },
    {
      id: 'rt_aut_4_reframe',
      template: '계획이 바뀌었을 때 "그래도 내가 정할 수 있는 것"을 [개수] 찾아보기',
      blanks: { '개수': ['하나', '두 가지'] },
      situational_tags: [],
      emoji: '🔄',
    },
    {
      id: 'rt_aut_4_agency_log',
      template: '오늘 내가 직접 결정하고 행동한 것 [개수] 적어두기',
      blanks: { '개수': ['하나', '두 가지', '세 가지'] },
      situational_tags: [],
      emoji: '🌱',
    },
  ],
};

// ── 제약 조건 상수 ─────────────────────────────────────────────────────────────

export const CONSTRAINTS = {
  MAX_GOALS_PER_DOMAIN: 3,
  MAX_ROUTINES_TOTAL:   5,
} as const;
