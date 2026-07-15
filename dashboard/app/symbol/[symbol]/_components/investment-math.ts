import type { IndicatorBar } from "../_actions/symbol-actions";

export interface StrategyResult {
  key: string;
  label: string;
  buyCount: number;
  finalValue: number;
  profit: number;
  returnPercent: number;
}

const WEEK_DAYS = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

// 일주일 내 중복 신호는 1회만 — 가장 이른 것 유지, 이후 7일 쿨다운.
function dedupeWeekly(sorted: IndicatorBar[]): IndicatorBar[] {
  const kept: IndicatorBar[] = [];
  let lastKeptMs = Number.NEGATIVE_INFINITY;
  for (const bar of sorted) {
    const barMs = Date.parse(bar.date);
    if ((barMs - lastKeptMs) / MILLISECONDS_PER_DAY >= WEEK_DAYS) {
      kept.push(bar);
      lastKeptMs = barMs;
    }
  }
  return kept;
}

// 총액을 매수일마다 1/n 균등 투자(종가 매수) → 마지막 봉 종가로 평가.
function evaluate(
  key: string,
  label: string,
  buys: IndicatorBar[],
  finalClose: number,
  amount: number,
): StrategyResult {
  const usable = buys.filter((bar) => bar.close != null && (bar.close as number) > 0);
  const buyCount = usable.length;
  if (buyCount === 0 || amount <= 0) {
    return { key, label, buyCount, finalValue: 0, profit: 0, returnPercent: 0 };
  }
  const perBuy = amount / buyCount;
  const shares = usable.reduce((sum, bar) => sum + perBuy / (bar.close as number), 0);
  const finalValue = shares * finalClose;
  return { key, label, buyCount, finalValue, profit: finalValue - amount, returnPercent: (finalValue / amount - 1) * 100 };
}

// fromDate ~ 마지막 봉 구간에서 4개 전략 수익 비교. 신호일 = 차트 마커와 동일(score>=2, 게이트로 파랑/주황 구분).
export function computeComparison(bars: IndicatorBar[], fromDate: string, amount: number): StrategyResult[] {
  const lastBar = bars[bars.length - 1];
  const finalClose = lastBar?.close;
  const period = bars.filter((bar) => bar.date >= fromDate);
  if (finalClose == null || period.length === 0) {
    return [];
  }

  const scored = period.filter((bar) => bar.score >= 2);
  const blue = dedupeWeekly(scored.filter((bar) => bar.trend_gate_passed));
  const orange = dedupeWeekly(scored.filter((bar) => !bar.trend_gate_passed));
  const both = dedupeWeekly(scored);

  const seenMonth = new Set<string>();
  const monthly: IndicatorBar[] = [];
  for (const bar of period) {
    const yearMonth = bar.date.slice(0, 7);
    if (!seenMonth.has(yearMonth)) {
      seenMonth.add(yearMonth);
      monthly.push(bar);
    }
  }

  return [
    evaluate("orange", "주황만 (과매도 딥)", orange, finalClose, amount),
    evaluate("blue", "파랑만 (추세 신호)", blue, finalClose, amount),
    evaluate("both", "파랑+주황", both, finalClose, amount),
    evaluate("monthly", "매월 1일 (적립식)", monthly, finalClose, amount),
  ];
}
