// src/utils/templateUtils.ts
// 매드립 템플릿 렌더링 유틸 (5.4절)

/**
 * template의 [빈칸이름]을 selectedValues 값으로(없으면 blanks의 첫 값으로) 치환해서
 * 완성 문장과 발견된 빈칸 키 목록을 반환한다.
 *
 * @param template     - '[시점]에 [시간] 동안 복식호흡 하기' 형태의 문자열
 * @param blanks       - { 시점: ['아침에', ...], 시간: ['1분', ...] }
 * @param selectedValues - { 시점: '아침에', 시간: '3분' } (부분 또는 전혀 없어도 됨)
 * @returns { text: '완성된 문장', blankKeys: ['시점', '시간'] }
 */
export function renderTemplate(
  template: string,
  blanks: Record<string, string[]>,
  selectedValues?: Record<string, string>,
): { text: string; blankKeys: string[] } {
  const blankPattern = /\[([^\]]+)\]/g;
  const blankKeys: string[] = [];

  // template에서 [키] 패턴을 순서대로 수집 (중복 제거)
  let match: RegExpExecArray | null;
  while ((match = blankPattern.exec(template)) !== null) {
    const key = match[1];
    if (!blankKeys.includes(key)) {
      blankKeys.push(key);
    }
  }

  // 각 키를 selectedValues → blanks 첫 값 순으로 치환
  let text = template;
  for (const key of blankKeys) {
    const value =
      selectedValues?.[key] ??
      (blanks[key]?.length ? blanks[key][0] : `[${key}]`);
    text = text.replace(`[${key}]`, value);
  }

  return { text, blankKeys };
}
