import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Home, Pill, Wrench, BookOpen, BarChart2, Moon, Wind } from 'lucide-react-native';

const ACTIVE   = '#637746';   // dawn olive
const INACTIVE = '#ABA897';   // dawn dim

const SLEEP_BG         = '#1E1A14';
const SLEEP_TEXT_MAIN  = '#E7DDCC';
const SLEEP_TEXT_SUB   = 'rgba(231,221,204,0.55)';
const SLEEP_BTN_BG     = 'rgba(99,119,70,0.15)';
const SLEEP_BTN_BORDER = 'rgba(99,119,70,0.38)';

interface SleepRow { bedTime: string; wakeTime: string; }

function isInSleepTime(bedTime: string, wakeTime: string): boolean {
  const now  = new Date();
  const curr = now.getHours() * 60 + now.getMinutes();
  const [bH, bM] = bedTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  const bed  = bH * 60 + bM;
  const wake = wH * 60 + wM;
  // crosses midnight (e.g. 23:00 → 06:00): bed > wake
  if (bed > wake) return curr >= bed || curr < wake;
  // same day (e.g. 01:00 → 06:00): bed <= wake
  return curr >= bed && curr < wake;
}

export default function TabLayout() {
  const db = useSQLiteContext();
  const [showBarrier, setShowBarrier] = useState(false);
  const [dismissed,   setDismissed]   = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkSleepBarrier = useCallback(async () => {
    try {
      const row = await db.getFirstAsync<SleepRow>(
        'SELECT bedTime, wakeTime FROM SleepSettings WHERE isActive=1 LIMIT 1'
      );
      setShowBarrier(row ? isInSleepTime(row.bedTime, row.wakeTime) : false);
    } catch {
      setShowBarrier(false);
    }
  }, [db]);

  useEffect(() => {
    void checkSleepBarrier();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        setDismissed(false);
        void checkSleepBarrier();
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [checkSleepBarrier]);

  const handleBypass = () => {
    setDismissed(true);
    router.push('/(tabs)/tools');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   ACTIVE,
          tabBarInactiveTintColor: INACTIVE,
          tabBarStyle: {
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderTopColor:  '#E7DDCB',
            borderTopWidth:  0.5,
            paddingTop:      7,
            paddingBottom:   7,
            height:          62,
            shadowColor:     '#637746',
            shadowOffset:    { width: 0, height: -3 },
            shadowOpacity:   0.10,
            shadowRadius:    12,
            elevation:       16,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.1 },
        }}
      >
        <Tabs.Screen name="index"   options={{ title: '홈',    tabBarIcon: ({ color, size }) => <Home      size={size} color={color} /> }} />
        <Tabs.Screen name="meds"    options={{ title: '약물',  tabBarIcon: ({ color, size }) => <Pill      size={size} color={color} /> }} />
        <Tabs.Screen name="tools"   options={{ title: '도구함', tabBarIcon: ({ color, size }) => <Wrench   size={size} color={color} /> }} />
        <Tabs.Screen name="edu"     options={{ title: '교육',  tabBarIcon: ({ color, size }) => <BookOpen  size={size} color={color} /> }} />
        <Tabs.Screen name="summary" options={{ title: '요약',  tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} /> }} />
      </Tabs>

      <Modal
        visible={showBarrier && !dismissed}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => { /* intentionally block hardware back */ }}
      >
        <SafeAreaView style={bs.safe}>
          <View style={bs.content}>
            <View style={bs.iconWrap}>
              <Moon size={56} color={SLEEP_TEXT_MAIN} />
            </View>
            <Text style={bs.mainText}>
              지금은 마음과 뇌가{'\n'}쉬어야 하는 시간입니다. 🌿
            </Text>
            <Text style={bs.subText}>
              방해금지 모드를 켜고,{'\n'}편안한 호흡과 함께 스마트폰을 덮어주세요.
            </Text>
          </View>

          <TouchableOpacity style={bs.bypassBtn} onPress={handleBypass} activeOpacity={0.75}>
            <Wind size={16} color={SLEEP_TEXT_MAIN} />
            <Text style={bs.bypassText}>도구함 열기 (4-6 호흡법)</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const bs = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SLEEP_BG,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 32,
    opacity: 0.9,
  },
  mainText: {
    fontSize: 20,
    fontWeight: '500',
    color: SLEEP_TEXT_MAIN,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 22,
    letterSpacing: -0.2,
  },
  subText: {
    fontSize: 15,
    color: SLEEP_TEXT_SUB,
    textAlign: 'center',
    lineHeight: 26,
  },
  bypassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: SLEEP_BTN_BORDER,
    backgroundColor: SLEEP_BTN_BG,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  bypassText: {
    fontSize: 15,
    color: SLEEP_TEXT_MAIN,
    fontWeight: '500',
  },
});
