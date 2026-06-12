import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';
import { buildWidgetData, type OliveMindWidgetData } from '../src/widget/widgetData';
import OliveMindAndroidWidget from './OliveMindAndroidWidget';

const DEFAULT_DATA: OliveMindWidgetData = {
  treeLevel:    0,
  routineDone:  0,
  routineTotal: 3,
  treeMessage:  '앱을 실행해 올리브를 키워보세요',
};

async function loadData(): Promise<OliveMindWidgetData> {
  try {
    const db   = await SQLite.openDatabaseAsync('olive-mind.db');
    const data = await buildWidgetData(db);
    await db.closeAsync();
    return data;
  } catch {
    return DEFAULT_DATA;
  }
}

// ── Android 위젯 이벤트 핸들러 ────────────────────────────────────────────────
// app/_layout.tsx에서 registerWidgetTaskHandler(widgetTaskHandler)로 등록됨
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      // DB에서 최신 데이터를 읽어 위젯 재렌더
      const data = await loadData();
      props.renderWidget(React.createElement(OliveMindAndroidWidget, data));
      break;
    }

    case 'WIDGET_DELETED':
      // 위젯이 홈 화면에서 제거됨 → 정리 작업 불필요
      break;

    case 'WIDGET_CLICK':
      // 위젯 클릭 시 딥링크로 앱 열기 (Android Intent)
      // OliveMindAndroidWidget의 clickAction="OPEN_APP" 이 처리함
      break;

    default:
      break;
  }
}
