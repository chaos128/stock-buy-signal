import { createClient } from "@/api-client/supabase/server";

import { getWatchlist } from "./_actions/watchlist-actions";
import { Watchlist } from "./_components/watchlist";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await getWatchlist();

  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">매수 신호</h1>
        <p className="mt-1 text-sm text-muted-foreground">구독 종목의 최신 신호 상태</p>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        {result.success ? (
          <Watchlist items={result.data} isAuthenticated={!!user} />
        ) : (
          <div className="rounded-md border border-border p-8 text-center text-destructive">
            불러오기 실패: {result.error}
          </div>
        )}
      </main>
    </>
  );
}
