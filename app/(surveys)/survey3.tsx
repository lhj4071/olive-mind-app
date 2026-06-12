/**
 * survey3.tsx — 강박·공황·식이 평가 (Survey 3)
 * OCI-R-K(18) · PDSS-SR(7) · SCOFF(5)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';
import { saveTestResult } from '../../src/lib/supabase';


type QType = 'radio' | 'binary' | 'likert4' | 'text' | 'number' | 'time' | 'consent';
interface Option { value: string | number; label: string }
interface Question {
  id: string; section: string; num: string | number;
  text: string; hint?: string; type: QType; options?: Option[];
  required?: boolean; autoAdv?: boolean;
  visibleIf?: (a: Answers) => boolean;
}
type Answers = Record<string, any>;

// ── OCI-R-K (18 문항) ──────────────────────────────────────────────────────────
const OCI_OPTS: Option[] = [
  { value: 0, label: '0 — 전혀 그렇지 않다' },
  { value: 1, label: '1 — 약간 그러한 편이다' },
  { value: 2, label: '2 — 중간이다' },
  { value: 3, label: '3 — 꽤 그러한 편이다' },
  { value: 4, label: '4 — 매우 그렇다' },
];

const OCI_ITEMS = [
  '그 동안 모은 너무 많은 물건들이 오히려 방해가 될 정도이다',
  '나는 필요 이상으로 자주 확인을 하는 편이다.',
  '나는 물건들이 제대로 정돈되어 있지 않으면 화가 난다.',
  '나는 어떤 일을 할 때 숫자를 세야 할 것만 같은 느낌이 든다.',
  '나는 어떤 물건을 낯선 사람들이나 특정 사람들이 만졌다는 사실을 알게 되면 그 물건을 만지기 어렵다.',
  '나는 내 생각을 내 마음대로 조절하기가 어렵다.',
  '나는 내가 필요하지 않은 것들을 모으는 습관이 있다.',
  '나는 습관적으로 문, 창문, 서랍 등을 확인한다.',
  '나는 내 방식대로 정리한 것들을 다른 사람들이 바꾸어 놓으면 화가 난다.',
  '나는 어떤 일을 특정 횟수만큼 반복해야만 할 것 같은 느낌이 든다.',
  '나는 단지 내가 더러워졌다는 생각 때문에 몸을 씻어야 할 때가 있다.',
  '나는 나의 의지에 반하여 마음속에 떠오르는 생각들 때문에 기분이 나쁘다.',
  '나는 나중에 필요할지도 모른다는 두려움 때문에 물건을 잘 버리지 못한다.',
  '나는 가스밸브, 수도꼭지, 전등 스위치를 끄고 나서도 반복적으로 확인하는 습관이 있다.',
  '나는 물건들이 특정 순서로 정돈되어 있길 원한다.',
  '나는 좋은 숫자와 나쁜 숫자가 있다고 생각한다.',
  '나는 필요 이상으로 자주, 오래 손을 씻는 편이다.',
  '나는 자주 음란한 생각을 하고, 그 생각을 떨쳐버리기가 힘들다.',
];

const OCI: Question[] = OCI_ITEMS.map((text, i) => ({
  id: `oci${i + 1}`, section: 'OCI-R-K — 강박 증상', num: i + 1,
  text,
  hint: '지난 1달 동안 다음 경험들로 얼마나 스트레스를 받았는지 표시해 주세요.',
  type: 'radio' as QType,
  options: OCI_OPTS,
}));

// ── PDSS-SR (7 문항) ───────────────────────────────────────────────────────────
const PDSS: Question[] = [
  {
    id: 'pdss1', section: 'PDSS-SR — 공황 증상', num: 1,
    text: '지난 한 주간, 공황 발작 또는 제한적 증상 발작을 몇 번 경험했나요?',
    type: 'radio',
    options: [
      { value: 0, label: '공황 발작이나 제한적 증상 발작이 전혀 없었음' },
      { value: 1, label: '경미: 완전한 공황 없음, 하루 제한적 증상 발작 1회 이하' },
      { value: 2, label: '중등도: 1-2회 완전한 공황 발작 또는 하루 여러 제한적 발작' },
      { value: 3, label: '심각: 2회 이상 완전한 발작, 평균 하루 1회 이하' },
      { value: 4, label: '극심: 완전한 공황 발작이 하루 한 번 이상, 절반 이상의 날에 발생' },
    ],
  },
  {
    id: 'pdss2', section: 'PDSS-SR — 공황 증상', num: 2,
    text: '공황 발작이 일어나는 동안 얼마나 고통스러웠나요?',
    hint: '여러 번이었다면 평균적인 정도로, 제한적 증상 발작만 있었다면 그 경험에 대해 응답해 주세요.',
    type: 'radio',
    options: [
      { value: 0, label: '전혀 고통스럽지 않았음 (또는 지난 주 발작 없었음)' },
      { value: 1, label: '약간 고통스러웠음 (그다지 심하지 않았음)' },
      { value: 2, label: '보통 정도로 고통스러웠음 (심했지만 감당할 만했음)' },
      { value: 3, label: '심하게 고통스러웠음 (매우 심했음)' },
      { value: 4, label: '극심하게 고통스러웠음 (모든 발작 동안 극심한 고통)' },
    ],
  },
  {
    id: 'pdss3', section: 'PDSS-SR — 공황 증상', num: 3,
    text: '다음 공황 발작이 또 올까 봐 얼마나 걱정했나요?',
    hint: '발작이 신체·정신 문제의 신호라거나 사회적으로 창피할 수 있다는 두려움을 포함합니다.',
    type: 'radio',
    options: [
      { value: 0, label: '전혀 느끼지 않음' },
      { value: 1, label: '가끔 또는 약간 느낌' },
      { value: 2, label: '자주 또는 보통 정도로 느낌' },
      { value: 3, label: '매우 자주 또는 매우 고통스러운 정도로 느낌' },
      { value: 4, label: '거의 끊임없이, 생활에 지장을 줄 정도로 느낌' },
    ],
  },
  {
    id: 'pdss4', section: 'PDSS-SR — 공황 증상', num: 4,
    text: "발작이 두려워 특정 '장소'나 '상황'을 피했나요?",
    hint: '대중교통, 영화관, 사람 많은 곳, 혼자 있는 것 등을 피하거나 불편해한 경험을 말합니다.',
    type: 'radio',
    options: [
      { value: 0, label: '없음: 두려움이나 회피가 전혀 없었음' },
      { value: 1, label: '경미: 가끔 두려움이나 회피가 있었지만 대체로 직면할 수 있었음' },
      { value: 2, label: '중등도: 눈에 띄는 회피가 있었으나 감당할 만했음' },
      { value: 3, label: '심각: 광범위하게 회피하여 생활 방식을 상당히 수정해야 했음' },
      { value: 4, label: '극심: 만연하고 생활에 지장을 주는 두려움이나 회피' },
    ],
  },
  {
    id: 'pdss5', section: 'PDSS-SR — 공황 증상', num: 5,
    text: "발작과 비슷한 '신체 감각'을 일으키는 '활동'을 피했나요?",
    hint: '운동, 커피, 뜨거운 샤워, 흥미진진한 영화 등 심장을 뛰게 하거나 발작 유발 우려로 피한 경험을 말합니다.',
    type: 'radio',
    options: [
      { value: 0, label: '없음: 불편한 신체 감각 때문에 특정 활동을 피한 적 없었음' },
      { value: 1, label: '경도: 가끔 두려웠지만 대부분의 활동을 할 수 있었음' },
      { value: 2, label: '중등도: 눈에 띄게 피했지만 감당은 가능했음' },
      { value: 3, label: '심함: 광범위하게 피해 생활 방식을 상당히 바꾸어야 했음' },
      { value: 4, label: '극심: 거의 모든 활동을 피해 일상생활이 불가능했음' },
    ],
  },
  {
    id: 'pdss6', section: 'PDSS-SR — 공황 증상', num: 6,
    text: "공황 증상 때문에 '직장 생활'이나 '집안 일'에 얼마나 방해를 받았나요?",
    hint: '지난주에 일이 평소보다 적었다면, 평소와 같았을 경우를 생각하고 답해주세요.',
    type: 'radio',
    options: [
      { value: 0, label: '전혀 방해받지 않았음' },
      { value: 1, label: '약간 방해되었지만, 해야 할 일은 거의 다 할 수 있었음' },
      { value: 2, label: '상당히 방해되었지만, 해야 할 일은 그럭저럭 해낼 수 있었음' },
      { value: 3, label: '심각한 방해를 받았음. 이 문제 때문에 하지 못한 일들이 많았음' },
      { value: 4, label: '극심한 방해를 받았음. 직장이나 집안일을 거의 해낼 수 없었음' },
    ],
  },
  {
    id: 'pdss7', section: 'PDSS-SR — 공황 증상', num: 7,
    text: "공황 증상 때문에 '사회생활(사교 활동)'에 얼마나 방해를 받았나요?",
    hint: '지난주에 사교 활동 기회가 적었다면, 기회가 있었을 경우를 생각하고 답해주세요.',
    type: 'radio',
    options: [
      { value: 0, label: '전혀 방해받지 않았음' },
      { value: 1, label: '약간 방해되었지만, 하고 싶은 활동은 거의 다 할 수 있었음' },
      { value: 2, label: '상당히 방해되었지만, 노력하면 대부분의 활동을 할 수 있었음' },
      { value: 3, label: '심각한 방해를 받았음. 하지 못한 사교 활동이 많았음' },
      { value: 4, label: '극심한 방해를 받았음. 할 수 있는 사교 활동이 거의 없었음' },
    ],
  },
];

// ── SCOFF (5 문항) ─────────────────────────────────────────────────────────────
const SCOFF_ITEMS = [
  '너무 배가 부르다는 불쾌감 때문에 일부러 토하게 한 적이 있습니까?',
  '음식을 먹기 시작하면 조절할 수 없을까 봐 걱정한 적이 있습니까?',
  '최근 3개월 동안 6kg 이상 체중이 감소한 적이 있습니까?',
  '다른 사람들은 당신이 너무 말랐다고 하는데, 스스로는 뚱뚱하다고 생각하십니까?',
  '음식에 대한 생각이 당신의 삶을 지배한다고 생각하십니까?',
];

const SCOFF: Question[] = SCOFF_ITEMS.map((text, i) => ({
  id: `scoff${i + 1}`, section: 'SCOFF — 식이 문제', num: i + 1,
  text,
  type: 'binary' as QType,
  options: [
    { value: 'yes', label: '예' },
    { value: 'no',  label: '아니오' },
  ],
}));

const ALL_QUESTIONS: Question[] = [...OCI, ...PDSS, ...SCOFF];

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreOCI(a: Answers): { total: number; h: number; c: number; o: number; n: number; w: number; ob: number } {
  const H=[1,7,13], C=[2,8,14], O=[3,9,15], N=[4,10,16], W=[5,11,17], Ob=[6,12,18];
  let total=0, h=0, c=0, o=0, n=0, w=0, ob=0;
  for (let i = 1; i <= 18; i++) {
    const v = (a[`oci${i}`] as number ?? 0);
    total += v;
    if (H.includes(i)) h+=v; else if (C.includes(i)) c+=v; else if (O.includes(i)) o+=v;
    else if (N.includes(i)) n+=v; else if (W.includes(i)) w+=v; else ob+=v;
  }
  return { total, h, c, o, n, w, ob };
}

function scorePDSS(a: Answers): number {
  let t = 0;
  for (let i = 1; i <= 7; i++) t += (a[`pdss${i}`] as number ?? 0);
  return t;
}

function scoreSCOFF(a: Answers): number {
  let t = 0;
  for (let i = 1; i <= 5; i++) if (a[`scoff${i}`] === 'yes') t++;
  return t;
}

function buildSummary(a: Answers): string {
  const { total: oci } = scoreOCI(a);
  const pdss = scorePDSS(a);
  const scoff = scoreSCOFF(a);
  const oB = oci >= 21 ? '임상적수준' : oci >= 14 ? '경계' : oci >= 7 ? '경미' : '정상';
  const pB = pdss >= 14 ? '심각' : pdss >= 8 ? '중등도' : pdss >= 3 ? '경미' : '정상';
  return `OCI-R-K:${oci}(${oB}) | PDSS-SR:${pdss}(${pB}) | SCOFF:${scoff}(${scoff >= 2 ? '양성' : '음성'})`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Survey3() {
  const db = useSQLiteContext();
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [scores, setScores]         = useState<{
    oci: ReturnType<typeof scoreOCI>; pdss: number; scoff: number;
  } | null>(null);

  const answersRef  = useRef<Answers>({});
  const finishedRef = useRef(false);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(16)).current;

  const visibleQuestions = useMemo(
    () => ALL_QUESTIONS.filter(q => !q.visibleIf || q.visibleIf(answers)),
    [answers],
  );

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
    setSaving(true);

    const oci   = scoreOCI(finalAnswers);
    const pdss  = scorePDSS(finalAnswers);
    const scoff = scoreSCOFF(finalAnswers);
    const summary = buildSummary(finalAnswers);

    setScores({ oci, pdss, scoff });

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [new Date().toISOString().split('T')[0], 'survey3', oci.total,
          JSON.stringify({ oci: oci.total, pdss, scoff, summary })],
      );
    } catch { /* ignore */ }

    saveTestResult('강박·공황·식이 평가 (Survey 3)', oci.total, summary).catch(() => {});

    setSaving(false);
    setDone(true);
  }, [db]);

  const handleAnswer = useCallback((qId: string, value: any, autoAdv = true) => {
    answersRef.current = { ...answersRef.current, [qId]: value };
    setAnswers({ ...answersRef.current });

    if (autoAdv) {
      setSelectedVal(value);
      setTimeout(() => {
        const visible = ALL_QUESTIONS.filter(q => !q.visibleIf || q.visibleIf(answersRef.current));
        setStep(prev => {
          const next = prev + 1;
          if (next >= visible.length) { finishSurvey(answersRef.current); return prev; }
          return next;
        });
      }, 300);
    }
  }, [finishSurvey]);

  const advanceManually = useCallback(() => {
    Keyboard.dismiss();
    const visible = ALL_QUESTIONS.filter(q => !q.visibleIf || q.visibleIf(answersRef.current));
    const next = step + 1;
    if (next >= visible.length) { finishSurvey(answersRef.current); }
    else { setStep(next); }
  }, [step, finishSurvey]);

  const goBack = useCallback(() => {
    if (step === 0) { router.back(); return; }
    setStep(prev => prev - 1);
  }, [step]);

  const currentQ     = visibleQuestions[step];
  const totalVisible = visibleQuestions.length;
  const progress     = totalVisible > 0 ? (step + 1) / totalVisible : 0;

  // ── Done screen ───────────────────────────────────────────────────────────────
  if (done && scores) {
    const { oci, pdss, scoff } = scores;
    const ociLabel   = oci.total >= 21 ? '임상적 수준' : oci.total >= 14 ? '경계 수준' : oci.total >= 7 ? '경미' : '정상 범위';
    const pdssLabel  = pdss >= 14 ? '심각' : pdss >= 8 ? '중등도' : pdss >= 3 ? '경미' : '정상/최소';
    const scoffLabel = scoff >= 4 ? '고위험 (4-5)' : scoff >= 2 ? '양성 선별 (≥2)' : '음성 (0-1)';
    const domSub = (() => {
      const subs = [
        { name: '수집', v: oci.h }, { name: '확인', v: oci.c }, { name: '정돈', v: oci.o },
        { name: '숫자', v: oci.n }, { name: '세척', v: oci.w }, { name: '강박사고', v: oci.ob },
      ];
      return subs.reduce((a, b) => a.v >= b.v ? a : b).name;
    })();

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>결과가 저장되었습니다</Text>

          <View style={s.scoreGrid}>
            {[
              { name: 'OCI-R-K — 강박 증상', score: oci.total, max: 72, label: ociLabel,  warn: oci.total >= 7,   sub: `두드러진 영역: ${domSub}` },
              { name: 'PDSS-SR — 공황 증상', score: pdss,       max: 28, label: pdssLabel, warn: pdss >= 3,         sub: null },
              { name: 'SCOFF — 식이 문제',   score: scoff,       max: 5,  label: scoffLabel, warn: scoff >= 2,       sub: null },
            ].map(item => (
              <View key={item.name} style={[s.scoreCard, item.warn && s.scoreCardWarn]}>
                <Text style={s.scoreName}>{item.name}</Text>
                <View style={s.scoreRow}>
                  <Text style={s.scoreVal}>{item.score}</Text>
                  <Text style={s.scoreMax}>/ {item.max}</Text>
                </View>
                <View style={[s.scoreBadge, item.warn ? s.badgeWarn : s.badgeOk]}>
                  <Text style={[s.scoreBadgeText, item.warn ? s.badgeWarnText : s.badgeOkText]}>
                    {item.label}
                  </Text>
                </View>
                {item.sub && <Text style={s.scoreSub}>{item.sub}</Text>}
                <View style={s.miniBar}>
                  <View style={[
                    s.miniBarFill,
                    { width: `${Math.min(100, Math.round(item.score / item.max * 100))}%` as any },
                    item.warn ? s.miniBarWarn : s.miniBarOk,
                  ]} />
                </View>
              </View>
            ))}
          </View>

          <Text style={s.disclaimer}>
            본 결과는 선별 목적의 참고 자료이며, 진단을 의미하지 않습니다.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(surveys)/qmain')}>
            <Text style={s.doneBtnText}>← 검사 허브로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (saving) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.savingWrap}>
          <Text style={s.savingText}>결과 저장 중…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQ) return null;

  const isAutoAdv = currentQ.autoAdv !== false && ['radio', 'binary', 'likert4'].includes(currentQ.type);
  const needsNext = !isAutoAdv;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Survey 3 · {currentQ.section}</Text>
            <Text style={s.stepCounter}>{step + 1} / {totalVisible}</Text>
          </View>
        </View>

        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView
          style={s.scroll} contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={s.qCard}>
              {currentQ.num !== '' && <Text style={s.qNum}>{currentQ.num}.</Text>}
              <Text style={s.qText}>{currentQ.text}</Text>
              {currentQ.hint && <Text style={s.qHint}>{currentQ.hint}</Text>}
              <View style={s.controlWrap}>
                <QuestionControl
                  question={currentQ} answers={answers}
                  selectedVal={selectedVal} onAnswer={handleAnswer} onNext={advanceManually}
                />
              </View>
              {needsNext && (
                <TouchableOpacity style={s.nextBtn} onPress={advanceManually}>
                  <Text style={s.nextBtnText}>다음 →</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Question Control ───────────────────────────────────────────────────────────
interface QControlProps {
  question: Question; answers: Answers; selectedVal: any;
  onAnswer: (id: string, value: any, autoAdv?: boolean) => void;
  onNext: () => void;
}

function QuestionControl({ question, answers, selectedVal, onAnswer }: QControlProps) {
  const q   = question;
  const cur = answers[q.id];

  if (q.type === 'binary' || q.type === 'radio' || q.type === 'likert4') {
    const opts   = q.options ?? [];
    const isAuto = q.autoAdv !== false;
    return (
      <View style={s.optList}>
        {opts.map(opt => {
          const isSel = isAuto
            ? selectedVal === opt.value || cur === opt.value
            : cur === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[s.optBtn, isSel && s.optBtnSel]}
              onPress={() => onAnswer(q.id, opt.value, isAuto)}
              activeOpacity={0.7}
            >
              <View style={[s.optDot, isSel && s.optDotSel]}>
                {isSel && <View style={s.optDotInner} />}
              </View>
              <Text style={[s.optLabel, isSel && s.optLabelSel]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  backIcon:    { color: C.text, fontSize: 16, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle:  { color: C.text, fontSize: 13, fontWeight: '700' },
  stepCounter:  { color: C.textMuted, fontSize: 11, marginTop: 1 },

  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill:  { height: '100%', backgroundColor: C.olive },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  qCard: {
    backgroundColor: C.card, borderRadius: 16,
    padding: 22, borderWidth: 1, borderColor: C.border,
  },
  qNum:  { color: C.olive, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  qText: { color: C.text, fontSize: 17, fontWeight: '600', lineHeight: 26, marginBottom: 8 },
  qHint: {
    color: C.textMuted, fontSize: 12, lineHeight: 18,
    backgroundColor: C.bg, borderRadius: 8, padding: 10, marginBottom: 14,
  },
  controlWrap: { marginTop: 8 },

  optList: { gap: 8 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
  },
  optBtnSel: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  optDot:    {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optDotSel:   { borderColor: C.olive },
  optDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.olive },
  optLabel:    { flex: 1, color: C.text, fontSize: 14, lineHeight: 20 },
  optLabelSel: { color: C.olive, fontWeight: '600' },

  nextBtn: {
    marginTop: 16, backgroundColor: C.olive, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  savingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  savingText: { color: C.textMuted, fontSize: 15 },

  doneContent: { padding: 24, paddingBottom: 60 },
  doneTitle:   { color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  doneSub:     { color: C.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24 },

  scoreGrid: { gap: 12, marginBottom: 24 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  scoreCardWarn: { borderColor: '#e0b0a0', backgroundColor: '#FBF0EB' },
  scoreName:  { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  scoreRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  scoreVal:   { color: C.text, fontSize: 32, fontWeight: '800', lineHeight: 36 },
  scoreMax:   { color: C.textMuted, fontSize: 14 },
  scoreSub:   { color: C.textMuted, fontSize: 11, marginBottom: 6, fontStyle: 'italic' },
  scoreBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  badgeOk:    { backgroundColor: C.oliveFaded },
  badgeWarn:  { backgroundColor: '#fde8d8' },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },
  badgeOkText:   { color: C.olive },
  badgeWarnText: { color: '#C45E2E' },
  miniBar:    { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },
  miniBarOk:   { backgroundColor: C.olive },
  miniBarWarn: { backgroundColor: '#C45E2E' },

  disclaimer: {
    color: C.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center',
    marginBottom: 20, paddingHorizontal: 8,
  },
  doneBtn: {
    backgroundColor: C.card, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  doneBtnText: { color: C.olive, fontSize: 15, fontWeight: '700' },
});
