// src/components/DrugIdentifier.tsx
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Search } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../styles/theme';
import {
  DrugAppearanceRecord,
  DrugMatch,
  IdentificationFilter,
  SearchResult,
  searchDrugs,
} from '../services/drugIdentificationService';

// ── Types ─────────────────────────────────────────────────────────────────────
type FormOption = 'tablet' | 'capsule' | 'unknown';
type LineOption = 'yes' | 'no' | 'unknown';
type Step       = 1 | 2 | 3 | 4 | 5 | 'result' | 'detail';

interface ColorOption { label: string; hex: string; }
interface ShapeOption { value: string; label: string; emoji: string; }

interface DrugIdentifierProps {
  onSelect: (record: DrugAppearanceRecord) => void;
  onClose:  () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FORM_OPTIONS: { key: FormOption; emoji: string; label: string; desc: string }[] = [
  { key: 'tablet',  emoji: '⬜', label: '알약',      desc: '납작하고 단단해요. 둥글거나 타원형이 많아요.' },
  { key: 'capsule', emoji: '💊', label: '캡슐',      desc: '껍데기 두 쪽이 맞물려 있고 길쭉한 모양이에요.' },
  { key: 'unknown', emoji: '❓', label: '모르겠음',  desc: '다음 단계에서 색상과 모양으로 찾아드릴게요.' },
];

const COLOR_OPTIONS: ColorOption[] = [
  { label: '하양', hex: '#F0F0F0' },
  { label: '노랑', hex: '#E8D020' },
  { label: '주황', hex: '#E07828' },
  { label: '분홍', hex: '#E070A0' },
  { label: '빨강', hex: '#C03030' },
  { label: '파랑', hex: '#3070C0' },
  { label: '연두', hex: '#80C040' },
  { label: '초록', hex: '#309050' },
  { label: '갈색', hex: '#8B5A2B' },
  { label: '보라', hex: '#7040A0' },
  { label: '청록', hex: '#30A0A0' },
  { label: '남색', hex: '#203090' },
  { label: '회색', hex: '#909090' },
  { label: '투명', hex: 'transparent' },
];

// COLOR_HEX: 결과 카드에서 색상 도트 표시용
const COLOR_HEX: Record<string, string> = Object.fromEntries(
  COLOR_OPTIONS.map(c => [c.label, c.hex])
);

// 모양 옵션: value는 DB 실제 값, label은 표시용
// DB에서 '장타원형' 아닌 '장방형'을 사용하므로 분리
const SHAPE_OPTIONS: ShapeOption[] = [
  { value: '원형',    label: '원형',     emoji: '⭕' },
  { value: '타원형',  label: '타원형',   emoji: '🥚' },
  { value: '장방형',  label: '장타원형', emoji: '💊' },
  { value: '사각형',  label: '사각형',   emoji: '🟩' },
  { value: '팔각형',  label: '팔각형',   emoji: '🔷' },
  { value: '삼각형',  label: '삼각형',   emoji: '🔺' },
  { value: '마름모형', label: '마름모',   emoji: '🔹' },
  { value: '모르겠음', label: '모르겠음', emoji: '❓' },
];

const LINE_OPTIONS: { key: LineOption; label: string; desc: string }[] = [
  { key: 'yes',     label: '있어요',    desc: '중간에 홈이나 선이 있어요' },
  { key: 'no',      label: '없어요',    desc: '표면이 매끈해요' },
  { key: 'unknown', label: '모르겠음',  desc: '' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DrugIdentifier({ onSelect, onClose }: DrugIdentifierProps) {
  const [step,           setStep]           = useState<Step>(1);
  const [form,           setForm]           = useState<FormOption>('unknown');
  const [isCut,          setIsCut]          = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [shape,          setShape]          = useState('모르겠음');
  const [line,           setLine]           = useState<LineOption>('unknown');
  const [imprint,        setImprint]        = useState('');
  const [results,        setResults]        = useState<SearchResult>({ exact: [], partial: [] });
  const [isSearching,    setIsSearching]    = useState(false);
  const [selectedMatch,  setSelectedMatch]  = useState<DrugMatch | null>(null);
  const [zoomUri,        setZoomUri]        = useState<string | null>(null);

  const goBack = useCallback(() => {
    switch (step) {
      case 1:        onClose();         break;
      case 2:        setStep(1);        break;
      case 3:        setStep(2);        break;
      case 4:        setStep(3);        break;
      case 5:        setStep(4);        break;
      case 'result': setStep(5);        break;
      case 'detail': setStep('result'); break;
    }
  }, [step, onClose]);

  const runSearch = useCallback(() => {
    const filter: IdentificationFilter = {
      form, colors: selectedColors, shape, line, imprint, isCut, score: 1,
    };
    setIsSearching(true);
    setTimeout(() => {
      const r = searchDrugs(filter);
      setResults(r);
      setIsSearching(false);
      setStep('result');
    }, 10);
  }, [form, selectedColors, shape, line, imprint, isCut]);

  const toggleColor = useCallback((label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedColors(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  }, []);

  const openDetail = useCallback((match: DrugMatch) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedMatch(match);
    setStep('detail');
  }, []);

  // ── Header ──────────────────────────────────────────────────────────────────
  const renderHeader = () => {
    const title = step === 'detail' ? '약물 상세 확인' : '약물 찾기';
    const showDots = typeof step === 'number';
    return (
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={22} color={C.muted} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{title}</Text>
          {showDots && (
            <View style={s.stepDots}>
              {([1, 2, 3, 4, 5] as const).map(n => {
                const isDone   = typeof step === 'number' && step > n;
                const isActive = step === n;
                return (
                  <View key={n} style={[s.stepDot, isActive && s.stepDotActive, isDone && s.stepDotDone]} />
                );
              })}
            </View>
          )}
        </View>
        <View style={s.headerBtn} />
      </View>
    );
  };

  // ── Step 1: 형태 ────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={s.stepContainer}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={s.stepQuestion}>약이 어떤 모습인가요?</Text>
        <Text style={s.stepHint}>눈으로 봤을 때 가장 비슷한 것을 골라주세요.</Text>

        <View style={s.formList}>
          {FORM_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.formCard, form === opt.key && s.formCardSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setForm(opt.key);
              }}
              activeOpacity={0.75}
            >
              <Text style={s.formCardEmoji}>{opt.emoji}</Text>
              <View style={s.formCardText}>
                <Text style={[s.formCardLabel, form === opt.key && s.formCardLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={s.formCardDesc}>{opt.desc}</Text>
              </View>
              <View style={[s.formCardCheck, form === opt.key && s.formCardCheckOn]}>
                {form === opt.key && <Text style={s.formCardCheckMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerLabel}>추가 정보</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          style={[s.cutCard, isCut && s.cutCardOn]}
          onPress={() => setIsCut(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={s.cutCardEmoji}>✂️</Text>
          <View style={s.formCardText}>
            <Text style={[s.formCardLabel, isCut && s.formCardLabelSelected]}>
              약이 잘려 있어요
            </Text>
            <Text style={s.formCardDesc}>반 알이라면 체크해주세요. 더 넓게 찾아드려요.</Text>
          </View>
          <View style={[s.formCardCheck, isCut && s.formCardCheckOn]}>
            {isCut && <Text style={s.formCardCheckMark}>✓</Text>}
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, form === 'unknown' && s.nextBtnDisabled]}
          onPress={() => form !== 'unknown' && setStep(2)}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 2: 색상 ────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={s.stepContainer}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={s.stepQuestion}>색상을 모두 선택해주세요</Text>
        <Text style={s.stepHint}>두 가지 색이 있으면 두 개 모두 선택하세요.</Text>
        <View style={s.colorGrid}>
          {COLOR_OPTIONS.map(opt => {
            const on = selectedColors.includes(opt.label);
            return (
              <TouchableOpacity key={opt.label} style={s.colorItem} onPress={() => toggleColor(opt.label)} activeOpacity={0.7}>
                <View style={[
                  s.colorCircle,
                  opt.hex === 'transparent' ? s.colorCircleTransparent : { backgroundColor: opt.hex },
                  on && s.colorCircleOn,
                ]}>
                  {on && <Text style={s.colorCheck}>✓</Text>}
                </View>
                <Text style={[s.colorLabel, on && s.colorLabelOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.skipLink} onPress={() => setStep(3)} activeOpacity={0.7}>
          <Text style={s.skipLinkText}>모르겠어요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={() => setStep(3)} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 3: 모양 ────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <View style={s.stepContainer}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={s.stepQuestion}>모양이 어떤가요?</Text>
        <Text style={s.stepHint}>위에서 내려다봤을 때 가장 비슷한 모양을 골라주세요.</Text>
        <View style={s.shapeGrid}>
          {SHAPE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.shapeChip, shape === opt.value && s.shapeChipSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShape(opt.value);
              }}
              activeOpacity={0.75}
            >
              <Text style={s.shapeChipEmoji}>{opt.emoji}</Text>
              <Text style={[s.shapeChipText, shape === opt.value && s.shapeChipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.skipLink} onPress={() => setStep(4)} activeOpacity={0.7}>
          <Text style={s.skipLinkText}>모르겠어요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={() => setStep(4)} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 4: 분할선 ──────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <View style={s.stepContainer}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={s.stepQuestion}>약 중간에 선이 있나요?</Text>
        <Text style={s.stepHint}>알약을 반으로 나눌 수 있는 홈이나 선이에요.</Text>
        <View style={s.lineCards}>
          {LINE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.lineCard, line === opt.key && s.lineCardSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setLine(opt.key);
              }}
              activeOpacity={0.75}
            >
              <Text style={s.lineCardEmoji}>
                {opt.key === 'yes' ? '〰️' : opt.key === 'no' ? '⬜' : '❓'}
              </Text>
              <Text style={[s.lineCardText, line === opt.key && s.lineCardTextSelected]}>
                {opt.label}
              </Text>
              {opt.desc ? <Text style={s.lineCardDesc}>{opt.desc}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.skipLink} onPress={() => setStep(5)} activeOpacity={0.7}>
          <Text style={s.skipLinkText}>모르겠어요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={() => setStep(5)} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 5: 각인 ────────────────────────────────────────────────────────────
  const renderStep5 = () => (
    <View style={s.stepContainer}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.stepQuestion}>약에 글자나 숫자가 있나요?</Text>
        <Text style={s.stepHint}>
          약 표면에 새겨진 문자가 있다면 입력해주세요.{'\n'}
          앞뒤 어느 쪽이든 괜찮아요. 예: alza, M, 10, ES5
        </Text>
        <TextInput
          style={s.imprintInput}
          value={imprint}
          onChangeText={setImprint}
          placeholder="예: CKD, 10, alza ..."
          placeholderTextColor={C.dim}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <Text style={s.stepSubHint}>
          "L 120"과 "L120"은 같게 처리돼요. 띄어쓰기·하이픈은 무시해요.{'\n'}
          각인이 없거나 모르면 건너뛰기를 눌러주세요.
        </Text>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.skipLink} onPress={runSearch} activeOpacity={0.7}>
          <Text style={s.skipLinkText}>각인 없음 / 건너뛰기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={runSearch} activeOpacity={0.85}>
          <View style={s.searchBtnInner}>
            <Search size={15} color={C.bg} />
            <Text style={s.nextBtnText}>검색하기</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Drug card (매칭 배지 + 컬러 도트 포함) ──────────────────────────────────
  const renderDrugCard = (match: DrugMatch, isTop: boolean) => {
    const drug     = match.record;
    const isExact  = match.score >= match.maxScore;
    const badgeLabel = isExact
      ? '✓ 완전 일치'
      : `${match.matched.join('·')} 일치`;

    const imprintStr = [drug.printFront, drug.printBack]
      .map(s => s.replace(/분할선|마크/g, '').trim())
      .filter(Boolean)
      .join(' / ');

    const colorDotData = [drug.color1, drug.color2].filter(Boolean);

    return (
      <View key={drug.itemSeq} style={[s.drugCard, isTop && s.drugCardTop]}>
        <TouchableOpacity
          style={s.drugImgWrap}
          onPress={() => drug.imageUrl ? setZoomUri(drug.imageUrl) : undefined}
          activeOpacity={drug.imageUrl ? 0.8 : 1}
        >
          {drug.imageUrl ? (
            <Image source={{ uri: drug.imageUrl }} style={s.drugImg} resizeMode="contain" />
          ) : (
            <View style={[s.drugImg, s.drugImgPlaceholder]}>
              <Text style={s.drugImgPlaceholderText}>💊</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={s.drugInfo}>
          <Text style={s.drugName} numberOfLines={2}>{drug.itemName}</Text>
          <Text style={s.drugManuf} numberOfLines={1}>{drug.entpName}</Text>

          {/* 매칭 배지 */}
          <View style={[s.matchBadge, isExact && s.matchBadgeExact]}>
            <Text style={[s.matchBadgeText, isExact && s.matchBadgeTextExact]}>
              {badgeLabel}
            </Text>
          </View>

          {/* 컬러 도트 + 태그 */}
          <View style={s.drugTagRow}>
            {colorDotData.length > 0 && (
              <View style={s.colorDotRow}>
                {colorDotData.map((c, i) => {
                  const hex = COLOR_HEX[c];
                  return (
                    <View
                      key={i}
                      style={[
                        s.colorDot,
                        hex && hex !== 'transparent'
                          ? { backgroundColor: hex }
                          : s.colorDotTransparent,
                      ]}
                    />
                  );
                })}
              </View>
            )}
            {drug.shape    ? <Text style={s.drugTag}>{drug.shape}</Text>   : null}
            {drug.lineFont || drug.lineBack ? <Text style={s.drugTagGreen}>분할선 ✓</Text> : null}
            {imprintStr    ? <Text style={s.drugTagGreen}>각인: {imprintStr}</Text> : null}
          </View>

          <Text style={s.drugClass}>{drug.className}</Text>
        </View>

        <TouchableOpacity style={s.selectBtn} onPress={() => openDetail(match)} activeOpacity={0.85}>
          <Text style={s.selectBtnText}>상세</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Result ──────────────────────────────────────────────────────────────────
  const renderResults = () => {
    const total = results.exact.length + results.partial.length;
    return (
      <View style={s.stepContainer}>
        {isSearching ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={C.olive} />
            <Text style={s.loadingText}>검색 중...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
            {/* 요약 헤더 */}
            <View style={s.resultHeader}>
              <Text style={s.resultCount}>
                완전 일치 <Text style={s.resultCountAccent}>{results.exact.length}</Text>개
                {'  ·  '}
                부분 일치 <Text style={s.resultCountAccent}>{results.partial.length}</Text>개
              </Text>
              <TouchableOpacity onPress={() => setStep(5)} activeOpacity={0.7}>
                <Text style={s.reSearchText}>조건 변경</Text>
              </TouchableOpacity>
            </View>

            {/* 의료 면책 경고 */}
            {total > 0 && (
              <View style={s.disclaimer}>
                <Text style={s.disclaimerText}>
                  ⚠️ 참고용 정보예요. 정확한 확인은 처방전 또는 약사·의사에게 해주세요.
                </Text>
              </View>
            )}

            {results.exact.length > 0 && (
              <>
                <Text style={s.sectionLabel}>완전 일치 — {results.exact.length}개</Text>
                {results.exact.map((m, i) => renderDrugCard(m, i < 3))}
                {results.exact.length >= 50 && (
                  <Text style={s.moreNote}>각인을 입력하면 더 좁혀져요.</Text>
                )}
              </>
            )}

            {results.partial.length > 0 && (
              <>
                <Text style={[s.sectionLabel, results.exact.length > 0 && s.sectionLabelMargin]}>
                  부분 일치 — {results.partial.length}개
                </Text>
                {results.partial.map((m) => renderDrugCard(m, false))}
              </>
            )}

            {total === 0 && (
              <View style={s.noResults}>
                <Text style={s.noResultsIcon}>🔍</Text>
                <Text style={s.noResultsTitle}>조건에 맞는 약물이 없어요</Text>
                <Text style={s.noResultsText}>
                  조건을 줄이거나 약사·의료진에게 문의해보세요.
                </Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                  <Text style={s.retryBtnText}>처음부터 다시</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
    );
  };

  // ── Detail (약물 상세 확인 화면) ────────────────────────────────────────────
  const renderDetail = () => {
    if (!selectedMatch) return null;
    const drug       = selectedMatch.record;
    const isExact    = selectedMatch.score >= selectedMatch.maxScore;
    const imprintStr = [drug.printFront, drug.printBack]
      .map(s => s.replace(/분할선|마크/g, '').trim())
      .filter(Boolean)
      .join(' / ') || '없음';
    const colorStr = [drug.color1, drug.color2].filter(Boolean).join(', ') || '정보 없음';
    const sizeStr  = drug.lengLong
      ? `${drug.lengLong} × ${drug.lengShort} mm (두께 ${drug.thick || '?'} mm)`
      : '정보 없음';
    const lineStr  = drug.lineFont || drug.lineBack ? '있음' : '없음';

    const rows: [string, string][] = [
      ['제조사', drug.entpName   || '정보 없음'],
      ['분류',   drug.className  || '정보 없음'],
      ['제형',   drug.formulation || '정보 없음'],
      ['모양',   drug.shape      || '정보 없음'],
      ['색상',   colorStr],
      ['크기',   sizeStr],
      ['각인',   imprintStr],
      ['분할선', lineStr],
      ['구분',   drug.etcOtc    || '정보 없음'],
    ];

    return (
      <View style={s.stepContainer}>
        <ScrollView contentContainerStyle={s.detailContent} showsVerticalScrollIndicator={false}>
          {/* 약물 이미지 */}
          {drug.imageUrl ? (
            <TouchableOpacity
              style={s.detailImgWrap}
              onPress={() => setZoomUri(drug.imageUrl)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: drug.imageUrl }} style={s.detailImg} resizeMode="contain" />
              <Text style={s.detailImgHint}>탭하여 확대</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.detailImgWrap, s.detailImgPlaceholder]}>
              <Text style={s.detailImgPlaceholderIcon}>💊</Text>
            </View>
          )}

          {/* 약물명 + 배지 */}
          <Text style={s.detailName}>{drug.itemName}</Text>
          <Text style={s.detailManuf}>{drug.entpName}</Text>
          <View style={[s.matchBadge, isExact && s.matchBadgeExact, s.detailBadge]}>
            <Text style={[s.matchBadgeText, isExact && s.matchBadgeTextExact]}>
              {isExact ? '✓ 모든 조건 일치' : `${selectedMatch.matched.join(' · ')} 일치`}
            </Text>
          </View>

          {/* 상세 정보 테이블 */}
          <View style={s.detailTable}>
            {rows.map(([key, val]) => (
              <View key={key} style={s.detailRow}>
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailVal}>{val}</Text>
              </View>
            ))}
          </View>

          {/* 면책 경고 */}
          <View style={s.disclaimer}>
            <Text style={s.disclaimerText}>
              ⚠️ 참고용 정보예요. 실제 복용 전 처방전 또는 약사·의사에게 반드시 확인해주세요.
            </Text>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* 하단 액션 */}
        <View style={s.detailFooter}>
          <TouchableOpacity style={s.detailBackBtn} onPress={() => setStep('result')} activeOpacity={0.7}>
            <Text style={s.detailBackBtnText}>← 결과로</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.detailSelectBtn} onPress={() => onSelect(drug)} activeOpacity={0.85}>
            <Text style={s.detailSelectBtnText}>이 약으로 처방 추가</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      {renderHeader()}

      {step === 1        && renderStep1()}
      {step === 2        && renderStep2()}
      {step === 3        && renderStep3()}
      {step === 4        && renderStep4()}
      {step === 5        && renderStep5()}
      {step === 'result' && renderResults()}
      {step === 'detail' && renderDetail()}

      {/* 이미지 확대 모달 */}
      <Modal visible={!!zoomUri} transparent animationType="fade" onRequestClose={() => setZoomUri(null)}>
        <TouchableOpacity style={s.zoomOverlay} onPress={() => setZoomUri(null)} activeOpacity={1}>
          <Image source={{ uri: zoomUri ?? '' }} style={s.zoomImg} resizeMode="contain" />
          <Text style={s.zoomHint}>탭하여 닫기</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: C.card, borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  headerBtn:    { width: 36, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '500', color: C.text, letterSpacing: -0.1 },
  stepDots:     { flexDirection: 'row', gap: 6, marginTop: 6 },
  stepDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  stepDotActive:{ backgroundColor: C.olive, width: 16 },
  stepDotDone:  { backgroundColor: C.oliveDark },

  // Step layout
  stepContainer: { flex: 1 },
  stepContent:   { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 16 },
  stepQuestion:  { fontSize: 20, fontWeight: '500', color: C.text, marginBottom: 8, letterSpacing: -0.2 },
  stepHint:      { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 28 },
  stepSubHint:   { fontSize: 12, color: C.dim, lineHeight: 18, marginTop: 10 },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 18, gap: 12,
    backgroundColor: C.bg, borderTopWidth: 0.5, borderTopColor: C.border,
  },
  nextBtn:        { flex: 1, backgroundColor: C.olive, borderRadius: 100, paddingVertical: 15, alignItems: 'center' },
  nextBtnDisabled:{ opacity: 0.4 },
  nextBtnText:    { fontSize: 15, fontWeight: '500', color: C.bg },
  searchBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skipLink:       { paddingVertical: 8 },
  skipLinkText:   { fontSize: 14, color: C.muted },

  // Step 1: Form
  formList:    { gap: 10, marginBottom: 8 },
  formCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
  },
  formCardSelected:  { borderColor: C.olive, backgroundColor: C.oliveFaded },
  formCardEmoji:     { fontSize: 26, width: 38, textAlign: 'center' },
  formCardText:      { flex: 1 },
  formCardLabel:     { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  formCardLabelSelected: { color: C.olive },
  formCardDesc:      { fontSize: 12, color: C.muted, lineHeight: 18 },
  formCardCheck: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  formCardCheckOn:   { backgroundColor: C.olive, borderColor: C.olive },
  formCardCheckMark: { fontSize: 11, color: C.bg, fontWeight: '700' },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: C.border },
  dividerLabel:{ fontSize: 12, color: C.dim },
  cutCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
  },
  cutCardOn:   { borderColor: C.olive, backgroundColor: C.oliveFaded },
  cutCardEmoji:{ fontSize: 22, width: 38, textAlign: 'center' },

  // Step 2: Colors
  colorGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  colorItem:    { alignItems: 'center', width: 52 },
  colorCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  colorCircleTransparent: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: C.textMuted },
  colorCircleOn:  { borderWidth: 2.5, borderColor: C.olive },
  colorCheck:     { fontSize: 16, color: C.olive, fontWeight: '700' },
  colorLabel:     { fontSize: 11, color: C.muted, textAlign: 'center' },
  colorLabelOn:   { color: C.olive, fontWeight: '500' },

  // Step 3: Shapes
  shapeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shapeChip: {
    width: '22%', alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  shapeChipSelected: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  shapeChipEmoji:    { fontSize: 22, marginBottom: 6 },
  shapeChipText:     { fontSize: 12, color: C.muted, textAlign: 'center' },
  shapeChipTextSelected: { color: C.olive, fontWeight: '500' },

  // Step 4: Line
  lineCards: { flexDirection: 'row', gap: 10 },
  lineCard: {
    flex: 1, alignItems: 'center', paddingVertical: 20, gap: 8,
    borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  lineCardSelected: { borderColor: C.olive, backgroundColor: C.oliveFaded },
  lineCardEmoji:    { fontSize: 28 },
  lineCardText:     { fontSize: 15, fontWeight: '700', color: C.muted },
  lineCardTextSelected: { color: C.olive },
  lineCardDesc:     { fontSize: 11, color: C.dim, textAlign: 'center', lineHeight: 16 },

  // Step 5: Imprint
  imprintInput: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 20, fontWeight: '600', color: C.text, letterSpacing: 3, textAlign: 'center',
  },

  // Results
  resultContent:       { paddingHorizontal: 18, paddingTop: 18 },
  resultHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultCount:         { fontSize: 14, color: C.text },
  resultCountAccent:   { color: C.olive, fontWeight: '600' },
  reSearchText:        { fontSize: 13, color: C.accent },
  sectionLabel:        { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  sectionLabelMargin:  { marginTop: 22 },
  moreNote:            { textAlign: 'center', fontSize: 12, color: C.dim, paddingVertical: 12 },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#272115', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(210,153,34,0.25)', padding: 12, marginBottom: 14,
  },
  disclaimerText: { fontSize: 12, color: '#d29922', lineHeight: 18, flex: 1 },

  // Drug card
  drugCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 0.5, borderColor: C.border,
    padding: 14, marginBottom: 8, gap: 12,
  },
  drugCardTop:     { borderColor: 'rgba(155,173,128,0.4)' },
  drugImgWrap:     { flexShrink: 0 },
  drugImg:         { width: 72, height: 72, borderRadius: 9, backgroundColor: C.bg },
  drugImgPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border },
  drugImgPlaceholderText: { fontSize: 22 },
  drugInfo:        { flex: 1 },
  drugName:        { fontSize: 13, fontWeight: '500', color: C.text, lineHeight: 20, marginBottom: 2 },
  drugManuf:       { fontSize: 11, color: C.muted, marginBottom: 5 },
  drugClass:       { fontSize: 10, color: C.dim, marginTop: 4 },

  // Match badge
  matchBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, backgroundColor: C.cardRaised, borderWidth: 1, borderColor: C.border,
    marginBottom: 6,
  },
  matchBadgeExact: { backgroundColor: C.oliveFaded, borderColor: 'rgba(155,173,128,0.4)' },
  matchBadgeText:  { fontSize: 11, fontWeight: '600', color: C.muted },
  matchBadgeTextExact: { color: C.olive },

  // Color dots + tags in card
  drugTagRow:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  colorDotRow:     { flexDirection: 'row', gap: 3, alignItems: 'center' },
  colorDot:        { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  colorDotTransparent: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: C.border },
  drugTag: {
    fontSize: 10, color: C.muted, backgroundColor: C.bg,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border, overflow: 'hidden',
  },
  drugTagGreen: {
    fontSize: 10, color: C.olive, backgroundColor: C.oliveFaded,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(155,173,128,0.35)', overflow: 'hidden',
  },

  // Select button
  selectBtn:     { backgroundColor: C.oliveDark, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-end' },
  selectBtnText: { fontSize: 12, fontWeight: '600', color: C.white },

  // No results
  noResults:       { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  noResultsIcon:   { fontSize: 48, marginBottom: 12 },
  noResultsTitle:  { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 8 },
  noResultsText:   { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn:        { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  retryBtnText:    { fontSize: 14, color: C.muted },

  // Loading
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { fontSize: 14, color: C.muted },

  // Detail view
  detailContent:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  detailImgWrap: {
    alignItems: 'center', justifyContent: 'center',
    height: 180, backgroundColor: C.card,
    borderRadius: 18, borderWidth: 0.5, borderColor: C.border,
    marginBottom: 18,
  },
  detailImg:          { width: '90%', height: 160 },
  detailImgHint:      { position: 'absolute', bottom: 8, fontSize: 11, color: C.dim },
  detailImgPlaceholder:{ },
  detailImgPlaceholderIcon: { fontSize: 52 },
  detailName:         { fontSize: 17, fontWeight: '600', color: C.text, lineHeight: 24, marginBottom: 4 },
  detailManuf:        { fontSize: 13, color: C.muted, marginBottom: 10 },
  detailBadge:        { marginBottom: 16 },
  detailTable: {
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 0.5, borderColor: C.border,
    overflow: 'hidden', marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  detailKey:  { fontSize: 13, color: C.muted, minWidth: 56 },
  detailVal:  { fontSize: 13, color: C.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  detailFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, gap: 10,
    backgroundColor: C.bg, borderTopWidth: 0.5, borderTopColor: C.border,
  },
  detailBackBtn:     { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  detailBackBtnText: { fontSize: 14, color: C.muted },
  detailSelectBtn:   { flex: 1, backgroundColor: C.olive, borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  detailSelectBtnText: { fontSize: 15, fontWeight: '600', color: C.bg },

  // Zoom modal
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  zoomImg:     { width: '92%', height: '72%' },
  zoomHint:    { marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
});
