import type { IndicatorBar } from "../_actions/symbol-actions";

export type RangeKey = "3M" | "YTD" | "1Y" | "3Y" | "5Y";
export const RANGE_KEYS: RangeKey[] = ["3M", "YTD", "1Y", "3Y", "5Y"];

// 마지막 봉 날짜 기준으로 선택 기간만큼 뺀 시작 날짜(YYYY-MM-DD).
export function rangeFromDate(lastDate: string, range: RangeKey): string {
  const [year, month, day] = lastDate.split("-").map(Number);
  const toIso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
  switch (range) {
    case "3M":
      return toIso(year, month - 3, day);
    case "YTD":
      return `${year}-01-01`;
    case "1Y":
      return toIso(year - 1, month, day);
    case "3Y":
      return toIso(year - 3, month, day);
    case "5Y":
      return toIso(year - 5, month, day);
  }
}

// 기간 시작 날짜(첫 봉보다 이르면 첫 봉으로 clamp). 차트 visible range + 비교표 기간에서 공유.
export function rangeStartDate(bars: IndicatorBar[], range: RangeKey): string {
  const from = rangeFromDate(bars[bars.length - 1].date, range);
  const firstDate = bars[0].date;
  return from < firstDate ? firstDate : from;
}
