import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://pmdwqeknvcesjeaglnma.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZHdxZWtudmNlc2plYWdsbm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDU5MTQsImV4cCI6MjA5Njc4MTkxNH0.0hnS6xA7gsUakOCVf14yz_NwKADv2k7jy6hPZZ-cEQE';

// 웹 프로젝트와 동일한 이메일 마스킹 도메인
export const FAKE_DOMAIN = '@olivemind.local';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:           AsyncStorage,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
});

// ── 검사 결과 저장 헬퍼 ──────────────────────────────────────────────────────────
// 웹 프로젝트(test_results 테이블 스키마)와 동일하게 user_id 포함하여 저장.
// 세션이 없으면(비로그인) 저장을 생략하고 조용히 반환.
export async function saveTestResult(
  testType:      string,
  score:         number,
  answers:       Record<string, any>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('test_results').insert({
      user_id:        session.user.id,
      test_type:      testType,
      score,
      result_summary: JSON.stringify(answers),
    });

    if (error) console.warn('[supabase] saveTestResult error:', error.message);
  } catch { /* 네트워크 오류 무시 */ }
}
