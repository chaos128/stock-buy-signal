"use server";

import { createClient } from "@/api-client/supabase/server";

export interface WatchlistItem {
  symbol: string;
  displayName: string;
  score: number | null;
  closePrice: number | null;
  capturedAt: string | null;
}

export type WatchlistResult =
  | { success: true; data: WatchlistItem[] }
  | { success: false; error: string };

// 유저 세션(RLS)으로 curated 종목 + 종목별 최신 스냅샷 조회.
export async function getWatchlist(): Promise<WatchlistResult> {
  const supabase = await createClient();

  const { data: symbols, error: symbolsError } = await supabase
    .from("curated_symbols")
    .select("symbol, display_name")
    .eq("is_active", true);
  if (symbolsError) {
    return { success: false, error: symbolsError.message };
  }

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("signal_snapshots")
    .select("symbol, close_price, score, captured_at")
    .order("captured_at", { ascending: false });
  if (snapshotsError) {
    return { success: false, error: snapshotsError.message };
  }

  const latestBySymbol = new Map<string, NonNullable<typeof snapshots>[number]>();
  for (const snapshot of snapshots ?? []) {
    if (!latestBySymbol.has(snapshot.symbol)) {
      latestBySymbol.set(snapshot.symbol, snapshot);
    }
  }

  const items: WatchlistItem[] = (symbols ?? []).map((symbol) => {
    const latest = latestBySymbol.get(symbol.symbol);
    return {
      symbol: symbol.symbol,
      displayName: symbol.display_name,
      score: latest?.score ?? null,
      closePrice: latest?.close_price ?? null,
      capturedAt: latest?.captured_at ?? null,
    };
  });

  return { success: true, data: items };
}
