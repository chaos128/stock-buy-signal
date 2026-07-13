"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { subscribe, unsubscribe } from "../_actions/subscription-actions";

export function SubscribeToggle({
  symbol,
  isSubscribed,
}: {
  symbol: string;
  isSubscribed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = isSubscribed ? await unsubscribe(symbol) : await subscribe(symbol);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant={isSubscribed ? "secondary" : "default"}
      size="sm"
      disabled={pending}
      onClick={toggle}
    >
      {pending ? "..." : isSubscribed ? "구독중" : "구독"}
    </Button>
  );
}
