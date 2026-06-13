// src/components/SideEffectInput.tsx
//
// 정신과 약물 부작용 기록 컴포넌트
//
// 설계 원칙
//   - 임상적 정확도: 정신약리학 6대 부작용 분류 반영
//   - 심리적 안전감: 중립적 언어, 단계적 공개, 비판단적 톤
//   - 저부담 입력: 탭 한 번으로 선택 + 기본 경도 설정 → 진입 장벽 최소화
//   - 중증 감지: '상담 필요' 선택 시 비위협적 권고 배너 노출

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import {
  AlertCircle,
  CheckCircle,
  Circle,
  X,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, T } from '../styles/theme';
import { useAuthStore } from '../store/useAuthStore';
import { pushSideEffectLogs } from '../lib/syncService';

// ── Types ─────────────────────────────────────────────────────────────────────

type SeverityKey = 'mild' | 'moderate' | 'severe';

interface EffectDef {
  readonly id:    string;
  readonly emoji: string;
  readonly label: string;
  readonly sub:   string;
}

interface SeverityDef {
  readonly key:   SeverityKey;
  readonly label: string;
  readonly desc:  string;
  readonly color: string;
  readonly bgDim: string; // 미선택 상태 배경
}

// ── 임상 데이터 ───────────────────────────────────────────────────────────────
// 정신약리학 주요 부작용 6 대분류 (WHO-UMC, CIOMS 분류 기반)

const SIDE_EFFECTS: readonly EffectDef[] = [
  {
    id:    'anticholinergic',
    emoji: '💧',
    label: '입마름 · 변비',
    sub:   '항콜린성 증상',
  },
  {
    id:    'eps',
    emoji: '🫨',
    label: '손떨림 · 안절부절',
    sub:   '추체외로 증상',
  },
  {
    id:    'gi',
    emoji: '🤢',
    label: '속쓰림 · 메스꺼움',
    sub:   '소화기계 반응',
  },
  {
    id:    'sedation',
    emoji: '😪',
    label: '낮 졸림 · 무기력',
    sub:   '진정 작용',
  },
  {
    id:    'weight',
    emoji: '⚖️',
    label: '체중증가 · 식욕변화',
    sub:   '대사 영향',
  },
  {
    id:    'headache',
    emoji: '🤕',
    label: '두통 · 어지러움',
    sub:   '신경계 반응',
  },
] as const;

const SEVERITIES: readonly SeverityDef[] = [
  {
    key:   'mild',
    label: '경도',
    desc:  '일상생활 가능',
    color: C.olive,       // #9BAD80 — 안심 그린
    bgDim: C.oliveFaded,
  },
  {
    key:   'moderate',
    label: '중등도',
    desc:  '불편함',
    color: C.gad7,        // #B0835A — 주의 앰버
    bgDim: '#2E2010',
  },
  {
    key:   'severe',
    label: '중증',
    desc:  '상담 필요',
    color: C.danger,      // #B86868 — 경고 레드
    bgDim: C.dangerDark,
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── EffectCard ────────────────────────────────────────────────────────────────
// 부작용 항목 카드: 탭으로 선택 토글 + 선택 시 심각도 세그먼트 노출

interface EffectCardProps {
  item:       EffectDef;
  isSelected: boolean;
  severity:   SeverityKey | undefined;
  onToggle:   (id: string) => void;
  onSeverity: (id: string, key: SeverityKey) => void;
}

const EffectCard = React.memo(function EffectCard({
  item,
  isSelected,
  severity,
  onToggle,
  onSeverity,
}: EffectCardProps) {
  const scale = useSharedValue(1);
  const cardScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeSv = SEVERITIES.find(sv => sv.key === severity);
  const borderColor = isSelected ? (activeSv?.color ?? C.olive) : C.border;

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.96, { mass: 0.3, stiffness: 400, damping: 20 }),
      withSpring(1,    { mass: 0.3, stiffness: 300, damping: 18 }),
    );
    Haptics.selectionAsync().catch(() => {});
    onToggle(item.id);
  }, [item.id, onToggle, scale]);

  const handleSeverity = useCallback((key: SeverityKey) => {
    Haptics.selectionAsync().catch(() => {});
    onSeverity(item.id, key);
  }, [item.id, onSeverity]);

  return (
    <Animated.View style={[cardScale, cs.cardWrapper]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        style={[
          cs.card,
          isSelected && { borderColor, borderWidth: 1.5, backgroundColor: C.cardRaised },
        ]}
      >
        {/* 항목 헤더 행 */}
        <View style={cs.cardRow}>
          <Text style={cs.emoji}>{item.emoji}</Text>
          <View style={cs.cardTextBlock}>
            <Text style={cs.cardLabel}>{item.label}</Text>
            <Text style={cs.cardSub}>{item.sub}</Text>
          </View>
          {isSelected
            ? <CheckCircle size={20} color={activeSv?.color ?? C.olive} />
            : <Circle       size={20} color={C.dim} />
          }
        </View>

        {/* 심각도 세그먼트 컨트롤 — 선택 시 슬라이드 인 */}
        {isSelected && (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(160)}
            style={cs.segWrap}
          >
            {SEVERITIES.map((sv, idx) => {
              const isActive = severity === sv.key;
              return (
                <TouchableOpacity
                  key={sv.key}
                  activeOpacity={0.8}
                  onPress={() => handleSeverity(sv.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  style={[
                    cs.segBtn,
                    idx === 0                     && cs.segBtnLeft,
                    idx === SEVERITIES.length - 1 && cs.segBtnRight,
                    idx < SEVERITIES.length - 1   && cs.segBtnBorder,
                    isActive
                      ? { backgroundColor: sv.color, borderColor: sv.color }
                      : { backgroundColor: sv.bgDim },
                  ]}
                >
                  <Text style={[cs.segLabel, isActive && cs.segLabelOn]}>
                    {sv.label}
                  </Text>
                  <Text style={[cs.segDesc, isActive && cs.segDescOn]}>
                    {sv.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── SideEffectInput ───────────────────────────────────────────────────────────

export interface SideEffectInputProps {
  visible:  boolean;
  medId:    string;   // Medications.id (string 변환값)
  medName:  string;   // 표시용 약물명
  onClose:  () => void;
  onSaved:  () => void;
}

export default function SideEffectInput({
  visible,
  medId,
  medName,
  onClose,
  onSaved,
}: SideEffectInputProps) {
  const db  = useSQLiteContext();
  const uid = useAuthStore(s => s.session?.user.id ?? null);

  // ── 상태 ──────────────────────────────────────────────────────────────────
  // effectId → 선택된 심각도 레벨
  const [selected, setSelected] = useState<Partial<Record<string, SeverityKey>>>({});
  const [memo,     setMemo]     = useState('');
  const [saving,   setSaving]   = useState(false);

  const selectedCount = Object.keys(selected).length;
  const hasSevere     = Object.values(selected).includes('severe');

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    weekday: 'short',
  });

  // ── 선택 핸들러 (stable refs → EffectCard memo 효과) ─────────────────────
  const handleToggle = useCallback((id: string) => {
    setSelected(prev => {
      if (id in prev) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: 'mild' }; // 첫 선택 시 기본값 '경도'
    });
  }, []);

  const handleSeverity = useCallback((id: string, key: SeverityKey) => {
    setSelected(prev => ({ ...prev, [id]: key }));
  }, []);

  // ── 초기화 ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSelected({});
    setMemo('');
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  // ── 저장 ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (selectedCount === 0) {
      Alert.alert('선택 필요', '경험하신 증상을 하나 이상 선택해 주세요.');
      return;
    }
    setSaving(true);
    const dateKey = localDateKey();
    try {
      // 선택된 부작용 × 심각도 각 1행 삽입
      for (const [id, severityKey] of Object.entries(selected)) {
        const effect = SIDE_EFFECTS.find(e => e.id === id);
        const sv     = SEVERITIES.find(s => s.key === severityKey);
        if (!effect || !sv) continue;

        await db.runAsync(
          'INSERT INTO SideEffectLogs (medId, se, date, memo) VALUES (?, ?, ?, ?)',
          [medId, effect.label, dateKey, sv.label],  // memo = "경도" | "중등도" | "중증"
        );
      }
      // 자유 입력 메모는 별도 행으로 저장
      if (memo.trim()) {
        await db.runAsync(
          'INSERT INTO SideEffectLogs (medId, se, date, memo) VALUES (?, ?, ?, ?)',
          [medId, '메모', dateKey, memo.trim()],
        );
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      handleReset();
      onClose();
      // 낙관적 업데이트 완료 후 백그라운드 Supabase push
      if (uid) {
        pushSideEffectLogs(uid, dateKey, medId, db).catch(() => {});
      }
    } catch {
      Alert.alert('저장 오류', '기록 중 문제가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [selected, selectedCount, memo, medId, db, onSaved, handleReset, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={ms.safe} edges={['top', 'bottom']}>

        {/* ── 헤더 ──────────────────────────────────────────────────────── */}
        <View style={ms.header}>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={12}
            style={ms.closeBtn}
            accessibilityLabel="닫기"
          >
            <X size={22} color={C.textMuted} />
          </TouchableOpacity>
          <Text style={ms.headerTitle}>증상 기록</Text>
          <View style={ms.headerRight} />
        </View>

        {/* ── 약물 컨텍스트 칩 ──────────────────────────────────────────── */}
        <View style={ms.contextChip}>
          <Text style={ms.chipDrug}>💊 {medName}</Text>
          <Text style={ms.chipDate}>{todayLabel}</Text>
        </View>

        <KeyboardAvoidingView
          style={ms.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={ms.scroll}
            contentContainerStyle={ms.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 안내 문구 (비위협적 톤) ────────────────────────────── */}
            <Text style={ms.guide}>
              오늘 불편하셨던 증상이 있으면 편하게 선택해 주세요.{'\n'}
              아무것도 없으면 그냥 닫으셔도 괜찮아요.
            </Text>

            {/* ── 부작용 카드 목록 ────────────────────────────────────── */}
            {SIDE_EFFECTS.map(item => (
              <EffectCard
                key={item.id}
                item={item}
                isSelected={item.id in selected}
                severity={selected[item.id]}
                onToggle={handleToggle}
                onSeverity={handleSeverity}
              />
            ))}

            {/* ── 중증 선택 시 권고 배너 ─────────────────────────────── */}
            {hasSevere && (
              <Animated.View
                entering={FadeIn.duration(320)}
                exiting={FadeOut.duration(200)}
                style={ms.severeBox}
              >
                <AlertCircle size={18} color={C.danger} style={ms.severeIcon} />
                <Text style={ms.severeText}>
                  선택하신 증상 중 '상담 필요' 항목이 있어요.{'\n'}
                  다음 진료 시 의사에게 꼭 말씀해 주세요.{'\n'}
                  혼자 걱정하지 않으셔도 됩니다.
                </Text>
              </Animated.View>
            )}

            {/* ── 자유 메모 ────────────────────────────────────────────── */}
            <View style={ms.memoBlock}>
              <Text style={ms.memoLabel}>💬 추가로 남길 말 (선택)</Text>
              <TextInput
                style={ms.memoInput}
                placeholder="의사에게 전달하고 싶은 내용을 자유롭게 적어주세요."
                placeholderTextColor={C.dim}
                multiline
                maxLength={300}
                value={memo}
                onChangeText={setMemo}
                textAlignVertical="top"
              />
            </View>

            <View style={ms.scrollBottom} />
          </ScrollView>

          {/* ── 저장 푸터 ─────────────────────────────────────────────── */}
          <View style={ms.footer}>
            <TouchableOpacity
              style={[
                ms.saveBtn,
                (saving || selectedCount === 0) && ms.saveBtnOff,
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving || selectedCount === 0}
              accessibilityRole="button"
              accessibilityLabel={`기록 저장, ${selectedCount}개 선택됨`}
            >
              <Text style={ms.saveBtnText}>
                {saving
                  ? '저장 중…'
                  : selectedCount === 0
                    ? '증상을 선택해 주세요'
                    : `기록 저장  ·  ${selectedCount}개 선택됨`}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_RADIUS  = T.radius.md;   // 18
const SEG_RADIUS   = T.radius.sm;   // 12

// ── EffectCard styles
const cs = StyleSheet.create({
  cardWrapper: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: C.card,
    borderRadius:    CARD_RADIUS,
    borderWidth:     1,
    borderColor:     C.border,
    padding:         16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  emoji: {
    fontSize:   28,
    lineHeight: 36,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardLabel: {
    fontSize:      15,
    fontWeight:    '600',
    color:         C.text,
    letterSpacing: -0.2,
    marginBottom:  2,
  },
  cardSub: {
    fontSize: 12,
    color:    C.textMuted,
  },

  // 심각도 세그먼트
  segWrap: {
    flexDirection:  'row',
    marginTop:      14,
    borderRadius:   SEG_RADIUS,
    overflow:       'hidden',
    borderWidth:    1,
    borderColor:    C.border,
  },
  segBtn: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 10,
  },
  segBtnLeft:   { borderTopLeftRadius:  SEG_RADIUS - 1, borderBottomLeftRadius:  SEG_RADIUS - 1 },
  segBtnRight:  { borderTopRightRadius: SEG_RADIUS - 1, borderBottomRightRadius: SEG_RADIUS - 1 },
  segBtnBorder: { borderRightWidth: 0.5, borderRightColor: C.border },
  segLabel: {
    fontSize:     13,
    fontWeight:   '600',
    color:        C.textMuted,
    marginBottom: 2,
  },
  segLabelOn: { color: C.white },
  segDesc: {
    fontSize: 10,
    color:    C.dim,
  },
  segDescOn: { color: 'rgba(255,255,255,0.72)' },
});

// ── Modal styles
const ms = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },

  // 헤더
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  closeBtn:    { padding: 4 },
  headerTitle: {
    fontSize:      16,
    fontWeight:    '600',
    color:         C.text,
    letterSpacing: -0.2,
  },
  headerRight: { width: 30 },

  // 컨텍스트 칩
  contextChip: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  20,
    marginTop:         14,
    marginBottom:      2,
    paddingHorizontal: 16,
    paddingVertical:   10,
    backgroundColor:   C.card,
    borderRadius:      T.radius.sm,
    borderWidth:       0.5,
    borderColor:       C.border,
  },
  chipDrug: {
    fontSize:   14,
    fontWeight: '600',
    color:      C.text,
  },
  chipDate: {
    fontSize: 12,
    color:    C.textMuted,
  },

  // 스크롤
  scroll:        { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop:        16,
    paddingBottom:     8,
  },
  scrollBottom: { height: 20 },

  // 안내
  guide: {
    fontSize:     13,
    color:        C.textMuted,
    lineHeight:   21,
    marginBottom: 18,
  },

  // 중증 배너
  severeBox: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            10,
    marginTop:      4,
    marginBottom:   12,
    backgroundColor: C.dangerDark,
    borderRadius:   T.radius.sm,
    borderWidth:    1,
    borderColor:    C.dangerBorder,
    padding:        14,
  },
  severeIcon: { marginTop: 1 },
  severeText: {
    flex:       1,
    fontSize:   13,
    color:      C.danger,
    lineHeight: 21,
  },

  // 메모
  memoBlock: {
    marginTop: 6,
  },
  memoLabel: {
    fontSize:     14,
    fontWeight:   '500',
    color:        C.text,
    marginBottom: 8,
  },
  memoInput: {
    backgroundColor: C.card,
    borderRadius:    T.radius.sm,
    borderWidth:     1,
    borderColor:     C.border,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:        14,
    color:           C.text,
    minHeight:       88,
    lineHeight:      22,
  },

  // 푸터
  footer: {
    padding:           20,
    paddingTop:        12,
    borderTopWidth:    0.5,
    borderTopColor:    C.border,
    backgroundColor:   C.bg,
  },
  saveBtn: {
    backgroundColor: C.olive,
    borderRadius:    T.radius.sm,
    paddingVertical: 16,
    alignItems:      'center',
    justifyContent:  'center',
  },
  saveBtnOff: {
    backgroundColor: C.card,
    borderWidth:     1,
    borderColor:     C.border,
  },
  saveBtnText: {
    fontSize:      15,
    fontWeight:    '600',
    color:         C.white,
    letterSpacing: -0.2,
  },
});
