import React from 'react';
import { FlexWidget, TextWidget, RowWidget, ColumnWidget } from 'react-native-android-widget';
import type { OliveMindWidgetData } from '../src/widget/widgetData';

const TREE_EMOJIS: Record<number, string> = {
  0: '🌱', 1: '🌿', 2: '🌳', 3: '🌲',
  4: '🌴', 5: '🌟', 6: '🫒', 7: '💧',
};

const GREEN  = '#A8C07A';
const MUTED  = 'rgba(255,255,255,0.55)';
const FAINT  = 'rgba(255,255,255,0.22)';
const BG     = '#1A2A18';

// ── Android 홈 화면 위젯 컴포넌트 ────────────────────────────────────────────
// react-native-android-widget은 FlexWidget/TextWidget 등 전용 프리미티브를 사용함
export default function OliveMindAndroidWidget({
  treeLevel,
  routineDone,
  routineTotal,
  treeMessage,
}: OliveMindWidgetData) {
  const emoji = TREE_EMOJIS[treeLevel] ?? '🌱';
  const done  = Math.min(routineDone, routineTotal);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BG,
        borderRadius: 20,
        padding: 14,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ url: 'olivemind://index' }}
    >
      {/* 앱 이름 */}
      <TextWidget
        text="🌿 올리브 마인드"
        style={{ fontSize: 10, color: GREEN, fontWeight: 'bold', marginBottom: 6 }}
      />

      {/* 타마고치 이모지 */}
      <TextWidget
        text={emoji}
        style={{ fontSize: 44, marginBottom: 4 }}
      />

      {/* 상태 메시지 */}
      <TextWidget
        text={treeMessage}
        style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginBottom: 8 }}
      />

      {/* 루틴 진행 도트 */}
      <RowWidget style={{ justifyContent: 'center', marginBottom: 4 }}>
        {Array.from({ length: routineTotal }).map((_, i) => (
          <TextWidget
            key={String(i)}
            text="●"
            style={{ fontSize: 12, color: i < done ? GREEN : FAINT, marginHorizontal: 2 }}
          />
        ))}
      </RowWidget>

      {/* 루틴 수치 */}
      <TextWidget
        text={`루틴 ${done}/${routineTotal}`}
        style={{ fontSize: 9, color: FAINT }}
      />
    </FlexWidget>
  );
}
