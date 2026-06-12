// src/store/useAppStore.ts
// 앱 전역 Zustand 스토어
//
// 설계 원칙
//   1. 상태(State)는 순수 직렬화 가능한 값만 저장 (Map 대신 Record 사용)
//   2. 모든 변이(Mutation) 액션은 낙관적 업데이트 → DB 비동기 기록 → 실패 시 롤백
//   3. DB 참조(SQLiteDatabase)는 React 컨텍스트에서 오므로 액션 파라미터로 전달
//   4. Provider 불필요 — Zustand 모듈 싱글턴이 전 컴포넌트 트리에 공유됨

import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { refreshWidget, scheduleWidgetRefresh } from '../widget/widgetData';
import {
  localDateKey,
  parseRoutineCompleted,
  computeTreeLevel,
  DEFAULT_SLIDERS,
} from '../types/app';
import type {
  MoodLogRow,
  RoutineItem,
  RoutinePreset,
  AssessmentRow,
  SliderValues,
  AssessType,
} from '../types/app';

// ── State ─────────────────────────────────────────────────────────────────────

export interface AppState {
  isInitialized: boolean;
  isLoading:     boolean;

  // 오늘 기분 기록 (홈 → 요약 실시간 동기화의 핵심)
  todayMoodLog: MoodLogRow | null;

  // 전체 기분 기록 (요약 탭 차트 / 타임라인용)
  allMoodLogs: MoodLogRow[];

  // 루틴 항목 목록 & 오늘 완료 횟수 Map
  routineItems:  RoutineItem[];
  routineCounts: Record<number, number>; // itemId → 오늘 완료 횟수

  // 올리브 나무 타마고치
  carePoints:       number;
  harvestedCount:   number;
  daysSinceLastLog: number;

  // 수면 설정
  sleepBed:    string;
  sleepWake:   string;
  sleepActive: boolean;

  // 심리 검사 최신 결과 & 히스토리
  phq9Latest:  AssessmentRow | null;
  gad7Latest:  AssessmentRow | null;
  phq9History: AssessmentRow[];
  gad7History: AssessmentRow[];
}

// ── Actions ───────────────────────────────────────────────────────────────────

export interface AppActions {
  /**
   * 앱 최초 마운트 시 1회 병렬 로드.
   * isInitialized가 true면 즉시 반환 (중복 방지).
   */
  initialize: (db: SQLiteDatabase) => Promise<void>;

  /**
   * 강제 새로고침: pull-to-refresh / AppState active 재진입 등에 사용.
   * isInitialized 여부와 무관하게 항상 DB에서 다시 로드.
   */
  refresh: (db: SQLiteDatabase) => Promise<void>;

  // ── 기분 기록 ───────────────────────────────────────────────────────────────
  saveMoodLog: (
    db:       SQLiteDatabase,
    sliders:  SliderValues,
    emotions: Set<string>,
    note:     string,
  ) => Promise<void>;

  // ── 루틴 ────────────────────────────────────────────────────────────────────
  adjustRoutineCount: (db: SQLiteDatabase, id: number, delta: number) => Promise<void>;
  addRoutineItem:     (db: SQLiteDatabase, label: string, emoji: string, targetCount: number) => Promise<void>;
  deleteRoutineItem:  (db: SQLiteDatabase, id: number) => Promise<void>;
  addPresetRoutine:   (db: SQLiteDatabase, preset: RoutinePreset) => Promise<void>;

  // ── 올리브 나무 ─────────────────────────────────────────────────────────────
  harvestOlive: (db: SQLiteDatabase) => Promise<void>;

  // ── 수면 설정 ───────────────────────────────────────────────────────────────
  /**
   * @param notifId expo-notifications로 등록한 알림 ID.
   *                알림 스케줄링은 호출 측(index.tsx)에서 처리하고,
   *                여기서는 DB 저장과 스토어 갱신만 담당한다.
   */
  saveSleepSettings: (
    db:      SQLiteDatabase,
    bedTime: string,
    wakeTime: string,
    notifId: string | null,
  ) => Promise<void>;

  // ── 심리 검사 ───────────────────────────────────────────────────────────────
  saveAssessment:     (db: SQLiteDatabase, type: AssessType, answers: number[]) => Promise<void>;
  loadAssessmentData: (db: SQLiteDatabase) => Promise<void>;
}

export type AppStore = AppState & AppActions;

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_STATE: AppState = {
  isInitialized: false,
  isLoading:     false,
  todayMoodLog:  null,
  allMoodLogs:   [],
  routineItems:  [],
  routineCounts: {},
  carePoints:       0,
  harvestedCount:   0,
  daysSinceLastLog: 0,
  sleepBed:    '23:00',
  sleepWake:   '06:00',
  sleepActive: false,
  phq9Latest:  null,
  gad7Latest:  null,
  phq9History: [],
  gad7History: [],
};

// ── Internal DB loader (순수 함수, 스토어 부작용 없음) ──────────────────────────

type LoadedData = Omit<AppState, 'isInitialized' | 'isLoading'>;

async function loadFromDB(db: SQLiteDatabase): Promise<LoadedData> {
  const today = localDateKey();

  const [
    todayMoodRow,
    allMoodRows,
    latestPhq9,
    latestGad7,
    histPhq9,
    histGad7,
    sleepRow,
    routineItemRows,
    routineLogRow,
    moodCntRow,
    breathCntRow,
    latestMoodRow,
    latestBreathRow,
    harvestedRow,
  ] = await Promise.all([
    db.getFirstAsync<MoodLogRow>(
      'SELECT * FROM MoodLogs WHERE date = ?', [today]
    ),
    db.getAllAsync<MoodLogRow>(
      'SELECT * FROM MoodLogs ORDER BY date ASC'
    ),
    db.getFirstAsync<AssessmentRow>(
      "SELECT * FROM AssessmentLogs WHERE type='PHQ9' ORDER BY date DESC LIMIT 1"
    ),
    db.getFirstAsync<AssessmentRow>(
      "SELECT * FROM AssessmentLogs WHERE type='GAD7' ORDER BY date DESC LIMIT 1"
    ),
    db.getAllAsync<AssessmentRow>(
      "SELECT * FROM AssessmentLogs WHERE type='PHQ9' ORDER BY date ASC"
    ),
    db.getAllAsync<AssessmentRow>(
      "SELECT * FROM AssessmentLogs WHERE type='GAD7' ORDER BY date ASC"
    ),
    db.getFirstAsync<{ bedTime: string; wakeTime: string; isActive: number }>(
      'SELECT bedTime, wakeTime, isActive FROM SleepSettings LIMIT 1'
    ),
    db.getAllAsync<RoutineItem>(
      'SELECT * FROM RoutineItems WHERE isActive = 1 ORDER BY orderIndex ASC'
    ),
    db.getFirstAsync<{ completed: string }>(
      'SELECT completed FROM RoutineLogs WHERE date = ?', [today]
    ),
    db.getFirstAsync<{ moodCount: number }>(
      'SELECT COUNT(*) as moodCount FROM MoodLogs'
    ),
    db.getFirstAsync<{ breathCount: number | null }>(
      'SELECT SUM(count) as breathCount FROM BreathingLogs'
    ),
    db.getFirstAsync<{ latestDate: string | null }>(
      'SELECT MAX(date) as latestDate FROM MoodLogs'
    ),
    db.getFirstAsync<{ latestDate: string | null }>(
      'SELECT MAX(date) as latestDate FROM BreathingLogs'
    ),
    db.getFirstAsync<{ value: number }>(
      `SELECT value FROM UserStats WHERE key = 'harvestedOlives'`
    ),
  ]);

  const routineCounts = parseRoutineCompleted(routineLogRow?.completed ?? null);

  const carePoints    = (moodCntRow?.moodCount ?? 0) + (breathCntRow?.breathCount ?? 0);
  const harvestedCount = harvestedRow?.value ?? 0;

  const latestDate = [latestMoodRow?.latestDate ?? null, latestBreathRow?.latestDate ?? null]
    .filter((d): d is string => d !== null)
    .sort()
    .pop();

  const daysSinceLastLog = latestDate
    ? Math.max(0, Math.floor((Date.now() - new Date(latestDate + 'T00:00:00').getTime()) / 86_400_000))
    : 0;

  return {
    todayMoodLog:  todayMoodRow  ?? null,
    allMoodLogs:   allMoodRows,
    phq9Latest:    latestPhq9   ?? null,
    gad7Latest:    latestGad7   ?? null,
    phq9History:   histPhq9.slice(-8),
    gad7History:   histGad7.slice(-8),
    sleepBed:      sleepRow?.bedTime  ?? '23:00',
    sleepWake:     sleepRow?.wakeTime ?? '06:00',
    sleepActive:   (sleepRow?.isActive ?? 0) === 1,
    routineItems:  routineItemRows,
    routineCounts,
    carePoints,
    harvestedCount,
    daysSinceLastLog,
  };
}

// ── 중복 initialize 방지용 모듈 레벨 Promise ────────────────────────────────────
// React 컴포넌트 여러 곳에서 동시에 initialize를 호출해도 DB 조회가 1회만 실행됨
let initializingPromise: Promise<void> | null = null;

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── initialize ─────────────────────────────────────────────────────────────

  initialize: (db) => {
    if (get().isInitialized) return Promise.resolve();
    if (initializingPromise)  return initializingPromise;

    initializingPromise = (async () => {
      set({ isLoading: true });
      try {
        const data = await loadFromDB(db);
        set({ ...data, isInitialized: true, isLoading: false });
      } catch (err) {
        set({ isLoading: false });
        console.error('[AppStore] initialize 실패:', err);
      } finally {
        initializingPromise = null;
      }
    })();

    return initializingPromise;
  },

  // ── refresh ─────────────────────────────────────────────────────────────────

  refresh: async (db) => {
    set({ isLoading: true });
    try {
      const data = await loadFromDB(db);
      set({ ...data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      console.error('[AppStore] refresh 실패:', err);
    }
  },

  // ── saveMoodLog ────────────────────────────────────────────────────────────
  //
  // 낙관적 업데이트 흐름:
  //   1. 스토어 즉시 갱신 (todayMoodLog, allMoodLogs)
  //   2. SQLite UPSERT 비동기 실행
  //   3. INSERT 성공 시 DB에서 받은 실제 id로 스토어 보정
  //   4. 실패 시 이전 상태로 롤백

  saveMoodLog: async (db, sliders, emotions, note) => {
    const today     = localDateKey();
    const scoreJson = JSON.stringify(sliders);
    const tagsJson  = JSON.stringify([...emotions]);

    const prev = get().todayMoodLog;

    // 낙관적 업데이트 (id = -1 은 신규 플레이스홀더)
    const optimistic: MoodLogRow = {
      id:    prev?.id ?? -1,
      date:  today,
      score: scoreJson,
      tags:  tagsJson,
      memo:  note,
    };

    set(state => ({
      todayMoodLog: optimistic,
      allMoodLogs:  state.allMoodLogs.some(r => r.date === today)
        ? state.allMoodLogs.map(r => r.date === today ? optimistic : r)
        : [...state.allMoodLogs, optimistic],
    }));

    try {
      if (prev !== null) {
        // UPDATE
        await db.runAsync(
          'UPDATE MoodLogs SET score=?, tags=?, memo=? WHERE id=?',
          [scoreJson, tagsJson, note, prev.id],
        );
      } else {
        // INSERT — DB에서 발급된 id로 스토어 보정
        const result = await db.runAsync(
          'INSERT INTO MoodLogs (date, score, tags, memo) VALUES (?, ?, ?, ?)',
          [today, scoreJson, tagsJson, note],
        );
        const confirmed: MoodLogRow = { id: result.lastInsertRowId, date: today, score: scoreJson, tags: tagsJson, memo: note };
        set(state => ({
          todayMoodLog: confirmed,
          allMoodLogs:  state.allMoodLogs.map(r => r.date === today ? confirmed : r),
          // 새 기록 저장 → carePoints +1, daysSinceLastLog 리셋
          carePoints:       state.carePoints + 1,
          daysSinceLastLog: 0,
        }));
      }
      refreshWidget(db).catch(() => {});
    } catch (err) {
      // 롤백
      set(state => ({
        todayMoodLog: prev,
        allMoodLogs:  prev === null
          ? state.allMoodLogs.filter(r => r.date !== today)
          : state.allMoodLogs.map(r => r.date === today ? prev : r),
      }));
      console.error('[AppStore] saveMoodLog 실패:', err);
      throw err;
    }
  },

  // ── adjustRoutineCount ────────────────────────────────────────────────────

  adjustRoutineCount: async (db, id, delta) => {
    const { routineItems, routineCounts } = get();
    const item = routineItems.find(r => r.id === id);
    if (!item) return;

    const current = routineCounts[id] ?? 0;
    const next    = Math.max(0, Math.min(item.targetCount, current + delta));
    if (next === current) return;

    const prevCounts = routineCounts;
    const newCounts: Record<number, number> = { ...routineCounts, [id]: next };

    // 낙관적 업데이트
    set({ routineCounts: newCounts });

    try {
      await db.runAsync(
        `INSERT INTO RoutineLogs (date, completed) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET completed = excluded.completed`,
        [localDateKey(), JSON.stringify(newCounts)],
      );
      // UPSERT 완료 후 디바운스 갱신:
      // 연속 터치 N회 → 마지막 500ms 정지 후 위젯 1회만 업데이트
      scheduleWidgetRefresh(db);
    } catch (err) {
      set({ routineCounts: prevCounts });
      console.error('[AppStore] adjustRoutineCount 실패:', err);
      throw err;
    }
  },

  // ── addRoutineItem ────────────────────────────────────────────────────────

  addRoutineItem: async (db, label, emoji, targetCount) => {
    const { routineItems } = get();
    const maxOrder = routineItems.length > 0
      ? Math.max(...routineItems.map(r => r.orderIndex))
      : -1;

    const result = await db.runAsync(
      'INSERT INTO RoutineItems (label, emoji, targetCount, orderIndex, isActive) VALUES (?, ?, ?, ?, 1)',
      [label, emoji || null, targetCount, maxOrder + 1],
    );

    const newItem: RoutineItem = {
      id:          result.lastInsertRowId,
      label,
      emoji:       emoji || null,
      targetCount,
      orderIndex:  maxOrder + 1,
      isActive:    1,
    };
    set(state => ({ routineItems: [...state.routineItems, newItem] }));
    // routineTotal 변화 → 위젯 갱신 (단발, 빠른 재클릭 없으므로 디바운스로 충분)
    scheduleWidgetRefresh(db);
  },

  // ── deleteRoutineItem ─────────────────────────────────────────────────────

  deleteRoutineItem: async (db, id) => {
    const prev = get().routineItems;

    // 낙관적 업데이트
    set(state => ({ routineItems: state.routineItems.filter(r => r.id !== id) }));

    try {
      await db.runAsync('UPDATE RoutineItems SET isActive = 0 WHERE id = ?', [id]);
      // routineTotal 변화 → 위젯 갱신
      scheduleWidgetRefresh(db);
    } catch (err) {
      set({ routineItems: prev });
      console.error('[AppStore] deleteRoutineItem 실패:', err);
      throw err;
    }
  },

  // ── addPresetRoutine ──────────────────────────────────────────────────────

  addPresetRoutine: async (db, preset) => {
    const { routineItems } = get();
    if (routineItems.some(r => r.label === preset.label)) return;

    const maxOrder = routineItems.length > 0
      ? Math.max(...routineItems.map(r => r.orderIndex))
      : -1;

    const result = await db.runAsync(
      'INSERT INTO RoutineItems (label, emoji, targetCount, orderIndex, isActive) VALUES (?, ?, ?, ?, 1)',
      [preset.label, preset.emoji, preset.targetCount, maxOrder + 1],
    );

    const newItem: RoutineItem = {
      id:          result.lastInsertRowId,
      label:       preset.label,
      emoji:       preset.emoji,
      targetCount: preset.targetCount,
      orderIndex:  maxOrder + 1,
      isActive:    1,
    };
    set(state => ({ routineItems: [...state.routineItems, newItem] }));
    // routineTotal 변화 → 위젯 갱신
    scheduleWidgetRefresh(db);
  },

  // ── harvestOlive ──────────────────────────────────────────────────────────

  harvestOlive: async (db) => {
    const { carePoints, harvestedCount, daysSinceLastLog } = get();
    if (computeTreeLevel(carePoints, harvestedCount, daysSinceLastLog) !== 6) return;

    const prev = harvestedCount;
    // 낙관적 업데이트
    set(state => ({ harvestedCount: state.harvestedCount + 1 }));

    try {
      await db.runAsync(
        `INSERT INTO UserStats (key, value) VALUES ('harvestedOlives', 1)
         ON CONFLICT(key) DO UPDATE SET value = value + 1`,
      );
      refreshWidget(db).catch(() => {});
    } catch (err) {
      set({ harvestedCount: prev });
      console.error('[AppStore] harvestOlive 실패:', err);
      throw err;
    }
  },

  // ── saveSleepSettings ─────────────────────────────────────────────────────

  saveSleepSettings: async (db, bedTime, wakeTime, notifId) => {
    const prev = { sleepBed: get().sleepBed, sleepWake: get().sleepWake, sleepActive: get().sleepActive };

    // 낙관적 업데이트
    set({ sleepBed: bedTime, sleepWake: wakeTime, sleepActive: true });

    try {
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM SleepSettings LIMIT 1'
      );
      if (existing) {
        await db.runAsync(
          'UPDATE SleepSettings SET bedTime=?, wakeTime=?, isActive=1, notifId=? WHERE id=?',
          [bedTime, wakeTime, notifId, existing.id],
        );
      } else {
        await db.runAsync(
          'INSERT INTO SleepSettings (bedTime, wakeTime, isActive, notifId) VALUES (?, ?, 1, ?)',
          [bedTime, wakeTime, notifId],
        );
      }
    } catch (err) {
      set(prev);
      console.error('[AppStore] saveSleepSettings 실패:', err);
      throw err;
    }
  },

  // ── saveAssessment ────────────────────────────────────────────────────────

  saveAssessment: async (db, type, answers) => {
    const score   = answers.reduce((a, b) => a + b, 0);
    const dateKey = localDateKey();

    try {
      await db.runAsync(
        'INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)',
        [dateKey, type, score, JSON.stringify(answers)],
      );
    } catch { /* 동일 날짜 중복 무시 */ }

    // 저장 후 해당 종류의 히스토리 갱신
    const [latest, hist] = await Promise.all([
      db.getFirstAsync<AssessmentRow>(
        'SELECT * FROM AssessmentLogs WHERE type=? ORDER BY date DESC LIMIT 1', [type]
      ),
      db.getAllAsync<AssessmentRow>(
        'SELECT * FROM AssessmentLogs WHERE type=? ORDER BY date ASC', [type]
      ),
    ]);

    if (type === 'PHQ9') {
      set({ phq9Latest: latest ?? null, phq9History: hist.slice(-8) });
    } else {
      set({ gad7Latest: latest ?? null, gad7History: hist.slice(-8) });
    }
  },

  // ── loadAssessmentData ────────────────────────────────────────────────────

  loadAssessmentData: async (db) => {
    const [latest9, latest7, hist9, hist7] = await Promise.all([
      db.getFirstAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='PHQ9' ORDER BY date DESC LIMIT 1"),
      db.getFirstAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='GAD7' ORDER BY date DESC LIMIT 1"),
      db.getAllAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='PHQ9' ORDER BY date ASC"),
      db.getAllAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='GAD7' ORDER BY date ASC"),
    ]);
    set({
      phq9Latest:  latest9 ?? null,
      gad7Latest:  latest7 ?? null,
      phq9History: hist9.slice(-8),
      gad7History: hist7.slice(-8),
    });
  },
}));
