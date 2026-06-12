/**
 * survey8.tsx — 아동기 외상·ADHD 성향 (Survey 8)
 * CTQ-SF (28문항, 1-5점) · WURS-25 (25문항, 0-4점)
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
  id: string; section: string; num: number | string; text: string;
  type: QType; options: Option[]; autoAdv?: boolean;
  visibleIf?: (a: Answers) => boolean;
}
type Answers = Record<string, number>;

// ── CTQ-SF 5-point options (1-5) ─────────────────────────────────────────────
const CTQ_OPTS: Option[] = [
  { value: 1, label: '1 — 아니다' },
  { value: 2, label: '2 — 거의 아니다' },
  { value: 3, label: '3 — 보통이다' },
  { value: 4, label: '4 — 조금 그랬다' },
  { value: 5, label: '5 — 항상 그랬다' },
];

// ── WURS-25 5-point options (0-4) ────────────────────────────────────────────
const WURS_OPTS: Option[] = [
  { value: 0, label: '0 — 전혀 아니다 / 매우 약간' },
  { value: 1, label: '1 — 약간' },
  { value: 2, label: '2 — 어느 정도' },
  { value: 3, label: '3 — 꽤 많이' },
  { value: 4, label: '4 — 매우 많이' },
];

// ── CTQ-SF question texts (28 items, Bernstein & Fink) ───────────────────────
const CTQ_TEXTS: string[] = [
  '나는 배불리 먹지 못했다.',
  '나는 돌봐 주고 보호해 주는 사람이 있었다.',
  '우리 가족은 나를 멍청이, 게으름뱅이, 바보, 병신이라고 놀렸다.',
  '우리 부모님은 술에 취해 있어서 나를 돌봐 줄 수 없었다.',
  '우리 식구 중에 내가 소중하고 특별한 존재임을 느끼게 해 주는 사람이 있었다.',
  '나는 옷차림이 지저분했었다.',
  '나는 사랑 받고 있다고 느꼈다.',
  '우리 부모님은 내가 태어나지 않았으면 좋았을 것이라 말했다.',
  '가족 중 누군가에게 심하게 맞아 약국이나 병원에 간 적이 있다.',
  '우리 가족은 매우 만족스러워 변해야 할 것이 아무것도 없었다.',
  '가족 중 한 사람이 나를 심하게 때려 상처가 나거나 멍든 적이 있다.',
  '회초리, 벨트, 나무 막대 등 단단한 물건으로 맞았었다.',
  '우리 가족은 서로 잘 보살펴 주었다.',
  '나에게 모욕적인 말이나 가슴 아픈 말을 한 가족이 있었다.',
  '나는 신체적으로 학대당한 적이 있다.',
  '나의 어린 시절은 남부러울 것이 없었다.',
  '선생님, 이웃 사람, 친척이 알아챌 정도로 심하게 맞은 적이 있다.',
  '우리 가족 중에 나를 미워한 사람이 있다.',
  '우리 가족은 모두 친하게 지냈다.',
  '누군가 나의 성기를 만지거나, 나에게 그들의 성기를 만지게 한 적이 있다.',
  '누군가 시키는 대로 성적인 행동을 하지 않으면 나를 해치겠다고 협박했다.',
  '세상에서 우리 가족이 최고였다.',
  '누군가 나에게 성적인 행동을 하게 하거나 성적인 잡지, 비디오를 보게 하였다.',
  '누군가(이성이) 성적으로 치근덕거렸다.',
  '나는 정서적으로 학대당했다.',
  '내가 아플 때 우리 가족은 나를 의사에게 데려갔었다.',
  '나는 성적으로 학대당했다.',
  '우리 가족은 나에게 힘을 주었고 나를 지지해 주었다.',
];

// CTQ reverse items: 2,5,7,13,19,26,28 → R = 6 - v
const CTQ_REV = new Set([2, 5, 7, 13, 19, 26, 28]);

// ── WURS-25 question texts ───────────────────────────────────────────────────
const WURS_TEXTS: string[] = [
  '집중하는 데 문제가 있었고 쉽게 주의산만해졌다.',
  '초조해하고 걱정이 많았다.',
  '불안해하고 안절부절 못했다.',
  '주의를 기울이지 않고 공상에 빠지곤 했다.',
  '성급하고 쉽게 화를 냈다.',
  '분노발작, 감정 폭발이 있었다.',
  '시작한 일을 끈기 있게 매달려 끝마치지 못했다.',
  '말을 잘 듣지 않고 고집이 셌다.',
  '슬프고 우울했으며 불행하다고 느꼈다.',
  '부모에게 순응하지 않고 반항적이었으며 건방졌다.',
  '자신을 낮게 평가하였다.',
  '쉽게 자극되어 흥분하였다.',
  '변덕스럽고 기분에 기복이 있었다.',
  '늘 화가 나 있었다.',
  '생각없이 행동해버리고 충동적이었다.',
  '미성숙한 편이었다.',
  '죄책감, 후회감이 있었다.',
  '자신을 통제하지 못하였다.',
  '비이성적으로 행동하는 경향이 있었다.',
  '아이들에게 인기가 없었고, 오래 사귀지 못하였다.',
  '타인의 관점에서 사물을 보는데 문제가 있었다.',
  '권위자(학교)와 마찰이 있었고 교무실에 불려갔다.',
  '학교에서 항상 열등한 학생이었고 배우는 게 느렸다.',
  '학교에서 산수, 숫자 계산에 문제가 있었다.',
  '학교에서 잠재력을 충분히 발휘하지 못하였다.',
];

const CTQ_QUESTIONS: Question[] = CTQ_TEXTS.map((text, i) => ({
  id: `ctq${i + 1}`, section: 'CTQ-SF', num: i + 1,
  text, type: 'radio', options: CTQ_OPTS,
}));

const WURS_QUESTIONS: Question[] = WURS_TEXTS.map((text, i) => ({
  id: `w${i + 1}`, section: 'WURS-25', num: i + 1,
  text: '어렸을 때 나는 ' + text,
  type: 'radio', options: WURS_OPTS,
}));

const ALL_QUESTIONS: Question[] = [...CTQ_QUESTIONS, ...WURS_QUESTIONS];

// ── Scoring ──────────────────────────────────────────────────────────────────
const ctqV = (a: Answers, n: number) => a[`ctq${n}`] ?? 1;
const ctqR = (a: Answers, n: number) => 6 - ctqV(a, n);

function scoreCTQ(a: Answers) {
  const EA = ctqV(a,3) + ctqV(a,8) + ctqV(a,14) + ctqV(a,18) + ctqV(a,25);
  const PA = ctqV(a,9) + ctqV(a,11) + ctqV(a,12) + ctqV(a,15) + ctqV(a,17);
  const SA = ctqV(a,20) + ctqV(a,21) + ctqV(a,23) + ctqV(a,24) + ctqV(a,27);
  const EN = ctqR(a,5) + ctqR(a,7) + ctqR(a,13) + ctqR(a,19) + ctqR(a,28);
  const PN = ctqV(a,1) + ctqR(a,2) + ctqV(a,4) + ctqV(a,6) + ctqR(a,26);
  const clinical = EA + PA + SA + EN + PN;
  const MD =
    (ctqV(a, 10) === 5 ? 1 : 0) +
    (ctqV(a, 16) === 5 ? 1 : 0) +
    (ctqV(a, 22) === 5 ? 1 : 0);
  return { EA, PA, SA, EN, PN, clinical, MD };
}

function ctqSev(dk: string, score: number): string {
  const CUT: Record<string, { none: number; mild: number; mod: number }> = {
    EA: { none: 8, mild: 12, mod: 15 },
    PA: { none: 7, mild: 9,  mod: 12 },
    SA: { none: 5, mild: 7,  mod: 12 },
    EN: { none: 9, mild: 14, mod: 17 },
    PN: { none: 7, mild: 9,  mod: 12 },
  };
  const c = CUT[dk];
  if (!c) return '';
  if (score > c.mod)  return '심각';
  if (score > c.mild) return '중등도';
  if (score > c.none) return '경미';
  return '없음/최소';
}

function scoreWURS(a: Answers) {
  let total = 0;
  for (let i = 1; i <= 25; i++) total += (a[`w${i}`] ?? 0);
  const DMB_IDX = [5,6,8,10,12,13,14,18,19,21,22];
  const IH_IDX  = [1,3,4,7,15,16,23,24,25];
  const DA_IDX  = [2,9,11,17];
  const dmb = DMB_IDX.reduce((acc, i) => acc + (a[`w${i}`] ?? 0), 0);
  const ih  = IH_IDX.reduce((acc, i) => acc + (a[`w${i}`] ?? 0), 0);
  const da  = DA_IDX.reduce((acc, i) => acc + (a[`w${i}`] ?? 0), 0);
  return { total, dmb, ih, da };
}

function buildSummary(a: Answers): string {
  const c = scoreCTQ(a);
  const w = scoreWURS(a);
  return `CTQ-SF: EA=${c.EA} PA=${c.PA} SA=${c.SA} EN=${c.EN} PN=${c.PN} | WURS-25: 총점=${w.total}`;
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
export default function Survey8() {
  const db = useSQLiteContext();
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [done, setDone]           = useState(false);
  const [ctqScores, setCtqScores] = useState<ReturnType<typeof scoreCTQ> | null>(null);
  const [wursScores, setWursScores] = useState<ReturnType<typeof scoreWURS> | null>(null);

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

    const ctq = scoreCTQ(finalAnswers);
    const wurs = scoreWURS(finalAnswers);
    const summary = buildSummary(finalAnswers);
    setCtqScores(ctq);
    setWursScores(wurs);

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [
          new Date().toISOString().split('T')[0],
          'survey8',
          wurs.total,
          JSON.stringify({ ctq: { EA: ctq.EA, PA: ctq.PA, SA: ctq.SA, EN: ctq.EN, PN: ctq.PN, clinical: ctq.clinical }, wurs, summary }),
        ],
      );
    } catch { /* ignore */ }

    saveTestResult('아동기 외상·ADHD 성향 (Survey 8)', wurs.total, summary).catch(() => {});

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
  if (done && ctqScores && wursScores) {
    const ctqDomains = [
      { key: 'EA', name: '정서적 학대', score: ctqScores.EA },
      { key: 'PA', name: '신체적 학대', score: ctqScores.PA },
      { key: 'SA', name: '성적 학대',   score: ctqScores.SA },
      { key: 'EN', name: '정서적 방임', score: ctqScores.EN },
      { key: 'PN', name: '신체적 방임', score: ctqScores.PN },
    ];
    const wursPos = wursScores.total >= 36;
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>결과가 저장되었습니다</Text>

          {/* CTQ-SF */}
          <Text style={s.sectionLabel}>아동기 외상 경험 (CTQ-SF)</Text>
          <View style={s.scoreGrid}>
            {ctqDomains.map(item => {
              const sev = ctqSev(item.key, item.score);
              const warn = sev !== '없음/최소';
              return (
                <View key={item.key} style={[s.scoreCard, warn && s.scoreCardWarn]}>
                  <View style={s.scoreRowSplit}>
                    <Text style={s.scoreName}>{item.name}</Text>
                    <View style={[s.sevBadge, warn ? s.sevWarn : s.sevOk]}>
                      <Text style={[s.sevText, warn ? s.sevTextWarn : s.sevTextOk]}>{sev}</Text>
                    </View>
                  </View>
                  <View style={s.scoreRow}>
                    <Text style={s.scoreVal}>{item.score}</Text>
                    <Text style={s.scoreMax}>/ 25</Text>
                  </View>
                  <View style={s.miniBar}>
                    <View style={[s.miniBarFill, { width: `${Math.round((item.score - 5) / 20 * 100)}%` as any }, warn ? s.miniBarWarn : s.miniBarOk]} />
                  </View>
                </View>
              );
            })}
            {ctqScores.MD > 0 && (
              <View style={s.mdNote}>
                <Text style={s.mdText}>과소보고/부인 지표 (MD): {ctqScores.MD}/3 — 아동기 경험의 이상화·방어적 보고 가능성을 임상 면담에서 함께 고려하세요. (임상 총점에 포함되지 않음)</Text>
              </View>
            )}
          </View>

          {/* WURS-25 */}
          <Text style={[s.sectionLabel, { marginTop: 8 }]}>아동기 ADHD 성향 (WURS-25)</Text>
          <View style={s.scoreGrid}>
            <View style={[s.scoreCard, wursPos && s.scoreCardWarn]}>
              <View style={s.scoreRowSplit}>
                <Text style={s.scoreName}>WURS-25 총점</Text>
                <View style={[s.sevBadge, wursPos ? s.sevWarn : s.sevOk]}>
                  <Text style={[s.sevText, wursPos ? s.sevTextWarn : s.sevTextOk]}>
                    {wursPos ? 'ADHD 가능성' : '음성'}
                  </Text>
                </View>
              </View>
              <View style={s.scoreRow}>
                <Text style={s.scoreVal}>{wursScores.total}</Text>
                <Text style={s.scoreMax}>/ 100</Text>
              </View>
              <View style={s.miniBar}>
                <View style={[s.miniBarFill, { width: `${Math.round(wursScores.total / 100 * 100)}%` as any }, wursPos ? s.miniBarWarn : s.miniBarOk]} />
              </View>
            </View>
            {[
              { name: '정서/행동 (DMB)', score: wursScores.dmb, max: 44 },
              { name: '부주의/과잉 (IH)', score: wursScores.ih, max: 36 },
              { name: '우울/불안 (DA)', score: wursScores.da, max: 16 },
            ].map(item => (
              <View key={item.name} style={s.scoreCard}>
                <Text style={s.scoreName}>{item.name}</Text>
                <View style={s.scoreRow}>
                  <Text style={s.scoreVal}>{item.score}</Text>
                  <Text style={s.scoreMax}>/ {item.max}</Text>
                </View>
                <View style={s.miniBar}>
                  <View style={[s.miniBarFill, { width: `${Math.round(item.score / item.max * 100)}%` as any }]} />
                </View>
              </View>
            ))}
          </View>

          <Text style={s.disclaimer}>
            CTQ-SF 기준: Bernstein &amp; Fink (1998). WURS-25 양성 기준: 총점 ≥36.{'\n'}
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
            <Text style={s.headerTitle}>Survey 8 · {currentQ.section}</Text>
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
  doneSub: { color: C.textMuted, fontSize: 13, marginBottom: 20 },
  sectionLabel: {
    color: C.textMuted, fontSize: 10.5, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2,
  },
  scoreGrid: { gap: 10, marginBottom: 12 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  scoreCardWarn: { borderColor: '#C4432E55' },
  scoreName: { color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  scoreRowSplit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  scoreVal: { color: C.olive, fontSize: 24, fontWeight: '800' },
  scoreMax: { color: C.textMuted, fontSize: 13 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sevOk:   { backgroundColor: C.oliveFaded },
  sevWarn: { backgroundColor: '#C4432E22' },
  sevText: { fontSize: 11, fontWeight: '600' },
  sevTextOk:   { color: C.olive },
  sevTextWarn: { color: '#C4432E' },
  miniBar: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 3 },
  miniBarOk:   { backgroundColor: C.olive },
  miniBarWarn: { backgroundColor: '#C4432E' },
  mdNote: {
    backgroundColor: C.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  mdText: { color: C.textMuted, fontSize: 11.5, lineHeight: 18 },
  disclaimer: { color: C.textMuted, fontSize: 11.5, lineHeight: 18, marginBottom: 24, marginTop: 8 },
  doneBtn: {
    backgroundColor: C.olive, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
