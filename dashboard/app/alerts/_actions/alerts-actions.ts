"use server";

import { createClient, getCurrentUser } from "@/api-client/supabase/server";

export interface AlertRow {
  id: string;
  triggeredAt: string;
  symbol: string;
  score: number;
  closePrice: number | null;
  stopPrice: number | null;
  targetPrimary: number | null;
  riskRewardRatio: number | null;
  riskRewardSufficient: boolean | null;
  pullback: boolean;
  marketRegime: boolean;
  trendGatePassed: boolean;
}

export type AlertsResult =
  | { authenticated: false }
  | { authenticated: true; success: true; data: AlertRow[] }
  | { authenticated: true; success: false; error: string };

export async function getAlerts(): Promise<AlertsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { authenticated: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(100);
  if (error) {
    return { authenticated: true, success: false, error: error.message };
  }

  const rows: AlertRow[] = (data ?? []).map((alert) => {
    const signals = (alert.active_signals ?? {}) as {
      pullback_signal?: boolean;
      market_regime_signal?: boolean;
      trend_gate_passed?: boolean;
    };
    return {
      id: alert.id,
      triggeredAt: alert.triggered_at,
      symbol: alert.symbol,
      score: alert.score,
      closePrice: alert.close_price,
      stopPrice: alert.stop_price,
      targetPrimary: alert.target_primary,
      riskRewardRatio: alert.risk_reward_ratio,
      riskRewardSufficient: alert.risk_reward_sufficient,
      pullback: Boolean(signals.pullback_signal),
      marketRegime: Boolean(signals.market_regime_signal),
      trendGatePassed: Boolean(signals.trend_gate_passed),
    };
  });

  return { authenticated: true, success: true, data: rows };
}
