import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { T } from '../styles/theme';
import { Card, FadeInView } from './DS';
import { CONDITIONS, ConditionRecord } from '../constants/conditions';

interface Props {
  onSelect: (condition: ConditionRecord) => void;
}

// Build reverse index once (module-level is fine — CONDITIONS is static)
const reverseIndex: Record<string, ConditionRecord[]> = {};
for (const cond of CONDITIONS) {
  for (const kw of cond.symptomKeywords) {
    const key = kw.toLowerCase();
    if (!reverseIndex[key]) reverseIndex[key] = [];
    reverseIndex[key].push(cond);
  }
}

export default function ConditionSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo<ConditionRecord[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matched = new Set<ConditionRecord>();

    for (const cond of CONDITIONS) {
      if (
        cond.title.toLowerCase().includes(q) ||
        cond.summary.toLowerCase().includes(q)
      ) {
        matched.add(cond);
      }
    }

    for (const [kw, conds] of Object.entries(reverseIndex)) {
      if (kw.includes(q)) {
        conds.forEach(c => matched.add(c));
      }
    }

    return [...matched];
  }, [query]);

  const renderItem: ListRenderItem<ConditionRecord> = useCallback(({ item }) => (
    <TouchableOpacity onPress={() => onSelect(item)} activeOpacity={0.75}>
      <Card style={s.card}>
        <View style={s.row}>
          <Text style={s.emoji}>{item.emoji}</Text>
          <View style={s.textBlock}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.summary} numberOfLines={2}>{item.summary}</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
  ), [onSelect]);

  return (
    <FadeInView style={{ flex: 1 }}>
      {/* Search input */}
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="증상 키워드로 검색 (예: 무기력, 공황, 불면)"
          placeholderTextColor={T.colors.dim}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {query.trim() === '' ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>증상 키워드를 입력해보세요</Text>
          <Text style={s.emptyDesc}>
            {'무기력, 공황, 불면, 집중 저하 등\n증상 단어를 입력하면 관련 질환이 나타납니다.'}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>😶</Text>
          <Text style={s.emptyTitle}>검색 결과가 없어요</Text>
          <Text style={s.emptyDesc}>다른 증상 키워드로 다시 시도해보세요.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </FadeInView>
  );
}

const s = StyleSheet.create({
  inputWrap: {
    paddingHorizontal: T.space.md,
    paddingVertical:   T.space.sm + 4,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  input: {
    height:            44,
    backgroundColor:   T.colors.cardRaised,
    borderRadius:      T.radius.sm,
    borderWidth:       0.5,
    borderColor:       T.colors.border,
    paddingHorizontal: T.space.md,
    ...T.typo.body,
    color:             T.colors.text,
  },
  listContent: {
    paddingHorizontal: T.space.md,
    paddingTop:        T.space.md,
    paddingBottom:     T.space.xl,
  },
  card: {
    marginBottom: T.space.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           T.space.sm + 2,
  },
  emoji: {
    fontSize:   26,
    lineHeight: 32,
  },
  textBlock: { flex: 1 },
  title: {
    ...T.typo.h3,
    color:        T.colors.text,
    marginBottom: 3,
  },
  summary: {
    ...T.typo.small,
    color:      T.colors.textMuted,
    lineHeight: 19,
  },
  arrow: {
    fontSize:   20,
    color:      T.colors.textMuted,
    fontWeight: '300',
  },
  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: T.space.xl,
    gap: T.space.sm,
  },
  emptyIcon: {
    fontSize:     36,
    lineHeight:   44,
    marginBottom: T.space.xs,
  },
  emptyTitle: {
    ...T.typo.h3,
    color:     T.colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    ...T.typo.small,
    color:      T.colors.textMuted,
    textAlign:  'center',
    lineHeight: 20,
  },
});
