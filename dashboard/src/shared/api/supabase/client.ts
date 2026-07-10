import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/shared/api/database.types";

// 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트. publishable key + 유저 JWT + RLS.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
