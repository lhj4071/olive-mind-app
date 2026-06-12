/**
 * survey6.tsx — 방어기제 평가 (Survey 6)
 * DSQ-60 (60문항, 9점 척도) — Andrews et al. 1993
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
  id: string; section: string; num: number; text: string; hint?: string;
  type: QType; options: Option[]; autoAdv?: boolean;
}
type Answers = Record<string, number>;

// ── 9-point scale options ────────────────────────────────────────────────────
const S9: Option[] = [
  { value: 1, label: '1 — 전혀 해당되지 않는다' },
  { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' },
  { value: 5, label: '5' }, { value: 6, label: '6' }, { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9 — 매우 잘 해당된다' },
];

// ── Question texts (DSQ-60, Andrews 1993 Korean version) ────────────────────
const DSQ_TEXTS: string[] = [
  '나는 다른 사람을 돕는 데서 만족을 느끼고, 만약 그런 일을 할 수 없게 되면 우울해질 것 같다.',
  '사람들은 종종 내가 잘 삐진다고 말한다.',
  '나는 어떤 문제가 있어도, 그것을 다룰 시간이 생길 때까지 한동안 머릿속에서 제쳐 둘 수 있다.',
  '나는 불안을 느끼면, 그림 그리기나 목공 같은 건설적이고 창조적인 활동을 하면서 그 불안을 풀어낸다.',
  '나는 사람들에 대한 내 의견을 자주 바꾼다. 어떤 때는 그들을 높이 평가하다가, 다른 때에는 형편없다고 느낀다.',
  '나는 내가 하는 모든 일에 대해 그럴듯한 이유를 찾아낼 수 있다.',
  '나는 나 자신을 꽤 쉽게 웃음거리로 만들 수 있고, 스스로를 두고 잘 웃는 편이다.',
  '나는 사람들이 나를 제대로 존중해 주지 않는다고 느끼는 편이다.',
  '누군가 나를 습격해서 내 돈을 훔쳐 간다면, 나는 그가 벌을 받기보다는 도움을 받았으면 좋겠다고 느낄 것이다.',
  '누군가와 갈등이 생기면, 나는 그 상황에서 내 책임이 무엇이었는지 생각해 보려고 한다.',
  '사람들은 내가 불쾌한 사실들을 마치 존재하지 않는 것처럼 무시하는 경향이 있다고 말한다.',
  '나는 함께 있는 사람들보다 내가 우월하다고 느낄 때가 많다.',
  '누군가가 내 감정과 에너지를 모두 빼앗아 가고 있는 것처럼 느껴진다.',
  '실제로 위험한 상황이 닥치면, 마치 내가 거기에 없는 것처럼 아무런 두려움이 느껴지지 않을 때가 있다.',
  '내가 부당한 대우를 받으면, 나는 내 권리를 지키기 위해 나서는 편이다.',
  '나는 위험한 상황에서도, 마치 아무 일도 생기지 않을 것처럼 과감하게 행동하는 편이다.',
  '나는 다른 사람을 깎아내리는 말을 할 때, 그런 내가 은근히 뿌듯하게 느껴질 때가 있다.',
  '속상한 일이 있으면, 나는 깊이 생각하기도 전에 먼저 행동해 버리는 일이 많다.',
  '사실 나는 꽤 가치 없는 사람이라고 느낄 때가 많다.',
  '사람들을 대하다 보면, 결국 그들이 내가 느끼는 감정을 느끼게 되는 경우가 많다.',
  '나는 실제 삶에서보다, 내 공상(판타지) 속에서 더 큰 만족을 느낀다.',
  '나는 화가 나면 사람들에게서 물러나 혼자 있는 편이다.',
  '나는 어려움에 처하면, 종종 비현실적인 느낌이 든다.',
  '나는 인생을 큰 문제 없이 헤쳐 나가게 해 주는 특별한 재능을 가지고 있다고 느낀다.',
  '나는 내 감정에 대해 이야기하기보다는, 추상적인 것들에 대해 이야기하는 것을 더 좋아한다.',
  '일이 내 뜻대로 되지 않을 때에도, 그렇게 된 데에는 항상 그럴듯한 이유가 있다고 느낀다.',
  '나는 실제 삶에서보다, 낮에 멍하니 상상(공상)하는 속에서 더 많은 일들을 해결하는 편이다.',
  '누가 나에게 화를 내면, 나는 저 사람은 너무 예민하게 굴고 있다고 느끼는 편이다.',
  '어떤 때는 내가 천사처럼 느껴지고, 다른 때는 내가 악마처럼 느껴진다.',
  '누가 나에게 화를 내면, 나는 평소에는 신경도 안 쓰던 사소한 것들까지 괜히 다 짜증 나기 시작한다.',
  '나는 상처를 받으면, 노골적으로 공격적으로 행동하는 편이다.',
  '나는 어린 시절 학교에 다니던 때의 일들을 거의 기억하지 못한다.',
  '나는 슬프면 사람들과 어울리지 않고 혼자 있으려는 편이다.',
  '나는 늘 내가 아는 사람 중 누군가가 수호천사처럼 나를 지켜 주고 있다고 느낀다.',
  '실제로 나는 사람들이 생각하는 것보다 더 형편없는 사람이라고 느낀다.',
  '내 생각에 사람은 대체로 좋은 사람이거나 나쁜 사람 둘 중 하나일 뿐이다.',
  '상사가 나를 괴롭힌다면, 나는 그에게 보복하려고 일부러 일을 실수하거나 평소보다 느리게 할지도 모른다.',
  '나는 내가 아는 사람 중에 뭐든지 해낼 수 있고, 완전히 공정하고 정의롭다고 느껴지는 사람이 한 명 있다고 생각한다.',
  '불쾌한 일을 겪고 나면, 다음 날이 되면 그게 무엇이었는지 가끔 기억이 나지 않는다.',
  '다른 사람을 돕는 것은 나를 기분 좋게 만든다.',
  '감정을 드러내면 내가 하고 있는 일에 방해가 될 것 같을 때, 나는 내 감정을 잘 눌러 두고 감출 수 있다.',
  '나는 힘들고 고통스러운 상황에서도, 그 안에서 웃기는 면을 찾아볼 수 있는 편이다.',
  '나는 원래라면 화를 내야 마땅한 사람들에게, 되돌아보면 아주 친절하게 대하고 있는 경우가 많다.',
  '나는 모든 사람에게는 조금씩 좋은 면이 있다는 말 같은 건 없다고 느낀다. 나쁜 사람은 나쁜 사람일 뿐이다.',
  '내가 한 일이 잘 풀리지 않을 때, 나는 내가 무엇을 놓쳤는지 찾아보려고 한다.',
  '사람들은 나에게 대체로 정직하지 못한 편이라고 느낀다.',
  '어려운 상황에 직면해야 할 때, 나는 그 상황이 어떨지 미리 상상해 보고 어떻게 대처할지 계획해 보려 한다.',
  '나는 의사들이 내가 어떤 문제가 있는지 사실은 잘 이해하지 못한다고 느낀다.',
  '나는 내 권리를 주장하고 싸운 뒤에, 내가 너무 강하게 나간 것은 아닌지 미안해하며 사과하는 편이다.',
  '누군가 나를 거슬리게 할 때, 나는 그 사람의 기분을 상하게 하지 않는 선에서 불편함을 분명히 말하려 한다.',
  '나는 감정을 잘 드러내지 않는다는 말을 자주 듣는다.',
  '내가 기분이 나쁠 때, 나는 혼자 있기보다는 누군가와 함께 있으려고 한다.',
  '나는 미리 곧 우울해질 것 같다고 예상할 수 있으면, 그 우울한 기분을 더 잘 견딜 수 있다.',
  '내가 아무리 불만을 말해도, 상대가 내가 원하는 식으로 반응해 주는 일은 거의 없다.',
  '나는 내가 느끼는 감정을 그대로 말하기보다는, 내 생각을 길게 설명하는 편이다.',
  '강한 감정을 느끼는 것이 당연해 보이는 상황에서도, 실제로는 아무런 감정이 느껴지지 않을 때가 자주 있다.',
  '나는 우울하거나 불안할 때, 어떤 창조적 활동이나 신체 활동에 참여하는 것을 좋아한다.',
  '내가 큰 위기에 빠진다면, 걱정을 함께 나눌 사람을 찾아가 상의하려 할 것이다.',
  '나는 누군가에게 화를 내거나 해치고 싶은 생각이 들면, 그걸 만회하려고 일부러 더 잘해 주거나 좋은 일을 해야 할 것 같은 느낌이 든다.',
  '신나는 일이 생기면, 나는 그 상황을 즐기기보다 별로 중요하지 않은 사소한 것들에 더 신경 쓰는 편이다.',
];

const ALL_QUESTIONS: Question[] = DSQ_TEXTS.map((text, i) => ({
  id: `q${i + 1}`, section: 'DSQ-60', num: i + 1, text, type: 'radio', options: S9,
}));

// ── Scoring (Andrews et al. 1993 — 3-factor model) ──────────────────────────
const itemMean = (a: Answers, items: number[]): number => {
  const vals = items.map(i => a[`q${i}`]).filter(v => v != null) as number[];
  return vals.length ? vals.reduce((acc, v) => acc + v, 0) / vals.length : 0;
};

const defMean = (a: Answers, pairs: number[][]): number => {
  const means = pairs.map(p => itemMean(a, p)).filter(m => m > 0);
  return means.length ? means.reduce((acc, m) => acc + m, 0) / means.length : 0;
};

function scoreDSQ(a: Answers) {
  const adaptive = defMean(a, [[4,57],[7,42],[47,53],[10,45],[15,50]]);
  const imageDist = defMean(a, [[5,36],[29,44],[8,46],[13,20],[48,54]]);
  const affectReg = defMean(a, [[14,23],[21,27],[25,55],[51,56]]);
  return { adaptive, imageDist, affectReg };
}

function buildSummary(a: Answers): string {
  const { adaptive, imageDist, affectReg } = scoreDSQ(a);
  const r = (v: number) => v.toFixed(1);
  return `DSQ-60: 적응=${r(adaptive)}/9 | 이미지왜곡=${r(imageDist)}/9 | 정서조절=${r(affectReg)}/9`;
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
export default function Survey6() {
  const db = useSQLiteContext();
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [done, setDone]           = useState(false);
  const [scores, setScores]       = useState<{ adaptive: number; imageDist: number; affectReg: number } | null>(null);

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

    const { adaptive, imageDist, affectReg } = scoreDSQ(finalAnswers);
    const summary = buildSummary(finalAnswers);
    setScores({ adaptive, imageDist, affectReg });

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [
          new Date().toISOString().split('T')[0],
          'survey6',
          Math.round(adaptive * 10) / 10,
          JSON.stringify({ adaptive, imageDist, affectReg, summary }),
        ],
      );
    } catch { /* ignore */ }

    saveTestResult('방어기제 평가 (Survey 6)', Math.round(adaptive * 10) / 10, summary).catch(() => {});

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

  const currentQ   = visibleQuestions[step];
  const total      = visibleQuestions.length;
  const progress   = total > 0 ? (step + 1) / total : 0;

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done && scores) {
    const { adaptive, imageDist, affectReg } = scores;
    const items = [
      { name: '적응적 방어유형', sub: '승화·유머·예상·자기관찰·자기주장', score: adaptive, max: 9, warn: adaptive < 3.5 },
      { name: '이미지 왜곡 방어', sub: '분열·투사·투사적동일시 등', score: imageDist, max: 9, warn: imageDist >= 6 },
      { name: '정서 조절 방어', sub: '해리·공상·지성화·감정격리', score: affectReg, max: 9, warn: affectReg >= 6 },
    ];
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>DSQ-60 방어기제 평가 결과가 저장되었습니다</Text>
          <View style={s.scoreGrid}>
            {items.map(item => (
              <View key={item.name} style={[s.scoreCard, item.warn && s.scoreCardWarn]}>
                <Text style={s.scoreName}>{item.name}</Text>
                <Text style={s.scoreSub}>{item.sub}</Text>
                <View style={s.scoreRow}>
                  <Text style={s.scoreVal}>{item.score.toFixed(1)}</Text>
                  <Text style={s.scoreMax}>/ {item.max}</Text>
                </View>
                <View style={s.miniBar}>
                  <View style={[s.miniBarFill, { width: `${Math.round(item.score / item.max * 100)}%` as any }, item.warn ? s.miniBarWarn : s.miniBarOk]} />
                </View>
              </View>
            ))}
          </View>
          <Text style={s.disclaimer}>
            본 결과는 선별 목적의 참고 자료이며, 진단을 의미하지 않습니다.
            방어기제 프로파일은 임상 면담과 함께 해석되어야 합니다. (Andrews et al., 1993)
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
            <Text style={s.headerTitle}>Survey 6 · {currentQ.section}</Text>
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
              <Text style={s.qHint}>1 = 전혀 해당되지 않는다 · 9 = 매우 잘 해당된다</Text>
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
  qText: { color: C.text, fontSize: 15, fontWeight: '500', lineHeight: 24, marginBottom: 6 },
  qHint: { color: C.textMuted, fontSize: 11.5, lineHeight: 16, marginBottom: 12 },
  controlWrap: { marginTop: 4 },

  optList: { gap: 6 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
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
  scoreGrid: { gap: 12, marginBottom: 20 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  scoreCardWarn: { borderColor: '#C4432E55' },
  scoreName: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  scoreSub: { color: C.textMuted, fontSize: 11, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  scoreVal: { color: C.olive, fontSize: 26, fontWeight: '800' },
  scoreMax: { color: C.textMuted, fontSize: 13 },
  miniBar: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 3 },
  miniBarOk:   { backgroundColor: C.olive },
  miniBarWarn: { backgroundColor: '#C4432E' },
  disclaimer: { color: C.textMuted, fontSize: 11.5, lineHeight: 18, marginBottom: 24 },
  doneBtn: {
    backgroundColor: C.olive, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
