import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';

// ── Survey catalogue ───────────────────────────────────────────────────────────
const SURVEYS = [
  {
    id: 'survey1', route: '/(surveys)/survey1',
    eyebrow: 'Survey 1', title: '기분·불안·수면 평가',
    desc: '우울(CES-D) · 불안(BAI) · 기분고양(HCL-32) · 수면(PSQI) · 자살사고(C-SSRS)',
    icon: '😔', color: '#5D7F9A', time: '20–30분',
  },
  {
    id: 'survey2', route: '/(surveys)/survey2',
    eyebrow: 'Survey 2', title: '음주·신체·PMS 평가',
    desc: '음주(AUDIT) · 신체증상(PHQ-15) · 월경전증상(PSST)',
    icon: '💊', color: '#9BAD80', time: '10–15분',
  },
  {
    id: 'survey3', route: '/(surveys)/survey3',
    eyebrow: 'Survey 3', title: '강박·공황·식이 평가',
    desc: '강박(OCI-R-K) · 공황(PDSS-SR) · 식이(SCOFF)',
    icon: '🧠', color: '#C4956A', time: '10–15분',
  },
  {
    id: 'survey4', route: '/(surveys)/survey4',
    eyebrow: 'Survey 4', title: '주의집중·대인관계 평가',
    desc: '주의집중력(ASRS) · 대인관계 민감성(IPS)',
    icon: '🎯', color: '#7A6FA8', time: '10–15분',
  },
  {
    id: 'survey5', route: '/(surveys)/survey5',
    eyebrow: 'Survey 5', title: '기질·성격·회복탄력성',
    desc: '기질(TEMPS-A) · 성격병리(PID-5-BF) · 회복탄력성(CD-RISC)',
    icon: '♟️', color: '#9BAD80', time: '15–20분',
  },
  {
    id: 'survey6', route: '/(surveys)/survey6',
    eyebrow: 'Survey 6', title: '방어기제 평가 (DSQ-60)',
    desc: '방어기제 유형 및 성숙도 평가 · 60문항 9점 척도',
    icon: '🛡️', color: '#B86868', time: '15–20분',
  },
  {
    id: 'survey7', route: '/(surveys)/survey7',
    eyebrow: 'Survey 7', title: '간이 성격 검사 (BFI-44)',
    desc: '빅파이브 성격 검사 · 외향성·친화성·성실성·신경증·개방성',
    icon: '🦋', color: '#7A6FA8', time: '5–8분',
  },
  {
    id: 'survey8', route: '/(surveys)/survey8',
    eyebrow: 'Survey 8', title: '아동기 외상·ADHD 성향',
    desc: '아동기 외상(CTQ-SF) · 아동기 ADHD 성향(WURS-25)',
    icon: '🕰️', color: '#C4956A', time: '10–15분',
  },
  {
    id: 'diva', route: '/(surveys)/diva',
    eyebrow: 'DIVA', title: '성인 ADHD 사전 평가',
    desc: 'ASRS 선별 · 성인기/아동기 주의집중·과잉행동 (DSM-5) · 발달력',
    icon: '🧩', color: '#1A5FA8', time: '15–20분',
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function QMain() {
  const db = useSQLiteContext();
  const [doneSurveys, setDoneSurveys] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const rows = await db.getAllAsync<{ type: string }>(
            `SELECT DISTINCT type FROM AssessmentLogs WHERE type LIKE 'survey%'`
          );
          setDoneSurveys(new Set(rows.map(r => r.type)));
        } catch {
          setDoneSurveys(new Set());
        }
      })();
    }, [db])
  );

  const doneCount = doneSurveys.size;
  const progressPct = (doneCount / SURVEYS.length) * 100;

  const handleCardPress = (s: (typeof SURVEYS)[number]) => {
    if (s.route) {
      router.push(s.route as any);
    }
    // surveys without a route show nothing (card disabled)
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.topBarText}>
          <Text style={s.topTitle}>정신건강의학과 심리검사</Text>
          <Text style={s.topSub}>
            {doneCount === 0
              ? '검사를 선택하여 진행하세요'
              : doneCount === SURVEYS.length
              ? '모든 검사가 완료되었습니다 🎉'
              : `${SURVEYS.length - doneCount}개 검사가 남아있습니다`}
          </Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress card */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>전체 진행률</Text>
            <Text style={s.progressCount}>
              <Text style={s.progressNum}>{doneCount}</Text>
              {' / '}{SURVEYS.length} 완료
            </Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* Survey cards */}
        <Text style={s.sectionLabel}>사전 설문 (Survey 1–8 + DIVA)</Text>
        {SURVEYS.map((survey) => {
          const isDone = doneSurveys.has(survey.id);
          const isAvailable = !!survey.route;
          return (
            <TouchableOpacity
              key={survey.id}
              style={[s.card, isDone && s.cardDone, !isAvailable && s.cardDisabled]}
              onPress={() => !isDone && handleCardPress(survey)}
              activeOpacity={isAvailable ? 0.75 : 1}
            >
              {isDone && <View style={s.doneBar} />}
              <View style={s.cardInner}>
                <View style={[s.iconWrap, { backgroundColor: survey.color + '25' }]}>
                  <Text style={s.cardIcon}>{survey.icon}</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={[s.cardEyebrow, { color: survey.color }]}>{survey.eyebrow}</Text>
                  <Text style={s.cardTitle}>{survey.title}</Text>
                  <Text style={s.cardDesc} numberOfLines={1}>{survey.desc}</Text>
                </View>
                <View style={s.cardStatus}>
                  <View style={[
                    s.statusBadge,
                    isDone ? s.badgeDone : isAvailable ? s.badgePending : s.badgeSoon,
                  ]}>
                    <Text style={[
                      s.statusText,
                      isDone ? s.statusTextDone : isAvailable ? s.statusTextPending : s.statusTextSoon,
                    ]}>
                      {isDone ? '✓ 완료' : isAvailable ? survey.time : '준비 중'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Disclaimer */}
        <View style={s.note}>
          <Text style={s.noteText}>
            완료한 검사는 이 화면에서 다시 확인할 수 있습니다.{'\n'}
            각 검사는 진단이 아닌 <Text style={s.noteStrong}>선별 목적</Text>의 참고 자료입니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: C.text, fontSize: 16, fontWeight: '600' },
  topBarText: { flex: 1 },
  topTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  topSub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Progress
  progressCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  progressCount: { color: C.textMuted, fontSize: 12 },
  progressNum: { color: C.olive, fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.olive, borderRadius: 3 },

  // Section label
  sectionLabel: {
    color: C.textMuted, fontSize: 10.5, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2,
  },

  // Cards
  card: {
    backgroundColor: C.card, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardDone: { opacity: 0.75 },
  cardDisabled: { opacity: 0.5 },
  doneBar: { height: 3, backgroundColor: C.olive, width: '100%' },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 22 },
  cardBody: { flex: 1, minWidth: 0 },
  cardEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  cardTitle: { color: C.text, fontSize: 14.5, fontWeight: '700', marginBottom: 3 },
  cardDesc: { color: C.textMuted, fontSize: 11, lineHeight: 16 },
  cardStatus: {},
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeDone: { backgroundColor: C.oliveFaded },
  badgePending: { backgroundColor: C.card + 'aa', borderWidth: 1, borderColor: C.border },
  badgeSoon: { backgroundColor: C.card + 'aa', borderWidth: 1, borderColor: C.border },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextDone: { color: C.olive },
  statusTextPending: { color: C.textMuted },
  statusTextSoon: { color: C.dim },

  // Note
  note: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  noteText: { color: C.textMuted, fontSize: 12, lineHeight: 18 },
  noteStrong: { color: C.text, fontWeight: '600' },
});
