import { Badge } from "@/components/ui/badge";

import type { SymbolDetail } from "../_actions/symbol-actions";

function format(value: number | null): string {
  return value == null ? "-" : value.toFixed(2);
}

function LayerRow({ label, on, detail }: { label: string; on: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      <Badge variant={on ? "default" : "outline"}>{on ? "ON" : "OFF"}</Badge>
    </div>
  );
}

export function ScoreBreakdown({ detail }: { detail: SymbolDetail }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">신호 층</h2>
        <span className="text-sm text-foreground">
          정렬 점수 <b className="text-primary">{detail.score}</b>
        </span>
      </div>
      <LayerRow
        label="층1 · 추세 게이트 (close &gt; SMA200)"
        on={detail.trendGatePassed}
        detail={`종가 ${format(detail.closePrice)}`}
      />
      <LayerRow
        label="층2 · 눌림 (BB하단 + RSI≤40)"
        on={detail.pullbackSignal}
        detail={`RSI ${format(detail.rsi)} · BB하단 ${format(detail.bollingerLower)}`}
      />
      <LayerRow
        label="층3 · VIX 레짐 (상대)"
        on={detail.marketRegimeSignal}
        detail={`VIX ${format(detail.marketContextClose)} · MA20 ${format(detail.marketContextMovingAverage)}`}
      />
    </div>
  );
}
