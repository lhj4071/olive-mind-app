// ── Olive Mind Design System ──────────────────────────────────────────────────
// Calm, Headspace 수준의 정서적 안정감을 목표로 한 디자인 토큰

export const T = {
  // ── Colors ─────────────────────────────────────────────────────────────────
  // 기존 대비 채도를 낮추고 따뜻한 다크 톤으로 조정
  colors: {
    bg:          '#1E2720',   // 기존 #232D20 → 더 깊고 중립적인 다크 그린
    card:        '#252E21',   // 기존 #2C3A28 → 채도 낮춤, 따뜻한 뉘앙스
    cardRaised:  '#2C3628',   // 살짝 밝은 카드 (중첩 레이어용)
    olive:       '#9BAD80',   // 기존 #A8B58F → 채도 10-15% 낮춤
    oliveDark:   '#788A58',   // 기존 #839662 → 채도 낮춤
    oliveFaded:  '#293323',   // 기존 #3A4A34 → 더 깊게
    text:        '#E7E1D6',   // 기존 #F7F4EE → 따뜻한 크림 화이트 (눈 피로 감소)
    textMuted:   '#8A9386',   // 기존 #B5BAAF → 더 차분하게
    dim:         '#525B4D',   // 기존 #5A6A54 → 중립적
    border:      '#2C3728',   // 기존 #3A4A34 → 부드러운 경계
    white:       '#FFFFFF',

    // 시맨틱 컬러 (채도 낮춤)
    phq9:        '#5D7F9A',   // 기존 #6A8CA0 → 더 차분한 블루
    gad7:        '#B0835A',   // 기존 #C4956A → 더 차분한 앰버
    danger:      '#B86868',   // 기존 #F08080 → 더 차분한 레드
    dangerDark:  '#3E1A1A',
    dangerBorder:'#5C2020',
    accent:      '#7A6FA8',   // 기존 #9B91E0 → 더 차분한 퍼플
    accentDark:  '#28253C',
    accentBorder:'#5A527A',
    green:       '#9BAD80',   // olive와 동일
    purple:      '#5A4FA0',
    purpleDark:  '#32305C',
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  // 따뜻하고 가독성 높은 위계 구조
  typo: {
    // 화면 제목 - 명확하고 차분하게
    h1: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30, letterSpacing: -0.3 },
    // 섹션 제목 - 적절한 강조
    h2: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.2 },
    // 카드 제목 - 편안한 강조
    h3: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24, letterSpacing: -0.1 },
    // 본문 - 여유있는 줄 간격으로 편안하게
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 23 },
    // 보조 텍스트 - 숨 쉬는 간격
    small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
    // 레이블 / 배지
    label: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.6 },
    // 숫자 강조
    number: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  },

  // ── Spacing ─────────────────────────────────────────────────────────────────
  // 여백을 넉넉하게 → '숨 쉬는 디자인'
  space: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  36,
    xxl: 52,
  },

  // ── Border Radius ───────────────────────────────────────────────────────────
  // 유기적인 곡선으로 공격적인 느낌 제거
  radius: {
    xs:    8,
    sm:    12,
    md:    18,
    lg:    24,
    xl:    30,
    round: 999,
  },

  // ── Shadows ─────────────────────────────────────────────────────────────────
  // 부드럽고 낮은 그림자 (deep shadow 지양)
  shadow: {
    sm:  { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,  elevation: 1 },
    md:  { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,  elevation: 2 },
    lg:  { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 4 },
  },

  // ── Gradients ───────────────────────────────────────────────────────────────
  // 채도 낮춘 그라디언트 쌍
  gradients: {
    mood:   ['#6E7E50', '#4A5830'] as [string, string],
    sleep:  ['#3E5468', '#273848'] as [string, string],
    breath: ['#4A6A78', '#2E4855'] as [string, string],
    accent: ['#C07838', '#8A5020'] as [string, string],
    button: ['#9BAD80', '#788A58'] as [string, string],
    danger: ['#8B2020', '#6A1818'] as [string, string],
  },
} as const;

// 기존 코드와의 하위 호환성을 위한 C 팔레트 (각 화면에서 import 가능)
export const C = {
  bg:           T.colors.bg,
  card:         T.colors.card,
  cardRaised:   T.colors.cardRaised,
  olive:        T.colors.olive,
  oliveDark:    T.colors.oliveDark,
  oliveFaded:   T.colors.oliveFaded,
  warmGray:     T.colors.textMuted,
  warmGrayBg:   T.colors.card,
  text:         T.colors.text,
  textMuted:    T.colors.textMuted,
  border:       T.colors.border,
  dim:          T.colors.dim,
  white:        T.colors.white,
  phq9:         T.colors.phq9,
  gad7:         T.colors.gad7,
  danger:       T.colors.danger,
  dangerDark:   T.colors.dangerDark,
  dangerBorder: T.colors.dangerBorder,
  accent:       T.colors.accent,
  accentDark:   T.colors.accentDark,
  accentBorder: T.colors.accentBorder,
  green:        T.colors.green,
  purple:       T.colors.purple,
  purpleDark:   T.colors.purpleDark,
  muted:        T.colors.textMuted,
} as const;
