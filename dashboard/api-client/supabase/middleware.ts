import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/api-client/supabase/database.types";

// 요청마다 세션 갱신. 미들웨어는 request/response 쿠키를 직접 다뤄야 해서
// server.ts(next/headers cookies) 와 별도 구현.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() 호출로 만료 토큰 갱신(중요: getSession 아님). 리다이렉트는 하지 않음 —
  // 로그인 없이도 조회 가능(공개). 구독/알림 등은 각 액션/페이지에서 인증 확인.
  await supabase.auth.getUser();

  return response;
}
