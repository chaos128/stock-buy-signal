import type { IndicatorBar } from "../_actions/symbol-actions";

export interface StrategyResult {
  key: string;
  label: string;
  buyCount: number;
  contributed: number;
  finalValue: number;
  cash: number;
  profit: number;
  returnPercent: number;
}

// 매수 전 대기 현금에 붙이는 연 수익률(MMF 등) — 0% 로 두면 현금을 오래 들고 있는 신호 전략이 불리해진다.
const CASH_ANNUAL_RATE = 0.03;
const MILLISECONDS_PER_DAY = 86_400_000;

// 매월 첫 거래일에 월 투자금을 납입하고, 매수일엔 그때까지 모인 현금을 전액 시가 매수 → 마지막 봉 종가로 평가.
// 각 시점에 그때까지 모인 돈만 쓴다. 총액을 신호 횟수로 나누면 기간이 끝나야 아는 횟수에 기대는 결과론이 된다.
// 기말까지 못 쓴 현금도 평가금액에 포함 — 빼면 "신호를 기다리며 돈이 논 비용"이 사라진다.
function simulate(
  key: string,
  label: string,
  period: IndicatorBar[],
  isContributionDay: (index: number) => boolean,
  isBuyDay: (index: number) => boolean,
  monthlyAmount: number,
): StrategyResult {
  let cash = 0;
  let shares = 0;
  let contributed = 0;
  let buyCount = 0;
  period.forEach((bar, index) => {
    if (index > 0) {
      const days = (Date.parse(bar.date) - Date.parse(period[index - 1].date)) / MILLISECONDS_PER_DAY;
      cash *= (1 + CASH_ANNUAL_RATE) ** (days / 365);
    }
    if (isContributionDay(index)) {
      cash += monthlyAmount;
      contributed += monthlyAmount;
    }
    // 시가가 없는 봉은 체결 불가 — 현금으로 두고 다음 매수일에 쓴다
    if (isBuyDay(index) && cash > 0 && bar.open != null && bar.open > 0) {
      shares += cash / bar.open;
      cash = 0;
      buyCount += 1;
    }
  });
  const finalValue = shares * (period[period.length - 1].close as number) + cash;
  const returnPercent = contributed > 0 ? (finalValue / contributed - 1) * 100 : 0;
  return { key, label, buyCount, contributed, finalValue, cash, profit: finalValue - contributed, returnPercent };
}

// fromDate ~ 마지막 봉 구간에서 4개 전략 수익 비교. 신호일 = 차트 마커와 동일(score>=2, 게이트로 파랑/주황 구분).
export function computeComparison(bars: IndicatorBar[], fromDate: string, monthlyAmount: number): StrategyResult[] {
  const period = bars.filter((bar) => bar.date >= fromDate);
  if (period.length === 0 || period[period.length - 1].close == null) {
    return [];
  }

  const contributionDays = new Set<number>();
  period.forEach((bar, index) => {
    if (index === 0 || bar.date.slice(0, 7) !== period[index - 1].date.slice(0, 7)) {
      contributionDays.add(index);
    }
  });
  const isContributionDay = (index: number) => contributionDays.has(index);
  // 신호는 종가 확정 후 계산되고 알림도 장 마감 뒤에 오므로 다음 거래일 시가에 체결.
  // 마지막 봉의 신호는 아직 체결 전이라 현금으로 남는다.
  const afterSignal = (accept: (bar: IndicatorBar) => boolean) => (index: number) =>
    index > 0 && period[index - 1].score >= 2 && accept(period[index - 1]);

  return [
    simulate("orange", "주황만 (과매도 딥)", period, isContributionDay, afterSignal((bar) => !bar.trend_gate_passed), monthlyAmount),
    simulate("blue", "파랑만 (추세 신호)", period, isContributionDay, afterSignal((bar) => bar.trend_gate_passed), monthlyAmount),
    simulate("both", "파랑+주황", period, isContributionDay, afterSignal(() => true), monthlyAmount),
    simulate("monthly", "매월 1일 (적립식)", period, isContributionDay, isContributionDay, monthlyAmount),
  ];
}
