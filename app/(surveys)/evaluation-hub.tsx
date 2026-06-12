import React, { useCallback, useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';

const ITEMS = [
  {
    id: 'PHQ9',
    route: '/(surveys)/phq9',
    icon: '😔',
    color: C.phq9,
    eyebrow: '2–3분',
    title: '우울증 검사 (PHQ-9)',
    desc: '나의 우울 정도를 파악해 보세요',
    detail: '9문항 · 지난 2주간 경험 빈도',
  },
  {
    id: 'GAD7',
    route: '/(surveys)/gad7',
    icon: '😰',
    color: C.gad7,
    eyebrow: '2분',
    title: '불안증 검사 (GAD-7)',
    desc: '나의 불안 수준을 점검해 보세요',
    detail: '7문항 · 지난 2주간 경험 빈도',
  },
  {
    id: 'diva',
    route: '/(surveys)/diva',
    icon: '🧩',
    color: '#1A5FA8',
    eyebrow: '15–20분',
    title: '성인 ADHD 검사 (DIVA-5)',
    desc: 'ADHD 관련 증상을 종합적으로 평가해요',
    detail: 'ASRS 선별 · 성인/아동기 증상 · DSM-5 기준',
  },
  {
    id: 'survey_suite',
    route: '/(surveys)/qmain',
    icon: '📋',
    color: '#7A6FA8',
    eyebrow: '60–90분',
    title: '종합 심리검사',
    desc: '8종의 정밀 심리검사를 진행해요',
    detail: 'CES-D · BAI · CTQ-SF · BFI-44 · DSQ-60 외',
  },
] as const;

export default function EvaluationHub() {
  const db = useSQLiteContext();
  const [doneSets, setDoneSets] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const rows = await db.getAllAsync<{ type: string }>(
            `SELECT DISTINCT type FROM AssessmentLogs WHERE type IN ('PHQ9','GAD7','diva')`
          );
          setDoneSets(new Set(rows.map(r => r.type)));
        } catch {
          setDoneSets(new Set());
        }
      })();
    }, [db])
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.topBarText}>
          <Text style={s.topTitle}>정밀 평가</Text>
          <Text style={s.topSub}>검사를 선택하여 진행하세요</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionLabel}>검사 목록</Text>

        {ITEMS.map(item => {
          const isDone = doneSets.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.card, isDone && s.cardDone]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              {isDone && <View style={s.doneBar} />}
              <View style={s.cardInner}>
                <View style={[s.iconWrap, { backgroundColor: item.color + '28' }]}>
                  <Text style={s.cardIcon}>{item.icon}</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={[s.cardEyebrow, { color: item.color }]}>{item.eyebrow}</Text>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardDesc}>{item.desc}</Text>
                  <Text style={s.cardDetail}>{item.detail}</Text>
                </View>
                <View style={s.cardRight}>
                  {isDone ? (
                    <View style={s.badgeDone}>
                      <Text style={s.badgeDoneText}>✓ 완료</Text>
                    </View>
                  ) : (
                    <Text style={[s.arrow, { color: item.color }]}>›</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={s.note}>
          <Text style={s.noteText}>
            각 검사는 진단이 아닌{' '}
            <Text style={s.noteStrong}>선별 목적</Text>의 참고 자료입니다.{'\n'}
            완료한 검사는 초록색 바로 표시됩니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  backIcon:   { color: C.text, fontSize: 16, fontWeight: '600' },
  topBarText: { flex: 1 },
  topTitle:   { color: C.text, fontSize: 14, fontWeight: '700' },
  topSub:     { color: C.textMuted, fontSize: 11, marginTop: 1 },
  scroll:     { flex: 1 },
  content:    { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    color: C.textMuted, fontSize: 10.5, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 2,
  },
  card: {
    backgroundColor: C.card, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardDone:  { opacity: 0.78 },
  doneBar:   { height: 3, backgroundColor: C.olive, width: '100%' },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  iconWrap:  { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardIcon:  { fontSize: 26 },
  cardBody:  { flex: 1, minWidth: 0 },
  cardEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, marginBottom: 3 },
  cardTitle:   { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc:    { color: C.textMuted, fontSize: 12.5, lineHeight: 18, marginBottom: 3 },
  cardDetail:  { color: C.dim, fontSize: 11, lineHeight: 16 },
  cardRight:   { alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  badgeDone:   { backgroundColor: C.oliveFaded, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDoneText: { color: C.olive, fontSize: 12, fontWeight: '700' },
  arrow: { fontSize: 26, lineHeight: 30 },
  note: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  noteText:   { color: C.textMuted, fontSize: 12, lineHeight: 18 },
  noteStrong: { color: C.text, fontWeight: '600' },
});
