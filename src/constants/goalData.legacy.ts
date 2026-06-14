// src/constants/goalData.ts
// 치료 목표 설정 + 루틴 연동 — 전체 데이터 및 순수 비즈니스 로직

// ── 타입 정의 ──────────────────────────────────────────────────────────────────

export type Domain = 'symptom' | 'function' | 'relation' | 'meaning';

export interface GoalStateItem {
  id: string;
  text: string;
  is_custom?: boolean;
}

export interface GoalItem {
  id: string;
  text: string;
  linked_states: string[];
  is_custom?: boolean;
}

export interface GoalRoutineItem {
  id: string;
  text: string;
  emoji: string;
}

// ── 도메인 목록 ────────────────────────────────────────────────────────────────

export const DOMAINS: Domain[] = ['symptom', 'function', 'relation', 'meaning'];

export const DOMAIN_LABELS: Record<Domain, string> = {
  symptom:  '증상',
  function: '기능',
  relation: '관계',
  meaning:  '의미',
};

// ── 현재 상태 데이터 ───────────────────────────────────────────────────────────

export const CURRENT_STATES: Record<Domain, GoalStateItem[]> = {
  symptom: [
    { id: 's1', text: '잠들기가 너무 어렵고, 자다가 자꾸 깬다' },
    { id: 's2', text: '이유 없이 불안하고 긴장이 늘 있다' },
    { id: 's3', text: '갑자기 심장이 두근거리고 숨이 막히는 순간이 있다' },
    { id: 's4', text: '아무것도 하기 싫고 무기력하다' },
    { id: 's5', text: '별것 아닌 일에도 눈물이 난다' },
    { id: 's6', text: '예민해져서 작은 일에도 쉽게 화가 난다' },
    { id: 's7', text: '머리가 항상 무겁고 집중이 안 된다' },
    { id: 's8', text: '몸이 늘 피곤한데 쉬어도 나아지지 않는다' },
    { id: 's_custom', text: '직접 입력', is_custom: true },
  ],
  function: [
    { id: 'f1', text: '아침에 일어나는 것 자체가 너무 힘들다' },
    { id: 'f2', text: '출근이나 등교를 못 하거나 매번 버티듯 가고 있다' },
    { id: 'f3', text: '밥을 제대로 못 먹거나, 반대로 폭식하는 날이 많다' },
    { id: 'f4', text: '집안일이 손에 잡히지 않아 쌓여만 간다' },
    { id: 'f5', text: '일을 시작하면 집중이 안 되고 자꾸 멈추게 된다' },
    { id: 'f6', text: '해야 할 일을 계속 미루다가 결국 못 하는 날이 많다' },
    { id: 'f7', text: '씻거나 외출 준비 같은 기본적인 것도 버겁다' },
    { id: 'f_custom', text: '직접 입력', is_custom: true },
  ],
  relation: [
    { id: 'r1', text: '가족과 함께 있어도 대화가 거의 없다' },
    { id: 'r2', text: '친구 연락을 오래 끊고 지내고 있다' },
    { id: 'r3', text: '연락이 와도 답장하기 싫고 무섭다' },
    { id: 'r4', text: '가까운 사람에게 짜증을 내거나 상처를 주는 것 같다' },
    { id: 'r5', text: '직장 동료나 지인들 사이에서 겉도는 느낌이 든다' },
    { id: 'r6', text: '누군가와 있을 때 외려 더 외롭다' },
    { id: 'r7', text: '혼자 있는 게 편하지만 고립된 것 같기도 하다' },
    { id: 'r_custom', text: '직접 입력', is_custom: true },
  ],
  meaning: [
    { id: 'm1', text: '왜 사는지 모르겠다는 생각이 자주 든다' },
    { id: 'm2', text: '예전에 좋아하던 것들이 더 이상 즐겁지 않다' },
    { id: 'm3', text: '내가 뭘 원하는지 잘 모르겠다' },
    { id: 'm4', text: '그냥 버티고 있다는 느낌이 든다' },
    { id: 'm5', text: '미래를 생각하면 막막하고 아무 그림이 없다' },
    { id: 'm6', text: '나답게 살고 있지 않다는 느낌이 든다' },
    { id: 'm7', text: '남이 원하는 대로만 살아온 것 같다' },
    { id: 'm_custom', text: '직접 입력', is_custom: true },
  ],
};

// ── 목표 데이터 ────────────────────────────────────────────────────────────────

export const GOALS: Record<Domain, GoalItem[]> = {
  symptom: [
    { id: 'sg1', text: '자다가 깨도 다시 잠들 수 있게 됐으면 좋겠다', linked_states: ['s1'] },
    { id: 'sg2', text: '잠드는 데 30분 이상 걸리지 않았으면 좋겠다', linked_states: ['s1'] },
    { id: 'sg3', text: '불안한 느낌이 하루 종일 이어지지 않았으면 좋겠다', linked_states: ['s2', 's3'] },
    { id: 'sg4', text: '지하철이나 엘리베이터 같은 곳이 덜 무섭게 됐으면 좋겠다', linked_states: ['s3'] },
    { id: 'sg5', text: '갑자기 심장이 두근거리는 순간이 줄었으면 좋겠다', linked_states: ['s2', 's3'] },
    { id: 'sg6', text: '하루에 한 번은 뭔가 하고 싶다는 느낌이 들었으면 좋겠다', linked_states: ['s4'] },
    { id: 'sg7', text: '눈물이 나도 이유를 조금은 알 것 같은 느낌이 됐으면 좋겠다', linked_states: ['s5'] },
    { id: 'sg8', text: '작은 일에 폭발하지 않고 넘길 수 있게 됐으면 좋겠다', linked_states: ['s6'] },
    { id: 'sg9', text: '오전에 머리가 조금은 맑은 날이 생겼으면 좋겠다', linked_states: ['s7', 's8'] },
    { id: 'sg_custom', text: '직접 입력', is_custom: true, linked_states: ['s_custom'] },
  ],
  function: [
    { id: 'fg1', text: '주 3일 이상은 정해진 시간에 일어나고 싶다', linked_states: ['f1'] },
    { id: 'fg2', text: '출근이나 등교를 버티는 느낌 없이 갈 수 있게 됐으면 좋겠다', linked_states: ['f2'] },
    { id: 'fg3', text: '하루 한 끼는 제대로 챙겨 먹을 수 있게 됐으면 좋겠다', linked_states: ['f3'] },
    { id: 'fg4', text: '밀린 집안일이 더 이상 쌓이지 않는 날이 생겼으면 좋겠다', linked_states: ['f4'] },
    { id: 'fg5', text: '일을 시작하면 30분 정도는 집중할 수 있게 됐으면 좋겠다', linked_states: ['f5'] },
    { id: 'fg6', text: '오늘 해야 할 일 한 가지는 끝낼 수 있게 됐으면 좋겠다', linked_states: ['f5', 'f6'] },
    { id: 'fg7', text: '씻고 밖에 나가는 게 덜 버겁게 됐으면 좋겠다', linked_states: ['f7'] },
    { id: 'fg8', text: '쉬는 날에도 완전히 누워만 있지 않고 뭔가 한 가지는 할 수 있게 됐으면 좋겠다', linked_states: ['f4', 'f6'] },
    { id: 'fg_custom', text: '직접 입력', is_custom: true, linked_states: ['f_custom'] },
  ],
  relation: [
    { id: 'rg1', text: '가족과 하루에 한 번은 짧게라도 대화할 수 있게 됐으면 좋겠다', linked_states: ['r1'] },
    { id: 'rg2', text: '오래된 친구 한 명에게 먼저 연락할 수 있게 됐으면 좋겠다', linked_states: ['r2'] },
    { id: 'rg3', text: '연락이 와도 무서운 느낌 없이 답장할 수 있게 됐으면 좋겠다', linked_states: ['r3'] },
    { id: 'rg4', text: '가까운 사람에게 짜증을 내고 나서 사과할 수 있게 됐으면 좋겠다', linked_states: ['r4'] },
    { id: 'rg5', text: '직장에서 동료와 가벼운 대화를 주고받을 수 있게 됐으면 좋겠다', linked_states: ['r5'] },
    { id: 'rg6', text: '누군가와 밥을 먹거나 커피를 마시는 날이 한 달에 한 번은 생겼으면 좋겠다', linked_states: ['r2', 'r6'] },
    { id: 'rg7', text: '혼자 있는 게 고립이 아니라 온전한 쉼으로 느껴지게 됐으면 좋겠다', linked_states: ['r7'] },
    { id: 'rg_custom', text: '직접 입력', is_custom: true, linked_states: ['r_custom'] },
  ],
  meaning: [
    { id: 'mg1', text: '하루 중 작은 것이라도 기대되는 게 하나 생겼으면 좋겠다', linked_states: ['m1', 'm4'] },
    { id: 'mg2', text: '예전에 좋아하던 것을 다시 조금씩 해보고 싶다', linked_states: ['m2'] },
    { id: 'mg3', text: '내가 뭘 원하는지 조금씩 알아가고 싶다', linked_states: ['m3'] },
    { id: 'mg4', text: '버티는 게 아니라 선택하는 느낌으로 살고 싶다', linked_states: ['m4', 'm7'] },
    { id: 'mg5', text: '1년 후 내 모습을 어렴풋하게라도 그릴 수 있게 됐으면 좋겠다', linked_states: ['m5'] },
    { id: 'mg6', text: '나답다는 느낌이 드는 순간이 일주일에 한 번은 있었으면 좋겠다', linked_states: ['m6'] },
    { id: 'mg7', text: '남의 기대가 아닌 내 기준으로 하루를 보낼 수 있게 됐으면 좋겠다', linked_states: ['m7'] },
    { id: 'mg_custom', text: '직접 입력', is_custom: true, linked_states: ['m_custom'] },
  ],
};

// ── 루틴 데이터 (목표 ID → 추천 루틴 배열) ────────────────────────────────────

export const ROUTINE_MAP: Record<string, GoalRoutineItem[]> = {
  sg1: [
    { id: 'rt_s1_1', text: '자기 전 10분 폰 내려놓기', emoji: '📵' },
    { id: 'rt_s1_2', text: '같은 시간에 눕기', emoji: '🛏️' },
    { id: 'rt_s1_3', text: '자기 전 복식호흡 3분', emoji: '🧘' },
  ],
  sg2: [
    { id: 'rt_s2_1', text: '자기 전 10분 폰 내려놓기', emoji: '📵' },
    { id: 'rt_s2_2', text: '같은 시간에 눕기', emoji: '🛏️' },
    { id: 'rt_s2_3', text: '자기 전 따뜻한 물 한 잔', emoji: '☕' },
  ],
  sg3: [
    { id: 'rt_s3_1', text: '복식호흡 3분', emoji: '🧘' },
    { id: 'rt_s3_2', text: '불안한 생각 짧게 적어두기', emoji: '📝' },
    { id: 'rt_s3_3', text: '햇빛 쬐기 5분', emoji: '🌅' },
  ],
  sg4: [
    { id: 'rt_s4_1', text: '복식호흡 3분', emoji: '🧘' },
    { id: 'rt_s4_2', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_s4_3', text: '산책 10분', emoji: '🚶' },
  ],
  sg5: [
    { id: 'rt_s5_1', text: '복식호흡 3분', emoji: '🧘' },
    { id: 'rt_s5_2', text: '불안한 생각 짧게 적어두기', emoji: '📝' },
    { id: 'rt_s5_3', text: '5분 스트레칭', emoji: '🌅' },
  ],
  sg6: [
    { id: 'rt_s6_1', text: '아침에 일어나서 물 한 잔', emoji: '💧' },
    { id: 'rt_s6_2', text: '5분 스트레칭', emoji: '🌅' },
    { id: 'rt_s6_3', text: '약 챙겨 먹기', emoji: '💊' },
  ],
  sg7: [
    { id: 'rt_s7_1', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_s7_2', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_s7_3', text: '감사한 일 떠올리기', emoji: '🧘' },
  ],
  sg8: [
    { id: 'rt_s8_1', text: '복식호흡 3분', emoji: '🧘' },
    { id: 'rt_s8_2', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_s8_3', text: '산책 10분', emoji: '🚶' },
  ],
  sg9: [
    { id: 'rt_s9_1', text: '아침에 일어나서 물 한 잔', emoji: '💧' },
    { id: 'rt_s9_2', text: '햇빛 쬐기 5분', emoji: '🌅' },
    { id: 'rt_s9_3', text: '5분 스트레칭', emoji: '🌅' },
  ],
  fg1: [
    { id: 'rt_f1_1', text: '같은 시간에 알람 맞추기', emoji: '⏰' },
    { id: 'rt_f1_2', text: '일어나면 커튼 열기', emoji: '🌅' },
    { id: 'rt_f1_3', text: '아침에 일어나서 물 한 잔', emoji: '💧' },
  ],
  fg2: [
    { id: 'rt_f2_1', text: '전날 밤 가방 미리 싸두기', emoji: '🎒' },
    { id: 'rt_f2_2', text: '집 나서기 전 음악 한 곡 틀기', emoji: '🎵' },
    { id: 'rt_f2_3', text: '일어나면 커튼 열기', emoji: '🌅' },
  ],
  fg3: [
    { id: 'rt_f3_1', text: '하루 한 끼 식사 시간 정하기', emoji: '🍽️' },
    { id: 'rt_f3_2', text: '약 챙겨 먹기', emoji: '💊' },
    { id: 'rt_f3_3', text: '아침에 일어나서 물 한 잔', emoji: '💧' },
  ],
  fg4: [
    { id: 'rt_f4_1', text: '오늘 집안일 한 가지만 고르기', emoji: '🏠' },
    { id: 'rt_f4_2', text: '할 일 한 가지만 적어두기', emoji: '📝' },
    { id: 'rt_f4_3', text: '5분 스트레칭', emoji: '🌅' },
  ],
  fg5: [
    { id: 'rt_f5_1', text: '25분 집중 + 5분 쉬기', emoji: '⏱️' },
    { id: 'rt_f5_2', text: '오전 중 핸드폰 뒤집어 두기', emoji: '📵' },
    { id: 'rt_f5_3', text: '할 일 한 가지만 적어두기', emoji: '📝' },
  ],
  fg6: [
    { id: 'rt_f6_1', text: '할 일 한 가지만 적어두기', emoji: '📝' },
    { id: 'rt_f6_2', text: '25분 집중 + 5분 쉬기', emoji: '⏱️' },
    { id: 'rt_f6_3', text: '오늘 기분 기록하기', emoji: '📝' },
  ],
  fg7: [
    { id: 'rt_f7_1', text: '아침에 일어나서 물 한 잔', emoji: '💧' },
    { id: 'rt_f7_2', text: '5분 스트레칭', emoji: '🌅' },
    { id: 'rt_f7_3', text: '햇빛 쬐기 5분', emoji: '🌅' },
  ],
  fg8: [
    { id: 'rt_f8_1', text: '산책 10분', emoji: '🚶' },
    { id: 'rt_f8_2', text: '할 일 한 가지만 적어두기', emoji: '📝' },
    { id: 'rt_f8_3', text: '계단 이용하기', emoji: '🚶' },
  ],
  rg1: [
    { id: 'rt_r1_1', text: '저녁 식사 같이 하기', emoji: '🍽️' },
    { id: 'rt_r1_2', text: '하루 있었던 일 한 가지 나누기', emoji: '💬' },
    { id: 'rt_r1_3', text: '오늘 기분 기록하기', emoji: '📝' },
  ],
  rg2: [
    { id: 'rt_r2_1', text: '오늘 한 명에게 짧게 안부 보내기', emoji: '💬' },
    { id: 'rt_r2_2', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_r2_3', text: '감사한 일 떠올리기', emoji: '🧘' },
  ],
  rg3: [
    { id: 'rt_r3_1', text: '오늘 한 명에게 짧게 안부 보내기', emoji: '💬' },
    { id: 'rt_r3_2', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_r3_3', text: '복식호흡 3분', emoji: '🧘' },
  ],
  rg4: [
    { id: 'rt_r4_1', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_r4_2', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_r4_3', text: '복식호흡 3분', emoji: '🧘' },
  ],
  rg5: [
    { id: 'rt_r5_1', text: '오늘 한 명에게 짧게 안부 보내기', emoji: '💬' },
    { id: 'rt_r5_2', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_r5_3', text: '산책 10분', emoji: '🚶' },
  ],
  rg6: [
    { id: 'rt_r6_1', text: '오늘 한 명에게 짧게 안부 보내기', emoji: '💬' },
    { id: 'rt_r6_2', text: '감사한 일 떠올리기', emoji: '🧘' },
    { id: 'rt_r6_3', text: '일기 쓰기', emoji: '📝' },
  ],
  rg7: [
    { id: 'rt_r7_1', text: '오늘 기분 기록하기', emoji: '📝' },
    { id: 'rt_r7_2', text: '복식호흡 3분', emoji: '🧘' },
    { id: 'rt_r7_3', text: '감사한 일 떠올리기', emoji: '🧘' },
  ],
  mg1: [
    { id: 'rt_m1_1', text: '하루 중 기대되는 것 하나 적어두기', emoji: '📝' },
    { id: 'rt_m1_2', text: '좋아하는 음악 한 곡 틀기', emoji: '🎵' },
    { id: 'rt_m1_3', text: '감사한 일 떠올리기', emoji: '🧘' },
  ],
  mg2: [
    { id: 'rt_m2_1', text: '예전에 좋아하던 것 5분만 해보기', emoji: '🌱' },
    { id: 'rt_m2_2', text: '좋아하는 음악 한 곡 틀기', emoji: '🎵' },
    { id: 'rt_m2_3', text: '일기 쓰기', emoji: '📝' },
  ],
  mg3: [
    { id: 'rt_m3_1', text: '오늘 가장 좋았던 순간 적기', emoji: '📝' },
    { id: 'rt_m3_2', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_m3_3', text: '감사한 일 떠올리기', emoji: '🧘' },
  ],
  mg4: [
    { id: 'rt_m4_1', text: '오늘 내가 선택한 것 하나 적기', emoji: '📝' },
    { id: 'rt_m4_2', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_m4_3', text: '오늘 기분 기록하기', emoji: '📝' },
  ],
  mg5: [
    { id: 'rt_m5_1', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_m5_2', text: '오늘 가장 좋았던 순간 적기', emoji: '📝' },
    { id: 'rt_m5_3', text: '감사한 일 떠올리기', emoji: '🧘' },
  ],
  mg6: [
    { id: 'rt_m6_1', text: '나답다고 느낀 순간 하나 적기', emoji: '📝' },
    { id: 'rt_m6_2', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_m6_3', text: '좋아하는 음악 한 곡 틀기', emoji: '🎵' },
  ],
  mg7: [
    { id: 'rt_m7_1', text: '오늘 내가 선택한 것 하나 적기', emoji: '📝' },
    { id: 'rt_m7_2', text: '일기 쓰기', emoji: '📝' },
    { id: 'rt_m7_3', text: '오늘 기분 기록하기', emoji: '📝' },
  ],
};

// ── 제약 조건 상수 ─────────────────────────────────────────────────────────────

export const CONSTRAINTS = {
  MAX_GOALS_PER_DOMAIN: 3,
  MAX_ROUTINES_TOTAL:   5,
} as const;

// ── 순수 비즈니스 로직 ─────────────────────────────────────────────────────────

/**
 * 선택한 현재 상태 ID에 연결된 목표 목록을 반환한다.
 * is_custom 목표는 항상 포함된다.
 */
export function getFilteredGoals(
  domain: Domain,
  selectedStateIds: string[],
): GoalItem[] {
  return GOALS[domain].filter(goal => {
    if (goal.is_custom) return true;
    return goal.linked_states.some(stateId => selectedStateIds.includes(stateId));
  });
}

/**
 * 선택한 목표 ID 배열에 연결된 루틴들을 중복 없이 반환한다.
 * 텍스트 기준으로 중복을 제거하여 동일 루틴이 여러 목표에 걸쳐 있어도 1회만 포함된다.
 */
export function getRecommendedRoutines(selectedGoalIds: string[]): GoalRoutineItem[] {
  const seen = new Set<string>();
  const result: GoalRoutineItem[] = [];

  for (const goalId of selectedGoalIds) {
    const routines = ROUTINE_MAP[goalId] ?? [];
    for (const routine of routines) {
      if (!seen.has(routine.text)) {
        seen.add(routine.text);
        result.push(routine);
      }
    }
  }

  return result;
}
