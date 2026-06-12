/**
 * survey1.tsx
 * 기분·불안·수면 평가 (Survey 1)
 * CES-D (우울 20문항) · BAI (불안 21문항) · HCL-32 (기분고양) · PSQI (수면) · C-SSRS (자살사고)
 *
 * UX: 한 화면에 하나의 문항, 선택 즉시 300ms 후 자동 넘김 (auto-advance)
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';
import { saveTestResult } from '../../src/lib/supabase';

// ── Supabase (REST, no SDK required) ─────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────
type QType = 'radio' | 'likert4' | 'binary' | 'text' | 'password' | 'number' | 'time' | 'consent';

interface Option { value: string | number; label: string }

interface Question {
  id:          string;
  section:     string;
  num:         string | number;
  text:        string;
  hint?:       string;
  type:        QType;
  options?:    Option[];
  required?:   boolean;
  autoAdv?:    boolean;   // default true for radio/binary/likert4/password
  visibleIf?:  (a: Answers) => boolean;
  // for 'number' type
  min?:  number; max?: number; step?: number; unit?: string; defaultVal?: number;
  // for 'time' type
  defaultTime?: string;
}

type Answers = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const ga = (a: Answers, k: string): any => a[k];
const gt = (a: Answers, k: string): string => a[k] ?? '';

// ── Question Data ─────────────────────────────────────────────────────────────

// 01 / 개인 식별
const IDENTITY: Question[] = [
  {
    id: 'consent', section: '개인 식별', num: '',
    text: '개인정보 수집·이용에 동의합니다 (진료 목적 / 건강정보 / 해외 서버)',
    hint: '3가지 항목에 모두 동의해야 다음으로 진행할 수 있습니다.',
    type: 'consent', required: true, autoAdv: false,
  },
  {
    id: 'id_code', section: '개인 식별', num: '',
    text: '이니셜 + 생년월일을 입력해 주세요',
    hint: '이름 이니셜(영문) + 생년월일 6자리 (YYMMDD) — 예: HGD070229',
    type: 'text', required: true, autoAdv: false,
  },
  {
    id: 'id_pw', section: '개인 식별', num: '',
    text: '비밀번호 (숫자 4자리)를 설정해 주세요',
    hint: '결과 확인 시 사용됩니다',
    type: 'password', required: true, autoAdv: true,
  },
];

// 02 / 기초 정보
const DEMO: Question[] = [
  {
    id: 'd_gender', section: '기초 정보', num: 1,
    text: '성별은 무엇입니까?', type: 'binary',
    options: [{ value: 'M', label: '남' }, { value: 'F', label: '여' }],
  },
  {
    id: 'd_birth', section: '기초 정보', num: 2,
    text: '몇 년도에 태어났습니까?', hint: '양력 출생연도 — 예: 1999',
    type: 'text', autoAdv: false,
  },
  {
    id: 'd_edu', section: '기초 정보', num: 3,
    text: '최종 학력 / 현재 재학 상황을 선택해 주세요', type: 'radio',
    options: [
      { value: 'mid_g',   label: '중학교 졸업' },
      { value: 'hi_g',    label: '고등학교 졸업' },
      { value: 'univ',    label: '대학교 재학 중' },
      { value: 'univ_g',  label: '대학교 졸업' },
      { value: 'grad',    label: '대학원 재학 중' },
      { value: 'grad_g',  label: '대학원 졸업' },
      { value: 'other',   label: '기타' },
    ],
  },
  {
    id: 'd_marry', section: '기초 정보', num: 4,
    text: '결혼 유무를 선택해 주세요', type: 'binary',
    options: [{ value: 'married', label: '기혼' }, { value: 'single', label: '미혼' }],
  },
  {
    id: 'd_phx', section: '기초 정보', num: 5,
    text: '지금까지 정신건강의학과 진료를 본 적이 있나요?', type: 'binary',
    options: [{ value: 'yes', label: '예' }, { value: 'no', label: '아니오' }],
  },
  {
    id: 'd_phx_det', section: '기초 정보', num: '5-1',
    text: '언제, 어떤 증상으로, 얼마나 치료받으셨는지 간단히 적어 주세요',
    hint: '예: 21년 우울증 약물 치료 6개월',
    type: 'text', autoAdv: false, required: false,
    visibleIf: a => ga(a, 'd_phx') === 'yes',
  },
  {
    id: 'd_alc', section: '기초 정보', num: 6,
    text: '현재 음주를 하십니까?', type: 'binary',
    options: [{ value: 'yes', label: '예' }, { value: 'no', label: '아니오' }],
  },
  {
    id: 'd_smk', section: '기초 정보', num: 7,
    text: '현재 흡연을 하십니까?', type: 'binary',
    options: [{ value: 'yes', label: '예' }, { value: 'no', label: '아니오' }],
  },
];

// 03 / CES-D 우울 (20문항)
const CESD_LBLS: Option[] = [
  { value: 0, label: '0 — 극히 드물었다' },
  { value: 1, label: '1 — 가끔 있었다' },
  { value: 2, label: '2 — 종종 있었다' },
  { value: 3, label: '3 — 대부분 그랬다' },
];
const CESD_ITEMS = [
  '평소에는 아무렇지도 않던 일들이 귀찮게 느껴졌다',
  '먹고 싶지 않았다; 입맛이 없었다',
  '가족이나 친구가 도와주더라도 울적한 기분을 떨쳐버릴 수 없었다',
  '무슨 일을 하든 정신을 집중하기가 힘들었다',
  '비교적 잘 지냈다',
  '상당히 우울했다',
  '하는 일마다 힘들게 느껴졌다',
  '미래에 대하여 희망적으로 느꼈다',
  '지금까지의 내 인생은 실패작이라는 생각이 들었다',
  '적어도 보통 사람들만큼의 능력은 있었다고 생각한다',
  '잠을 설쳤다 (잠을 잘 이루지 못했다)',
  '두려움을 느꼈다',
  '평소보다 말을 적게 했다; 말수가 줄었다',
  '세상에 홀로 있는 듯한 외로움을 느꼈다',
  '큰 불만 없이 생활했다',
  '사람들이 나에게 차갑게 대하는 것 같았다',
  '갑자기 울음이 나왔다',
  '마음이 슬펐다',
  '사람들이 나를 싫어하는 것 같았다',
  '도무지 무엇을 시작할 기운이 나지 않았다',
];
const DEP: Question[] = CESD_ITEMS.map((text, i) => ({
  id: `dep_${i + 1}`, section: 'CES-D 우울 척도', num: i + 1,
  text, type: 'likert4' as QType, options: CESD_LBLS,
  hint: '지난 일주일 동안의 상태에 표시해 주세요',
}));

// 04 / BAI 불안 (21문항)
const BAI_LBLS: Option[] = [
  { value: 0, label: '0 — 전혀 느끼지 않았다' },
  { value: 1, label: '1 — 조금 느꼈다' },
  { value: 2, label: '2 — 상당히 느꼈다' },
  { value: 3, label: '3 — 심하게 느꼈다' },
];
const BAI_ITEMS = [
  '가끔씩 몸이 저리고 쑤시며 감각이 마비된 느낌을 받는다',
  '흥분된 느낌을 받는다',
  '가끔씩 다리가 떨리곤 한다',
  '편안하게 쉴 수가 없다',
  '매우 나쁜 일이 일어날 것 같은 두려움을 느낀다',
  '어지러움(현기증)을 느낀다',
  '가끔씩 심장이 두근거리고 빨리 뛴다',
  '침착하지 못하다',
  '자주 겁을 먹고 무서움을 느낀다',
  '신경이 과민 되어 있다',
  '가끔씩 숨이 막히고 질식할 것 같다',
  '자주 손이 떨린다',
  '안절부절 못 한다',
  '미칠 것 같은 두려움을 느낀다',
  '가끔씩 숨쉬기 곤란할 때가 있다',
  '죽을 것 같은 두려움을 느낀다',
  '불안한 상태에 있다',
  '자주 소화가 잘 안되고 뱃속이 불편하다',
  '가끔씩 기절할 것 같다',
  '자주 얼굴이 붉어지곤 한다',
  '땀을 많이 흘린다 (더위로 인한 경우 제외)',
];
const ANX: Question[] = BAI_ITEMS.map((text, i) => ({
  id: `anx_${i + 1}`, section: 'BAI 불안 척도', num: i + 1,
  text, type: 'likert4' as QType, options: BAI_LBLS,
  hint: '오늘을 포함해서 지난 한 주 동안 경험한 정도를 표시해 주세요',
}));

// 05 / HCL-32 기분 고양
const HCL_ITEMS = [
  '잠자고 싶은 욕구가 줄었다',       '전보다 기운이 나고 활동적이다',
  '더욱 자신감이 넘친다',             '전보다 일하는 게 더 즐겁다',
  '전보다 사람들을 많이 만난다',      '평소보다 여행을 더 많이 다닌다',
  '전보다 더 빨리, 더 위험하게 운전한다', '돈 씀씀이가 헤퍼졌다',
  '전보다 위험한 일을 더 많이 한다',  '전보다 운동을 더 많이 한다',
  '이런저런 계획을 더 많이 세운다',   '자꾸 새로운 아이디어가 떠오른다',
  '부끄러움이 없어지고 할 말을 하게 되었다', '옷차림이나 화장이 전보다 화려해졌다',
  '더 많은 사람들과 만나고 싶다',     '섹스에 대한 관심이 늘었다',
  '전보다 성관계를 많이 한다',        '말이 많아졌다',
  '머리 회전이 빨라졌다',             '대화 중 농담·장난을 더 많이 한다',
  '전보다 산만해졌다',                '새로운 것에 대한 관심이 늘었다',
  '생각이 자주 바뀐다',               '전보다 더 빨리, 더 쉽게 일을 한다',
  '참을성이 줄고 더 쉽게 짜증을 낸다', '나는 다른 사람들을 짜증나게 한다',
  '싸움에 말려드는 일이 늘었다',       '전보다 기분이 좋고 낙천적이다',
  '커피를 더 많이 마신다',             '담배를 더 많이 피운다',
  '술을 더 많이 마신다',              '약을 더 많이 먹는다',
];
const HCL_OPTS: Option[] = [{ value: 'yes', label: '예' }, { value: 'no', label: '아니오' }];
const anyHclYes = (a: Answers) => HCL_ITEMS.some((_, i) => ga(a, `hcl_${i + 1}`) === 'yes');

const HCL: Question[] = [
  {
    id: 'hcl_q1', section: 'HCL-32 기분 고양', num: 1,
    text: '평소와 비교해 오늘은 기분이 어떻습니까?', type: 'radio',
    options: [
      { value: 0, label: '0 — 평소보다 매우 안 좋다' },
      { value: 1, label: '1 — 평소보다 안 좋다' },
      { value: 2, label: '2 — 평소보다 조금 안 좋다' },
      { value: 3, label: '3 — 평소와 비슷하다' },
      { value: 4, label: '4 — 평소보다 조금 좋다' },
      { value: 5, label: '5 — 평소보다 좋다' },
      { value: 6, label: '6 — 평소보다 매우 좋다' },
    ],
  },
  {
    id: 'hcl_q2', section: 'HCL-32 기분 고양', num: 2,
    text: '다른 사람들에 비해 평소 나의 에너지, 활동량, 기분은?', type: 'radio',
    options: [
      { value: 0, label: '두드러진 차이가 없다' },
      { value: 1, label: '일반적으로 더 높다' },
      { value: 2, label: '일반적으로 더 낮다' },
      { value: 3, label: '높고 낮음을 반복한다' },
    ],
  },
  ...HCL_ITEMS.map((text, i) => ({
    id: `hcl_${i + 1}`, section: 'HCL-32 기분 고양', num: i + 3,
    text, type: 'binary' as QType, options: HCL_OPTS,
    hint: '\'넘쳤던(많았던/좋았던)\' 시기에 해당되는지 표시해 주세요',
  })),
  {
    id: 'hcl_react', section: 'HCL-32 기분 고양', num: 35,
    text: '\'넘쳤던\' 시기에 대한 다른 사람들의 반응', type: 'radio',
    visibleIf: anyHclYes,
    options: [
      { value: 'pos',  label: '긍정적 (격려·지지)' },
      { value: 'neu',  label: '중립적' },
      { value: 'neg',  label: '부정적 (걱정·화·비판)' },
      { value: 'mix',  label: '긍정적이기도 하고 부정적이기도 함' },
      { value: 'none', label: '반응 없음' },
    ],
    required: false,
  },
  {
    id: 'hcl_dur', section: 'HCL-32 기분 고양', num: 36,
    text: '\'넘쳤던\' 기간은 평균 얼마나 지속되었습니까?', type: 'radio',
    visibleIf: anyHclYes,
    options: [
      { value: 'd1',  label: '1일' },
      { value: 'd23', label: '2–3일' },
      { value: 'd47', label: '4–7일' },
      { value: 'w1',  label: '1주일 이상' },
      { value: 'm1',  label: '1개월 이상' },
      { value: 'unk', label: '판단할 수 없음' },
    ],
    required: false,
  },
  {
    id: 'hcl_recent', section: 'HCL-32 기분 고양', num: 37,
    text: '지난 12개월 동안 \'넘쳤던 시기\'를 경험한 적이 있습니까?', type: 'binary',
    options: HCL_OPTS, visibleIf: anyHclYes, required: false,
  },
  {
    id: 'hcl_days', section: 'HCL-32 기분 고양', num: 38,
    text: '지난 12개월 중 약 며칠 동안 넘쳤던 상태였습니까?',
    type: 'number', min: 0, max: 365, step: 1, unit: '일', defaultVal: 0,
    visibleIf: a => ga(a, 'hcl_recent') === 'yes', required: false, autoAdv: false,
  },
];

// 06 / PSQI 수면
const FREQ_OPTS: Option[] = [
  { value: 0, label: '지난 한달 없었다' },
  { value: 1, label: '한 주에 1번 미만' },
  { value: 2, label: '한 주에 1–2번' },
  { value: 3, label: '한 주에 3번 이상' },
];
const PSQI5_ROWS = [
  { id: 'a', label: '취침 후 30분 이내 잠 못 듦' },
  { id: 'b', label: '한밤중·새벽에 깸' },
  { id: 'c', label: '화장실 때문에 깸' },
  { id: 'd', label: '숨쉬기 불편' },
  { id: 'e', label: '코골기·기침' },
  { id: 'f', label: '너무 추움' },
  { id: 'g', label: '너무 더움' },
  { id: 'h', label: '나쁜 꿈' },
  { id: 'i', label: '통증' },
  { id: 'j', label: '기타 이유' },
];
const SLEEP: Question[] = [
  {
    id: 'psqi_bed', section: 'PSQI 수면', num: 1,
    text: '평소 몇 시에 잠자리에 드십니까?',
    hint: '지난 한 달 기준',
    type: 'time', defaultTime: '22:00', autoAdv: false,
  },
  {
    id: 'psqi_lat', section: 'PSQI 수면', num: 2,
    text: '침대에 누운 후 잠드는 데 얼마나 걸립니까?',
    type: 'number', min: 0, max: 300, step: 5, unit: '분', defaultVal: 20, autoAdv: false,
  },
  {
    id: 'psqi_wake', section: 'PSQI 수면', num: 3,
    text: '평소 아침 몇 시에 일어나십니까?',
    type: 'time', defaultTime: '07:00', autoAdv: false,
  },
  {
    id: 'psqi_sleep', section: 'PSQI 수면', num: 4,
    text: '밤에 실제로 잠잔 시간은 얼마나 됩니까?',
    type: 'number', min: 0, max: 16, step: 0.5, unit: '시간', defaultVal: 7, autoAdv: false,
  },
  ...PSQI5_ROWS.map((row, i) => ({
    id: `psqi_5${row.id}`, section: 'PSQI 수면', num: `5-${String.fromCharCode(65 + i)}`,
    text: `수면 방해 — ${row.label}`, type: 'radio' as QType, options: FREQ_OPTS,
    hint: '지난 한 달 동안 이 이유로 잠드는 데 얼마나 자주 문제가 있었습니까?',
  })),
  {
    id: 'psqi_6', section: 'PSQI 수면', num: 6,
    text: '전반적으로 수면의 질이 어느 정도라고 평가하십니까?', type: 'radio',
    options: [
      { value: 'very_good',   label: '매우 좋음' },
      { value: 'fairly_good', label: '상당히 좋음' },
      { value: 'fairly_bad',  label: '상당히 나쁨' },
      { value: 'very_bad',    label: '매우 나쁨' },
    ],
  },
  {
    id: 'psqi_7', section: 'PSQI 수면', num: 7,
    text: '잠이 들기 위해 얼마나 자주 약을 복용했습니까?', type: 'radio',
    options: FREQ_OPTS,
  },
  {
    id: 'psqi_8', section: 'PSQI 수면', num: 8,
    text: '운전·식사·사회활동 중 얼마나 자주 졸음을 느꼈습니까?', type: 'radio',
    options: FREQ_OPTS,
  },
  {
    id: 'psqi_9', section: 'PSQI 수면', num: 9,
    text: '일에 열중하는 데 얼마나 많은 문제가 있었습니까?', type: 'radio',
    options: [
      { value: 0, label: '전혀 없었다' },
      { value: 1, label: '매우 조금 있었다' },
      { value: 2, label: '다소 있었다' },
      { value: 3, label: '매우 많이 있었다' },
    ],
  },
];

// 07 / C-SSRS 자살 사고
const SS: Question[] = [
  {
    id: 'ss_1', section: 'C-SSRS 자살사고', num: 1,
    text: '최근 몇 달 동안 죽고 싶다거나 잠든 뒤 깨어나지 않았으면 좋겠다고 바란 적이 있습니까?',
    type: 'binary', options: HCL_OPTS,
  },
  {
    id: 'ss_2', section: 'C-SSRS 자살사고', num: 2,
    text: '최근 몇 달 동안 실제로 자살을 생각해 본 적이 있습니까?',
    type: 'binary', options: [{ value: 'yes', label: '예' }, { value: 'no', label: '아니오' }],
  },
  {
    id: 'ss_3', section: 'C-SSRS 자살사고', num: 3,
    text: '자살에 대해 어떻게 실행에 옮길지 생각해 본 적이 있습니까?',
    type: 'binary', options: HCL_OPTS,
    visibleIf: a => ga(a, 'ss_2') === 'yes',
  },
  {
    id: 'ss_4', section: 'C-SSRS 자살사고', num: 4,
    text: '이런 생각을 실행할 의도가 어느 정도 있었습니까?',
    type: 'binary', options: HCL_OPTS,
    visibleIf: a => ga(a, 'ss_2') === 'yes',
  },
  {
    id: 'ss_5', section: 'C-SSRS 자살사고', num: 5,
    text: '자살 방법을 자세하게 궁리하고 실행할 의도가 있었습니까?',
    type: 'binary', options: HCL_OPTS,
    visibleIf: a => ga(a, 'ss_2') === 'yes',
  },
  {
    id: 'ss_6', section: 'C-SSRS 자살사고', num: 6,
    text: '평생 동안 자신의 인생을 끝내기 위한 행동을 시작하거나 준비한 적이 있습니까?',
    hint: '알약 수집, 유서 작성, 실제 시도 등 포함',
    type: 'binary', options: HCL_OPTS, required: false,
  },
  {
    id: 'ss_7', section: 'C-SSRS 자살사고', num: 7,
    text: '6번이 "예"인 경우, 이것이 최근 3개월 이내였습니까?',
    type: 'binary', options: HCL_OPTS,
    visibleIf: a => ga(a, 'ss_6') === 'yes', required: false,
  },
];

const ALL_QUESTIONS: Question[] = [
  ...IDENTITY, ...DEMO, ...DEP, ...ANX, ...HCL, ...SLEEP, ...SS,
];

// ── Scoring Functions ─────────────────────────────────────────────────────────
function scoreDep(a: Answers) {
  const rev = [5, 8, 10, 15];
  let total = 0;
  for (let i = 1; i <= 20; i++) {
    const v = ga(a, `dep_${i}`);
    if (v === undefined) continue;
    const sc = rev.includes(i) ? 3 - Number(v) : Number(v);
    total += sc;
  }
  return total;
}

function scoreAnx(a: Answers) {
  let total = 0;
  for (let i = 1; i <= 21; i++) {
    const v = ga(a, `anx_${i}`);
    if (v !== undefined) total += Number(v);
  }
  return total;
}

function scoreHcl(a: Answers) {
  let total = 0;
  for (let i = 1; i <= 32; i++) {
    if (ga(a, `hcl_${i}`) === 'yes') total++;
  }
  return total;
}

function scorePSQI(a: Answers) {
  const bed    = gt(a, 'psqi_bed')  || '22:00';
  const wake   = gt(a, 'psqi_wake') || '07:00';
  const lat    = Number(ga(a, 'psqi_lat')  ?? 20);
  const sl     = Number(ga(a, 'psqi_sleep') ?? 7);
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let wm2 = wh * 60 + wm, bm2 = bh * 60 + bm;
  if (wm2 <= bm2) wm2 += 1440;
  const tbp = (wm2 - bm2) / 60;
  const eff = tbp > 0 ? Math.round(sl / tbp * 100) : 0;
  const c1 = ({ very_good: 0, fairly_good: 1, fairly_bad: 2, very_bad: 3 } as any)[ga(a, 'psqi_6')] ?? 0;
  const latSc = lat <= 15 ? 0 : lat <= 30 ? 1 : lat <= 60 ? 2 : 3;
  const p5a = Number(ga(a, 'psqi_5a') ?? 0);
  const c2r = latSc + p5a;
  const c2 = c2r === 0 ? 0 : c2r <= 2 ? 1 : c2r <= 4 ? 2 : 3;
  const c3 = sl > 7 ? 0 : sl > 6 ? 1 : sl > 5 ? 2 : 3;
  const c4 = eff >= 85 ? 0 : eff >= 75 ? 1 : eff >= 65 ? 2 : 3;
  const dKeys = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const dSum = dKeys.reduce((s, k) => s + Number(ga(a, `psqi_5${k}`) ?? 0), 0);
  const c5 = dSum === 0 ? 0 : dSum <= 9 ? 1 : dSum <= 18 ? 2 : 3;
  const c6 = Number(ga(a, 'psqi_7') ?? 0);
  const c7r = Number(ga(a, 'psqi_8') ?? 0) + Number(ga(a, 'psqi_9') ?? 0);
  const c7 = c7r === 0 ? 0 : c7r <= 2 ? 1 : c7r <= 4 ? 2 : 3;
  return { total: c1 + c2 + c3 + c4 + c5 + c6 + c7, sl, eff, lat };
}

function scoreSS(a: Answers) {
  const flags = [1, 2, 3, 4, 5].map(i => ga(a, `ss_${i}`) === 'yes');
  let lv = 0;
  if (flags[4]) lv = 5; else if (flags[3]) lv = 4;
  else if (flags[2]) lv = 3; else if (flags[1]) lv = 2;
  else if (flags[0]) lv = 1;
  return lv;
}

function buildSummary(a: Answers): string {
  const dep = scoreDep(a), anx = scoreAnx(a), hcl = scoreHcl(a);
  const { total: pq } = scorePSQI(a);
  const ss = scoreSS(a);
  const depBadge = dep >= 27 ? '높은위험' : dep >= 20 ? '중등도' : dep >= 16 ? '경증' : '정상';
  const anxBadge = anx >= 26 ? '중증' : anx >= 16 ? '중등도' : anx >= 8 ? '경증' : '최소';
  const hclBadge = hcl >= 14 ? '양성' : '음성';
  const pqBadge  = pq >= 8 ? '수면장애의심' : pq > 5 ? '수면질저하' : '정상';
  return `CES-D:${dep}(${depBadge}) | BAI:${anx}(${anxBadge}) | HCL:${hcl}(${hclBadge}) | PSQI:${pq}(${pqBadge}) | C-SSRS:${ss}단계`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Survey1() {
  const db = useSQLiteContext();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [scores, setScores]   = useState<{ dep: number; anx: number; hcl: number; psqi: number; ss: number } | null>(null);

  const answersRef  = useRef<Answers>({});
  const finishedRef = useRef(false);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(16)).current;

  // Compute visible questions from LATEST answers
  const visibleQuestions = useMemo(
    () => ALL_QUESTIONS.filter(q => !q.visibleIf || q.visibleIf(answers)),
    [answers],
  );

  // Animate in on question change
  useEffect(() => {
    setSelectedVal(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // Save and finish
  const finishSurvey = useCallback(async (finalAnswers: Answers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSaving(true);

    const dep  = scoreDep(finalAnswers);
    const anx  = scoreAnx(finalAnswers);
    const hcl  = scoreHcl(finalAnswers);
    const psqi = scorePSQI(finalAnswers).total;
    const ss   = scoreSS(finalAnswers);
    const summary = buildSummary(finalAnswers);

    setScores({ dep, anx, hcl, psqi, ss });

    // 1. Save to SQLite
    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [
          new Date().toISOString().split('T')[0],
          'survey1',
          dep,
          JSON.stringify({ dep, anx, hcl, psqi, ss, summary }),
        ],
      );
    } catch (e) { /* ignore duplicate date */ }

    // 2. Attempt Supabase upsert (requires auth; gracefully fails without it)
    saveTestResult('기분·불안·수면 평가 (Survey 1)', dep, summary).catch(() => {});

    setSaving(false);
    setDone(true);
  }, [db]);

  // Handle answer selection
  const handleAnswer = useCallback((qId: string, value: any, autoAdv = true) => {
    answersRef.current = { ...answersRef.current, [qId]: value };
    setAnswers({ ...answersRef.current });

    if (autoAdv) {
      setSelectedVal(value);
      setTimeout(() => {
        const visible = ALL_QUESTIONS.filter(q => !q.visibleIf || q.visibleIf(answersRef.current));
        setStep(prev => {
          const next = prev + 1;
          if (next >= visible.length) {
            finishSurvey(answersRef.current);
            return prev;
          }
          return next;
        });
      }, 300);
    }
  }, [finishSurvey]);

  const advanceManually = useCallback(() => {
    Keyboard.dismiss();
    const visible = ALL_QUESTIONS.filter(q => !q.visibleIf || q.visibleIf(answersRef.current));
    const next = step + 1;
    if (next >= visible.length) {
      finishSurvey(answersRef.current);
    } else {
      setStep(next);
    }
  }, [step, finishSurvey]);

  const goBack = useCallback(() => {
    if (step === 0) { router.back(); return; }
    setStep(prev => prev - 1);
  }, [step]);

  const currentQ = visibleQuestions[step];
  const totalVisible = visibleQuestions.length;
  const progress = totalVisible > 0 ? (step + 1) / totalVisible : 0;

  // ── DONE screen ──────────────────────────────────────────────────────────────
  if (done && scores) {
    const { dep, anx, hcl, psqi, ss } = scores;
    const depLabel = dep >= 27 ? '높은 위험' : dep >= 20 ? '중등도' : dep >= 16 ? '경증' : '정상 범위';
    const anxLabel = anx >= 26 ? '중증'     : anx >= 16 ? '중등도' : anx >= 8  ? '경증' : '최소/정상';
    const pqLabel  = psqi >= 8 ? '수면장애 의심' : psqi > 5 ? '수면질 저하' : '정상';
    const ssLabel  = ['음성', '죽고싶은 생각', '자살을 생각함', '방법을 생각함', '실행 의도', '구체적 계획'][ss] ?? '';
    const isCrisis = ss >= 2;

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>검사 완료 ✓</Text>
          <Text style={s.doneSub}>결과가 저장되었습니다</Text>

          {isCrisis && (
            <View style={s.crisisBox}>
              <Text style={s.crisisTitle}>⚠ 자살 사고 주의</Text>
              <Text style={s.crisisText}>
                C-SSRS {ss}단계가 확인되었습니다. 즉각적인 임상 평가가 필요합니다.{'\n'}
                정신건강 위기상담: 1577-0199 · 자살예방상담: 1393 (24시간)
              </Text>
            </View>
          )}

          <View style={s.scoreGrid}>
            {[
              { name: '우울 (CES-D)', score: dep, max: 60, label: depLabel, warn: dep >= 16 },
              { name: '불안 (BAI)',   score: anx, max: 63, label: anxLabel, warn: anx >= 8  },
              { name: '기분고양 (HCL-32)', score: hcl, max: 32, label: hcl >= 14 ? '양성' : '음성', warn: hcl >= 14 },
              { name: '수면 (PSQI)', score: psqi, max: 21, label: pqLabel, warn: psqi > 5 },
              { name: '자살사고 (C-SSRS)', score: ss, max: 5, label: ssLabel, warn: ss >= 1 },
            ].map(item => (
              <View key={item.name} style={[s.scoreCard, item.warn && s.scoreCardWarn]}>
                <Text style={s.scoreName}>{item.name}</Text>
                <View style={s.scoreRow}>
                  <Text style={s.scoreVal}>{item.score}</Text>
                  <Text style={s.scoreMax}>/ {item.max}</Text>
                </View>
                <View style={[s.scoreBadge, item.warn ? s.badgeWarn : s.badgeOk]}>
                  <Text style={[s.scoreBadgeText, item.warn ? s.badgeWarnText : s.badgeOkText]}>
                    {item.label}
                  </Text>
                </View>
                {item.max > 1 && (
                  <View style={s.miniBar}>
                    <View style={[
                      s.miniBarFill,
                      { width: `${Math.min(100, Math.round(item.score / item.max * 100))}%` as any },
                      item.warn ? s.miniBarWarn : s.miniBarOk,
                    ]} />
                  </View>
                )}
              </View>
            ))}
          </View>

          <Text style={s.disclaimer}>
            본 결과는 선별 목적의 참고 자료이며, 진단을 의미하지 않습니다.
            정확한 평가는 담당 정신건강의학과 전문의의 면담을 통해 이루어집니다.
          </Text>

          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => router.replace('/(surveys)/qmain')}
          >
            <Text style={s.doneBtnText}>← 검사 허브로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQ) return null;

  const isAutoAdv = currentQ.autoAdv !== false && ['radio', 'binary', 'likert4'].includes(currentQ.type);
  const needsNext = !isAutoAdv;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Survey 1 · {currentQ.section}</Text>
            <Text style={s.stepCounter}>{step + 1} / {totalVisible}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Question card */}
            <View style={s.qCard}>
              {currentQ.num !== '' && (
                <Text style={s.qNum}>{currentQ.num}.</Text>
              )}
              <Text style={s.qText}>{currentQ.text}</Text>
              {currentQ.hint && <Text style={s.qHint}>{currentQ.hint}</Text>}

              <View style={s.controlWrap}>
                <QuestionControl
                  question={currentQ}
                  answers={answers}
                  selectedVal={selectedVal}
                  onAnswer={handleAnswer}
                  onNext={advanceManually}
                />
              </View>

              {needsNext && (
                <TouchableOpacity style={s.nextBtn} onPress={advanceManually}>
                  <Text style={s.nextBtnText}>다음 →</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Question Control ──────────────────────────────────────────────────────────
interface QControlProps {
  question:    Question;
  answers:     Answers;
  selectedVal: any;
  onAnswer:    (id: string, value: any, autoAdv?: boolean) => void;
  onNext:      () => void;
}

function QuestionControl({ question, answers, selectedVal, onAnswer }: QControlProps) {
  const q   = question;
  const cur = ga(answers, q.id);

  // ── BINARY / RADIO: vertical options list ──
  if (q.type === 'binary' || q.type === 'radio' || q.type === 'likert4') {
    const opts = q.options ?? [];
    const isAuto = q.autoAdv !== false;
    return (
      <View style={s.optList}>
        {opts.map(opt => {
          const isSelected = isAuto
            ? selectedVal === opt.value || cur === opt.value
            : cur === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[s.optBtn, isSelected && s.optBtnSel]}
              onPress={() => onAnswer(q.id, opt.value, isAuto)}
              activeOpacity={0.7}
            >
              <View style={[s.optDot, isSelected && s.optDotSel]}>
                {isSelected && <View style={s.optDotInner} />}
              </View>
              <Text style={[s.optLabel, isSelected && s.optLabelSel]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── TEXT / PASSWORD ──
  if (q.type === 'text' || q.type === 'password') {
    return (
      <TextInput
        style={s.textInput}
        value={typeof cur === 'string' ? cur : ''}
        onChangeText={v => {
          onAnswer(q.id, v, false);
          if (q.type === 'password' && v.length === 4) {
            onAnswer(q.id, v, true);
          }
        }}
        placeholder={q.hint ?? (q.type === 'password' ? '예: 1234' : '')}
        placeholderTextColor={C.textMuted}
        secureTextEntry={q.type === 'password'}
        keyboardType={q.type === 'password' ? 'number-pad' : 'default'}
        maxLength={q.type === 'password' ? 4 : undefined}
        autoFocus
      />
    );
  }

  // ── NUMBER: stepper ──
  if (q.type === 'number') {
    const val = cur ?? q.defaultVal ?? 0;
    const min = q.min ?? 0;
    const max = q.max ?? 100;
    const step = q.step ?? 1;
    const dec = step < 1 ? 1 : 0;
    const change = (delta: number) => {
      const next = Math.min(max, Math.max(min, Number(val) + delta));
      onAnswer(q.id, Number(next.toFixed(dec)), false);
    };
    return (
      <View style={s.stepper}>
        <TouchableOpacity style={s.stepBtn} onPress={() => change(-step)}>
          <Text style={s.stepBtnText}>−</Text>
        </TouchableOpacity>
        <View style={s.stepValWrap}>
          <Text style={s.stepVal}>{Number(val).toFixed(dec)}</Text>
          {q.unit && <Text style={s.stepUnit}>{q.unit}</Text>}
        </View>
        <TouchableOpacity style={s.stepBtn} onPress={() => change(step)}>
          <Text style={s.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── TIME: HH:MM ──
  if (q.type === 'time') {
    const timeStr: string = typeof cur === 'string' ? cur : (q.defaultTime ?? '22:00');
    const parts  = timeStr.split(':');
    const hour   = parseInt(parts[0], 10) || 22;
    const minute = parseInt(parts[1], 10) || 0;
    const setTime = (h: number, m: number) => {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      onAnswer(q.id, `${hh}:${mm}`, false);
    };
    const changeH = (d: number) => setTime(Math.min(23, Math.max(0, hour + d)), minute);
    const changeM = (d: number) => {
      const mins = [0, 10, 20, 30, 40, 50];
      const idx  = mins.indexOf(minute);
      const next = mins[Math.max(0, Math.min(mins.length - 1, idx + d))] ?? minute;
      setTime(hour, next);
    };
    return (
      <View style={s.timeWrap}>
        <View style={s.timeBlock}>
          <TouchableOpacity style={s.timeBtn} onPress={() => changeH(1)}><Text style={s.timeBtnTxt}>▲</Text></TouchableOpacity>
          <Text style={s.timeVal}>{String(hour).padStart(2, '0')}</Text>
          <TouchableOpacity style={s.timeBtn} onPress={() => changeH(-1)}><Text style={s.timeBtnTxt}>▼</Text></TouchableOpacity>
        </View>
        <Text style={s.timeSep}>:</Text>
        <View style={s.timeBlock}>
          <TouchableOpacity style={s.timeBtn} onPress={() => changeM(1)}><Text style={s.timeBtnTxt}>▲</Text></TouchableOpacity>
          <Text style={s.timeVal}>{String(minute).padStart(2, '0')}</Text>
          <TouchableOpacity style={s.timeBtn} onPress={() => changeM(-1)}><Text style={s.timeBtnTxt}>▼</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── CONSENT ──
  if (q.type === 'consent') {
    const checked: Set<string> = cur ?? new Set<string>();
    const items = [
      { key: 'c1', label: '개인정보 수집·이용 동의 (진료 목적)' },
      { key: 'c2', label: '민감정보(건강정보) 수집·이용 동의' },
      { key: 'c3', label: '국외 이전 동의 (Google 서버)' },
    ];
    const toggle = (key: string) => {
      const next = new Set(checked);
      next.has(key) ? next.delete(key) : next.add(key);
      onAnswer(q.id, next, false);
    };
    return (
      <View>
        {items.map(item => {
          const on = checked.has(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.checkRow, on && s.checkRowOn]}
              onPress={() => toggle(item.key)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, on && s.checkboxOn]}>
                {on && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={[s.checkLabel, on && s.checkLabelOn]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
        {checked.size < 3 && (
          <Text style={s.consentNote}>3가지 항목에 모두 동의해야 다음으로 진행할 수 있습니다</Text>
        )}
      </View>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: C.text, fontSize: 16, fontWeight: '600', lineHeight: 18 },
  headerCenter: { flex: 1 },
  headerTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  stepCounter: { color: C.textMuted, fontSize: 11, marginTop: 1 },

  // Progress
  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill:  { height: 3, backgroundColor: C.olive, borderRadius: 2 },

  // Question card
  qCard: {
    backgroundColor: C.card, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: C.border,
    marginTop: 8,
  },
  qNum:  { color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  qText: { color: C.text, fontSize: 15, fontWeight: '500', lineHeight: 24, marginBottom: 8 },
  qHint: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  controlWrap: { marginTop: 4 },

  // Option buttons
  optList: { gap: 7 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
  },
  optBtnSel: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  optDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optDotSel:   { borderColor: C.olive },
  optDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.olive },
  optLabel:    { flex: 1, color: C.textMuted, fontSize: 13, lineHeight: 18 },
  optLabelSel: { color: C.text, fontWeight: '500' },

  // Text input
  textInput: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: C.text, fontSize: 14, marginTop: 4,
  },

  // Next button
  nextBtn: {
    marginTop: 14, backgroundColor: C.olive, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 4, marginTop: 4 },
  stepBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.oliveFaded, alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: C.olive, fontSize: 20, fontWeight: '700' },
  stepValWrap: { minWidth: 80, alignItems: 'center' },
  stepVal:  { color: C.text, fontSize: 28, fontWeight: '700' },
  stepUnit: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  // Time picker
  timeWrap:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 12, marginTop: 8 },
  timeBlock: { alignItems: 'center', gap: 6 },
  timeBtn:   { padding: 8 },
  timeBtnTxt:{ color: C.olive, fontSize: 16 },
  timeVal:   { color: C.text, fontSize: 36, fontWeight: '700', width: 70, textAlign: 'center' },
  timeSep:   { color: C.textMuted, fontSize: 30, fontWeight: '700', marginTop: -4 },

  // Consent checkboxes
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    marginBottom: 7,
  },
  checkRowOn: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn:   { backgroundColor: C.olive, borderColor: C.olive },
  checkmark:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkLabel:   { flex: 1, color: C.textMuted, fontSize: 12.5, lineHeight: 18 },
  checkLabelOn: { color: C.text },
  consentNote:  { color: C.textMuted, fontSize: 11.5, marginTop: 6, textAlign: 'center' },

  // Done screen
  doneContent: { padding: 24, paddingBottom: 60 },
  doneTitle: { color: C.text, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  doneSub:   { color: C.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24 },
  crisisBox: {
    backgroundColor: '#3E1A1A', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#B86868', marginBottom: 20,
  },
  crisisTitle: { color: '#E88888', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  crisisText:  { color: '#E88888', fontSize: 12.5, lineHeight: 20 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: C.border,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border,
    width: '47%', flexGrow: 1,
  },
  scoreCardWarn: { borderLeftColor: C.gad7 },
  scoreName: { color: C.textMuted, fontSize: 10.5, fontWeight: '700', marginBottom: 6,
               textTransform: 'uppercase', letterSpacing: 0.4 },
  scoreRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  scoreVal:  { color: C.text, fontSize: 26, fontWeight: '700' },
  scoreMax:  { color: C.textMuted, fontSize: 12 },
  scoreBadge:{ borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 },
  badgeOk:   { backgroundColor: C.oliveFaded },
  badgeWarn: { backgroundColor: '#2A1810' },
  scoreBadgeText: { fontSize: 10.5, fontWeight: '600' },
  badgeOkText:    { color: C.olive },
  badgeWarnText:  { color: C.gad7 },
  miniBar:      { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  miniBarFill:  { height: 4, borderRadius: 2 },
  miniBarOk:    { backgroundColor: C.olive },
  miniBarWarn:  { backgroundColor: C.gad7 },
  disclaimer: { color: C.textMuted, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginBottom: 24 },
  doneBtn: {
    backgroundColor: C.oliveFaded, borderRadius: 14, borderWidth: 1,
    borderColor: C.olive, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { color: C.olive, fontSize: 14, fontWeight: '700' },
});
