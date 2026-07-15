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

// 단일 차트 + 3 pane (캔들+BB / RSI / VIX). 하나의 시간축을 공유 → pan/zoom 자동 동기화.
export function PriceChart({ bars }: { bars: IndicatorBar[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
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
    });

    const line = (bar: IndicatorBar, value: number | null) => ({ time: bar.date as Time, value: value as number });
    const bandOptions = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false };

    // --- pane 0: 캔들 + BB ---
    const candles = chart.addSeries(CandlestickSeries, {
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
    const upper = chart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.45)" });
    upper.setData(bars.filter((b) => b.bollinger_upper != null).map((b) => line(b, b.bollinger_upper)));
    const middle = chart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.9)", lineStyle: LineStyle.Dashed });
    middle.setData(bars.filter((b) => b.bollinger_middle != null).map((b) => line(b, b.bollinger_middle)));
    const lower = chart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.45)" });
    lower.setData(bars.filter((b) => b.bollinger_lower != null).map((b) => line(b, b.bollinger_lower)));

    // 2단 마커: ▲파랑=신호(게이트↑ & score>=2) / ●주황=과매도 딥(게이트↓)
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

    // --- pane 1: RSI (+40 기준선) ---
    const rsiSeries = chart.addSeries(LineSeries, { color: "#eab308", lineWidth: 1, priceLineVisible: false }, 1);
    rsiSeries.setData(bars.filter((b) => b.rsi != null).map((b) => line(b, b.rsi)));
    rsiSeries.createPriceLine({ price: 40, color: "rgba(239,68,68,0.6)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "40" });

    // --- pane 2: VIX (종가 + 20일선) ---
    const vixSeries = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, priceLineVisible: false }, 2);
    vixSeries.setData(bars.filter((b) => b.market_context_close != null).map((b) => line(b, b.market_context_close)));
    const vixMa = chart.addSeries(LineSeries, { ...bandOptions, color: "rgba(249,115,22,0.5)", lineStyle: LineStyle.Dashed }, 2);
    vixMa.setData(bars.filter((b) => b.market_context_ma != null).map((b) => line(b, b.market_context_ma)));

    // pane 높이 비율: 가격 3 : RSI 1 : VIX 1
    const panes = chart.panes();
    panes[0]?.setStretchFactor(3);
    panes[1]?.setStretchFactor(1);
    panes[2]?.setStretchFactor(1);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [bars]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        캔들+볼린저밴드 · <span className="text-primary">▲ 신호</span>(추세↑+score≥2) /{" "}
        <span className="text-amber-500">● 과매도 딥</span>(추세↓) · 중단 RSI(14, 40선) · 하단 VIX(+20일선)
      </div>
      <div ref={containerRef} className="h-[560px] w-full" />
    </div>
  );
}
