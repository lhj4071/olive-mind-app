import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import {
  Activity,
  ArrowRight,
  ChevronLeft,
  Coffee,
  Eye,
  Hand,
  Headphones,
  Leaf,
  Phone,
  RotateCcw,
  Target,
  Wind,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import RelaxationAudioModal, { type RelaxationTool } from '../../src/components/RelaxationAudioModal';
import { supabase } from '../../src/lib/supabase';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../src/styles/theme';
import { useBreathSession, BREATH_TIMINGS, type TempoOption } from '../../src/hooks/useBreathSession';

// ── Constants ─────────────────────────────────────────────────────────────────
const REQUIRED_CYCLES = 6;
const TENSE_SEC       = 5;
const RELAX_SEC       = 10;

const BREATH_VIDEO_OFFSET_Y = 0;

const SCREEN_W    = Dimensions.get('window').width;
const SCREEN_H    = Dimensions.get('window').height;
const ORB_SIZE    = Math.min(SCREEN_W * 0.68, 280);
const CIRCLE_SIZE = Math.min(Math.floor((SCREEN_W - 80) / 5), 56);
const CARD_SIZE   = (SCREEN_W - 48) / 2;
const CARD_H      = Math.round(CARD_SIZE * 1.4);

type PmrPhase     = 'idle' | 'tense' | 'relax';
type ActiveScreen = 'dashboard' | 'pmr' | 'grounding' | 'relaxation-hub' | 'audio-hub';

// ── Data ──────────────────────────────────────────────────────────────────────
const PMR_STEPS = [
  { id: 'feet',      name: '발과 발가락',    tenseMsg: '발가락을 발바닥 쪽으로 꽉 구부리며 힘을 줍니다.',      relaxMsg: '힘을 툭 풀고 따뜻한 이완감을 느낍니다.' },
  { id: 'legs',      name: '종아리와 허벅지', tenseMsg: '다리 전체에 힘을 꽉 주고 버팁니다.',                 relaxMsg: '다리의 힘을 풀고 바닥으로 무겁게 가라앉는 것을 느낍니다.' },
  { id: 'hands',     name: '주먹과 팔',       tenseMsg: '양손을 꽉 쥐고 팔 전체에 힘을 줍니다.',             relaxMsg: '주먹을 풀고 손끝으로 빠져나가는 긴장을 느낍니다.' },
  { id: 'shoulders', name: '어깨와 목',       tenseMsg: '어깨를 귀 쪽으로 바짝 끌어올려 힘을 줍니다.',       relaxMsg: '어깨를 툭 떨어뜨리고 편안함을 느낍니다.' },
  { id: 'face',      name: '얼굴',            tenseMsg: '미간을 찌푸리고 눈과 입을 꽉 감습니다.',             relaxMsg: '얼굴의 모든 근육을 풀고 평온해집니다.' },
] as const;

const GROUNDING_STEPS = [
  { id: 'see',   count: 5, icon: 'Eye',        title: '눈에 보이는 것 5가지',         desc: '주변을 둘러보고 색깔, 모양, 크기가 다른 5가지를 찾아 마음속으로 이름을 부르며 체크하세요.' },
  { id: 'feel',  count: 4, icon: 'Hand',        title: '피부에 닿는 촉감 4가지',       desc: '의자의 푹신함, 옷의 촉감, 공기의 온도 등 4가지를 찾아 느껴보세요.' },
  { id: 'hear',  count: 3, icon: 'Headphones',  title: '귀에 들리는 소리 3가지',       desc: '눈을 감고 시계 초침 소리, 바람 소리 등 3가지 소리에 집중해보세요.' },
  { id: 'smell', count: 2, icon: 'Leaf',        title: '코로 맡을 수 있는 냄새 2가지', desc: '주변의 향기나 내 옷에서 나는 냄새 2가지를 찾아보세요.' },
  { id: 'taste', count: 1, icon: 'Coffee',      title: '입에서 느껴지는 맛 1가지',     desc: '입안의 감각이나 방금 마신 물의 맛 1가지에 집중해보세요.' },
] as const;

const STOP_STEPS = [
  { letter: 'S', title: 'Stop',          subtitle: '멈추기',   desc: '지금 하던 것을 잠깐 멈추세요.\n자동으로 반응하기 전에\n잠시 제동을 거는 것이 시작이에요.',  color: C.olive,  bgColor: 'rgba(99,119,70,0.12)'   },
  { letter: 'T', title: 'Take a breath', subtitle: '호흡하기', desc: '깊게 숨을 한 번 들이마시고\n천천히 내쉬어 보세요.\n몸이 먼저 안정을 되찾을 거예요.',     color: C.phq9,  bgColor: 'rgba(92,124,151,0.12)'  },
  { letter: 'O', title: 'Observe',       subtitle: '관찰하기', desc: '지금 내 몸에서 어떤 느낌이 드나요?\n어떤 생각과 감정이 올라오는지\n판단 없이 바라보세요.', color: C.gad7,  bgColor: 'rgba(176,127,78,0.12)'  },
  { letter: 'P', title: 'Proceed',       subtitle: '나아가기', desc: '지금 이 순간 나에게 도움이 되는\n현명한 선택은 무엇인지 생각하며\n천천히 나아가세요.',    color: C.accent, bgColor: 'rgba(122,111,168,0.12)' },
];

type DashTool = {
  id: 'breathing' | 'pmr' | 'grounding' | 'relaxation' | 'audio';
  Icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  tagline: string;
  desc: string;
  iconColor: string;
  cardBg: string;
  cardGradient: readonly [string, string];
  accentBorder: string;
};

// 신체 안정화 허브 안에 들어갈 3가지 기법
const BODY_RELAX_TOOLS: DashTool[] = [
  {
    id: 'breathing', Icon: Wind,
    title: '복식 호흡',
    tagline: '갑작스런 불안이\n밀려올 때',
    desc: '4-6 호흡 리듬',
    iconColor: '#52BEA8', cardBg: 'rgba(82,190,168,0.09)', cardGradient: ['rgba(255,255,255,0.96)', 'rgba(82,190,168,0.22)'], accentBorder: 'rgba(82,190,168,0.38)',
  },
  {
    id: 'pmr', Icon: Activity,
    title: '근육 이완',
    tagline: '온몸이 뻣뻣하게\n굳어 있을 때',
    desc: '5부위 순차 이완',
    iconColor: C.gad7, cardBg: 'rgba(176,127,78,0.09)', cardGradient: ['rgba(255,255,255,0.96)', 'rgba(176,127,78,0.22)'], accentBorder: 'rgba(176,127,78,0.38)',
  },
  {
    id: 'grounding', Icon: Target,
    title: '감각 그라운딩',
    tagline: '생각이 너무 앞서\n달려갈 때',
    desc: '5·4·3·2·1 기법',
    iconColor: C.olive, cardBg: C.oliveFaded, cardGradient: ['rgba(255,255,255,0.96)', 'rgba(99,119,70,0.22)'], accentBorder: 'rgba(99,119,70,0.38)',
  },
];

// 대시보드 상위 모듈 카드 (신체 안정화 / 오디오 가이드)
const MODULE_CARDS: DashTool[] = [
  {
    id: 'relaxation', Icon: Activity,
    title: '신체 안정화',
    tagline: '호흡 · 근육 · 감각',
    desc: '3가지 기법',
    iconColor: C.phq9, cardBg: 'rgba(92,124,151,0.09)', cardGradient: ['rgba(255,255,255,0.96)', 'rgba(92,124,151,0.22)'], accentBorder: 'rgba(92,124,151,0.38)',
  },
  {
    id: 'audio', Icon: Headphones,
    title: '오디오 가이드',
    tagline: '명상 · 이완 음성',
    desc: '가이드 프로그램',
    iconColor: C.olive, cardBg: C.oliveFaded, cardGradient: ['rgba(255,255,255,0.96)', 'rgba(99,119,70,0.22)'], accentBorder: 'rgba(99,119,70,0.38)',
  },
];

// ── Dashboard Card Styles ─────────────────────────────────────────────────────
const dc = StyleSheet.create({
  scrollContent:        { paddingHorizontal: 16, paddingTop: 28 },
  pageHeader:           { marginBottom: 20, paddingHorizontal: 4 },
  pageTitle:            { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4, marginBottom: 6 },
  pageSub:              { fontSize: 14, color: C.textMuted, lineHeight: 22 },
  grid:                 { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 32 },
  cardOuter:            { width: CARD_SIZE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 18, elevation: 8 },
  card:                 { width: CARD_SIZE, height: CARD_H, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  cardInner:            { flex: 1, padding: 18 },
  cardHighlight:        { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.85)' },
  iconRing:             { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cardTitle:            { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 6, letterSpacing: -0.2 },
  cardTagline:          { fontSize: 12, color: C.textMuted, lineHeight: 19 },
  cardFooter:           { borderTopWidth: 1, paddingTop: 10 },
  cardDesc:             { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
  sosRow:               { alignItems: 'center', marginBottom: 8 },
  sosBtn:               { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.dangerDark, borderWidth: 1, borderColor: C.dangerBorder, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  sosBtnText:           { fontSize: 14, fontWeight: '500', color: C.danger },
  sectionBlock:         { marginBottom: 24 },
  sectionHeader:        { paddingHorizontal: 4, marginBottom: 14 },
  sectionTitle:         { fontSize: 15, fontWeight: '600', color: C.text, letterSpacing: -0.2, marginBottom: 3 },
  sectionSub:           { fontSize: 13, color: C.textMuted },
  relaxIconCircle:      { width: 52, height: 52, borderRadius: 26, backgroundColor: C.oliveFaded, borderWidth: 1, borderColor: 'rgba(99,119,70,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  relaxEmoji:           { fontSize: 26 },
});

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({
  tool,
  index,
  onPress,
}: {
  tool: DashTool;
  index: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 90).springify().damping(18).stiffness(120)}
      style={[dc.cardOuter, cardAnim, { shadowColor: tool.iconColor }]}
    >
      <LinearGradient
        colors={tool.cardGradient}
        style={[dc.card, { borderColor: tool.accentBorder }]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={dc.cardHighlight} pointerEvents="none" />
        <TouchableOpacity
          style={dc.cardInner}
          activeOpacity={1}
          onPressIn={() => { scale.value = withSpring(0.95, { damping: 20, stiffness: 350 }); }}
          onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 350 }); }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
        >
          <View style={[dc.iconRing, { backgroundColor: tool.iconColor + '22', borderColor: tool.iconColor + '44' }]}>
            <tool.Icon size={26} color={tool.iconColor} />
          </View>
          <Text style={dc.cardTitle}>{tool.title}</Text>
          <Text style={dc.cardTagline}>{tool.tagline}</Text>
          <View style={{ flex: 1 }} />
          <View style={[dc.cardFooter, { borderTopColor: tool.accentBorder }]}>
            <Text style={[dc.cardDesc, { color: tool.iconColor }]}>{tool.desc}</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Relax Tool Card ───────────────────────────────────────────────────────────
function RelaxToolCard({
  tool,
  index,
  onPress,
}: {
  tool:    RelaxationTool;
  index:   number;
  onPress: () => void;
}) {
  const scale    = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(18).stiffness(120)}
      style={[dc.cardOuter, cardAnim, { shadowColor: C.olive }]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.96)', 'rgba(99,119,70,0.18)']}
        style={[dc.card, { borderColor: 'rgba(99,119,70,0.35)' }]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={dc.cardHighlight} pointerEvents="none" />
        <TouchableOpacity
          style={dc.cardInner}
          activeOpacity={1}
          onPressIn={() => { scale.value = withSpring(0.95, { damping: 20, stiffness: 350 }); }}
          onPressOut={() => { scale.value = withSpring(1,    { damping: 20, stiffness: 350 }); }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
        >
          <View style={dc.relaxIconCircle}>
            <Text style={dc.relaxEmoji}>{tool.icon}</Text>
          </View>
          <Text style={dc.cardTitle}>{tool.title}</Text>
          <Text style={dc.cardTagline}>{tool.category}</Text>
          <View style={{ flex: 1 }} />
          <View style={[dc.cardFooter, { borderTopColor: 'rgba(99,119,70,0.28)' }]}>
            <Text style={[dc.cardDesc, { color: C.olive }]}>{tool.duration_min}분 가이드</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ToolsScreen() {
  const insets = useSafeAreaInsets();

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

  // ── 오디오 가이드 state ──────────────────────────────────────────────────────
  const [relaxTools,        setRelaxTools]        = useState<RelaxationTool[]>([]);
  const [selectedRelaxTool, setSelectedRelaxTool] = useState<RelaxationTool | null>(null);
  const [audioVisible,      setAudioVisible]      = useState(false);

  useEffect(() => {
    supabase
      .from('relaxation_tools')
      .select('*')
      .order('order', { ascending: true })
      .then(({ data }) => { if (data) setRelaxTools(data as RelaxationTool[]); });
  }, []);

  // ── 복식 호흡 — 에포크 기반 타이머 훅 ───────────────────────────────────────
  const videoRef = useRef<Video>(null);
  const { state: bs, actions: ba } = useBreathSession(videoRef);

  // ── PMR state ─────────────────────────────────────────────────────────────
  const [pmrStepIndex, setPmrStepIndex] = useState(0);
  const [pmrPhase,     setPmrPhase]     = useState<PmrPhase>('idle');
  const [pmrTimeLeft,  setPmrTimeLeft]  = useState(TENSE_SEC);
  const [pmrDone,      setPmrDone]      = useState(false);
  const pmrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pmrScale = useSharedValue(1.0);
  const pmrColor = useSharedValue(0.5);
  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pmrScale.value }],
    backgroundColor: interpolateColor(pmrColor.value, [0, 0.5, 1], ['#BF6B6B', '#84826E', '#637746']),
  }));

  // ── Grounding state ───────────────────────────────────────────────────────
  const [groundingStepIndex, setGroundingStepIndex] = useState(0);
  const [checkedItems,       setCheckedItems]        = useState(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fillAnim0 = useSharedValue(0); const fillAnim1 = useSharedValue(0);
  const fillAnim2 = useSharedValue(0); const fillAnim3 = useSharedValue(0);
  const fillAnim4 = useSharedValue(0);
  const fillStyle0 = useAnimatedStyle(() => ({ transform: [{ scale: fillAnim0.value }] }));
  const fillStyle1 = useAnimatedStyle(() => ({ transform: [{ scale: fillAnim1.value }] }));
  const fillStyle2 = useAnimatedStyle(() => ({ transform: [{ scale: fillAnim2.value }] }));
  const fillStyle3 = useAnimatedStyle(() => ({ transform: [{ scale: fillAnim3.value }] }));
  const fillStyle4 = useAnimatedStyle(() => ({ transform: [{ scale: fillAnim4.value }] }));
  const fillAnims  = [fillAnim0, fillAnim1, fillAnim2, fillAnim3, fillAnim4];
  const fillStyles = [fillStyle0, fillStyle1, fillStyle2, fillStyle3, fillStyle4];

  // ── STOP state — 대시보드 인라인 ─────────────────────────────────────────────
  const [stopStep, setStopStep] = useState(0);
  const stopOpacity  = useSharedValue(1);
  const stopScale    = useSharedValue(1);
  const stopAnimStyle = useAnimatedStyle(() => ({
    opacity:   stopOpacity.value,
    transform: [{ scale: stopScale.value }],
  }));

  const advanceStop = useCallback((newStep: number) => {
    stopOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(setStopStep)(newStep);
    });
  }, [stopOpacity]);

  // STOP 콘텐츠를 스텝이 바뀔 때마다 페이드+스케일 인
  useEffect(() => {
    stopScale.value   = 0.93;
    stopOpacity.value = withTiming(1, { duration: 300 });
    stopScale.value   = withSpring(1, { damping: 14, stiffness: 180 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopStep]);

  // ── PMR: timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeScreen !== 'pmr' || pmrPhase === 'idle') {
      if (pmrTimerRef.current) clearInterval(pmrTimerRef.current);
      return;
    }
    if (pmrTimerRef.current) clearInterval(pmrTimerRef.current);
    pmrTimerRef.current = setInterval(() => setPmrTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => { if (pmrTimerRef.current) clearInterval(pmrTimerRef.current); pmrTimerRef.current = null; };
  }, [pmrPhase, activeScreen]);

  useEffect(() => {
    if (pmrTimeLeft > 0 || pmrPhase === 'idle' || activeScreen !== 'pmr') return;
    if (pmrTimerRef.current) { clearInterval(pmrTimerRef.current); pmrTimerRef.current = null; }
    if (pmrPhase === 'tense') {
      setPmrPhase('relax');
      setPmrTimeLeft(RELAX_SEC);
      pmrScale.value = withTiming(1.6, { duration: RELAX_SEC * 1000, easing: Easing.inOut(Easing.ease) });
      pmrColor.value = withTiming(1,   { duration: RELAX_SEC * 1000, easing: Easing.inOut(Easing.ease) });
    } else {
      if (pmrStepIndex < PMR_STEPS.length - 1) {
        const ni = pmrStepIndex + 1;
        setPmrStepIndex(ni);
        setPmrPhase('tense');
        setPmrTimeLeft(TENSE_SEC);
        pmrScale.value = withTiming(0.7, { duration: TENSE_SEC * 1000, easing: Easing.inOut(Easing.ease) });
        pmrColor.value = withTiming(0,   { duration: TENSE_SEC * 1000, easing: Easing.inOut(Easing.ease) });
      } else {
        setPmrPhase('idle');
        setPmrDone(true);
        pmrScale.value = 1.0;
        pmrColor.value = 0.5;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmrTimeLeft, pmrPhase, activeScreen, pmrStepIndex]);

  const startPmr = useCallback(() => {
    setPmrStepIndex(0);
    setPmrPhase('tense');
    setPmrTimeLeft(TENSE_SEC);
    setPmrDone(false);
    pmrScale.value = withTiming(0.7, { duration: TENSE_SEC * 1000, easing: Easing.inOut(Easing.ease) });
    pmrColor.value = withTiming(0,   { duration: TENSE_SEC * 1000, easing: Easing.inOut(Easing.ease) });
    setActiveScreen('pmr');
  }, [pmrScale, pmrColor]);

  const closePmr = useCallback(() => {
    if (pmrTimerRef.current) clearInterval(pmrTimerRef.current);
    pmrTimerRef.current = null;
    pmrScale.value = 1.0;
    pmrColor.value = 0.5;
    setPmrPhase('idle');
    setPmrStepIndex(0);
    setPmrTimeLeft(TENSE_SEC);
    setPmrDone(false);
    setActiveScreen('relaxation-hub');
  }, [pmrScale, pmrColor]);

  // ── Grounding ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeScreen !== 'grounding' || groundingStepIndex >= GROUNDING_STEPS.length) return;
    const step = GROUNDING_STEPS[groundingStepIndex];
    if (checkedItems < step.count) return;
    autoAdvanceRef.current = setTimeout(() => {
      fillAnims.forEach(a => { a.value = 0; });
      setGroundingStepIndex(prev => prev + 1);
      setCheckedItems(0);
    }, 800);
    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedItems, groundingStepIndex, activeScreen]);

  const handleCheckItem = useCallback((idx: number) => {
    if (idx !== checkedItems) return;
    fillAnims[idx].value = withSpring(1, { mass: 0.5, damping: 10, stiffness: 200 });
    setCheckedItems(prev => prev + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedItems]);

  const openGrounding = useCallback(() => {
    fillAnims.forEach(a => { a.value = 0; });
    setGroundingStepIndex(0);
    setCheckedItems(0);
    setActiveScreen('grounding');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeGrounding = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = null;
    fillAnims.forEach(a => { a.value = 0; });
    setGroundingStepIndex(0);
    setCheckedItems(0);
    setActiveScreen('relaxation-hub');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (pmrTimerRef.current)    clearInterval(pmrTimerRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const curPmrStep       = PMR_STEPS[pmrStepIndex];
  const curGroundingStep = GROUNDING_STEPS[Math.min(groundingStepIndex, GROUNDING_STEPS.length - 1)];

  const renderGroundingIcon = (iconName: string) => {
    const props = { size: 52, color: C.olive } as const;
    if (iconName === 'Eye')        return <Eye        {...props} />;
    if (iconName === 'Hand')       return <Hand       {...props} />;
    if (iconName === 'Headphones') return <Headphones {...props} />;
    if (iconName === 'Leaf')       return <Leaf       {...props} />;
    if (iconName === 'Coffee')     return <Coffee     {...props} />;
    return null;
  };

  // ── Detail Header ─────────────────────────────────────────────────────────
  const DetailHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={s.detailHeader}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
        <ChevronLeft size={24} color={C.warmGray} />
      </TouchableOpacity>
      <Text style={s.detailHeaderTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const stopStep_ = STOP_STEPS[stopStep];
    const isLast = stopStep === STOP_STEPS.length - 1;

    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={dc.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(0).duration(480).springify().damping(22)}
          style={dc.pageHeader}
        >
          <Text style={dc.pageTitle}>나를 위한 안정화 도구</Text>
          <Text style={dc.pageSub}>불안한 순간, 지금 바로 사용할 수 있어요.</Text>
        </Animated.View>

        {/* STOP 기법 — 항상 보이는 인라인 인터랙티브 카드 */}
        <Animated.View
          entering={FadeInDown.delay(80).springify().damping(18).stiffness(120)}
          style={sc.wrapper}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', stopStep_.bgColor]}
            style={[sc.card, { borderTopColor: stopStep_.color }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            {/* 상단: 레이블 + 진행 점 */}
            <View style={sc.topRow}>
              <View style={sc.labelRow}>
                <Hand size={13} color={stopStep_.color} />
                <Text style={[sc.label, { color: stopStep_.color }]}>STOP 기법</Text>
                <Text style={sc.labelHint}>· 언제든지</Text>
              </View>
              <View style={sc.dotsRow}>
                {STOP_STEPS.map((st, i) => (
                  <View
                    key={i}
                    style={[
                      sc.dot,
                      { backgroundColor: i <= stopStep ? stopStep_.color : C.border },
                      i === stopStep && sc.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* 콘텐츠: 현재 스텝 */}
            <Animated.View style={[sc.content, stopAnimStyle]}>
              <View style={[sc.letterBadge, { backgroundColor: stopStep_.color + '22' }]}>
                <Text style={[sc.letter, { color: stopStep_.color }]}>{stopStep_.letter}</Text>
              </View>
              <View style={sc.textBlock}>
                <Text style={[sc.stepTitle, { color: stopStep_.color }]}>{stopStep_.title}</Text>
                <Text style={sc.stepSubtitle}>{stopStep_.subtitle}</Text>
                <Text style={sc.stepDesc}>{stopStep_.desc}</Text>
              </View>
            </Animated.View>

            {/* 네비게이션 */}
            <View style={sc.navRow}>
              {stopStep > 0 ? (
                <TouchableOpacity
                  style={sc.prevBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); advanceStop(stopStep - 1); }}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={15} color={C.textMuted} />
                  <Text style={sc.prevText}>이전</Text>
                </TouchableOpacity>
              ) : (
                <View style={sc.prevBtn} />
              )}
              <TouchableOpacity
                style={[sc.nextBtn, { borderColor: stopStep_.color, backgroundColor: stopStep_.bgColor }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); advanceStop(isLast ? 0 : stopStep + 1); }}
                activeOpacity={0.8}
              >
                <Text style={[sc.nextText, { color: stopStep_.color }]}>
                  {isLast ? '처음부터' : '다음'}
                </Text>
                {isLast
                  ? <RotateCcw size={14} color={stopStep_.color} />
                  : <ArrowRight size={14} color={stopStep_.color} />
                }
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* 상위 모듈 카드 — 신체 안정화 / 오디오 가이드 */}
        <Animated.View
          entering={FadeInDown.delay(160).springify().damping(18)}
          style={dc.sectionBlock}
        >
          <View style={dc.sectionHeader}>
            <Text style={dc.sectionTitle}>안정화 기법 모음</Text>
            <Text style={dc.sectionSub}>기법을 골라 단계별로 따라해보세요</Text>
          </View>
          <View style={dc.grid}>
            {MODULE_CARDS.map((tool, index) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                index={index}
                onPress={() => {
                  if (tool.id === 'relaxation') setActiveScreen('relaxation-hub');
                  if (tool.id === 'audio')      setActiveScreen('audio-hub');
                }}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(260).springify().damping(18)}
          style={dc.sosRow}
        >
          <TouchableOpacity
            style={dc.sosBtn}
            onPress={() => Alert.alert('긴급 도움 요청', '정신건강 위기상담: 109\n긴급 구조: 119')}
            activeOpacity={0.85}
          >
            <Phone size={14} color={C.danger} />
            <Text style={dc.sosBtnText}>SOS 긴급 연락</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ── Breathing Modal ───────────────────────────────────────────────────────
  const renderBreathingModal = () => (
    <Modal
      visible={bs.modalVisible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={ba.closeModal}
    >
      <View style={bm.container}>
        <View style={bm.videoWrapper}>
          <Video
            ref={videoRef}
            source={require('../../assets/videos/breathing_loop.mp4')}
            style={[bm.video, BREATH_VIDEO_OFFSET_Y !== 0 && { transform: [{ translateY: BREATH_VIDEO_OFFSET_Y }] }]}
            resizeMode={ResizeMode.COVER}
            shouldPlay={bs.isPlaying && !bs.isPaused}
            isLooping
            isMuted
            rate={BREATH_TIMINGS[bs.tempo].rate}
          />
        </View>

        <LinearGradient
          colors={['rgba(244, 232, 214, 0.75)', 'rgba(244, 232, 214, 0)']}
          style={bm.topGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(244, 232, 214, 0)', 'rgba(244, 232, 214, 0.85)', C.bg]}
          style={bm.bottomGradient}
          pointerEvents="none"
        />

        <View style={bm.overlay}>
          <View>
            <View style={bm.topBar}>
              <TouchableOpacity style={bm.closeBtn} onPress={ba.closeModal} activeOpacity={0.7}>
                <X size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            {!bs.isPaused && (
              <Animated.View
                key={bs.phase + '_instr'}
                entering={FadeIn.duration(500)}
                exiting={FadeOut.duration(350)}
                style={bm.instructionBlock}
              >
                <Text style={bm.instructionText}>
                  {bs.phase === 'inhale'
                    ? '가슴을 가만히 두고 배를 부풀려,\n숨을 들여마십니다.'
                    : '가슴을 가만히 두고, 배를 집어넣어,\n숨을 내쉽니다.'}
                </Text>
              </Animated.View>
            )}
          </View>

          {bs.isPaused ? (
            <View style={bm.pausedOverlay}>
              <Text style={bm.pausedTitle}>잠시 멈췄어요</Text>
              <Text style={bm.pausedDesc}>
                자리를 비우셨군요.{'\n'}준비가 되면 다시 시작해요.
              </Text>
              <TouchableOpacity style={bm.resumeBtn} onPress={ba.resume} activeOpacity={0.85}>
                <Text style={bm.resumeBtnText}>계속하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={bm.center}>
              <Animated.View
                key={bs.phase}
                entering={FadeIn.duration(350)}
                exiting={FadeOut.duration(250)}
                style={bm.phaseBlock}
              >
                <Text style={bm.countdown}>{bs.phaseCountdown}</Text>
              </Animated.View>
            </View>
          )}

          <View style={bm.bottom}>
            <View style={bm.tempoContainer}>
              <Text style={bm.tempoLabel}>호흡 템포 조절</Text>
              <View style={bm.tempoTabs}>
                {(['slow', 'normal', 'fast'] as TempoOption[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[bm.tempoTab, bs.tempo === t && bm.tempoTabActive]}
                    onPress={() => ba.changeTempo(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[bm.tempoTabText, bs.tempo === t && bm.tempoTabTextActive]}>
                      {t === 'slow' ? '느리게 (12초)' : t === 'fast' ? '빠르게 (8초)' : '기본 (10초)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={bm.cycleRow}>
              {Array.from({ length: REQUIRED_CYCLES }).map((_, i) => (
                <View key={i} style={[bm.cycleDot, i < bs.cycleCount && bm.cycleDotDone]} />
              ))}
            </View>
            <Text style={bm.saveHint}>6사이클 완료 시 자동 저장</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── Relaxation Hub — 신체 안정화 3가지 기법 목록 ────────────────────────────
  const renderRelaxationHub = () => (
    <View style={s.screen}>
      <DetailHeader title="신체 안정화" onBack={() => setActiveScreen('dashboard')} />
      <ScrollView contentContainerStyle={dc.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(0).duration(380).springify().damping(22)} style={dc.pageHeader}>
          <Text style={dc.pageSub}>
            몸을 직접 안정시키는 3가지 기법이에요.{'\n'}지금 느끼는 증상에 맞게 골라보세요.
          </Text>
        </Animated.View>
        <View style={dc.grid}>
          {BODY_RELAX_TOOLS.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              index={index}
              onPress={() => {
                if (tool.id === 'breathing') return ba.openModal();
                if (tool.id === 'pmr')       return startPmr();
                if (tool.id === 'grounding') return openGrounding();
              }}
            />
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  // ── Audio Hub — 오디오 가이드 목록 ────────────────────────────────────────
  const renderAudioHub = () => (
    <View style={s.screen}>
      <DetailHeader title="오디오 가이드" onBack={() => setActiveScreen('dashboard')} />
      <ScrollView contentContainerStyle={dc.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(0).duration(380).springify().damping(22)} style={dc.pageHeader}>
          <Text style={dc.pageSub}>
            가이드 음성으로 명상하고{'\n'}깊은 이완을 경험해보세요.
          </Text>
        </Animated.View>
        {relaxTools.length > 0 ? (
          <View style={dc.grid}>
            {relaxTools.map((tool, idx) => (
              <RelaxToolCard
                key={tool.id}
                tool={tool}
                index={idx}
                onPress={() => { setSelectedRelaxTool(tool); setAudioVisible(true); }}
              />
            ))}
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={s.emptyState}>
            <Text style={s.emptyText}>프로그램을 불러오는 중이에요...</Text>
          </Animated.View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  // ── PMR Detail ────────────────────────────────────────────────────────────
  const renderPmr = () => {
    if (pmrDone) {
      return (
        <View style={[s.screen, s.centerContent]}>
          <Text style={s.completionEmoji}>🌿</Text>
          <Text style={s.completionTitle}>바디 스캔 완료</Text>
          <Text style={s.completionDesc}>모든 근육 그룹의 이완이 완료되었습니다.{'\n'}깊은 휴식을 취하세요.</Text>
          <TouchableOpacity style={s.doneBtn} onPress={closePmr} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.screen}>
        <DetailHeader title={curPmrStep.name} onBack={closePmr} />
        <View style={s.pmrProgressRow}>
          {PMR_STEPS.map((_, i) => (
            <View key={i} style={[s.pmrDot, i < pmrStepIndex && s.pmrDotDone, i === pmrStepIndex && s.pmrDotActive]} />
          ))}
        </View>
        <View style={s.pmrPhasePillWrap}>
          <View style={[s.pmrPhasePill, pmrPhase === 'tense' ? s.pmrPhaseTense : s.pmrPhaseRelax]}>
            <Text style={s.pmrPhasePillText}>
              {pmrPhase === 'tense' ? `긴장  ·  ${TENSE_SEC}초` : `이완  ·  ${RELAX_SEC}초`}
            </Text>
          </View>
        </View>
        <View style={s.pmrOrbContainer}>
          <View style={[s.pmrOrbGlow, { borderColor: pmrPhase === 'tense' ? '#BF6B6B55' : '#63774655' }]} />
          <Animated.View style={[s.pmrOrb, orbAnimStyle]} />
          <View style={s.pmrOrbTextOverlay} pointerEvents="none">
            <Text style={s.pmrGuideMsg}>{pmrPhase === 'tense' ? curPmrStep.tenseMsg : curPmrStep.relaxMsg}</Text>
            <Text style={s.pmrTimerNum}>{pmrTimeLeft}</Text>
            <Text style={s.pmrTimerUnit}>초</Text>
          </View>
        </View>
        <View style={s.pmrFooter}>
          <Text style={s.pmrFooterStep}>{pmrStepIndex + 1} / {PMR_STEPS.length}  ·  {curPmrStep.name}</Text>
          <Text style={s.pmrFooterHint}>{pmrPhase === 'tense' ? '근육에 힘을 주세요' : '천천히 힘을 빼고 이완을 느끼세요'}</Text>
        </View>
      </View>
    );
  };

  // ── Grounding Detail ──────────────────────────────────────────────────────
  const renderGrounding = () => {
    if (groundingStepIndex >= GROUNDING_STEPS.length) {
      return (
        <View style={[s.screen, s.centerContent]}>
          <Text style={s.completionEmoji}>🌿</Text>
          <Text style={s.completionTitle}>완전히 현재로 돌아왔습니다.</Text>
          <Text style={s.completionDesc}>지금 이 순간, 당신은 여기에 있습니다.{'\n'}불안이 한 걸음 물러났습니다.</Text>
          <TouchableOpacity style={s.doneBtn} onPress={closeGrounding} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.screen}>
        <DetailHeader title="감각 그라운딩" onBack={closeGrounding} />
        <View style={s.grCountRow}>
          {GROUNDING_STEPS.map((st, i) => (
            <View key={st.id} style={[s.grCountPill, i === groundingStepIndex && s.grCountPillActive, i < groundingStepIndex && s.grCountPillDone]}>
              <Text style={[s.grCountPillNum, i === groundingStepIndex && s.grCountPillNumActive]}>{st.count}</Text>
            </View>
          ))}
        </View>
        <ScrollView contentContainerStyle={s.grScrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.grIconWrap}>{renderGroundingIcon(curGroundingStep.icon)}</View>
          <Text style={s.grStepTitle}>{curGroundingStep.title}</Text>
          <Text style={s.grStepDesc}>{curGroundingStep.desc}</Text>
          <View style={s.grCirclesRow}>
            {Array.from({ length: curGroundingStep.count }).map((_, i) => {
              const isFilled = i < checkedItems;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleCheckItem(i)}
                  activeOpacity={isFilled ? 1 : 0.65}
                  style={s.grCircleTouchable}
                >
                  <View style={[s.grCircleOuter, isFilled && s.grCircleOuterFilled]}>
                    {isFilled ? (
                      <Animated.View style={[s.grCircleInner, fillStyles[i]]}>
                        <Text style={s.grCheckMark}>✓</Text>
                      </Animated.View>
                    ) : (
                      <Text style={s.grCircleNum}>{i + 1}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.grProgressHint}>
            {checkedItems === 0
              ? `원을 하나씩 눌러 ${curGroundingStep.count}가지를 확인하세요`
              : checkedItems < curGroundingStep.count
              ? `${checkedItems} / ${curGroundingStep.count} 확인 중...`
              : `${curGroundingStep.count}가지 모두 확인! 잠시 후 넘어갑니다 ✓`}
          </Text>
          <Text style={s.grStepCounter}>{groundingStepIndex + 1} / {GROUNDING_STEPS.length} 단계</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {renderBreathingModal()}
      <RelaxationAudioModal
        tool={selectedRelaxTool}
        visible={audioVisible}
        onClose={() => setAudioVisible(false)}
      />
      <View style={s.header}>
        <Text style={s.headerTitle}>도구함</Text>
        {activeScreen === 'dashboard' && (
          <Text style={s.headerSub}>마음을 돌보는 도구들</Text>
        )}
      </View>
      {activeScreen === 'dashboard'      && renderDashboard()}
      {activeScreen === 'relaxation-hub' && renderRelaxationHub()}
      {activeScreen === 'audio-hub'      && renderAudioHub()}
      {activeScreen === 'pmr'            && renderPmr()}
      {activeScreen === 'grounding'      && renderGrounding()}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.card },
  headerTitle: { fontSize: 18, fontWeight: '500', color: C.text, letterSpacing: -0.2 },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 3, lineHeight: 19 },
  screen:      { flex: 1, backgroundColor: C.bg },

  // ── Detail Header ─────────────────────────────────────────────────────────
  detailHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.border },
  detailHeaderTitle: { fontSize: 16, fontWeight: '500', color: C.text, letterSpacing: -0.1 },
  backBtn:           { padding: 6 },

  // ── PMR ───────────────────────────────────────────────────────────────────
  pmrProgressRow:  { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  pmrDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  pmrDotActive:    { width: 14, height: 14, borderRadius: 7, backgroundColor: C.olive },
  pmrDotDone:      { width: 10, height: 10, borderRadius: 5, backgroundColor: C.olive },
  pmrPhasePillWrap:{ alignItems: 'center', marginBottom: 14 },
  pmrPhasePill:    { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 22 },
  pmrPhaseTense:   { backgroundColor: 'rgba(191,107,107,0.18)' },
  pmrPhaseRelax:   { backgroundColor: 'rgba(99,119,70,0.15)' },
  pmrPhasePillText:{ color: C.text, fontSize: 13, fontWeight: '500', letterSpacing: 0.4 },
  pmrOrbContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pmrOrbGlow:      { position: 'absolute', width: ORB_SIZE + 60, height: ORB_SIZE + 60, borderRadius: (ORB_SIZE + 60) / 2, borderWidth: 1.5 },
  pmrOrb:          { width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, shadowColor: C.olive, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 36, elevation: 18 },
  pmrOrbTextOverlay:{ position: 'absolute', alignItems: 'center', paddingHorizontal: 32 },
  pmrGuideMsg:     { fontSize: 16, color: C.text, textAlign: 'center', lineHeight: 26, marginBottom: 24, fontWeight: '400' },
  pmrTimerNum:     { fontSize: 72, fontWeight: '700', color: C.text, lineHeight: 76 },
  pmrTimerUnit:    { fontSize: 18, color: C.dim, fontWeight: '400', marginTop: 4 },
  pmrFooter:       { alignItems: 'center', paddingVertical: 24, borderTopWidth: 0.5, borderTopColor: C.border, paddingHorizontal: 28 },
  pmrFooterStep:   { fontSize: 13, color: C.olive, fontWeight: '500', marginBottom: 6 },
  pmrFooterHint:   { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  // ── Grounding ─────────────────────────────────────────────────────────────
  grCountRow:           { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 20 },
  grCountPill:          { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  grCountPillActive:    { backgroundColor: C.olive, borderColor: C.oliveDark },
  grCountPillDone:      { backgroundColor: C.oliveFaded, borderColor: C.olive },
  grCountPillNum:       { fontSize: 17, fontWeight: '600', color: C.olive },
  grCountPillNumActive: { color: C.white, fontSize: 20 },
  grScrollContent:      { paddingHorizontal: 26, paddingTop: 28, alignItems: 'center' },
  grIconWrap:           { width: 104, height: 104, borderRadius: 52, backgroundColor: C.oliveFaded, alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 1.5, borderColor: 'rgba(99,119,70,0.35)' },
  grStepTitle:          { fontSize: 20, fontWeight: '500', color: C.text, textAlign: 'center', marginBottom: 14, lineHeight: 29, letterSpacing: -0.2 },
  grStepDesc:           { fontSize: 15, color: C.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 38, paddingHorizontal: 10 },
  grCirclesRow:         { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 26, flexWrap: 'wrap' },
  grCircleTouchable:    { padding: 4 },
  grCircleOuter:        { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, overflow: 'hidden' },
  grCircleOuterFilled:  { borderColor: C.olive },
  grCircleInner:        { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: C.olive, alignItems: 'center', justifyContent: 'center' },
  grCheckMark:          { fontSize: 20, color: C.white, fontWeight: '600' },
  grCircleNum:          { fontSize: 16, color: C.olive, fontWeight: '500' },
  grProgressHint:       { fontSize: 14, color: C.olive, textAlign: 'center', fontWeight: '500', marginBottom: 14, lineHeight: 21 },
  grStepCounter:        { fontSize: 12, color: C.olive, fontWeight: '500', letterSpacing: 0.4 },

  // ── Completion ────────────────────────────────────────────────────────────
  centerContent:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  completionEmoji:  { fontSize: 60, marginBottom: 28 },
  completionTitle:  { fontSize: 22, fontWeight: '500', color: C.text, textAlign: 'center', marginBottom: 16, lineHeight: 31, letterSpacing: -0.2 },
  completionDesc:   { fontSize: 15, color: C.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 44 },
  doneBtn:          { backgroundColor: C.olive, borderRadius: 100, paddingVertical: 16, paddingHorizontal: 38 },
  doneBtnText:      { fontSize: 15, fontWeight: '500', color: C.white },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText:  { fontSize: 14, color: C.textMuted },
});

// ── STOP 인라인 카드 스타일 ────────────────────────────────────────────────────
const sc = StyleSheet.create({
  wrapper:      { marginBottom: 24 },
  card:         { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderTopWidth: 3, overflow: 'hidden', padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 6 },
  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  labelRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label:        { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  labelHint:    { fontSize: 12, color: C.textMuted },
  dotsRow:      { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  dotActive:    { width: 18, borderRadius: 4 },
  content:      { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'flex-start' },
  letterBadge:  { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  letter:       { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  textBlock:    { flex: 1 },
  stepTitle:    { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  stepSubtitle: { fontSize: 12, color: C.textMuted, marginBottom: 8 },
  stepDesc:     { fontSize: 14, color: C.text, lineHeight: 22 },
  navRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prevBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 0.5, borderColor: C.border, minWidth: 64 },
  prevText:     { fontSize: 13, color: C.textMuted },
  nextBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  nextText:     { fontSize: 14, fontWeight: '500' },
});

// ── Breathing Modal Styles ─────────────────────────────────────────────────────
const bm = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  videoWrapper: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W, height: SCREEN_H,
    overflow: 'hidden',
    zIndex: -1,
  },
  video: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W, height: SCREEN_H,
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: SCREEN_H * 0.32,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SCREEN_H * 0.45,
  },
  overlay:      { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  topBar:       { paddingTop: 56, paddingHorizontal: 24, alignItems: 'flex-end' },
  closeBtn:     { padding: 10 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phaseBlock:   { alignItems: 'center' },
  phaseText:    { fontSize: 28, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 28, letterSpacing: -0.3 },
  instructionBlock: { paddingHorizontal: 32, paddingBottom: 16, alignItems: 'center' },
  instructionText: { fontSize: 18, fontWeight: '600', color: C.text, textAlign: 'center', lineHeight: 29, letterSpacing: -0.3 },
  countdown:    { fontSize: 72, fontWeight: '700', color: C.olive, textAlign: 'center', lineHeight: 80 },
  bottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(244, 232, 214, 0.96)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 20, paddingBottom: 28, paddingHorizontal: 32,
    alignItems: 'center',
  },
  tempoContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  tempoLabel:     { fontSize: 12, fontWeight: '500', color: C.textMuted, marginBottom: 8 },
  tempoTabs:      { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 3, width: '100%' },
  tempoTab:       { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  tempoTabActive: { backgroundColor: C.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tempoTabText:       { fontSize: 12, color: C.dim, fontWeight: '400' },
  tempoTabTextActive: { color: C.oliveDark, fontWeight: '600' },
  cycleRow:     { flexDirection: 'row', gap: 14, marginBottom: 12 },
  cycleDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.15)' },
  cycleDotDone: { backgroundColor: C.olive },
  saveHint:     { fontSize: 12, color: C.dim, textAlign: 'center' },
  pausedOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  pausedTitle:   { fontSize: 22, fontWeight: '600', color: C.text, letterSpacing: -0.3, textAlign: 'center' },
  pausedDesc:    { fontSize: 15, color: C.textMuted, lineHeight: 24, textAlign: 'center' },
  resumeBtn:     { marginTop: 8, backgroundColor: C.olive, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 40 },
  resumeBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
