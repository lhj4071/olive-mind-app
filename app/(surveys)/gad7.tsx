import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';
import { saveTestResult } from '../../src/lib/supabase';


type Answers = Record<string, number>;

const OPTS = [
  { value: 0, label: '전혀 아니다' },
  { value: 1, label: '여러 날 동안' },
  { value: 2, label: '절반 이상의 날 동안' },
  { value: 3, label: '거의 매일' },
];

const QUESTIONS = [
  '불안하거나 초조하거나 조마조마한 느낌',
  '걱정하는 것을 멈추거나 조절할 수가 없음',
  '여러 가지 것들에 대해 걱정을 너무 많이 함',
  '편하게 있기가 어려움',
  '너무 안절부절 못해서 가만히 있기가 힘듦',
  '쉽게 짜증이 나거나 과민해짐',
  '마치 끔찍한 일이 일어날 것 같아 두려움을 느낌',
];

const getLevel = (s: number) => {
  if (s <= 4)  return { label: '최소',   color: C.olive,    desc: '불안 증상이 거의 없어요. 심리적으로 안정적이에요.' };
  if (s <= 9)  return { label: '경미',   color: C.gad7,     desc: '경미한 불안 증상이에요. 이완 훈련이나 호흡법을 권장해요.' };
  if (s <= 14) return { label: '중등도', color: '#E07040',  desc: '중등도 불안 증상이에요. 전문가 상담을 고려해 보세요.' };
  return       { label: '심각',   color: '#C0392B',  desc: '심각한 불안 수준이에요. 전문가 도움을 꼭 받으세요.' };
};

const localDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function GAD7() {
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);
  const [selectedVal, setSelectedVal] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const answersRef  = useRef<Answers>({});
  const finishedRef = useRef(false);
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const slideAnim   = useRef(new Animated.Value(0)).current;

  const animate = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => { animate(); }, [step, animate]);

  const finishSurvey = useCallback(async (answers: Answers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const total = Object.values(answers).reduce((a, b) => a + b, 0);
    setScore(total);
    setDone(true);

    try {
      await db.runAsync(
        'INSERT OR REPLACE INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)',
        [localDateKey(), 'GAD7', total, JSON.stringify(answers)]
      );
    } catch { /* ignore */ }

    saveTestResult('GAD7', total, answers).catch(() => {});
  }, [db]);

  const handleAnswer = useCallback((value: number) => {
    setSelectedVal(value);
    answersRef.current[`q${step + 1}`] = value;
    setTimeout(() => {
      setSelectedVal(null);
      if (step >= QUESTIONS.length - 1) {
        finishSurvey(answersRef.current);
      } else {
        setStep(s => s + 1);
      }
    }, 300);
  }, [step, finishSurvey]);

  const goBack = useCallback(() => {
    if (step === 0) { router.back(); return; }
    setStep(s => s - 1);
  }, [step]);

  const progress = (step + 1) / QUESTIONS.length;

  if (done) {
    const level = getLevel(score);
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>GAD-7 불안 척도</Text>

          <View style={s.scoreBox}>
            <Text style={s.scoreNum}>{score}</Text>
            <Text style={s.scoreMax}>/ 21점</Text>
          </View>
          <View style={[s.levelBadge, { backgroundColor: level.color + '22', borderColor: level.color }]}>
            <Text style={[s.levelText, { color: level.color }]}>{level.label}</Text>
          </View>
          <Text style={s.levelDesc}>{level.desc}</Text>

          <View style={s.guideBox}>
            <Text style={s.guideTitle}>점수 해석 기준</Text>
            {([
              { r: '0–4점',   l: '최소',   c: C.olive   },
              { r: '5–9점',   l: '경미',   c: C.gad7    },
              { r: '10–14점', l: '중등도', c: '#E07040' },
              { r: '15–21점', l: '심각',   c: '#C0392B' },
            ] as const).map(g => (
              <View key={g.r} style={s.guideRow}>
                <Text style={s.guideRange}>{g.r}</Text>
                <Text style={[s.guideLabel, { color: g.c }]}>{g.l}</Text>
              </View>
            ))}
          </View>

          <Text style={s.disclaimer}>
            본 결과는 선별 목적의 참고 자료이며, 진단을 의미하지 않습니다.
          </Text>

          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(surveys)/evaluation-hub')}>
            <Text style={s.doneBtnText}>← 평가 허브로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>GAD-7 · 불안 척도</Text>
          <Text style={s.stepCounter}>{step + 1} / {QUESTIONS.length}</Text>
        </View>
      </View>

      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={s.qCard}>
            <Text style={s.qNum}>{step + 1}.</Text>
            <Text style={s.qText}>{QUESTIONS[step]}</Text>
            <Text style={s.qHint}>지난 2주 동안 얼마나 자주 경험하셨습니까?</Text>
            <View style={s.optList}>
              {OPTS.map(opt => {
                const isSel = selectedVal === opt.value || answersRef.current[`q${step + 1}`] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.optBtn, isSel && s.optBtnSel]}
                    onPress={() => handleAnswer(opt.value)}
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
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  backIcon:     { color: C.text, fontSize: 16, fontWeight: '600' },
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
  optList: { gap: 8 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
  },
  optBtnSel:   { borderColor: C.olive, backgroundColor: C.oliveFaded },
  optDot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optDotSel:   { borderColor: C.olive },
  optDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.olive },
  optLabel:    { flex: 1, color: C.text, fontSize: 14, lineHeight: 20 },
  optLabelSel: { color: C.olive, fontWeight: '600' },
  // Done screen
  doneContent: { padding: 24, paddingBottom: 60, alignItems: 'center' },
  doneTitle:   { color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  doneSub:     { color: C.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24 },
  scoreBox:    { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  scoreNum:    { color: C.text, fontSize: 56, fontWeight: '800', lineHeight: 60 },
  scoreMax:    { color: C.textMuted, fontSize: 16 },
  levelBadge:  { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 12 },
  levelText:   { fontSize: 15, fontWeight: '700' },
  levelDesc:   { color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 8 },
  guideBox: {
    width: '100%', backgroundColor: C.card, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  guideTitle: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  guideRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  guideRange: { color: C.textMuted, fontSize: 13 },
  guideLabel: { fontSize: 13, fontWeight: '700' },
  disclaimer: { color: C.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: 20, paddingHorizontal: 8 },
  doneBtn: {
    width: '100%', backgroundColor: C.card, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  doneBtnText: { color: C.olive, fontSize: 15, fontWeight: '700' },
});
