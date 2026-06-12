import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider, defaultDatabaseDirectory, useSQLiteContext } from 'expo-sqlite';
import { Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { initializeDatabase } from '../src/db/schema';
import { widgetTaskHandler } from '../widgets/WidgetTaskHandler';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/useAuthStore';
import { useAppStore } from '../src/store/useAppStore';
import { pullFromSupabase } from '../src/lib/syncService';

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── 보호 라우팅 훅 ────────────────────────────────────────────────────────────
// session 확인 전(loaded=false)에는 라우팅하지 않아 깜빡임을 방지
function useProtectedRoute() {
  const { session, loaded } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (!loaded) return;

    const inAuth = segments[0] === '(auth)';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, loaded, segments]);
}

// ── 내부 레이아웃 (훅은 Stack 하위에서 사용해야 함) ────────────────────────────
function InnerLayout() {
  const db = useSQLiteContext();
  const { setSession, setLoaded } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 저장된 세션을 복원 — onAuthStateChange 첫 이벤트가 INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoaded(true);

        // 로그인 또는 앱 재시작 시 Supabase → SQLite pull 후 스토어 갱신
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          pullFromSupabase(db)
            .then(() => useAppStore.getState().refresh(db))
            .catch(() => {});
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  useProtectedRoute();

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const dbDirectory = useMemo(() => {
    if (Platform.OS === 'ios') {
      const shared = Paths.appleSharedContainers['group.com.lhj4071.olivemind'];
      return shared?.uri ?? defaultDatabaseDirectory;
    }
    return defaultDatabaseDirectory;
  }, []);

  return (
    <GestureHandlerRootView style={s.root}>
      <SQLiteProvider
        databaseName="olive-mind.db"
        directory={dbDirectory}
        onInit={initializeDatabase}
      >
        <InnerLayout />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
