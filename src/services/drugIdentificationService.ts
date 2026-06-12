// src/services/drugIdentificationService.ts

export interface DrugAppearanceRecord {
  itemSeq:    string;
  itemName:   string;
  entpName:   string;
  imageUrl:   string;
  printFront: string;
  printBack:  string;
  shape:      string;
  color1:     string;
  color2:     string;
  lineFont:   string;
  lineBack:   string;
  lengLong:   string;
  lengShort:  string;
  thick:      string;
  formulation: string;
  className:  string;
  etcOtc:     string;
}

// 검색 결과 1건 — 점수 및 매칭 세부 정보 포함
export interface DrugMatch {
  record:   DrugAppearanceRecord;
  score:    number;
  maxScore: number;
  matched:  string[];   // 일치한 조건 레이블
  missed:   string[];   // 불일치한 조건 레이블
}

export interface IdentificationFilter {
  form:    'tablet' | 'capsule' | 'unknown';
  colors:  string[];
  shape:   string;
  line:    'yes' | 'no' | 'unknown';
  score:   number;   // 최소 점수 임계값 (0 = 모든 매칭 표시)
  imprint: string;
  isCut:   boolean;
}

export interface SearchResult {
  exact:   DrugMatch[];   // 모든 조건 일치
  partial: DrugMatch[];   // 일부 조건 일치
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawData = require('../../assets/data/psychiatric_drugs_v6.json') as {
  drugs: DrugAppearanceRecord[];
};

const ALL_DRUGS: DrugAppearanceRecord[] = rawData.drugs;

const IMPRINT_W = 4;
const COLOR_W   = 3;
const FORM_W    = 2;
const LINE_W    = 1;
// 모양 가중치: 잘린 약이면 1, 아니면 2

// 각인 정규화: 공백·하이픈·점·언더스코어 제거 + "분할선"·"마크" 텍스트 제거
function normalizeImprint(s: string): string {
  return s.replace(/[\s\-._]/g, '').replace(/분할선|마크/g, '').toUpperCase();
}

export function searchDrugs(filter: IdentificationFilter): SearchResult {
  const hasImprint = filter.imprint.trim().length > 0;
  const hasColors  = filter.colors.length > 0;
  const hasForm    = filter.form  !== 'unknown';
  const hasShape   = filter.shape !== '모르겠음';
  const hasLine    = filter.line  !== 'unknown';
  const shapeW     = filter.isCut ? 1 : 2;

  if (!hasImprint && !hasColors && !hasForm && !hasShape && !hasLine) {
    return { exact: [], partial: [] };
  }

  let maxScore = 0;
  if (hasImprint) maxScore += IMPRINT_W;
  if (hasColors)  maxScore += COLOR_W;
  if (hasForm)    maxScore += FORM_W;
  if (hasShape)   maxScore += shapeW;
  if (hasLine)    maxScore += LINE_W;

  const threshold = Math.max(1, filter.score);
  const scored: DrugMatch[] = [];

  for (const drug of ALL_DRUGS) {
    const matched: string[] = [];
    const missed:  string[] = [];
    let score = 0;

    // ── 형태: 소프트 필터 (점수 기반, 하드 제외 없음)
    // HTML 참고: 잘못 식별한 경우도 부분일치로 표시하기 위해 continue 사용 안 함
    if (hasForm) {
      const isCapsule = drug.formulation.includes('캡슐');
      const formMatch =
        (filter.form === 'tablet'  && !isCapsule) ||
        (filter.form === 'capsule' &&  isCapsule);
      if (formMatch) {
        score += FORM_W;
        matched.push('형태');
      } else {
        missed.push('형태');
      }
    }

    // ── 색상: substring 포함 비교 (DB에 복합 표기 "하양/투명" 있을 수 있음)
    if (hasColors) {
      const c1 = drug.color1 ?? '';
      const c2 = drug.color2 ?? '';
      const colorHit = filter.colors.some(fc => c1.includes(fc) || c2.includes(fc));
      if (colorHit) {
        score += COLOR_W;
        matched.push('색상');
      } else {
        missed.push('색상');
      }
    }

    // ── 모양: startsWith/includes로 유연 매칭
    if (hasShape) {
      const shapeHit = drug.shape.startsWith(filter.shape) || drug.shape.includes(filter.shape);
      if (shapeHit) {
        score += shapeW;
        matched.push('모양');
      } else {
        missed.push('모양');
      }
    }

    // ── 분할선
    if (hasLine) {
      const hasLineVal = Boolean(drug.lineFont || drug.lineBack);
      const lineHit =
        (filter.line === 'yes' &&  hasLineVal) ||
        (filter.line === 'no'  && !hasLineVal);
      if (lineHit) {
        score += LINE_W;
        matched.push('분할선');
      } else {
        missed.push('분할선');
      }
    }

    // ── 각인: DB가 검색어를 포함(includes) 방향으로 매칭
    if (hasImprint) {
      const q     = normalizeImprint(filter.imprint);
      const front = normalizeImprint(drug.printFront);
      const back  = normalizeImprint(drug.printBack);
      const full  = front + back;

      // 완전 일치: DB 각인이 검색어를 포함, 또는 검색어가 앞뒤 합산에 포함
      const exactHit = q && (front.includes(q) || back.includes(q) || full.includes(q));
      if (exactHit) {
        score += IMPRINT_W;
        matched.push('각인');
      } else if (q && filter.isCut) {
        // 잘린 약 부분 매칭: 시작 일치·역방향 허용 (점수 70%)
        const partialHit =
          front.startsWith(q) || back.startsWith(q) ||
          (q.length >= 2 && (q.startsWith(front) || q.startsWith(back))) ||
          (front.length >= 2 && q.includes(front)) ||
          (back.length  >= 2 && q.includes(back));
        if (partialHit) {
          score += Math.round(IMPRINT_W * 0.7);
          matched.push('각인(부분)');
        } else {
          missed.push('각인');
        }
      } else if (q) {
        missed.push('각인');
      }
    }

    if (score >= threshold) {
      scored.push({ record: drug, score, maxScore, matched, missed });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const exact   = scored.filter(m => m.score >= m.maxScore).slice(0,  50);
  const partial = scored.filter(m => m.score <  m.maxScore).slice(0, 100);

  return { exact, partial };
}
