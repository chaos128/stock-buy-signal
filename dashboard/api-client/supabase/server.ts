import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import type { Database } from "@/api-client/supabase/database.types";

// 쿠키/세션 없는 공개 읽기용 클라이언트(anon RLS). cookies() 를 호출하지 않으므로
// unstable_cache 안에서 사용 가능 → 공개 데이터 fetch 를 캐시할 수 있다.
export function createPublicClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}

// 서버(서버 컴포넌트/route handler/미들웨어)용 Supabase 클라이언트. 쿠키로 세션 유지.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 set 이 막힘 — 미들웨어가 세션을 갱신하므로 무시.
          }
        },
      },
    },
  );
}

// 표시/게이트용 현재 유저 — getSession(쿠키 로컬 읽기, 네트워크 왕복 없음)을 React cache 로.
// authoritative 검증은 미들웨어의 getUser(매 요청 세션 검증·갱신) + DB RLS(JWT 서명 검증)가 담당.
// 이 함수는 navbar 표시 / "로그인 여부" 게이트 같은 비보안 용도 전용이라 getSession 으로 충분.
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});
