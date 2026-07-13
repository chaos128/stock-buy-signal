"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { subscribe, unsubscribe } from "../_actions/subscription-actions";

export function SubscribeToggle({
  symbol,
  isSubscribed,
  isAuthenticated,
}: {
  symbol: string;
  isSubscribed: boolean;
  isAuthenticated: boolean;
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

  // 비로그인 → 구독하려면 로그인으로 유도
  if (!isAuthenticated) {
    return (
      <Link href="/login" className={buttonVariants({ variant: "default", size: "sm" })}>
        구독
      </Link>
    );
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
