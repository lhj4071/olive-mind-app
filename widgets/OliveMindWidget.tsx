import { createWidget } from 'expo-widgets';
import { Column, Row, Text } from '@expo/ui';
import type { WidgetEnvironment } from 'expo-widgets';
import type { OliveMindWidgetData } from '../src/widget/widgetData';

// 타마고치 단계별 이모지 (PNG 이미지 대신 SwiftUI widget-safe 이모지 사용)
const TREE_EMOJIS: Record<number, string> = {
  0: '🌱', 1: '🌿', 2: '🌳', 3: '🌲',
  4: '🌴', 5: '🌟', 6: '🫒', 7: '💧',
};

const GREEN  = '#A8C07A';
const MUTED  = 'rgba(255,255,255,0.55)';
const FAINT  = 'rgba(255,255,255,0.25)';

// ── iOS 홈 화면 위젯 컴포넌트 ────────────────────────────────────────────────
const OliveMindWidget = (props: OliveMindWidgetData, env: WidgetEnvironment) => {
  'widget';

  const { treeLevel, routineDone, routineTotal, treeMessage } = props;
  const emoji   = TREE_EMOJIS[treeLevel] ?? '🌱';
  const done    = Math.min(routineDone, routineTotal);
  const isSmall = env.widgetFamily === 'systemSmall';

  // ── systemSmall ──────────────────────────────────────────────────────────
  if (isSmall) {
    return (
      <Column
        spacing={5}
        alignment="center"
        style={{ flex: 1, padding: 14 }}
      >
        <Text style={{ fontSize: 10, color: GREEN, fontWeight: '700', letterSpacing: 0.5 }}>
          🌿 올리브 마인드
        </Text>

        {/* 타마고치 */}
        <Text style={{ fontSize: 46, lineHeight: 54 }}>{emoji}</Text>

        {/* 상태 메시지 */}
        <Text style={{ fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 14 }}>
          {treeMessage}
        </Text>

        {/* 루틴 진행 점(dot) */}
        <Row spacing={4} alignment="center">
          {Array.from({ length: routineTotal }).map((_, i) => (
            <Text
              key={String(i)}
              style={{ fontSize: 12, color: i < done ? GREEN : FAINT }}
            >
              ●
            </Text>
          ))}
        </Row>

        <Text style={{ fontSize: 9, color: FAINT }}>
          루틴 {done}/{routineTotal}
        </Text>
      </Column>
    );
  }

  // ── systemMedium ─────────────────────────────────────────────────────────
  return (
    <Row
      spacing={16}
      alignment="center"
      style={{ flex: 1, paddingHorizontal: 18, paddingVertical: 14 }}
    >
      {/* 왼쪽: 나무 이모지 + 레벨 */}
      <Column spacing={4} alignment="center" style={{ width: 72 }}>
        <Text style={{ fontSize: 52 }}>{emoji}</Text>
        <Text style={{ fontSize: 9, color: FAINT }}>Lv.{treeLevel}</Text>
      </Column>

      {/* 오른쪽: 정보 */}
      <Column spacing={7} alignment="leading" style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: GREEN, fontWeight: '700', letterSpacing: 0.3 }}>
          🌿 올리브 마인드
        </Text>

        <Text style={{ fontSize: 11, color: MUTED, lineHeight: 16 }}>
          {treeMessage}
        </Text>

        {/* 루틴 진행 */}
        <Row spacing={6} alignment="center">
          <Text style={{ fontSize: 11, color: FAINT }}>오늘 루틴</Text>
          <Row spacing={4} alignment="center">
            {Array.from({ length: routineTotal }).map((_, i) => (
              <Text
                key={String(i)}
                style={{ fontSize: 13, color: i < done ? GREEN : FAINT }}
              >
                ●
              </Text>
            ))}
          </Row>
          <Text style={{ fontSize: 13, color: GREEN, fontWeight: '700' }}>
            {done}/{routineTotal}
          </Text>
        </Row>
      </Column>
    </Row>
  );
};

// createWidget 반환값에 updateTimeline / updateSnapshot 메서드가 있음
export default createWidget('OliveMindWidget', OliveMindWidget);
