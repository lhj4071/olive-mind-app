import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { BarChart2 } from 'lucide-react-native';
import { DB } from '../../src/constants/drugs';
import { C } from '../../src/styles/theme';
import { FadeInView } from '../../src/components/DS';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDER_META = [
  { key: 'mood',         emoji: '😊', label: '기분',   color: '#A8B58F' },
  { key: 'anxiety',      emoji: '😰', label: '불안',   color: '#C4956A' },
  { key: 'irritability', emoji: '😤', label: '예민도', color: '#A08260' },
  { key: 'sleep',        emoji: '😴', label: '수면',   color: '#6A8CA0' },
] as const;

const EMOTION_TAG_MAP: Record<string, string> = {
  calm: '#평온함', happy: '#기쁨', depressed: '#우울함', anxious: '#불안함',
  angry: '#화남', tired: '#피곤함', hopeful: '#희망적', lonely: '#외로움',
  grateful: '#감사함', confused: '#혼란스러움', irritable: '#예민함',
  numb: '#무감각', excited: '#설렘', stable: '#안정적',
};

const CHART_CONFIG = {
  backgroundColor:               C.card,
  backgroundGradientFrom:        C.card,
  backgroundGradientTo:          C.bg,
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity:   1,
  decimalPlaces:                 0,
  color:      (opacity = 1) => `rgba(155, 173, 128, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(138, 147, 134, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: C.olive },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke:          C.border,
    strokeWidth:     0.5,
  },
};

interface MoodLogRow {
  id: number;
  date: string;
  score: string;
  tags: string | null;
  memo: string | null;
}

interface SELogRow {
  id: number;
  medId: string;
  se: string | null;
  date: string;
  memo: string | null;
}

type SliderValues = { mood?: number; anxiety?: number; irritability?: number; sleep?: number };

interface DayGroup {
  dateKey: string;
  label:   string;
  moodLog: MoodLogRow | null;
  seLogs:  SELogRow[];
}

function getLast7Days(): string[] {
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function formatDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
  }
  return dateStr;
}

function parseScores(raw: string): SliderValues {
  try {
    const p = JSON.parse(raw);
    if (typeof p === 'object' && p !== null) return p as SliderValues;
    if (typeof p === 'number') return { mood: p };
  } catch { /* noop */ }
  const n = Number(raw);
  return isNaN(n) ? {} : { mood: n };
}

function parseTags(raw: string | null): string[] {
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}

function getTopTags(logs: MoodLogRow[], n: number): { id: string; count: number }[] {
  const counter: Record<string, number> = {};
  logs.forEach(log =>
    parseTags(log.tags).forEach(t => { counter[t] = (counter[t] ?? 0) + 1; })
  );
  return Object.entries(counter)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export default function SummaryScreen() {
  const db = useSQLiteContext();

  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [hasChartData, setHasChartData] = useState(false);
  const [chartLabels,  setChartLabels]  = useState<string[]>([]);
  const [moodData,     setMoodData]     = useState<number[]>([]);
  const [anxietyData,  setAnxietyData]  = useState<number[]>([]);
  const [topTags,      setTopTags]      = useState<{ id: string; count: number }[]>([]);
  const [groups,       setGroups]       = useState<DayGroup[]>([]);

  const loadData = useCallback(async () => {
    const days   = getLast7Days();
    const oldest = days[0];

    const recentLogs = await db.getAllAsync<MoodLogRow>(
      'SELECT * FROM MoodLogs WHERE date >= ? ORDER BY date ASC',
      [oldest]
    );

    const moodByDate = new Map<string, number>();
    const anxByDate  = new Map<string, number>();
    recentLogs.forEach(r => {
      const sc = parseScores(r.score);
      if (sc.mood    !== undefined) moodByDate.set(r.date, sc.mood);
      if (sc.anxiety !== undefined) anxByDate.set(r.date,  sc.anxiety);
    });

    setChartLabels(days.map(shortLabel));
    setMoodData(days.map(d    => moodByDate.get(d) ?? 0));
    setAnxietyData(days.map(d => anxByDate.get(d)  ?? 0));
    setHasChartData(recentLogs.length > 0);
    setTopTags(getTopTags(recentLogs, 3));

    const allMoods = await db.getAllAsync<MoodLogRow>(
      'SELECT * FROM MoodLogs ORDER BY date DESC'
    );
    const allSes = await db.getAllAsync<SELogRow>(
      'SELECT * FROM SideEffectLogs ORDER BY date DESC, id DESC'
    );

    const moodByDateAll = new Map<string, MoodLogRow>();
    allMoods.forEach(r => moodByDateAll.set(r.date, r));

    const seByDate = new Map<string, SELogRow[]>();
    allSes.forEach(r => {
      const bucket = seByDate.get(r.date) ?? [];
      bucket.push(r);
      seByDate.set(r.date, bucket);
    });

    const allDates = [
      ...new Set([...allMoods.map(r => r.date), ...allSes.map(r => r.date)]),
    ].sort((a, b) => b.localeCompare(a));

    setGroups(
      allDates.map(dateKey => ({
        dateKey,
        label:   formatDate(dateKey),
        moodLog: moodByDateAll.get(dateKey) ?? null,
        seLogs:  seByDate.get(dateKey) ?? [],
      }))
    );
  }, [db]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.olive} />
        </View>
      </SafeAreaView>
    );
  }

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data:        moodData,
        color:       (opacity = 1) => `rgba(168, 181, 143, ${opacity})`,
        strokeWidth: 2.5,
      },
      {
        data:        anxietyData,
        color:       (opacity = 1) => `rgba(196, 149, 106, ${opacity})`,
        strokeWidth: 2.5,
      },
    ],
    legend: ['기분', '불안'],
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>주간 요약</Text>
        <Text style={s.pageSub}>최근 7일 마음 변화를 살펴보세요</Text>
      </View>

      <FadeInView style={{ flex: 1 }}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.olive} />
        }
      >
        {/* ── 꺾은선 차트 ── */}
        <Text style={s.sectionTitle}>7일 상태 변화</Text>

        {hasChartData ? (
          <LinearGradient colors={['#3A5060', '#263848']} style={s.chartCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <LineChart
              data={chartData}
              width={SCREEN_W - 40}
              height={200}
              fromZero
              chartConfig={CHART_CONFIG}
              bezier
              withInnerLines
              withOuterLines={false}
              withShadow={false}
              style={s.chart}
            />
          </LinearGradient>
        ) : (
          <View style={[s.chartCard, s.emptyChart]}>
            <BarChart2 size={36} color={C.border} />
            <Text style={s.emptyChartText}>
              7일 이내 기록이 없어요.{'\n'}홈 탭에서 기록을 시작해 보세요.
            </Text>
          </View>
        )}

        {/* ── TOP 3 감정 태그 ── */}
        <Text style={[s.sectionTitle, { marginTop: 28 }]}>자주 느낀 감정</Text>
        <View style={s.tagCard}>
          {topTags.length > 0 ? topTags.map((tag, idx) => (
            <View key={tag.id} style={[s.topTagRow, idx < topTags.length - 1 && s.topTagDivider]}>
              <Text style={s.topTagRank}>{idx + 1}</Text>
              <View style={s.topTagChip}>
                <Text style={s.topTagLabel}>{EMOTION_TAG_MAP[tag.id] ?? `#${tag.id}`}</Text>
              </View>
              <Text style={s.topTagCount}>{tag.count}회</Text>
            </View>
          )) : (
            <Text style={s.emptyText}>7일 이내 감정 태그 기록이 없어요.</Text>
          )}
        </View>

        {/* ── 기록 타임라인 ── */}
        {groups.length > 0 ? (
          <>
            <Text style={[s.sectionTitle, { marginTop: 28 }]}>기록 타임라인</Text>
            {groups.map((group, groupIdx) => {
              const isLast = groupIdx === groups.length - 1;
              const scores = group.moodLog ? parseScores(group.moodLog.score) : null;
              const tags   = group.moodLog ? parseTags(group.moodLog.tags)    : [];
              return (
                <View key={group.dateKey} style={s.timelineRow}>
                  <View style={s.timelineLeft}>
                    <View style={s.timelineDot} />
                    {!isLast && <View style={s.timelineLine} />}
                  </View>

                  <View style={s.timelineContent}>
                    <Text style={s.dateLabel}>{group.label}</Text>

                    {group.moodLog && scores && (
                      <View style={s.card}>
                        <Text style={s.cardLabel}>오늘의 상태</Text>
                        <View style={s.scoreGrid}>
                          {SLIDER_META.map(meta => {
                            const val = scores[meta.key as keyof SliderValues];
                            if (val === undefined) return null;
                            return (
                              <View key={meta.key} style={s.scoreItem}>
                                <Text style={s.scoreEmoji}>{meta.emoji}</Text>
                                <Text style={s.scoreItemLabel}>{meta.label}</Text>
                                <View style={[s.scoreBadge, { backgroundColor: meta.color + '33' }]}>
                                  <Text style={[s.scoreVal, { color: meta.color }]}>{val}점</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        {tags.length > 0 && (
                          <View style={s.tagRow}>
                            {tags.map(id => (
                              <View key={id} style={s.tagChip}>
                                <Text style={s.tagChipText}>{EMOTION_TAG_MAP[id] ?? `#${id}`}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {!!group.moodLog.memo && (
                          <View style={s.memoDivider}>
                            <Text style={s.memoText}>{group.moodLog.memo}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {group.seLogs.length > 0 && (
                      <View style={[s.card, s.seCard]}>
                        <Text style={s.cardLabel}>부작용 기록</Text>
                        {group.seLogs.map((log, idx2) => {
                          const drug  = DB.find(x => x.id === log.medId);
                          const isLst = idx2 === group.seLogs.length - 1;
                          return (
                            <View key={log.id} style={[s.seEntry, isLst && s.seEntryLast]}>
                              {!!log.se && (
                                <View style={s.seBadge}>
                                  <Text style={s.seBadgeText}>{log.se}</Text>
                                </View>
                              )}
                              <View style={s.seBody}>
                                <Text style={s.seDrug}>{drug?.name ?? log.medId}</Text>
                                {!!log.memo && <Text style={s.seMemo}>{log.memo}</Text>}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={{ height: 20 }} />
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <View style={s.emptyState}>
            <BarChart2 size={52} color={C.border} />
            <Text style={s.emptyTitle}>아직 기록이 없어요</Text>
            <Text style={s.emptyDesc}>
              홈 화면에서 오늘의 상태를 기록하면{'\n'}이곳에서 요약을 볼 수 있어요.
            </Text>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
      </FadeInView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },

  pageHeader: {
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     16,
    backgroundColor:   C.card,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  pageTitle: { fontSize: 18, fontWeight: '500', color: C.text, letterSpacing: -0.2 },
  pageSub:   { fontSize: 13, color: C.textMuted, marginTop: 3, lineHeight: 19 },

  sectionTitle: { fontSize: 14, fontWeight: '500', color: C.text, marginBottom: 12, letterSpacing: -0.1 },

  chartCard: {
    borderRadius:    26,
    paddingVertical: 12,
    paddingLeft:     4,
    paddingRight:    12,
    marginBottom:    10,
    overflow:        'hidden',
  },
  chart: { borderRadius: 12 },
  emptyChart: {
    backgroundColor: C.card,
    borderRadius:    26,
    borderWidth:     0.5,
    borderColor:     C.border,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 44,
    gap:             14,
    paddingLeft:     12,
  },
  emptyChartText: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 21 },

  tagCard: {
    backgroundColor:   C.card,
    borderRadius:      26,
    borderWidth:       0.5,
    borderColor:       C.border,
    paddingHorizontal: 18,
    paddingTop:        10,
    paddingBottom:     10,
  },
  topTagRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 12,
  },
  topTagDivider: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  topTagRank:    { fontSize: 18, fontWeight: '600', color: C.olive, width: 22, textAlign: 'center' },
  topTagChip: {
    flex:              1,
    backgroundColor:   C.oliveFaded,
    borderRadius:      22,
    paddingHorizontal: 14,
    paddingVertical:   7,
  },
  topTagLabel: { fontSize: 14, color: C.olive, fontWeight: '500' },
  topTagCount: { fontSize: 13, color: C.textMuted, fontWeight: '400' },
  emptyText:   { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 14, lineHeight: 20 },

  timelineRow:     { flexDirection: 'row' },
  timelineLeft:    { width: 32, alignItems: 'center' },
  timelineDot: {
    width:           12,
    height:          12,
    borderRadius:    6,
    backgroundColor: C.olive,
    marginTop:       3,
    zIndex:          1,
  },
  timelineLine: {
    flex:            1,
    width:           2,
    backgroundColor: C.border,
    marginTop:       4,
  },
  timelineContent: { flex: 1 },
  dateLabel: {
    fontSize:      13,
    fontWeight:    '500',
    color:         C.olive,
    marginBottom:  10,
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: C.card,
    borderRadius:    20,
    borderWidth:     0.5,
    borderColor:     C.border,
    padding:         18,
    marginBottom:    10,
  },
  seCard:    { borderLeftWidth: 2.5, borderLeftColor: '#9A7248' },
  cardLabel: {
    fontSize:      11,
    fontWeight:    '500',
    color:         C.textMuted,
    letterSpacing: 0.7,
    marginBottom:  12,
    textTransform: 'uppercase',
  },

  scoreGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  scoreItem:      { flexDirection: 'row', alignItems: 'center', gap: 5, width: '48%' },
  scoreEmoji:     { fontSize: 15 },
  scoreItemLabel: { fontSize: 13, color: C.text, flex: 1, lineHeight: 20 },
  scoreBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  scoreVal:       { fontSize: 13, fontWeight: '600' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    backgroundColor:   C.oliveFaded,
    borderRadius:      22,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  tagChipText: { fontSize: 12, color: C.olive, fontWeight: '400' },

  memoDivider: {
    marginTop:      14,
    paddingTop:     14,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  memoText: { fontSize: 14, color: C.text, lineHeight: 23 },

  seEntry: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               10,
    paddingVertical:   10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  seEntryLast: { borderBottomWidth: 0, paddingBottom: 0 },
  seBadge: {
    backgroundColor:   '#2A1E00',
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
    flexShrink:        0,
  },
  seBadgeText: { fontSize: 12, color: '#A07848', fontWeight: '500' },
  seBody:      { flex: 1 },
  seDrug:      { fontSize: 13, fontWeight: '500', color: C.text },
  seMemo:      { fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: C.textMuted, marginTop: 18, marginBottom: 10 },
  emptyDesc:  { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 23 },
});
