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
import { ConditionRecord } from '../constants/conditions';

interface Props {
  condition: ConditionRecord;
  onBack: () => void;
}

// ── Accordion item ─────────────────────────────────────────────────────────────
interface AccordionProps {
  heading: string;
  body: string;
}

const AccordionItem = ({ heading, body }: AccordionProps) => {
  const [open, setOpen] = useState(false);
  const measuredH = useRef(0);
  const heightSV  = useSharedValue(0);
  const rotateSV  = useSharedValue(0);

  const onInnerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) measuredH.current = h;
  }, []);

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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ConditionDetail({ condition, onBack }: Props) {
  const { emoji, title, summary, sections, misconceptions, faqItems, whenToSeekHelp } = condition;

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
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={s.backBtn} pointerEvents="none" />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>{emoji}</Text>
          <Text style={s.heroTitle}>{title}</Text>
          <Text style={s.heroSummary}>{summary}</Text>
        </View>

        {/* Sections accordion */}
        {sections.length > 0 && (
          <Card style={s.sectionCard}>
            {sections.map((sec, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Divider style={s.divider} />}
                <AccordionItem heading={sec.heading} body={sec.body} />
              </React.Fragment>
            ))}
          </Card>
        )}

        {/* Misconceptions */}
        {misconceptions.length > 0 && (
          <>
            <Text style={s.sectionLabel}>많이 하는 오해</Text>
            <Card style={s.sectionCard}>
              {misconceptions.map((m, i) => (
                <View key={i} style={[s.misconItem, i > 0 && s.misconBorder]}>
                  <Text style={s.myth}>{m.myth}</Text>
                  <Text style={s.fact}>{m.fact}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* FAQ */}
        {faqItems.length > 0 && (
          <>
            <Text style={s.sectionLabel}>자주 묻는 질문</Text>
            <Card style={s.sectionCard}>
              {faqItems.map((faq, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Divider style={s.divider} />}
                  <AccordionItem heading={faq.question} body={faq.answer} />
                </React.Fragment>
              ))}
            </Card>
          </>
        )}

        {/* When to seek help */}
        {!!whenToSeekHelp && (
          <View style={s.helpBanner}>
            <Text style={s.helpTitle}>🏥 이럴 때 빨리 병원에</Text>
            <Text style={s.helpBody}>{whenToSeekHelp}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Accordion styles ───────────────────────────────────────────────────────────
const a = StyleSheet.create({
  header: {
    flexDirection:  'row',
    alignItems:     'flex-start',
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
  bodyWrap: {
    overflow: 'hidden',
  },
  bodyInner: {
    paddingBottom: T.space.sm + 2,
  },
  bodyText: {
    ...T.typo.body,
    color:      T.colors.textMuted,
    lineHeight: 23,
  },
});

// ── Main styles ────────────────────────────────────────────────────────────────
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
    width:         60,
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
    flex:        1,
    ...T.typo.h3,
    color:       T.colors.text,
    textAlign:   'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: T.space.md,
    paddingTop:        T.space.lg,
    paddingBottom:     T.space.xxl,
  },
  hero: {
    alignItems:    'center',
    marginBottom:  T.space.lg,
    paddingBottom: T.space.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: T.colors.border,
  },
  heroEmoji: {
    fontSize:     44,
    lineHeight:   54,
    marginBottom: T.space.sm,
  },
  heroTitle: {
    ...T.typo.h2,
    color:        T.colors.text,
    textAlign:    'center',
    marginBottom: T.space.xs + 2,
  },
  heroSummary: {
    ...T.typo.body,
    color:     T.colors.textMuted,
    textAlign: 'center',
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
  misconItem: {
    paddingVertical: T.space.sm + 2,
  },
  misconBorder: {
    borderTopWidth: 0.5,
    borderTopColor: T.colors.border,
  },
  myth: {
    ...T.typo.small,
    color:        T.colors.textMuted,
    fontWeight:   '600',
    marginBottom: T.space.xs,
  },
  fact: {
    ...T.typo.body,
    color:      T.colors.text,
    lineHeight: 22,
  },
  helpBanner: {
    backgroundColor: T.colors.dangerDark,
    borderWidth:     0.5,
    borderColor:     T.colors.dangerBorder,
    borderRadius:    T.radius.md,
    padding:         T.space.md,
    marginTop:       T.space.sm,
  },
  helpTitle: {
    ...T.typo.h3,
    color:        T.colors.danger,
    marginBottom: T.space.sm,
  },
  helpBody: {
    ...T.typo.body,
    color:      T.colors.text,
    lineHeight: 23,
  },
});
