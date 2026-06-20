// ── Olive Mind Design System Components ──────────────────────────────────────
// 재사용 가능한 기본 UI 빌딩 블록

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { T } from '../styles/theme';

// ── FadeInView ────────────────────────────────────────────────────────────────
// 화면/섹션 마운트 시 부드러운 페이드+슬라이드 인
interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  duration?: number;
  slideOffset?: number;
}

export const FadeInView = ({
  children,
  style,
  delay = 0,
  duration = 380,
  slideOffset = 10,
}: FadeInViewProps) => {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(slideOffset);

  useEffect(() => {
    opacity.value    = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: duration + 40, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[{ flex: 1 }, anim, style]}>{children}</Animated.View>;
};

// ── StaggerFadeIn ─────────────────────────────────────────────────────────────
// 카드/섹션들이 순차적으로 나타나는 효과
export const StaggerFadeIn = ({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle;
}) => (
  <FadeInView delay={index * 60} slideOffset={8} duration={340} style={style}>
    {children}
  </FadeInView>
);

// ── Card ──────────────────────────────────────────────────────────────────────
// 표준 카드 컨테이너 — 넉넉한 패딩, 부드러운 모서리
export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => <View style={[ds.card, style]}>{children}</View>;

// ── ScreenHeader ──────────────────────────────────────────────────────────────
// 화면 상단 헤더 — 일관된 타이포그래피
export const ScreenHeader = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) => (
  <View style={ds.header}>
    <View style={{ flex: 1 }}>
      <Text style={ds.headerTitle}>{title}</Text>
      {subtitle ? <Text style={ds.headerSub}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
);

// ── SectionLabel ─────────────────────────────────────────────────────────────
// 섹션 구분 레이블 — 여백 포함
export const SectionLabel = ({
  children,
  style,
  first = false,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  first?: boolean;
}) => (
  <Text style={[ds.sectionLabel, !first && ds.sectionLabelSpaced, style]}>
    {children}
  </Text>
);

// ── SectionSub ───────────────────────────────────────────────────────────────
// 섹션 보조 설명
export const SectionSub = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) => <Text style={[ds.sectionSub, style]}>{children}</Text>;

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = ({ style }: { style?: ViewStyle }) => (
  <View style={[ds.divider, style]} />
);

// ── Pill Badge ────────────────────────────────────────────────────────────────
export const PillBadge = ({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) => (
  <View style={[ds.pillBadge, { backgroundColor: bg }]}>
    <Text style={[ds.pillBadgeText, { color }]}>{label}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const ds = StyleSheet.create({
  card: {
    backgroundColor: T.colors.card,
    borderRadius:    T.radius.lg,
    borderWidth:     1,
    borderColor:     'rgba(231,221,203,0.85)',
    padding:         T.space.md + 2,
    marginBottom:    T.space.md,
    ...T.shadow.md,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   T.space.md,
    paddingHorizontal: T.space.lg,
    backgroundColor:   T.colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  headerTitle: {
    ...T.typo.h2,
    color: T.colors.text,
  },
  headerSub: {
    ...T.typo.small,
    color:     T.colors.textMuted,
    marginTop: 3,
    lineHeight: 19,
  },
  sectionLabel: {
    ...T.typo.label,
    color:         T.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom:  T.space.sm + 2,
    textTransform: 'uppercase',
  },
  sectionLabelSpaced: {
    marginTop: T.space.xl,
  },
  sectionSub: {
    ...T.typo.small,
    color:      T.colors.textMuted,
    lineHeight: 20,
    marginBottom: T.space.md,
  },
  divider: {
    height:          0.5,
    backgroundColor: T.colors.border,
    marginVertical:  T.space.md,
  },
  pillBadge: {
    borderRadius:      T.radius.round,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  pillBadgeText: {
    ...T.typo.label,
  },
});
