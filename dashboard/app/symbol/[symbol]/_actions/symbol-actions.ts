"use server";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/api-client/supabase/server";

export interface IndicatorBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  simple_moving_average_200: number | null;
  bollinger_lower: number | null;
  bollinger_middle: number | null;
  bollinger_upper: number | null;
  rsi: number | null;
  market_context_close: number | null;
  market_context_ma: number | null;
  trend_gate_passed: boolean;
  score: number;
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

// payload 축소: 소수 2자리 반올림(null 보존).
function round2(value: unknown): number | null {
  return value == null ? null : Math.round(Number(value) * 100) / 100;
}

// 차트/표에서 실제로 쓰는 필드만 + 반올림해서 봉 배열 생성(665KB→절반 수준).
function trimBars(series: unknown): IndicatorBar[] {
  const raw = (series as Record<string, unknown>[] | null) ?? [];
  return raw.map((bar) => ({
    date: bar.date as string,
    open: round2(bar.open),
    high: round2(bar.high),
    low: round2(bar.low),
    close: round2(bar.close),
    simple_moving_average_200: round2(bar.simple_moving_average_200),
    bollinger_lower: round2(bar.bollinger_lower),
    bollinger_middle: round2(bar.bollinger_middle),
    bollinger_upper: round2(bar.bollinger_upper),
    rsi: round2(bar.rsi),
    market_context_close: round2(bar.market_context_close),
    market_context_ma: round2(bar.market_context_ma),
    trend_gate_passed: Boolean(bar.trend_gate_passed),
    score: Number(bar.score ?? 0),
  }));
}

// 공개 데이터 fetch(쿠키 없는 클라이언트) — unstable_cache 로 감싸 캐시 가능.
async function fetchSymbolDetail(symbol: string): Promise<SymbolDetailResult> {
  const supabase = createPublicClient();

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
      bars: trimBars(snapshot?.indicator_series),
    },
  };
}

// 하루 1회(워커)만 갱신되는 공개 데이터 → 1시간 캐시. tag 로 on-demand revalidate 확장 가능.
export async function getSymbolDetail(symbol: string): Promise<SymbolDetailResult> {
  return unstable_cache(() => fetchSymbolDetail(symbol), ["symbol-detail", symbol], {
    revalidate: 3600,
    tags: [`symbol-detail:${symbol}`],
  })();
}
