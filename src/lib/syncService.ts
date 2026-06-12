// src/lib/syncService.ts
//
// Supabase ↔ SQLite 양방향 동기화 서비스
//
// ─── Supabase 테이블 생성 SQL ────────────────────────────────────────────────
// Supabase Dashboard > SQL Editor 에서 아래 SQL을 1회 실행하세요.
//
//   -- 1. mood_logs
//   CREATE TABLE IF NOT EXISTS public.mood_logs (
//     id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     date        TEXT        NOT NULL,
//     score       JSONB,
//     tags        TEXT,
//     memo        TEXT,
//     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (user_id, date)
//   );
//   ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own mood_logs" ON public.mood_logs
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- 2. routine_items (웹·앱 공유 UUID 키 소스)
//   CREATE TABLE IF NOT EXISTS public.routine_items (
//     id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id      UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     label        TEXT        NOT NULL,
//     emoji        TEXT,
//     target_count INTEGER     NOT NULL DEFAULT 1,
//     order_index  INTEGER     NOT NULL DEFAULT 0,
//     is_active    BOOLEAN     NOT NULL DEFAULT true,
//     updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//   ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own routine_items" ON public.routine_items
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- 3. routine_logs  (completed 키 = routine_items.id UUID)
//   CREATE TABLE IF NOT EXISTS public.routine_logs (
//     id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     date        TEXT        NOT NULL,
//     completed   JSONB       NOT NULL DEFAULT '{}',
//     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (user_id, date)
//   );
//   ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own routine_logs" ON public.routine_logs
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- 4. breathing_logs
//   CREATE TABLE IF NOT EXISTS public.breathing_logs (
//     id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     date        TEXT        NOT NULL,
//     count       INTEGER     NOT NULL DEFAULT 0,
//     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (user_id, date)
//   );
//   ALTER TABLE public.breathing_logs ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own breathing_logs" ON public.breathing_logs
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- 5. user_stats  (key/value 스키마)
//   CREATE TABLE IF NOT EXISTS public.user_stats (
//     id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     key         TEXT        NOT NULL,
//     value       INTEGER     NOT NULL DEFAULT 0,
//     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (user_id, key)
//   );
//   ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own user_stats" ON public.user_stats
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- 6. sleep_settings
//   CREATE TABLE IF NOT EXISTS public.sleep_settings (
//     id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id    UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     bed_time   TEXT        NOT NULL DEFAULT '22:30',
//     wake_time  TEXT        NOT NULL DEFAULT '07:00',
//     is_active  BOOLEAN     NOT NULL DEFAULT false,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE (user_id)
//   );
//   ALTER TABLE public.sleep_settings ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own sleep_settings" ON public.sleep_settings
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- 7. test_results  (앱 saveTestResult() → 웹 검사 이력 페이지에서 조회)
//   CREATE TABLE IF NOT EXISTS public.test_results (
//     id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id        UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
//     test_type      TEXT        NOT NULL,
//     score          NUMERIC,
//     result_summary TEXT,
//     created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//   ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "users own test_results" ON public.test_results
//     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
// ─── 기존 테이블에 UNIQUE 제약 추가 (이미 있는 경우에만 실행) ──────────────────
//
//   ALTER TABLE public.mood_logs    DROP CONSTRAINT IF EXISTS mood_logs_user_id_date_key;
//   ALTER TABLE public.mood_logs    ADD  CONSTRAINT mood_logs_user_id_date_key    UNIQUE (user_id, date);
//   ALTER TABLE public.routine_logs DROP CONSTRAINT IF EXISTS routine_logs_user_id_date_key;
//   ALTER TABLE public.routine_logs ADD  CONSTRAINT routine_logs_user_id_date_key UNIQUE (user_id, date);
//   ALTER TABLE public.user_stats   DROP CONSTRAINT IF EXISTS user_stats_user_id_key_key;
//   ALTER TABLE public.user_stats   ADD  CONSTRAINT user_stats_user_id_key_key    UNIQUE (user_id, key);
//   ALTER TABLE public.mood_logs    ADD COLUMN IF NOT EXISTS tags TEXT;
//   ALTER TABLE public.mood_logs    ADD COLUMN IF NOT EXISTS memo TEXT;
// ─────────────────────────────────────────────────────────────────────────────

import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from './supabase';

// ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

async function getUid(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

// ── Pull: Supabase → SQLite ───────────────────────────────────────────────────
//
// 로그인(SIGNED_IN) 또는 앱 재시작(INITIAL_SESSION) 시 _layout.tsx에서 1회 호출.
// RoutineItems는 UUID 매핑의 소스이므로 다른 pull 보다 먼저 완료해야 함.

export async function pullFromSupabase(db: SQLiteDatabase): Promise<void> {
  const uid = await getUid();
  if (!uid) return;

  // RoutineItems 먼저 완료 → routine_logs pull 시 UUID→localId 매핑 가능
  await _pullRoutineItems(db, uid).catch(() => {});

  await Promise.allSettled([
    _pullMoodLogs(db, uid),
    _pullRoutineLogs(db, uid),
    _pullBreathingLogs(db, uid),
    _pullUserStats(db, uid),
    _pullSleepSettings(db, uid),
  ]);
}

// ── _pullRoutineItems ────────────────────────────────────────────────────────
//
// Supabase routine_items → SQLite RoutineItems.supabase_id 매핑.
// 매칭 우선순위: supabase_id 일치 > label 일치 > 신규 삽입.

async function _pullRoutineItems(db: SQLiteDatabase, uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('routine_items')
    .select('id, label, emoji, target_count, order_index, is_active')
    .eq('user_id', uid)
    .order('order_index', { ascending: true });

  if (error || !data?.length) return;

  const localItems = await db.getAllAsync<{
    id: number; label: string; supabase_id: string | null;
  }>('SELECT id, label, supabase_id FROM RoutineItems');

  const bySupabaseId = new Map(
    localItems.filter(r => r.supabase_id).map(r => [r.supabase_id!, r.id]),
  );
  const byLabel = new Map(localItems.map(r => [r.label, r.id]));

  await db.withTransactionAsync(async () => {
    for (const item of data) {
      if (bySupabaseId.has(item.id)) {
        // 이미 매핑된 항목 — 내용만 최신화
        await db.runAsync(
          'UPDATE RoutineItems SET label=?, emoji=?, targetCount=?, orderIndex=?, isActive=? WHERE id=?',
          [item.label, item.emoji ?? null, item.target_count, item.order_index,
           item.is_active ? 1 : 0, bySupabaseId.get(item.id)!],
        );
      } else if (byLabel.has(item.label)) {
        // label로 동일 항목 발견 — supabase_id 연결
        await db.runAsync(
          'UPDATE RoutineItems SET supabase_id=?, emoji=?, targetCount=?, orderIndex=?, isActive=? WHERE id=?',
          [item.id, item.emoji ?? null, item.target_count, item.order_index,
           item.is_active ? 1 : 0, byLabel.get(item.label)!],
        );
      } else {
        // 웹에서 추가된 새 항목 — 로컬에 삽입
        await db.runAsync(
          'INSERT INTO RoutineItems (label, emoji, targetCount, orderIndex, isActive, supabase_id) VALUES (?, ?, ?, ?, ?, ?)',
          [item.label, item.emoji ?? null, item.target_count, item.order_index,
           item.is_active ? 1 : 0, item.id],
        );
      }
    }
  });
}

async function _pullMoodLogs(db: SQLiteDatabase, uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('date, score, tags, memo')
    .eq('user_id', uid)
    .order('date', { ascending: true });

  if (error || !data?.length) return;

  const localDates = new Set(
    (await db.getAllAsync<{ date: string }>('SELECT date FROM MoodLogs')).map(r => r.date),
  );

  await db.withTransactionAsync(async () => {
    for (const row of data) {
      // Supabase JSONB(객체) → SQLite TEXT(JSON 문자열)로 직렬화
      const scoreStr = row.score == null ? null
        : typeof row.score === 'string' ? row.score
        : JSON.stringify(row.score);
      if (localDates.has(row.date)) {
        await db.runAsync(
          'UPDATE MoodLogs SET score=?, tags=?, memo=? WHERE date=?',
          [scoreStr, row.tags ?? null, row.memo ?? null, row.date],
        );
      } else {
        await db.runAsync(
          'INSERT INTO MoodLogs (date, score, tags, memo) VALUES (?, ?, ?, ?)',
          [row.date, scoreStr, row.tags ?? null, row.memo ?? null],
        );
      }
    }
  });
}

// ── _pullRoutineLogs ─────────────────────────────────────────────────────────
//
// Supabase의 completed JSONB 키는 UUID(routine_items.id).
// 로컬 RoutineItems.supabase_id를 역방향 조회해 로컬 정수 ID로 변환.

async function _pullRoutineLogs(db: SQLiteDatabase, uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('routine_logs')
    .select('date, completed')
    .eq('user_id', uid)
    .order('date', { ascending: true });

  if (error || !data?.length) return;

  // UUID → 로컬 integer ID 역방향 맵
  const localItems = await db.getAllAsync<{ id: number; supabase_id: string | null }>(
    'SELECT id, supabase_id FROM RoutineItems WHERE supabase_id IS NOT NULL',
  );
  const uuidToLocalId = new Map(localItems.map(r => [r.supabase_id!, r.id]));

  await db.withTransactionAsync(async () => {
    for (const row of data) {
      const completedRaw: Record<string, number> =
        row.completed == null ? {}
        : typeof row.completed === 'string' ? JSON.parse(row.completed)
        : row.completed;

      // UUID 키 → 로컬 정수 키 변환 (매핑 없는 UUID는 건너뜀)
      const mapped: Record<string, number> = {};
      for (const [key, value] of Object.entries(completedRaw)) {
        const localId = uuidToLocalId.get(key);
        if (localId != null) mapped[String(localId)] = value;
      }

      await db.runAsync(
        `INSERT INTO RoutineLogs (date, completed) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET completed = excluded.completed`,
        [row.date, JSON.stringify(mapped)],
      );
    }
  });
}

async function _pullBreathingLogs(db: SQLiteDatabase, uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('breathing_logs')
    .select('date, count')
    .eq('user_id', uid)
    .order('date', { ascending: true });

  if (error || !data?.length) return;

  await db.withTransactionAsync(async () => {
    for (const row of data) {
      // 로컬과 원격 중 더 큰 값 유지 (중복 세션 방지)
      await db.runAsync(
        `INSERT INTO BreathingLogs (date, count) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET count = MAX(excluded.count, BreathingLogs.count)`,
        [row.date, row.count],
      );
    }
  });
}

async function _pullUserStats(db: SQLiteDatabase, uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('value')
    .eq('user_id', uid)
    .eq('key', 'harvested_olives')
    .maybeSingle();

  if (error || !data) return;

  // 로컬과 원격 중 더 큰 수확 횟수 유지
  await db.runAsync(
    `INSERT INTO UserStats (key, value) VALUES ('harvestedOlives', ?)
     ON CONFLICT(key) DO UPDATE SET value = MAX(excluded.value, UserStats.value)`,
    [data.value],
  );
}

async function _pullSleepSettings(db: SQLiteDatabase, uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('sleep_settings')
    .select('bed_time, wake_time, is_active')
    .eq('user_id', uid)
    .maybeSingle();

  if (error || !data) return;

  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM SleepSettings LIMIT 1');
  if (existing) {
    await db.runAsync(
      'UPDATE SleepSettings SET bedTime=?, wakeTime=?, isActive=? WHERE id=?',
      [data.bed_time, data.wake_time, data.is_active ? 1 : 0, existing.id],
    );
  } else {
    await db.runAsync(
      'INSERT INTO SleepSettings (bedTime, wakeTime, isActive) VALUES (?, ?, ?)',
      [data.bed_time, data.wake_time, data.is_active ? 1 : 0],
    );
  }
}

// ── Push helpers: SQLite → Supabase ──────────────────────────────────────────
//
// 각 함수는 useAppStore / useBreathSession 에서 fire-and-forget으로 호출됨.
// 네트워크 오류는 호출 측 .catch(() => {}) 에서 소비.

export async function pushMoodLog(
  uid: string,
  log: { date: string; score: string; tags: string | null; memo: string | null },
): Promise<void> {
  // SQLite TEXT(JSON 문자열) → Supabase JSONB 객체로 역직렬화
  let score: unknown;
  try { score = JSON.parse(log.score); } catch { score = log.score; }

  const { error } = await supabase
    .from('mood_logs')
    .upsert(
      { user_id: uid, date: log.date, score, tags: log.tags, memo: log.memo, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    );
  if (error) console.warn('[sync] pushMoodLog:', error.message);
}

// ── pushRoutineLog ───────────────────────────────────────────────────────────
//
// completed 맵의 키를 로컬 정수 ID → supabase_id(UUID)로 변환하여 push.
// supabase_id 없는 앱 전용 항목은 로컬 키 그대로 전송(웹에서 무시되지만 손실 없음).

export async function pushRoutineLog(
  uid: string,
  date: string,
  completed: string,
  db: SQLiteDatabase,
): Promise<void> {
  const localItems = await db.getAllAsync<{ id: number; supabase_id: string | null }>(
    'SELECT id, supabase_id FROM RoutineItems',
  );
  const localIdToUuid = new Map(
    localItems.filter(r => r.supabase_id).map(r => [String(r.id), r.supabase_id!]),
  );

  const completedLocal: Record<string, number> = JSON.parse(completed);
  const completedUuid: Record<string, number> = {};
  for (const [localKey, value] of Object.entries(completedLocal)) {
    const uuid = localIdToUuid.get(localKey);
    completedUuid[uuid ?? localKey] = value;
  }

  const { error } = await supabase
    .from('routine_logs')
    .upsert(
      { user_id: uid, date, completed: completedUuid, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    );
  if (error) console.warn('[sync] pushRoutineLog:', error.message);
}

export async function pushBreathingLog(
  uid: string,
  date: string,
  count: number,
): Promise<void> {
  const { error } = await supabase
    .from('breathing_logs')
    .upsert(
      { user_id: uid, date, count, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    );
  if (error) console.warn('[sync] pushBreathingLog:', error.message);
}

export async function pushUserStats(
  uid: string,
  harvestedOlives: number,
): Promise<void> {
  const { error } = await supabase
    .from('user_stats')
    .upsert(
      { user_id: uid, key: 'harvested_olives', value: harvestedOlives, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' },
    );
  if (error) console.warn('[sync] pushUserStats:', error.message);
}

export async function pushSleepSettings(
  uid: string,
  bedTime: string,
  wakeTime: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('sleep_settings')
    .upsert(
      { user_id: uid, bed_time: bedTime, wake_time: wakeTime, is_active: isActive, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) console.warn('[sync] pushSleepSettings:', error.message);
}
