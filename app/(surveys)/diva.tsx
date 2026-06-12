/**
 * diva.tsx — 성인 ADHD 사전 평가 (DIVA)
 * ASRS Part A (6문항) · 성인 주의집중/과잉행동 (9+9) · 아동기 주의집중/과잉행동 (9+9) · 발달력 (3문항)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { C } from '../../src/styles/theme';
import { saveTestResult } from '../../src/lib/supabase';


type QType = 'radio';
interface Option { value: number | string; label: string }
interface Question {
  id: string; section: string; num: number | string; text: string; hint?: string;
  type: QType; options: Option[]; autoAdv?: boolean;
}
type Answers = Record<string, any>;

// ── ASRS options (0-4) ────────────────────────────────────────────────────────
const ASRS_OPTS: Option[] = [
  { value: 0, label: '0 — 전혀 없음' },
  { value: 1, label: '1 — 거의 없음' },
  { value: 2, label: '2 — 가끔 있음' },
  { value: 3, label: '3 — 자주 있음' },
  { value: 4, label: '4 — 매우 자주' },
];

// ── DIVA 0-3 symptom scale ────────────────────────────────────────────────────
const SYM_OPTS: Option[] = [
  { value: 0, label: '0 — 거의 없음' },
  { value: 1, label: '1 — 가끔 (또래와 비슷한 수준)' },
  { value: 2, label: '2 — 자주 (또래보다 더 자주)' },
  { value: 3, label: '3 — 매우 자주 (거의 매일, 뚜렷한 지장)' },
];

// ── Onset options ─────────────────────────────────────────────────────────────
const ONSET1_OPTS: Option[] = [
  { value: '초등학교 입학 전부터', label: '초등학교 입학 전부터' },
  { value: '초등학교 시기부터',    label: '초등학교 시기부터' },
  { value: '중학교 이후부터',      label: '중학교 이후부터' },
  { value: '성인 이후부터',        label: '성인 이후부터' },
  { value: '잘 모르겠음',          label: '잘 모르겠음' },
];
const ONSET2_OPTS: Option[] = [
  { value: '예',       label: '예' },
  { value: '아니오',   label: '아니오' },
  { value: '잘 모르겠음', label: '잘 모르겠음' },
];
const ONSET3_OPTS: Option[] = [
  { value: '예 (어린 시절부터 지금까지 지속됨)', label: '예 (어린 시절부터 지금까지 지속됨)' },
  { value: '아니오',        label: '아니오' },
  { value: '시기별로 다름', label: '시기별로 다름' },
  { value: '잘 모르겠음',   label: '잘 모르겠음' },
];

// ── Question definitions ──────────────────────────────────────────────────────
const ASRS_QS: Question[] = [
  {
    id: 'as1', section: 'ASRS 선별', num: 'A1',
    text: '어떤 일의 어려운 부분은 끝내 놓고, 그 일을 마무리를 짓지 못해 곤란을 겪은 적이 있습니까?',
    hint: '지난 6개월 기준 · 2 이상이면 양성 항목',
    type: 'radio', options: ASRS_OPTS,
  },
  {
    id: 'as2', section: 'ASRS 선별', num: 'A2',
    text: '체계가 필요한 일을 해야 할 때 순서대로 진행하기 어려운 경우가 있습니까?',
    hint: '지난 6개월 기준 · 2 이상이면 양성 항목',
    type: 'radio', options: ASRS_OPTS,
  },
  {
    id: 'as3', section: 'ASRS 선별', num: 'A3',
    text: '약속이나 해야 할 일을 잊어버려 곤란을 겪은 적이 있습니까?',
    hint: '지난 6개월 기준 · 2 이상이면 양성 항목',
    type: 'radio', options: ASRS_OPTS,
  },
  {
    id: 'as4', section: 'ASRS 선별', num: 'A4',
    text: '골치 아픈 일은 피하거나 미루는 경우가 있습니까?',
    hint: '지난 6개월 기준 · 2 이상이면 양성 항목',
    type: 'radio', options: ASRS_OPTS,
  },
  {
    id: 'as5', section: 'ASRS 선별', num: 'A5',
    text: '오래 앉아 있을 때, 손을 만지작거리거나 발을 꼼지락거리는 경우가 있습니까?',
    hint: '지난 6개월 기준 · 3 이상이면 양성 항목',
    type: 'radio', options: ASRS_OPTS,
  },
  {
    id: 'as6', section: 'ASRS 선별', num: 'A6',
    text: '마치 모터가 달린 것처럼, 과도하게 혹은 멈출 수 없이 활동을 하는 경우가 있습니까?',
    hint: '지난 6개월 기준 · 3 이상이면 양성 항목',
    type: 'radio', options: ASRS_OPTS,
  },
];

const DA_QS: Question[] = [
  {
    id: 'A1', section: '성인 주의력결핍', num: 1,
    text: '세부적인 부분에 부주의한 실수를 자주 하나요?',
    hint: '예: 업무·공부에서 숫자·세부 조건을 잘못 봄 / 검토 없이 제출해 오류 발견',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A2', section: '성인 주의력결핍', num: 2,
    text: '과제나 활동에 집중을 오래 유지하기 어렵나요?',
    hint: '예: 업무·강의에 오래 집중하기 어려움 / 대화 중 다른 생각으로 쉽게 빠짐',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A3', section: '성인 주의력결핍', num: 3,
    text: '다른 사람이 말했는데도 못 들은 것처럼 반응하거나 나중에 기억하지 못하는 일이 있나요?',
    hint: '예: 대화 중 멍해 보인다는 말을 들음 / 가족이 여러 번 다시 말해줘야 함',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A4', section: '성인 주의력결핍', num: 4,
    text: '지시를 따르거나 일을 끝까지 마치기 어렵나요?',
    hint: '예: 일을 시작하지만 마무리하지 못함 / 마감이 있어야 겨우 끝냄',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A5', section: '성인 주의력결핍', num: 5,
    text: '일의 순서, 시간, 준비물을 정리하고 계획하기 어렵나요?',
    hint: '예: 시간 관리를 잘 못함 / 집·책상·파일이 지저분함',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A6', section: '성인 주의력결핍', num: 6,
    text: '오래 집중해야 하는 일을 피하거나 미루나요?',
    hint: '예: 보고서·서류·행정업무를 자주 미룸 / 마감 직전까지 미루다 급하게 처리함',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A7', section: '성인 주의력결핍', num: 7,
    text: '필요한 물건을 자주 잃어버리거나 어디 두었는지 몰라 찾나요?',
    hint: '예: 휴대폰·지갑·카드·열쇠를 자주 찾음 / 중요한 물건을 엉뚱한 장소에 둠',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A8', section: '성인 주의력결핍', num: 8,
    text: '주변 소리, 알림, 움직임 같은 자극 때문에 쉽게 산만해지나요?',
    hint: '예: 주변 자극에 쉽게 주의가 뺏김 / 한 번 산만해지면 다시 시작하기 어려움',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'A9', section: '성인 주의력결핍', num: 9,
    text: '약속, 연락, 결제, 준비물처럼 해야 할 일을 자주 잊어버리나요?',
    hint: '예: 약속이나 일정을 잊음 / 가족·동료가 자주 상기시켜줘야 함',
    type: 'radio', options: SYM_OPTS,
  },
];

const DH_QS: Question[] = [
  {
    id: 'HI1', section: '성인 과잉행동·충동성', num: 1,
    text: '손이나 발을 자꾸 움직이거나 몸을 가만히 두기 어렵나요?',
    hint: '예: 앉아 있을 때 다리를 떨거나 몸을 움직임 / 펜·물건을 계속 만지작거림',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI2', section: '성인 과잉행동·충동성', num: 2,
    text: '앉아 있어야 하는 상황에서 자주 자리를 뜨거나 움직이나요?',
    hint: '예: 회의·강의·행사에서 오래 앉아 있기 어려움',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI3', section: '성인 과잉행동·충동성', num: 3,
    text: '마음속으로 초조하거나 계속 움직여야 할 것 같은 느낌이 있나요?',
    hint: '예: 내적으로 불안하고 쫓기는 느낌 / 아무것도 하지 않는 시간이 견디기 어려움',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI4', section: '성인 과잉행동·충동성', num: 4,
    text: '조용히 쉬거나 여유 있게 활동하기 어렵나요?',
    hint: '예: 쉬는 날에도 계속 뭔가를 해야 함 / 차분하게 시간을 보내는 것이 어렵다는 말을 들음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI5', section: '성인 과잉행동·충동성', num: 5,
    text: '"늘 바쁘다" "멈추기 어렵다" "모터가 달린 것 같다"는 느낌이 있나요?',
    hint: '예: 항상 무언가를 하느라 바쁨 / 몰두하면 그만두기 어려움',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI6', section: '성인 과잉행동·충동성', num: 6,
    text: '말을 지나치게 많이 하거나 멈추기 어렵나요?',
    hint: '예: 말을 많이 한다는 이야기를 자주 들음 / 대화에서 상대에게 말할 기회를 덜 줌',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI7', section: '성인 과잉행동·충동성', num: 7,
    text: '질문이 끝나기 전에 대답하거나 상대 말을 끊는 일이 있나요?',
    hint: '예: 상대 말이 끝나기 전에 대답함 / 다른 사람의 말을 가로챔',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI8', section: '성인 과잉행동·충동성', num: 8,
    text: '차례를 기다리기 어렵나요?',
    hint: '예: 줄 서기나 대기 시간이 매우 힘듦 / 답변을 기다리기 어려워 재촉함',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'HI9', section: '성인 과잉행동·충동성', num: 9,
    text: '다른 사람의 활동을 방해하거나 침범하는 일이 있나요?',
    hint: '예: 대화에 자주 끼어듦 / 부탁받지 않았는데 다른 사람 일에 관여함',
    type: 'radio', options: SYM_OPTS,
  },
];

const CA_QS: Question[] = [
  {
    id: 'cA1', section: '아동기 주의력결핍', num: 1,
    text: '숙제·시험·과제에서 부주의한 실수가 많았나요?',
    hint: '어린 시절 기준 (만 5~12세) · 예: 문제를 잘못 읽음 / 답을 검토하지 않음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA2', section: '아동기 주의력결핍', num: 2,
    text: '수업·숙제·놀이에 집중을 오래 유지하기 어려웠나요?',
    hint: '예: 수업 중 딴생각 / 숙제하다 금방 다른 것 함',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA3', section: '아동기 주의력결핍', num: 3,
    text: '부모님·선생님이 말해도 듣지 않는 것처럼 보였나요?',
    hint: '예: 여러 번 불러야 반응함 / 멍해 보임',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA4', section: '아동기 주의력결핍', num: 4,
    text: '지시를 따르거나 숙제·과제를 끝까지 마치기 어려웠나요?',
    hint: '예: 숙제를 끝내지 못함 / 여러 단계 지시를 따라가기 어려움',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA5', section: '아동기 주의력결핍', num: 5,
    text: '정리·계획·시간 관리가 어려웠나요?',
    hint: '예: 방·책상이 지저분함 / 준비물을 못 챙김',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA6', section: '아동기 주의력결핍', num: 6,
    text: '집중이 필요한 일을 싫어하거나 피했나요?',
    hint: '예: 숙제를 미룸 / 독서를 싫어함',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA7', section: '아동기 주의력결핍', num: 7,
    text: '준비물이나 물건을 자주 잃어버렸나요?',
    hint: '예: 연필·책·준비물을 잃어버림 / 학교에 물건을 두고 옴',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA8', section: '아동기 주의력결핍', num: 8,
    text: '외부 자극에 쉽게 산만해졌나요?',
    hint: '예: 수업 중 창밖을 봄 / 주변 소리·친구 행동에 쉽게 주의가 뺏김',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cA9', section: '아동기 주의력결핍', num: 9,
    text: '일상적인 일을 자주 잊어버렸나요?',
    hint: '예: 준비물·심부름·숙제·약속을 잊음 / 자주 상기시켜줘야 했음',
    type: 'radio', options: SYM_OPTS,
  },
];

const CH_QS: Question[] = [
  {
    id: 'cHI1', section: '아동기 과잉행동·충동성', num: 1,
    text: '가만히 앉아 있지 못하고 손발·몸을 자주 움직였나요?',
    hint: '예: 다리를 떨거나 손을 계속 움직임 / 손톱을 물어뜯음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI2', section: '아동기 과잉행동·충동성', num: 2,
    text: '앉아 있어야 하는 상황에서 자주 일어났나요?',
    hint: '예: 수업 중 자리 이탈 / 식사 중 자주 일어남',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI3', section: '아동기 과잉행동·충동성', num: 3,
    text: '뛰어다니거나 높은 곳에 올라가는 등 몸을 많이 움직였나요?',
    hint: '예: 부적절한 장소에서 뛰어다님 / 가구 위로 올라감',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI4', section: '아동기 과잉행동·충동성', num: 4,
    text: '조용히 놀거나 차분하게 활동하기 어려웠나요?',
    hint: '예: 놀 때도 시끄러움 / 조용히 하라는 말을 자주 들음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI5', section: '아동기 과잉행동·충동성', num: 5,
    text: '늘 바쁘게 움직이거나 에너지가 많다는 말을 들었나요?',
    hint: '예: 계속 무엇인가를 함 / "모터가 달린 것 같다"는 말을 들음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI6', section: '아동기 과잉행동·충동성', num: 6,
    text: '말을 너무 많이 한다는 지적을 받았나요?',
    hint: '예: 수다쟁이로 알려짐 / 수업 중 떠들어서 지적받음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI7', section: '아동기 과잉행동·충동성', num: 7,
    text: '질문이 끝나기 전에 대답하거나 말을 끊었나요?',
    hint: '예: 먼저 대답하려 함 / 친구·어른의 말을 끊음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI8', section: '아동기 과잉행동·충동성', num: 8,
    text: '차례를 기다리기 어려웠나요?',
    hint: '예: 놀이·운동에서 순서를 기다리기 힘들어함 / 쉽게 인내심을 잃음',
    type: 'radio', options: SYM_OPTS,
  },
  {
    id: 'cHI9', section: '아동기 과잉행동·충동성', num: 9,
    text: '다른 아이의 놀이·대화·물건에 끼어들거나 방해했나요?',
    hint: '예: 다른 아이의 놀이에 끼어듦 / 허락 없이 물건을 사용함',
    type: 'radio', options: SYM_OPTS,
  },
];

const ONSET_QS: Question[] = [
  {
    id: 'on1', section: '발달력', num: '1',
    text: '위와 같은 특성이 언제부터 있었다고 생각하나요?',
    type: 'radio', options: ONSET1_OPTS,
  },
  {
    id: 'on2', section: '발달력', num: '2',
    text: '12세 이전에도 비슷한 모습이 있었다고 생각하나요?',
    type: 'radio', options: ONSET2_OPTS,
  },
  {
    id: 'on3', section: '발달력', num: '3',
    text: '성인기까지 비슷한 양상이 이어져 왔다고 생각하나요?',
    type: 'radio', options: ONSET3_OPTS,
  },
];

const ALL_QUESTIONS: Question[] = [
  ...ASRS_QS, ...DA_QS, ...DH_QS, ...CA_QS, ...CH_QS, ...ONSET_QS,
];

// ── Scoring ──────────────────────────────────────────────────────────────────
function scoreASRS(a: Answers) {
  const pos =
    ([2,3,4].includes(a.as1) ? 1 : 0) +
    ([2,3,4].includes(a.as2) ? 1 : 0) +
    ([2,3,4].includes(a.as3) ? 1 : 0) +
    ([2,3,4].includes(a.as4) ? 1 : 0) +
    ([3,4].includes(a.as5)   ? 1 : 0) +
    ([3,4].includes(a.as6)   ? 1 : 0);
  const total = (a.as1??0)+(a.as2??0)+(a.as3??0)+(a.as4??0)+(a.as5??0)+(a.as6??0);
  return { pos, total, posScreen: pos >= 4 };
}

const cntPos = (a: Answers, keys: string[]) =>
  keys.filter(k => (a[k] ?? 0) >= 2).length;

function scoreDIVA(a: Answers) {
  const asrs = scoreASRS(a);
  const adA  = cntPos(a, ['A1','A2','A3','A4','A5','A6','A7','A8','A9']);
  const adH  = cntPos(a, ['HI1','HI2','HI3','HI4','HI5','HI6','HI7','HI8','HI9']);
  const chA  = cntPos(a, ['cA1','cA2','cA3','cA4','cA5','cA6','cA7','cA8','cA9']);
  const chH  = cntPos(a, ['cHI1','cHI2','cHI3','cHI4','cHI5','cHI6','cHI7','cHI8','cHI9']);
  return { asrs, adA, adH, chA, chH };
}

function buildSummary(a: Answers): string {
  const { asrs, adA, adH, chA, chH } = scoreDIVA(a);
  return `ASRS Part A: ${asrs.pos}/6 (${asrs.posScreen?'양성':'음성'}) | 성인IA=${adA}/9 성인HI=${adH}/9 | 아동IA=${chA}/9 아동HI=${chH}/9`;
}

// ── Question control ─────────────────────────────────────────────────────────
function QuestionControl({
  question, answers, selectedVal, onAnswer,
}: {
  question: Question; answers: Answers; selectedVal: any;
  onAnswer: (id: string, val: any, autoAdv?: boolean) => void;
}) {
  const cur = answers[question.id];
  return (
    <View style={s.optList}>
      {(question.options ?? []).map(opt => {
        const sel = cur === opt.value || selectedVal === opt.value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[s.optBtn, sel && s.optBtnSel]}
            onPress={() => onAnswer(question.id, opt.value, true)}
            activeOpacity={0.75}
          >
            <View style={[s.optDot, sel && s.optDotSel]}>
              {sel && <View style={s.optDotInner} />}
            </View>
            <Text style={[s.optLabel, sel && s.optLabelSel]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Diva() {
  const db = useSQLiteContext();
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<Answers>({});
  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [done, setDone]           = useState(false);
  const [result, setResult]       = useState<ReturnType<typeof scoreDIVA> | null>(null);

  const answersRef  = useRef<Answers>({});
  const finishedRef = useRef(false);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(16)).current;

  const visibleQuestions = useMemo(() => ALL_QUESTIONS, []);

  useEffect(() => {
    setSelectedVal(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const finishSurvey = useCallback(async (finalAnswers: Answers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const scores = scoreDIVA(finalAnswers);
    const summary = buildSummary(finalAnswers);
    setResult(scores);

    try {
      await db.runAsync(
        `INSERT INTO AssessmentLogs (date, type, score, answers) VALUES (?, ?, ?, ?)`,
        [
          new Date().toISOString().split('T')[0],
          'diva',
          scores.asrs.pos,
          JSON.stringify({
            asrs: scores.asrs,
            adA: scores.adA, adH: scores.adH,
            chA: scores.chA, chH: scores.chH,
            summary,
          }),
        ],
      );
    } catch { /* ignore */ }

    saveTestResult('성인 ADHD 사전 평가 (DIVA)', scores.asrs.pos, summary).catch(() => {});

    setDone(true);
  }, [db]);

  const handleAnswer = useCallback((qId: string, value: any, autoAdv = true) => {
    answersRef.current = { ...answersRef.current, [qId]: value };
    setAnswers({ ...answersRef.current });
    if (autoAdv) {
      setSelectedVal(value);
      setTimeout(() => {
        setStep(prev => {
          const next = prev + 1;
          if (next >= ALL_QUESTIONS.length) { finishSurvey(answersRef.current); return prev; }
          return next;
        });
      }, 300);
    }
  }, [finishSurvey]);

  const goBack = useCallback(() => {
    if (step === 0) { router.back(); return; }
    setStep(prev => prev - 1);
  }, [step]);

  const currentQ = visibleQuestions[step];
  const total    = visibleQuestions.length;
  const progress = total > 0 ? (step + 1) / total : 0;

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done && result) {
    const { asrs, adA, adH, chA, chH } = result;
    const adMet = adA >= 5 || adH >= 5;
    const chMet = chA >= 6 || chH >= 6;
    const dsm5Met = adMet && chMet;

    const domainItems = [
      { name: 'ASRS Part A 양성', value: `${asrs.pos}/6`, met: asrs.posScreen, threshold: '≥4' },
      { name: '성인기 주의력결핍', value: `${adA}/9`, met: adA >= 5, threshold: '≥5' },
      { name: '성인기 과잉행동·충동', value: `${adH}/9`, met: adH >= 5, threshold: '≥5' },
      { name: '아동기 주의력결핍', value: `${chA}/9`, met: chA >= 6, threshold: '≥6' },
      { name: '아동기 과잉행동·충동', value: `${chH}/9`, met: chH >= 6, threshold: '≥6' },
    ];

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.doneContent}>
          <Text style={s.doneTitle}>평가 완료 ✓</Text>
          <Text style={s.doneSub}>ADHD 사전 평가 결과가 저장되었습니다</Text>

          {dsm5Met && (
            <View style={s.alertBox}>
              <Text style={s.alertTitle}>DSM-5 증상 기준 충족 가능성</Text>
              <Text style={s.alertText}>
                성인기 및 아동기 증상 기준이 모두 충족되었습니다.
                진료실에서 전문의와 함께 종합적인 평가가 필요합니다.
              </Text>
            </View>
          )}

          <View style={s.scoreGrid}>
            {domainItems.map(item => (
              <View key={item.name} style={[s.scoreCard, item.met && s.scoreCardMet]}>
                <View style={s.scoreRowSplit}>
                  <Text style={s.scoreName}>{item.name}</Text>
                  <View style={[s.sevBadge, item.met ? s.sevMet : s.sevOk]}>
                    <Text style={[s.sevText, item.met ? s.sevMetTxt : s.sevOkTxt]}>
                      {item.met ? '충족' : '미충족'} ({item.threshold})
                    </Text>
                  </View>
                </View>
                <Text style={s.scoreVal}>{item.value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.disclaimer}>
            본 결과는 선별 목적의 참고 자료이며, 진단을 의미하지 않습니다.
            ADHD 진단은 반드시 전문의의 종합적인 임상 평가를 통해 이루어져야 합니다.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(surveys)/evaluation-hub')}>
            <Text style={s.doneBtnText}>← 평가 허브로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQ) return null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>DIVA · {currentQ.section}</Text>
            <Text style={s.stepCounter}>{step + 1} / {total}</Text>
          </View>
        </View>

        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={s.qCard}>
              <Text style={s.qNum}>{currentQ.num}.</Text>
              <Text style={s.qText}>{currentQ.text}</Text>
              {currentQ.hint && <Text style={s.qHint}>{currentQ.hint}</Text>}
              <View style={s.controlWrap}>
                <QuestionControl
                  question={currentQ} answers={answers}
                  selectedVal={selectedVal} onAnswer={handleAnswer}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

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
  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill: { height: 3, backgroundColor: C.olive, borderRadius: 2 },

  qCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  qNum: { color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  qText: { color: C.text, fontSize: 15, fontWeight: '500', lineHeight: 24, marginBottom: 6 },
  qHint: { color: C.textMuted, fontSize: 11.5, lineHeight: 17, marginBottom: 12 },
  controlWrap: { marginTop: 4 },

  optList: { gap: 7 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
  },
  optBtnSel: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  optDot: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optDotSel: { borderColor: C.olive },
  optDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.olive },
  optLabel: { flex: 1, color: C.textMuted, fontSize: 13, lineHeight: 18 },
  optLabelSel: { color: C.text, fontWeight: '500' },

  // Done screen
  doneContent: { padding: 20, paddingBottom: 48 },
  doneTitle: { color: C.olive, fontSize: 22, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  doneSub: { color: C.textMuted, fontSize: 13, marginBottom: 20 },
  alertBox: {
    backgroundColor: '#1A5FA822', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1A5FA855', marginBottom: 20,
  },
  alertTitle: { color: '#0C3E72', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  alertText: { color: '#0C3E72', fontSize: 12, lineHeight: 18 },
  scoreGrid: { gap: 10, marginBottom: 20 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  scoreCardMet: { borderColor: C.olive + '80' },
  scoreName: { color: C.text, fontSize: 13, fontWeight: '700' },
  scoreRowSplit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  scoreVal: { color: C.olive, fontSize: 22, fontWeight: '800' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sevOk:  { backgroundColor: C.border },
  sevMet: { backgroundColor: C.oliveFaded },
  sevText: { fontSize: 11, fontWeight: '600' },
  sevOkTxt:  { color: C.textMuted },
  sevMetTxt: { color: C.olive },
  disclaimer: { color: C.textMuted, fontSize: 11.5, lineHeight: 18, marginBottom: 24 },
  doneBtn: {
    backgroundColor: C.olive, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
