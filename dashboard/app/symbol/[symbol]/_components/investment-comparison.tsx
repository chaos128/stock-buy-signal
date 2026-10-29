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
  // 납입 일정은 전략과 무관해 모두 같다
  const contributed = results[0]?.contributed ?? 0;
  const bestReturn = Math.max(...results.map((result) => result.returnPercent), Number.NEGATIVE_INFINITY);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">전략별 수익 비교</h3>
          <p className="text-xs text-muted-foreground">
            선택 기간({activeRange}) 매월 첫 거래일 납입 · 총 {won(contributed)}원 · 매수일에 모인 현금 전액 투자, 현재가로 평가
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">월 투자금</span>
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
            <TableHead className="text-right">현금 비중</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const empty = result.contributed === 0;
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
                <TableCell className="text-right text-muted-foreground">
                  {empty ? "-" : `${Math.round((result.cash / result.finalValue) * 100)}%`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        ※ QQQ(USD) 자산수익률 기준 · 환율 변동 미반영 · 신호 다음 거래일 시가 매수 · 대기 현금 연 3% 복리, 기말 현금은 평가금액에 포함
      </p>
    </div>
  );
}
