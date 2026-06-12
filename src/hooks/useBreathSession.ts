// src/hooks/useBreathSession.ts
//
// 복식 호흡 세션 관리 훅
//
// 타이머 정확도 설계
//   기존 setTimeout 체인은 JS 스레드가 일시정지(앱 백그라운드, 전화, 화면 잠금)되면
//   타이머 발화가 지연 또는 누락된다.
//
//   이 훅은 에포크 기반(Date.now()) 마스터 틱을 사용한다.
//     - 200ms 단일 setInterval이 상태를 '폴링'하는 구조
//     - 틱이 몇 번 스킵돼도, 다음 틱에서 Date.now() - phaseStartAt 으로
//       실제 경과 시간을 계산해 자동 보정
//     - 페이즈 경계를 넘쳤을 때(overshoot)는 초과분을 다음 페이즈 시작 시간에 반영
//
//   AppState 복귀 처리
//     - 백그라운드 < BG_PAUSE_THRESHOLD(10s): 경과 시간으로 페이즈/사이클 패스트포워드
//     - 백그라운드 ≥ BG_PAUSE_THRESHOLD(10s): 세션 일시정지(isPaused), 사용자가 재개 선택

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { Video } from 'expo-av';
import { refreshWidget } from '../widget/widgetData';

// ── 공개 상수 ─────────────────────────────────────────────────────────────────

export type Phase       = 'inhale' | 'exhale';
export type TempoOption = 'slow' | 'normal' | 'fast';

/** 템포별 페이즈 타이밍 (ms) & 비디오 재생 속도 배율 */
export const BREATH_TIMINGS: Record<TempoOption, { inhale: number; exhale: number; rate: number }> = {
  slow:   { inhale: 5_000, exhale: 7_000, rate: 10_000 / 12_000 }, // ≈ 0.833×
  normal: { inhale: 4_000, exhale: 6_000, rate: 1.0 },
  fast:   { inhale: 3_000, exhale: 5_000, rate: 10_000 /  8_000 }, // = 1.25×
};

const REQUIRED_CYCLES         = 6;
const TICK_INTERVAL_MS        = 200;   // 에포크 폴링 간격
const BG_PAUSE_THRESHOLD_MS   = 10_000; // 이 이상 백그라운드 → 세션 일시정지

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 인터페이스 ────────────────────────────────────────────────────────────────

export interface BreathSessionState {
  modalVisible:   boolean;
  isPlaying:      boolean;
  isPaused:       boolean; // 백그라운드 장기 진입으로 인한 일시정지
  phase:          Phase;
  phaseCountdown: number;  // 현재 페이즈 남은 정수 초
  cycleCount:     number;  // 완료된 사이클 수 (0~6)
  todayCount:     number;  // 오늘 완료 세션 수
  sessionSeconds: number;  // 현재 세션 경과 초
  tempo:          TempoOption;
}

export interface BreathSessionActions {
  /** 모달 열기 + 세션 시작 */
  openModal:    () => void;
  /** 모달 닫기 + 세션 중단 */
  closeModal:   () => void;
  /** 템포 변경 (진행 중이면 사이클 리셋 후 재시작) */
  changeTempo:  (t: TempoOption) => void;
  /** 백그라운드 일시정지 후 재개 */
  resume:       () => void;
}

// ── 훅 ───────────────────────────────────────────────────────────────────────

export function useBreathSession(
  videoRef: { current: Video | null },
): { state: BreathSessionState; actions: BreathSessionActions } {
  const db = useSQLiteContext();

  // ── React state (렌더 구동) ──────────────────────────────────────────────
  const [modalVisible,   setModalVisible]   = useState(false);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [isPaused,       setIsPaused]       = useState(false);
  const [phase,          setPhase]          = useState<Phase>('inhale');
  const [phaseCountdown, setPhaseCountdown] = useState(BREATH_TIMINGS.normal.inhale / 1000);
  const [cycleCount,     setCycleCount]     = useState(0);
  const [todayCount,     setTodayCount]     = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [tempo,          setTempo]          = useState<TempoOption>('normal');

  // ── Epoch refs (타이머 콜백에서 안전하게 읽는 최신 값) ───────────────────
  const isPlayingRef     = useRef(false);
  const isPausedRef      = useRef(false);
  const phaseRef         = useRef<Phase>('inhale');
  const tempoRef         = useRef<TempoOption>('normal');
  const cycleCountRef    = useRef(0);
  const phaseStartAtRef  = useRef(0);            // Date.now() at phase start
  const phaseDurRef      = useRef(BREATH_TIMINGS.normal.inhale); // ms
  const bgEnteredAtRef   = useRef<number | null>(null);
  const completingRef    = useRef(false);        // 이중 완료 방지 가드

  // ── Timer refs ───────────────────────────────────────────────────────────
  const tickerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 세션 타이머 제어 ─────────────────────────────────────────────────────
  const startSessionTimer = useCallback(() => {
    if (sessionTickRef.current) clearInterval(sessionTickRef.current);
    sessionTickRef.current = setInterval(
      () => setSessionSeconds(s => s + 1),
      1000,
    );
  }, []);

  const stopSessionTimer = useCallback(() => {
    if (sessionTickRef.current) {
      clearInterval(sessionTickRef.current);
      sessionTickRef.current = null;
    }
  }, []);

  // ── 세션 완료 처리 ────────────────────────────────────────────────────────
  // DB UPSERT → refreshWidget 순서 보장 (WAL 동일 커넥션 즉시 가시성 이용)
  const handleCompleteRef = useRef<() => Promise<void>>(async () => {});
  handleCompleteRef.current = async () => {
    if (completingRef.current) return;
    completingRef.current = true;

    stopSessionTimer();
    isPlayingRef.current = false;
    isPausedRef.current  = false;

    setIsPlaying(false);
    setIsPaused(false);
    setModalVisible(false);
    setPhase('inhale');
    setCycleCount(0);
    cycleCountRef.current = 0;
    setSessionSeconds(0);
    setPhaseCountdown(BREATH_TIMINGS[tempoRef.current].inhale / 1000);
    setTodayCount(c => c + 1);

    videoRef.current?.pauseAsync().catch(() => {});

    // ① DB UPSERT 완료 후 ② 위젯 갱신 (await 체인으로 순서 보장)
    try {
      await db.runAsync(
        `INSERT INTO BreathingLogs (date, count) VALUES (?, 1)
         ON CONFLICT(date) DO UPDATE SET count = count + 1`,
        [localDateKey()],
      );
      await refreshWidget(db); // ← DB 커밋 후 즉시 호출
    } catch { /* 비차단: 완료 UX는 이미 표시됨 */ }

    completingRef.current = false;
  };

  // ── 마스터 에포크 틱 (렌더마다 최신 ref 값을 참조) ───────────────────────
  // useRef 패턴: 매 렌더에 함수를 갱신하여 stale closure 방지
  const tickFnRef = useRef<() => void>(() => {});
  tickFnRef.current = () => {
    if (!isPlayingRef.current || isPausedRef.current || completingRef.current) return;

    const elapsed   = Date.now() - phaseStartAtRef.current;
    const remaining = phaseDurRef.current - elapsed;

    // ── 페이즈 내 카운트다운 업데이트 ────────────────────────────────────
    if (remaining > 0) {
      const display = Math.ceil(remaining / 1000);
      setPhaseCountdown(prev => (prev === display ? prev : display));
      return;
    }

    // ── 페이즈 경계 초과 ──────────────────────────────────────────────────
    const overshootMs = Math.abs(remaining); // 경계를 넘쳐 흐른 시간
    const curPhase    = phaseRef.current;
    const curTempo    = tempoRef.current;

    if (curPhase === 'exhale') {
      cycleCountRef.current += 1;
      setCycleCount(cycleCountRef.current);

      if (cycleCountRef.current >= REQUIRED_CYCLES) {
        void handleCompleteRef.current(); // DB + widget 순차 처리
        return;
      }
    }

    // 다음 페이즈로 전환 (overshoot 보정 — 초과 시간을 다음 시작 에포크에 반영)
    const nextPhase: Phase = curPhase === 'inhale' ? 'exhale' : 'inhale';
    const nextDur          = BREATH_TIMINGS[curTempo][nextPhase];

    phaseRef.current        = nextPhase;
    phaseDurRef.current     = nextDur;
    phaseStartAtRef.current = Date.now() - overshootMs;

    setPhase(nextPhase);
    setPhaseCountdown(Math.ceil(Math.max(0, nextDur - overshootMs) / 1000));
  };

  // ── 단일 마스터 틱 (컴포넌트 마운트 시 1회 시작, 언마운트 시 정리) ────────
  useEffect(() => {
    tickerRef.current = setInterval(
      () => tickFnRef.current(),
      TICK_INTERVAL_MS,
    );
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []); // 의도적 빈 dep — 틱은 항상 tickFnRef.current를 호출하므로 stale 없음

  // ── 백그라운드 패스트포워드 ───────────────────────────────────────────────
  // 단기 백그라운드 복귀 시: 경과 시간에 따라 페이즈/사이클 자동 보정
  const fastForwardRef = useRef<(bgDuration: number) => void>(() => {});
  fastForwardRef.current = (bgDuration: number) => {
    // 백그라운드 진입 시점의 경과량 = bgDuration + (진입 시점의 페이즈 내 경과)
    // phaseStartAtRef는 이미 "백그라운드 진입 전" 페이즈 시작 시각이므로
    // Date.now() - phaseStartAtRef.current 가 total elapsed 가 됨
    let remainingMs = Date.now() - phaseStartAtRef.current;
    let curPhase    = phaseRef.current;
    let cycles      = cycleCountRef.current;

    // 경과 시간만큼 페이즈를 순차 소비
    while (true) {
      const phaseDur = BREATH_TIMINGS[tempoRef.current][curPhase];
      if (remainingMs >= phaseDur) {
        remainingMs -= phaseDur;
        if (curPhase === 'exhale') {
          cycles++;
          if (cycles >= REQUIRED_CYCLES) {
            cycleCountRef.current = cycles;
            setCycleCount(cycles);
            void handleCompleteRef.current();
            return;
          }
        }
        curPhase = curPhase === 'inhale' ? 'exhale' : 'inhale';
      } else {
        break;
      }
    }

    // 현재 페이즈 에포크 보정 (remainingMs 만큼 이미 지남)
    phaseRef.current        = curPhase;
    phaseDurRef.current     = BREATH_TIMINGS[tempoRef.current][curPhase];
    phaseStartAtRef.current = Date.now() - remainingMs;
    cycleCountRef.current   = cycles;

    setPhase(curPhase);
    setCycleCount(cycles);
    setPhaseCountdown(
      Math.ceil(Math.max(0, phaseDurRef.current - remainingMs) / 1000)
    );

    // 비디오 재개: 템포에 맞는 rate로 복원
    const t = BREATH_TIMINGS[tempoRef.current];
    videoRef.current
      ?.setStatusAsync({ shouldPlay: true, rate: t.rate })
      .catch(() => {});
  };

  // ── AppState 구독 ─────────────────────────────────────────────────────────
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        if (!isPlayingRef.current || isPausedRef.current) return;

        // ── 백그라운드 진입 ──────────────────────────────────────────────
        if (prev === 'active' && nextState !== 'active') {
          bgEnteredAtRef.current = Date.now();
          videoRef.current?.pauseAsync().catch(() => {});
        }

        // ── 포그라운드 복귀 ──────────────────────────────────────────────
        if (prev !== 'active' && nextState === 'active') {
          const bgAt = bgEnteredAtRef.current;
          bgEnteredAtRef.current = null;
          if (bgAt === null) return;

          const bgDuration = Date.now() - bgAt;

          if (bgDuration < BG_PAUSE_THRESHOLD_MS) {
            // 단기 백그라운드 → 에포크 기반 자동 보정
            fastForwardRef.current(bgDuration);
          } else {
            // 장기 백그라운드 → 세션 일시정지, 사용자 재개 요청
            stopSessionTimer();
            isPausedRef.current = true;
            setIsPaused(true);
          }
        }
      },
    );

    return () => subscription.remove();
  }, [stopSessionTimer, videoRef]);

  // ── actions ──────────────────────────────────────────────────────────────

  const openModal = useCallback(() => {
    const t = tempoRef.current;

    isPlayingRef.current  = false; // 초기화 후 true 설정
    isPausedRef.current   = false;
    completingRef.current = false;
    cycleCountRef.current = 0;
    bgEnteredAtRef.current = null;

    phaseRef.current        = 'inhale';
    phaseDurRef.current     = BREATH_TIMINGS[t].inhale;
    phaseStartAtRef.current = Date.now();

    setModalVisible(true);
    setIsPlaying(true);
    setIsPaused(false);
    setPhase('inhale');
    setCycleCount(0);
    setSessionSeconds(0);
    setPhaseCountdown(BREATH_TIMINGS[t].inhale / 1000);

    isPlayingRef.current = true;

    videoRef.current
      ?.setStatusAsync({ shouldPlay: true, rate: BREATH_TIMINGS[t].rate })
      .catch(() => {});

    startSessionTimer();
  }, [startSessionTimer, videoRef]);

  const closeModal = useCallback(() => {
    stopSessionTimer();

    isPlayingRef.current  = false;
    isPausedRef.current   = false;
    completingRef.current = false;
    bgEnteredAtRef.current = null;
    cycleCountRef.current = 0;

    setModalVisible(false);
    setIsPlaying(false);
    setIsPaused(false);
    setPhase('inhale');
    setCycleCount(0);
    setSessionSeconds(0);
    setPhaseCountdown(BREATH_TIMINGS[tempoRef.current].inhale / 1000);

    videoRef.current?.pauseAsync().catch(() => {});
  }, [stopSessionTimer, videoRef]);

  const changeTempo = useCallback((newTempo: TempoOption) => {
    tempoRef.current = newTempo;
    setTempo(newTempo);

    if (!isPlayingRef.current) return;

    // 템포 변경 시 사이클 리셋 + 흡기 페이즈 재시작
    cycleCountRef.current   = 0;
    phaseRef.current        = 'inhale';
    phaseDurRef.current     = BREATH_TIMINGS[newTempo].inhale;
    phaseStartAtRef.current = Date.now();

    setCycleCount(0);
    setPhase('inhale');
    setPhaseCountdown(BREATH_TIMINGS[newTempo].inhale / 1000);

    videoRef.current
      ?.setStatusAsync({ shouldPlay: true, rate: BREATH_TIMINGS[newTempo].rate })
      .catch(() => {});
  }, [videoRef]);

  const resume = useCallback(() => {
    if (!isPausedRef.current) return;

    // 일시정지 해제 — 현재 페이즈를 now 기준으로 새로 시작
    const t   = tempoRef.current;
    const p   = phaseRef.current;
    const dur = BREATH_TIMINGS[t][p];

    phaseDurRef.current     = dur;
    phaseStartAtRef.current = Date.now(); // 일시정지 후 재개 → 완전 새 에포크
    isPausedRef.current     = false;

    setIsPaused(false);
    setPhaseCountdown(Math.ceil(dur / 1000));

    videoRef.current
      ?.setStatusAsync({ shouldPlay: true, rate: BREATH_TIMINGS[t].rate })
      .catch(() => {});

    startSessionTimer();
  }, [startSessionTimer, videoRef]);

  // ── 언마운트 정리 ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopSessionTimer();
    };
  }, [stopSessionTimer]);

  return {
    state: {
      modalVisible,
      isPlaying,
      isPaused,
      phase,
      phaseCountdown,
      cycleCount,
      todayCount,
      sessionSeconds,
      tempo,
    },
    actions: { openModal, closeModal, changeTempo, resume },
  };
}
