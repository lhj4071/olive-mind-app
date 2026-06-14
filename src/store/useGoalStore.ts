// src/store/useGoalStore.ts
// 치료 목표 설정 플로우 — Zustand 세션 스토어

import { create } from 'zustand';
import type { Domain, GoalLadderLevel, RoutineItem } from '../constants/goalData';
import { CONSTRAINTS, CURRENT_STATES, DOMAINS, GOALS, ROUTINES } from '../constants/goalData';
import { renderTemplate } from '../utils/templateUtils';

// ── 체크인 타입 (기존 유지) ───────────────────────────────────────────────────

/** 1: 아직 안됨  2: 조금 나아짐  3: 꽤 달라짐  4: 거의 달성 */
export type CheckInScore = 1 | 2 | 3 | 4;

export interface CheckInEvaluation {
  goalId: string;
  score:  CheckInScore;
}

export interface CheckInRecord {
  date:        string; // YYYY-MM-DD
  evaluations: CheckInEvaluation[];
}

// ── 새 선택 항목 타입 ─────────────────────────────────────────────────────────

export interface SelectedGoalEntry {
  stateId:      string;
  goalId:       string;
  level:        'small' | 'medium' | 'large';
  filledBlanks: Record<string, string>;
}

export interface SelectedRoutineEntry {
  routineId:    string;
  stateId:      string;
  filledBlanks: Record<string, string>;
}

// ── 세션 상태 타입 ────────────────────────────────────────────────────────────

export interface UserGoalSession {
  selectedDomains:  Domain[];
  selectedStates:   Partial<Record<Domain, string[]>>;
  selectedGoals:    Partial<Record<Domain, SelectedGoalEntry[]>>;
  goalPriority:     string[];             // goalId 정렬 배열 (기존 유지)
  selectedRoutines: SelectedRoutineEntry[];
  checkIns:         CheckInRecord[];
}

// ── Actions 타입 ──────────────────────────────────────────────────────────────

export interface GoalActions {
  // 도메인
  toggleDomain:    (domain: Domain) => void;
  setDomains:      (domains: Domain[]) => void;

  // 현재 상태 (다중 선택, 제한 없음)
  toggleState:     (domain: Domain, stateId: string) => void;

  // 목표 (영역당 최대 3개 — 동일 goalId 재호출 시 제거)
  toggleGoal:           (domain: Domain, entry: SelectedGoalEntry) => void;
  // 이미 선택된 목표의 filledBlanks만 부분 업데이트 (토글 없이)
  patchGoalFilledBlanks:(domain: Domain, goalId: string, patch: Record<string, string>) => void;

  // 목표 우선순위 (goalId 배열 교체)
  setGoalPriority: (orderedGoalIds: string[]) => void;

  // 루틴 (전체 최대 5개 — 동일 routineId 재호출 시 제거)
  toggleRoutine:   (entry: SelectedRoutineEntry) => void;
  setRoutines:     (entries: SelectedRoutineEntry[]) => void;
  // 이미 선택된 루틴의 filledBlanks만 부분 업데이트 (토글 없이)
  patchRoutineFilledBlanks: (routineId: string, patch: Record<string, string>) => void;

  // 체크인 기록 추가
  addCheckIn:      (record: CheckInRecord) => void;

  // 전체 세션 초기화
  resetSession:    () => void;

  // 원격에서 불러온 raw JSON을 형식 검증 후 적용 (구형이면 초기화)
  hydrateSession:  (raw: unknown) => void;
}

export type GoalStore = UserGoalSession & GoalActions;

// ── 초기 상태 ─────────────────────────────────────────────────────────────────

const INITIAL_SESSION: UserGoalSession = {
  selectedDomains:  [],
  selectedStates:   {},
  selectedGoals:    {},
  goalPriority:     [],
  selectedRoutines: [],
  checkIns:         [],
};

// ── 세션 형식 검증 (새 스키마 여부 판별) ─────────────────────────────────────

function isValidSession(raw: unknown): raw is UserGoalSession {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;

  if (!Array.isArray(r.selectedDomains)) return false;

  // selectedGoals: 각 값이 SelectedGoalEntry[] 형태여야 함
  if (typeof r.selectedGoals !== 'object' || Array.isArray(r.selectedGoals)) return false;
  for (const entries of Object.values(r.selectedGoals as object)) {
    if (!Array.isArray(entries)) return false;
    for (const e of entries as unknown[]) {
      if (!e || typeof e !== 'object') return false;
      const entry = e as Record<string, unknown>;
      if (typeof entry.stateId !== 'string') return false;
      if (typeof entry.goalId !== 'string') return false;
      if (!['small', 'medium', 'large'].includes(entry.level as string)) return false;
      if (typeof entry.filledBlanks !== 'object' || Array.isArray(entry.filledBlanks)) return false;
    }
  }

  // selectedRoutines: SelectedRoutineEntry[] 형태여야 함
  if (!Array.isArray(r.selectedRoutines)) return false;
  for (const e of r.selectedRoutines as unknown[]) {
    if (!e || typeof e !== 'object') return false;
    const entry = e as Record<string, unknown>;
    if (typeof entry.routineId !== 'string') return false;
    if (typeof entry.stateId !== 'string') return false;
    if (typeof entry.filledBlanks !== 'object' || Array.isArray(entry.filledBlanks)) return false;
  }

  return true;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useGoalStore = create<GoalStore>((set) => ({
  ...INITIAL_SESSION,

  // ── 도메인 ──────────────────────────────────────────────────────────────────

  toggleDomain: (domain) => set(state => ({
    selectedDomains: state.selectedDomains.includes(domain)
      ? state.selectedDomains.filter(d => d !== domain)
      : [...state.selectedDomains, domain],
  })),

  setDomains: (domains) => set({ selectedDomains: domains }),

  // ── 현재 상태 ────────────────────────────────────────────────────────────────

  toggleState: (domain, stateId) => set(state => {
    const current = state.selectedStates[domain] ?? [];
    const next = current.includes(stateId)
      ? current.filter(id => id !== stateId)
      : [...current, stateId];
    return { selectedStates: { ...state.selectedStates, [domain]: next } };
  }),

  // ── 목표 (영역당 최대 3개) ───────────────────────────────────────────────────

  toggleGoal: (domain, entry) => set(state => {
    const current = state.selectedGoals[domain] ?? [];
    const existingIdx = current.findIndex(e => e.goalId === entry.goalId);
    let next: SelectedGoalEntry[];

    if (existingIdx >= 0) {
      next = current.filter((_, i) => i !== existingIdx);
    } else {
      if (current.length >= CONSTRAINTS.MAX_GOALS_PER_DOMAIN) return state;
      next = [...current, entry];
    }

    // goalPriority 동기화
    const allGoalIds = Object.values({ ...state.selectedGoals, [domain]: next })
      .flat()
      .map(e => e.goalId);
    const updatedPriority = state.goalPriority.filter(id => allGoalIds.includes(id));
    const newGoalIds = allGoalIds.filter(id => !state.goalPriority.includes(id));

    return {
      selectedGoals: { ...state.selectedGoals, [domain]: next },
      goalPriority:  [...updatedPriority, ...newGoalIds],
    };
  }),

  patchGoalFilledBlanks: (domain, goalId, patch) => set(state => {
    const current = state.selectedGoals[domain] ?? [];
    const idx = current.findIndex(e => e.goalId === goalId);
    if (idx < 0) return state;
    const updated = current.slice();
    updated[idx] = { ...updated[idx], filledBlanks: { ...updated[idx].filledBlanks, ...patch } };
    return { selectedGoals: { ...state.selectedGoals, [domain]: updated } };
  }),

  // ── 목표 우선순위 ─────────────────────────────────────────────────────────────

  setGoalPriority: (orderedGoalIds) => set({ goalPriority: orderedGoalIds }),

  // ── 루틴 (전체 최대 5개) ─────────────────────────────────────────────────────

  toggleRoutine: (entry) => set(state => {
    const current = state.selectedRoutines;
    const existingIdx = current.findIndex(e => e.routineId === entry.routineId);
    if (existingIdx >= 0) {
      return { selectedRoutines: current.filter((_, i) => i !== existingIdx) };
    }
    if (current.length >= CONSTRAINTS.MAX_ROUTINES_TOTAL) return state;
    return { selectedRoutines: [...current, entry] };
  }),

  setRoutines: (entries) => set({
    selectedRoutines: entries.slice(0, CONSTRAINTS.MAX_ROUTINES_TOTAL),
  }),

  patchRoutineFilledBlanks: (routineId, patch) => set(state => {
    const idx = state.selectedRoutines.findIndex(e => e.routineId === routineId);
    if (idx < 0) return state;
    const updated = state.selectedRoutines.slice();
    updated[idx] = { ...updated[idx], filledBlanks: { ...updated[idx].filledBlanks, ...patch } };
    return { selectedRoutines: updated };
  }),

  // ── 체크인 ──────────────────────────────────────────────────────────────────

  addCheckIn: (record) => set(state => ({
    checkIns: [...state.checkIns.filter(c => c.date !== record.date), record],
  })),

  // ── 초기화 ──────────────────────────────────────────────────────────────────

  resetSession: () => set(INITIAL_SESSION),

  // ── 세션 복원 ────────────────────────────────────────────────────────────────
  // 원격(Supabase)에서 파싱한 JSON을 넘기면 새 스키마 여부를 검증한다.
  // 구형 세션(selectedGoals가 string[] 등)이면 초기화 — 베타 단계, 데이터 손실 허용.

  hydrateSession: (raw) => {
    if (isValidSession(raw)) {
      set({
        selectedDomains:  raw.selectedDomains,
        selectedStates:   raw.selectedStates,
        selectedGoals:    raw.selectedGoals,
        goalPriority:     raw.goalPriority     ?? [],
        selectedRoutines: raw.selectedRoutines,
        checkIns:         raw.checkIns         ?? [],
      });
    } else {
      set(INITIAL_SESSION);
    }
  },
}));

// ── 순수 함수: 목표 사다리 조회 ──────────────────────────────────────────────
// GOALS[stateId].ladder를 반환. 없으면 빈 배열.

export function getGoalLadder(stateId: string): GoalLadderLevel[] {
  return GOALS[stateId]?.ladder ?? [];
}

// ── 순수 함수: 루틴 추천 ─────────────────────────────────────────────────────
// 선택한 state들의 ROUTINES 풀을 합산한 뒤:
//   1) 선택 state들의 situational_tags와 겹치는 루틴을 상단 배치
//   2) renderTemplate 기준(blanks 첫 값 렌더링) 중복 제거

export function getRecommendedRoutines(selectedStateIds: string[]): RoutineItem[] {
  // 선택 state들의 situational_tags 전체 합산
  const allStateTags = new Set<string>(
    DOMAINS.flatMap(domain =>
      (CURRENT_STATES[domain] ?? [])
        .filter(s => selectedStateIds.includes(s.id))
        .flatMap(s => s.situational_tags)
    )
  );

  const prioritized: RoutineItem[] = [];
  const rest: RoutineItem[] = [];
  const seenTexts = new Set<string>();

  for (const stateId of selectedStateIds) {
    const pool = ROUTINES[stateId] ?? [];
    for (const routine of pool) {
      const { text } = renderTemplate(routine.template, routine.blanks);
      if (seenTexts.has(text)) continue;
      seenTexts.add(text);

      if (routine.situational_tags.some(t => allStateTags.has(t))) {
        prioritized.push(routine);
      } else {
        rest.push(routine);
      }
    }
  }

  return [...prioritized, ...rest];
}

// ── 셀렉터 유틸 (불필요한 리렌더 방지용) ────────────────────────────────────

export const selectSelectedGoalIds = (state: GoalStore): string[] =>
  Object.values(state.selectedGoals).flat().map(e => e.goalId);
