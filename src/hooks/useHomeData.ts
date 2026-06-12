// src/hooks/useHomeData.ts
//
// index.tsx의 6개 병렬 로드 + 분산된 state를 단일 훅으로 응집.
// 역할:
//   - useSQLiteContext()로 db를 가져와 useAppStore 액션에 바인딩
//   - 마운트 시 store.initialize(db) 호출 (isInitialized guard로 1회 보장)
//   - 스토어 상태를 선택적으로 구독하여 반환 (전체 상태가 아닌 필요한 slice만)
//
// index.tsx 사용 예시:
//   const {
//     isLoading, todayMoodLog, routineItems, routineCounts,
//     carePoints, harvestedCount, daysSinceLastLog,
//     saveMoodLog, adjustRoutineCount, harvestOlive, ...
//   } = useHomeData();

import { useCallback, useEffect } from 'react';
import { useSQLiteContext }        from 'expo-sqlite';
import { useAppStore }             from '../store/useAppStore';
import type { SliderValues, RoutinePreset, AssessType } from '../types/app';

export function useHomeData() {
  const db = useSQLiteContext();

  // ── 스토어에서 상태 slice 구독 ─────────────────────────────────────────────
  const isInitialized   = useAppStore(s => s.isInitialized);
  const isLoading       = useAppStore(s => s.isLoading);
  const todayMoodLog    = useAppStore(s => s.todayMoodLog);
  const allMoodLogs     = useAppStore(s => s.allMoodLogs);
  const routineItems    = useAppStore(s => s.routineItems);
  const routineCounts   = useAppStore(s => s.routineCounts);
  const carePoints      = useAppStore(s => s.carePoints);
  const harvestedCount  = useAppStore(s => s.harvestedCount);
  const daysSinceLastLog = useAppStore(s => s.daysSinceLastLog);
  const sleepBed        = useAppStore(s => s.sleepBed);
  const sleepWake       = useAppStore(s => s.sleepWake);
  const sleepActive     = useAppStore(s => s.sleepActive);
  const phq9Latest      = useAppStore(s => s.phq9Latest);
  const gad7Latest      = useAppStore(s => s.gad7Latest);
  const phq9History     = useAppStore(s => s.phq9History);
  const gad7History     = useAppStore(s => s.gad7History);

  // ── 스토어 액션 참조 ──────────────────────────────────────────────────────
  const storeInitialize        = useAppStore(s => s.initialize);
  const storeRefresh           = useAppStore(s => s.refresh);
  const storeSaveMoodLog       = useAppStore(s => s.saveMoodLog);
  const storeAdjustRoutine     = useAppStore(s => s.adjustRoutineCount);
  const storeAddRoutineItem    = useAppStore(s => s.addRoutineItem);
  const storeDeleteRoutineItem = useAppStore(s => s.deleteRoutineItem);
  const storeAddPreset         = useAppStore(s => s.addPresetRoutine);
  const storeHarvest           = useAppStore(s => s.harvestOlive);
  const storeSaveSleep         = useAppStore(s => s.saveSleepSettings);
  const storeSaveAssessment    = useAppStore(s => s.saveAssessment);
  const storeLoadAssessment    = useAppStore(s => s.loadAssessmentData);

  // ── 초기화: 마운트 시 1회 ─────────────────────────────────────────────────
  useEffect(() => {
    void storeInitialize(db);
  }, [db, storeInitialize]);

  // ── db 바인딩 액션 (index.tsx에서 db 없이 호출 가능) ──────────────────────

  const saveMoodLog = useCallback(
    (sliders: SliderValues, emotions: Set<string>, note: string) =>
      storeSaveMoodLog(db, sliders, emotions, note),
    [db, storeSaveMoodLog],
  );

  const adjustRoutineCount = useCallback(
    (id: number, delta: number) => storeAdjustRoutine(db, id, delta),
    [db, storeAdjustRoutine],
  );

  const addRoutineItem = useCallback(
    (label: string, emoji: string, targetCount: number) =>
      storeAddRoutineItem(db, label, emoji, targetCount),
    [db, storeAddRoutineItem],
  );

  const deleteRoutineItem = useCallback(
    (id: number) => storeDeleteRoutineItem(db, id),
    [db, storeDeleteRoutineItem],
  );

  const addPresetRoutine = useCallback(
    (preset: RoutinePreset) => storeAddPreset(db, preset),
    [db, storeAddPreset],
  );

  const harvestOlive = useCallback(
    () => storeHarvest(db),
    [db, storeHarvest],
  );

  /**
   * 알림 스케줄링은 호출 측(index.tsx)에서 처리.
   * 발급된 notifId를 여기로 전달해 DB 저장.
   */
  const saveSleepSettings = useCallback(
    (bedTime: string, wakeTime: string, notifId: string | null) =>
      storeSaveSleep(db, bedTime, wakeTime, notifId),
    [db, storeSaveSleep],
  );

  const saveAssessment = useCallback(
    (type: AssessType, answers: number[]) =>
      storeSaveAssessment(db, type, answers),
    [db, storeSaveAssessment],
  );

  const loadAssessmentData = useCallback(
    () => storeLoadAssessment(db),
    [db, storeLoadAssessment],
  );

  /** pull-to-refresh 또는 AppState active 재진입 시 호출 */
  const refresh = useCallback(
    () => storeRefresh(db),
    [db, storeRefresh],
  );

  // ── 반환 ────────────────────────────────────────────────────────────────────
  return {
    // 로딩 상태
    isLoading,
    isInitialized,

    // 공유 상태 (스토어 구독 → 다른 탭에서 변경해도 즉시 반영)
    todayMoodLog,
    allMoodLogs,
    routineItems,
    routineCounts,
    carePoints,
    harvestedCount,
    daysSinceLastLog,
    sleepBed,
    sleepWake,
    sleepActive,
    phq9Latest,
    gad7Latest,
    phq9History,
    gad7History,

    // db 바인딩 액션
    saveMoodLog,
    adjustRoutineCount,
    addRoutineItem,
    deleteRoutineItem,
    addPresetRoutine,
    harvestOlive,
    saveSleepSettings,
    saveAssessment,
    loadAssessmentData,
    refresh,
  } as const;
}

// ── 반환 타입 export (index.tsx에서 타입 추론에 활용 가능) ─────────────────────
export type HomeData = ReturnType<typeof useHomeData>;
