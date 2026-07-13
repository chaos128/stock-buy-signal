"use client";

import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  LineStyle,
  createChart,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { IndicatorBar } from "../_actions/symbol-actions";

// 캔들 + 볼린저밴드(메인) / RSI(하단) 차트. lightweight-charts v5.
export function PriceChart({ bars }: { bars: IndicatorBar[] }) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priceRef.current || !rsiRef.current) {
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

    // --- 메인: 캔들 + BB ---
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

    const bandOptions = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false };
    const upper = priceChart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.45)" });
    upper.setData(bars.filter((b) => b.bollinger_upper != null).map((b) => line(b, b.bollinger_upper)));
    const middle = priceChart.addSeries(LineSeries, {
      ...bandOptions,
      color: "rgba(56,189,248,0.9)",
      lineStyle: LineStyle.Dashed,
    });
    middle.setData(bars.filter((b) => b.bollinger_middle != null).map((b) => line(b, b.bollinger_middle)));
    const lower = priceChart.addSeries(LineSeries, { ...bandOptions, color: "rgba(56,189,248,0.45)" });
    lower.setData(bars.filter((b) => b.bollinger_lower != null).map((b) => line(b, b.bollinger_lower)));
    priceChart.timeScale().fitContent();

    // --- 하단: RSI (+40 기준선) ---
    const rsiChart = createChart(rsiRef.current, baseOptions);
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: "#eab308", lineWidth: 1, priceLineVisible: false });
    rsiSeries.setData(bars.filter((b) => b.rsi != null).map((b) => line(b, b.rsi)));
    rsiSeries.createPriceLine({
      price: 40,
      color: "rgba(239,68,68,0.6)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "40",
    });
    rsiChart.timeScale().fitContent();

    return () => {
      priceChart.remove();
      rsiChart.remove();
    };
  }, [bars]);

  return (
    <div className="space-y-2">
      <div ref={priceRef} className="h-[360px] w-full" />
      <div className="text-xs text-muted-foreground">RSI(14)</div>
      <div ref={rsiRef} className="h-[120px] w-full" />
    </div>
  );
}
