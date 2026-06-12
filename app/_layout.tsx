import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider, defaultDatabaseDirectory } from 'expo-sqlite';
import { Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { initializeDatabase } from '../src/db/schema';
import { widgetTaskHandler } from '../widgets/WidgetTaskHandler';

// Android 홈 화면 위젯 이벤트 수신 등록 (앱 시작 시 한 번)
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

export default function RootLayout() {
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // iOS: App Group 공유 컨테이너 경로 → 위젯 extension과 SQLite DB 파일 공유
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
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
