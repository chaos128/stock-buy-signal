"use server";

import { unstable_cache } from "next/cache";

import { createClient, createPublicClient, getCurrentUser } from "@/api-client/supabase/server";

export interface WatchlistItem {
  symbol: string;
  displayName: string;
  score: number | null;
  closePrice: number | null;
  capturedAt: string | null;
  isSubscribed: boolean;
}

export type WatchlistResult =
  | { success: true; data: WatchlistItem[] }
  | { success: false; error: string };

type PublicWatchlistItem = Omit<WatchlistItem, "isSubscribed">;

// 공개 부분(종목 + 종목별 최신 스냅샷)은 모두 동일 + 하루 1회 갱신 → 캐시.
// 쿠키 없는 anon 클라이언트라 unstable_cache 안에서 사용 가능.
const getPublicWatchlist = unstable_cache(
  async (): Promise<PublicWatchlistItem[]> => {
    const supabase = createPublicClient();

    const { data: symbols, error: symbolsError } = await supabase
      .from("curated_symbols")
      .select("symbol, display_name")
      .eq("is_active", true);
    if (symbolsError) {
      throw new Error(symbolsError.message);
    }

    const { data: snapshots, error: snapshotsError } = await supabase
      .from("signal_snapshots")
      .select("symbol, close_price, score, captured_at")
      .order("captured_at", { ascending: false });
    if (snapshotsError) {
      throw new Error(snapshotsError.message);
    }

    const latestBySymbol = new Map<string, NonNullable<typeof snapshots>[number]>();
    for (const snapshot of snapshots ?? []) {
      if (!latestBySymbol.has(snapshot.symbol)) {
        latestBySymbol.set(snapshot.symbol, snapshot);
      }
    }

    return (symbols ?? []).map((symbol) => {
      const latest = latestBySymbol.get(symbol.symbol);
      return {
        symbol: symbol.symbol,
        displayName: symbol.display_name,
        score: latest?.score ?? null,
        closePrice: latest?.close_price ?? null,
        capturedAt: latest?.captured_at ?? null,
      };
    });
  },
  ["watchlist-public"],
  { revalidate: 3600, tags: ["watchlist-public"] },
);

// 공개 데이터(캐시) + 현재 유저 구독(라이브, RLS)을 합쳐 반환.
export async function getWatchlist(): Promise<WatchlistResult> {
  try {
    const publicItems = await getPublicWatchlist();

    // 비로그인이면 구독이 없으므로 DB 왕복 생략(공개 방문자 최적화).
    // getCurrentUser 는 React cache 라 페이지가 이미 부른 호출과 dedupe 됨.
    const user = await getCurrentUser();
    if (!user) {
      return { success: true, data: publicItems.map((item) => ({ ...item, isSubscribed: false })) };
    }

    // 로그인 유저의 활성 구독 (RLS 로 본인 것만)
    const supabase = await createClient();
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("symbol")
      .eq("is_active", true);
    if (subscriptionsError) {
      return { success: false, error: subscriptionsError.message };
    }
    const subscribedSymbols = new Set((subscriptions ?? []).map((row) => row.symbol));

    return {
      success: true,
      data: publicItems.map((item) => ({
        ...item,
        isSubscribed: subscribedSymbols.has(item.symbol),
      })),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "watchlist load failed" };
  }
}
