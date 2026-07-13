"use server";

import { createClient } from "@/api-client/supabase/server";

export interface IndicatorBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  bollinger_lower: number | null;
  bollinger_middle: number | null;
  bollinger_upper: number | null;
  rsi: number | null;
  market_context_close: number | null;
}

export interface SymbolDetail {
  symbol: string;
  displayName: string;
  capturedAt: string | null;
  score: number;
  trendGatePassed: boolean;
  pullbackSignal: boolean;
  marketRegimeSignal: boolean;
  closePrice: number | null;
  rsi: number | null;
  bollingerLower: number | null;
  marketContextClose: number | null;
  marketContextMovingAverage: number | null;
  bars: IndicatorBar[];
}

export type SymbolDetailResult =
  | { success: true; data: SymbolDetail }
  | { success: false; error: string };

export async function getSymbolDetail(symbol: string): Promise<SymbolDetailResult> {
  const supabase = await createClient();

  const { data: curated, error: curatedError } = await supabase
    .from("curated_symbols")
    .select("symbol, display_name")
    .eq("symbol", symbol)
    .eq("is_active", true)
    .maybeSingle();
  if (curatedError) {
    return { success: false, error: curatedError.message };
  }
  if (!curated) {
    return { success: false, error: "종목을 찾을 수 없습니다." };
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("signal_snapshots")
    .select("*")
    .eq("symbol", symbol)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError) {
    return { success: false, error: snapshotError.message };
  }

  return {
    success: true,
    data: {
      symbol: curated.symbol,
      displayName: curated.display_name,
      capturedAt: snapshot?.captured_at ?? null,
      score: snapshot?.score ?? 0,
      trendGatePassed: snapshot?.trend_gate_passed ?? false,
      pullbackSignal: snapshot?.pullback_signal ?? false,
      marketRegimeSignal: snapshot?.market_regime_signal ?? false,
      closePrice: snapshot?.close_price ?? null,
      rsi: snapshot?.relative_strength_index_14 ?? null,
      bollingerLower: snapshot?.bollinger_lower ?? null,
      marketContextClose: snapshot?.market_context_close ?? null,
      marketContextMovingAverage: snapshot?.market_context_moving_average_20 ?? null,
      bars: (snapshot?.indicator_series as unknown as IndicatorBar[]) ?? [],
    },
  };
}
