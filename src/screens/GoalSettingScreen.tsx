// src/screens/GoalSettingScreen.tsx
// 치료 목표 설정 — 6단계 온보딩 마법사

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { C } from '../styles/theme';
import {
  CONSTRAINTS,
  CURRENT_STATES,
  DOMAIN_LABELS,
  DOMAINS,
  ROUTINE_MAP,
  SUBCATEGORIES,
  type Domain,
} from '../constants/goalData';
import { useGoalStore, getGoalLadder, getRecommendedRoutines } from '../store/useGoalStore';
import { renderTemplate } from '../utils/templateUtils';
import { supabase } from '../lib/supabase';
import { pushGoalSession } from '../lib/syncService';

// ── Domain metadata ───────────────────────────────────────────────────────────

const DOMAIN_META: Record<Domain, { emoji: string; color: string; desc: string }> = {
  symptom:  { emoji: '💭', color: C.phq9,   desc: '불안·수면·무기력·감정' },
  function: { emoji: '⚡', color: C.olive,  desc: '일상·집중·식사·기상' },
  relation: { emoji: '💬', color: C.gad7,   desc: '가족·친구·동료' },
  meaning:  { emoji: '🌱', color: C.accent, desc: '목적·가치·정체성' },
};

// ── Step metadata ─────────────────────────────────────────────────────────────
// Step 1: 영역 선택
// Step 2: 하위카테고리 선택 (NEW)
// Step 3: 현재 상태 선택 — 하위카테고리별 서브스텝
// Step 4: 목표 설정
// Step 5: 루틴 선택
// Step 6: 완료

const STEP_LABELS = ['영역 선택', '하위카테고리', '현재 상태', '목표 설정', '루틴 선택', '완료'];
const TOTAL_STEPS = 6;

// ── Goal ladder level labels ───────────────────────────────────────────────────

const LEVEL_LABELS: Record<'small' | 'medium' | 'large', string> = {
  small:  '조금씩',
  medium: '어느 정도',
  large:  '크게',
};

// ── Flat routine lookup (step 6 완료 화면에서 사용 — B다음 미션에서 교체 예정) ────

const ALL_ROUTINES_FLAT = Object.values(ROUTINE_MAP).flat();
const routineById = (id: string) => ALL_ROUTINES_FLAT.find((r: any) => r.id === id);

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoalSettingScreen() {
  const {
    selectedDomains, selectedStates, selectedGoals, selectedRoutines,
    toggleDomain, toggleState, toggleGoal, toggleRoutine, resetSession,
  } = useGoalStore();

  const [currentStep, setCurrentStep]               = useState(1);
  // 하위카테고리 선택 (step 2) — 도메인별 선택 ID 목록
  const [selectedSubcategories, setSelectedSubcategories] =
    useState<Partial<Record<Domain, string[]>>>({});
  // step 3 서브스텝 인덱스 (선택된 하위카테고리 순서 기준)
  const [subStepIndex, setSubStepIndex]             = useState(0);
  const [customInputs, setCustomInputs]             = useState<Record<string, string>>({});
  // step 4 빈칸 선택 — goalId → { blankKey → selectedValue }
  const [goalBlanks, setGoalBlanks]                 = useState<Record<string, Record<string, string>>>({});

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── step 3 서브스텝 목록 ───────────────────────────────────────────────────
  // 선택된 도메인 순서 × SUBCATEGORIES 정의 순서로 정렬

  const orderedSubcategories = useMemo(() => {
    const result: Array<{ domain: Domain; subcatId: string; label: string }> = [];
    for (const domain of selectedDomains) {
      const selSubs = selectedSubcategories[domain] ?? [];
      for (const sub of SUBCATEGORIES[domain]) {
        if (selSubs.includes(sub.id)) {
          result.push({ domain, subcatId: sub.id, label: sub.label });
        }
      }
    }
    return result;
  }, [selectedDomains, selectedSubcategories]);

  // ── 애니메이션 ────────────────────────────────────────────────────────────

  const animateTransition = useCallback((fn: () => void, dir: 1 | -1) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -20, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      fn();
      slideAnim.setValue(dir * 20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // ── 하위카테고리 토글 ─────────────────────────────────────────────────────

  const toggleSubcategory = useCallback((domain: Domain, subcatId: string) => {
    setSelectedSubcategories(prev => {
      const current = prev[domain] ?? [];
      const next = current.includes(subcatId)
        ? current.filter(id => id !== subcatId)
        : [...current, subcatId];
      return { ...prev, [domain]: next };
    });
  }, []);

  // ── 목표 빈칸 선택 ────────────────────────────────────────────────────────

  const setGoalBlank = useCallback((goalId: string, blankKey: string, value: string) => {
    setGoalBlanks(prev => ({
      ...prev,
      [goalId]: { ...(prev[goalId] ?? {}), [blankKey]: value },
    }));
  }, []);

  // ── 유효성 ───────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return selectedDomains.length > 0;
      case 2: return selectedDomains.some(d => (selectedSubcategories[d] ?? []).length > 0);
      case 3: {
        // 마지막 서브스텝에서만 최소 1개 state 선택 요구; 중간 서브스텝은 자유
        const isLast = orderedSubcategories.length === 0
          || subStepIndex === orderedSubcategories.length - 1;
        return isLast
          ? selectedDomains.some(d => (selectedStates[d] ?? []).length > 0)
          : true;
      }
      case 4: return selectedDomains.some(d => (selectedGoals[d] ?? []).length > 0);
      case 5: return selectedRoutines.length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    // step 3 서브스텝 전진
    if (currentStep === 3 && subStepIndex < orderedSubcategories.length - 1) {
      animateTransition(() => setSubStepIndex(s => s + 1), 1);
    } else {
      animateTransition(() => {
        setCurrentStep(s => s + 1);
        if (currentStep === 3) setSubStepIndex(0);
      }, 1);
    }
  };

  const handlePrev = () => {
    // step 3 서브스텝 후진
    if (currentStep === 3 && subStepIndex > 0) {
      animateTransition(() => setSubStepIndex(s => s - 1), -1);
    } else if (currentStep > 1) {
      animateTransition(() => {
        setCurrentStep(s => s - 1);
        if (currentStep === 3) setSubStepIndex(0); // step 2로 나올 때 초기화
      }, -1);
    } else {
      resetSession();
      router.back();
    }
  };

  const setCustom = (id: string, text: string) =>
    setCustomInputs(prev => ({ ...prev, [id]: text }));

  // handleComplete — selectedRoutines 타입 교체는 다음 미션에서 처리
  const handleComplete = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const allRoutineObjs = selectedRoutines
          .map((id: any) => routineById(id))
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

  // ── Step 2: 하위카테고리 선택 (NEW) ──────────────────────────────────────

  const renderStep2 = () => (
    <View>
      <Text style={s.stepTitle}>어떤 부분이{'\n'}해당하나요?</Text>
      <Text style={s.stepSub}>구체적인 영역을 모두 선택해 주세요</Text>

      {selectedDomains.map(domain => {
        const meta     = DOMAIN_META[domain];
        const selSubs  = selectedSubcategories[domain] ?? [];

        return (
          <View key={domain} style={s.domainSection}>
            <View style={s.domainSectionRow}>
              <Text style={s.domainSectionEmoji}>{meta.emoji}</Text>
              <Text style={[s.domainSectionLabel, { color: meta.color }]}>
                {DOMAIN_LABELS[domain]}
              </Text>
            </View>

            <View style={s.subcatGrid}>
              {SUBCATEGORIES[domain].map(sub => {
                const sel = selSubs.includes(sub.id);
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[
                      s.subcatChip,
                      sel && { borderColor: meta.color, backgroundColor: `${meta.color}1A` },
                    ]}
                    onPress={() => toggleSubcategory(domain, sub.id)}
                    activeOpacity={0.75}
                  >
                    {sel && (
                      <View style={[s.subcatCheckDot, { backgroundColor: meta.color }]} />
                    )}
                    <Text style={[s.subcatChipText, sel && { color: meta.color, fontWeight: '700' }]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );

  // ── Step 3: 현재 상태 선택 — 하위카테고리별 서브스텝 ──────────────────────

  const renderStep3 = () => {
    if (orderedSubcategories.length === 0) {
      return <Text style={s.emptyText}>앞 단계에서 하위카테고리를 선택해 주세요</Text>;
    }

    const { domain, subcatId, label } = orderedSubcategories[subStepIndex];
    const meta            = DOMAIN_META[domain];
    const states          = CURRENT_STATES[domain].filter(item => item.subcategory === subcatId);
    const selectedStateIds = selectedStates[domain] ?? [];

    return (
      <View>
        {/* 하위카테고리 컨텍스트 배지 */}
        <View style={[s.subcatHeader, { borderLeftColor: meta.color }]}>
          <Text style={s.subcatHeaderDomain}>
            {meta.emoji}  {DOMAIN_LABELS[domain]}
          </Text>
          <Text style={[s.subcatHeaderLabel, { color: meta.color }]}>{label}</Text>
        </View>

        <Text style={s.stepTitle}>지금 어떤 어려움을{'\n'}겪고 계신가요?</Text>
        <Text style={s.stepSub}>해당하는 상황을 모두 선택해 주세요</Text>

        {states.map(item => {
          const sel = selectedStateIds.includes(item.id);
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
    );
  };

  // ── Step 4: 목표 설정 ─────────────────────────────────────────────────────

  const renderStep4 = () => (
    <View>
      <Text style={s.stepTitle}>어떻게 달라지고{'\n'}싶으신가요?</Text>
      <Text style={s.stepSub}>영역당 최대 {CONSTRAINTS.MAX_GOALS_PER_DOMAIN}개 선택 가능해요</Text>

      {selectedDomains.map(domain => {
        const meta        = DOMAIN_META[domain];
        const stateIds    = selectedStates[domain] ?? [];
        const domainGoals = selectedGoals[domain] ?? [];

        return (
          <View key={domain} style={s.domainSection}>
            {/* 도메인 헤더 */}
            <View style={s.domainSectionRow}>
              <Text style={s.domainSectionEmoji}>{meta.emoji}</Text>
              <Text style={[s.domainSectionLabel, { color: meta.color }]}>
                {DOMAIN_LABELS[domain]}
              </Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>
                  {domainGoals.length}/{CONSTRAINTS.MAX_GOALS_PER_DOMAIN}
                </Text>
              </View>
            </View>

            {stateIds.length === 0
              ? <Text style={s.emptyText}>앞 단계에서 현재 상태를 선택해 주세요</Text>
              : stateIds.map(stateId => {
                  const stateItem = CURRENT_STATES[domain].find(s => s.id === stateId);
                  if (!stateItem) return null;

                  return (
                    <View key={stateId} style={s.stateGroup}>
                      {/* 현재 상태 라벨 */}
                      <Text style={s.stateLabelText} numberOfLines={2}>
                        {stateItem.is_custom
                          ? (customInputs[stateId] || '직접 입력한 어려움')
                          : stateItem.text}
                      </Text>

                      {stateItem.is_custom ? (
                        /* 커스텀 상태: 자유 텍스트 목표 입력 */
                        <TextInput
                          style={s.customInput}
                          placeholder="목표를 직접 입력해주세요"
                          placeholderTextColor={C.dim}
                          value={customInputs[`goal_${stateId}`] ?? ''}
                          onChangeText={t => setCustom(`goal_${stateId}`, t)}
                          multiline
                          returnKeyType="done"
                        />
                      ) : (
                        /* 목표 사다리: 3단계 카드 */
                        getGoalLadder(stateId).map(level => {
                          const currentBlanks = goalBlanks[level.id] ?? {};
                          const { text: previewText, blankKeys } = renderTemplate(
                            level.template,
                            level.blanks,
                            currentBlanks,
                          );
                          const isSelected = domainGoals.some(e => e.goalId === level.id);
                          const maxed = !isSelected && domainGoals.length >= CONSTRAINTS.MAX_GOALS_PER_DOMAIN;

                          const handleSelect = () => {
                            if (maxed) return;
                            toggleGoal(domain, {
                              stateId,
                              goalId:       level.id,
                              level:        level.level,
                              filledBlanks: currentBlanks,
                            });
                          };

                          return (
                            <View
                              key={level.id}
                              style={[
                                s.goalCard,
                                isSelected && s.goalCardSel,
                                maxed      && s.selectCardDimmed,
                              ]}
                            >
                              {/* 단계 배지 + 체크 버튼 */}
                              <View style={s.goalCardHeader}>
                                <View style={[s.levelBadge, { backgroundColor: `${meta.color}22` }]}>
                                  <Text style={[s.levelBadgeText, { color: meta.color }]}>
                                    {LEVEL_LABELS[level.level]}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={handleSelect}
                                  disabled={maxed}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <View style={[s.checkCircle, isSelected && s.checkCircleSel, s.goalCheckCircle]}>
                                    {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                                  </View>
                                </TouchableOpacity>
                              </View>

                              {/* 빈칸 선택 칩 */}
                              {blankKeys.map(blankKey => {
                                const options = level.blanks[blankKey] ?? [];
                                const selVal  = currentBlanks[blankKey] ?? options[0];
                                return (
                                  <View key={blankKey} style={s.blankRow}>
                                    <Text style={s.blankLabel}>{blankKey}</Text>
                                    <ScrollView
                                      horizontal
                                      showsHorizontalScrollIndicator={false}
                                      contentContainerStyle={s.blankChipScrollContent}
                                    >
                                      {options.map(opt => {
                                        const chipSel = selVal === opt;
                                        return (
                                          <TouchableOpacity
                                            key={opt}
                                            style={[
                                              s.blankChip,
                                              chipSel && {
                                                borderColor:     meta.color,
                                                backgroundColor: `${meta.color}1A`,
                                              },
                                            ]}
                                            onPress={() => setGoalBlank(level.id, blankKey, opt)}
                                            activeOpacity={0.75}
                                          >
                                            <Text style={[
                                              s.blankChipText,
                                              chipSel && { color: meta.color, fontWeight: '700' },
                                            ]}>
                                              {opt}
                                            </Text>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </ScrollView>
                                  </View>
                                );
                              })}

                              {/* 완성 문장 미리보기 (탭으로 선택) */}
                              <TouchableOpacity
                                onPress={handleSelect}
                                disabled={maxed}
                                activeOpacity={maxed ? 1 : 0.7}
                              >
                                <Text style={[
                                  s.goalPreviewText,
                                  isSelected && { color: C.text, fontWeight: '600' },
                                ]}>
                                  {previewText}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })
            }
          </View>
        );
      })}
    </View>
  );

  // ── Step 5: 루틴 선택 (기존 step 4 — 다음 미션에서 새 구조로 교체 예정) ────

  const renderStep5 = () => {
    const allStateIds  = selectedDomains.flatMap(d => selectedStates[d] ?? []);
    const recommended  = getRecommendedRoutines(allStateIds);

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
          ? <Text style={s.emptyText}>앞 단계에서 현재 상태를 먼저 선택해 주세요</Text>
          : recommended.map(routine => {
              const sel   = selectedRoutines.some((e: any) =>
                typeof e === 'string' ? e === routine.id : e.routineId === routine.id
              );
              const maxed = !sel && selectedRoutines.length >= CONSTRAINTS.MAX_ROUTINES_TOTAL;

              return (
                <TouchableOpacity
                  key={routine.id}
                  style={[
                    s.routineCard,
                    sel && s.routineCardSel,
                    maxed && s.selectCardDimmed,
                  ]}
                  onPress={() => {
                    if (!maxed) (toggleRoutine as any)({ routineId: routine.id, stateId: '', filledBlanks: {} });
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={s.routineEmoji}>{routine.emoji}</Text>
                  <Text style={[s.routineText, sel && { color: C.text }]}>
                    {routine.template}
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

  // ── Step 6: 완료 (기존 step 5 — 다음 미션에서 루틴 표시 교체 예정) ─────────

  const renderStep6 = () => {
    const selected = selectedRoutines
      .map((e: any) => routineById(typeof e === 'string' ? e : e.routineId))
      .filter(Boolean);

    return (
      <View style={s.completeWrap}>
        <Text style={s.completeTitle}>루틴 설정이{'\n'}완료됐어요! 🎉</Text>
        <Text style={s.completeSub}>선택한 루틴들을 매일 조금씩 실천해 보세요</Text>

        <View style={s.completeList}>
          {(selected as any[]).map((r: any) => r && (
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

  // step 3에서 표시할 서브스텝 카운터 텍스트
  const subStepLabel = currentStep === 3 && orderedSubcategories.length > 0
    ? `${subStepIndex + 1} / ${orderedSubcategories.length}`
    : null;

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
            <View style={s.headerLabelRow}>
              <Text style={s.stepLabelText}>{STEP_LABELS[currentStep - 1]}</Text>
              {subStepLabel && (
                <View style={s.subStepBadge}>
                  <Text style={s.subStepBadgeText}>{subStepLabel}</Text>
                </View>
              )}
            </View>
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
            {currentStep === 6 && renderStep6()}
          </ScrollView>
        </Animated.View>

        {/* ── Bottom navigation (steps 1-5 only) ───────────────────────────── */}
        {currentStep < TOTAL_STEPS && (
          <View style={s.bottomBar}>
            {currentStep > 1 && (
              <TouchableOpacity style={s.prevBtn} onPress={handlePrev} activeOpacity={0.75}>
                <ChevronLeft size={17} color={C.textMuted} />
                <Text style={s.prevBtnText}>이전</Text>
              </TouchableOpacity>
            )}

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
                {currentStep === 5 ? '완료 확인' : '다음'}
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
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:        { padding: 4 },
  headerCenter:   { flex: 1, alignItems: 'center', gap: 6 },
  headerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabelText:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: C.olive, textTransform: 'uppercase' },
  subStepBadge:   { backgroundColor: C.card, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: C.border },
  subStepBadgeText: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  progressTrack:  { width: '100%', height: 3, backgroundColor: C.border, borderRadius: 99 },
  progressFill:   { height: 3, backgroundColor: C.olive, borderRadius: 99 },
  stepCounter:    { fontSize: 12, fontWeight: '500', color: C.dim, minWidth: 28, textAlign: 'right' },

  // Animation wrapper + scroll
  animWrap:      { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

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

  // Domain section headers (step 2, 3, 4)
  domainSection:      { marginBottom: 24 },
  domainSectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  domainSectionEmoji: { fontSize: 16 },
  domainSectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  countBadge:         { marginLeft: 'auto', backgroundColor: C.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  countBadgeText:     { fontSize: 11, fontWeight: '600', color: C.textMuted },

  // Step 2: Subcategory chips
  subcatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subcatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.card, borderRadius: 99,
    borderWidth: 1.5, borderColor: C.border,
  },
  subcatCheckDot: { width: 7, height: 7, borderRadius: 4 },
  subcatChipText: { fontSize: 14, fontWeight: '500', color: C.textMuted },

  // Step 3: Subcategory context header
  subcatHeader: {
    paddingLeft: 14, paddingVertical: 10,
    borderLeftWidth: 3,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: C.card,
  },
  subcatHeaderDomain: { fontSize: 11, fontWeight: '600', color: C.textMuted, letterSpacing: 0.4, marginBottom: 4 },
  subcatHeaderLabel:  { fontSize: 18, fontWeight: '700', color: C.text },

  // Select cards (state / goal)
  selectCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.card, borderRadius: 12, padding: 13,
    marginBottom: 6, borderWidth: 1.5, borderColor: C.border,
  },
  selectCardSel:    { borderColor: C.olive, backgroundColor: C.oliveFaded },
  selectCardDimmed: { opacity: 0.38 },
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

  // Step 4: goal ladder
  stateGroup:     { marginBottom: 20 },
  stateLabelText: {
    fontSize: 13, color: C.textMuted, fontWeight: '600',
    marginBottom: 8, paddingLeft: 2, lineHeight: 19,
  },
  goalCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  goalCardSel:    { borderColor: C.olive, backgroundColor: C.oliveFaded },
  goalCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  levelBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  goalCheckCircle:{ marginTop: 0 },
  blankRow:       { marginBottom: 8 },
  blankLabel:     { fontSize: 11, color: C.dim, marginBottom: 4, letterSpacing: 0.3 },
  blankChipScrollContent: { flexDirection: 'row', gap: 6 },
  blankChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: C.card, borderRadius: 99,
    borderWidth: 1.5, borderColor: C.border,
  },
  blankChipText:  { fontSize: 13, fontWeight: '500', color: C.textMuted },
  goalPreviewText:{ fontSize: 15, color: C.textMuted, lineHeight: 22, marginTop: 2 },

  // Routine cards
  routineCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    marginBottom: 7, borderWidth: 1.5, borderColor: C.border,
  },
  routineCardSel:   { borderColor: C.olive, backgroundColor: C.oliveFaded },
  routineEmoji:     { fontSize: 22, flexShrink: 0 },
  routineText:      { fontSize: 14, color: C.textMuted, flex: 1, lineHeight: 21 },
  routineCheckWrap: {
    width: 26, height: 26, borderRadius: 13, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },

  // Step 6 – complete
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
  prevBtnText:     { fontSize: 14, fontWeight: '600', color: C.textMuted },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
    backgroundColor: C.olive, borderRadius: 999, paddingVertical: 14,
  },
  nextBtnDisabled: { backgroundColor: C.dim, opacity: 0.5 },
  nextBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});
