import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { T } from '../styles/theme';
import { Card, Divider } from './DS';
import { DrugInfoPart, DrugInfoMisconception, DrugInfoFaqItem } from '../constants/drugInfo';
import SideEffectInput from './SideEffectInput';

interface Props {
  part:   DrugInfoPart;
  onBack: () => void;
}

// Parts that benefit from side-effect logging
const SE_PART_IDS = new Set(['antidepressant', 'anxiolytic', 'sleep_med', 'antipsychotic']);

// ── Reusable accordion ──────────────────────────────────────────────────────────
interface AccordionItemProps {
  heading:     string;
  body:        string;
  initialOpen?: boolean;
}

const AccordionItem = ({ heading, body, initialOpen = false }: AccordionItemProps) => {
  const [open, setOpen]       = useState(initialOpen);
  const measuredH             = useRef(0);
  const heightSV              = useSharedValue(initialOpen ? 9999 : 0);
  const rotateSV              = useSharedValue(initialOpen ? 1 : 0);
  const initSnapped           = useRef(false);

  const onInnerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      measuredH.current = h;
      if (initialOpen && !initSnapped.current) {
        initSnapped.current = true;
        heightSV.value = h;
      }
    }
  }, [initialOpen, heightSV]);

  const toggle = useCallback(() => {
    if (measuredH.current === 0) return;
    setOpen(prev => {
      const next = !prev;
      heightSV.value = withTiming(next ? measuredH.current : 0, {
        duration: 280,
        easing: Easing.out(Easing.quad),
      });
      rotateSV.value = withTiming(next ? 1 : 0, { duration: 280 });
      return next;
    });
  }, [heightSV, rotateSV]);

  const bodyAnim  = useAnimatedStyle(() => ({ height: heightSV.value }));
  const arrowAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateSV.value * 180}deg` }],
  }));

  return (
    <View>
      <TouchableOpacity onPress={toggle} style={a.header} activeOpacity={0.7}>
        <Text style={a.heading}>{heading}</Text>
        <Animated.View style={arrowAnim}>
          <Text style={a.chevron}>›</Text>
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[a.bodyWrap, bodyAnim]}>
        <View onLayout={onInnerLayout} style={a.bodyInner}>
          <Text style={a.bodyText}>{body}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ── Misconception card (myth → tap → fact) ─────────────────────────────────────
const MisconceptionCard = ({ item }: { item: DrugInfoMisconception }) => {
  const measuredH = useRef(0);
  const heightSV  = useSharedValue(0);
  const rotateSV  = useSharedValue(0);

  const onInnerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) measuredH.current = h;
  }, []);

  const toggle = useCallback(() => {
    if (measuredH.current === 0) return;
    const next = heightSV.value === 0;
    heightSV.value = withTiming(next ? measuredH.current : 0, {
      duration: 260,
      easing: Easing.out(Easing.quad),
    });
    rotateSV.value = withTiming(next ? 1 : 0, { duration: 260 });
  }, [heightSV, rotateSV]);

  const bodyAnim  = useAnimatedStyle(() => ({ height: heightSV.value }));
  const arrowAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateSV.value * 180}deg` }],
  }));

  return (
    <View style={m.item}>
      <TouchableOpacity onPress={toggle} style={m.header} activeOpacity={0.7}>
        <View style={m.accent} />
        <Text style={m.myth}>{item.myth}</Text>
        <Animated.View style={arrowAnim}>
          <Text style={m.chevron}>›</Text>
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[m.bodyWrap, bodyAnim]}>
        <View onLayout={onInnerLayout} style={m.bodyInner}>
          <Text style={m.fact}>{item.fact}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ── FAQ accordion ───────────────────────────────────────────────────────────────
const FaqItem = ({ item }: { item: DrugInfoFaqItem }) => (
  <AccordionItem heading={item.question} body={item.answer} />
);

// ── Main component ──────────────────────────────────────────────────────────────
export default function DrugInfoDetail({ part, onBack }: Props) {
  const [seVisible, setSeVisible] = useState(false);

  const showSEButton     = SE_PART_IDS.has(part.id);
  const hasMisconceptions = part.misconceptions.length > 0;
  const hasSections      = part.sections.length > 0;
  const hasFaq           = part.faqItems.length > 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={onBack}
          style={s.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backLabel}>목록</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{part.title}</Text>
        <View style={s.backBtn} pointerEvents="none" />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, showSEButton && s.scrollContentPadded]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>{part.emoji}</Text>
          <Text style={s.heroTitle}>{part.title}</Text>
          <Text style={s.heroSubtitle}>{part.subtitle}</Text>
        </View>

        {/* Misconceptions (2부) */}
        {hasMisconceptions && (
          <Card style={s.sectionCard}>
            {part.misconceptions.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Divider style={s.divider} />}
                <MisconceptionCard item={item} />
              </React.Fragment>
            ))}
          </Card>
        )}

        {/* Sections accordion (most parts) */}
        {!hasMisconceptions && hasSections && (
          <Card style={s.sectionCard}>
            {part.sections.map((sec, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Divider style={s.divider} />}
                <AccordionItem
                  heading={sec.heading}
                  body={sec.body}
                  initialOpen={i === 0}
                />
              </React.Fragment>
            ))}
          </Card>
        )}

        {/* FAQ (13부: missed_dose) */}
        {hasFaq && (
          <>
            <Text style={s.sectionLabel}>자주 묻는 질문</Text>
            <Card style={s.sectionCard}>
              {part.faqItems.map((faq, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Divider style={s.divider} />}
                  <FaqItem item={faq} />
                </React.Fragment>
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Floating side-effect button */}
      {showSEButton && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => setSeVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>🩺 이 증상 기록하기</Text>
        </TouchableOpacity>
      )}

      {seVisible && (
        <SideEffectInput
          visible
          medId={part.id}
          medName={part.title}
          onClose={() => setSeVisible(false)}
          onSaved={() => {}}
        />
      )}
    </View>
  );
}

// ── Accordion styles ────────────────────────────────────────────────────────────
const a = StyleSheet.create({
  header: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    paddingVertical: T.space.sm + 2,
    gap:             T.space.sm,
  },
  heading: {
    flex:       1,
    ...T.typo.body,
    color:      T.colors.text,
    fontWeight: '500',
    lineHeight: 22,
  },
  chevron: {
    fontSize:   20,
    color:      T.colors.textMuted,
    fontWeight: '300',
    lineHeight: 24,
  },
  bodyWrap:  { overflow: 'hidden' },
  bodyInner: { paddingBottom: T.space.sm + 2 },
  bodyText: {
    ...T.typo.body,
    color:      T.colors.textMuted,
    lineHeight: 23,
  },
});

// ── Misconception styles ────────────────────────────────────────────────────────
const m = StyleSheet.create({
  item: { paddingVertical: T.space.xs },
  header: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    paddingVertical: T.space.sm + 2,
    gap:            T.space.sm,
  },
  accent: {
    width:        3,
    minHeight:    18,
    borderRadius: 2,
    backgroundColor: T.colors.oliveDark,
    marginTop:    3,
    flexShrink:   0,
  },
  myth: {
    flex:       1,
    ...T.typo.body,
    color:      T.colors.text,
    fontWeight: '500',
    lineHeight: 22,
  },
  chevron: {
    fontSize:   20,
    color:      T.colors.textMuted,
    fontWeight: '300',
    lineHeight: 24,
  },
  bodyWrap:  { overflow: 'hidden' },
  bodyInner: {
    paddingLeft:   T.space.md + 2,
    paddingBottom: T.space.sm + 2,
  },
  fact: {
    ...T.typo.body,
    color:      T.colors.textMuted,
    lineHeight: 23,
  },
});

// ── Main styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: T.colors.bg,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   T.space.md,
    paddingHorizontal: T.space.md,
    backgroundColor:   T.colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    width:         64,
    gap:           2,
  },
  backArrow: {
    fontSize:   22,
    color:      T.colors.olive,
    fontWeight: '300',
    lineHeight: 26,
  },
  backLabel: {
    ...T.typo.small,
    color:      T.colors.olive,
    fontWeight: '500',
  },
  headerTitle: {
    flex:      1,
    ...T.typo.h3,
    color:     T.colors.text,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: T.space.md,
    paddingTop:        T.space.lg,
    paddingBottom:     T.space.xxl,
  },
  scrollContentPadded: {
    paddingBottom: T.space.xxl + 32,
  },
  hero: {
    alignItems:        'center',
    marginBottom:      T.space.lg,
    paddingBottom:     T.space.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  heroEmoji: {
    fontSize:     40,
    lineHeight:   50,
    marginBottom: T.space.sm,
  },
  heroTitle: {
    ...T.typo.h2,
    color:        T.colors.text,
    textAlign:    'center',
    marginBottom: T.space.xs + 2,
  },
  heroSubtitle: {
    ...T.typo.body,
    color:      T.colors.textMuted,
    textAlign:  'center',
    lineHeight: 22,
  },
  sectionCard: {
    marginBottom: T.space.md,
    padding:      T.space.md,
  },
  sectionLabel: {
    ...T.typo.label,
    color:         T.colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  T.space.sm + 2,
    marginTop:     T.space.sm,
  },
  divider: {
    marginVertical: T.space.xs + 2,
  },
  fab: {
    position:          'absolute',
    bottom:            T.space.lg,
    right:             T.space.md,
    backgroundColor:   T.colors.olive,
    borderRadius:      T.radius.round,
    paddingHorizontal: T.space.md + 4,
    paddingVertical:   T.space.sm + 4,
    ...T.shadow.md,
  },
  fabText: {
    ...T.typo.small,
    color:      T.colors.bg,
    fontWeight: '600',
  },
});
