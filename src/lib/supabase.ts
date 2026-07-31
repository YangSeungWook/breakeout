import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 정적 export 라서 서버가 없다. 브라우저가 anon key 로 Supabase 를 직접 호출하고,
 * 권한은 RLS 정책(supabase/migrations/*.sql)이 통제한다.
 *
 * NEXT_PUBLIC_* 값은 빌드 시점에 문자열로 치환되므로 반드시 통째로 참조해야 한다.
 * (process.env[key] 처럼 동적으로 접근하면 치환되지 않는다)
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 환경변수가 없으면 Supabase 없이 localStorage 만으로 동작한다 */
export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // 로그인 기능이 없으므로 세션을 저장하거나 갱신할 필요가 없다
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
