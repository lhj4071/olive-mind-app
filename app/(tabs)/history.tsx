import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Calendar } from 'lucide-react-native';
import { DB } from '../../src/constants/drugs';

const C = {
  bg:         '#F7F4EE',
  card:       '#FFFFFF',
  olive:      '#7C8C5E',
  oliveDark:  '#5E6E44',
  oliveFaded: '#EBF0E2',
  warmGray:   '#8B8680',
  text:       '#3D3B38',
  textMuted:  '#9B9896',
  border:     '#E8E4DF',
} as const;

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

interface DayGroup {
  date: string;
  label: string;
  moodLog: MoodLogRow | null;
  seLogs: SELogRow[];
}

type SliderValues = {
  mood: number;
  anxiety: number;
  irritability: number;
  sleep: number;
};

const SLIDER_META = [
  { key: 'mood',         emoji: '😊', label: '기분',   color: '#7C8C5E' },
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

function formatDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
  }
  return dateStr;
}

function parseScore(scoreStr: string): Partial<SliderValues> {
  try { return JSON.parse(scoreStr); } catch { return {}; }
}

function parseTags(tagsStr: string | null): string[] {
  try { return JSON.parse(tagsStr ?? '[]'); } catch { return []; }
}

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const moodRows = await db.getAllAsync<MoodLogRow>(
      'SELECT * FROM MoodLogs ORDER BY date DESC'
    );
    const seRows = await db.getAllAsync<SELogRow>(
      'SELECT * FROM SideEffectLogs ORDER BY date DESC, id DESC'
    );

    const moodByDate = new Map<string, MoodLogRow>();
    moodRows.forEach(r => moodByDate.set(r.date, r));

    const seByDate = new Map<string, SELogRow[]>();
    seRows.forEach(r => {
      const bucket = seByDate.get(r.date) ?? [];
      bucket.push(r);
      seByDate.set(r.date, bucket);
    });

    const allDates = [
      ...new Set([...moodRows.map(r => r.date), ...seRows.map(r => r.date)]),
    ].sort((a, b) => b.localeCompare(a));

    setGroups(
      allDates.map(date => ({
        date,
        label: formatDate(date),
        moodLog: moodByDate.get(date) ?? null,
        seLogs: seByDate.get(date) ?? [],
      }))
    );
  }, [db]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>기록 모아보기</Text>
        <Text style={s.headerSub}>나의 마음 변화를 살펴보세요</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, groups.length === 0 && s.contentEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.olive} />
        }
      >
        {groups.length === 0 ? (
          <View style={s.emptyState}>
            <Calendar size={52} color={C.border} />
            <Text style={s.emptyTitle}>아직 기록이 없어요</Text>
            <Text style={s.emptyDesc}>
              홈 화면에서 오늘의 상태를 기록하면{'\n'}이곳에서 모아볼 수 있어요.
            </Text>
          </View>
        ) : (
          groups.map(group => {
            const scores = group.moodLog ? parseScore(group.moodLog.score) : null;
            const tags = group.moodLog ? parseTags(group.moodLog.tags) : [];

            return (
              <View key={group.date} style={s.dayGroup}>
                {/* 날짜 헤더 */}
                <View style={s.dateHeader}>
                  <View style={s.dateDot} />
                  <Text style={s.dateLabel}>{group.label}</Text>
                </View>

                {/* 기분 기록 카드 */}
                {group.moodLog && scores && (
                  <View style={s.card}>
                    <Text style={s.cardSection}>오늘의 상태</Text>

                    <View style={s.scoreGrid}>
                      {SLIDER_META.map(m => {
                        const val = scores[m.key as keyof SliderValues];
                        if (val === undefined) return null;
                        return (
                          <View key={m.key} style={s.scoreItem}>
                            <Text style={s.scoreEmoji}>{m.emoji}</Text>
                            <Text style={s.scoreLabel}>{m.label}</Text>
                            <View style={[s.scoreBadge, { backgroundColor: m.color + '22' }]}>
                              <Text style={[s.scoreBadgeText, { color: m.color }]}>{val}점</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {tags.length > 0 && (
                      <View style={s.tagRow}>
                        {tags.map(id => (
                          <View key={id} style={s.tagChip}>
                            <Text style={s.tagChipText}>
                              {EMOTION_TAG_MAP[id] ?? id}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {group.moodLog.memo ? (
                      <View style={s.memoDivider}>
                        <Text style={s.memoText}>{group.moodLog.memo}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* 부작용 기록 카드 */}
                {group.seLogs.length > 0 && (
                  <View style={s.card}>
                    <Text style={s.cardSection}>부작용 기록</Text>
                    {group.seLogs.map((log, idx) => {
                      const drug = DB.find(x => x.id === log.medId);
                      const isLast = idx === group.seLogs.length - 1;
                      return (
                        <View key={log.id} style={[s.seEntry, isLast && s.seEntryLast]}>
                          <View style={s.seBadge}>
                            <Text style={s.seBadgeText}>{log.se || '기타'}</Text>
                          </View>
                          <View style={s.seBody}>
                            <Text style={s.seDrug}>{drug?.name ?? log.medId}</Text>
                            {log.memo ? (
                              <Text style={s.seMemo}>{log.memo}</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  headerSub: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.textMuted,
    marginTop: 18,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  dayGroup: {
    marginBottom: 28,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.olive,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.olive,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSection: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '48%',
  },
  scoreEmoji: {
    fontSize: 16,
  },
  scoreLabel: {
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tagChip: {
    backgroundColor: C.oliveFaded,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontSize: 12,
    color: C.oliveDark,
    fontWeight: '500',
  },
  memoDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  memoText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
  },
  seEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  seEntryLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  seBadge: {
    backgroundColor: '#FAEEDA',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  seBadgeText: {
    fontSize: 12,
    color: '#854F0B',
    fontWeight: '500',
  },
  seBody: {
    flex: 1,
  },
  seDrug: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  seMemo: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
});
