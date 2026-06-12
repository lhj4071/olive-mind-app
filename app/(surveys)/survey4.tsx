/**
 * survey4.tsx — 주의집중·대인관계 평가 (Survey 4)
 * ASRS v1.1(18) · IPS(36)
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

// ── ASRS v1.1 (18 문항, 1–5점) ────────────────────────────────────────────────
const ASRS_OPTS: Option[] = [
  { value: 1, label: '1 — 전혀 그렇지 않다' },
  { value: 2, label: '2 — 거의 그렇지 않다' },
  { value: 3, label: '3 — 가끔 그렇다' },
  { value: 4, label: '4 — 자주 그렇다' },
  { value: 5, label: '5 — 매우 그렇다' },
];

const ASRS_ITEMS = [
  '어떤 일의 어려운 부분은 끝내 놓고, 그 일을 마무리를 짓지 못해 곤란을 겪은 적이 있습니까?',
  '체계가 필요한 일을 해야 할 때 순서대로 진행하기 어려운 경우가 있습니까?',
  '약속이나 해야 할 일을 잊어버려 곤란을 겪은 적이 있습니까?',
  '골치 아픈 일은 피하거나 미루는 경우가 있습니까?',
  '오래 앉아 있을 때, 손을 만지작거리거나 발을 꼼지락 거리는 경우가 있습니까?',
  '마치 모터가 달린 것처럼, 과도하게 혹은 멈출 수 없이 활동을 하는 경우가 있습니까?',
  '지루하고 어려운 일을 할 때, 부주의해서 실수를 하는 경우가 있습니까?',
  '지루하고 반복적인 일을 할 때, 주의 집중이 힘든 경우가 있습니까?',
  '대화 중, 특히 상대방이 당신에게 직접적으로 말하고 있을 때에도 집중하기 힘든 경우가 있습니까?',
  '집이나 직장에서 물건을 엉뚱한 곳에 두거나 어디에 두었는지 찾기 어려운 경우가 있습니까?',
  '주변에서 벌어지는 일이나 소음 때문에 주의가 산만해지는 경우가 있습니까?',
  '회의나 다른 사회적 상황에서 계속 앉아 있어야 함에도 잠깐씩 자리를 뜨는 경우가 있습니까?',
  '안절부절 못하거나 조바심하는 경우가 있습니까?',
  '혼자 쉬고 있을 때, 긴장을 풀거나 마음을 편하게 갖기 어려운 경우가 있습니까?',
  '사회적 상황에서 나 혼자 말을 너무 많이 한다고 느끼는 경우가 있습니까?',
  '대화 도중 상대방이 말을 끝내기 전에 끼어들어 상대방의 말을 끊는 경우가 있습니까?',
  '차례를 지켜야 하는 상황에서 자신의 차례를 기다리는 것이 어려운 경우가 있습니까?',
  '다른 사람이 바쁘게 일할 때, 방해되는 행동을 하는 경우가 있습니까?',
];

const ASRS: Question[] = ASRS_ITEMS.map((text, i) => ({
  id: `adhd${i + 1}`, section: 'ASRS — 주의집중력', num: i + 1,
  text,
  hint: i < 6
    ? '파트 A (1–6번): 지난 6개월간 얼마나 자주 경험했습니까?'
    : '파트 B (7–18번): 지난 6개월간 얼마나 자주 경험했습니까?',
  type: 'radio' as QType,
  options: ASRS_OPTS,
}));

// ── IPS 대인관계 민감성 (36 문항, 1–4점) ────────────────────────────────────────
const IPS_OPTS: Option[] = [
  { value: 1, label: '1 — 전혀 그렇지 않다' },
  { value: 2, label: '2 — 별로 그렇지 않다' },
  { value: 3, label: '3 — 약간 그렇다' },
  { value: 4, label: '4 — 매우 그렇다' },
];

const IPS_ITEMS = [
  '작별 인사할 때 마음이 놓이지 않고 불안정한 편이다.',
  '내가 다른 사람들에게 미친 영향을 걱정한다.',
  '거절당할까 봐 내 생각을 말하지 못한다.',
  '새로운 사람을 만나기가 불편하다.',
  '사람들은 내 본래 모습을 안다면 나를 싫어할 것이다.',
  '친밀한 관계 속에서 안전하게 느낀다.',
  '다른 사람에게 상처를 줄까 봐 화를 내지 않는다.',
  '친구와 다투고 나면 화해할 때까지 불편하다.',
  '다른 사람들이 어떻게 느끼는지를 항상 의식한다.',
  '내가 한 말이나 행동이 비난받을까 봐 걱정한다.',
  '누군가 나에게 반응하지 않는 것을 항상 알아차린다.',
  '내 가까운 사람을 잃을까 봐 걱정한다.',
  '사람들은 일반적으로 나를 좋아한다고 느낀다.',
  '다른 사람을 공격하거나 당황시키지 않기 위해서는 원치 않는 일도 할 것이다.',
  '내가 한 일이 옳다는 것을 다른 사람들의 말을 통해서만 확인할 수 있다.',
  '가까운 사람을 즐겁게 하기 위해서 애를 쓴다.',
  '사람들과 헤어질 때 불안/초조함을 느낀다.',
  '누군가로부터 칭찬을 들으면 행복하다.',
  '내 기분이 다른 사람들을 당황하게 할까 봐 염려한다.',
  '나는 다른 사람들을 행복하게 할 수 있다.',
  '사람들에게 화를 내는 것이 어렵다.',
  '다른 사람들을 비난하는 것이 걱정스럽다.',
  '누군가가 내가 하는 일을 비난하면, 기분이 상한다.',
  '다른 사람들이 나를 어떻게 생각할지 걱정한다.',
  '나는 항상 비난받을 것이라 생각한다.',
  '다른 사람이 나로 인해 즐거운지를 결코 확신할 수가 없다.',
  '나를 정말로 알고 있는 사람은 달갑지 않다.',
  '누군가에 의해 기분이 상하면, 그 생각에서 쉽게 헤어나올 수가 없다.',
  '다른 사람들은 나를 이해하지 못한다고 느낀다.',
  '다른 사람들이 나를 어떻게 생각할지 걱정한다.',
  '내가 아는 사람이 나를 좋아하지 않으면 만족감을 느끼지 못한다.',
  '다른 사람에게 무례한 적이 없다.',
  '다른 사람의 마음을 상하게 하지 않을까 걱정한다.',
  '누군가가 나에게 화를 내면 상처를 입는다.',
  '한 사람으로서의 가치를 다른 사람이 어떻게 생각하는가에 많이 의존한다.',
  '다른 사람들이 나를 어떻게 느끼는가를 신경 쓴다.',
];

const IPS: Question[] = IPS_ITEMS.map((text, i) => ({
  id: `ips${i + 1}`, section: 'IPS — 대인관계 민감성', num: i + 1,
  text,
  hint: '자신에게 해당하는 정도를 선택해 주세요.',
  type: 'radio' as QType,
  options: IPS_OPTS,
}));

const ALL_QUESTIONS: Question[] = [...ASRS, ...IPS];

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreASRS(a: Answers): { total: number; ia: number; hi: number; partA_pos: number; screenPos: boolean } {
  const IA_items = [1,2,3,4,7,8,9,10,11];
  const HI_items = [5,6,12,13,14,15,16,17,18];
  let total = 0, ia = 0, hi = 0, partA_pos = 0;
  for (let i = 1; i <= 18; i++) {
    const v = (a[`adhd${i}`] as number ?? 1);
    total += v;
    if (IA_items.includes(i)) ia += v;
    if (HI_items.includes(i)) hi += v;
    if (i <= 6 && v >= 4) partA_pos++;
  }
  return { total, ia, hi, partA_pos, screenPos: partA_pos >= 4 };
}

function scoreIPS(a: Answers): { total: number; ia: number; na: number; sax: number; tim: number; fis: number } {
  const REV    = [6, 13, 18, 20, 32];
  const IA_i   = [2,4,10,23,28,30,36];
  const NA_i   = [6,8,11,13,16,18,20,34];
  const SAX_i  = [1,12,15,17,19,25,26,29];
  const TIM_i  = [3,7,9,14,21,22,32,33];
  const FIS_i  = [5,24,27,31,35];
  let total = 0, ia = 0, na = 0, sax = 0, tim = 0, fis = 0;
  for (let i = 1; i <= 36; i++) {
    const v  = (a[`ips${i}`] as number ?? 1);
    const sc = REV.includes(i) ? (5 - v) : v;
    total += sc;
    if (IA_i.includes(i))  ia  += sc;
    if (NA_i.includes(i))  na  += sc;
    if (SAX_i.includes(i)) sax += sc;
    if (TIM_i.includes(i)) tim += sc;
    if (FIS_i.includes(i)) fis += sc;
  }
  return { total, ia, na, sax, tim, fis };
}

function buildSummary(a: Answers): string {
  const asrs = scoreASRS(a);
  const ips  = scoreIPS(a);
  const aB   = asrs.screenPos ? '선별양성' : '선별음성';
  const iB   = ips.total >= 109 ? '높음' : ips.total >= 91 ? '약간높음' : ips.total >= 73 ? '평균' : '낮음';
  return `ASRS:${asrs.total}(${aB},PartA${asrs.partA_pos}/6) | IPS:${ips.total}(${iB})`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Survey4() {
  const db = useSQLiteContext();
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [scores, setScores]         = useState<{
    asrs: ReturnType<typeof scoreASRS>; ips: ReturnType<typeof scoreIPS>;
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

    const asrs    = scoreASRS(finalAnswers);
    const ips     = scoreIPS(finalAnswers);
    const summary = buildSummary(finalAnswers);

    setScores({ asrs, ips });

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [new Date().toISOString().split('T')[0], 'survey4', asrs.total,
          JSON.stringify({ asrs: asrs.total, ips: ips.total, partA_pos: asrs.partA_pos, screenPos: asrs.screenPos, summary })],
      );
    } catch { /* ignore */ }

    saveTestResult('주의집중·대인관계 평가 (Survey 4)', asrs.total, summary).catch(() => {});

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
    const { asrs, ips } = scores;
    const asrsLabel = asrs.screenPos ? `선별 양성 (파트A ${asrs.partA_pos}/6)` : '선별 음성';
    const ipsLabel  = ips.total >= 109 ? '높음 (≥109)' : ips.total >= 91 ? '약간 높음 (91–108)' : ips.total >= 73 ? '평균 (73–90)' : '낮음 (≤72)';

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>결과가 저장되었습니다</Text>

          <View style={s.scoreGrid}>
            <View style={[s.scoreCard, asrs.screenPos && s.scoreCardWarn]}>
              <Text style={s.scoreName}>주의집중력 (ASRS)</Text>
              <View style={s.scoreRow}>
                <Text style={s.scoreVal}>{asrs.total}</Text>
                <Text style={s.scoreMax}>/ 90</Text>
              </View>
              <View style={[s.scoreBadge, asrs.screenPos ? s.badgeWarn : s.badgeOk]}>
                <Text style={[s.scoreBadgeText, asrs.screenPos ? s.badgeWarnText : s.badgeOkText]}>
                  {asrsLabel}
                </Text>
              </View>
              <View style={s.subRow}>
                <View style={s.subItem}>
                  <Text style={s.subName}>부주의</Text>
                  <Text style={s.subVal}>{asrs.ia}/45</Text>
                </View>
                <View style={s.subItem}>
                  <Text style={s.subName}>과잉행동·충동</Text>
                  <Text style={s.subVal}>{asrs.hi}/45</Text>
                </View>
              </View>
            </View>

            <View style={s.scoreCard}>
              <Text style={s.scoreName}>대인관계 민감성 (IPS)</Text>
              <View style={s.scoreRow}>
                <Text style={s.scoreVal}>{ips.total}</Text>
                <Text style={s.scoreMax}>/ 144</Text>
              </View>
              <View style={[s.scoreBadge, ips.total >= 91 ? s.badgeWarn : s.badgeOk]}>
                <Text style={[s.scoreBadgeText, ips.total >= 91 ? s.badgeWarnText : s.badgeOkText]}>
                  {ipsLabel}
                </Text>
              </View>
              <View style={s.miniBar}>
                <View style={[s.miniBarFill,
                  { width: `${Math.min(100, Math.round((ips.total - 36) / 108 * 100))}%` as any },
                  ips.total >= 91 ? s.miniBarWarn : s.miniBarOk,
                ]} />
              </View>
            </View>
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
            <Text style={s.headerTitle}>Survey 4 · {currentQ.section}</Text>
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
  optDot: {
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
  scoreGrid:   { gap: 12, marginBottom: 24 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  scoreCardWarn: { borderColor: '#e0b0a0', backgroundColor: '#FBF0EB' },
  scoreName: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  scoreRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  scoreVal:  { color: C.text, fontSize: 32, fontWeight: '800', lineHeight: 36 },
  scoreMax:  { color: C.textMuted, fontSize: 14 },
  scoreBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  badgeOk:   { backgroundColor: C.oliveFaded },
  badgeWarn: { backgroundColor: '#fde8d8' },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },
  badgeOkText:    { color: C.olive },
  badgeWarnText:  { color: '#C45E2E' },
  miniBar:     { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },
  miniBarOk:   { backgroundColor: C.olive },
  miniBarWarn: { backgroundColor: '#C45E2E' },
  subRow:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  subItem: { flex: 1, backgroundColor: C.bg, borderRadius: 8, padding: 8, alignItems: 'center' },
  subName: { color: C.textMuted, fontSize: 10, marginBottom: 2 },
  subVal:  { color: C.text, fontSize: 13, fontWeight: '700' },
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
