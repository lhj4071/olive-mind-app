// src/types/app.ts
// 앱 전역 공유 TypeScript 타입 정의

// ── 기분 기록 ─────────────────────────────────────────────────────────────────
export type SliderKey    = 'mood' | 'anxiety' | 'irritability' | 'sleep';
export type SliderValues = Record<SliderKey, number>;

export const DEFAULT_SLIDERS: SliderValues = {
  mood:         5,
  anxiety:      5,
  irritability: 5,
  sleep:        5,
};

// ── DB 행 타입 ────────────────────────────────────────────────────────────────
export interface MoodLogRow {
  id:    number;
  date:  string;
  score: string;        // JSON: SliderValues
  tags:  string | null; // JSON: string[]
  memo:  string | null;
}

export interface RoutineItem {
  id:          number;
  label:       string;
  emoji:       string | null;
  targetCount: number;
  orderIndex:  number;
  isActive:    number;
}

export interface RoutinePreset {
  emoji:       string;
  label:       string;
  targetCount: number;
}

export interface AssessmentRow {
  id:      number;
  date:    string;
  type:    string;
  score:   number;
  answers: string | null;
}

// ── 검사 종류 ─────────────────────────────────────────────────────────────────
export type AssessType = 'PHQ9' | 'GAD7';

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
export function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** MoodLogs.score (TEXT) → SliderValues 파싱 */
export function parseScoreJson(raw: string): Partial<SliderValues> {
  try {
    const p = JSON.parse(raw);
    if (typeof p === 'object' && p !== null) return p as Partial<SliderValues>;
    if (typeof p === 'number') return { mood: p };
  } catch { /* noop */ }
  const n = Number(raw);
  return isNaN(n) ? {} : { mood: n };
}

/** RoutineLogs.completed (TEXT) → Record<number, number> 파싱 */
export function parseRoutineCompleted(raw: string | null): Record<number, number> {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .map(([k, v]): [number, number] => [Number(k), Number(v)])
      );
    }
  } catch { /* noop */ }
  return {};
}

/** 올리브 나무 레벨 계산 (0~7) */
export function computeTreeLevel(
  carePoints:       number,
  harvestedCount:   number,
  daysSinceLastLog: number,
): number {
  if (daysSinceLastLog >= 3) return 7;
  const effective = Math.max(0, carePoints - harvestedCount * 5);
  if (effective >= 30) return 6;
  if (effective >= 25) return 5;
  if (effective >= 20) return 4;
  if (effective >= 15) return 3;
  if (effective >= 10) return 2;
  if (effective >= 5)  return 1;
  return 0;
}
