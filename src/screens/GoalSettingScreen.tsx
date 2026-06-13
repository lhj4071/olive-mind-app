// src/screens/GoalSettingScreen.tsx
// 치료 목표 설정 — 5단계 온보딩 마법사

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { C, T } from '../styles/theme';
import {
  CONSTRAINTS,
  CURRENT_STATES,
  DOMAIN_LABELS,
  DOMAINS,
  ROUTINE_MAP,
  type Domain,
  getFilteredGoals,
  getRecommendedRoutines,
} from '../constants/goalData';
import { useGoalStore } from '../store/useGoalStore';
import { supabase } from '../lib/supabase';
import { pushGoalSession } from '../lib/syncService';

// ── Domain metadata ───────────────────────────────────────────────────────────

const DOMAIN_META: Record<Domain, { emoji: string; color: string; desc: string }> = {
  symptom:  { emoji: '💭', color: C.phq9,   desc: '불안·수면·무기력·감정' },
  function: { emoji: '⚡', color: C.olive,  desc: '일상·집중·식사·기상' },
  relation: { emoji: '💬', color: C.gad7,   desc: '가족·친구·동료' },
  meaning:  { emoji: '🌱', color: C.accent, desc: '목적·가치·정체성' },
};

const STEP_LABELS = ['영역 선택', '현재 상태', '목표 설정', '루틴 선택', '완료'];
const TOTAL_STEPS = 5;

// ── Flat routine lookup (step 5에서 ID → 객체 변환) ──────────────────────────

const ALL_ROUTINES_FLAT = Object.values(ROUTINE_MAP).flat();
const routineById = (id: string) => ALL_ROUTINES_FLAT.find(r => r.id === id);

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoalSettingScreen() {
  const {
    selectedDomains, selectedStates, selectedGoals, selectedRoutines,
    toggleDomain, toggleState, toggleGoal, toggleRoutine, resetSession,
  } = useGoalStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Step animation ─────────────────────────────────────────────────────────

  const animateToStep = useCallback((nextStep: number, dir: 1 | -1) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -20, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(dir * 20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return selectedDomains.length > 0;
      case 2: return selectedDomains.some(d => (selectedStates[d] ?? []).length > 0);
      case 3: return selectedDomains.some(d => (selectedGoals[d] ?? []).length > 0);
      case 4: return selectedRoutines.length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (currentStep < TOTAL_STEPS) animateToStep(currentStep + 1, 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) animateToStep(currentStep - 1, -1);
    else { resetSession(); router.back(); }
  };

  const setCustom = (id: string, text: string) =>
    setCustomInputs(prev => ({ ...prev, [id]: text }));

  const handleComplete = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const allRoutineObjs = selectedRoutines
          .map(id => routineById(id))
          .filter(Boolean) as { id: string; text: string; emoji: string }[];

        await pushGoalSession(session.user.id, {
          selectedDomains,
          selectedStates: selectedStates as Record<string, string[]>,
          selectedGoals:  selectedGoals  as Record<string, string[]>,
          goalPriority:   [],
          selectedRoutines: allRoutineObjs.map(r => ({ text: r.text, emoji: r.emoji })),
        });
      }
    } catch (e) {
      console.warn('[GoalSetting] sync failed:', e);
    }
    router.back();
  }, [selectedDomains, selectedStates, selectedGoals, selectedRoutines]);

  // ── Step 1: 영역 선택 ─────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View>
      <Text style={s.stepTitle}>어떤 부분을 개선하고{'\n'}싶으신가요?</Text>
      <Text style={s.stepSub}>개선하고 싶은 영역을 모두 선택해 주세요</Text>
      <View style={s.domainGrid}>
        {DOMAINS.map(domain => {
          const meta = DOMAIN_META[domain];
          const sel  = selectedDomains.includes(domain);
          return (
            <TouchableOpacity
              key={domain}
              style={[
                s.domainCard,
                sel && { borderColor: meta.color, backgroundColor: `${meta.color}1A` },
              ]}
              onPress={() => toggleDomain(domain)}
              activeOpacity={0.75}
            >
              {sel && (
                <View style={[s.checkBadge, { backgroundColor: meta.color }]}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </View>
              )}
              <Text style={s.domainEmoji}>{meta.emoji}</Text>
              <Text style={[s.domainLabel, sel && { color: meta.color }]}>
                {DOMAIN_LABELS[domain]}
              </Text>
              <Text style={s.domainDesc}>{meta.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── Step 2: 현재 상태 선택 ────────────────────────────────────────────────

  const renderStep2 = () => (
    <View>
      <Text style={s.stepTitle}>지금 어떤 어려움을{'\n'}겪고 계신가요?</Text>
      <Text style={s.stepSub}>해당하는 상황을 모두 선택해 주세요</Text>

      {selectedDomains.map(domain => (
        <View key={domain} style={s.domainSection}>
          <View style={s.domainSectionRow}>
            <Text style={s.domainSectionEmoji}>{DOMAIN_META[domain].emoji}</Text>
            <Text style={[s.domainSectionLabel, { color: DOMAIN_META[domain].color }]}>
              {DOMAIN_LABELS[domain]}
            </Text>
          </View>

          {CURRENT_STATES[domain].map(item => {
            const sel = (selectedStates[domain] ?? []).includes(item.id);
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={[s.selectCard, sel && s.selectCardSel]}
                  onPress={() => toggleState(domain, item.id)}
                  activeOpacity={0.75}
                >
                  <View style={[s.checkCircle, sel && s.checkCircleSel]}>
                    {sel && <Check size={10} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={[s.selectCardText, sel && s.selectCardTextSel]}>
                    {item.is_custom ? '직접 입력' : item.text}
                  </Text>
                </TouchableOpacity>

                {item.is_custom && sel && (
                  <TextInput
                    style={s.customInput}
                    placeholder="어떤 어려움인지 직접 적어주세요"
                    placeholderTextColor={C.dim}
                    value={customInputs[item.id] ?? ''}
                    onChangeText={t => setCustom(item.id, t)}
                    multiline
                    returnKeyType="done"
                  />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  // ── Step 3: 목표 선택 ─────────────────────────────────────────────────────

  const renderStep3 = () => (
    <View>
      <Text style={s.stepTitle}>어떻게 달라지고{'\n'}싶으신가요?</Text>
      <Text style={s.stepSub}>영역당 최대 {CONSTRAINTS.MAX_GOALS_PER_DOMAIN}개 선택 가능해요</Text>

      {selectedDomains.map(domain => {
        const stateIds    = selectedStates[domain] ?? [];
        const filtered    = getFilteredGoals(domain, stateIds);
        const domainGoals = selectedGoals[domain] ?? [];

        return (
          <View key={domain} style={s.domainSection}>
            <View style={s.domainSectionRow}>
              <Text style={s.domainSectionEmoji}>{DOMAIN_META[domain].emoji}</Text>
              <Text style={[s.domainSectionLabel, { color: DOMAIN_META[domain].color }]}>
                {DOMAIN_LABELS[domain]}
              </Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>
                  {domainGoals.length}/{CONSTRAINTS.MAX_GOALS_PER_DOMAIN}
                </Text>
              </View>
            </View>

            {filtered.map(goal => {
              const sel    = domainGoals.includes(goal.id);
              const maxed  = !sel && domainGoals.length >= CONSTRAINTS.MAX_GOALS_PER_DOMAIN;

              return (
                <View key={goal.id}>
                  <TouchableOpacity
                    style={[
                      s.selectCard,
                      sel && s.selectCardSel,
                      maxed && s.selectCardDimmed,
                    ]}
                    onPress={() => { if (!maxed) toggleGoal(domain, goal.id); }}
                    activeOpacity={0.75}
                  >
                    <View style={[s.checkCircle, sel && s.checkCircleSel]}>
                      {sel && <Check size={10} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text style={[
                      s.selectCardText,
                      sel && s.selectCardTextSel,
                      maxed && { color: C.dim },
                    ]}>
                      {goal.is_custom ? '직접 입력' : goal.text}
                    </Text>
                  </TouchableOpacity>

                  {goal.is_custom && sel && (
                    <TextInput
                      style={s.customInput}
                      placeholder="어떤 목표인지 직접 적어주세요"
                      placeholderTextColor={C.dim}
                      value={customInputs[goal.id] ?? ''}
                      onChangeText={t => setCustom(goal.id, t)}
                      multiline
                      returnKeyType="done"
                    />
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );

  // ── Step 4: 루틴 선택 ─────────────────────────────────────────────────────

  const renderStep4 = () => {
    const allGoalIds  = selectedDomains.flatMap(d => selectedGoals[d] ?? []);
    const recommended = getRecommendedRoutines(allGoalIds);

    return (
      <View>
        <Text style={s.stepTitle}>매일 어떤 루틴을{'\n'}실천해 볼까요?</Text>
        <Text style={s.stepSub}>
          최대 {CONSTRAINTS.MAX_ROUTINES_TOTAL}개 선택
          {selectedRoutines.length > 0
            ? ` · 현재 ${selectedRoutines.length}개 선택됨`
            : ''}
        </Text>

        {recommended.length === 0
          ? <Text style={s.emptyText}>앞 단계에서 목표를 먼저 선택해 주세요</Text>
          : recommended.map(routine => {
              const sel   = selectedRoutines.includes(routine.id);
              const maxed = !sel && selectedRoutines.length >= CONSTRAINTS.MAX_ROUTINES_TOTAL;

              return (
                <TouchableOpacity
                  key={routine.id}
                  style={[
                    s.routineCard,
                    sel && s.routineCardSel,
                    maxed && s.selectCardDimmed,
                  ]}
                  onPress={() => { if (!maxed) toggleRoutine(routine.id); }}
                  activeOpacity={0.75}
                >
                  <Text style={s.routineEmoji}>{routine.emoji}</Text>
                  <Text style={[s.routineText, sel && { color: C.text }]}>
                    {routine.text}
                  </Text>
                  {sel && (
                    <View style={s.routineCheckWrap}>
                      <Check size={14} color={C.olive} strokeWidth={2.5} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
        }
      </View>
    );
  };

  // ── Step 5: 완료 ──────────────────────────────────────────────────────────

  const renderStep5 = () => {
    const selected = selectedRoutines
      .map(id => routineById(id))
      .filter(Boolean);

    return (
      <View style={s.completeWrap}>
        <Text style={s.completeTitle}>루틴 설정이{'\n'}완료됐어요! 🎉</Text>
        <Text style={s.completeSub}>선택한 루틴들을 매일 조금씩 실천해 보세요</Text>

        <View style={s.completeList}>
          {selected.map(r => r && (
            <View key={r.id} style={s.completedCard}>
              <Text style={s.routineEmoji}>{r.emoji}</Text>
              <Text style={s.completedCardText}>{r.text}</Text>
              <View style={[s.routineCheckWrap, { backgroundColor: `${C.olive}30` }]}>
                <Check size={14} color={C.olive} strokeWidth={2.5} />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={s.completeBtn}
          onPress={handleComplete}
          activeOpacity={0.85}
        >
          <Text style={s.completeBtnText}>저장하고 홈으로 가기</Text>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={handlePrev}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={22} color={C.textMuted} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.stepLabelText}>{STEP_LABELS[currentStep - 1]}</Text>
            <View style={s.progressTrack}>
              <Animated.View
                style={[
                  s.progressFill,
                  { width: `${(currentStep / TOTAL_STEPS) * 100}%` },
                ]}
              />
            </View>
          </View>

          <Text style={s.stepCounter}>{currentStep}/{TOTAL_STEPS}</Text>
        </View>

        {/* ── Animated step content ────────────────────────────────────────── */}
        <Animated.View
          style={[
            s.animWrap,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </ScrollView>
        </Animated.View>

        {/* ── Bottom navigation (steps 1-4 only) ───────────────────────────── */}
        {currentStep < TOTAL_STEPS && (
          <View style={s.bottomBar}>
            {currentStep > 1 ? (
              <TouchableOpacity style={s.prevBtn} onPress={handlePrev} activeOpacity={0.75}>
                <ChevronLeft size={17} color={C.textMuted} />
                <Text style={s.prevBtnText}>이전</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                s.nextBtn,
                currentStep === 1 && { flex: 1 },
                !canProceed() && s.nextBtnDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
              activeOpacity={0.8}
            >
              <Text style={s.nextBtnText}>
                {currentStep === 4 ? '완료 확인' : '다음'}
              </Text>
              <ChevronRight size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  stepLabelText:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: C.olive, textTransform: 'uppercase' },
  progressTrack:{ width: '100%', height: 3, backgroundColor: C.border, borderRadius: 99 },
  progressFill: { height: 3, backgroundColor: C.olive, borderRadius: 99 },
  stepCounter:  { fontSize: 12, fontWeight: '500', color: C.dim, minWidth: 28, textAlign: 'right' },

  // Animation wrapper + scroll
  animWrap:     { flex: 1 },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 20, paddingBottom: 40 },

  // Step titles
  stepTitle: { fontSize: 22, fontWeight: '700', color: C.text, lineHeight: 31, marginBottom: 6, letterSpacing: -0.3 },
  stepSub:   { fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: 22 },

  // Domain grid (2×2)
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  domainCard: {
    width: '48.5%',
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: C.border,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  domainEmoji: { fontSize: 28, marginBottom: 8 },
  domainLabel: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 4 },
  domainDesc:  { fontSize: 12, color: C.textMuted, lineHeight: 17 },

  // Domain section headers (step 2, 3)
  domainSection:     { marginBottom: 24 },
  domainSectionRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  domainSectionEmoji:{ fontSize: 16 },
  domainSectionLabel:{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  countBadge:        { marginLeft: 'auto', backgroundColor: C.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  countBadgeText:    { fontSize: 11, fontWeight: '600', color: C.textMuted },

  // Select cards (state + goal)
  selectCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.card, borderRadius: 12, padding: 13,
    marginBottom: 6, borderWidth: 1.5, borderColor: C.border,
  },
  selectCardSel:     { borderColor: C.olive, backgroundColor: C.oliveFaded },
  selectCardDimmed:  { opacity: 0.38 },
  checkCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.dim,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkCircleSel:    { backgroundColor: C.olive, borderColor: C.olive },
  selectCardText:    { fontSize: 14, color: C.textMuted, flex: 1, lineHeight: 21 },
  selectCardTextSel: { color: C.text },

  // Custom input
  customInput: {
    backgroundColor: C.cardRaised, borderRadius: 8,
    borderWidth: 1, borderColor: C.oliveDark,
    color: C.text, fontSize: 14, padding: 12,
    marginBottom: 6, marginLeft: 30,
    lineHeight: 20, minHeight: 64, textAlignVertical: 'top',
  },

  // Routine cards
  routineCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    marginBottom: 7, borderWidth: 1.5, borderColor: C.border,
  },
  routineCardSel: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  routineEmoji:   { fontSize: 22, flexShrink: 0 },
  routineText:    { fontSize: 14, color: C.textMuted, flex: 1, lineHeight: 21 },
  routineCheckWrap: {
    width: 26, height: 26, borderRadius: 13, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },

  // Step 5 – complete
  completeWrap:      { alignItems: 'center', paddingTop: 8 },
  completeTitle:     { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'center', lineHeight: 33, marginBottom: 8, letterSpacing: -0.3 },
  completeSub:       { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  completeList:      { width: '100%' },
  completedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.oliveFaded, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1.5, borderColor: C.oliveDark,
  },
  completedCardText: { fontSize: 14, color: C.text, flex: 1, fontWeight: '500' },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.olive, borderRadius: 999,
    paddingHorizontal: 36, paddingVertical: 15, marginTop: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
  },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Empty
  emptyText: { fontSize: 14, color: C.dim, textAlign: 'center', paddingVertical: 28 },

  // Bottom nav
  bottomBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.card, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 13,
    borderWidth: 1, borderColor: C.border,
  },
  prevBtnText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
    backgroundColor: C.olive, borderRadius: 999, paddingVertical: 14,
  },
  nextBtnDisabled: { backgroundColor: C.dim, opacity: 0.5 },
  nextBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});
