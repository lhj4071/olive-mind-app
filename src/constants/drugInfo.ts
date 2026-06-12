import rawData from '../../assets/data/drug_info_v1.json';

export interface DrugInfoSection {
  heading: string;
  body: string;
}

export interface DrugInfoMisconception {
  myth: string;
  fact: string;
}

export interface DrugInfoFaqItem {
  question: string;
  answer: string;
}

export interface DrugInfoPart {
  id: string;
  category: 'understand' | 'drug_type' | 'practical';
  emoji: string;
  title: string;
  subtitle: string;
  drugClasses: string[];
  sections: DrugInfoSection[];
  misconceptions: DrugInfoMisconception[];
  faqItems: DrugInfoFaqItem[];
}

const _data = rawData as {
  categoryLabels: Record<string, string>;
  drugClassMap:   Record<string, string[]>;
  parts:          DrugInfoPart[];
};

export const DRUG_INFO_PARTS: DrugInfoPart[]              = _data.parts;
export const CATEGORY_LABELS: Record<string, string>      = _data.categoryLabels;
export const DRUG_CLASS_MAP:  Record<string, string[]>    = _data.drugClassMap;
export const CATEGORY_ORDER: Array<'understand' | 'drug_type' | 'practical'> = [
  'understand', 'drug_type', 'practical',
];

export function getPartIdsForClasses(drugClasses: string[]): Set<string> {
  const ids = new Set<string>();
  for (const cls of drugClasses) {
    DRUG_CLASS_MAP[cls.toLowerCase()]?.forEach(id => ids.add(id));
  }
  return ids;
}

// DrugInfo.cat (Korean) → DRUG_CLASS_MAP keys
export function catToDrugClasses(drugId: string, cat: string): string[] {
  const cls: string[] = [];
  if      (/ssri/i.test(cat))        cls.push('ssri', 'antidepressant');
  else if (/snri/i.test(cat))        cls.push('snri', 'antidepressant');
  else if (/항우울제/.test(cat))      cls.push('antidepressant');
  if      (/벤조디아제핀/.test(cat))  cls.push('benzodiazepine', 'anxiolytic');
  else if (/항불안제/.test(cat))      cls.push('anxiolytic');
  if (/수면제/.test(cat))             cls.push('sleep');
  if (/기분안정제/.test(cat)) {
    cls.push('mood_stabilizer');
    if (drugId === 'lithi') cls.push('lithium');
    if (drugId === 'valp')  cls.push('valproate');
  }
  if (/항정신병약/.test(cat)) {
    cls.push('antipsychotic');
    if (drugId === 'queti') cls.push('quetiapine');
  }
  if (/adhd|주의력/i.test(cat))       cls.push('adhd', 'methylphenidate');
  return [...new Set(cls)];
}
