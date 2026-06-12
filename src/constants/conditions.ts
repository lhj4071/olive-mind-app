import rawData from '../../assets/data/psychiatric_conditions_v1.json';

export interface ConditionSection {
  heading: string;
  body: string;
}

export interface ConditionMisconception {
  myth: string;
  fact: string;
}

export interface ConditionFaqItem {
  question: string;
  answer: string;
}

export interface ConditionRecord {
  id: string;
  category: string;
  emoji: string;
  title: string;
  summary: string;
  sections: ConditionSection[];
  misconceptions: ConditionMisconception[];
  faqItems: ConditionFaqItem[];
  whenToSeekHelp: string;
  symptomKeywords: string[];
}

export const CONDITIONS: ConditionRecord[] = rawData as ConditionRecord[];

export const CATEGORY_LABELS: Record<string, string> = {
  mood:      '기분',
  anxiety:   '불안',
  sleep:     '수면',
  cognitive: '인지',
  trauma:    '트라우마',
  addiction: '중독',
  psychosis: '정신증',
  other:     '기타',
  crisis:    '위기',
};

export const CATEGORY_ORDER: string[] = [
  'mood', 'anxiety', 'sleep', 'cognitive', 'trauma', 'addiction', 'psychosis', 'other', 'crisis',
];
