/**
 * survey5.tsx — 기질·성격·회복탄력성 (Survey 5)
 * TEMPS-A(39, binary) · PID-5-BF(25, 0-3) · CD-RISC(25, 0-4)
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

// ── TEMPS-A (39 문항, 예=1/아니오=0) ─────────────────────────────────────────
const BINARY_OPTS: Option[] = [
  { value: 1, label: '예' },
  { value: 0, label: '아니오' },
];

const TEMPS_ITEMS = [
  '분명한 이유 없이 사고력이 날카롭다가 둔했다가 한다.',
  '계속해서 활기찼다가 침울했다가 한다.',
  '기분과 에너지의 변화가 심하게 오락가락 한다.',
  '때때로 세상이 활기 있게 보이기도 하고 무기력하게 보이기도 한다.',
  '이유 없이 기분이 변하곤 한다.',
  '나는 사람들과의 만남에서 적극적이었다가 소극적이었다가 한다.',
  '내 기분과 에너지 상태는 높거나 낮은 상태이며 그 중간일 때는 거의 없다.',
  '나는 지나치게 자신감이 넘치거나 자신이 없거나 한다.',
  '몇 시간밖에 못 자도 괜찮다가 9시간 이상 자도 잠이 부족할 때가 있다.',
  '기분 좋게 자고 아침에 일어났는데 인생은 살 가치가 없다고 생각할 때가 있다.',
  '나는 누군가를 많이 좋아하다가 갑자기 관심이 없어지기도 한다.',
  '나는 슬픔과 행복을 동시에 느낄 수 있는 사람이다.',
  '사람들은 나보고 세상의 밝은 면을 볼 줄 모른다고 말한다.',
  '나는 모든 것을 의심하는 타입이다.',
  '나는 매우 비관적인 사람이다.',
  '나는 천성적으로 만족을 모른다.',
  '나는 슬프고 불행한 사람이다.',
  '때때로 일이 최악으로 간다고 생각한다.',
  '나는 쉽게 포기한다.',
  '나는 불평이 많다.',
  '사람들은 내가 언제 불같이 화를 낼 지 모르겠다고 한다.',
  '나는 누군가를 해칠 수 있을 만큼 화가 날 수도 있다.',
  '나는 종종 너무 화가 나서 중도에 다 그만둬 버린다.',
  '나는 뜻대로 안되면 시비가 붙는 타입이다.',
  '누군가와 의견이 일치하지 않으면 열띤 언쟁을 벌일 수 있다.',
  '나는 화가 나면 사람들에게 대든다.',
  '나는 욕을 잘 한다고 소문 나 있다.',
  '술 몇 잔에도 난폭 해진다는 말을 들어왔다.',
  '나는 말재주가 좋아 누군가를 설득하고 감동을 주는 데 능하다.',
  '나는 종종 좋은 아이디어가 많이 떠오르곤 한다.',
  '나는 위험하더라도 새로운 일을 추진하는 걸 좋아한다.',
  '나는 농담하기를 좋아하며 사람들이 나를 보고 재미있다고 한다.',
  '나는 다방면에 능력과 전문성이 있다.',
  '잘 모르는 사람과 같이 있더라도 나는 편하다.',
  '나는 많은 사람들과 함께 있는 것을 좋아한다.',
  '나는 우두머리 노릇 하는 것을 좋아한다.',
  '나는 가족 중 누군가 중병에 걸릴까 봐 종종 두렵다.',
  '나는 항상 누군가 우리 가족 구성원에 대해서 나쁜 소식을 전할지도 모른다는 생각을 한다.',
  '누군가 집에 늦게 들어오면, 사고가 난 게 아닐까 두렵다.',
];

const TEMPS: Question[] = TEMPS_ITEMS.map((text, i) => ({
  id: `t${i + 1}`, section: 'TEMPS-A — 기질 척도', num: i + 1,
  text,
  hint: '자신의 평소 성향에 해당하면 예, 해당하지 않으면 아니오를 선택해 주세요.',
  type: 'binary' as QType,
  options: BINARY_OPTS,
}));

// ── PID-5-BF (25 문항, 0–3점) ────────────────────────────────────────────────
const PID_OPTS: Option[] = [
  { value: 0, label: '0 — 매우 사실이 아님' },
  { value: 1, label: '1 — 가끔 사실이 아님' },
  { value: 2, label: '2 — 가끔 사실임' },
  { value: 3, label: '3 — 매우 사실임' },
];

const PID_ITEMS = [
  '사람들은 나를 무모한 편이라고 말한다.',
  '나는 완전히 충동적으로 행동한다고 느낄 때가 있다.',
  '더 잘 알면서도 성급한 결정을 멈추지 못한다.',
  '내가 하는 일이 별 의미 없다고 자주 느낀다.',
  '다른 사람들은 나를 책임감이 부족하다고 본다.',
  '나는 미리 계획하는 데 서툴다.',
  '내 생각이 다른 사람에게 잘 이해되지 않을 때가 많다.',
  '나는 거의 모든 일에 대해 걱정이 많다.',
  '나는 별다른 이유 없이도 쉽게 감정이 격해진다.',
  '나는 인생에서 혼자 남는 것이 무엇보다 두렵다.',
  '잘 되지 않을 게 분명해도 한 가지 방식에 고집스럽게 매달린다.',
  '실제로 존재하지 않는 것을 본 경험이 있다.',
  '나는 연애나 친밀한 관계를 의도적으로 피하는 편이다.',
  '나는 새로운 친구를 사귀는 데 관심이 없다.',
  '나는 사소한 일에도 쉽게 짜증이 난다.',
  '나는 사람들과 너무 가까워지는 것을 불편하게 느낀다.',
  '다른 사람의 감정을 상하게 해도 큰일이 아니라고 느낄 때가 있다.',
  '나는 무엇이든 좀처럼 열정이 생기지 않는다.',
  '나는 다른 사람들의 주목을 갈망한다.',
  '나는 나보다 덜 중요하다고 여겨지는 사람들을 상대해야 할 때가 자주 있다.',
  '내게는 말이 되지만 남들이 이상하다고 여기는 생각을 자주 한다.',
  '나는 원하는 것을 얻기 위해 사람을 이용하곤 한다.',
  '나는 멍하니 있다가 정신을 차려보면 시간이 훌쩍 지난 것을 깨달을 때가 있다.',
  '주변이 비현실적으로 느껴지거나 평소보다 지나치게 선명하게 느껴질 때가 있다.',
  '나는 다른 사람을 이용하는 일이 어렵지 않다.',
];

const PID5: Question[] = PID_ITEMS.map((text, i) => ({
  id: `pid${i + 1}`, section: 'PID-5-BF — 성격 특성', num: i + 1,
  text,
  hint: '자신에게 얼마나 해당하는지 선택해 주세요.',
  type: 'radio' as QType,
  options: PID_OPTS,
}));

// ── CD-RISC (25 문항, 0–4점) ─────────────────────────────────────────────────
const CD_OPTS: Option[] = [
  { value: 0, label: '0 — 전혀 그렇지 않다' },
  { value: 1, label: '1 — 약간 그렇지 않다' },
  { value: 2, label: '2 — 보통이다' },
  { value: 3, label: '3 — 약간 그렇다' },
  { value: 4, label: '4 — 매우 그렇다' },
];

const CD_ITEMS = [
  '변화가 일어날 때 적응할 수 있다.',
  '스트레스를 받았을 때 날 도와줄 가깝고도 돈독한 사람이 적어도 하나 있다.',
  '내가 가지고 있는 문제에 분명한 해결책이 없을 때에는 가끔 신이나 운명이 도와줄 수 있다.',
  '나는 무슨 일이 일어나도 처리할 수 있다.',
  '과거의 성공들은 내가 새로운 도전과 역경을 다루는데 자신감을 준다.',
  '어려운 일이 생겼을 때, 나는 그 일의 재미있는 면을 찾아보려고 노력한다.',
  '스트레스 극복을 통해서 내가 더 강해질 수 있다.',
  '나는 병이나 부상, 또는 다른 역경을 겪은 후에도 곧 회복하는 편이다.',
  '좋은 일이건, 나쁜 일이건 대부분의 일들은 그럴만한 이유가 있어 일어나는 것이라 믿는다.',
  '나는 결과에 상관없이 최선의 노력을 기울인다.',
  '비록 장애물이 있더라도 나는 내 목표를 성취할 수 있다고 믿는다.',
  '희망이 없어 보이는 경우에도, 나는 포기하지 않는다.',
  '스트레스/위기 상황에서, 누구에게 도움을 청해야 할 지 안다.',
  '스트레스를 받을 때에도, 나는 집중력과 사고력을 잘 유지한다.',
  '타인이 모든 결정을 하게 하기보다는 내가 문제해결을 주도하는 것을 더 좋아한다.',
  '나는 실패 때문에 쉽게 용기를 잃지는 않는다.',
  '나는 삶의 도전이나 역경에 잘 대처하는 강한 사람이라고 생각한다.',
  '나는 남들이 탐탁지 않게 생각하는 어려운 결정도 필요하다면 할 수 있다.',
  '슬픔, 공포, 그리고 분노와 같은 불쾌하거나 고통스러운 감정들을 잘 처리할 수 있다.',
  '인생의 문제를 처리할 때, 간혹 이유 없이 직감에 따라 행동해야만 할 때가 있다.',
  '삶에 대한 강한 목표 의식이 있다.',
  '나는 내 인생을 스스로 잘 조절하고 있다.',
  '나는 도전을 좋아한다.',
  '어떤 장애를 만나게 되더라도 내 목표를 달성하기 위해 나아간다.',
  '나는 내가 이룬 성취에 자부심을 느낀다.',
];

const CDRISC: Question[] = CD_ITEMS.map((text, i) => ({
  id: `cd${i + 1}`, section: 'CD-RISC — 회복 탄력성', num: i + 1,
  text,
  hint: '지난 한 달을 기준으로 자신을 가장 잘 나타내는 답을 선택해 주세요.',
  type: 'radio' as QType,
  options: CD_OPTS,
}));

const ALL_QUESTIONS: Question[] = [...TEMPS, ...PID5, ...CDRISC];

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreTEMPS(a: Answers): { cy: number; de: number; ir: number; hy: number; an: number } {
  const CY = [1,2,3,4,5,6,7,8,9,10,11,12];
  const DE = [13,14,15,16,17,18,19,20];
  const IR = [21,22,23,24,25,26,27,28];
  const HY = [29,30,31,32,33,34,35,36];
  const AN = [37,38,39];
  let cy=0, de=0, ir=0, hy=0, an=0;
  CY.forEach(i => cy += (a[`t${i}`] as number ?? 0));
  DE.forEach(i => de += (a[`t${i}`] as number ?? 0));
  IR.forEach(i => ir += (a[`t${i}`] as number ?? 0));
  HY.forEach(i => hy += (a[`t${i}`] as number ?? 0));
  AN.forEach(i => an += (a[`t${i}`] as number ?? 0));
  return { cy, de, ir, hy, an };
}

function scorePID5(a: Answers): { total: number; di: number; na: number; dt: number; an: number; ps: number } {
  const DI = [1,2,3,5,6];
  const NA = [8,9,10,15,19];
  const DT = [7,13,14,16,18];
  const AN = [4,17,20,22,25];
  const PS = [11,12,21,23,24];
  let di=0, na=0, dt=0, an=0, ps=0;
  DI.forEach(i => di += (a[`pid${i}`] as number ?? 0));
  NA.forEach(i => na += (a[`pid${i}`] as number ?? 0));
  DT.forEach(i => dt += (a[`pid${i}`] as number ?? 0));
  AN.forEach(i => an += (a[`pid${i}`] as number ?? 0));
  PS.forEach(i => ps += (a[`pid${i}`] as number ?? 0));
  return { total: di+na+dt+an+ps, di, na, dt, an, ps };
}

function scoreCDRISC(a: Answers): number {
  let t = 0;
  for (let i = 1; i <= 25; i++) t += (a[`cd${i}`] as number ?? 0);
  return t;
}

function buildSummary(a: Answers): string {
  const t = scoreTEMPS(a);
  const dom = (['순환성','우울성','과민성','경조성','불안성'] as const)[
    [t.cy/12, t.de/8, t.ir/8, t.hy/8, t.an/3].indexOf(Math.max(t.cy/12, t.de/8, t.ir/8, t.hy/8, t.an/3))
  ];
  const pid = scorePID5(a);
  const cd  = scoreCDRISC(a);
  const pB = pid.total >= 30 ? '전반적상승' : pid.total >= 20 ? '중등도' : '낮음';
  const cB = cd >= 82 ? '높은탄력성' : cd >= 65 ? '평균' : '낮음';
  return `TEMPS:우세(${dom}) | PID-5:${pid.total}(${pB}) | CD-RISC:${cd}(${cB})`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Survey5() {
  const db = useSQLiteContext();
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [scores, setScores]         = useState<{
    temps: ReturnType<typeof scoreTEMPS>;
    pid: ReturnType<typeof scorePID5>;
    cd: number;
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

    const temps   = scoreTEMPS(finalAnswers);
    const pid     = scorePID5(finalAnswers);
    const cd      = scoreCDRISC(finalAnswers);
    const summary = buildSummary(finalAnswers);

    setScores({ temps, pid, cd });

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [new Date().toISOString().split('T')[0], 'survey5', cd,
          JSON.stringify({ temps, pid: pid.total, cd, summary })],
      );
    } catch { /* ignore */ }

    saveTestResult('기질·성격·회복탄력성 (Survey 5)', cd, summary).catch(() => {});

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
    const { temps, pid, cd } = scores;
    const tTotal = temps.cy + temps.de + temps.ir + temps.hy + temps.an;
    const tDoms = [
      { name: '순환성', v: temps.cy, max: 12 },
      { name: '우울성', v: temps.de, max: 8  },
      { name: '과민성', v: temps.ir, max: 8  },
      { name: '경조성', v: temps.hy, max: 8  },
      { name: '불안성', v: temps.an, max: 3  },
    ];
    const domTEMPS = tDoms.reduce((a, b) => a.v/a.max >= b.v/b.max ? a : b).name;
    const pidLabel = pid.total >= 30 ? '전반적 상승 (≥30)' : pid.total >= 20 ? '중등도 (20–29)' : pid.total >= 10 ? '경미 (10–19)' : '낮음 (0–9)';
    const cdLabel  = cd >= 82 ? '높은 탄력성 (≥82)' : cd >= 65 ? '평균 (65–81)' : cd >= 49 ? '낮은 편 (49–64)' : '낮은 탄력성 (<49)';

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>결과가 저장되었습니다</Text>

          <View style={s.scoreGrid}>
            {/* TEMPS-A */}
            <View style={s.scoreCard}>
              <Text style={s.scoreName}>TEMPS-A — 기질 척도</Text>
              <View style={s.scoreRow}>
                <Text style={s.scoreVal}>{tTotal}</Text>
                <Text style={s.scoreMax}>/ 39</Text>
              </View>
              <View style={[s.scoreBadge, s.badgeOk]}>
                <Text style={[s.scoreBadgeText, s.badgeOkText]}>우세: {domTEMPS}</Text>
              </View>
              <View style={s.subRow}>
                {tDoms.map(d => (
                  <View key={d.name} style={s.subItem}>
                    <Text style={s.subName}>{d.name}</Text>
                    <Text style={s.subVal}>{d.v}/{d.max}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* PID-5-BF */}
            <View style={[s.scoreCard, pid.total >= 20 && s.scoreCardWarn]}>
              <Text style={s.scoreName}>PID-5-BF — 성격 특성</Text>
              <View style={s.scoreRow}>
                <Text style={s.scoreVal}>{pid.total}</Text>
                <Text style={s.scoreMax}>/ 75</Text>
              </View>
              <View style={[s.scoreBadge, pid.total >= 20 ? s.badgeWarn : s.badgeOk]}>
                <Text style={[s.scoreBadgeText, pid.total >= 20 ? s.badgeWarnText : s.badgeOkText]}>
                  {pidLabel}
                </Text>
              </View>
              <View style={s.miniBar}>
                <View style={[s.miniBarFill,
                  { width: `${Math.min(100, Math.round(pid.total / 75 * 100))}%` as any },
                  pid.total >= 20 ? s.miniBarWarn : s.miniBarOk,
                ]} />
              </View>
            </View>

            {/* CD-RISC */}
            <View style={[s.scoreCard, cd < 49 && s.scoreCardWarn]}>
              <Text style={s.scoreName}>CD-RISC — 회복 탄력성</Text>
              <View style={s.scoreRow}>
                <Text style={s.scoreVal}>{cd}</Text>
                <Text style={s.scoreMax}>/ 100</Text>
              </View>
              <View style={[s.scoreBadge, cd < 49 ? s.badgeWarn : s.badgeOk]}>
                <Text style={[s.scoreBadgeText, cd < 49 ? s.badgeWarnText : s.badgeOkText]}>
                  {cdLabel}
                </Text>
              </View>
              <View style={s.miniBar}>
                <View style={[s.miniBarFill,
                  { width: `${Math.min(100, cd)}%` as any },
                  cd < 49 ? s.miniBarWarn : s.miniBarOk,
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
            <Text style={s.headerTitle}>Survey 5 · {currentQ.section}</Text>
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
  subRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  subItem: { minWidth: 54, backgroundColor: C.bg, borderRadius: 8, padding: 7, alignItems: 'center' },
  subName: { color: C.textMuted, fontSize: 9, marginBottom: 2 },
  subVal:  { color: C.text, fontSize: 12, fontWeight: '700' },
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
