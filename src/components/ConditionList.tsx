import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { T } from '../styles/theme';
import { Card, FadeInView } from './DS';
import { CONDITIONS, ConditionRecord, CATEGORY_LABELS, CATEGORY_ORDER } from '../constants/conditions';

interface Props {
  onSelect: (condition: ConditionRecord) => void;
}

export default function ConditionList({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);

  const filtered = CONDITIONS.filter(c => c.category === activeCategory);

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabScroll}
        contentContainerStyle={s.tabContent}
      >
        {CATEGORY_ORDER.map(cat => {
          const active = cat === activeCategory;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[s.tab, active && s.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />
    </FadeInView>
  );
}

const s = StyleSheet.create({
  tabScroll: {
    flexGrow: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  tabContent: {
    paddingHorizontal: T.space.md,
    paddingVertical:   T.space.sm + 2,
    gap: T.space.sm,
  },
  tab: {
    paddingHorizontal: T.space.md,
    paddingVertical:   T.space.xs + 2,
    borderRadius:      T.radius.round,
    backgroundColor:   T.colors.card,
    borderWidth:       0.5,
    borderColor:       T.colors.border,
  },
  tabActive: {
    backgroundColor: T.colors.oliveFaded,
    borderColor:     T.colors.oliveDark,
  },
  tabText: {
    ...T.typo.small,
    color:      T.colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color:      T.colors.olive,
    fontWeight: '600',
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
});
