// src/widget/widgetData.ts
//
// 위젯 데이터 빌더 + 갱신 트리거
//
// WAL 안전성 보장 근거
//   expo-sqlite는 앱 프로세스 내 단일 커넥션을 공유한다.
//   WAL 모드에서 같은 커넥션의 SELECT는 해당 커넥션이 완료한 모든 쓰기를
//   즉시 읽을 수 있다 (PRAGMA wal_checkpoint 불필요).
//   따라서 `await db.runAsync(...)` 완료 → `buildWidgetData(db)` 호출 순서만
//   보장되면 데이터 유실 없이 최신 상태가 위젯에 반영된다.

import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  computeTreeLevel,
  localDateKey,
  parseRoutineCompleted,
} from '../types/app';

// ── 공개 타입 ─────────────────────────────────────────────────────────────────

export interface OliveMindWidgetData {
  treeLevel:    number;
  routineDone:  number;
  routineTotal: number;
  treeMessage:  string;
}

// ── 레벨별 메시지 ─────────────────────────────────────────────────────────────

const TREE_MESSAGES: Record<number, string> = {
  0: '마음의 씨앗이 심어졌어요',
  1: '새싹이 자라나고 있어요',
  2: '어린 올리브 묘목이에요',
  3: '뿌리를 내리며 단단해져요',
  4: '무럭무럭 자라나고 있어요',
  5: '열매를 맺기 직전이에요',
  6: '올리브를 수확할 수 있어요',
  7: '나무가 보살핌을 기다려요',
};

// ── buildWidgetData ───────────────────────────────────────────────────────────
// 호출 전제: DB 쓰기 await 완료 후 (WAL 커밋 보장)

export async function buildWidgetData(db: SQLiteDatabase): Promise<OliveMindWidgetData> {
  const today = localDateKey();

  const [
    moodCntRow,
    breathCntRow,
    latestMoodRow,
    latestBreathRow,   // ← 이전 버전에서 누락 — daysSinceLastLog 오계산 수정
    harvestedRow,
    routineLogRow,
    routineItemRows,   // ← 이전 버전에서 누락 — routineTotal 하드코딩(3) 수정
  ] = await Promise.all([
    db.getFirstAsync<{ moodCount:   number | null }>('SELECT COUNT(*) as moodCount FROM MoodLogs'),
    db.getFirstAsync<{ breathCount: number | null }>('SELECT SUM(count) as breathCount FROM BreathingLogs'),
    db.getFirstAsync<{ latestDate:  string | null }>('SELECT MAX(date) as latestDate FROM MoodLogs'),
    db.getFirstAsync<{ latestDate:  string | null }>('SELECT MAX(date) as latestDate FROM BreathingLogs'),
    db.getFirstAsync<{ value: number }>(`SELECT value FROM UserStats WHERE key = 'harvestedOlives'`),
    db.getFirstAsync<{ completed: string }>('SELECT completed FROM RoutineLogs WHERE date = ?', [today]),
    db.getAllAsync<{ id: number; targetCount: number }>(
      'SELECT id, targetCount FROM RoutineItems WHERE isActive = 1'
    ),
  ]);

  // ── 케어 포인트 & 나무 레벨 ────────────────────────────────────────────────
  const carePoints     = (moodCntRow?.moodCount ?? 0) + (breathCntRow?.breathCount ?? 0);
  const harvestedCount = harvestedRow?.value ?? 0;

  // daysSinceLastLog: MoodLogs와 BreathingLogs 중 더 최근 날짜 기준
  const latestDate = [latestMoodRow?.latestDate, latestBreathRow?.latestDate]
    .filter((d): d is string => d !== null && d !== undefined)
    .sort()
    .pop();

  const daysSinceLastLog = latestDate
    ? Math.max(0, Math.floor((Date.now() - new Date(latestDate + 'T00:00:00').getTime()) / 86_400_000))
    : 0;

  const treeLevel = computeTreeLevel(carePoints, harvestedCount, daysSinceLastLog);

  // ── 루틴 달성률 ────────────────────────────────────────────────────────────
  // parseRoutineCompleted: Record<number, number> 형식(itemId → count)으로 파싱
  // 이전 버전 버그: string[] 형식으로 파싱해 항상 0이 반환됐음
  const countMap = parseRoutineCompleted(routineLogRow?.completed ?? null);

  const routineTotal = routineItemRows.length;
  const routineDone  = routineItemRows.filter(
    item => (countMap[item.id] ?? 0) >= item.targetCount
  ).length;

  return {
    treeLevel,
    routineDone,
    routineTotal,
    treeMessage: TREE_MESSAGES[treeLevel] ?? '',
  };
}

// ── refreshWidget ─────────────────────────────────────────────────────────────
// 단발성 즉각 갱신 (저장 버튼, 수확 등 연속 호출 가능성이 낮은 액션에 사용)
// 위젯 미배치 / 라이브러리 미지원 시 조용히 무시

export async function refreshWidget(db: SQLiteDatabase): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  try {
    const data = await buildWidgetData(db);

    if (Platform.OS === 'ios') {
      // expo-widgets: JS → 네이티브 타임라인 갱신
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const widgetMod = require('../../widgets/OliveMindWidget') as {
        default: { updateTimeline: (d: OliveMindWidgetData) => void };
      };
      widgetMod.default.updateTimeline(data);

    } else {
      // react-native-android-widget: 홈 화면 위젯 즉시 재렌더
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requestWidgetUpdate } = require('react-native-android-widget') as {
        requestWidgetUpdate: (opts: {
          widgetName:   string;
          renderWidget: () => React.ReactElement;
          widgetNotFound: () => void;
        }) => Promise<void>;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const React = require('react') as typeof import('react');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: OliveMindAndroidWidget } = require('../../widgets/OliveMindAndroidWidget') as {
        default: React.ComponentType<OliveMindWidgetData>;
      };

      await requestWidgetUpdate({
        widgetName:     'OliveMindWidget',
        renderWidget:   () => React.createElement(OliveMindAndroidWidget, data),
        widgetNotFound: () => {},
      });
    }
  } catch {
    // 위젯 미배치 또는 라이브러리 미설치 — 조용히 무시
  }
}

// ── scheduleWidgetRefresh ─────────────────────────────────────────────────────
// 연속 터치(루틴 다다닥 클릭 등)의 중복 갱신을 디바운스로 병합.
//
// 동작 원리:
//   호출마다 타이머를 리셋 → 마지막 호출 후 delayMs ms 경과 시 1회만 실행.
//   버스트 N회 호출 → 위젯 갱신 1회 (마지막 DB 상태 반영).
//
// WAL 보장: 타이머 발화 시점에는 버스트 내 모든 UPSERT가 이미 완료되었으므로
//   buildWidgetData가 항상 최신 상태를 읽는다.

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingDb:     SQLiteDatabase | null               = null;

export function scheduleWidgetRefresh(db: SQLiteDatabase, delayMs = 500): void {
  // 최신 db 참조를 항상 유지 (안정적 싱글턴이므로 실질적으로 동일 객체)
  _pendingDb = db;

  if (_debounceTimer !== null) clearTimeout(_debounceTimer);

  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    const target = _pendingDb;
    _pendingDb    = null;
    if (target !== null) {
      refreshWidget(target).catch(() => {});
    }
  }, delayMs);
}
