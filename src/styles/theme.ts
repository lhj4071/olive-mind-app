// ── Olive Mind Design System ──────────────────────────────────────────────────
// Calm, Headspace 수준의 정서적 안정감을 목표로 한 디자인 토큰

export const T = {
  // ── Colors ─────────────────────────────────────────────────────────────────
  // 새벽(Dawn) 리스킨 — 따뜻한 크림 배경 + 프로스티드 글라스 카드
  colors: {
    bg:          '#F4E8D6',   // 따뜻한 크림 배경
    card:        'rgba(255,255,255,0.72)',   // 프로스티드 글라스 (RN: backdrop-filter 없음, 반투명 흰색으로 근사)
    cardRaised:  'rgba(255,255,255,0.82)',   // 살짝 더 불투명한 레이어
    olive:       '#637746',   // 채도 낮춘 새벽 올리브
    oliveDark:   '#45582F',   // 깊은 올리브
    oliveFaded:  'rgba(99,119,70,0.15)',  // 올리브 페이드 (투명)
    text:        '#34372C',   // 다크 그린-브라운 텍스트
    textMuted:   '#84826E',   // 뮤트 텍스트
    dim:         '#ABA897',   // 딤 텍스트 / 비활성 아이콘
    border:      '#E7DDCB',   // 따뜻한 크림 경계선
    white:       '#FFFFFF',

    // 시맨틱 컬러
    phq9:        '#5C7C97',   // 차분한 블루
    gad7:        '#B07F4E',   // 따뜻한 앰버
    danger:      '#BF6B6B',   // 소프트 레드
    dangerDark:  'rgba(191,107,107,0.10)',
    dangerBorder:'rgba(191,107,107,0.28)',
    accent:      '#7A6FA8',   // 라벤더 퍼플
    accentDark:  'rgba(122,111,168,0.10)',
    accentBorder:'rgba(122,111,168,0.28)',
    green:       '#637746',   // olive와 동일
    purple:      '#7A6FA8',
    purpleDark:  'rgba(122,111,168,0.10)',
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
  // 올리브 컬러 그림자 — Calm앱 수준의 깊이감 (black 그림자 대신 브랜드 컬러 사용)
  shadow: {
    sm:  { shadowColor: '#637746', shadowOffset: { width: 0, height: 2  }, shadowOpacity: 0.12, shadowRadius: 6,  elevation: 2 },
    md:  { shadowColor: '#637746', shadowOffset: { width: 0, height: 4  }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 4 },
    lg:  { shadowColor: '#637746', shadowOffset: { width: 0, height: 8  }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 7 },
    xl:  { shadowColor: '#637746', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 28, elevation: 10 },
  },

  // ── Gradients ───────────────────────────────────────────────────────────────
  // 새벽 팔레트 그라디언트
  gradients: {
    mood:   ['#637746', '#45582F'] as [string, string],
    sleep:  ['#5C7C97', '#3E5470'] as [string, string],
    breath: ['#5C7C97', '#3E5470'] as [string, string],
    accent: ['#B07F4E', '#8A5A28'] as [string, string],
    button: ['#637746', '#45582F'] as [string, string],
    danger: ['#BF6B6B', '#8A4545'] as [string, string],
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
