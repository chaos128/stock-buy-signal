import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { WatchlistItem } from "../_actions/watchlist-actions";
import { SubscribeToggle } from "./subscribe-toggle";

export function Watchlist({
  items,
  isAuthenticated,
}: {
  items: WatchlistItem[];
  isAuthenticated: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
        구독 가능한 종목이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.symbol}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">
              <Link href={`/symbol/${item.symbol}`} className="hover:text-primary hover:underline">
                {item.symbol}
              </Link>{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {item.displayName}
              </span>
            </CardTitle>
            {item.score !== null && (
              <span className="text-sm font-semibold text-primary">score {item.score}</span>
            )}
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {item.closePrice !== null
                ? `종가 ${item.closePrice.toFixed(2)} · ${
                    item.capturedAt ? new Date(item.capturedAt).toLocaleDateString() : "-"
                  }`
                : "데이터 없음"}
            </span>
            <SubscribeToggle
              symbol={item.symbol}
              isSubscribed={item.isSubscribed}
              isAuthenticated={isAuthenticated}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
