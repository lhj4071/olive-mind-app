import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, FAKE_DOMAIN } from '../../src/lib/supabase';
import { C } from '../../src/styles/theme';

const APPROVAL_CODE = 'olive2026';

type Tab = 'login' | 'register';

export default function LoginScreen() {
  const [tab, setTab]           = useState<Tab>('login');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // 로그인 폼
  const [loginId, setLoginId]   = useState('');
  const [loginPw, setLoginPw]   = useState('');

  // 회원가입 폼
  const [regId, setRegId]       = useState('');
  const [regPw, setRegPw]       = useState('');
  const [regPw2, setRegPw2]     = useState('');
  const [regCode, setRegCode]   = useState('');

  const pwRef   = useRef<TextInput>(null);
  const regPwRef  = useRef<TextInput>(null);
  const regPw2Ref = useRef<TextInput>(null);
  const regCodeRef = useRef<TextInput>(null);

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
    setSuccess(null);
  };

  // ── 로그인 ─────────────────────────────────────────────────────────────────
  const doLogin = async () => {
    const id = loginId.trim();
    const pw = loginPw;

    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력해 주세요.'); return;
    }

    setError(null);
    setLoading(true);
    try {
      const email = id + FAKE_DOMAIN;
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (authErr) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      // 성공 시 _layout.tsx의 onAuthStateChange가 세션을 감지하고 (tabs)로 자동 이동
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── 회원가입 ───────────────────────────────────────────────────────────────
  const doRegister = async () => {
    const id   = regId.trim();
    const pw   = regPw;
    const pw2  = regPw2;
    const code = regCode.trim();

    if (!id || id.length < 3) {
      setError('아이디는 3자 이상이어야 합니다.'); return;
    }
    if (/[^a-zA-Z0-9_]/.test(id)) {
      setError('아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.'); return;
    }
    if (!pw || pw.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.'); return;
    }
    if (pw !== pw2) {
      setError('비밀번호가 일치하지 않습니다.'); return;
    }
    if (code !== APPROVAL_CODE) {
      setError('올바르지 않은 승인 코드입니다.'); return;
    }

    setError(null);
    setLoading(true);
    try {
      const email = id + FAKE_DOMAIN;
      const { error: authErr } = await supabase.auth.signUp({ email, password: pw });
      if (authErr) {
        if (authErr.message.includes('already registered')) {
          setError('이미 사용 중인 아이디입니다.');
        } else {
          setError('가입 실패: ' + authErr.message);
        }
      } else {
        setSuccess('회원가입이 완료되었습니다. 로그인해 주세요.');
        setRegId(''); setRegPw(''); setRegPw2(''); setRegCode('');
        setTimeout(() => switchTab('login'), 1000);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 로고 영역 ── */}
          <View style={s.logoArea}>
            <Text style={s.logoIcon}>🌿</Text>
            <Text style={s.logoTitle}>Olive Mind</Text>
            <Text style={s.logoSub}>마음 건강 기록 플랫폼</Text>
          </View>

          {/* ── 탭 카드 ── */}
          <View style={s.card}>
            {/* 탭 스위처 */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tabBtn, tab === 'login' && s.tabBtnActive]}
                onPress={() => switchTab('login')}
                activeOpacity={0.75}
              >
                <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tabBtn, tab === 'register' && s.tabBtnActive]}
                onPress={() => switchTab('register')}
                activeOpacity={0.75}
              >
                <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            {/* 에러 / 성공 메시지 */}
            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={s.successBox}>
                <Text style={s.successText}>{success}</Text>
              </View>
            )}

            {/* ── 로그인 폼 ── */}
            {tab === 'login' && (
              <View style={s.form}>
                <Text style={s.label}>아이디</Text>
                <TextInput
                  style={s.input}
                  value={loginId}
                  onChangeText={setLoginId}
                  placeholder="아이디 입력"
                  placeholderTextColor={C.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => pwRef.current?.focus()}
                />
                <Text style={s.label}>비밀번호</Text>
                <TextInput
                  ref={pwRef}
                  style={s.input}
                  value={loginPw}
                  onChangeText={setLoginPw}
                  placeholder="비밀번호 입력"
                  placeholderTextColor={C.dim}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={doLogin}
                />
                <TouchableOpacity
                  style={[s.primaryBtn, loading && s.btnDisabled]}
                  onPress={doLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <Text style={s.primaryBtnText}>로그인</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.switchLink} onPress={() => switchTab('register')}>
                  <Text style={s.switchLinkText}>계정이 없으신가요? <Text style={s.switchLinkBold}>회원가입</Text></Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── 회원가입 폼 ── */}
            {tab === 'register' && (
              <View style={s.form}>
                <Text style={s.label}>아이디</Text>
                <Text style={s.inputHint}>영문, 숫자, 밑줄(_) 3자 이상</Text>
                <TextInput
                  style={s.input}
                  value={regId}
                  onChangeText={setRegId}
                  placeholder="예: john_doe"
                  placeholderTextColor={C.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => regPwRef.current?.focus()}
                />
                <Text style={s.label}>비밀번호</Text>
                <Text style={s.inputHint}>6자 이상</Text>
                <TextInput
                  ref={regPwRef}
                  style={s.input}
                  value={regPw}
                  onChangeText={setRegPw}
                  placeholder="비밀번호"
                  placeholderTextColor={C.dim}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => regPw2Ref.current?.focus()}
                />
                <Text style={s.label}>비밀번호 확인</Text>
                <TextInput
                  ref={regPw2Ref}
                  style={s.input}
                  value={regPw2}
                  onChangeText={setRegPw2}
                  placeholder="비밀번호 재입력"
                  placeholderTextColor={C.dim}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => regCodeRef.current?.focus()}
                />
                <Text style={s.label}>승인 코드</Text>
                <Text style={s.inputHint}>원장 선생님께 문의하세요</Text>
                <TextInput
                  ref={regCodeRef}
                  style={s.input}
                  value={regCode}
                  onChangeText={setRegCode}
                  placeholder="승인 코드"
                  placeholderTextColor={C.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={doRegister}
                />
                <TouchableOpacity
                  style={[s.primaryBtn, loading && s.btnDisabled]}
                  onPress={doRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <Text style={s.primaryBtnText}>가입 신청</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.switchLink} onPress={() => switchTab('login')}>
                  <Text style={s.switchLinkText}>이미 계정이 있으신가요? <Text style={s.switchLinkBold}>로그인</Text></Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 하단 안내 */}
          <Text style={s.notice}>
            본 앱은 정신건강의학과 진료 보조 도구입니다.{'\n'}
            진단 목적으로 사용할 수 없습니다.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 32,
  },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIcon:  { fontSize: 44, marginBottom: 10 },
  logoTitle: { color: C.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  logoSub:   { color: C.textMuted, fontSize: 13, marginTop: 4 },

  // Card
  card: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: {
    flex: 1, paddingVertical: 15, alignItems: 'center',
  },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: C.olive },
  tabText:       { color: C.dim, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: C.olive },

  // Messages
  errorBox: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.dangerDark, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.dangerBorder,
  },
  errorText:   { color: C.danger, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  successBox: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.oliveFaded, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.olive + '44',
  },
  successText: { color: C.olive, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  // Form
  form:      { padding: 20 },
  label:     { color: C.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 14, letterSpacing: 0.3 },
  inputHint: { color: C.dim, fontSize: 11, marginBottom: 6, marginTop: -3 },
  input: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text,
  },

  // Buttons
  primaryBtn: {
    marginTop: 22, backgroundColor: C.olive, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled:     { opacity: 0.6 },
  primaryBtnText:  { color: C.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  switchLink: { marginTop: 16, alignItems: 'center' },
  switchLinkText: { color: C.textMuted, fontSize: 13 },
  switchLinkBold: { color: C.olive, fontWeight: '600' },

  // Notice
  notice: {
    color: C.dim, fontSize: 11, textAlign: 'center',
    lineHeight: 17, marginTop: 24, paddingHorizontal: 8,
  },
});
