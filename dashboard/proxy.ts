import { type NextRequest } from "next/server";

import { updateSession } from "@/api-client/supabase/middleware";

// Next 16: "middleware" 규약이 "proxy" 로 rename 됨.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // 정적 자산 제외한 모든 경로
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
