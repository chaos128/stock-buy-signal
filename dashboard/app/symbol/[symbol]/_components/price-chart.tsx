"use client";

import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { IndicatorBar } from "../_actions/symbol-actions";

// 캔들+BB(메인, 신호일 마커) / RSI / VIX 3단 차트. lightweight-charts v5.
export function PriceChart({ bars }: { bars: IndicatorBar[] }) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const vixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priceRef.current || !rsiRef.current || !vixRef.current) {
      return;
    }

    const baseOptions = {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8a8a8a",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.12)" },
      timeScale: { borderColor: "rgba(255,255,255,0.12)" },
      autoSize: true,
    };
    const line = (bar: IndicatorBar, value: number | null) => ({ time: bar.date as Time, value: value as number });
    const bandOptions = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false };

    // --- 메인: 캔들 + BB + 신호일 마커 ---
    const priceChart = createChart(priceRef.current, baseOptions);
    const candles = priceChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candles.setData(
      bars
        .filter((bar) => bar.open != null)
        .map((bar) => ({
          time: bar.date as Time,
          open: bar.open as number,
          high: bar.high as number,
          low: bar.low as number,
          close: bar.close as number,
        })),
    );
    const upper = priceChart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.45)" });
    upper.setData(bars.filter((b) => b.bollinger_upper != null).map((b) => line(b, b.bollinger_upper)));
    const middle = priceChart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.9)", lineStyle: LineStyle.Dashed });
    middle.setData(bars.filter((b) => b.bollinger_middle != null).map((b) => line(b, b.bollinger_middle)));
    const lower = priceChart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.45)" });
    lower.setData(bars.filter((b) => b.bollinger_lower != null).map((b) => line(b, b.bollinger_lower)));

    // 2단 마커 (시간순): ▲파랑=신호(게이트↑ & score>=2, 발송) / ●주황=과매도 딥(게이트↓, 고위험·미발송)
    const markers: SeriesMarker<Time>[] = [];
    for (const bar of bars) {
      if (bar.score < 2) {
        continue;
      }
      if (bar.trend_gate_passed) {
        markers.push({ time: bar.date as Time, position: "belowBar", color: "#0ea5e9", shape: "arrowUp" });
      } else {
        markers.push({ time: bar.date as Time, position: "aboveBar", color: "#f59e0b", shape: "circle" });
      }
    }
    createSeriesMarkers(candles, markers);
    priceChart.timeScale().fitContent();

    // --- RSI (+40 기준선) ---
    const rsiChart = createChart(rsiRef.current, baseOptions);
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: "#eab308", lineWidth: 1, priceLineVisible: false });
    rsiSeries.setData(bars.filter((b) => b.rsi != null).map((b) => line(b, b.rsi)));
    rsiSeries.createPriceLine({ price: 40, color: "rgba(239,68,68,0.6)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "40" });
    rsiChart.timeScale().fitContent();

    // --- VIX (종가 + 20일선) ---
    const vixChart = createChart(vixRef.current, baseOptions);
    const vixSeries = vixChart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, priceLineVisible: false });
    vixSeries.setData(bars.filter((b) => b.market_context_close != null).map((b) => line(b, b.market_context_close)));
    const vixMa = vixChart.addSeries(LineSeries, { color: "rgba(249,115,22,0.5)", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    vixMa.setData(bars.filter((b) => b.market_context_ma != null).map((b) => line(b, b.market_context_ma)));
    vixChart.timeScale().fitContent();

    return () => {
      priceChart.remove();
      rsiChart.remove();
      vixChart.remove();
    };
  }, [bars]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        캔들 + 볼린저밴드(파란선) · <span className="text-primary">▲ 신호</span>(추세↑ + score≥2, 발송) ·{" "}
        <span className="text-amber-500">● 과매도 딥</span>(추세↓, 고위험·미발송)
      </div>
      <div ref={priceRef} className="h-[360px] w-full" />
      <div className="text-xs text-muted-foreground">RSI(14) · 40 기준선</div>
      <div ref={rsiRef} className="h-[120px] w-full" />
      <div className="text-xs text-muted-foreground">VIX · 20일선(점선)</div>
      <div ref={vixRef} className="h-[120px] w-full" />
    </div>
  );
}
