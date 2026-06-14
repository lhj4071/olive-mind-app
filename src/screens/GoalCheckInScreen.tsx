// src/screens/GoalCheckInScreen.tsx
// 주간 목표 체크인 — 4점 척도 평가 + 결과 요약

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C } from '../styles/theme';
import { type Domain } from '../constants/goalData';
import { supabase } from '../lib/supabase';
import { fetchLatestGoalSession, pushGoalCheckIn } from '../lib/syncService';
import { getGoalLadder, type SelectedGoalEntry } from '../store/useGoalStore';
import { renderTemplate } from '../utils/templateUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GoalItem {
  domain: Domain;
  goalId: string;
  text: string;
}

const SCORE_OPTS = [
  { score: 1 as const, emoji: '😔', label: '아직 안됨',   color: '#6B7B6B', bg: C.card },
  { score: 2 as const, emoji: '🌱', label: '조금 나아짐', color: C.gad7,   bg: '#2E2318' },
  { score: 3 as const, emoji: '🌿', label: '꽤 달라짐',   color: C.olive,  bg: C.oliveFaded },
  { score: 4 as const, emoji: '🌳', label: '거의 달성',   color: C.oliveDark, bg: '#1E2D18' },
] as const;

const DOMAIN_META: Record<Domain, { emoji: string; color: string; label: string }> = {
  symptom:  { emoji: '💭', color: C.phq9,   label: '증상' },
  function: { emoji: '⚡', color: C.olive,  label: '기능' },
  relation: { emoji: '💬', color: C.gad7,   label: '관계' },
  meaning:  { emoji: '🌱', color: C.accent, label: '의미' },
};

const SYMPTOM_DOMAINS: Domain[]     = ['symptom'];
const LIFE_DOMAINS:    Domain[]     = ['function', 'relation', 'meaning'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoalCheckInScreen() {
  const [goals,   setGoals]   = useState<GoalItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [scores,  setScores]  = useState<Record<string, number>>({});
  const [phase,   setPhase]   = useState<'loading' | 'checkin' | 'result'>('loading');
  const [uid,     setUid]     = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  // 결과 화면용 진행 바 애니메이션값
  const symptomBar = useRef(new Animated.Value(0)).current;
  const lifeBar    = useRef(new Animated.Value(0)).current;

  // ── Load goal session ─────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.back(); return; }
      setUid(session.user.id);

      const goalSession = await fetchLatestGoalSession(session.user.id);
      if (!goalSession) { router.back(); return; }

      const items: GoalItem[] = [];
      for (const domain of goalSession.selectedDomains as Domain[]) {
        const entries: SelectedGoalEntry[] = goalSession.selectedGoals[domain] ?? [];
        for (const entry of entries) {
          const ladder   = getGoalLadder(entry.stateId);
          const levelObj = ladder.find(l => l.id === entry.goalId);
          if (!levelObj) continue;
          const { text } = renderTemplate(levelObj.template, levelObj.blanks, entry.filledBlanks);
          items.push({ domain, goalId: entry.goalId, text });
        }
      }

      if (!items.length) { router.back(); return; }
      setGoals(items);
      setPhase('checkin');
    })();
  }, []);

  // ── Progress bar ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'checkin') return;
    Animated.timing(progress, {
      toValue: goals.length ? current / goals.length : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [current, goals.length, phase]);

  // ── Fade transition ───────────────────────────────────────────────────────

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const fadeOut = useCallback((cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(cb);
  }, [fadeAnim]);

  // ── Score selection ───────────────────────────────────────────────────────

  const handleScore = useCallback((score: number) => {
    const goal = goals[current];
    const nextScores = { ...scores, [goal.goalId]: score };
    setScores(nextScores);

    const next = current + 1;
    if (next >= goals.length) {
      fadeOut(() => {
        setPhase('result');
        fadeAnim.setValue(0);
        _saveAndAnimate(nextScores);
        fadeIn();
      });
    } else {
      fadeOut(() => {
        setCurrent(next);
        fadeAnim.setValue(0);
        fadeIn();
      });
    }
  }, [current, goals, scores]);

  // ── Save + animate result bars ────────────────────────────────────────────

  const _saveAndAnimate = useCallback(async (finalScores: Record<string, number>) => {
    const evaluations = goals.map(g => ({ goalId: g.goalId, score: finalScores[g.goalId] ?? 1 }));

    if (uid) {
      try {
        await pushGoalCheckIn(uid, evaluations, today());
      } catch (e) {
        console.warn('[CheckIn] save failed:', e);
      }
    }

    // 도메인별 평균
    const domainAvg = (domains: Domain[]): number | null => {
      const gs = goals.filter(g => domains.includes(g.domain));
      if (!gs.length) return null;
      return gs.reduce((s, g) => s + (finalScores[g.goalId] ?? 1), 0) / gs.length;
    };

    const sa = domainAvg(SYMPTOM_DOMAINS);
    const la = domainAvg(LIFE_DOMAINS);

    setTimeout(() => {
      Animated.parallel([
        ...(sa !== null ? [Animated.timing(symptomBar, {
          toValue: sa / 4,
          duration: 1000,
          useNativeDriver: false,
        })] : []),
        ...(la !== null ? [Animated.timing(lifeBar, {
          toValue: la / 4,
          duration: 1000,
          useNativeDriver: false,
        })] : []),
      ]).start();
    }, 300);
  }, [goals, uid]);

  // ── Result data ───────────────────────────────────────────────────────────

  const domainAvg = (domains: Domain[]): number | null => {
    const gs = goals.filter(g => domains.includes(g.domain));
    if (!gs.length) return null;
    return gs.reduce((s, g) => s + (scores[g.goalId] ?? 1), 0) / gs.length;
  };

  const scoreLabel = (avg: number | null): { text: string; color: string } => {
    if (avg === null) return { text: '–', color: C.textMuted };
    if (avg < 1.75) return { text: '아직 변화가 느껴지지 않아요',   color: C.textMuted };
    if (avg < 2.5)  return { text: '조금씩 나아지고 있어요',        color: C.gad7 };
    if (avg < 3.25) return { text: '꽤 많이 달라졌어요',             color: C.olive };
    return                  { text: '거의 달성에 가까워졌어요! 🎉',  color: C.oliveDark };
  };

  const leaves = (avg: number | null): string[] => {
    if (avg === null) return [];
    const n = Math.round(avg);
    return Array.from({ length: 4 }, (_, i) => i < n ? '🍃' : '🩶');
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={[s.muted, { textAlign: 'center', marginTop: 80 }]}>로딩 중...</Text>
      </SafeAreaView>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────

  if (phase === 'result') {
    const sa = domainAvg(SYMPTOM_DOMAINS);
    const la = domainAvg(LIFE_DOMAINS);
    const sl = scoreLabel(sa);
    const ll = scoreLabel(la);

    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <Animated.View style={[s.container, { opacity: fadeAnim }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

            <View style={s.resultHeader}>
              <Text style={s.resultIcon}>🌿</Text>
              <Text style={s.resultTitle}>이번 주 나의 변화</Text>
              <Text style={s.resultSub}>체크인을 완료했어요. 잘 하셨어요!</Text>
            </View>

            {sa !== null && (
              <View style={s.resultCard}>
                <Text style={s.resultQ}>덜 괴로워지고 있나요?</Text>
                <Text style={[s.resultLabel, { color: sl.color }]}>{sl.text}</Text>
                <View style={s.leafRow}>
                  {leaves(sa).map((l, i) => (
                    <Text key={i} style={s.leaf}>{l}</Text>
                  ))}
                </View>
                <View style={s.barTrack}>
                  <Animated.View style={[s.barFill, {
                    backgroundColor: sa >= 2.5 ? C.olive : sa >= 1.75 ? C.gad7 : C.textMuted,
                    width: symptomBar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  }]} />
                </View>
              </View>
            )}

            {la !== null && (
              <View style={s.resultCard}>
                <Text style={s.resultQ}>더 잘 살아가고 있나요?</Text>
                <Text style={[s.resultLabel, { color: ll.color }]}>{ll.text}</Text>
                <View style={s.leafRow}>
                  {leaves(la).map((l, i) => (
                    <Text key={i} style={s.leaf}>{l}</Text>
                  ))}
                </View>
                <View style={s.barTrack}>
                  <Animated.View style={[s.barFill, {
                    backgroundColor: la >= 2.5 ? C.olive : la >= 1.75 ? C.gad7 : C.textMuted,
                    width: lifeBar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  }]} />
                </View>
              </View>
            )}

            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>홈으로 돌아가기</Text>
            </TouchableOpacity>

          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Check-in screen ───────────────────────────────────────────────────────

  const goal = goals[current];
  const meta = DOMAIN_META[goal.domain];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={s.headerClose}>✕</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>목표 점검</Text>
        <Text style={s.headerCount}>{current + 1} / {goals.length}</Text>
      </View>

      {/* 프로그레스 바 */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, {
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
      </View>

      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          <View style={s.domainBadge}>
            <Text style={[s.domainText, { color: meta.color }]}>
              {meta.emoji} {meta.label}
            </Text>
          </View>

          <Text style={s.prompt}>이번 주 동안...</Text>
          <Text style={s.goalText}>{goal.text}</Text>

          <View style={s.scoreGrid}>
            {SCORE_OPTS.map(opt => (
              <TouchableOpacity
                key={opt.score}
                style={[s.scoreBtn, { backgroundColor: opt.bg, borderColor: opt.color + '55' }]}
                onPress={() => handleScore(opt.score)}
                activeOpacity={0.75}
              >
                <Text style={s.scoreEmoji}>{opt.emoji}</Text>
                <Text style={[s.scoreLabel, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  container:     { flex: 1 },
  scroll:        { padding: 24, paddingBottom: 48 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 20, paddingVertical: 14 },
  headerClose:   { fontSize: 18, color: C.textMuted },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: C.text },
  headerCount:   { fontSize: 14, color: C.textMuted },

  // Progress
  progressTrack: { height: 3, backgroundColor: C.border, marginHorizontal: 0 },
  progressFill:  { height: 3, backgroundColor: C.olive, borderRadius: 2 },

  // Domain badge
  domainBadge:   { alignSelf: 'flex-start', marginBottom: 14 },
  domainText:    { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  prompt:        { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  goalText:      { fontSize: 20, fontWeight: '700', color: C.text, lineHeight: 30,
                   marginBottom: 36, letterSpacing: -0.3 },

  // Score grid (2×2)
  scoreGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scoreBtn:      { width: '47%', borderRadius: 16, borderWidth: 1.5,
                   paddingVertical: 22, paddingHorizontal: 8,
                   alignItems: 'center', justifyContent: 'center' },
  scoreEmoji:    { fontSize: 30, marginBottom: 8 },
  scoreLabel:    { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  muted:         { color: C.textMuted, fontSize: 14 },

  // Result
  resultHeader:  { alignItems: 'center', marginBottom: 32 },
  resultIcon:    { fontSize: 48, marginBottom: 12 },
  resultTitle:   { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 6 },
  resultSub:     { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21 },

  resultCard:    { backgroundColor: C.card, borderRadius: 16, padding: 20,
                   marginBottom: 16, borderWidth: 1, borderColor: C.border },
  resultQ:       { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  resultLabel:   { fontSize: 14, fontWeight: '600', marginBottom: 14 },

  leafRow:       { flexDirection: 'row', gap: 6, marginBottom: 14 },
  leaf:          { fontSize: 22 },

  barTrack:      { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  barFill:       { height: 10, borderRadius: 5 },

  doneBtn:       { backgroundColor: C.olive, borderRadius: 999, paddingVertical: 16,
                   alignItems: 'center', marginTop: 24,
                   shadowColor: C.olive, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  doneBtnText:   { fontSize: 16, fontWeight: '700', color: C.bg },
});
