"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { IndicatorBar } from "../_actions/symbol-actions";
import { type RangeKey, rangeStartDate } from "./chart-range";
import { computeComparison } from "./investment-math";

const won = (value: number) => Math.round(value).toLocaleString();
const signedWon = (value: number) => `${value >= 0 ? "+" : "-"}${Math.round(Math.abs(value)).toLocaleString()}`;

export function InvestmentComparison({
  bars,
  activeRange,
  amount,
  onAmountChange,
}: {
  bars: IndicatorBar[];
  activeRange: RangeKey;
  amount: number;
  onAmountChange: (value: number) => void;
}) {
  const fromDate = rangeStartDate(bars, activeRange);
  const results = useMemo(() => computeComparison(bars, fromDate, amount), [bars, fromDate, amount]);
  const bestReturn = Math.max(
    ...results.filter((result) => result.buyCount > 0).map((result) => result.returnPercent),
    Number.NEGATIVE_INFINITY,
  );

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">전략별 수익 비교</h3>
          <p className="text-xs text-muted-foreground">
            선택 기간({activeRange}) 동안 신호일마다 총액을 1/n 균등 투자, 현재가로 평가
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">총 투자금</span>
          <Input
            type="text"
            inputMode="numeric"
            value={amount.toLocaleString()}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^\d]/g, "");
              onAmountChange(digits ? Number(digits) : 0);
            }}
            className="w-40 text-right"
          />
          <span className="text-muted-foreground">원</span>
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>전략</TableHead>
            <TableHead className="text-right">매수 횟수</TableHead>
            <TableHead className="text-right">평가금액</TableHead>
            <TableHead className="text-right">수익금</TableHead>
            <TableHead className="text-right">수익률</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const empty = result.buyCount === 0;
            const isBest = !empty && result.returnPercent === bestReturn;
            const positive = result.profit >= 0;
            return (
              <TableRow key={result.key} className={cn(isBest && "bg-muted/50")}>
                <TableCell className="font-medium">
                  {result.label}
                  {isBest && <span className="ml-1 text-xs text-primary">최고</span>}
                </TableCell>
                <TableCell className="text-right">{empty ? "-" : `${result.buyCount}회`}</TableCell>
                <TableCell className="text-right">{empty ? "-" : won(result.finalValue)}</TableCell>
                <TableCell className={cn("text-right", !empty && (positive ? "text-green-500" : "text-destructive"))}>
                  {empty ? "-" : signedWon(result.profit)}
                </TableCell>
                <TableCell className={cn("text-right font-medium", !empty && (positive ? "text-green-500" : "text-destructive"))}>
                  {empty ? "-" : `${result.returnPercent >= 0 ? "+" : ""}${result.returnPercent.toFixed(1)}%`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        ※ QQQ(USD) 자산수익률 기준 · 환율 변동 미반영 · 일주일 내 중복 신호는 1회로 집계
      </p>
    </div>
  );
}
