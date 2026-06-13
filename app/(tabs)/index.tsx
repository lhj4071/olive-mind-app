// app/(tabs)/index.tsx
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckCircle, ChevronLeft, ChevronRight, Circle, ClipboardList, Leaf, Moon, Search, Settings, Wind, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C as _C } from '../../src/styles/theme';
import { FadeInView } from '../../src/components/DS';
import { refreshWidget } from '../../src/widget/widgetData';
import { fetchLatestGoalSession } from '../../src/lib/syncService';
import { GOALS, ROUTINE_MAP, type Domain } from '../../src/constants/goalData';

// ── Layout constants ──────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const CARD_MX  = 20;
const CARD_PAD = 16;
const THUMB_R  = 14;
const THUMB_D  = THUMB_R * 2;
const TRACK_W  = SCREEN_W - CARD_MX * 2 - CARD_PAD * 2;
const USABLE_W = TRACK_W - THUMB_D;

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  ..._C,
  oliveDark:  _C.oliveDark,
  warmGray:   _C.textMuted,
  warmGrayBg: _C.card,
  textMuted:  _C.textMuted,
} as const;

// ── Olive Tree Tamagotchi System ──────────────────────────────────────────────
const TREE_IMAGES = [
  require('../../assets/images/tree_0.png'),
  require('../../assets/images/tree_1.png'),
  require('../../assets/images/tree_2.png'),
  require('../../assets/images/tree_3.png'),
  require('../../assets/images/tree_4.png'),
  require('../../assets/images/tree_5.png'),
  require('../../assets/images/tree_6.png'),
  require('../../assets/images/tree_7.png'),
];

const TREE_MESSAGES: Record<number, string> = {
  0: '마음의 씨앗이 심어졌어요 🌱',
  1: '새싹이 조금씩 자라나고 있어요 🌿',
  2: '어린 올리브 묘목이에요 🌳',
  3: '뿌리를 내리며 단단해지고 있어요 🌲',
  4: '무럭무럭 자라나는 올리브 나무예요 🌴',
  5: '열매를 맺기 직전이에요! 조금만 더 🌟',
  6: '나무를 눌러 올리브를 수확해주세요 🫒',
  7: '나무가 보살핌을 기다리고 있어요 💧\n기록을 남기면 회복됩니다',
};

const getTreeLevel = (
  carePoints: number,
  harvestedCount: number,
  daysSinceLastLog: number
): number => {
  if (daysSinceLastLog >= 3) return 7;
  const effective = Math.max(0, carePoints - harvestedCount * 5);
  if (effective >= 30) return 6;
  if (effective >= 25) return 5;
  if (effective >= 20) return 4;
  if (effective >= 15) return 3;
  if (effective >= 10) return 2;
  if (effective >= 5)  return 1;
  return 0;
};

// ── Routine Types & Presets ───────────────────────────────────────────────────
interface RoutineItem {
  id:          number;
  label:       string;
  emoji:       string | null;
  targetCount: number;
  orderIndex:  number;
  isActive:    number;
}

interface RoutinePreset { emoji: string; label: string; targetCount: number; }

const ROUTINE_PRESETS: RoutinePreset[] = [
  { emoji: '🌅', label: '물 한 잔 마시기',    targetCount: 1 },
  { emoji: '🌅', label: '5분 스트레칭',       targetCount: 1 },
  { emoji: '🌅', label: '햇빛 쬐기',         targetCount: 1 },
  { emoji: '💊', label: '약 챙겨 먹기',       targetCount: 1 },
  { emoji: '💊', label: '비타민 복용',        targetCount: 1 },
  { emoji: '🧘', label: '복식호흡',          targetCount: 1 },
  { emoji: '🧘', label: '감사한 일 떠올리기', targetCount: 1 },
  { emoji: '🚶', label: '산책 10분',          targetCount: 1 },
  { emoji: '🚶', label: '계단 이용하기',      targetCount: 1 },
  { emoji: '📝', label: '오늘 기분 기록하기', targetCount: 1 },
  { emoji: '📝', label: '일기 쓰기',         targetCount: 1 },
];

// ── Questionnaire data ────────────────────────────────────────────────────────
const PHQ9_QUESTIONS = [
  '일 또는 여가 활동을 하는 데 흥미나 즐거움이 거의 없음',
  '기분이 가라앉거나, 우울하거나, 희망이 없음',
  '잠들기가 어렵거나 자꾸 깨어남, 또는 잠을 너무 많이 잠',
  '피곤함을 느끼거나 기운이 거의 없음',
  '식욕이 없거나 과식을 함',
  '자신이 실패자라는 느낌, 또는 자신이 가족을 실망시켰다는 느낌',
  '신문을 읽거나 TV 보는 것과 같은 일에 집중하기가 어려움',
  '다른 사람들이 알아챌 정도로 거동이나 말이 느려지거나, 반대로 너무 안절부절 못하거나 들뜸',
  '차라리 죽는 것이 나을 것 같다거나, 어떤 식으로든 자해를 하겠다는 생각',
] as const;

const GAD7_QUESTIONS = [
  '불안하거나 초조하거나 조마조마한 느낌',
  '걱정하는 것을 멈추거나 조절할 수가 없음',
  '여러 가지 것들에 대해 걱정을 너무 많이 함',
  '편하게 있기가 어려움',
  '너무 안절부절 못해서 가만히 있기가 힘듦',
  '쉽게 짜증이 나거나 과민해짐',
  '마치 끔찍한 일이 일어날 것 같아 두려움을 느낌',
] as const;

const ANSWER_OPTIONS = [
  { label: '전혀 아니다',        value: 0 },
  { label: '여러 날 동안',        value: 1 },
  { label: '절반 이상의 날 동안', value: 2 },
  { label: '거의 매일',           value: 3 },
] as const;

// ── Score interpretation ──────────────────────────────────────────────────────
interface ScoreLevel { label: string; color: string; desc: string; }

const getPHQ9Level = (s: number): ScoreLevel => {
  if (s <= 4)  return { label: '최소', color: C.olive,  desc: '우울 증상이 거의 없어요. 현재 심리적으로 안정적이에요.' };
  if (s <= 9)  return { label: '경미', color: C.gad7,   desc: '경미한 우울 증상이 있어요. 충분한 휴식과 자기 돌봄을 권장해요.' };
  if (s <= 14) return { label: '중등도', color: '#E07040', desc: '중등도 우울 증상이에요. 전문가 상담을 고려해 보세요.' };
  if (s <= 19) return { label: '중증도', color: '#C0392B', desc: '상당한 우울 증상이에요. 전문가 상담을 강력히 권장해요.' };
  return              { label: '심각',   color: '#8B0000', desc: '심각한 수준이에요. 즉시 전문가 도움을 받으세요.' };
};

const getGAD7Level = (s: number): ScoreLevel => {
  if (s <= 4)  return { label: '최소', color: C.olive,    desc: '불안 증상이 거의 없어요. 심리적으로 안정적이에요.' };
  if (s <= 9)  return { label: '경미', color: C.gad7,     desc: '경미한 불안 증상이에요. 이완 훈련이나 호흡법을 권장해요.' };
  if (s <= 14) return { label: '중등도', color: '#E07040', desc: '중등도 불안 증상이에요. 전문가 상담을 고려해 보세요.' };
  return              { label: '심각',   color: '#C0392B', desc: '심각한 불안 수준이에요. 전문가 도움을 꼭 받으세요.' };
};

// ── Time greeting ─────────────────────────────────────────────────────────────
interface GreetingInfo { text: string; emoji: string; calmBg: string; }

const getGreeting = (): GreetingInfo => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text: '좋은 아침이에요',   emoji: '🌅', calmBg: '#3A5030' };
  if (h >= 12 && h < 17) return { text: '좋은 오후예요',     emoji: '☀️', calmBg: '#465A34' };
  if (h >= 17 && h < 21) return { text: '평온한 저녁이에요', emoji: '🌆', calmBg: '#304428' };
  return                         { text: '편안한 밤 되세요',  emoji: '🌙', calmBg: '#22301C' };
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const localDateKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const shortDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}`;
};

const computeNotifTime = (bedTime: string): string => {
  const [bH, bM] = bedTime.split(':').map(Number);
  let h = bH;
  let m = bM - 30;
  if (m < 0) { m += 60; h -= 1; if (h < 0) h += 24; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ── Types ─────────────────────────────────────────────────────────────────────
type AssessType  = 'PHQ9' | 'GAD7';
type SliderKey   = 'mood' | 'anxiety' | 'irritability' | 'sleep';
type SliderValues = Record<SliderKey, number>;

interface AssessmentRow { id: number; date: string; type: string; score: number; answers: string | null; }
interface MoodLogRow    { id: number; date: string; score: string; tags: string | null; memo: string | null; }
interface SliderDef     { key: SliderKey; label: string; emoji: string; lowText: string; highText: string; color: string; }
interface SliderProps   { value: number; color: string; onCommit: (v: number) => void; }

const DEFAULT_SLIDERS: SliderValues = { mood: 5, anxiety: 5, irritability: 5, sleep: 5 };

const SLIDER_DEFS: SliderDef[] = [
  { key: 'mood',         label: '기분',   emoji: '😊', lowText: '매우 나쁨', highText: '매우 좋음', color: '#7C8C5E' },
  { key: 'anxiety',      label: '불안',   emoji: '😰', lowText: '전혀 없음', highText: '매우 심함', color: '#C4956A' },
  { key: 'irritability', label: '예민도', emoji: '😤', lowText: '전혀 없음', highText: '매우 심함', color: '#A08260' },
  { key: 'sleep',        label: '수면',   emoji: '😴', lowText: '매우 나쁨', highText: '매우 좋음', color: '#6A8CA0' },
];

const EMOTION_TAGS = [
  { id: 'calm',      label: '#평온함'     }, { id: 'happy',     label: '#기쁨'       },
  { id: 'depressed', label: '#우울함'     }, { id: 'anxious',   label: '#불안함'     },
  { id: 'angry',     label: '#화남'       }, { id: 'tired',     label: '#피곤함'     },
  { id: 'hopeful',   label: '#희망적'     }, { id: 'lonely',    label: '#외로움'     },
  { id: 'grateful',  label: '#감사함'     }, { id: 'confused',  label: '#혼란스러움' },
  { id: 'irritable', label: '#예민함'     }, { id: 'numb',      label: '#무감각'     },
  { id: 'excited',   label: '#설렘'       }, { id: 'stable',    label: '#안정적'     },
];

// ── Emotion Dictionary (Russell's Circumplex Model) ──────────────────────────
interface EmotionCategory { subTitle: string; words: string[]; }
interface Quadrant { id: string; title: string; desc: string; color: string; categories: EmotionCategory[]; }

const EMOTION_QUADRANTS: Quadrant[] = [
  {
    id: 'Q1', title: '긍정 · 높은 에너지', desc: '활기차고 긍정적인 감정 상태입니다.', color: '#D68C45',
    categories: [
      { subTitle: '기쁨·만족', words: ['만족스럽다', '흡족하다', '흐뭇하다', '행복하다', '즐겁다', '신바람이 나다', '유쾌하다'] },
      { subTitle: '설렘·흥분', words: ['설레다', '들뜨다', '두근거리다', '짜릿하다', '부풀다', '상기되다'] },
      { subTitle: '열정·자신감', words: ['열광하다', '정열적이다', '활기차다', '자신만만하다', '의기양양하다', '당당하다'] },
      { subTitle: '성취·보람', words: ['뿌듯하다', '보람차다', '벅차다', '성취감'] },
    ],
  },
  {
    id: 'Q2', title: '긍정 · 낮은 에너지', desc: '차분하고 편안한 감정 상태입니다.', color: '#7C8C5E',
    categories: [
      { subTitle: '평온·안정', words: ['평온하다', '고요하다', '아늑하다', '따뜻하다', '포근하다', '잔잔하다', '평화롭다'] },
      { subTitle: '편안·안도', words: ['편안하다', '안도하다', '안심하다', '후련하다', '개운하다', '가뿐하다'] },
      { subTitle: '사랑·호감', words: ['좋아하다', '사랑스럽다', '소중하다', '예쁘다', '애지중지하다'] },
      { subTitle: '수용·신뢰', words: ['인정하다', '수용하다', '허용하다', '믿다', '신뢰하다', '존경하다'] },
    ],
  },
  {
    id: 'Q3', title: '부정 · 높은 에너지', desc: '격양되고 불편한 감정 상태입니다.', color: '#A34D4D',
    categories: [
      { subTitle: '분노·짜증', words: ['화가 나다', '짜증나다', '성이 나다', '부아가 나다', '얄밉다', '괘씸하다', '울화통'] },
      { subTitle: '불안·초조', words: ['불안하다', '초조하다', '조마조마하다', '안절부절못하다', '긴장하다', '스트레스'] },
      { subTitle: '공포·두려움', words: ['두렵다', '무섭다', '겁이 나다', '기겁하다', '경악하다', '떨리다'] },
      { subTitle: '혐오·비난', words: ['역겹다', '혐오스럽다', '모욕감', '원망하다', '탓하다', '복수심'] },
    ],
  },
  {
    id: 'Q4', title: '부정 · 낮은 에너지', desc: '가라앉고 소진된 감정 상태입니다.', color: '#6A8CA0',
    categories: [
      { subTitle: '우울·무기력', words: ['우울하다', '울적하다', '침울하다', '무기력하다', '지치다', '탈진하다'] },
      { subTitle: '슬픔·비통', words: ['슬프다', '구슬프다', '애통하다', '비통하다', '참담하다', '처절하다'] },
      { subTitle: '외로움·고독', words: ['외롭다', '쓸쓸하다', '적적하다', '소외감', '고립감', '상실감'] },
      { subTitle: '실망·수치심', words: ['실망하다', '낙담하다', '좌절하다', '죄책감', '수치스럽다', '후회하다'] },
    ],
  },
];

// ── CustomSlider infrastructure ───────────────────────────────────────────────

// TextInput을 Reanimated 애니메이션 컴포넌트로 승격
// (createAnimatedComponent는 모듈 레벨에서 한 번만 호출해야 함)
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// 초기 데이터 로드 시 thumb 위치 복원용 스프링 설정
const SPRING_SNAP_CFG = { mass: 0.4, damping: 20, stiffness: 200 } as const;

// ── CustomSlider ──────────────────────────────────────────────────────────────
const CustomSlider = React.memo(({ value, color, onCommit }: SliderProps) => {
  // ── Shared Values (UI 스레드 전용) ──────────────────────────────────────────
  const thumbX     = useSharedValue(((value - 1) / 9) * USABLE_W);
  const startX     = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // 외부 committed value 동기화 (앱 로드 시 저장된 값으로 thumb 이동)
  // diff > 0.5px 일 때만 스프링 실행 → onCommit 직후 재진입(no-op) 방지
  useEffect(() => {
    const target = ((value - 1) / 9) * USABLE_W;
    if (Math.abs(thumbX.value - target) > 0.5) {
      thumbX.value = withSpring(target, SPRING_SNAP_CFG);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Derived snap value (Worklet 전용, JS 브리지 없음) ───────────────────────
  const snapVal = useDerivedValue(() =>
    Math.round((thumbX.value / USABLE_W) * 9 + 1)
  );

  // ── Haptic: 정수 눈금 돌파 시 1회 → runOnJS 최소화 ──────────────────────────
  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  useAnimatedReaction(
    () => snapVal.value,
    (curr, prev) => {
      if (isDragging.value && prev !== null && curr !== prev) {
        runOnJS(triggerHaptic)();
      }
    },
  );

  // ── Pan 제스처 (드래그 중 runOnJS 0회, onEnd 1회) ──────────────────────────
  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value     = thumbX.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      // 순수 Worklet: SharedValue 변경만, JS 브리지 미사용
      thumbX.value = Math.max(0, Math.min(USABLE_W, startX.value + e.translationX));
    })
    .onEnd(() => {
      isDragging.value = false;
      runOnJS(onCommit)(snapVal.value); // 제스처당 단 1회
    })
    .onFinalize(() => {
      // 취소·인터럽트된 제스처에서도 isDragging 보장 초기화
      isDragging.value = false;
    });

  // ── Animated styles (Worklet) ────────────────────────────────────────────────
  const thumbAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));
  const fillAnim = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  // ── Animated text label (Worklet → TextInput value prop 직접 바인딩) ─────────
  // JS re-render 없이 드래그 중 숫자가 실시간 업데이트됨
  const labelProps = useAnimatedProps(() => ({
    value: String(snapVal.value),
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={sl.wrapper}>
        <View style={sl.trackBg} />
        <Animated.View style={[sl.trackFill, { backgroundColor: color }, fillAnim]} />
        <Animated.View style={[sl.thumb, { borderColor: color, shadowColor: color }, thumbAnim]}>
          <AnimatedTextInput
            animatedProps={labelProps}
            editable={false}
            caretHidden
            style={[sl.thumbLabel, { color }]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

const sl = StyleSheet.create({
  wrapper:   { width: TRACK_W, height: THUMB_D + 4, justifyContent: 'center' },
  trackBg:   { position: 'absolute', left: THUMB_R, right: THUMB_R, height: 6, borderRadius: 3, backgroundColor: C.border },
  trackFill: { position: 'absolute', left: THUMB_R, height: 6, borderRadius: 3 },
  thumb:     { position: 'absolute', width: THUMB_D, height: THUMB_D, borderRadius: THUMB_R, backgroundColor: C.white, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  thumbLabel: {
    fontSize:           11,
    fontWeight:         '700',
    textAlign:          'center',
    padding:            0,
    includeFontPadding: false,   // Android 행간 여백 제거
    borderWidth:        0,
    backgroundColor:    'transparent',
  },
});

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const db = useSQLiteContext();

  // ── Mood state ────────────────────────────────────────────────────────────
  const [sliders,    setSliders]    = useState<SliderValues>(DEFAULT_SLIDERS);
  const [emotions,   setEmotions]   = useState<Set<string>>(new Set());
  const [note,       setNote]       = useState('');
  const [todayLogId, setTodayLogId] = useState<number | null>(null);

  // ── Assessment state ──────────────────────────────────────────────────────
  const [assessModal,        setAssessModal]        = useState<AssessType | null>(null);
  const [assessPickerVisible, setAssessPickerVisible] = useState(false);
  const [questionIdx,        setQuestionIdx]        = useState(0);
  const [answers,            setAnswers]            = useState<number[]>([]);
  const [savingAssess,       setSavingAssess]       = useState(false);

  // ── Assessment history ────────────────────────────────────────────────────
  const [phq9Latest,  setPhq9Latest]  = useState<AssessmentRow | null>(null);
  const [gad7Latest,  setGad7Latest]  = useState<AssessmentRow | null>(null);
  const [phq9History, setPhq9History] = useState<AssessmentRow[]>([]);
  const [gad7History, setGad7History] = useState<AssessmentRow[]>([]);

  // ── Emotion Dictionary state ──────────────────────────────────────────────
  const [emotionModalVisible, setEmotionModalVisible] = useState(false);
  const [dictStep,            setDictStep]            = useState<1 | 2 | 3>(1);
  const [selectedQuadrant,    setSelectedQuadrant]    = useState<Quadrant | null>(null);
  const [selectedCategory,    setSelectedCategory]    = useState<EmotionCategory | null>(null);

  // ── Sleep settings state ──────────────────────────────────────────────────
  const [sleepBed,           setSleepBed]           = useState('23:00');
  const [sleepWake,          setSleepWake]          = useState('06:00');
  const [sleepActive,        setSleepActive]        = useState(false);
  const [sleepSettingsModal, setSleepSettingsModal]  = useState(false);
  const [sleepBedInput,      setSleepBedInput]       = useState('23:00');
  const [sleepWakeInput,     setSleepWakeInput]      = useState('06:00');

  // ── Care Points & Olive Tree ──────────────────────────────────────────────
  const [carePoints,       setCarePoints]       = useState(0);
  const [harvestedCount,   setHarvestedCount]   = useState(0);
  const [daysSinceLastLog, setDaysSinceLastLog] = useState(0);

  const treeEntryScale = useSharedValue(0);
  const treeEntryStyle = useAnimatedStyle(() => ({
    transform:       [{ scale: treeEntryScale.value }],
    backgroundColor: 'transparent',
  }));

  const harvestBlink = useSharedValue(0);
  const harvestBlinkStyle = useAnimatedStyle(() => ({
    opacity:         harvestBlink.value,
    backgroundColor: 'rgba(214,140,69,0.25)',
    borderRadius:    50,
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  }));

  // ── Goal check-in card state ──────────────────────────────────────────────
  const [hasGoalSession, setHasGoalSession] = useState(false);
  const [goalCount,      setGoalCount]      = useState(0);
  // routineLabel → goalText 역방향 맵 (배지 표시용)
  const [goalLabelMap,   setGoalLabelMap]   = useState<Record<string, string>>({});

  // ── Routine state & animations ────────────────────────────────────────────
  const [routineItems,     setRoutineItems]     = useState<RoutineItem[]>([]);
  const [routineCounts,    setRoutineCounts]    = useState<Map<number, number>>(new Map());
  const [routineEditModal, setRoutineEditModal] = useState(false);
  const [newRoutineEmoji,  setNewRoutineEmoji]  = useState('');
  const [newRoutineLabel,  setNewRoutineLabel]  = useState('');
  const [newRoutineTarget, setNewRoutineTarget] = useState(1);
  const routineScaleAnims = useRef<RNAnimated.Value[]>([]);

  const greeting = getGreeting();
  const todayFull = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadMoodLog = useCallback(async () => {
    const row = await db.getFirstAsync<MoodLogRow>('SELECT * FROM MoodLogs WHERE date = ?', [localDateKey()]);
    if (!row) return;
    setTodayLogId(row.id);
    try {
      const parsed = JSON.parse(row.score);
      if (typeof parsed === 'object' && parsed !== null) setSliders({ ...DEFAULT_SLIDERS, ...parsed });
      else if (typeof parsed === 'number') setSliders(prev => ({ ...prev, mood: parsed }));
    } catch {
      const raw = Number(row.score);
      if (!isNaN(raw)) setSliders(prev => ({ ...prev, mood: raw }));
    }
    try { setEmotions(new Set(JSON.parse(row.tags ?? '[]') as string[])); } catch { /* ignore */ }
    setNote(row.memo ?? '');
  }, [db]);

  const loadAssessmentData = useCallback(async () => {
    const [latest9, latest7, hist9, hist7] = await Promise.all([
      db.getFirstAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='PHQ9' ORDER BY date DESC LIMIT 1"),
      db.getFirstAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='GAD7' ORDER BY date DESC LIMIT 1"),
      db.getAllAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='PHQ9' ORDER BY date ASC"),
      db.getAllAsync<AssessmentRow>("SELECT * FROM AssessmentLogs WHERE type='GAD7' ORDER BY date ASC"),
    ]);
    setPhq9Latest(latest9 ?? null);
    setGad7Latest(latest7 ?? null);
    setPhq9History(hist9.slice(-8));
    setGad7History(hist7.slice(-8));
  }, [db]);

  const loadSleepSettings = useCallback(async () => {
    const row = await db.getFirstAsync<{ bedTime: string; wakeTime: string; isActive: number }>(
      'SELECT bedTime, wakeTime, isActive FROM SleepSettings LIMIT 1'
    );
    if (row) {
      setSleepBed(row.bedTime);
      setSleepWake(row.wakeTime);
      setSleepActive(row.isActive === 1);
      setSleepBedInput(row.bedTime);
      setSleepWakeInput(row.wakeTime);
    }
  }, [db]);

  const loadRoutineItems = useCallback(async () => {
    const items = await db.getAllAsync<RoutineItem>(
      'SELECT * FROM RoutineItems WHERE isActive = 1 ORDER BY orderIndex ASC'
    );
    setRoutineItems(items);
  }, [db]);

  const loadRoutineLog = useCallback(async () => {
    const row = await db.getFirstAsync<{ completed: string }>(
      'SELECT completed FROM RoutineLogs WHERE date = ?', [localDateKey()]
    );
    try {
      const parsed: unknown = row ? JSON.parse(row.completed) : {};
      if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        const entries = Object.entries(parsed as Record<string, unknown>)
          .map(([k, v]): [number, number] => [Number(k), Number(v)]);
        setRoutineCounts(new Map(entries));
      } else {
        setRoutineCounts(new Map());
      }
    } catch { setRoutineCounts(new Map()); }
  }, [db]);

  const loadCarePoints = useCallback(async () => {
    try {
      const [moodCntRow, breathCntRow, latestMoodRow, latestBreathRow, statsRow] = await Promise.all([
        db.getFirstAsync<{ moodCount: number }>('SELECT COUNT(*) as moodCount FROM MoodLogs'),
        db.getFirstAsync<{ breathCount: number | null }>('SELECT SUM(count) as breathCount FROM BreathingLogs'),
        db.getFirstAsync<{ latestDate: string | null }>('SELECT MAX(date) as latestDate FROM MoodLogs'),
        db.getFirstAsync<{ latestDate: string | null }>('SELECT MAX(date) as latestDate FROM BreathingLogs'),
        db.getFirstAsync<{ value: number }>('SELECT value FROM UserStats WHERE key = ?', ['harvestedOlives']),
      ]);

      setCarePoints((moodCntRow?.moodCount ?? 0) + (breathCntRow?.breathCount ?? 0));
      setHarvestedCount(statsRow?.value ?? 0);

      // 마지막 활동일 계산
      const latestMood   = latestMoodRow?.latestDate   ?? null;
      const latestBreath = latestBreathRow?.latestDate ?? null;
      const latestDate   = [latestMood, latestBreath].filter(Boolean).sort().pop();
      if (latestDate) {
        const diffMs   = Date.now() - new Date(latestDate + 'T00:00:00').getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));
        setDaysSinceLastLog(diffDays);
      } else {
        setDaysSinceLastLog(0);
      }
    } catch {
      setCarePoints(0);
      setHarvestedCount(0);
      setDaysSinceLastLog(0);
    }
  }, [db]);

  useEffect(() => {
    loadMoodLog();
    loadAssessmentData();
    loadSleepSettings();
    loadRoutineItems();
    loadRoutineLog();
    loadCarePoints();
  }, [loadMoodLog, loadAssessmentData, loadSleepSettings, loadRoutineItems, loadRoutineLog, loadCarePoints]);

  // 치료 목표 세션 로드 → 체크인 카드 + goalLabelMap
  const loadGoalData = useCallback(async () => {
    try {
      const { data: { session } } = await (await import('../../src/lib/supabase')).supabase.auth.getSession();
      if (!session) return;
      const gs = await fetchLatestGoalSession(session.user.id);
      if (!gs) { setHasGoalSession(false); setGoalLabelMap({}); return; }

      const count = Object.values(gs.selectedGoals).flat().length;
      setHasGoalSession(count > 0);
      setGoalCount(count);

      // routineLabel → goalText 역방향 맵
      const map: Record<string, string> = {};
      for (const domain of gs.selectedDomains as Domain[]) {
        for (const goalId of gs.selectedGoals[domain] ?? []) {
          const goalObj = GOALS[domain]?.find(g => g.id === goalId);
          if (!goalObj || goalObj.is_custom) continue;
          for (const r of ROUTINE_MAP[goalId] ?? []) {
            map[r.text] = goalObj.text;
          }
        }
      }
      setGoalLabelMap(map);
    } catch { /* 오프라인 시 무시 */ }
  }, []);

  useEffect(() => { loadGoalData(); }, [loadGoalData]);

  // GoalSettingScreen에서 돌아올 때 루틴 + 목표 맵 즉시 갱신
  useFocusEffect(useCallback(() => {
    loadRoutineItems();
    loadGoalData();
  }, [loadRoutineItems, loadGoalData]));

  // Olive tree entrance animation on mount
  useEffect(() => {
    treeEntryScale.value = withSpring(1, { mass: 0.7, damping: 12, stiffness: 150 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Level-6 harvest blink animation
  useEffect(() => {
    const level = getTreeLevel(carePoints, harvestedCount, daysSinceLastLog);
    if (level === 6) {
      harvestBlink.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    } else {
      harvestBlink.value = withTiming(0, { duration: 300 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carePoints, harvestedCount, daysSinceLastLog]);

  // Grow scale anim pool to match current item count
  useEffect(() => {
    while (routineScaleAnims.current.length < routineItems.length) {
      routineScaleAnims.current.push(new RNAnimated.Value(1));
    }
  }, [routineItems]);

  // ── Harvest action ────────────────────────────────────────────────────────
  const handleHarvest = useCallback(async () => {
    if (getTreeLevel(carePoints, harvestedCount, daysSinceLastLog) !== 6) return;
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* ignore */ }
    try {
      await db.runAsync(
        `INSERT INTO UserStats (key, value) VALUES ('harvestedOlives', 1)
         ON CONFLICT(key) DO UPDATE SET value = value + 1`
      );
      setHarvestedCount(prev => prev + 1);
      refreshWidget(db).catch(() => {});
      Alert.alert('수확 완료! 🫒', '올리브를 수확했습니다!\n오늘도 자신을 잘 돌봐주었어요.');
    } catch {
      Alert.alert('오류', '수확 중 문제가 발생했습니다.');
    }
  }, [carePoints, harvestedCount, daysSinceLastLog, db]);

  // ── Mood handlers ─────────────────────────────────────────────────────────
  const onSliderChange = useCallback((key: SliderKey, val: number) => {
    setSliders(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleEmotion = useCallback((id: string) => {
    setEmotions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Routine toggle ────────────────────────────────────────────────────────
  const adjustRoutineCount = useCallback(async (id: number, delta: number, idx: number) => {
    const item = routineItems.find(r => r.id === id);
    if (!item) return;
    const current = routineCounts.get(id) ?? 0;
    const next    = Math.max(0, Math.min(item.targetCount, current + delta));
    if (next === current) return;

    const newCounts = new Map(routineCounts);
    newCounts.set(id, next);
    setRoutineCounts(newCounts);

    const anim = routineScaleAnims.current[idx];
    if (anim) {
      RNAnimated.sequence([
        RNAnimated.spring(anim, { toValue: 1.12, useNativeDriver: true, speed: 50, bounciness: 8 }),
        RNAnimated.spring(anim, { toValue: 1.0,  useNativeDriver: true, speed: 50, bounciness: 4 }),
      ]).start();
    }

    const obj: Record<string, number> = {};
    newCounts.forEach((v, k) => { obj[String(k)] = v; });
    await db.runAsync(
      `INSERT INTO RoutineLogs (date, completed) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET completed = excluded.completed`,
      [localDateKey(), JSON.stringify(obj)]
    );
    refreshWidget(db).catch(() => {});
  }, [routineItems, routineCounts, db]);

  const addRoutineItem = useCallback(async () => {
    const label = newRoutineLabel.trim();
    if (!label) { Alert.alert('입력 오류', '루틴 이름을 입력해 주세요.'); return; }
    const maxOrder = routineItems.length > 0 ? Math.max(...routineItems.map(r => r.orderIndex)) : -1;
    await db.runAsync(
      'INSERT INTO RoutineItems (label, emoji, targetCount, orderIndex, isActive) VALUES (?, ?, ?, ?, 1)',
      [label, newRoutineEmoji || null, newRoutineTarget, maxOrder + 1]
    );
    setNewRoutineLabel('');
    setNewRoutineEmoji('');
    setNewRoutineTarget(1);
    await loadRoutineItems();
  }, [newRoutineLabel, newRoutineEmoji, newRoutineTarget, routineItems, db, loadRoutineItems]);

  const deleteRoutineItem = useCallback(async (id: number) => {
    await db.runAsync('UPDATE RoutineItems SET isActive = 0 WHERE id = ?', [id]);
    await loadRoutineItems();
  }, [db, loadRoutineItems]);

  const addPresetRoutine = useCallback(async (preset: RoutinePreset) => {
    if (routineItems.some(r => r.label === preset.label)) return;
    const maxOrder = routineItems.length > 0 ? Math.max(...routineItems.map(r => r.orderIndex)) : -1;
    await db.runAsync(
      'INSERT INTO RoutineItems (label, emoji, targetCount, orderIndex, isActive) VALUES (?, ?, ?, ?, 1)',
      [preset.label, preset.emoji, preset.targetCount, maxOrder + 1]
    );
    await loadRoutineItems();
  }, [routineItems, db, loadRoutineItems]);

  const handleSave = async () => {
    if (emotions.size === 0) { Alert.alert('감정 선택 필요', '감정 태그를 하나 이상 선택해 주세요.'); return; }
    const scoreJson = JSON.stringify(sliders);
    const tagsJson  = JSON.stringify([...emotions]);
    if (todayLogId !== null) {
      await db.runAsync('UPDATE MoodLogs SET score=?,tags=?,memo=? WHERE id=?', [scoreJson, tagsJson, note, todayLogId]);
    } else {
      const r = await db.runAsync('INSERT INTO MoodLogs (date,score,tags,memo) VALUES (?,?,?,?)', [localDateKey(), scoreJson, tagsJson, note]);
      setTodayLogId(r.lastInsertRowId);
    }
    refreshWidget(db).catch(() => {});
    Alert.alert('저장 완료', '오늘의 기록이 안전하게 저장되었습니다.');
  };

  // ── Sleep settings handler ────────────────────────────────────────────────
  const saveSleepSettings = async () => {
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRe.test(sleepBedInput) || !timeRe.test(sleepWakeInput)) {
      Alert.alert('형식 오류', '시간은 HH:MM 형식으로 입력해 주세요.\n예: 23:00, 06:30');
      return;
    }

    // Cancel previous sleep bedtime notification
    const existing = await db.getFirstAsync<{ id: number; notifId: string | null }>(
      'SELECT id, notifId FROM SleepSettings LIMIT 1'
    );
    if (existing?.notifId) {
      await Notifications.cancelScheduledNotificationAsync(existing.notifId).catch(() => {});
    }

    // Schedule new daily notification 30 min before bedtime
    const notifTime = computeNotifTime(sleepBedInput);
    const [nH, nM]  = notifTime.split(':').map(Number);
    let notifId: string | null = null;
    try {
      notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 수면 준비 시간',
          body: '이제 스마트폰을 내려놓고 방해금지 모드를 켤 시간이에요. 🌙',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: nH,
          minute: nM,
          repeats: true,
        },
      });
    } catch { /* notifications may not be available in all environments */ }

    if (existing) {
      await db.runAsync(
        'UPDATE SleepSettings SET bedTime=?, wakeTime=?, isActive=1, notifId=? WHERE id=?',
        [sleepBedInput, sleepWakeInput, notifId, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO SleepSettings (bedTime, wakeTime, isActive, notifId) VALUES (?, ?, 1, ?)',
        [sleepBedInput, sleepWakeInput, notifId]
      );
    }

    setSleepBed(sleepBedInput);
    setSleepWake(sleepWakeInput);
    setSleepActive(true);
    setSleepSettingsModal(false);
    Alert.alert('저장 완료', `매일 ${notifTime}에 취침 준비 알림이 울립니다. 🌙`);
  };

  // ── Assessment handlers ───────────────────────────────────────────────────
  const openAssessment = (type: AssessType) => {
    setAssessPickerVisible(false);
    setAssessModal(type);
    setQuestionIdx(0);
    setAnswers([]);
    setSavingAssess(false);
  };

  const currentQuestions = assessModal === 'PHQ9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const assessIsComplete = questionIdx >= currentQuestions.length;

  const handleSelectAnswer = useCallback((value: number) => {
    setAnswers(prev => {
      const next = [...prev];
      next[questionIdx] = value;
      return next;
    });
    if (questionIdx < currentQuestions.length - 1) {
      setTimeout(() => setQuestionIdx(i => i + 1), 180);
    } else {
      setQuestionIdx(currentQuestions.length); // show result
    }
  }, [questionIdx, currentQuestions.length]);

  const handleSaveAssessment = useCallback(async (finalAnswers: number[], type: AssessType) => {
    if (savingAssess) return;
    setSavingAssess(true);
    const score   = finalAnswers.reduce((a, b) => a + b, 0);
    const dateKey = localDateKey();

    try {
      await db.runAsync(
        'INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)',
        [dateKey, type, score, JSON.stringify(finalAnswers)]
      );
    } catch { /* ignore duplicate */ }

    // PHQ-9 Q9 (자해 사고) 경고
    if (type === 'PHQ9' && finalAnswers[8] > 0) {
      setTimeout(() => Alert.alert(
        '⚠️ 중요 안내',
        '자신을 해칠 생각이 있으신 것 같아요.\n즉시 전문가의 도움을 받으세요.\n\n☎ 정신건강 위기상담 전화: 109',
        [{ text: '확인' }]
      ), 400);
    }

    // 2주 후 정기 검사 알림 예약
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌿 정기 심리 검사 알림',
          body: '2주가 지났어요. PHQ-9 · GAD-7 검사를 다시 진행해 보세요.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 14 * 24 * 60 * 60,
        },
      });
    } catch { /* ignore */ }

    await loadAssessmentData();
  }, [db, savingAssess, loadAssessmentData]);

  // answers가 모두 채워진 순간(마지막 문항 선택 직후) 저장 트리거
  useEffect(() => {
    if (assessIsComplete && answers.length === currentQuestions.length && assessModal && !savingAssess) {
      handleSaveAssessment([...answers], assessModal);
    }
  }, [assessIsComplete, answers, currentQuestions.length, assessModal, savingAssess, handleSaveAssessment]);

  // ── Chart helper ──────────────────────────────────────────────────────────
  const makeChartData = (history: AssessmentRow[], maxScore: number) => {
    const raw    = history.map(r => r.score);
    const data   = raw.length >= 2 ? raw : raw.length === 1 ? [0, ...raw] : [0, 0];
    const labels = history.length >= 2
      ? history.map(r => shortDate(r.date))
      : ['시작', '현재'];
    const maxRef = Array(data.length).fill(maxScore);
    return { data, labels, maxRef };
  };

  // ── Renders ───────────────────────────────────────────────────────────────

  const renderSleepSection = () => {
    const notifTime = sleepActive ? computeNotifTime(sleepBed) : null;
    return (
      <TouchableOpacity
        style={s.sleepCompactRow}
        onPress={() => {
          setSleepBedInput(sleepBed);
          setSleepWakeInput(sleepWake);
          setSleepSettingsModal(true);
        }}
        activeOpacity={0.8}
      >
        <Moon size={15} color={sleepActive ? C.olive : C.textMuted} />
        <Text style={s.sleepCompactText}>
          {sleepActive
            ? `취침 ${sleepBed} · 기상 ${sleepWake}${notifTime ? `  · 알림 ${notifTime}` : ''}`
            : '수면 루틴 미설정 — 탭하여 설정'}
        </Text>
        <Settings size={13} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderSleepSettingsModal = () => (
    <Modal
      visible={sleepSettingsModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setSleepSettingsModal(false)}
    >
      <SafeAreaView style={s.modalSafe}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setSleepSettingsModal(false)} style={s.modalCloseBtn}>
            <Text style={s.modalCloseTxt}>닫기</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>수면 루틴 설정</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.modalContent}>
          <View style={s.sleepInputCard}>
            <View style={{ marginBottom: 12 }}>
              <Moon size={20} color={C.olive} />
            </View>
            <Text style={s.sleepInputLabel}>취침 시간</Text>
            <TextInput
              style={s.sleepInput}
              value={sleepBedInput}
              onChangeText={setSleepBedInput}
              placeholder="23:00"
              placeholderTextColor={C.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={s.sleepInputHint}>24시간 형식 (예: 23:00, 00:30)</Text>

            <View style={s.sleepDivider} />

            <Text style={s.sleepInputLabel}>기상 시간</Text>
            <TextInput
              style={s.sleepInput}
              value={sleepWakeInput}
              onChangeText={setSleepWakeInput}
              placeholder="06:00"
              placeholderTextColor={C.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={s.sleepInputHint}>24시간 형식 (예: 06:00, 07:30)</Text>
          </View>

          {sleepBedInput.match(/^([01]\d|2[0-3]):([0-5]\d)$/) && (
            <View style={s.sleepPreviewBox}>
              <Text style={s.sleepPreviewText}>
                💡 매일 {computeNotifTime(sleepBedInput)}에 취침 준비 알림이 울립니다.
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={saveSleepSettings} activeOpacity={0.85} style={{ borderRadius: 100, overflow: 'hidden' }}>
            <LinearGradient colors={['#4A5D73', '#29384D']} style={s.saveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.saveBtnText}>수면 루틴 저장하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderAssessPickerModal = () => (
    <Modal
      visible={assessPickerVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setAssessPickerVisible(false)}
    >
      <SafeAreaView style={s.modalSafe}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setAssessPickerVisible(false)} style={s.modalCloseBtn}>
            <X size={20} color={C.warmGray} />
          </TouchableOpacity>
          <Text style={s.modalTitle}>정기 심리 검사</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.modalContent}>
          <Text style={[s.sectionSub, { marginTop: 0 }]}>2주마다 진행하면 변화 추이를 확인할 수 있어요.</Text>
          {renderAssessCard('PHQ9')}
          {renderAssessCard('GAD7')}
          {(phq9History.length >= 2 || gad7History.length >= 2) && (
            <Text style={[s.sectionHeading, { marginTop: 20 }]}>검사 결과 추이</Text>
          )}
          {phq9History.length >= 1 && (
            <View style={s.card}>
              <Text style={[s.cardTitle, { color: C.phq9 }]}>PHQ-9 우울증 추이</Text>
              <Text style={s.cardDesc}>최근 {phq9History.length}회 기록 (최고 27점)</Text>
              {renderMiniChart(phq9History, 27, C.phq9, 'PHQ-9')}
            </View>
          )}
          {gad7History.length >= 1 && (
            <View style={s.card}>
              <Text style={[s.cardTitle, { color: C.gad7 }]}>GAD-7 불안 추이</Text>
              <Text style={s.cardDesc}>최근 {gad7History.length}회 기록 (최고 21점)</Text>
              {renderMiniChart(gad7History, 21, C.gad7, 'GAD-7')}
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderCalmZone = () => {
    const treeLevel    = getTreeLevel(carePoints, harvestedCount, daysSinceLastLog);
    const isHarvestable = treeLevel === 6;
    const isWithered    = treeLevel === 7;
    const message       = TREE_MESSAGES[treeLevel] ?? '';

    return (
      <View style={[s.calmZone, { backgroundColor: greeting.calmBg }]}>
        <View style={s.calmRow}>
          {/* ── 좌측: 인사말 ── */}
          <View style={s.calmLeft}>
            <Text style={s.calmEmoji}>{greeting.emoji}</Text>
            <Text style={s.calmGreeting}>{greeting.text}</Text>
            <Text style={s.calmDate}>{todayFull}</Text>
            <Text style={s.calmQuestion}>
              {todayLogId !== null ? '오늘 기록이 저장되어 있어요 🌿' : '오늘 하루 어떠셨나요?'}
            </Text>
          </View>

          {/* ── 우측: 올리브 나무 ── */}
          <View style={s.calmRight}>
            {/* 수확 인벤토리 배지 */}
            <View style={s.careBadge}>
              <Text style={s.careBadgeText}>🫒 수확한 올리브: {harvestedCount}개</Text>
            </View>

            {/* 나무 이미지 (수확 가능 시 터치 가능) */}
            <TouchableOpacity
              onPress={isHarvestable ? handleHarvest : undefined}
              activeOpacity={isHarvestable ? 0.75 : 1}
              style={{ backgroundColor: 'transparent' }}
            >
              <Animated.View
                style={[s.treeContainer, treeEntryStyle, { backgroundColor: 'transparent' }]}
              >
                {isHarvestable && <Animated.View style={harvestBlinkStyle} />}
                <Image
                  source={TREE_IMAGES[treeLevel]}
                  style={s.treeImage}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* 단계 메시지 */}
            <Text style={[
              s.treeMessage,
              isHarvestable && s.treeMessageHarvest,
              isWithered     && s.treeMessageWithered,
            ]}>
              {message}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAnxietyBanner = () => {
    if (sliders.anxiety < 7) return null;
    return (
      <TouchableOpacity
        style={s.anxietyBanner}
        onPress={() => router.navigate('/(tabs)/tools')}
        activeOpacity={0.85}
      >
        <View style={s.anxietyBannerLeft}>
          <Wind size={18} color={C.oliveDark} />
          <View style={{ flex: 1 }}>
            <Text style={s.anxietyBannerTitle}>많이 힘드시군요</Text>
            <Text style={s.anxietyBannerDesc}>4-6 호흡법을 시도해 보시겠어요?</Text>
          </View>
        </View>
        <ChevronRight size={16} color={C.oliveDark} />
      </TouchableOpacity>
    );
  };

  // ── 주간 체크인 카드 ─────────────────────────────────────────────────────
  const renderCheckInCard = () => {
    if (!hasGoalSession) return null;
    return (
      <TouchableOpacity
        style={s.checkInCard}
        onPress={() => router.push('/goal-checkin' as any)}
        activeOpacity={0.85}
      >
        <View style={s.checkInLeft}>
          <Text style={s.checkInIcon}>🌿</Text>
          <View>
            <Text style={s.checkInTitle}>주간 체크인</Text>
            <Text style={s.checkInDesc}>{goalCount}개의 목표를 점검할 수 있어요</Text>
          </View>
        </View>
        <ChevronRight size={18} color={C.olive} />
      </TouchableOpacity>
    );
  };

  // ── 오늘의 미니 루틴 ─────────────────────────────────────────────────────
  const renderDailyRoutines = () => {
    const total     = routineItems.length;
    const doneCount = routineItems.filter(item => (routineCounts.get(item.id) ?? 0) >= item.targetCount).length;
    const allDone   = total > 0 && doneCount === total;
    const fillPct   = total > 0 ? doneCount / total : 0;

    return (
      <>
        <View style={s.sectionHeadingRow}>
          <Text style={s.sectionHeading}>오늘의 미니 루틴</Text>
          <TouchableOpacity onPress={() => setRoutineEditModal(true)} style={s.routineSettingsBtn} activeOpacity={0.7}>
            <Settings size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={s.sectionSub}>작은 행동 하나가 회복의 시작입니다.</Text>

        <View style={s.routineCard}>
          {total === 0 ? (
            <View style={s.routineEmptyWrap}>
              <Text style={s.routineEmptyText}>아직 설정된 루틴이 없어요</Text>
              <Text style={s.routineEmptyDesc}>오늘 하루, 잠시 쉬어가는 건 어떨까요?</Text>
              {/* 치료 목표 설정 CTA */}
              <TouchableOpacity
                style={s.routineGoalCta}
                onPress={() => router.push('/goal-setting' as any)}
                activeOpacity={0.85}
              >
                <Text style={s.routineGoalCtaText}>🎯 나의 치료 목표와 루틴 설정하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.routineEmptyBtn} onPress={() => setRoutineEditModal(true)} activeOpacity={0.8}>
                <Text style={s.routineEmptyBtnText}>직접 루틴 추가하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.routineProgressTrack}>
                <View style={[s.routineProgressFill, { width: `${fillPct * 100}%` as any }]} />
              </View>
              <Text style={s.routineProgressLabel}>{doneCount} / {total} 완료</Text>

              {routineItems.map((item, idx) => {
                const current    = routineCounts.get(item.id) ?? 0;
                const done       = current >= item.targetCount;
                const isToggle   = item.targetCount === 1;
                const animVal    = routineScaleAnims.current[idx];
                const linkedGoal = goalLabelMap[item.label];

                return (
                  <RNAnimated.View
                    key={item.id}
                    style={[
                      s.routineItem,
                      idx > 0 && s.routineItemBorder,
                      animVal ? { transform: [{ scale: animVal }] } : undefined,
                    ]}
                  >
                    <View style={s.routineItemInner}>
                      {isToggle ? (
                        <TouchableOpacity onPress={() => adjustRoutineCount(item.id, done ? -1 : 1, idx)} activeOpacity={0.7}>
                          {done
                            ? <CheckCircle size={22} color={C.olive} />
                            : <Circle      size={22} color={C.dim}  />
                          }
                        </TouchableOpacity>
                      ) : (
                        <View style={s.routineCounter}>
                          <TouchableOpacity onPress={() => adjustRoutineCount(item.id, -1, idx)} style={s.routineCounterBtn} activeOpacity={0.7}>
                            <Text style={s.routineCounterBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={s.routineCounterText}>{current}/{item.targetCount}</Text>
                          <TouchableOpacity onPress={() => adjustRoutineCount(item.id, 1, idx)} style={s.routineCounterBtn} activeOpacity={0.7}>
                            <Text style={s.routineCounterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <View style={s.routineLabelWrap}>
                        {item.emoji ? <Text style={s.routineItemEmoji}>{item.emoji}</Text> : null}
                        <View style={s.routineLabelCol}>
                          <Text style={[s.routineLabel, done && s.routineLabelDone]} numberOfLines={2}>
                            {item.label}
                          </Text>
                          {linkedGoal ? (
                            <View style={s.routineGoalBadge}>
                              <Text style={s.routineGoalBadgeText} numberOfLines={1}>🎯 {linkedGoal}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </RNAnimated.View>
                );
              })}

              {allDone && (
                <View style={s.routineAllDone}>
                  <Text style={s.routineAllDoneText}>오늘 루틴을 모두 완료했어요 🌿</Text>
                </View>
              )}
            </>
          )}
        </View>
      </>
    );
  };

  // ── 루틴 편집 모달 ────────────────────────────────────────────────────────
  const renderRoutineEditModal = () => (
    <Modal visible={routineEditModal} animationType="slide" transparent={false} onRequestClose={() => setRoutineEditModal(false)}>
      <SafeAreaView style={s.modalSafe}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setRoutineEditModal(false)} style={s.modalCloseBtn}>
            <X size={20} color={C.warmGray} />
          </TouchableOpacity>
          <Text style={s.modalTitle}>루틴 편집</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
          {/* 현재 루틴 목록 */}
          <Text style={s.routineEditSectionLabel}>현재 루틴</Text>
          {routineItems.length === 0 ? (
            <Text style={s.routineEmptyText}>아직 추가된 루틴이 없어요</Text>
          ) : (
            routineItems.map(item => (
              <View key={item.id} style={s.routineEditItem}>
                <Text style={s.routineEditItemLabel}>
                  {item.emoji ? `${item.emoji} ` : ''}{item.label}
                  {item.targetCount > 1 ? ` (×${item.targetCount})` : ''}
                </Text>
                <TouchableOpacity onPress={() => deleteRoutineItem(item.id)} style={s.routineDeleteBtn} activeOpacity={0.7}>
                  <X size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* 새 루틴 추가 폼 */}
          <Text style={[s.routineEditSectionLabel, s.routineEditSectionMargin]}>새 루틴 추가</Text>
          <View style={s.routineAddForm}>
            <View style={s.routineAddRow}>
              <TextInput
                style={s.routineEmojiInput}
                value={newRoutineEmoji}
                onChangeText={t => setNewRoutineEmoji([...t].slice(0, 2).join(''))}
                placeholder="🌿"
                placeholderTextColor={C.textMuted}
              />
              <TextInput
                style={s.routineLabelInput}
                value={newRoutineLabel}
                onChangeText={setNewRoutineLabel}
                placeholder="루틴 이름을 입력하세요"
                placeholderTextColor={C.textMuted}
                maxLength={30}
              />
            </View>
            <View style={s.routineTargetRow}>
              <Text style={s.routineTargetLabel}>목표 횟수</Text>
              <TouchableOpacity onPress={() => setNewRoutineTarget(t => Math.max(1, t - 1))} style={s.routineCounterBtn} activeOpacity={0.7}>
                <Text style={s.routineCounterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.routineTargetCount}>{newRoutineTarget}</Text>
              <TouchableOpacity onPress={() => setNewRoutineTarget(t => Math.min(20, t + 1))} style={s.routineCounterBtn} activeOpacity={0.7}>
                <Text style={s.routineCounterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={addRoutineItem} style={s.routineAddBtn} activeOpacity={0.85}>
              <Text style={s.routineAddBtnText}>추가하기</Text>
            </TouchableOpacity>
          </View>

          {/* 예시 칩 */}
          <Text style={[s.routineEditSectionLabel, s.routineEditSectionMargin]}>예시에서 추가하기</Text>
          <View style={s.chipWrap}>
            {ROUTINE_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.label}
                style={[s.chip, routineItems.some(r => r.label === preset.label) && s.chipOn]}
                onPress={() => addPresetRoutine(preset)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, routineItems.some(r => r.label === preset.label) && s.chipTextOn]}>
                  {preset.emoji} {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderAssessCard = (type: AssessType) => {
    const isPHQ9   = type === 'PHQ9';
    const latest   = isPHQ9 ? phq9Latest : gad7Latest;
    const color    = isPHQ9 ? C.phq9 : C.gad7;
    const title    = isPHQ9 ? 'PHQ-9 우울증 척도' : 'GAD-7 불안 척도';
    const subtitle = isPHQ9 ? '(최고 27점)' : '(최고 21점)';
    const level    = latest
      ? (isPHQ9 ? getPHQ9Level(latest.score) : getGAD7Level(latest.score))
      : null;

    return (
      <View key={type} style={[s.assessCard, { borderLeftColor: color }]}>
        <View style={s.assessCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.assessCardTitle}>{title}</Text>
            <Text style={s.assessCardSub}>{subtitle}</Text>
            {latest ? (
              <View style={s.assessLastRow}>
                <Text style={[s.assessScore, { color: level?.color }]}>{latest.score}점</Text>
                <View style={[s.assessLevelBadge, { backgroundColor: level?.color + '22' }]}>
                  <Text style={[s.assessLevelText, { color: level?.color }]}>{level?.label}</Text>
                </View>
                <Text style={s.assessDate}>{latest.date}</Text>
              </View>
            ) : (
              <Text style={s.assessNoData}>아직 검사 기록이 없어요</Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.assessStartBtn, { backgroundColor: color }]}
            onPress={() => openAssessment(type)}
            activeOpacity={0.85}
          >
            <ClipboardList size={14} color={C.white} />
            <Text style={s.assessStartText}>검사 시작</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMiniChart = (
    history: AssessmentRow[],
    maxScore: number,
    color: string,
    label: string
  ) => {
    if (history.length < 2) {
      return (
        <View style={s.chartPlaceholder}>
          <Text style={s.chartPlaceholderText}>검사를 2회 이상 진행하면{'\n'}그래프가 나타나요</Text>
        </View>
      );
    }
    const { data, labels, maxRef } = makeChartData(history, maxScore);
    const chartW = SCREEN_W - CARD_MX * 2 - CARD_PAD * 2;
    const hexRgb = color === C.phq9 ? '106,140,160' : '196,149,106';

    return (
      <LineChart
        data={{
          labels,
          datasets: [
            { data, color: (o = 1) => `rgba(${hexRgb},${o})`, strokeWidth: 2 },
            { data: maxRef, color: () => 'rgba(0,0,0,0)', strokeWidth: 0, withDots: false },
          ],
        }}
        width={chartW}
        height={160}
        fromZero
        bezier
        withInnerLines
        withOuterLines={false}
        chartConfig={{
          backgroundColor:        '#2C3A28',
          backgroundGradientFrom: '#2C3A28',
          backgroundGradientTo:   '#2C3A28',
          decimalPlaces: 0,
          color: (o = 1) => `rgba(${hexRgb},${o})`,
          labelColor: (o = 1) => `rgba(181,186,175,${o})`,
          propsForDots: { r: '4', strokeWidth: '2', stroke: color, fill: color },
          propsForBackgroundLines: { stroke: C.border, strokeDasharray: '' },
        }}
        style={{ borderRadius: 12, marginTop: 4 }}
      />
    );
  };

  const renderAssessmentModal = () => {
    if (!assessModal) return null;
    const questions  = currentQuestions;
    const isResult   = assessIsComplete;
    const score      = answers.reduce((a, b) => a + b, 0);
    const maxScore   = assessModal === 'PHQ9' ? 27 : 21;
    const level      = assessModal === 'PHQ9' ? getPHQ9Level(score) : getGAD7Level(score);
    const title      = assessModal === 'PHQ9' ? 'PHQ-9 우울증 척도' : 'GAD-7 불안 척도';
    const progress   = Math.min(questionIdx / questions.length, 1);

    return (
      <Modal visible animationType="slide" transparent={false} onRequestClose={() => setAssessModal(null)}>
        <SafeAreaView style={s.modalSafe}>
          {/* 모달 헤더 */}
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setAssessModal(null)} style={s.modalCloseBtn}>
              <Text style={s.modalCloseTxt}>닫기</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{title}</Text>
            <View style={{ width: 44 }} />
          </View>

          {!isResult ? (
            <ScrollView contentContainerStyle={s.modalContent}>
              {/* 진행 바 */}
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={s.progressLabel}>{questionIdx + 1} / {questions.length}</Text>

              {/* 안내 텍스트 */}
              <Text style={s.assessGuide}>지난 2주 동안 다음의 문제들로 얼마나 자주 불편함을 느끼셨나요?</Text>

              {/* 현재 질문 */}
              <View style={s.questionCard}>
                <Text style={s.questionNum}>Q{questionIdx + 1}</Text>
                <Text style={s.questionText}>{questions[questionIdx]}</Text>
              </View>

              {/* 답변 선택지 */}
              <View style={s.optionsWrap}>
                {ANSWER_OPTIONS.map(opt => {
                  const selected = answers[questionIdx] === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.optionBtn, selected && s.optionBtnSelected]}
                      onPress={() => handleSelectAnswer(opt.value)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.optionDot, selected && s.optionDotSelected]}>
                        <Text style={[s.optionScore, selected && { color: C.white }]}>{opt.value}</Text>
                      </View>
                      <Text style={[s.optionLabel, selected && s.optionLabelSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 뒤로 가기 */}
              {questionIdx > 0 && (
                <TouchableOpacity style={s.prevBtn} onPress={() => setQuestionIdx(i => i - 1)}>
                  <ChevronLeft size={16} color={C.warmGray} />
                  <Text style={s.prevBtnText}>이전 문항</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            // 결과 화면
            <ScrollView contentContainerStyle={s.resultContent}>
              <Text style={s.resultHeading}>검사 완료</Text>

              <View style={[s.scoreCircle, { borderColor: level.color }]}>
                <Text style={[s.scoreNum, { color: level.color }]}>{score}</Text>
                <Text style={s.scoreMax}>/ {maxScore}</Text>
              </View>

              <View style={[s.levelBadge, { backgroundColor: level.color + '22' }]}>
                <Text style={[s.levelBadgeText, { color: level.color }]}>{level.label} 수준</Text>
              </View>

              <Text style={s.levelDesc}>{level.desc}</Text>

              <View style={s.resultNote}>
                <Text style={s.resultNoteTxt}>
                  이 검사 결과는 의료 진단을 대체하지 않습니다.{'\n'}
                  증상이 지속된다면 반드시 전문가와 상담하세요.
                </Text>
              </View>

              <TouchableOpacity
                style={[s.resultCloseBtn, { backgroundColor: level.color }]}
                onPress={() => setAssessModal(null)}
                activeOpacity={0.85}
              >
                <Text style={s.resultCloseTxt}>확인하고 닫기</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.sosLink} onPress={() => router.navigate('/(tabs)/tools')}>
                <Wind size={14} color={C.olive} />
                <Text style={s.sosLinkText}>도구함에서 4-6 호흡법 시작하기</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  // ── Emotion Dictionary modal ──────────────────────────────────────────────
  const closeEmotionModal = () => {
    setEmotionModalVisible(false);
    setDictStep(1);
    setSelectedQuadrant(null);
    setSelectedCategory(null);
  };

  const renderEmotionDictModal = () => (
    <Modal
      visible={emotionModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={closeEmotionModal}
    >
      <SafeAreaView style={s.modalSafe}>
        {/* 공통 헤더 */}
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={closeEmotionModal} style={s.modalCloseBtn}>
            <X size={20} color={C.warmGray} />
          </TouchableOpacity>
          <Text style={s.modalTitle}>감정 언어화하기</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Step 1: 4사분면 에너지 선택 */}
        {dictStep === 1 && (
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.dictStepGuide}>
              {'지금 나의 에너지는 어떤가요?\n가장 가까운 영역을 선택해 보세요.'}
            </Text>

            <View style={s.circumplexWrapper}>
              {/* X/Y Axes */}
              <View style={s.axisX} />
              <View style={s.axisY} />

              {/* Axis Labels */}
              <Text style={[s.axisLabel, s.axisLabelTop]}>에너지 높음</Text>
              <Text style={[s.axisLabel, s.axisLabelBottom]}>에너지 낮음</Text>
              <Text style={[s.axisLabel, s.axisLabelLeft]}>부정적</Text>
              <Text style={[s.axisLabel, s.axisLabelRight]}>긍정적</Text>

              {/* Quadrants Grid (TopLeft: Q3, TopRight: Q1, BottomLeft: Q4, BottomRight: Q2) */}
              <View style={s.quadrantContainer}>
                {(['Q3', 'Q1', 'Q4', 'Q2'] as const).map((qId) => {
                  const q = EMOTION_QUADRANTS.find(x => x.id === qId)!;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      style={[s.quadrantBox, { backgroundColor: q.color + '15', borderColor: q.color }]}
                      onPress={() => { setSelectedQuadrant(q); setDictStep(2); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.quadrantBoxTitle, { color: q.color }]}>{q.title.split(' · ')[0]}</Text>
                      <Text style={s.quadrantBoxDesc} numberOfLines={2}>{q.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Step 2: 세부 카테고리 선택 */}
        {dictStep === 2 && selectedQuadrant && (
          <ScrollView contentContainerStyle={s.modalContent}>
            <TouchableOpacity style={s.dictBackBtn} onPress={() => setDictStep(1)}>
              <ChevronLeft size={16} color={C.warmGray} />
              <Text style={s.dictBackTxt}>이전 단계로</Text>
            </TouchableOpacity>
            <View style={[s.dictStepBadge, { backgroundColor: selectedQuadrant.color + '22' }]}>
              <Text style={[s.dictStepBadgeTxt, { color: selectedQuadrant.color }]}>{selectedQuadrant.title}</Text>
            </View>
            <Text style={s.dictStepGuide}>어떤 느낌에 가장 가까운가요?</Text>
            <View style={s.categoryList}>
              {selectedQuadrant.categories.map(cat => (
                <TouchableOpacity
                  key={cat.subTitle}
                  style={[s.categoryCard, { borderLeftColor: selectedQuadrant.color }]}
                  onPress={() => { setSelectedCategory(cat); setDictStep(3); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.categoryTitle}>{cat.subTitle}</Text>
                  <Text style={s.categoryWords} numberOfLines={1}>
                    {cat.words.slice(0, 4).join(' · ')} …
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Step 3: 감정 단어 다중 선택 */}
        {dictStep === 3 && selectedCategory && selectedQuadrant && (
          <ScrollView contentContainerStyle={s.modalContent}>
            <TouchableOpacity style={s.dictBackBtn} onPress={() => setDictStep(2)}>
              <ChevronLeft size={16} color={C.warmGray} />
              <Text style={s.dictBackTxt}>이전 단계로</Text>
            </TouchableOpacity>
            <View style={[s.dictStepBadge, { backgroundColor: selectedQuadrant.color + '22' }]}>
              <Text style={[s.dictStepBadgeTxt, { color: selectedQuadrant.color }]}>{selectedCategory.subTitle}</Text>
            </View>
            <Text style={s.dictStepGuide}>지금 마음을 가장 잘 표현하는 단어들을 모두 선택해 보세요.</Text>
            <View style={s.chipWrap}>
              {selectedCategory.words.map(word => {
                const on = emotions.has(word);
                return (
                  <TouchableOpacity
                    key={word}
                    style={[s.chip, on && { backgroundColor: selectedQuadrant.color + '33', borderColor: selectedQuadrant.color }]}
                    onPress={() => toggleEmotion(word)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, on && { color: selectedQuadrant.color, fontWeight: '700' }]}>{word}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[s.saveBtn, { marginTop: 32, backgroundColor: selectedQuadrant.color }]}
              onPress={closeEmotionModal}
              activeOpacity={0.85}
            >
              <Text style={s.saveBtnText}>선택 완료</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // ── Main return ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
        <FadeInView style={s.flex}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Calm Zone ── */}
          {renderCalmZone()}

          {/* ── 불안 개입 배너 ── */}
          {renderAnxietyBanner()}

          {/* ── 주간 체크인 카드 ── */}
          {renderCheckInCard()}

          {/* ── 오늘의 미니 루틴 ── */}
          {renderDailyRoutines()}

          {/* ── 오늘의 상태 척도 ── */}
          <LinearGradient colors={['#5A6A45', '#3C4E2A']} style={s.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.cardTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>오늘의 상태 척도</Text>
                <Text style={s.cardDesc}>1(낮음) ~ 10(높음)으로 표시해 주세요.</Text>
              </View>
              <TouchableOpacity style={s.assessMiniBtn} onPress={() => router.push('/(surveys)/evaluation-hub' as any)} activeOpacity={0.8}>
                <ClipboardList size={12} color="rgba(255,255,255,0.6)" />
                <Text style={s.assessMiniBtnText}>정밀 평가</Text>
              </TouchableOpacity>
            </View>
            {SLIDER_DEFS.map((def, i) => (
              <View key={def.key} style={[s.sliderRow, i < SLIDER_DEFS.length - 1 && s.sliderDivider]}>
                <View style={s.sliderTop}>
                  <View style={s.sliderMeta}>
                    <Text style={s.emoji}>{def.emoji}</Text>
                    <Text style={s.sliderLabel}>{def.label}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: def.color + '44' }]}>
                    <Text style={[s.badgeText, { color: C.white }]}>{sliders[def.key]}점</Text>
                  </View>
                </View>
                <CustomSlider value={sliders[def.key]} color={def.color} onCommit={val => onSliderChange(def.key, val)} />
                <View style={s.axisRow}>
                  <Text style={s.axisText}>{def.lowText}</Text>
                  <Text style={s.axisText}>{def.highText}</Text>
                </View>
              </View>
            ))}
          </LinearGradient>

          {/* ── 감정 태그 ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>지금 감정</Text>
            <Text style={s.cardDesc}>해당하는 감정을 모두 선택해 주세요.</Text>
            <View style={s.chipWrap}>
              {EMOTION_TAGS.map(tag => {
                const on = emotions.has(tag.id);
                return (
                  <TouchableOpacity key={tag.id} style={[s.chip, on && s.chipOn]} onPress={() => toggleEmotion(tag.id)} activeOpacity={0.7}>
                    <Text style={[s.chipText, on && s.chipTextOn]}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* 추가된 감정 단어 렌더링 (사전에서 선택한 단어들) */}
              {Array.from(emotions).map(emotionId => {
                const isBasic = EMOTION_TAGS.find(t => t.id === emotionId);
                if (isBasic) return null; // 기본 태그는 위에서 렌더링됨
                return (
                  <TouchableOpacity key={emotionId} style={[s.chip, s.chipOn]} onPress={() => toggleEmotion(emotionId)} activeOpacity={0.7}>
                    <Text style={[s.chipText, s.chipTextOn]}>#{emotionId} ✕</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 언어화 모듈 진입 버튼 */}
            <TouchableOpacity style={s.emotionDictBtn} onPress={() => setEmotionModalVisible(true)} activeOpacity={0.8}>
              <Search size={16} color={C.oliveDark} />
              <Text style={s.emotionDictBtnText}>현재의 감정을 언어화해보세요</Text>
            </TouchableOpacity>
          </View>

          {/* ── 오늘의 한 줄 ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>오늘의 한 줄</Text>
            <TextInput style={s.input} placeholder="오늘 무슨 일이 있었나요?" placeholderTextColor={C.textMuted} value={note} onChangeText={setNote} multiline numberOfLines={4} maxLength={300} textAlignVertical="top" />
            <Text style={s.charCount}>{note.length} / 300</Text>
          </View>

          {/* ── 저장 버튼 ── */}
          <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={{ borderRadius: 100, overflow: 'hidden', marginTop: 4 }}>
            <LinearGradient colors={['#9BAD80', '#748558']} style={s.saveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.saveBtnText}>{todayLogId !== null ? '기록 업데이트하기' : '기록 저장하기'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── 수면 루틴 (컴팩트) ── */}
          {renderSleepSection()}

          <View style={{ height: 24 }} />
        </ScrollView>
        </FadeInView>
      </KeyboardAvoidingView>

      {/* ── 검사 모달 ── */}
      {renderAssessmentModal()}

      {/* ── 정기 심리 검사 피커 모달 ── */}
      {renderAssessPickerModal()}

      {/* ── 감정 백과사전 모달 ── */}
      {renderEmotionDictModal()}

      {/* ── 수면 설정 모달 ── */}
      {renderSleepSettingsModal()}

      {/* ── 루틴 편집 모달 ── */}
      {renderRoutineEditModal()}

      {/* ── 목표 설정 FAB ── */}
      <TouchableOpacity
        style={s.goalFab}
        onPress={() => router.push('/goal-setting' as any)}
        activeOpacity={0.85}
      >
        <Text style={s.goalFabText}>🎯</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  flex:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: CARD_MX, paddingTop: 8, paddingBottom: 16 },

  // Calm Zone
  calmZone:    { borderRadius: 26, padding: 22, marginBottom: 18, overflow: 'hidden', position: 'relative' },
  calmRow:     { flexDirection: 'row', alignItems: 'center' },
  calmLeft:    { flex: 1, paddingRight: 10 },
  calmRight:   { width: 110, alignItems: 'center', backgroundColor: 'transparent' },
  calmEmoji:   { fontSize: 22, marginBottom: 6 },
  calmGreeting:{ fontSize: 17, fontWeight: '500', color: C.white, marginBottom: 4, letterSpacing: -0.2 },
  calmDate:    { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 9 },
  calmQuestion:{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '400', lineHeight: 20 },

  // Olive Tree Tamagotchi
  careBadge:            { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  careBadgeText:        { fontSize: 11, color: C.white, fontWeight: '500' },
  treeContainer:        { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 8, backgroundColor: 'transparent', overflow: 'visible' },
  treeImage:            { width: 72, height: 72, backgroundColor: 'transparent', overflow: 'visible' },
  treeMessage:          { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 14, fontWeight: '400', maxWidth: 108 },
  treeMessageHarvest:   { color: '#FFCF60', fontWeight: '600' },
  treeMessageWithered:  { color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' },
  oliveFruit:           { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.olive, shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 4, elevation: 4 },

  // Anxiety banner
  anxietyBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.oliveFaded, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 18, marginBottom: 16, borderWidth: 1, borderColor: C.olive + '44' },
  anxietyBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  anxietyBannerTitle:{ fontSize: 14, fontWeight: '500', color: C.oliveDark },
  anxietyBannerDesc: { fontSize: 13, color: C.oliveDark, marginTop: 2, lineHeight: 19 },

  // Section heading
  sectionHeading: { fontSize: 16, fontWeight: '500', color: C.text, marginBottom: 4, letterSpacing: -0.1 },
  sectionSub:     { fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 20 },

  // Card
  card:      { backgroundColor: C.card, borderRadius: 26, padding: CARD_PAD + 2, marginBottom: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: C.text, marginBottom: 4, letterSpacing: -0.1 },
  cardDesc:  { fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 20 },

  // Sliders
  sliderRow:     { paddingVertical: 16 },
  sliderDivider: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  sliderTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sliderMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji:         { fontSize: 20 },
  sliderLabel:   { fontSize: 15, fontWeight: '500', color: C.text },
  badge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText:     { fontSize: 13, fontWeight: '600' },
  axisRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  axisText:      { fontSize: 11, color: C.textMuted },

  // Chips
  chipWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: C.warmGrayBg, borderWidth: 1, borderColor: C.border },
  chipOn:      { backgroundColor: C.oliveFaded, borderColor: C.olive },
  chipText:    { fontSize: 13, color: C.warmGray, fontWeight: '400' },
  chipTextOn:  { color: C.oliveDark, fontWeight: '500' },

  // Note input
  input:     { minHeight: 104, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, fontSize: 14, color: C.text, backgroundColor: C.bg, lineHeight: 23 },
  charCount: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 7 },

  // Save button
  saveBtn:     { borderRadius: 100, paddingVertical: 17, alignItems: 'center', shadowColor: C.olive, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '500', color: C.white, letterSpacing: 0.3 },

  // Assessment cards
  assessCard:      { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 12, borderLeftWidth: 3, borderWidth: 0.5, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  assessCardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  assessCardTitle: { fontSize: 15, fontWeight: '500', color: C.text, marginBottom: 2 },
  assessCardSub:   { fontSize: 12, color: C.textMuted, marginBottom: 8 },
  assessLastRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  assessScore:     { fontSize: 22, fontWeight: '700' },
  assessLevelBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  assessLevelText: { fontSize: 12, fontWeight: '600' },
  assessDate:      { fontSize: 12, color: C.textMuted },
  assessNoData:    { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  assessStartBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  assessStartText: { fontSize: 13, fontWeight: '500', color: C.white },

  // Chart placeholder
  chartPlaceholder:     { paddingVertical: 26, alignItems: 'center' },
  chartPlaceholderText: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 21 },

  // Modal
  modalSafe:    { flex: 1, backgroundColor: C.bg },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 0.5, borderBottomColor: C.border },
  modalCloseBtn:{ paddingVertical: 4, paddingHorizontal: 8 },
  modalCloseTxt:{ fontSize: 15, color: C.warmGray },
  modalTitle:   { fontSize: 16, fontWeight: '500', color: C.text, letterSpacing: -0.1 },
  modalContent: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 44 },

  // Progress bar
  progressBarBg:  { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill:{ height: 5, backgroundColor: C.olive, borderRadius: 3 },
  progressLabel:  { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 7, marginBottom: 22 },

  assessGuide:  { fontSize: 14, color: C.warmGray, lineHeight: 22, marginBottom: 22, fontStyle: 'italic' },

  questionCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 0.5, borderColor: C.border, padding: 22, marginBottom: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  questionNum:  { fontSize: 12, fontWeight: '500', color: C.olive, marginBottom: 10, letterSpacing: 0.4 },
  questionText: { fontSize: 16, color: C.text, lineHeight: 26, fontWeight: '400' },

  optionsWrap: { gap: 10, marginBottom: 26 },
  optionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  optionBtnSelected: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  optionDot:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.warmGrayBg, alignItems: 'center', justifyContent: 'center' },
  optionDotSelected: { backgroundColor: C.olive },
  optionScore: { fontSize: 14, fontWeight: '600', color: C.warmGray },
  optionLabel: { fontSize: 14, color: C.text, fontWeight: '400', lineHeight: 21 },
  optionLabelSelected: { color: C.oliveDark, fontWeight: '500' },

  prevBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  prevBtnText: { fontSize: 14, color: C.warmGray },

  // Result screen
  resultContent: { paddingHorizontal: 28, paddingTop: 44, paddingBottom: 52, alignItems: 'center' },
  resultHeading: { fontSize: 20, fontWeight: '500', color: C.text, marginBottom: 34, letterSpacing: -0.2 },
  scoreCircle:   { width: 130, height: 130, borderRadius: 65, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scoreNum:      { fontSize: 44, fontWeight: '700' },
  scoreMax:      { fontSize: 14, color: C.textMuted, fontWeight: '400' },
  levelBadge:    { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  levelBadgeText:{ fontSize: 15, fontWeight: '600' },
  levelDesc:     { fontSize: 15, color: C.text, textAlign: 'center', lineHeight: 24, marginBottom: 26 },
  resultNote:    { backgroundColor: C.warmGrayBg, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, padding: 16, marginBottom: 30, width: '100%' },
  resultNoteTxt: { fontSize: 12, color: C.warmGray, textAlign: 'center', lineHeight: 20 },
  resultCloseBtn:{ paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, marginBottom: 16 },
  resultCloseTxt:{ fontSize: 16, fontWeight: '500', color: C.white },
  sosLink:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  sosLinkText:   { fontSize: 14, color: C.olive, fontWeight: '500' },

  // Compact sleep row
  sleepCompactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 0.5, borderColor: C.border, marginBottom: 18,
  },
  sleepCompactText: { flex: 1, fontSize: 12, color: C.textMuted },

  // Card title + mini button row
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 0 },
  assessMiniBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)',
    marginLeft: 8,
  },
  assessMiniBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  // Sleep settings
  sleepRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sleepInfo:      { flex: 1 },
  sleepStatus:    { fontSize: 14, fontWeight: '500', color: C.text, marginBottom: 2 },
  sleepTimes:     { fontSize: 13, color: C.oliveDark, fontWeight: '500', marginBottom: 2 },
  sleepNotifNote: { fontSize: 12, color: C.textMuted },
  sleepEditBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: C.oliveFaded, borderWidth: 1, borderColor: C.olive + '44' },
  sleepEditBtnText:{ fontSize: 13, fontWeight: '500', color: C.oliveDark },

  // Emotion Dictionary modal — entry button
  emotionDictBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.oliveFaded, borderWidth: 1, borderColor: C.olive + '44' },
  emotionDictBtnText: { fontSize: 14, fontWeight: '500', color: C.oliveDark },

  // Emotion Dictionary modal — step guide & badges
  dictStepGuide:   { fontSize: 14, color: C.warmGray, lineHeight: 22, marginBottom: 22, textAlign: 'center', fontStyle: 'italic' },
  dictBackBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 18 },
  dictBackTxt:     { fontSize: 14, color: C.warmGray },
  dictStepBadge:   { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  dictStepBadgeTxt:{ fontSize: 13, fontWeight: '600' },

  // Emotion Dictionary modal — Circumplex Model (X-Y Grid)
  circumplexWrapper:  { position: 'relative', width: '100%', aspectRatio: 1, marginTop: 30, marginBottom: 20 },
  axisX:              { position: 'absolute', top: '50%', left: -10, right: -10, height: 1.5, backgroundColor: C.border, zIndex: -1, transform: [{ translateY: -1 }] },
  axisY:              { position: 'absolute', left: '50%', top: -10, bottom: -10, width: 1.5, backgroundColor: C.border, zIndex: -1, transform: [{ translateX: -1 }] },
  axisLabel:          { position: 'absolute', fontSize: 12, fontWeight: '500', color: C.warmGray, backgroundColor: C.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  axisLabelTop:       { top: -24, left: '50%', transform: [{ translateX: -36 }] },
  axisLabelBottom:    { bottom: -24, left: '50%', transform: [{ translateX: -36 }] },
  axisLabelLeft:      { top: '50%', left: -20, transform: [{ translateY: -10 }] },
  axisLabelRight:     { top: '50%', right: -20, transform: [{ translateY: -10 }] },
  quadrantContainer:  { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' },
  quadrantBox:        { width: '48%', height: '48%', borderRadius: 22, padding: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  quadrantBoxTitle:   { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  quadrantBoxDesc:    { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 17 },

  // Emotion Dictionary modal — category list
  categoryList: { gap: 10 },
  categoryCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, borderLeftWidth: 3 },
  categoryTitle:{ fontSize: 15, fontWeight: '500', color: C.text, marginBottom: 4 },
  categoryWords:{ fontSize: 13, color: C.textMuted, lineHeight: 20 },

  // Sleep settings modal
  sleepInputCard: { backgroundColor: C.card, borderRadius: 26, borderWidth: 0.5, borderColor: C.border, padding: 22, marginBottom: 18 },
  sleepInputLabel:{ fontSize: 15, fontWeight: '500', color: C.text, marginBottom: 10 },
  sleepInput:     { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 22, fontWeight: '600', color: C.text, backgroundColor: C.bg, textAlign: 'center', letterSpacing: 2 },
  sleepInputHint: { fontSize: 12, color: C.textMuted, marginTop: 7, lineHeight: 18 },
  sleepDivider:   { height: 0.5, backgroundColor: C.border, marginVertical: 20 },
  sleepPreviewBox:{ backgroundColor: C.oliveFaded, borderRadius: 14, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: C.olive + '38' },
  sleepPreviewText:{ fontSize: 13, color: C.oliveDark, fontWeight: '400', textAlign: 'center', lineHeight: 20 },

  // ── Daily Routines ────────────────────────────────────────────────────────
  // ── Goal FAB ──────────────────────────────────────────────────────────────
  goalFab: {
    position:        'absolute',
    bottom:          88,
    right:           20,
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: C.oliveFaded,
    borderWidth:     1,
    borderColor:     C.olive + '60',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     C.olive,
    shadowOpacity:   0.25,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       6,
  },
  goalFabText: { fontSize: 22 },

  // ── Check-in card ─────────────────────────────────────────────────────────
  checkInCard: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    backgroundColor:  C.card,
    borderRadius:     20,
    borderWidth:      1,
    borderColor:      C.olive + '50',
    paddingHorizontal: 18,
    paddingVertical:  16,
    marginBottom:     14,
  },
  checkInLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    flex:          1,
  },
  checkInIcon:  { fontSize: 26 },
  checkInTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  checkInDesc:  { fontSize: 12, color: C.textMuted },

  routineCard: {
    backgroundColor:  C.card,
    borderRadius:     26,
    borderWidth:      0.5,
    borderColor:      C.border,
    paddingHorizontal: CARD_PAD + 2,
    paddingTop:       14,
    paddingBottom:    6,
    marginBottom:     18,
  },
  routineProgressTrack: {
    height:          4,
    backgroundColor: C.border,
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    6,
  },
  routineProgressFill: {
    height:          4,
    backgroundColor: C.olive,
    borderRadius:    2,
  },
  routineProgressLabel: {
    fontSize:     11,
    color:        C.textMuted,
    fontWeight:   '500',
    textAlign:    'right',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  routineItem: {
    paddingVertical: 2,
  },
  routineItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  routineItemInner: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            10,
    paddingVertical: 10,
  },
  routineLabel: {
    fontSize:   14,
    color:      C.text,
    lineHeight: 20,
  },
  routineLabelDone: {
    color:          C.textMuted,
    textDecorationLine: 'line-through',
  },
  routineAllDone: {
    borderTopWidth:  0.5,
    borderTopColor:  C.border,
    paddingVertical: 12,
    alignItems:      'center',
  },
  routineAllDoneText: {
    fontSize:   13,
    color:      C.olive,
    fontWeight: '500',
  },

  // Section heading row (heading + settings icon)
  sectionHeadingRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginBottom:      4,
  },
  routineSettingsBtn: { padding: 4 },

  // Empty state
  routineLabelWrap: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    flex:          1,
    gap:           6,
  },
  routineLabelCol: {
    flex:    1,
    gap:     4,
  },
  // 목표 배지
  routineGoalBadge: {
    alignSelf:       'flex-start',
    backgroundColor: C.oliveFaded,
    borderWidth:     1,
    borderColor:     C.olive + '55',
    borderRadius:    999,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  routineGoalBadgeText: {
    fontSize:   10,
    color:      C.olive,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  // Empty State
  routineEmptyDesc: {
    fontSize:   13,
    color:      C.textMuted,
    marginTop:  6,
    textAlign:  'center',
    lineHeight: 20,
  },
  routineGoalCta: {
    marginTop:       16,
    backgroundColor: C.olive,
    borderRadius:    999,
    paddingVertical:  13,
    paddingHorizontal: 20,
    shadowColor:     C.olive,
    shadowOpacity:   0.3,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: 5 },
    elevation:       5,
  },
  routineGoalCtaText: {
    fontSize:   14,
    fontWeight: '700',
    color:      C.bg,
    textAlign:  'center',
    letterSpacing: -0.2,
  },
  routineEmptyWrap: {
    paddingVertical: 24,
    alignItems:      'center',
    gap:             12,
  },
  routineEmptyText: {
    fontSize: 14,
    color:    C.textMuted,
  },
  routineEmptyBtn: {
    paddingHorizontal: 20,
    paddingVertical:   10,
    borderRadius:      20,
    backgroundColor:   C.oliveFaded,
    borderWidth:       1,
    borderColor:       C.olive,
  },
  routineEmptyBtnText: {
    fontSize:   14,
    fontWeight: '500',
    color:      C.oliveDark,
  },

  // Item emoji
  routineItemEmoji: { fontSize: 16 },

  // Counter widget
  routineCounter: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  routineCounterBtn: {
    width:           30,
    height:          30,
    borderRadius:    15,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: C.border,
  },
  routineCounterBtnText: {
    fontSize:   18,
    color:      C.text,
    fontWeight: '500',
    lineHeight: 22,
  },
  routineCounterText: {
    fontSize:   13,
    color:      C.textMuted,
    fontWeight: '500',
    minWidth:   36,
    textAlign:  'center',
  },

  // Edit modal — section labels
  routineEditSectionLabel: {
    fontSize:      12,
    fontWeight:    '600',
    color:         C.textMuted,
    letterSpacing: 0.5,
    marginBottom:  10,
  },
  routineEditSectionMargin: { marginTop: 24 },

  // Edit modal — current item row
  routineEditItem: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  routineEditItemLabel: {
    fontSize:    14,
    color:       C.text,
    flex:        1,
    paddingRight: 8,
  },
  routineDeleteBtn: { padding: 4 },

  // Edit modal — add form
  routineAddForm: {
    backgroundColor: C.card,
    borderRadius:    20,
    borderWidth:     0.5,
    borderColor:     C.border,
    padding:         16,
    marginBottom:    12,
  },
  routineAddRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    marginBottom:   12,
  },
  routineEmojiInput: {
    width:           52,
    height:          44,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     C.border,
    textAlign:       'center',
    fontSize:        20,
    color:           C.text,
    backgroundColor: C.bg,
  },
  routineLabelInput: {
    flex:            1,
    height:          44,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     C.border,
    paddingHorizontal: 14,
    fontSize:        14,
    color:           C.text,
    backgroundColor: C.bg,
  },
  routineTargetRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    marginBottom:   16,
  },
  routineTargetLabel: {
    fontSize: 14,
    color:    C.text,
    flex:     1,
  },
  routineTargetCount: {
    fontSize:   16,
    fontWeight: '600',
    color:      C.text,
    minWidth:   28,
    textAlign:  'center',
  },
  routineAddBtn: {
    backgroundColor: C.olive,
    borderRadius:    14,
    paddingVertical: 13,
    alignItems:      'center',
  },
  routineAddBtnText: {
    fontSize:   15,
    fontWeight: '500',
    color:      C.white,
  },
});