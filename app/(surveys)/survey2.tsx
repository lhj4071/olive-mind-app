/**
 * survey2.tsx — 음주·신체·PMS 평가 (Survey 2)
 * AUDIT(10) · PHQ-15(15) · PSST(19, 여성만)
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

// ── Gender ────────────────────────────────────────────────────────────────────
const GENDER: Question[] = [
  {
    id: 'gender', section: '기본 정보', num: '',
    text: '성별을 선택해 주세요',
    hint: '일부 문항(월경통·월경전 증상)은 성별에 따라 달라집니다.',
    type: 'radio',
    options: [
      { value: 'male',   label: '남성' },
      { value: 'female', label: '여성' },
    ],
  },
];

// ── AUDIT (10 문항) ───────────────────────────────────────────────────────────
const FREQ5: Option[] = [
  { value: 0, label: '전혀 없다' },
  { value: 1, label: '월 1회 미만' },
  { value: 2, label: '월 1회' },
  { value: 3, label: '주 1회' },
  { value: 4, label: '거의 매일' },
];

const AUDIT: Question[] = [
  {
    id: 'audit1', section: 'AUDIT — 음주 평가', num: 1,
    text: '술을 얼마나 자주 마십니까?',
    type: 'radio',
    options: [
      { value: 0, label: '전혀 마시지 않는다' },
      { value: 1, label: '월 1회 미만' },
      { value: 2, label: '월 2–4회' },
      { value: 3, label: '주 2–3회' },
      { value: 4, label: '주 4회 이상' },
    ],
  },
  {
    id: 'audit2', section: 'AUDIT — 음주 평가', num: 2,
    text: '평소 술을 마시는 날은 몇 잔 정도나 마십니까?',
    hint: '표준 1잔 기준 — 맥주 캔 355ml=1잔 / 소주잔 2잔=1잔 / 와인 150ml=1잔 / 위스키 샷 45ml=1잔',
    type: 'radio',
    visibleIf: a => (a['audit1'] as number ?? 0) > 0,
    options: [
      { value: 0, label: '1–2잔' },
      { value: 1, label: '3–4잔' },
      { value: 2, label: '5–6잔' },
      { value: 3, label: '7–9잔' },
      { value: 4, label: '10잔 이상' },
    ],
  },
  {
    id: 'audit3', section: 'AUDIT — 음주 평가', num: 3,
    text: '한 번 술을 마실 때 6잔 이상 마시는 경우는 얼마나 자주 있습니까?',
    type: 'radio',
    visibleIf: a => (a['audit1'] as number ?? 0) > 0,
    options: [
      { value: 0, label: '전혀 없다' },
      { value: 1, label: '월 1회 미만' },
      { value: 2, label: '월 1회' },
      { value: 3, label: '주 1회' },
      { value: 4, label: '거의 매일' },
    ],
  },
  {
    id: 'audit4', section: 'AUDIT — 음주 평가', num: 4,
    text: '지난 1년간 한 번 술을 마시기 시작하면 멈출 수 없었던 때가 얼마나 자주 있었습니까?',
    type: 'radio', visibleIf: a => (a['audit1'] as number ?? 0) > 0, options: FREQ5,
  },
  {
    id: 'audit5', section: 'AUDIT — 음주 평가', num: 5,
    text: '지난 1년간 평소 같으면 할 수 있었던 일을 음주 때문에 실패한 적이 얼마나 자주 있었습니까?',
    type: 'radio', visibleIf: a => (a['audit1'] as number ?? 0) > 0, options: FREQ5,
  },
  {
    id: 'audit6', section: 'AUDIT — 음주 평가', num: 6,
    text: '지난 1년간 술을 많이 마신 다음 날, 일을 나가기 위해서 해장술이 필요했던 적은 얼마나 자주 있었습니까?',
    type: 'radio', visibleIf: a => (a['audit1'] as number ?? 0) > 0, options: FREQ5,
  },
  {
    id: 'audit7', section: 'AUDIT — 음주 평가', num: 7,
    text: '지난 1년간 음주 후에 죄책감이 들거나 후회를 한 적이 있습니까?',
    type: 'radio', visibleIf: a => (a['audit1'] as number ?? 0) > 0, options: FREQ5,
  },
  {
    id: 'audit8', section: 'AUDIT — 음주 평가', num: 8,
    text: '지난 1년간 음주 때문에 전날 밤에 있었던 일이 기억나지 않았던 적이 얼마나 자주 있습니까?',
    type: 'radio', visibleIf: a => (a['audit1'] as number ?? 0) > 0, options: FREQ5,
  },
  {
    id: 'audit9', section: 'AUDIT — 음주 평가', num: 9,
    text: '음주로 인해 자신이나 다른 사람이 다친 적이 있습니까?',
    type: 'radio',
    options: [
      { value: 0, label: '없었다' },
      { value: 2, label: '있지만 지난 1년간 없었다' },
      { value: 4, label: '지난 1년간 있었다' },
    ],
  },
  {
    id: 'audit10', section: 'AUDIT — 음주 평가', num: 10,
    text: '친척이나 친구, 의사가 당신이 술 마시는 것을 걱정하거나 술 끊기를 권유한 적이 있습니까?',
    type: 'radio',
    options: [
      { value: 0, label: '없었다' },
      { value: 2, label: '있지만 지난 1년간 없었다' },
      { value: 4, label: '지난 1년간 있었다' },
    ],
  },
];

// ── PHQ-15 (15 문항) ──────────────────────────────────────────────────────────
const PHQ_OPTS: Option[] = [
  { value: 0, label: '전혀 방해받지 않았다' },
  { value: 1, label: '조금 방해받았다' },
  { value: 2, label: '많이 방해받았다' },
];

const PHQ15_ITEMS = [
  '위·배(복부) 통증 (속쓰림, 쥐어짜는 느낌 포함)',
  '허리 통증',
  '팔, 다리, 관절(무릎, 고관절 등)의 통증',
  '월경 기간 월경통 등의 문제 (여성만 해당)',
  '두통',
  '가슴 통증, 흉통',
  '어지러움',
  '기절할 것 같은 느낌 / 눈앞이 아찔함',
  '심장이 빨리 뛰거나 두근거림',
  '숨이 차거나 숨쉬기 답답함',
  '성교 통증 등의 문제',
  '변비, 묽은 변이나 설사',
  '속 불편감 (메스꺼움, 가스 참, 소화불량)',
  '피로감, 기운 없음',
  '수면 문제 (잠들기 어려움, 자주 깸 등)',
];

const PHQ15: Question[] = PHQ15_ITEMS.map((text, i) => ({
  id: `phq${i + 1}`, section: 'PHQ-15 — 신체 증상', num: i + 1,
  text,
  hint: '지난 4주 동안 다음 신체 증상들로 얼마나 방해받았습니까?',
  type: 'radio' as QType,
  options: PHQ_OPTS,
  ...(i === 3 ? { visibleIf: (a: Answers) => a['gender'] !== 'male' } : {}),
}));

// ── PSST 월경전 증상 (19 문항, 여성만) ───────────────────────────────────────
const PMS_OPTS: Option[] = [
  { value: 1, label: '전혀 경험하지 않는다' },
  { value: 2, label: '조금 경험한다' },
  { value: 3, label: '어느 정도 경험한다' },
  { value: 4, label: '심하게 경험한다' },
];

const PMS_SYM = [
  '분노 / 과민한 기분',
  '불안감 / 긴장감',
  '자주 울게 됨 / 대인관계에서 쉽게 상처받음',
  '우울한 기분 / 절망감',
  '직업 활동에 대한 흥미 감소',
  '집안 일에 대한 흥미 감소',
  '사회적 활동에 대한 흥미 감소',
  '집중하기 곤란함',
  '피로감 / 무기력감',
  '과식 / 특정 음식이 과도하게 먹고 싶음',
  '불면',
  '과도한 수면 / 수면 욕구의 증가',
  '쉽게 당황하거나 자제력을 잃을 것 같은 느낌',
  '신체적 증상들 (유방압통, 두통, 관절통, 근육통, 몸이 붓거나 체중이 증가된 느낌 등)',
];
const PMS_FUNC = [
  '일의 효율성 혹은 생산성의 지장',
  '동료들과의 관계에 지장',
  '가족들과의 관계에 지장',
  '사회적 활동의 지장',
  '집안 일 / 가사 책임 수행에 지장',
];

const PSST: Question[] = [
  ...PMS_SYM.map((text, i) => ({
    id: `pms1_${i + 1}`, section: 'PSST — 월경전 증상', num: `1.${i + 1}`,
    text,
    hint: '생리 전에 시작하여 생리 시작 후 며칠 이내 사라지는 증상에 대해 답해 주세요.',
    type: 'radio' as QType,
    options: PMS_OPTS,
    visibleIf: (a: Answers) => a['gender'] === 'female',
  })),
  ...PMS_FUNC.map((text, i) => ({
    id: `pms2_${i + 1}`, section: 'PSST — 월경전 증상', num: `2.${i + 1}`,
    text,
    hint: '위 증상들로 인해 일상 기능이 얼마나 방해받습니까?',
    type: 'radio' as QType,
    options: PMS_OPTS,
    visibleIf: (a: Answers) => a['gender'] === 'female',
  })),
];

const ALL_QUESTIONS: Question[] = [...GENDER, ...AUDIT, ...PHQ15, ...PSST];

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreAudit(a: Answers): number {
  let t = 0;
  for (let i = 1; i <= 10; i++) t += (a[`audit${i}`] as number ?? 0);
  return t;
}

function scorePHQ15(a: Answers): number {
  let t = 0;
  for (let i = 1; i <= 15; i++) {
    if (i === 4 && a['gender'] === 'male') continue;
    t += (a[`phq${i}`] as number ?? 0);
  }
  return t;
}

function scorePSST(a: Answers): { sym: number; func: number; total: number } {
  let sym = 0, func = 0;
  for (let i = 1; i <= 14; i++) sym  += ((a[`pms1_${i}`] as number ?? 1) - 1);
  for (let i = 1; i <= 5;  i++) func += ((a[`pms2_${i}`] as number ?? 1) - 1);
  return { sym, func, total: sym + func };
}

function pmsLabel(a: Answers): string {
  if (a['gender'] !== 'female') return '해당 없음';
  const moodKeys = ['pms1_1', 'pms1_2', 'pms1_3', 'pms1_4'];
  const moodSev  = moodKeys.some(k => (a[k] as number ?? 1) >= 3);
  const funcSev  = [1,2,3,4,5].some(i => (a[`pms2_${i}`] as number ?? 1) >= 3);
  if (moodSev && funcSev) return 'PMDD 가능성';
  const anySym  = Array.from({ length: 14 }, (_, i) => `pms1_${i+1}`).some(k => (a[k] as number ?? 1) >= 3);
  const anyFunc = [1,2,3,4,5].some(i => (a[`pms2_${i}`] as number ?? 1) >= 3);
  if (anySym && anyFunc) return 'PMS 가능성';
  return '유의한 월경전 증상 없음';
}

function buildSummary(a: Answers): string {
  const audit = scoreAudit(a);
  const phq   = scorePHQ15(a);
  const psst  = scorePSST(a);
  const pms   = pmsLabel(a);
  const aB = audit >= 20 ? '알코올의존의심' : audit >= 16 ? '유해음주' : audit >= 8 ? '위험음주' : '정상';
  const pB = phq >= 15 ? '중증' : phq >= 10 ? '중등도' : phq >= 5 ? '경증' : '최소';
  return `AUDIT:${audit}(${aB}) | PHQ-15:${phq}(${pB}) | PSST:${psst.total}(${pms})`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Survey2() {
  const db = useSQLiteContext();
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [scores, setScores]         = useState<{
    audit: number; phq: number; psst: { sym: number; func: number; total: number }; pms: string;
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

    const audit = scoreAudit(finalAnswers);
    const phq   = scorePHQ15(finalAnswers);
    const psst  = scorePSST(finalAnswers);
    const pms   = pmsLabel(finalAnswers);
    const summary = buildSummary(finalAnswers);

    setScores({ audit, phq, psst, pms });

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [new Date().toISOString().split('T')[0], 'survey2', audit,
          JSON.stringify({ audit, phq, psst, pms, summary })],
      );
    } catch { /* ignore */ }

    saveTestResult('음주·신체·PMS 평가 (Survey 2)', audit, summary).catch(() => {});

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

  const currentQ    = visibleQuestions[step];
  const totalVisible = visibleQuestions.length;
  const progress    = totalVisible > 0 ? (step + 1) / totalVisible : 0;

  // ── Done screen ───────────────────────────────────────────────────────────────
  if (done && scores) {
    const { audit, phq, psst, pms } = scores;
    const isFemale = answers['gender'] === 'female';
    const aLabel = audit >= 20 ? '알코올 의존 의심' : audit >= 16 ? '유해 음주' : audit >= 8 ? '위험 음주' : '정상/저위험';
    const pLabel = phq >= 15 ? '중증' : phq >= 10 ? '중등도' : phq >= 5 ? '경증' : '최소';
    const pmsBadge = pms.includes('PMDD') ? '⚠' : pms.includes('PMS') ? '△' : '✓';

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>결과가 저장되었습니다</Text>

          <View style={s.scoreGrid}>
            {[
              { name: '음주 (AUDIT)',   score: audit, max: 40,  label: aLabel,  warn: audit >= 8 },
              { name: '신체증상 (PHQ-15)', score: phq, max: 30, label: pLabel, warn: phq >= 5  },
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
                <View style={s.miniBar}>
                  <View style={[
                    s.miniBarFill,
                    { width: `${Math.min(100, Math.round(item.score / item.max * 100))}%` as any },
                    item.warn ? s.miniBarWarn : s.miniBarOk,
                  ]} />
                </View>
              </View>
            ))}
            {isFemale && (
              <View style={[s.scoreCard, pms.includes('PMDD') && s.scoreCardWarn]}>
                <Text style={s.scoreName}>월경전증상 (PSST)</Text>
                <View style={s.scoreRow}>
                  <Text style={s.scoreVal}>{psst.total}</Text>
                  <Text style={s.scoreMax}>/ 57</Text>
                </View>
                <View style={[s.scoreBadge, pms.includes('없음') ? s.badgeOk : s.badgeWarn]}>
                  <Text style={[s.scoreBadgeText, pms.includes('없음') ? s.badgeOkText : s.badgeWarnText]}>
                    {pmsBadge} {pms}
                  </Text>
                </View>
              </View>
            )}
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
            <Text style={s.headerTitle}>Survey 2 · {currentQ.section}</Text>
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
