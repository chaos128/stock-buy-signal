"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/api-client/supabase/server";

export type SubscriptionActionResult = { success: true } | { success: false; error: string };

// 구독(활성화). (user_id, symbol) 유니크라 재구독 시 upsert 로 is_active 복원.
export async function subscribe(symbol: string): Promise<SubscriptionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "not authenticated" };
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      { user_id: user.id, symbol, is_active: true },
      { onConflict: "user_id,symbol" },
    );
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// 해지(비활성화). 이력/스로틀 상태 보존을 위해 삭제 대신 is_active=false.
export async function unsubscribe(symbol: string): Promise<SubscriptionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "not authenticated" };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("symbol", symbol);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
