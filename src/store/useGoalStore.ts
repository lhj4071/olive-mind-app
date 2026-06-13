// src/store/useGoalStore.ts
// 치료 목표 설정 플로우 — Zustand 세션 스토어

import { create } from 'zustand';
import type { Domain } from '../constants/goalData';
import { CONSTRAINTS } from '../constants/goalData';

// ── 체크인 타입 ────────────────────────────────────────────────────────────────

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

// ── 세션 상태 타입 ─────────────────────────────────────────────────────────────

export interface UserGoalSession {
  selectedDomains:  Domain[];
  selectedStates:   Partial<Record<Domain, string[]>>;
  selectedGoals:    Partial<Record<Domain, string[]>>;
  goalPriority:     string[];   // 우선순위 정렬된 목표 ID
  selectedRoutines: string[];   // 최종 선택 루틴 ID (최대 5개)
  checkIns:         CheckInRecord[];
}

// ── Actions 타입 ───────────────────────────────────────────────────────────────

export interface GoalActions {
  // 도메인
  toggleDomain:      (domain: Domain) => void;
  setDomains:        (domains: Domain[]) => void;

  // 현재 상태 (다중 선택, 제한 없음)
  toggleState:       (domain: Domain, stateId: string) => void;

  // 목표 (영역당 최대 3개)
  toggleGoal:        (domain: Domain, goalId: string) => void;

  // 목표 우선순위 (goalPriority 배열 교체)
  setGoalPriority:   (orderedGoalIds: string[]) => void;

  // 루틴 (전체 최대 5개)
  toggleRoutine:     (routineId: string) => void;
  setRoutines:       (routineIds: string[]) => void;

  // 체크인 기록 추가
  addCheckIn:        (record: CheckInRecord) => void;

  // 전체 세션 초기화
  resetSession:      () => void;
}

export type GoalStore = UserGoalSession & GoalActions;

// ── 초기 상태 ──────────────────────────────────────────────────────────────────

const INITIAL_SESSION: UserGoalSession = {
  selectedDomains:  [],
  selectedStates:   {},
  selectedGoals:    {},
  goalPriority:     [],
  selectedRoutines: [],
  checkIns:         [],
};

// ── Store ──────────────────────────────────────────────────────────────────────

export const useGoalStore = create<GoalStore>((set, get) => ({
  ...INITIAL_SESSION,

  // ── 도메인 ────────────────────────────────────────────────────────────────────

  toggleDomain: (domain) => set(state => ({
    selectedDomains: state.selectedDomains.includes(domain)
      ? state.selectedDomains.filter(d => d !== domain)
      : [...state.selectedDomains, domain],
  })),

  setDomains: (domains) => set({ selectedDomains: domains }),

  // ── 현재 상태 ──────────────────────────────────────────────────────────────────

  toggleState: (domain, stateId) => set(state => {
    const current = state.selectedStates[domain] ?? [];
    const next = current.includes(stateId)
      ? current.filter(id => id !== stateId)
      : [...current, stateId];
    return { selectedStates: { ...state.selectedStates, [domain]: next } };
  }),

  // ── 목표 (영역당 최대 3개) ─────────────────────────────────────────────────────

  toggleGoal: (domain, goalId) => set(state => {
    const current = state.selectedGoals[domain] ?? [];
    let next: string[];

    if (current.includes(goalId)) {
      next = current.filter(id => id !== goalId);
    } else {
      if (current.length >= CONSTRAINTS.MAX_GOALS_PER_DOMAIN) return state;
      next = [...current, goalId];
    }

    // goalPriority에서도 반영
    const allGoals = Object.values({ ...state.selectedGoals, [domain]: next })
      .flat() as string[];
    const updatedPriority = state.goalPriority.filter(id => allGoals.includes(id));
    const newGoals = allGoals.filter(id => !state.goalPriority.includes(id));

    return {
      selectedGoals:  { ...state.selectedGoals, [domain]: next },
      goalPriority:   [...updatedPriority, ...newGoals],
    };
  }),

  // ── 목표 우선순위 ──────────────────────────────────────────────────────────────

  setGoalPriority: (orderedGoalIds) => set({ goalPriority: orderedGoalIds }),

  // ── 루틴 (전체 최대 5개) ───────────────────────────────────────────────────────

  toggleRoutine: (routineId) => set(state => {
    const current = state.selectedRoutines;
    if (current.includes(routineId)) {
      return { selectedRoutines: current.filter(id => id !== routineId) };
    }
    if (current.length >= CONSTRAINTS.MAX_ROUTINES_TOTAL) return state;
    return { selectedRoutines: [...current, routineId] };
  }),

  setRoutines: (routineIds) => set({
    selectedRoutines: routineIds.slice(0, CONSTRAINTS.MAX_ROUTINES_TOTAL),
  }),

  // ── 체크인 ────────────────────────────────────────────────────────────────────

  addCheckIn: (record) => set(state => ({
    checkIns: [...state.checkIns.filter(c => c.date !== record.date), record],
  })),

  // ── 초기화 ────────────────────────────────────────────────────────────────────

  resetSession: () => set(INITIAL_SESSION),
}));

// ── 셀렉터 유틸 (불필요한 리렌더 방지용) ────────────────────────────────────────

export const selectSelectedGoalIds = (state: GoalStore): string[] =>
  Object.values(state.selectedGoals).flat() as string[];
