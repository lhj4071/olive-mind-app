/**
 * survey7.tsx — 간이 성격 검사 (Survey 7)
 * BFI-44 (44문항, 5점 척도) — 빅파이브 성격 검사
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';
import { saveTestResult } from '../../src/lib/supabase';


type QType = 'radio';
interface Option { value: number; label: string }
interface Question {
  id: string; section: string; num: number; text: string;
  type: QType; options: Option[]; autoAdv?: boolean;
  domain: 'E' | 'A' | 'C' | 'N' | 'O'; rev: boolean;
}
type Answers = Record<string, number>;

const L5: Option[] = [
  { value: 1, label: '1 — 전혀 그렇지 않다' },
  { value: 2, label: '2 — 그렇지 않은 편이다' },
  { value: 3, label: '3 — 보통이다' },
  { value: 4, label: '4 — 그런 편이다' },
  { value: 5, label: '5 — 매우 그렇다' },
];

// ── BFI-44 item definitions ──────────────────────────────────────────────────
const BFI_ITEMS: Array<{ text: string; domain: Question['domain']; rev: boolean }> = [
  { text: '나는 말을 많이 하는 편이다.',                                        domain: 'E', rev: false },
  { text: '나는 다른 사람들의 약점이나 부족한 점을 잘 알아차린다.',              domain: 'A', rev: true  },
  { text: '나는 일을 신중하고 꼼꼼하게 끝까지 처리한다.',                        domain: 'C', rev: false },
  { text: '나는 우울하거나 슬픈 기분을 자주 느낀다.',                            domain: 'N', rev: false },
  { text: '나는 독창적이고 새로운 아이디어를 잘 떠올린다.',                      domain: 'O', rev: false },
  { text: '나는 내 생각을 겉으로 잘 드러내지 않고 속으로만 하는 편이다.',        domain: 'E', rev: true  },
  { text: '나는 다른 사람들에게 도움을 주며 이기적으로 행동하지 않는다.',        domain: 'A', rev: false },
  { text: '나는 가끔 부주의하게 행동할 때가 있다.',                              domain: 'C', rev: true  },
  { text: '나는 비교적 여유롭고 스트레스를 잘 견딘다.',                          domain: 'N', rev: true  },
  { text: '나는 다양한 주제나 일에 대해 호기심이 많다.',                         domain: 'O', rev: false },
  { text: '나는 에너지가 많고 활력이 있는 편이다.',                              domain: 'E', rev: false },
  { text: '나는 다른 사람들과 말다툼이나 논쟁을 시작하는 편이다.',               domain: 'A', rev: true  },
  { text: '나는 성실하고 책임감 있게 일하는 사람이다.',                          domain: 'C', rev: false },
  { text: '나는 긴장을 잘 하고 항상 느긋하지는 않다.',                           domain: 'N', rev: false },
  { text: '나는 생각이 많고 사고력이 뛰어난 편이다.',                            domain: 'O', rev: false },
  { text: '나는 분위기를 살리고 일을 재미있게 만드는 편이다.',                   domain: 'E', rev: false },
  { text: '나는 다른 사람을 비교적 쉽게 용서하는 편이다.',                       domain: 'A', rev: false },
  { text: '나는 정리정돈이나 체계적인 관리가 잘 안 되는 편이다.',                domain: 'C', rev: true  },
  { text: '나는 사소한 일에도 걱정을 많이 하는 편이다.',                         domain: 'N', rev: false },
  { text: '나는 상상력이 풍부하고 머릿속으로 이것저것 그려보는 편이다.',         domain: 'O', rev: false },
  { text: '나는 전반적으로 조용한 성향이다.',                                    domain: 'E', rev: true  },
  { text: '나는 대체로 사람들을 믿는 편이다.',                                   domain: 'A', rev: false },
  { text: '나는 일을 미루거나 게으르게 행동할 때가 있다.',                       domain: 'C', rev: true  },
  { text: '나는 쉽게 흔들리지 않고 정서적으로 안정된 편이다.',                   domain: 'N', rev: true  },
  { text: '나는 창의적이고 새로운 방식을 떠올리는 데 능숙하다.',                  domain: 'O', rev: false },
  { text: '나는 성격이 분명하고 자기주장이 있는 편이다.',                         domain: 'E', rev: false },
  { text: '나는 때때로 다른 사람들에게 차갑거나 거리감을 두는 편이다.',           domain: 'A', rev: true  },
  { text: '나는 일이 끝날 때까지 포기하지 않고 계속 노력한다.',                   domain: 'C', rev: false },
  { text: '나는 기분 변화가 있는 편이다.',                                        domain: 'N', rev: false },
  { text: '나는 예술적이거나 창의적인 활동과 경험을 좋아한다.',                   domain: 'O', rev: false },
  { text: '나는 낯을 가리고 수줍음이 많은 편이다.',                               domain: 'E', rev: true  },
  { text: '나는 거의 모든 사람에게 친절하고 배려심 있게 대한다.',                 domain: 'A', rev: false },
  { text: '나는 일을 빠르면서도 정확하게 처리한다.',                              domain: 'C', rev: false },
  { text: '나는 어려운 상황에서도 비교적 침착함을 유지한다.',                     domain: 'N', rev: true  },
  { text: '나는 변화보다는 늘 비슷한 방식의 일을 선호한다.',                      domain: 'O', rev: true  },
  { text: '나는 외향적이며 사람들과 어울리는 것을 좋아한다.',                     domain: 'E', rev: false },
  { text: '나는 가끔 다른 사람들에게 무례하게 행동할 때가 있다.',                 domain: 'A', rev: true  },
  { text: '나는 계획을 세우고 그 계획을 잘 지키는 편이다.',                       domain: 'C', rev: false },
  { text: '나는 쉽게 긴장하거나 불안해지는 편이다.',                              domain: 'N', rev: false },
  { text: '나는 아이디어를 생각하고 여러 가능성을 떠올리는 것을 좋아한다.',       domain: 'O', rev: false },
  { text: '나는 연극이나 음악 같은 예술적인 활동에 큰 흥미가 없다.',              domain: 'O', rev: true  },
  { text: '나는 협력적이며 다른 사람들과 잘 어울려 행동한다.',                    domain: 'A', rev: false },
  { text: '나는 집중력이 떨어져 한 가지에 오래 집중하지 못할 때가 있다.',         domain: 'C', rev: true  },
  { text: '나는 예술, 음악, 책 등 문화적인 분야에 대해 아는 것이 많다.',          domain: 'O', rev: false },
];

const ALL_QUESTIONS: Question[] = BFI_ITEMS.map((item, i) => ({
  id: `b${i + 1}`, section: 'BFI-44', num: i + 1,
  text: item.text, type: 'radio', options: L5,
  domain: item.domain, rev: item.rev,
}));

// ── Scoring ──────────────────────────────────────────────────────────────────
type Domain = 'E' | 'A' | 'C' | 'N' | 'O';
const DOMAIN_NAMES: Record<Domain, string> = {
  E: '외향성', A: '친화성', C: '성실성', N: '신경증', O: '개방성',
};

function scoreBFI(a: Answers) {
  const sums: Record<Domain, number> = { E: 0, A: 0, C: 0, N: 0, O: 0 };
  const counts: Record<Domain, number> = { E: 0, A: 0, C: 0, N: 0, O: 0 };
  ALL_QUESTIONS.forEach(q => {
    const v = a[q.id];
    if (v == null) return;
    const scored = q.rev ? 6 - v : v;
    sums[q.domain] += scored;
    counts[q.domain]++;
  });
  const means: Record<Domain, number> = { E: 0, A: 0, C: 0, N: 0, O: 0 };
  (Object.keys(sums) as Domain[]).forEach(d => {
    means[d] = counts[d] > 0 ? Math.round((sums[d] / counts[d]) * 10) / 10 : 0;
  });
  return means;
}

function buildSummary(a: Answers): string {
  const m = scoreBFI(a);
  return `BFI-44: E=${m.E} A=${m.A} C=${m.C} N=${m.N} O=${m.O}`;
}

// ── Question control ─────────────────────────────────────────────────────────
function QuestionControl({
  question, answers, selectedVal, onAnswer,
}: {
  question: Question; answers: Answers; selectedVal: any;
  onAnswer: (id: string, val: any, autoAdv?: boolean) => void;
}) {
  const cur = answers[question.id];
  return (
    <View style={s.optList}>
      {question.options.map(opt => {
        const sel = cur === opt.value || selectedVal === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.optBtn, sel && s.optBtnSel]}
            onPress={() => onAnswer(question.id, opt.value, true)}
            activeOpacity={0.75}
          >
            <View style={[s.optDot, sel && s.optDotSel]}>
              {sel && <View style={s.optDotInner} />}
            </View>
            <Text style={[s.optLabel, sel && s.optLabelSel]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Survey7() {
  const db = useSQLiteContext();
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [done, setDone]           = useState(false);
  const [scores, setScores]       = useState<Record<Domain, number> | null>(null);

  const answersRef  = useRef<Answers>({});
  const finishedRef = useRef(false);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(16)).current;

  const visibleQuestions = useMemo(() => ALL_QUESTIONS, []);

  useEffect(() => {
    setSelectedVal(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const finishSurvey = useCallback(async (finalAnswers: Answers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const means = scoreBFI(finalAnswers);
    const summary = buildSummary(finalAnswers);
    setScores(means);

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [
          new Date().toISOString().split('T')[0],
          'survey7',
          means.N,
          JSON.stringify({ ...means, summary }),
        ],
      );
    } catch { /* ignore */ }

    saveTestResult('간이 성격 검사 (Survey 7)', means.N, summary).catch(() => {});

    setDone(true);
  }, [db]);

  const handleAnswer = useCallback((qId: string, value: any, autoAdv = true) => {
    answersRef.current = { ...answersRef.current, [qId]: value };
    setAnswers({ ...answersRef.current });
    if (autoAdv) {
      setSelectedVal(value);
      setTimeout(() => {
        setStep(prev => {
          const next = prev + 1;
          if (next >= ALL_QUESTIONS.length) { finishSurvey(answersRef.current); return prev; }
          return next;
        });
      }, 300);
    }
  }, [finishSurvey]);

  const goBack = useCallback(() => {
    if (step === 0) { router.back(); return; }
    setStep(prev => prev - 1);
  }, [step]);

  const currentQ = visibleQuestions[step];
  const total    = visibleQuestions.length;
  const progress = total > 0 ? (step + 1) / total : 0;

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done && scores) {
    const domainOrder: Domain[] = ['E', 'A', 'C', 'N', 'O'];
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>BFI-44 빅파이브 성격 검사 결과가 저장되었습니다</Text>
          <View style={s.scoreGrid}>
            {domainOrder.map(d => (
              <View key={d} style={s.scoreCard}>
                <Text style={s.scoreName}>{DOMAIN_NAMES[d]}</Text>
                <View style={s.scoreRow}>
                  <Text style={s.scoreVal}>{scores[d].toFixed(1)}</Text>
                  <Text style={s.scoreMax}>/ 5.0</Text>
                </View>
                <View style={s.miniBar}>
                  <View style={[s.miniBarFill, { width: `${Math.round(scores[d] / 5 * 100)}%` as any }]} />
                </View>
              </View>
            ))}
          </View>
          <Text style={s.disclaimer}>
            각 척도는 해당 영역에 속하는 문항들의 평균 점수입니다 (역채점 반영).
            본 결과는 선별 목적의 참고 자료이며, 진단을 의미하지 않습니다.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(surveys)/qmain')}>
            <Text style={s.doneBtnText}>← 검사 허브로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQ) return null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Survey 7 · {currentQ.section}</Text>
            <Text style={s.stepCounter}>{step + 1} / {total}</Text>
          </View>
        </View>

        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={s.qCard}>
              <Text style={s.qNum}>{currentQ.num}.</Text>
              <Text style={s.qText}>{currentQ.text}</Text>
              <View style={s.controlWrap}>
                <QuestionControl
                  question={currentQ} answers={answers}
                  selectedVal={selectedVal} onAnswer={handleAnswer}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: C.text, fontSize: 16, fontWeight: '600', lineHeight: 18 },
  headerCenter: { flex: 1 },
  headerTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  stepCounter: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill: { height: 3, backgroundColor: C.olive, borderRadius: 2 },

  qCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  qNum: { color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  qText: { color: C.text, fontSize: 15, fontWeight: '500', lineHeight: 24, marginBottom: 14 },
  controlWrap: { marginTop: 4 },

  optList: { gap: 7 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
  },
  optBtnSel: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  optDot: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optDotSel: { borderColor: C.olive },
  optDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.olive },
  optLabel: { flex: 1, color: C.textMuted, fontSize: 13, lineHeight: 18 },
  optLabelSel: { color: C.text, fontWeight: '500' },

  // Done screen
  doneContent: { padding: 20, paddingBottom: 48 },
  doneTitle: { color: C.olive, fontSize: 22, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  doneSub: { color: C.textMuted, fontSize: 13, marginBottom: 24 },
  scoreGrid: { gap: 10, marginBottom: 20 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  scoreName: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  scoreVal: { color: C.olive, fontSize: 26, fontWeight: '800' },
  scoreMax: { color: C.textMuted, fontSize: 13 },
  miniBar: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 3, backgroundColor: C.olive },
  disclaimer: { color: C.textMuted, fontSize: 11.5, lineHeight: 18, marginBottom: 24 },
  doneBtn: {
    backgroundColor: C.olive, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
