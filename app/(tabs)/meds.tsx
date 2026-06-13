import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-chart-kit';
import { Pill, Bell, Plus, StopCircle, ChevronDown, ChevronUp, ChevronLeft, Trash2 } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { DB, COLOR_MAP } from '../../src/constants/drugs';
import type { DrugInfo } from '../../src/constants/drugs';
import { useAuthStore } from '../../src/store/useAuthStore';
import {
  pushMedication,
  deleteMedicationFromSupabase,
} from '../../src/lib/syncService';
import { C as _C } from '../../src/styles/theme';
import { FadeInView } from '../../src/components/DS';
import DrugIdentifier from '../../src/components/DrugIdentifier';
import SideEffectInput from '../../src/components/SideEffectInput';
import DrugInfoBrowser from '../../src/components/DrugInfoBrowser';
import type { DrugAppearanceRecord } from '../../src/services/drugIdentificationService';
import { catToDrugClasses } from '../../src/constants/drugInfo';

// ─ Theme ──────────────────────────────────────────────────────────────────────
const C = {
  ..._C,
  overlay: 'rgba(0,0,0,0.55)',
} as const;

// ─ Interfaces ─────────────────────────────────────────────────────────────────
type DrugItem = DrugInfo;

interface MedicationLog {
  id: number;
  drugId: string;
  dose: string;
  doseVal: number | null;
  startDate: string;
  stopped: boolean;
  stopDate?: string;
  stopReason?: string;
}

interface SeNote {
  id: number;
  medId: string;
  se: string;
  date: string;
  memo: string;
}

interface NotifSetting {
  id: number;
  type: string;
  targetId: string;
  time: string;
  isActive: number;
  notifId: string | null;
}

interface MedRow {
  id: number;
  drugId: string;
  dose: string | null;
  doseVal: number | null;
  startDate: string;
  stopped: number;
  stopDate: string | null;
  stopReason: string | null;
}

interface SeNoteRow {
  id: number;
  medId: string;
  se: string | null;
  date: string;
  memo: string | null;
}

// ─ Constants ──────────────────────────────────────────────────────────────────
type TabKey = 'meds' | 'chart' | 'alarm' | 'info';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'meds',  label: '내 약물' },
  { key: 'chart', label: '복용 추이' },
  { key: 'alarm', label: '복용 알림' },
  { key: 'info',  label: '약물 정보' },
];

const MODAL_CATEGORIES = ['전체', '항우울제', '항불안제', '수면제', '기분안정제', '항정신병약'];

// ─ Helpers ────────────────────────────────────────────────────────────────────
const todayLabel = (): string =>
  new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

const shortDate = (dateStr: string): string => {
  const match = dateStr.match(/(\d+)월\s*(\d+)/);
  return match ? `${match[1]}/${match[2]}` : dateStr.slice(0, 4);
};

// ─ Component ──────────────────────────────────────────────────────────────────
export default function MedsScreen() {
  const db  = useSQLiteContext();
  const uid = useAuthStore(s => s.session?.user.id ?? null);

  const [meds, setMeds] = useState<MedicationLog[]>([]);
  const [seNotes, setSeNotes] = useState<SeNote[]>([]);
  const [notifSettings, setNotifSettings] = useState<NotifSetting[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('meds');
  const [stoppedVisible, setStoppedVisible] = useState(false);

  // ── 처방 추가 모달 (단일 모달, modalStep으로 1/2단계 전환) ──────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedDrug, setSelectedDrug] = useState<DrugItem | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [doseValInput, setDoseValInput] = useState('');
  const [pillCountInput, setPillCountInput] = useState('1');
  const [startDateInput, setStartDateInput] = useState('');

  // 알림 모달
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [alarmDrugId, setAlarmDrugId] = useState('');
  const [alarmTimeInput, setAlarmTimeInput] = useState('08:00');
  const [alarmStep, setAlarmStep] = useState<'drug' | 'time'>('time');

  // 중단 모달
  const [stopModalVisible, setStopModalVisible] = useState(false);
  const [stopMedId, setStopMedId] = useState<number | null>(null);
  const [stopDateInput, setStopDateInput] = useState('');
  const [stopReasonInput, setStopReasonInput] = useState('');

  // 삭제 인라인 확인
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // 약물 식별기
  const [showDrugIdentifier, setShowDrugIdentifier] = useState(false);

  // 부작용 기록 모달
  const [sideEffectMed, setSideEffectMed] = useState<MedicationLog | null>(null);

  // 탭4 서브탭
  const [drugInfoSubTab, setDrugInfoSubTab] = useState<'identifier' | 'info'>('identifier');

  // 탭4 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);

  const headerToday = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  // ── 데이터 로드 ────────────────────────────────────────────────────────────
  const loadMyMedications = useCallback(async () => {
    console.log('[loadMyMedications] 데이터 로드 시작');
    const medRows = await db.getAllAsync<MedRow>('SELECT * FROM Medications ORDER BY id ASC');
    setMeds(medRows.map(row => ({
      id: row.id,
      drugId: row.drugId,
      dose: row.dose ?? '',
      doseVal: row.doseVal,
      startDate: row.startDate,
      stopped: row.stopped === 1,
      stopDate: row.stopDate ?? undefined,
      stopReason: row.stopReason ?? undefined,
    })));
    const seRows = await db.getAllAsync<SeNoteRow>('SELECT * FROM SideEffectLogs ORDER BY id DESC');
    setSeNotes(seRows.map(row => ({
      id: row.id,
      medId: row.medId,
      se: row.se ?? '',
      date: row.date,
      memo: row.memo ?? '',
    })));
    const notifRows = await db.getAllAsync<NotifSetting>(
      "SELECT * FROM NotificationSettings WHERE type = 'medication' AND isActive = 1"
    );
    setNotifSettings(notifRows);
    console.log('[loadMyMedications] 완료 — 약물 수:', medRows.length);
  }, [db]);

  useEffect(() => { loadMyMedications(); }, [loadMyMedications]);

  const activeMeds  = meds.filter(m => !m.stopped);
  const stoppedMeds = meds.filter(m =>  m.stopped);

  const prescribedDrugClasses = useMemo(() => {
    const cls: string[] = [];
    for (const med of meds) {
      if (med.stopped) continue;
      const drug = DB.find(x => x.id === med.drugId);
      if (drug) cls.push(...catToDrugClasses(drug.id, drug.cat));
    }
    return [...new Set(cls)];
  }, [meds]);

  // ── 약물 식별기 핸들러 ──────────────────────────────────────────────────────
  const handleDrugIdentifierSelect = useCallback((record: DrugAppearanceRecord) => {
    setShowDrugIdentifier(false);
    const cleanName = record.itemName
      .replace(/\([^)]*\)/g, '')
      .replace(/\d+\.?\d*밀리그램/g, '')
      .replace(/\d+\.?\d*mg/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    setModalSearchQuery(cleanName);
    setActiveCategory('전체');
    setSelectedDrug(null);
    setDoseValInput('');
    setPillCountInput('1');
    setStartDateInput(todayLabel());
    setModalStep(1);
    setAddModalVisible(true);
  }, []);

  // ── 처방 추가 핸들러 ────────────────────────────────────────────────────────
  const openAddModal = () => {
    console.log('[openAddModal] 모달 오픈');
    setModalSearchQuery('');
    setActiveCategory('전체');
    setSelectedDrug(null);
    setDoseValInput('');
    setPillCountInput('1');
    setStartDateInput(todayLabel());
    setModalStep(1);
    setAddModalVisible(true);
  };

  const handleSelectDrug = (drug: DrugItem) => {
    console.log('[handleSelectDrug] 선택:', drug.id, drug.name);
    setSelectedDrug(drug);
    setDoseValInput('');
    setPillCountInput('1');
    setStartDateInput(todayLabel());
    setModalStep(2); // 모달 닫지 않고 내부 UI만 2단계로 전환
  };

  const handleBackToSearch = () => {
    console.log('[handleBackToSearch] 1단계로 복귀');
    setSelectedDrug(null);
    setModalStep(1);
  };

  const handleSavePrescription = async () => {
    if (!selectedDrug) { Alert.alert('알림', '약물이 선택되지 않았어요.'); return; }
    const perPillMg = parseFloat(doseValInput);
    const pills = Math.max(1, parseInt(pillCountInput, 10) || 1);
    const hasDose = doseValInput.trim() !== '' && !isNaN(perPillMg) && perPillMg > 0;
    const doseVal = hasDose ? perPillMg * pills : null;
    const dose    = hasDose
      ? pills > 1 ? `${perPillMg}mg × ${pills}알` : `${perPillMg}mg`
      : null;
    const startDate = startDateInput.trim() || todayLabel();
    console.log('[handleSavePrescription] 저장:', selectedDrug.id, 'doseVal:', doseVal);

    const doSave = async () => {
      await db.runAsync(
        'INSERT INTO Medications (drugId, dose, doseVal, startDate, stopped, item_name) VALUES (?, ?, ?, ?, 0, ?)',
        [selectedDrug.id, dose, doseVal, startDate, selectedDrug.name]
      );
      console.log('[handleSavePrescription] DB 저장 완료');
      setAddModalVisible(false);
      setSelectedDrug(null);
      setModalStep(1);
      await loadMyMedications();
      // 낙관적 업데이트 후 백그라운드 push
      if (uid) {
        pushMedication(uid, {
          drugId:     selectedDrug.id,
          itemName:   selectedDrug.name,
          entpName:   selectedDrug.brand ?? null,
          dose,
          startDate,
          stopped:    false,
          stopDate:   null,
          stopReason: null,
        }).catch(() => {});
      }
    };

    if (doseVal !== null && selectedDrug.maxDose && doseVal > selectedDrug.maxDose * 2) {
      Alert.alert(
        '용량 확인',
        `일일 총 용량(${doseVal}mg)이 최고 권장량(${selectedDrug.maxDose}mg)의 2배를 초과해요.\n이대로 저장할까요?`,
        [
          { text: '다시 확인', style: 'cancel' },
          { text: '네, 저장', onPress: doSave },
        ]
      );
      return;
    }
    await doSave();
  };

  // ── 중단 핸들러 ────────────────────────────────────────────────────────────
  const handleStop = (med: MedicationLog) => {
    setStopMedId(med.id);
    setStopDateInput(todayLabel());
    setStopReasonInput('');
    setStopModalVisible(true);
  };

  const handleSaveStop = async () => {
    if (stopMedId === null) return;
    const med = meds.find(m => m.id === stopMedId);
    if (!med) return;
    try {
      const stopDate   = stopDateInput.trim() || todayLabel();
      const stopReason = stopReasonInput.trim() || null;
      await db.runAsync(
        'UPDATE Medications SET stopped = 1, stopDate = ?, stopReason = ? WHERE id = ?',
        [stopDate, stopReason, med.id]
      );
      const activeNotif = notifSettings.find(n => n.targetId === med.drugId);
      if (activeNotif) {
        if (activeNotif.notifId) await Notifications.cancelScheduledNotificationAsync(activeNotif.notifId);
        await db.runAsync('UPDATE NotificationSettings SET isActive = 0 WHERE id = ?', [activeNotif.id]);
      }
      setStopModalVisible(false);
      await loadMyMedications();
      // 백그라운드 push
      if (uid) {
        const drug = DB.find(x => x.id === med.drugId);
        pushMedication(uid, {
          drugId:     med.drugId,
          itemName:   drug?.name ?? med.drugId,
          entpName:   drug?.brand ?? null,
          dose:       med.dose || null,
          startDate:  med.startDate,
          stopped:    true,
          stopDate,
          stopReason,
        }).catch(() => {});
      }
    } catch (e) {
      console.error('[handleSaveStop] 오류:', e);
      Alert.alert('오류', '중단 처리 중 오류가 발생했어요. 다시 시도해주세요.');
    }
  };

  // ── 삭제 핸들러 ────────────────────────────────────────────────────────────
  const handleDelete = (med: MedicationLog) => {
    setDeleteConfirmId(med.id);
  };

  const handleConfirmDelete = async (medId: number) => {
    setDeleteConfirmId(null);
    try {
      const target = meds.find(m => m.id === medId);
      await db.runAsync('DELETE FROM Medications WHERE id = ?', [medId]);
      await loadMyMedications();
      // 백그라운드 삭제 push
      if (uid && target) {
        deleteMedicationFromSupabase(uid, target.drugId).catch(() => {});
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      Alert.alert('오류', `삭제 중 문제가 발생했어요.\n${errorMsg}`);
    }
  };

  // ── 알림 핸들러 ────────────────────────────────────────────────────────────
  const handleAlarm = (drugId: string) => {
    const existing = notifSettings.find(n => n.targetId === drugId);
    setAlarmDrugId(drugId);
    setAlarmTimeInput(existing?.time ?? '08:00');
    setAlarmStep('time');
    setAlarmModalVisible(true);
  };

  const openAlarmFromTab3 = () => {
    setAlarmDrugId('');
    setAlarmTimeInput('08:00');
    setAlarmStep('drug');
    setAlarmModalVisible(true);
  };

  const handleSaveAlarm = async () => {
    const trimmed = alarmTimeInput.trim();
    if (!/^\d{2}:\d{2}$/.test(trimmed)) { Alert.alert('오류', '시간 형식이 올바르지 않아요. (예: 08:30)'); return; }
    const [h, m] = trimmed.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) { Alert.alert('오류', '올바른 시간을 입력해주세요.'); return; }
    const drug     = DB.find(x => x.id === alarmDrugId);
    const existing = notifSettings.find(n => n.targetId === alarmDrugId);
    if (existing) {
      if (existing.notifId) await Notifications.cancelScheduledNotificationAsync(existing.notifId);
      await db.runAsync('UPDATE NotificationSettings SET isActive = 0 WHERE id = ?', [existing.id]);
    }
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '복약 알림',
        body: `${drug?.name ?? alarmDrugId}을(를) 복용할 시간이에요.`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m },
    });
    await db.runAsync(
      'INSERT INTO NotificationSettings (type, targetId, time, isActive, notifId) VALUES (?, ?, ?, 1, ?)',
      ['medication', alarmDrugId, trimmed, notifId]
    );
    setAlarmModalVisible(false);
    await loadMyMedications();
  };

  const handleCancelAlarm = async () => {
    const existing = notifSettings.find(n => n.targetId === alarmDrugId);
    if (existing) {
      if (existing.notifId) await Notifications.cancelScheduledNotificationAsync(existing.notifId);
      await db.runAsync('UPDATE NotificationSettings SET isActive = 0 WHERE id = ?', [existing.id]);
    }
    setAlarmModalVisible(false);
    await loadMyMedications();
  };

  const handleDeleteAlarm = (notif: NotifSetting) => {
    const drug = DB.find(x => x.id === notif.targetId);
    Alert.alert(
      '알림 삭제',
      `${drug?.name ?? notif.targetId} 알림을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            if (notif.notifId) await Notifications.cancelScheduledNotificationAsync(notif.notifId);
            await db.runAsync('UPDATE NotificationSettings SET isActive = 0 WHERE id = ?', [notif.id]);
            await loadMyMedications();
          },
        },
      ]
    );
  };

  // ── 파생값 ────────────────────────────────────────────────────────────────
  const stopMed  = meds.find(m => m.id === stopMedId);
  const stopDrug = DB.find(x => x.id === stopMed?.drugId);

  const perPillParsed = parseFloat(doseValInput);
  const pillsParsed   = Math.max(1, parseInt(pillCountInput, 10) || 1);
  const totalDailyMg  = doseValInput.trim() && !isNaN(perPillParsed) && perPillParsed > 0
    ? perPillParsed * pillsParsed : null;
  const dosePctHint = selectedDrug && totalDailyMg !== null && selectedDrug.maxDose
    ? `→ 일일 총 ${totalDailyMg}mg (최고 용량의 ${Math.round(totalDailyMg / selectedDrug.maxDose * 100)}%)`
    : null;

  const modalFilteredDrugs = modalSearchQuery.trim() !== ''
    ? DB.filter(d => d.name.includes(modalSearchQuery) || d.brand.includes(modalSearchQuery))
    : activeCategory === '전체' ? DB : DB.filter(d => d.cat.includes(activeCategory));

  // ── 탭바 ──────────────────────────────────────────────────────────────────
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
          onPress={() => setActiveTab(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabItemText, activeTab === tab.key && styles.tabItemTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── 약물 카드 아이템 ───────────────────────────────────────────────────────
  const renderMedItem = (med: MedicationLog, isStopped: boolean, isLast: boolean) => {
    const d = DB.find(x => x.id === med.drugId);
    const c = COLOR_MAP[med.drugId] ?? { color: C.accent, bg: C.purpleDark };
    const pct = med.doseVal && d?.maxDose ? Math.round(med.doseVal / d.maxDose * 100) : null;
    const activeNotif = notifSettings.find(n => n.targetId === med.drugId);

    return (
      <View key={med.id} style={[styles.medItem, isStopped && styles.medItemStopped, isLast && styles.medItemLast]}>
        {isStopped
          ? <View style={[styles.medDotOutline, { borderColor: c.color }]} />
          : <View style={[styles.medDot, { backgroundColor: c.color }]} />
        }
        <View style={styles.medContent}>
          <Text style={styles.medName}>
            {d?.name ?? med.drugId}{' '}
            <Text style={styles.medBrand}>({d?.brand ?? ''})</Text>
          </Text>
          <Text style={styles.medSub}>
            {med.dose || d?.dose || ''}
            {pct !== null ? ` · 최고용량의 ${pct}%` : ''}
            {' · '}{med.startDate}
            {isStopped && med.stopDate ? ` ~ ${med.stopDate}` : ''}
          </Text>
          {isStopped && med.stopReason
            ? <Text style={[styles.medSub, { fontStyle: 'italic' }]}>사유: {med.stopReason}</Text>
            : null}
          <View style={styles.badgeRow}>
            <View style={[styles.medBadge, { backgroundColor: c.bg }]}>
              <Text style={[styles.medBadgeText, { color: c.color }]}>{d?.cat ?? '기타'}</Text>
            </View>
            {isStopped && (
              <View style={[styles.medBadge, { backgroundColor: C.dangerDark, marginLeft: 4 }]}>
                <Text style={[styles.medBadgeText, { color: C.danger }]}>중단</Text>
              </View>
            )}
          </View>
          {!isStopped && deleteConfirmId !== med.id && (
            <View style={styles.medActions}>
              <Pressable
                style={({ pressed }) => [styles.medActionBtn, styles.seBtn, pressed && { opacity: 0.6 }]}
                onPress={() => setSideEffectMed(med)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.medActionBtnText, { color: C.olive }]}>🩺 증상 기록</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.medActionBtn, activeNotif ? styles.alarmBtnActive : styles.alarmBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleAlarm(med.drugId)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Bell size={12} color={activeNotif ? C.accent : '#7AABE0'} />
                <Text style={[styles.medActionBtnText, { color: activeNotif ? C.accent : '#7AABE0' }]}>
                  {activeNotif ? `알림 ${activeNotif.time} (켜짐)` : '알림 추가'}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.medActionBtn, styles.dangerBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleStop(med)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <StopCircle size={12} color={C.danger} />
                <Text style={[styles.medActionBtnText, { color: C.danger }]}>복용 중단</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.medActionBtn, styles.dangerBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleDelete(med)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={12} color={C.danger} />
                <Text style={[styles.medActionBtnText, { color: C.danger }]}>삭제</Text>
              </Pressable>
            </View>
          )}
          {!isStopped && deleteConfirmId === med.id && (
            <View style={styles.deleteConfirmRow}>
              <Text style={styles.deleteConfirmText}>정말 삭제할까요?</Text>
              <Pressable
                style={({ pressed }) => [styles.medActionBtn, styles.dangerBtn, { backgroundColor: C.dangerDark }, pressed && { opacity: 0.6 }]}
                onPress={() => handleConfirmDelete(med.id)}
              >
                <Text style={[styles.medActionBtnText, { color: C.danger }]}>삭제 확인</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.medActionBtn, { borderColor: C.border }, pressed && { opacity: 0.6 }]}
                onPress={() => setDeleteConfirmId(null)}
              >
                <Text style={[styles.medActionBtnText, { color: C.muted }]}>취소</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── 탭1: 내 약물 ──────────────────────────────────────────────────────────
  const renderTabMeds = () => (
    <GHScrollView style={styles.tabContent} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* ── 약물 찾기 배너 ── */}
      <TouchableOpacity
        style={styles.identifierBanner}
        onPress={() => setShowDrugIdentifier(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.identifierBannerEmoji}>🔍</Text>
        <View style={styles.identifierBannerText}>
          <Text style={styles.identifierBannerTitle}>약물 찾기</Text>
          <Text style={styles.identifierBannerSub}>색상·모양·각인으로 약을 찾아요</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>현재 복용 중</Text>
      <View style={[styles.card, { overflow: 'visible' }]}>
        {activeMeds.length > 0
          ? activeMeds.map((m, idx) => renderMedItem(m, false, idx === activeMeds.length - 1))
          : (
            <View style={styles.emptyState}>
              <Pill size={36} color={C.border} />
              <Text style={styles.emptyStateText}>복용 중인 약물이 없어요.{'\n'}처방 추가 버튼을 눌러 시작하세요.</Text>
            </View>
          )
        }
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Plus size={16} color={C.accent} />
        <Text style={styles.addBtnText}>처방 추가하기</Text>
      </TouchableOpacity>

      {stoppedMeds.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <TouchableOpacity style={styles.stoppedToggle} onPress={() => setStoppedVisible(v => !v)}>
            <Text style={styles.stoppedToggleText}>
              {stoppedVisible ? '중단된 약물 숨기기' : `중단된 약물 ${stoppedMeds.length}개 보기`}
            </Text>
          </TouchableOpacity>
          {stoppedVisible && (
            <>
              <Text style={styles.sectionTitle}>중단된 약물</Text>
              <View style={[styles.card, { overflow: 'visible' }]}>
                {stoppedMeds.map((m, idx) => renderMedItem(m, true, idx === stoppedMeds.length - 1))}
              </View>
            </>
          )}
        </View>
      )}

      <View style={{ height: 10 }} />
      <Text style={styles.sectionTitle}>최근 부작용 메모</Text>
      <View style={styles.card}>
        {seNotes.length > 0
          ? seNotes.slice(0, 3).map((note, idx) => {
              const d = DB.find(x => x.id === note.medId);
              const isLast = idx === Math.min(2, seNotes.length - 1);
              return (
                <View key={note.id} style={[styles.noteEntry, isLast && styles.noteEntryLast]}>
                  <Text style={styles.noteDate}>{note.date} · {d?.name ?? note.medId}</Text>
                  <View style={styles.noteBody}>
                    {note.se   ? <View style={styles.seTag}><Text style={styles.seTagText}>{note.se}</Text></View> : null}
                    {note.memo ? <Text style={styles.noteMemo}>{note.memo}</Text> : null}
                  </View>
                </View>
              );
            })
          : <Text style={styles.emptyText}>기록된 부작용 메모가 없어요.</Text>
        }
      </View>
      <View style={{ height: 24 }} />
    </GHScrollView>
  );

  // ── 탭2: 복용 추이 ────────────────────────────────────────────────────────
  const renderTabChart = () => {
    const screenWidth = Dimensions.get('window').width;
    const chartWidth  = screenWidth - 32;
    const medsWithDose = meds.filter(m => m.doseVal !== null);
    const rawLabels = medsWithDose.map(m => shortDate(m.startDate));
    const rawData   = medsWithDose.map(m => {
      const drug = DB.find(x => x.id === m.drugId);
      return drug && m.doseVal && drug.maxDose ? Math.round(m.doseVal / drug.maxDose * 100) : 0;
    });
    const chartLabels = rawData.length >= 2 ? rawLabels : rawData.length === 1 ? ['시작', ...rawLabels] : ['시작', '현재'];
    const chartData   = rawData.length >= 2 ? rawData  : rawData.length === 1 ? [0, ...rawData]         : [0, 0];
    const maxRef = Array(Math.max(2, chartData.length)).fill(100);
    const timelineEvents = meds.flatMap(m => {
      const drug = DB.find(x => x.id === m.drugId);
      const c = COLOR_MAP[m.drugId] ?? { color: C.accent, bg: C.purpleDark };
      const events: { label: string; date: string; color: string }[] = [
        { label: `${drug?.name ?? m.drugId} 처방 시작`, date: m.startDate, color: c.color },
      ];
      if (m.stopped && m.stopDate)
        events.push({ label: `${drug?.name ?? m.drugId} 복용 중단`, date: m.stopDate, color: C.danger });
      return events;
    });

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.summaryRow, { marginTop: 16 }]}>
          {[
            { num: activeMeds.length,  label: '현재 복용' },
            { num: seNotes.length,     label: '부작용 기록' },
            { num: stoppedMeds.length, label: '중단 기록' },
          ].map(item => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryCardNum}>{item.num}</Text>
              <Text style={styles.summaryCardLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>용량 추이 (최고용량 기준 %)</Text>
        {medsWithDose.length > 0 && (
          <View style={styles.chartLegend}>
            {medsWithDose.map(m => {
              const drug = DB.find(x => x.id === m.drugId);
              const c = COLOR_MAP[m.drugId] ?? { color: C.accent, bg: C.purpleDark };
              const pct = m.doseVal && drug?.maxDose ? Math.round(m.doseVal / drug.maxDose * 100) : null;
              return (
                <View key={m.id} style={styles.chartLegendItem}>
                  <View style={[styles.chartLegendDot, { backgroundColor: c.color }]} />
                  <Text style={styles.chartLegendText}>
                    {drug?.name ?? m.drugId}{pct !== null ? ` · ${pct}%` : ''}{m.stopped ? ' (중단)' : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.card, { paddingHorizontal: 0, paddingTop: 12, paddingBottom: 4 }]}>
          {medsWithDose.length > 0 ? (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [
                  { data: chartData, color: (o = 1) => `rgba(155,145,224,${o})`, strokeWidth: 2 },
                  { data: maxRef,    color: () => 'rgba(0,0,0,0)', strokeWidth: 0, withDots: false },
                ],
              }}
              width={chartWidth} height={180} yAxisSuffix="%" fromZero bezier withInnerLines withOuterLines={false}
              chartConfig={{
                backgroundColor: C.card, backgroundGradientFrom: C.card, backgroundGradientTo: C.card,
                decimalPlaces: 0,
                color:      (o = 1) => `rgba(155,145,224,${o})`,
                labelColor: (o = 1) => `rgba(181,186,175,${o})`,
                propsForDots: { r: '4', strokeWidth: '2', stroke: C.accent, fill: C.accent },
                propsForBackgroundLines: { stroke: C.border, strokeDasharray: '' },
              }}
              style={{ borderRadius: 14 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>용량 수치가 있는 처방이 없어요.{'\n'}처방 추가 시 용량을 입력해주세요.</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>처방 타임라인</Text>
        <View style={styles.card}>
          {timelineEvents.length > 0
            ? timelineEvents.map((ev, idx) => (
                <View key={idx} style={[styles.timelineItem, idx === timelineEvents.length - 1 && styles.medItemLast]}>
                  <View style={[styles.timelineDot, { backgroundColor: ev.color }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDate}>{ev.date}</Text>
                    <Text style={styles.timelineText}>{ev.label}</Text>
                  </View>
                </View>
              ))
            : <Text style={styles.emptyText}>처방 기록이 없어요.</Text>
          }
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  };

  // ── 탭3: 복용 알림 ────────────────────────────────────────────────────────
  const renderTabAlarm = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>설정된 알림</Text>
      {notifSettings.length > 0 ? (
        <View style={styles.card}>
          {notifSettings.map((n, idx) => {
            const drug = DB.find(x => x.id === n.targetId);
            const c = COLOR_MAP[n.targetId] ?? { color: C.accent, bg: C.purpleDark };
            return (
              <View key={n.id} style={[styles.alarmItem, idx === notifSettings.length - 1 && styles.alarmItemLast]}>
                <View style={[styles.medDot, { backgroundColor: c.color, marginTop: 0 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{drug?.name ?? n.targetId}</Text>
                  <Text style={styles.medSub}>매일 {n.time}</Text>
                </View>
                <TouchableOpacity style={styles.deleteAlarmBtn} onPress={() => handleDeleteAlarm(n)}>
                  <Trash2 size={15} color={C.danger} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.card, { paddingVertical: 32, alignItems: 'center' }]}>
          <Bell size={36} color={C.border} />
          <Text style={[styles.emptyStateText, { marginTop: 10 }]}>설정된 알림이 없어요.{'\n'}아래 버튼으로 알림을 추가해보세요.</Text>
        </View>
      )}
      <TouchableOpacity style={styles.addBtn} onPress={openAlarmFromTab3}>
        <Plus size={16} color={C.accent} />
        <Text style={styles.addBtnText}>새 알림 추가</Text>
      </TouchableOpacity>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // ── 탭4: 약물 정보 ────────────────────────────────────────────────────────
  const renderTabInfo = () => {
    const filtered = DB.filter(d =>
      d.name.includes(searchQuery) || d.brand.includes(searchQuery) || d.cat.includes(searchQuery)
    );
    return (
      <View style={{ flex: 1 }}>
        {/* 서브탭 바 */}
        <View style={styles.infoSubTabBar}>
          {([
            { key: 'identifier', label: '약 찾기' },
            { key: 'info',       label: '약물 안내' },
          ] as { key: 'identifier' | 'info'; label: string }[]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.infoSubTab, drugInfoSubTab === tab.key && styles.infoSubTabActive]}
              onPress={() => setDrugInfoSubTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.infoSubTabText, drugInfoSubTab === tab.key && styles.infoSubTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 약 찾기: 기존 DB 검색 */}
        {drugInfoSubTab === 'identifier' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.formInput, styles.searchInput]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="약물명, 계열 검색..."
              placeholderTextColor={C.dim}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {filtered.map(drug => {
              const c = COLOR_MAP[drug.id] ?? { color: C.accent, bg: C.purpleDark };
              const isExpanded = expandedDrugId === drug.id;
              const myNotes = seNotes.filter(n => n.medId === drug.id);
              return (
                <View key={drug.id} style={[styles.card, { marginBottom: 8 }]}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => setExpandedDrugId(isExpanded ? null : drug.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.medDot, { backgroundColor: c.color, marginTop: 0 }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{drug.name}</Text>
                      <Text style={styles.medSub}>{drug.brand} · {drug.cat}</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      <Text style={styles.infoLabel}>작용</Text>
                      <Text style={styles.infoText}>{drug.desc}</Text>
                      <Text style={styles.infoLabel}>대표 용량</Text>
                      <Text style={styles.infoText}>{drug.dose}</Text>
                      <Text style={styles.infoLabel}>알려진 부작용</Text>
                      <View style={styles.seTagRow}>
                        {drug.se.map(se => <View key={se} style={styles.seTag}><Text style={styles.seTagText}>{se}</Text></View>)}
                      </View>
                      {myNotes.length > 0 && (
                        <>
                          <Text style={styles.infoLabel}>내가 기록한 부작용</Text>
                          {myNotes.map(note => (
                            <View key={note.id} style={styles.mySeRow}>
                              <Text style={styles.noteDate}>{note.date}</Text>
                              <View style={styles.noteBody}>
                                {note.se   ? <View style={styles.seTag}><Text style={styles.seTagText}>{note.se}</Text></View> : null}
                                {note.memo ? <Text style={styles.noteMemo}>{note.memo}</Text> : null}
                              </View>
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>
        )}

        {/* 약물 안내: DrugInfoBrowser */}
        {drugInfoSubTab === 'info' && (
          <DrugInfoBrowser prescribedDrugClasses={prescribedDrugClasses} />
        )}
      </View>
    );
  };

  // ── 메인 렌더 ────────────────────────────────────────────────────────────
  return (
    <>
      <FadeInView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>내 약물 기록</Text>
          <Text style={styles.headerSub}>{headerToday}</Text>
        </View>
        {renderTabBar()}
        {activeTab === 'meds'  && renderTabMeds()}
        {activeTab === 'chart' && renderTabChart()}
        {activeTab === 'alarm' && renderTabAlarm()}
        {activeTab === 'info'  && renderTabInfo()}
      </FadeInView>

      {/* ── 처방 추가 모달 — 단일 Modal, modalStep으로 내부 전환 ──────────── */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAddModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKAV}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              {/* ─ 1단계: 약물 검색 ──────────────────────────────────────── */}
              {modalStep === 1 && (
                <>
                  <Text style={styles.modalTitle}>약물 선택</Text>
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
                    <Text style={[styles.modalSubtitle, { marginTop: 0 }]}>복용 약물을 검색하거나 계열별로 찾아보세요.</Text>
                    {/* 카테고리 탭 */}
                    <ScrollView
                      horizontal showsHorizontalScrollIndicator={false}
                      style={styles.categoryScrollView}
                      contentContainerStyle={{ paddingRight: 4 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {MODAL_CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                          onPress={() => { setActiveCategory(cat); setModalSearchQuery(''); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.categoryTabText, activeCategory === cat && styles.categoryTabTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {/* 검색창 */}
                    <TextInput
                      style={[styles.formInput, { marginBottom: 10 }]}
                      value={modalSearchQuery}
                      onChangeText={setModalSearchQuery}
                      placeholder="약물명 또는 상품명 검색..."
                      placeholderTextColor={C.dim}
                      clearButtonMode="while-editing"
                    />
                    <Text style={[styles.formLabel, { marginTop: 0 }]}>{modalFilteredDrugs.length}개의 약물</Text>
                    {modalFilteredDrugs.length === 0 && (
                      <Text style={[styles.emptyText, { paddingVertical: 12 }]}>검색 결과가 없어요.</Text>
                    )}
                    {modalFilteredDrugs.map(drug => {
                      const c = COLOR_MAP[drug.id] ?? { color: C.accent, bg: C.purpleDark };
                      return (
                        <TouchableOpacity
                          key={drug.id}
                          style={styles.drugPickerItem}
                          onPress={() => handleSelectDrug(drug)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.drugPickerItemLeft}>
                            <View style={[styles.drugPickerDot, { backgroundColor: c.color }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.drugPickerName}>{drug.name}</Text>
                              <Text style={styles.drugPickerSub}>{drug.brand} · {drug.cat} · 최고 {drug.maxDose}mg</Text>
                            </View>
                          </View>
                          <Text style={[styles.drugPickerArrow, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity style={styles.cancelLink} onPress={() => setAddModalVisible(false)}>
                      <Text style={styles.cancelLinkText}>취소</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}

              {/* ─ 2단계: 처방 상세 입력 ─────────────────────────────────── */}
              {modalStep === 2 && selectedDrug && (
                <>
                  {/* 뒤로가기 + 타이틀 */}
                  <View style={styles.stepHeaderRow}>
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={handleBackToSearch}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <ChevronLeft size={22} color={C.muted} />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { marginBottom: 0 }]}>처방 상세 입력</Text>
                    <View style={{ width: 34 }} />
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    style={{ marginTop: 8 }}
                  >
                    {/* 선택 약물 정보 카드 */}
                    {(() => {
                      const c = COLOR_MAP[selectedDrug.id] ?? { color: C.accent, bg: C.purpleDark };
                      return (
                        <View style={styles.drugInfoCard}>
                          <View style={styles.drugInfoRow}>
                            <View style={[styles.drugInfoDot, { backgroundColor: c.color }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.drugInfoName}>{selectedDrug.name}</Text>
                              <Text style={styles.drugInfoBrand}>{selectedDrug.brand}</Text>
                            </View>
                            <View style={[styles.drugInfoBadge, { backgroundColor: c.bg }]}>
                              <Text style={[styles.drugInfoBadgeText, { color: c.color }]}>{selectedDrug.cat}</Text>
                            </View>
                          </View>
                          <View style={styles.drugInfoDivider} />
                          <Text style={styles.drugInfoHint}>대표 용량: {selectedDrug.dose} · 최대 권장량: {selectedDrug.maxDose}mg/일</Text>
                        </View>
                      );
                    })()}

                    {/* 1회 용량 */}
                    <Text style={styles.formLabel}>
                      1회 처방 용량 <Text style={styles.formLabelHint}>(mg 숫자만 입력)</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={doseValInput}
                      onChangeText={setDoseValInput}
                      placeholder="예: 10"
                      placeholderTextColor={C.dim}
                      keyboardType="decimal-pad"
                    />

                    {/* 일일 복용 알 수 */}
                    <Text style={[styles.formLabel, { marginTop: 14 }]}>
                      일일 복용 알 수 <Text style={styles.formLabelHint}>(기본 1알)</Text>
                    </Text>
                    <View style={styles.pillCountRow}>
                      <TouchableOpacity
                        style={styles.pillCountBtn}
                        onPress={() => setPillCountInput(p => String(Math.max(1, (parseInt(p, 10) || 1) - 1)))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.pillCountBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.pillCountInput}
                        value={pillCountInput}
                        onChangeText={v => setPillCountInput(v.replace(/[^0-9]/g, '') || '1')}
                        keyboardType="number-pad"
                        maxLength={2}
                        textAlign="center"
                      />
                      <TouchableOpacity
                        style={styles.pillCountBtn}
                        onPress={() => setPillCountInput(p => String((parseInt(p, 10) || 1) + 1))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.pillCountBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {dosePctHint !== null && <Text style={styles.dosePctHint}>{dosePctHint}</Text>}

                    {/* 복용 시작일 */}
                    <Text style={[styles.formLabel, { marginTop: 14 }]}>복용 시작일</Text>
                    <TextInput
                      style={styles.formInput}
                      value={startDateInput}
                      onChangeText={setStartDateInput}
                      placeholder="예: 2025년 1월 15일"
                      placeholderTextColor={C.dim}
                    />

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrescription} activeOpacity={0.8}>
                      <Text style={styles.saveBtnText}>처방 저장하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelLink} onPress={() => setAddModalVisible(false)}>
                      <Text style={styles.cancelLinkText}>취소</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── 복용 중단 모달 ─────────────────────────────────────────────────── */}
      <Modal visible={stopModalVisible} transparent animationType="slide" onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setStopModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKAV}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>복용 중단</Text>
              <Text style={styles.stopMedName}>{stopDrug?.name ?? stopMed?.drugId ?? ''}</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
                <Text style={[styles.formLabel, { marginTop: 16 }]}>중단 날짜</Text>
                <TextInput style={styles.formInput} value={stopDateInput} onChangeText={setStopDateInput} placeholder="예: 2025년 6월 1일" placeholderTextColor={C.dim} />
                <Text style={styles.formLabel}>중단 이유 <Text style={styles.formLabelHint}>(선택 사항)</Text></Text>
                <TextInput
                  style={[styles.formInput, styles.multilineInput]}
                  value={stopReasonInput} onChangeText={setStopReasonInput}
                  placeholder="예: 부작용으로 인한 중단" placeholderTextColor={C.dim}
                  multiline textAlignVertical="top"
                />
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#8B2020', marginTop: 20 }]} onPress={handleSaveStop}>
                  <Text style={styles.saveBtnText}>복용 중단 확인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelLink} onPress={() => setStopModalVisible(false)}>
                  <Text style={styles.cancelLinkText}>취소</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── 약물 찾기 모달 ─────────────────────────────────────────────────── */}
      <Modal
        visible={showDrugIdentifier}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDrugIdentifier(false)}
      >
        <DrugIdentifier
          onSelect={handleDrugIdentifierSelect}
          onClose={() => setShowDrugIdentifier(false)}
        />
      </Modal>

      {/* ── 부작용 기록 모달 ────────────────────────────────────────────────── */}
      {sideEffectMed !== null && (() => {
        const drug = DB.find(x => x.id === sideEffectMed.drugId);
        return (
          <SideEffectInput
            visible
            medId={String(sideEffectMed.id)}
            medName={drug?.name ?? sideEffectMed.drugId}
            onClose={() => setSideEffectMed(null)}
            onSaved={loadMyMedications}
          />
        );
      })()}

      {/* ── 알림 설정 모달 ─────────────────────────────────────────────────── */}
      <Modal visible={alarmModalVisible} transparent animationType="slide" onRequestClose={() => setAlarmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAlarmModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKAV}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              {alarmStep === 'drug' ? (
                <>
                  <Text style={styles.modalTitle}>알림 추가</Text>
                  <Text style={styles.formLabel}>알림을 설정할 약물 선택</Text>
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
                    {activeMeds.length > 0 ? activeMeds.map(med => {
                      const drug = DB.find(x => x.id === med.drugId);
                      const c = COLOR_MAP[med.drugId] ?? { color: C.accent, bg: C.purpleDark };
                      return (
                        <TouchableOpacity
                          key={med.id}
                          style={styles.drugPickerItem}
                          onPress={() => { setAlarmDrugId(med.drugId); setAlarmStep('time'); }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.drugPickerItemLeft}>
                            <View style={[styles.drugPickerDot, { backgroundColor: c.color }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.drugPickerName}>{drug?.name ?? med.drugId}</Text>
                              <Text style={styles.drugPickerSub}>{drug?.brand} · {drug?.cat}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }) : <Text style={[styles.emptyText, { paddingVertical: 24 }]}>복용 중인 약물이 없어요.</Text>}
                    <TouchableOpacity style={styles.cancelLink} onPress={() => setAlarmModalVisible(false)}>
                      <Text style={styles.cancelLinkText}>취소</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>복약 알림 설정</Text>
                  <Text style={styles.alarmDrugName}>{DB.find(x => x.id === alarmDrugId)?.name ?? alarmDrugId}</Text>
                  <Text style={[styles.formLabel, { marginTop: 20 }]}>알림 시간 <Text style={styles.formLabelHint}>(HH:MM 형식)</Text></Text>
                  <TextInput
                    style={styles.formInput} value={alarmTimeInput} onChangeText={setAlarmTimeInput}
                    placeholder="예: 08:30" placeholderTextColor={C.dim}
                    keyboardType="numbers-and-punctuation" maxLength={5}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAlarm}>
                    <Text style={styles.saveBtnText}>알림 저장하기</Text>
                  </TouchableOpacity>
                  {notifSettings.find(n => n.targetId === alarmDrugId) && (
                    <TouchableOpacity style={styles.cancelLink} onPress={handleCancelAlarm}>
                      <Text style={[styles.cancelLinkText, { color: C.danger }]}>알림 끄기</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.cancelLink} onPress={() => setAlarmModalVisible(false)}>
                    <Text style={styles.cancelLinkText}>취소</Text>
                  </TouchableOpacity>
                  <View style={{ height: 24 }} />
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.card },
  headerTitle:  { fontSize: 18, fontWeight: '500', color: C.text, letterSpacing: -0.2 },
  headerSub:    { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 19 },
  tabBar:       { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tabItem:      { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive:{ borderBottomWidth: 2, borderBottomColor: C.green },
  tabItemText:  { fontSize: 12, color: C.muted },
  tabItemTextActive: { color: C.green, fontWeight: '500' },
  tabContent:   { flex: 1, backgroundColor: C.bg },
  contentContainer: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 28 },
  sectionTitle: { fontSize: 11, fontWeight: '500', color: C.muted, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  card: {
    backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 26, paddingHorizontal: 18, marginBottom: 12, overflow: 'hidden',
  },
  medItem:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 10 },
  medItemLast:   { borderBottomWidth: 0 },
  medItemStopped:{ opacity: 0.40 },
  medDot:        { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  medDotOutline: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginTop: 5, backgroundColor: 'transparent' },
  medContent:    { flex: 1 },
  medName:       { fontSize: 14, fontWeight: '500', color: C.text, letterSpacing: -0.1 },
  medBrand:      { fontWeight: '400', fontSize: 12, color: C.muted },
  medSub:        { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 18 },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 5 },
  medBadge:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  medBadgeText:  { fontSize: 11 },
  medActions:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  deleteConfirmRow:{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  deleteConfirmText:{ fontSize: 12, color: C.danger },
  medActionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 22, borderWidth: 0.5 },
  seBtn:         { borderColor: C.oliveDark, backgroundColor: C.oliveFaded },
  alarmBtn:      { borderColor: '#253E50' },
  alarmBtnActive:{ borderColor: C.accentBorder, backgroundColor: C.accentDark },
  dangerBtn:     { borderColor: C.dangerBorder },
  medActionBtnText: { fontSize: 12 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 15, borderRadius: 16,
    borderWidth: 0.5, borderStyle: 'dashed', borderColor: C.accentBorder,
    marginBottom: 4, backgroundColor: 'transparent',
  },
  addBtnText:        { color: C.accent, fontSize: 14, fontWeight: '400' },
  stoppedToggle:     { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  stoppedToggleText: { fontSize: 13, color: C.muted },
  emptyState:    { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyStateText:{ fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  noteEntry:     { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  noteEntryLast: { borderBottomWidth: 0 },
  noteDate:      { fontSize: 11, color: C.muted, letterSpacing: 0.2 },
  noteBody:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4, gap: 4 },
  seTag:         { backgroundColor: '#302000', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  seTagText:     { fontSize: 11, color: '#A87850' },
  noteMemo:      { fontSize: 13, color: C.text, lineHeight: 20 },
  emptyText:     { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 18 },
  chartLegend:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  chartLegendItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  chartLegendDot: { width: 8, height: 8, borderRadius: 4 },
  chartLegendText:{ fontSize: 11, color: C.text },
  summaryRow:    { flexDirection: 'row', gap: 12, marginBottom: 18 },
  summaryCard:   { flex: 1, backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border, borderRadius: 22, padding: 16, alignItems: 'center' },
  summaryCardNum:  { fontSize: 26, fontWeight: '600', color: C.green },
  summaryCardLabel:{ fontSize: 11, color: C.muted, marginTop: 3, textAlign: 'center', lineHeight: 16 },
  timelineItem:  { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 10 },
  timelineDot:   { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  timelineContent:{ flex: 1 },
  timelineDate:  { fontSize: 11, color: C.muted, letterSpacing: 0.2 },
  timelineText:  { fontSize: 13, color: C.text, marginTop: 2, lineHeight: 20 },
  alarmItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 10 },
  alarmItemLast: { borderBottomWidth: 0 },
  deleteAlarmBtn:{ padding: 6 },
  searchInput:   { marginTop: 8, marginBottom: 16 },
  accordionHeader:{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  accordionBody: { paddingTop: 10, paddingBottom: 16, borderTopWidth: 0.5, borderTopColor: C.border },
  infoLabel:     { fontSize: 11, fontWeight: '500', color: C.muted, marginTop: 12, marginBottom: 5, letterSpacing: 0.5 },
  infoText:      { fontSize: 13, color: C.text, lineHeight: 21 },
  seTagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  mySeRow:       { marginTop: 8 },
  modalOverlay:  { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalKAV:      { width: '100%' },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 18,
    maxHeight: Dimensions.get('window').height * 0.84,
  },
  modalHandle:   { width: 36, height: 3.5, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle:    { fontSize: 16, fontWeight: '500', color: C.text, marginBottom: 4, letterSpacing: -0.1 },
  modalSubtitle: { fontSize: 13, color: C.muted, marginBottom: 10, lineHeight: 20 },
  stopMedName:   { fontSize: 15, fontWeight: '500', color: C.danger, marginTop: 2, marginBottom: 6 },
  alarmDrugName: { fontSize: 15, fontWeight: '500', color: C.accent, marginTop: 2 },
  formLabel:     { fontSize: 13, color: C.muted, marginBottom: 8, marginTop: 16 },
  formLabelHint: { fontSize: 12, color: C.dim },
  drugPickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
    marginBottom: 7, backgroundColor: C.bg,
  },
  drugPickerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  drugPickerDot:  { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  drugPickerName: { fontSize: 14, fontWeight: '500', color: C.text },
  drugPickerSub:  { fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 17 },
  drugPickerArrow:{ fontSize: 20, lineHeight: 24 },
  formInput: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 0.5, borderColor: C.border,
    backgroundColor: C.bg, fontSize: 14, color: C.text, lineHeight: 22,
  },
  multilineInput: { height: 84, paddingTop: 11 },
  dosePctHint:    { fontSize: 12, color: C.accent, marginTop: 7 },
  saveBtn:        { backgroundColor: C.purple, borderRadius: 100, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  saveBtnText:    { color: C.text, fontSize: 15, fontWeight: '500' },
  cancelLink:     { alignItems: 'center', paddingVertical: 13 },
  cancelLinkText: { fontSize: 14, color: C.muted },
  categoryScrollView:  { marginTop: 12, marginBottom: 12 },
  categoryTab:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 22, borderWidth: 0.5, borderColor: C.border, marginRight: 7, backgroundColor: C.bg },
  categoryTabActive:   { backgroundColor: C.accentDark, borderColor: C.accentBorder },
  categoryTabText:     { fontSize: 12, color: C.muted },
  categoryTabTextActive:{ color: C.accent, fontWeight: '500' },
  // 2단계 전용
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn:       { padding: 4 },
  drugInfoCard:  { backgroundColor: C.bg, borderRadius: 18, borderWidth: 0.5, borderColor: C.border, padding: 16, marginTop: 8, marginBottom: 6 },
  drugInfoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drugInfoDot:   { width: 12, height: 12, borderRadius: 6 },
  drugInfoName:  { fontSize: 16, fontWeight: '500', color: C.text, letterSpacing: -0.1 },
  drugInfoBrand: { fontSize: 12, color: C.muted, marginTop: 2 },
  drugInfoBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  drugInfoBadgeText: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  drugInfoDivider:   { height: 0.5, backgroundColor: C.border, marginVertical: 12 },
  drugInfoHint:  { fontSize: 12, color: C.muted, lineHeight: 19 },
  pillCountRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillCountBtn:  { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  pillCountBtnText: { fontSize: 22, color: C.text, lineHeight: 28 },
  pillCountInput:{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg, fontSize: 18, fontWeight: '500', color: C.text, textAlign: 'center' },
  // 탭4 서브탭
  infoSubTabBar: {
    flexDirection:     'row',
    backgroundColor:   C.card,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingVertical:   8,
    gap:               8,
  },
  infoSubTab: {
    paddingHorizontal: 16,
    paddingVertical:   6,
    borderRadius:      20,
    backgroundColor:   C.bg,
    borderWidth:       0.5,
    borderColor:       C.border,
  },
  infoSubTabActive: {
    backgroundColor: C.oliveFaded,
    borderColor:     C.oliveDark,
  },
  infoSubTabText: {
    fontSize:   13,
    color:      C.muted,
    fontWeight: '500',
  },
  infoSubTabTextActive: {
    color:      C.olive,
    fontWeight: '600',
  },
  // 약물 찾기 배너
  identifierBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    marginTop:       16,
    marginBottom:    4,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius:    16,
    borderWidth:     1,
    borderStyle:     'dashed',
    borderColor:     C.accentBorder,
    backgroundColor: C.accentDark,
  },
  identifierBannerEmoji: { fontSize: 20 },
  identifierBannerText:  { flex: 1 },
  identifierBannerTitle: { fontSize: 14, fontWeight: '600', color: C.accent, letterSpacing: -0.1 },
  identifierBannerSub:   { fontSize: 12, color: C.muted, marginTop: 2 },
});
