import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { C, T } from '../../src/styles/theme';
import ConditionList from '../../src/components/ConditionList';
import ConditionSearch from '../../src/components/ConditionSearch';
import ConditionDetail from '../../src/components/ConditionDetail';
import { ConditionRecord } from '../../src/constants/conditions';

type Tab = 'list' | 'search';

export default function EduScreen() {
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab]                 = useState<Tab>('list');
  const [displayedCondition, setDisplayedCondition] = useState<ConditionRecord | null>(null);

  const slideX = useSharedValue(width);

  const handleSelect = useCallback((cond: ConditionRecord) => {
    setDisplayedCondition(cond);
    slideX.value = width;
    slideX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [width, slideX]);

  const handleBack = useCallback(() => {
    slideX.value = withTiming(width, { duration: 280, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(setDisplayedCondition)(null);
    });
  }, [width, slideX]);

  const detailAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.root}>
        {/* List / Search layer (always rendered, sits behind detail) */}
        <View style={StyleSheet.absoluteFill}>
          {/* Screen header */}
          <View style={s.header}>
            <View style={s.headerTop}>
              <Text style={s.brand}>🫒 올리브 마음 관리</Text>
              <Text style={s.headerTitle}>마음 길잡이</Text>
            </View>
            {/* Tab bar */}
            <View style={s.tabBar}>
              {(['list', 'search'] as Tab[]).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.tabBtnText, activeTab === tab && s.tabBtnTextActive]}>
                    {tab === 'list' ? '질환 목록' : '증상 검색'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Content */}
          <View style={s.content}>
            {activeTab === 'list'
              ? <ConditionList onSelect={handleSelect} />
              : <ConditionSearch onSelect={handleSelect} />
            }
          </View>
        </View>

        {/* Detail layer — slides in from right */}
        {displayedCondition && (
          <Animated.View style={[StyleSheet.absoluteFill, s.detailLayer, detailAnim]}>
            <ConditionDetail condition={displayedCondition} onBack={handleBack} />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: C.bg,
  },
  root: {
    flex:     1,
    overflow: 'hidden',
  },
  header: {
    backgroundColor:   C.card,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  headerTop: {
    paddingHorizontal: T.space.lg,
    paddingTop:        T.space.md + 2,
    paddingBottom:     T.space.sm,
  },
  brand: {
    ...T.typo.label,
    color:        C.olive,
    marginBottom: T.space.xs + 2,
  },
  headerTitle: {
    ...T.typo.h2,
    color: C.text,
  },
  tabBar: {
    flexDirection:     'row',
    paddingHorizontal: T.space.lg,
    paddingBottom:     T.space.sm + 2,
    gap:               T.space.sm,
  },
  tabBtn: {
    paddingHorizontal: T.space.md,
    paddingVertical:   T.space.xs + 2,
    borderRadius:      T.radius.round,
    backgroundColor:   T.colors.bg,
    borderWidth:       0.5,
    borderColor:       T.colors.border,
  },
  tabBtnActive: {
    backgroundColor: T.colors.oliveFaded,
    borderColor:     T.colors.oliveDark,
  },
  tabBtnText: {
    ...T.typo.small,
    color:      C.textMuted,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color:      C.olive,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  detailLayer: {
    backgroundColor: T.colors.bg,
  },
});
