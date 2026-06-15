// src/utils/__tests__/templateUtils.test.ts
// renderTemplate 단위 테스트 — Jest 및 ts-node 양쪽으로 실행 가능.
// ts-node: npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' src/utils/__tests__/templateUtils.test.ts
// Jest:    npx jest

import { renderTemplate } from '../templateUtils';

function assertEqual<T>(actual: T, expected: T) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`Expected ${b} but got ${a}`);
}

// ── 케이스 1: 빈칸 없음 ──────────────────────────────────────────────────────
test('빈칸 없음 — text 그대로 반환, blankKeys 빈 배열', () => {
  const r = renderTemplate(
    '침대에 누웠을 때 마음이 편안하게 가라앉았으면 좋겠다',
    {},
  );
  assertEqual(r.text, '침대에 누웠을 때 마음이 편안하게 가라앉았으면 좋겠다');
  assertEqual(r.blankKeys, []);
});

// ── 케이스 2: 빈칸 1개, selectedValues 있음 ──────────────────────────────────
test('빈칸 1개 — selectedValues 값으로 치환', () => {
  const r = renderTemplate(
    '불안한 느낌이 들 때, [지속시간] 안에는 조금 가라앉는 경험을 해보고 싶다',
    { '지속시간': ['몇 분', '10분', '30분'] },
    { '지속시간': '10분' },
  );
  assertEqual(r.text, '불안한 느낌이 들 때, 10분 안에는 조금 가라앉는 경험을 해보고 싶다');
  assertEqual(r.blankKeys, ['지속시간']);
});

// ── 케이스 3: 빈칸 2개, selectedValues 모두 있음 ─────────────────────────────
// template에 조사를 두지 않고 blanks 선택지에 조사를 포함하는 패턴 검증
test('빈칸 2개 — 두 값 모두 치환', () => {
  const r = renderTemplate(
    '[시점] [시간] 동안 복식호흡 하기',
    { '시점': ['아침에', '자기 전에'], '시간': ['1분', '3분', '5분'] },
    { '시점': '아침에', '시간': '3분' },
  );
  assertEqual(r.text, '아침에 3분 동안 복식호흡 하기');
  assertEqual(r.blankKeys, ['시점', '시간']);
});

// ── 케이스 4: 빈칸 2개 중 일부만 selectedValues 제공 ─────────────────────────
test('일부만 선택 — 나머지는 blanks 첫 값으로 대체', () => {
  const r = renderTemplate(
    '[정도] 큰 동요 없이 [장소]을 할 수 있었으면 좋겠다',
    {
      '정도': ['한 정거장 정도는', '한 층 정도는'],
      '장소': ['지하철 타기', '엘리베이터 타기'],
    },
    { '장소': '엘리베이터 타기' },
  );
  assertEqual(r.text, '한 정거장 정도는 큰 동요 없이 엘리베이터 타기을 할 수 있었으면 좋겠다');
  assertEqual(r.blankKeys, ['정도', '장소']);
});

// ── 케이스 5: selectedValues 전혀 없음 — blanks 첫 값이 기본값 ───────────────
test('selectedValues 없음 — blanks 첫 값 전부 기본값', () => {
  const r = renderTemplate(
    '[시점]에 가족에게 짧게 인사하기',
    { '시점': ['하루에 한 번', '아침에', '자기 전에'] },
  );
  assertEqual(r.text, '하루에 한 번에 가족에게 짧게 인사하기');
  assertEqual(r.blankKeys, ['시점']);
});
