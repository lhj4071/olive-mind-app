import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { T } from '../styles/theme';
import { Card, FadeInView } from './DS';
import {
  DRUG_INFO_PARTS,
  DrugInfoPart,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getPartIdsForClasses,
} from '../constants/drugInfo';
import DrugInfoDetail from './DrugInfoDetail';

interface Props {
  prescribedDrugClasses?: string[];
}

export default function DrugInfoBrowser({ prescribedDrugClasses }: Props) {
  const { width } = useWindowDimensions();

  const [activeCategory, setActiveCategory] = useState<'understand' | 'drug_type' | 'practical'>(
    CATEGORY_ORDER[0],
  );
  const [displayedPart, setDisplayedPart] = useState<DrugInfoPart | null>(null);
  const slideX = useSharedValue(width);

  const recommendedPartIds = useMemo(() => {
    if (!prescribedDrugClasses || prescribedDrugClasses.length === 0) return new Set<string>();
    return getPartIdsForClasses(prescribedDrugClasses);
  }, [prescribedDrugClasses]);

  const recommendedParts = useMemo(
    () => DRUG_INFO_PARTS.filter(p => recommendedPartIds.has(p.id)),
    [recommendedPartIds],
  );

  const listData = useMemo(
    () => DRUG_INFO_PARTS.filter(p => p.category === activeCategory),
    [activeCategory],
  );

  const handleSelect = useCallback((part: DrugInfoPart) => {
    setDisplayedPart(part);
    slideX.value = width;
    slideX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [width, slideX]);

  const handleBack = useCallback(() => {
    slideX.value = withTiming(width, { duration: 280, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(setDisplayedPart)(null);
    });
  }, [width, slideX]);

  const detailAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const renderPart: ListRenderItem<DrugInfoPart> = useCallback(({ item }) => {
    const count = item.sections.length + item.misconceptions.length + item.faqItems.length;
    return (
      <TouchableOpacity onPress={() => handleSelect(item)} activeOpacity={0.75}>
        <Card style={s.partCard}>
          <View style={s.partRow}>
            <Text style={s.partEmoji}>{item.emoji}</Text>
            <View style={s.partText}>
              <Text style={s.partTitle}>{item.title}</Text>
              <Text style={s.partSubtitle} numberOfLines={2}>{item.subtitle}</Text>
            </View>
            <View style={s.partBadge}>
              <Text style={s.partBadgeText}>{count}개</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [handleSelect]);

  const ListHeader = useMemo(() => {
    if (recommendedParts.length === 0) return null;
    return (
      <View style={s.banner}>
        <Text style={s.bannerLabel}>💊 처방받으신 약과 관련된 항목</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.bannerScroll}
        >
          {recommendedParts.map(part => (
            <TouchableOpacity
              key={part.id}
              onPress={() => handleSelect(part)}
              activeOpacity={0.75}
              style={s.bannerChip}
            >
              <Text style={s.bannerChipEmoji}>{part.emoji}</Text>
              <Text style={s.bannerChipText} numberOfLines={2}>{part.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }, [recommendedParts, handleSelect]);

  return (
    <View style={s.root}>
      {/* Background: category tabs + part list */}
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
          data={listData}
          keyExtractor={item => item.id}
          renderItem={renderPart}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={ListHeader}
        />
      </FadeInView>

      {/* Detail overlay — slides in from right */}
      {displayedPart && (
        <Animated.View style={[StyleSheet.absoluteFill, s.detailLayer, detailAnim]}>
          <DrugInfoDetail part={displayedPart} onBack={handleBack} />
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  tabScroll: {
    flexGrow:          0,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  tabContent: {
    paddingHorizontal: T.space.md,
    paddingVertical:   T.space.sm + 2,
    gap:               T.space.sm,
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
  partCard:    { marginBottom: T.space.sm + 2 },
  partRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           T.space.sm + 2,
  },
  partEmoji:   { fontSize: 24, lineHeight: 30 },
  partText:    { flex: 1 },
  partTitle: {
    ...T.typo.h3,
    color:        T.colors.text,
    marginBottom: 3,
  },
  partSubtitle: {
    ...T.typo.small,
    color:      T.colors.textMuted,
    lineHeight: 19,
  },
  partBadge: {
    backgroundColor:   T.colors.oliveFaded,
    borderRadius:      T.radius.round,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  partBadgeText: {
    ...T.typo.label,
    color: T.colors.olive,
  },
  arrow: {
    fontSize:   20,
    color:      T.colors.textMuted,
    fontWeight: '300',
  },
  banner: {
    backgroundColor: T.colors.card,
    borderRadius:    T.radius.md,
    borderWidth:     0.5,
    borderColor:     T.colors.oliveDark,
    padding:         T.space.md,
    marginBottom:    T.space.md,
  },
  bannerLabel: {
    ...T.typo.label,
    color:         T.colors.olive,
    letterSpacing: 0.4,
    marginBottom:  T.space.sm,
  },
  bannerScroll: {
    gap: T.space.sm,
  },
  bannerChip: {
    backgroundColor:   T.colors.oliveFaded,
    borderRadius:      T.radius.sm,
    borderWidth:       0.5,
    borderColor:       T.colors.oliveDark,
    padding:           T.space.sm + 2,
    alignItems:        'center',
    width:             86,
    gap:               T.space.xs,
  },
  bannerChipEmoji: { fontSize: 22, lineHeight: 28 },
  bannerChipText: {
    ...T.typo.label,
    color:      T.colors.olive,
    textAlign:  'center',
    lineHeight: 16,
  },
  detailLayer: {
    backgroundColor: T.colors.bg,
  },
});
