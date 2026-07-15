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

// 현재 유저 조회 — React cache 로 한 요청 내 중복 호출(레이아웃+페이지)을 1회로 dedupe.
// (auth.getUser 는 매번 Supabase auth 서버 검증 왕복이라 중복 제거 효과가 큼)
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
