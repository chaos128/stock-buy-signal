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

// 단일 차트 + 3 pane (캔들+BB / RSI / VIX). 시간축 공유 → pan/zoom 동기화.
// hover 시 crosshair 위치의 값을 커서 옆 floating tooltip 한 곳에 모아 표시.
export function PriceChart({ bars }: { bars: IndicatorBar[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

    // --- pane 1: RSI ---
    const rsiSeries = chart.addSeries(LineSeries, { color: "#eab308", lineWidth: 1, priceLineVisible: false }, 1);
    rsiSeries.setData(bars.filter((b) => b.rsi != null).map((b) => line(b, b.rsi)));
    rsiSeries.createPriceLine({ price: 40, color: "rgba(239,68,68,0.6)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "40" });

    // --- pane 2: VIX ---
    const vixSeries = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, priceLineVisible: false }, 2);
    vixSeries.setData(bars.filter((b) => b.market_context_close != null).map((b) => line(b, b.market_context_close)));
    const vixMa = chart.addSeries(LineSeries, { ...bandOptions, color: "rgba(249,115,22,0.5)", lineStyle: LineStyle.Dashed }, 2);
    vixMa.setData(bars.filter((b) => b.market_context_ma != null).map((b) => line(b, b.market_context_ma)));

    const panes = chart.panes();
    panes[0]?.setStretchFactor(3);
    panes[1]?.setStretchFactor(1);
    panes[2]?.setStretchFactor(1);
    chart.timeScale().fitContent();

    // --- floating tooltip (crosshair hover) ---
    const barByDate = new Map(bars.map((b) => [b.date, b]));
    const fmt = (v: number | null) => (v == null ? "-" : v.toFixed(2));
    const renderTooltip = (bar: IndicatorBar) => {
      const tag =
        bar.score >= 2
          ? bar.trend_gate_passed
            ? '<div style="color:#0ea5e9">▲ 신호</div>'
            : '<div style="color:#f59e0b">● 과매도 딥</div>'
          : "";
      return (
        `<div style="color:#8a8a8a;margin-bottom:2px">${bar.date}</div>` +
        `<div>종가 <b>${fmt(bar.close)}</b></div>` +
        `<div style="color:#38bdf8">BB ${fmt(bar.bollinger_lower)} / ${fmt(bar.bollinger_middle)} / ${fmt(bar.bollinger_upper)}</div>` +
        `<div style="color:#eab308">RSI ${fmt(bar.rsi)}</div>` +
        `<div style="color:#f97316">VIX ${fmt(bar.market_context_close)}</div>` +
        tag
      );
    };

    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      const container = containerRef.current;
      if (!tooltip || !container) {
        return;
      }
      const point = param.point;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      if (!param.time || !point || point.x < 0 || point.x > containerWidth || point.y < 0 || point.y > containerHeight) {
        tooltip.classList.add("hidden");
        return;
      }
      const time = param.time as unknown;
      let key: string | null = null;
      if (typeof time === "string") {
        key = time;
      } else if (time && typeof time === "object" && "year" in time) {
        const businessDay = time as { year: number; month: number; day: number };
        key = `${businessDay.year}-${String(businessDay.month).padStart(2, "0")}-${String(businessDay.day).padStart(2, "0")}`;
      }
      const bar = key ? barByDate.get(key) : undefined;
      if (!bar) {
        tooltip.classList.add("hidden");
        return;
      }
      tooltip.classList.remove("hidden");
      tooltip.innerHTML = renderTooltip(bar);

      const margin = 12;
      let left = point.x + margin;
      if (left + tooltip.clientWidth > containerWidth) {
        left = point.x - margin - tooltip.clientWidth;
      }
      if (left < 0) {
        left = margin;
      }
      let top = point.y + margin;
      if (top + tooltip.clientHeight > containerHeight) {
        top = containerHeight - tooltip.clientHeight - margin;
      }
      if (top < 0) {
        top = margin;
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    return () => {
      chart.remove();
    };
  }, [bars]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        캔들+BB · <span className="text-primary">▲ 신호</span>(추세↑+score≥2) /{" "}
        <span className="text-amber-500">● 과매도 딥</span>(추세↓) · 중단 RSI(14, 40선) · 하단 VIX(+20일선)
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-[560px] w-full" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute left-0 top-0 z-10 hidden whitespace-nowrap rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs leading-relaxed shadow-md backdrop-blur"
        />
      </div>
    </div>
  );
}
