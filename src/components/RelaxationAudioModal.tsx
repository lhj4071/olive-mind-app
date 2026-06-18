import { Audio } from 'expo-av';
import { Pause, Play, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { C } from '../styles/theme';

const STORAGE_BASE_URL =
  'https://pmdwqeknvcesjeaglnma.supabase.co/storage/v1/object/public/relaxation-audio/';
const SCREEN_W   = Dimensions.get('window').width;
const PROGRESS_W = SCREEN_W - 64;
const VOL_W      = SCREEN_W - 96;

export type RelaxationTool = {
  id:           string;
  title:        string;
  category:     string;
  duration_min: number;
  storage_path: string;
  description:  string;
  icon:         string;
  order:        number;
};

type Props = {
  tool:    RelaxationTool | null;
  visible: boolean;
  onClose: () => void;
};

// ── 앰비언트 배경음 종류 ────────────────────────────────────
const AMBIENT_TYPES = [
  { id: 'rain',   label: '🌧️ 빗소리',      path: 'ambient-rain.mp3' },
  { id: 'ocean',  label: '🌊 파도',         path: 'ambient-ocean.mp3' },
  { id: 'forest', label: '🌲 숲소리',       path: 'ambient-forest.mp3' },
  { id: 'white',  label: '⬜ 화이트노이즈', path: 'ambient-white.mp3' },
] as const;

// ── 커스텀 볼륨 슬라이더 ────────────────────────────────────
function VolumeSlider({
  value,
  onChange,
  accentColor = C.olive,
}: {
  value: number;
  onChange: (v: number) => void;
  accentColor?: string;
}) {
  const trackW = useRef(0);
  return (
    <View
      style={[m.volTrack, { width: VOL_W }]}
      onLayout={(e) => { trackW.current = e.nativeEvent.layout.width; }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackW.current));
        onChange(ratio);
      }}
      onResponderMove={(e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackW.current));
        onChange(ratio);
      }}
    >
      <View style={[m.volFill, { width: value * VOL_W, backgroundColor: accentColor }]} />
      <View style={[m.volThumb, { left: value * VOL_W - 8, backgroundColor: accentColor }]} />
    </View>
  );
}

export default function RelaxationAudioModal({ tool, visible, onClose }: Props) {
  const insets        = useSafeAreaInsets();
  const soundRef      = useRef<Audio.Sound | null>(null);
  const ambientRef    = useRef<Audio.Sound | null>(null);
  const hasLoggedRef  = useRef(false);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const pulseLoopRef  = useRef<Animated.CompositeAnimation | null>(null);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [posMillis,   setPosMillis]   = useState(0);
  const [durMillis,   setDurMillis]   = useState(0);
  const [mainVol,     setMainVol]     = useState(1);
  const [ambientVol,  setAmbientVol]  = useState(0.3);
  const [ambientType, setAmbientType] = useState<string | null>(null);

  // ── 아이콘 펄스 ──
  const startPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1, duration: 2000,
          useNativeDriver: true, easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 2000,
          useNativeDriver: true, easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    pulseLoopRef.current = loop;
    loop.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    Animated.timing(pulseAnim, {
      toValue: 1, duration: 300,
      useNativeDriver: true, easing: Easing.out(Easing.ease),
    }).start();
  }, [pulseAnim]);

  const logCompletion = useCallback(async (toolId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from('relaxation_logs').insert({
        user_id:      session.user.id,
        tool_id:      toolId,
        completed_at: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }, []);

  // ── 가이드 오디오 로드 ──
  useEffect(() => {
    if (!visible || !tool) return;

    let mounted  = true;
    const toolId = tool.id;
    const uri    = STORAGE_BASE_URL + tool.storage_path;

    hasLoggedRef.current = false;
    setIsLoading(true);
    setIsPlaying(false);
    setPosMillis(0);
    setDurMillis(0);
    setMainVol(1);
    setAmbientType(null);
    stopPulse();

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:   false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, volume: 1 },
        );

        if (!mounted) { await sound.unloadAsync(); return; }

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setPosMillis(status.positionMillis);
          setDurMillis(status.durationMillis ?? 0);
          setIsPlaying(status.isPlaying);
          if (status.isPlaying) { startPulse(); } else { stopPulse(); }
          if (status.didJustFinish && !hasLoggedRef.current) {
            hasLoggedRef.current = true;
            logCompletion(toolId);
          }
        });

        soundRef.current = sound;
        if (mounted) setIsLoading(false);
      } catch (err) {
        console.warn('[RelaxationAudio] load error:', err);
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      stopPulse();
      const s = soundRef.current;
      soundRef.current = null;
      s?.unloadAsync().catch(() => {});
      // 앰비언트도 해제
      const a = ambientRef.current;
      ambientRef.current = null;
      a?.unloadAsync().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tool?.id]);

  // ── 가이드 볼륨 조절 ──
  const handleMainVol = useCallback(async (v: number) => {
    setMainVol(v);
    try { await soundRef.current?.setVolumeAsync(v); } catch {}
  }, []);

  // ── 앰비언트 사운드 선택 ──
  const handleAmbient = useCallback(async (typeId: string | null) => {
    // 기존 앰비언트 해제
    const prev = ambientRef.current;
    ambientRef.current = null;
    try { await prev?.stopAsync(); await prev?.unloadAsync(); } catch {}

    setAmbientType(typeId);
    if (!typeId) return;

    const entry = AMBIENT_TYPES.find(t => t.id === typeId);
    if (!entry) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: STORAGE_BASE_URL + entry.path },
        { shouldPlay: true, isLooping: true, volume: ambientVol },
      );
      ambientRef.current = sound;
    } catch (err) {
      console.warn('[Ambient] load error (파일을 Supabase에 업로드하세요):', err);
      setAmbientType(null);
    }
  }, [ambientVol]);

  // ── 앰비언트 볼륨 조절 ──
  const handleAmbientVol = useCallback(async (v: number) => {
    setAmbientVol(v);
    try { await ambientRef.current?.setVolumeAsync(v); } catch {}
  }, []);

  const togglePlay = useCallback(async () => {
    const s = soundRef.current;
    if (!s || isLoading) return;
    if (isPlaying) { await s.pauseAsync(); } else { await s.playAsync(); }
  }, [isPlaying, isLoading]);

  const handleClose = useCallback(async () => {
    try { await soundRef.current?.pauseAsync(); } catch {}
    try {
      const a = ambientRef.current;
      ambientRef.current = null;
      await a?.stopAsync();
      await a?.unloadAsync();
    } catch {}
    stopPulse();
    setAmbientType(null);
    onClose();
  }, [onClose, stopPulse]);

  const progress = durMillis > 0 ? posMillis / durMillis : 0;
  const fillW    = Math.round(progress * PROGRESS_W);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!tool) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={[
          m.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* 닫기 버튼 */}
        <View style={m.topRow}>
          <View style={{ width: 40 }} />
          <Text style={m.screenTitle}>이완 도구함</Text>
          <TouchableOpacity onPress={handleClose} style={m.closeBtn} activeOpacity={0.7}>
            <X size={22} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 콘텐츠 영역 — 아이콘 펄스 포함 */}
        <View style={m.content}>
          <Animated.Text style={[m.iconText, { transform: [{ scale: pulseAnim }] }]}>
            {tool.icon}
          </Animated.Text>
          <Text style={m.title}>{tool.title}</Text>

          <View style={m.metaPill}>
            <Text style={m.metaText}>{tool.category}</Text>
            <View style={m.metaDot} />
            <Text style={m.metaText}>{tool.duration_min}분</Text>
          </View>

          <Text style={m.desc}>{tool.description}</Text>
        </View>

        {/* 플레이어 컨트롤 */}
        <View style={m.player}>
          {/* 진행 바 */}
          <View style={m.progressTrack}>
            <View style={[m.progressFill, { width: fillW }]} />
          </View>

          {/* 시간 표시 */}
          <View style={m.timeRow}>
            <Text style={m.timeText}>{fmt(posMillis)}</Text>
            <Text style={m.timeText}>
              {durMillis > 0 ? fmt(durMillis) : `${tool.duration_min}:00`}
            </Text>
          </View>

          {/* 앰비언트 배경음 선택 */}
          <View style={m.ambientSection}>
            <Text style={m.sectionLabel}>배경음</Text>
            <View style={m.chipRow}>
              {/* 없음 칩 */}
              <TouchableOpacity
                style={[m.chip, ambientType === null && m.chipActive]}
                onPress={() => handleAmbient(null)}
                activeOpacity={0.75}
              >
                <Text style={[m.chipText, ambientType === null && m.chipTextActive]}>없음</Text>
              </TouchableOpacity>
              {AMBIENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[m.chip, ambientType === t.id && m.chipActive]}
                  onPress={() => handleAmbient(t.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[m.chipText, ambientType === t.id && m.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 앰비언트 볼륨 슬라이더 (배경음 선택 시 표시) */}
            {ambientType !== null && (
              <View style={m.volRow}>
                <Text style={m.volIco}>🔈</Text>
                <VolumeSlider
                  value={ambientVol}
                  onChange={handleAmbientVol}
                  accentColor="#9bad80"
                />
                <Text style={m.volIco}>🔊</Text>
              </View>
            )}
          </View>

          {/* 가이드 음성 볼륨 */}
          <View style={m.volBlock}>
            <Text style={m.sectionLabel}>가이드 음성</Text>
            <View style={m.volRow}>
              <Text style={m.volIco}>🔈</Text>
              <VolumeSlider value={mainVol} onChange={handleMainVol} accentColor={C.olive} />
              <Text style={m.volIco}>🎙️</Text>
            </View>
          </View>

          {/* 재생 / 일시정지 버튼 */}
          <TouchableOpacity
            style={m.playBtn}
            onPress={togglePlay}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading
              ? <Text style={m.loadingDot}>●</Text>
              : isPlaying
                ? <Pause size={32} color={C.white} fill={C.white} />
                : <Play  size={32} color={C.white} fill={C.white} />}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 32,
  },
  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   8,
  },
  screenTitle: {
    fontSize:   15,
    fontWeight: '500',
    color:      C.textMuted,
  },
  closeBtn: { padding: 8 },
  content: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize:     80,
    marginBottom: 28,
  },
  title: {
    fontSize:      26,
    fontWeight:    '600',
    color:         C.text,
    textAlign:     'center',
    marginBottom:  12,
    letterSpacing: -0.4,
  },
  metaPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    backgroundColor:   '#1E3020',
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   6,
    marginBottom:      24,
  },
  metaDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: C.olive,
  },
  metaText: { fontSize: 13, color: C.olive, fontWeight: '500' },
  desc: {
    fontSize:          15,
    color:             C.textMuted,
    textAlign:         'center',
    lineHeight:        25,
    paddingHorizontal: 8,
  },

  player: {
    alignItems:   'center',
    paddingBottom: 8,
  },
  progressTrack: {
    width:           PROGRESS_W,
    height:          4,
    backgroundColor: C.border,
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    10,
  },
  progressFill: {
    height: 4, backgroundColor: C.olive, borderRadius: 2,
  },
  timeRow: {
    width:          PROGRESS_W,
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   20,
  },
  timeText: { fontSize: 12, color: C.textMuted },

  // ── 앰비언트 ──
  ambientSection: {
    width:        '100%',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize:      10,
    fontWeight:    '600',
    color:         '#4a5748',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom:  8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderRadius:      20,
    borderWidth:       1.5,
    borderColor:       '#2c3728',
  },
  chipActive: {
    backgroundColor: '#2c3728',
    borderColor:     '#3a4e34',
  },
  chipText: {
    fontSize:   12,
    color:      '#6b7a68',
    fontWeight: '500',
  },
  chipTextActive: { color: C.olive },

  // ── 볼륨 ──
  volBlock: {
    width:        '100%',
    marginBottom: 20,
  },
  volRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    marginTop:     8,
  },
  volIco: { fontSize: 14, width: 20, textAlign: 'center' },

  // ── 슬라이더 ──
  volTrack: {
    height:          4,
    backgroundColor: '#2c3728',
    borderRadius:    2,
    position:        'relative',
    justifyContent:  'center',
  },
  volFill: {
    position:     'absolute',
    left:         0,
    height:       4,
    borderRadius: 2,
  },
  volThumb: {
    position:     'absolute',
    width:        16,
    height:       16,
    borderRadius: 8,
    top:          -6,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius:  4,
    elevation:     4,
  },

  // ── 재생 버튼 ──
  playBtn: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: C.oliveDark,
    alignItems:      'center',
    justifyContent:  'center',
  },
  loadingDot: {
    fontSize: 12,
    color:    C.white,
    opacity:  0.5,
  },
});
