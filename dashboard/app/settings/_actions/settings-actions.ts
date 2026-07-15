"use server";

import { revalidatePath } from "next/cache";

import { createClient, getSessionUser } from "@/api-client/supabase/server";

export interface SubscriptionSetting {
  id: string;
  symbol: string;
  scoreThreshold: number;
  throttleDays: number;
}

export type SettingsResult =
  | { authenticated: false }
  | { authenticated: true; success: true; data: SubscriptionSetting[] }
  | { authenticated: true; success: false; error: string };

export async function getSubscriptionSettings(): Promise<SettingsResult> {
  const user = await getSessionUser();
  if (!user) {
    return { authenticated: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, symbol, score_threshold, throttle_days")
    .eq("is_active", true)
    .order("symbol");
  if (error) {
    return { authenticated: true, success: false, error: error.message };
  }

  return {
    authenticated: true,
    success: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      scoreThreshold: row.score_threshold,
      throttleDays: row.throttle_days,
    })),
  };
}

export type UpdateResult = { success: true } | { success: false; error: string };

export async function updateSubscriptionSettings(
  id: string,
  scoreThreshold: number,
  throttleDays: number,
): Promise<UpdateResult> {
  const supabase = await createClient();
  // 서버측 클램프 (v1: score 최대 2, 스로틀 1~60일)
  const threshold = Math.min(3, Math.max(1, Math.round(scoreThreshold)));
  const throttle = Math.min(60, Math.max(1, Math.round(throttleDays)));

  // RLS: 본인 소유 구독만 update 가능
  const { error } = await supabase
    .from("subscriptions")
    .update({ score_threshold: threshold, throttle_days: throttle })
    .eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
