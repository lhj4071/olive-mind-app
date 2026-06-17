import { Audio } from 'expo-av';
import { Pause, Play, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
const SCREEN_W     = Dimensions.get('window').width;
const PROGRESS_W   = SCREEN_W - 64;

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

export default function RelaxationAudioModal({ tool, visible, onClose }: Props) {
  const insets       = useSafeAreaInsets();
  const soundRef     = useRef<Audio.Sound | null>(null);
  const hasLoggedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [posMillis, setPosMillis] = useState(0);
  const [durMillis, setDurMillis] = useState(0);

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

  // 모달이 열릴 때마다 오디오 로드, 닫히면 unload
  useEffect(() => {
    if (!visible || !tool) return;

    let mounted       = true;
    const toolId      = tool.id;
    const uri         = STORAGE_BASE_URL + tool.storage_path;

    hasLoggedRef.current = false;
    setIsLoading(true);
    setIsPlaying(false);
    setPosMillis(0);
    setDurMillis(0);

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:   false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
        );

        if (!mounted) { await sound.unloadAsync(); return; }

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setPosMillis(status.positionMillis);
          setDurMillis(status.durationMillis ?? 0);
          setIsPlaying(status.isPlaying);
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
      const s = soundRef.current;
      soundRef.current = null;
      s?.unloadAsync().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tool?.id]);

  const togglePlay = useCallback(async () => {
    const s = soundRef.current;
    if (!s || isLoading) return;
    if (isPlaying) {
      await s.pauseAsync();
    } else {
      await s.playAsync();
    }
  }, [isPlaying, isLoading]);

  const handleClose = useCallback(async () => {
    try { await soundRef.current?.pauseAsync(); } catch { /* ignore */ }
    onClose();
  }, [onClose]);

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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
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

        {/* 콘텐츠 영역 */}
        <View style={m.content}>
          <Text style={m.iconText}>{tool.icon}</Text>
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

          {/* 재생 / 일시정지 버튼 */}
          <TouchableOpacity
            style={m.playBtn}
            onPress={togglePlay}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={C.white} size="large" />
            ) : isPlaying ? (
              <Pause size={32} color={C.white} fill={C.white} />
            ) : (
              <Play size={32} color={C.white} fill={C.white} />
            )}
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
  closeBtn: {
    padding: 8,
  },
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
    flexDirection:    'row',
    alignItems:       'center',
    gap:              8,
    backgroundColor:  '#1E3020',
    borderRadius:     20,
    paddingHorizontal: 16,
    paddingVertical:  6,
    marginBottom:     24,
  },
  metaDot: {
    width:        4,
    height:       4,
    borderRadius: 2,
    backgroundColor: C.olive,
  },
  metaText: {
    fontSize:   13,
    color:      C.olive,
    fontWeight: '500',
  },
  desc: {
    fontSize:        15,
    color:           C.textMuted,
    textAlign:       'center',
    lineHeight:      25,
    paddingHorizontal: 8,
  },
  player: {
    alignItems:  'center',
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
    height:          4,
    backgroundColor: C.olive,
    borderRadius:    2,
  },
  timeRow: {
    width:          PROGRESS_W,
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   36,
  },
  timeText: {
    fontSize: 12,
    color:    C.textMuted,
  },
  playBtn: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: C.oliveDark,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
