"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi } from "lightweight-charts";

type Range = "1D" | "1W" | "1M" | "1Y";
const RANGES: Range[] = ["1D", "1W", "1M", "1Y"];

interface Candle { time: number; open: number; high: number; low: number; close: number }

export function CandleChart({
  symbol,
  assetClass,
}: {
  symbol: string;
  assetClass: string;
}) {
  const [range, setRange] = useState<Range>("1M");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Create chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9aa4b2", fontFamily: "inherit" },
      grid: { vertLines: { color: "#1c2027" }, horzLines: { color: "#1c2027" } },
      rightPriceScale: { borderColor: "#262b34" },
      timeScale: { borderColor: "#262b34", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#3ddc97",
      downColor: "#ff5c5c",
      borderUpColor: "#3ddc97",
      borderDownColor: "#ff5c5c",
      wickUpColor: "#3ddc97",
      wickDownColor: "#ff5c5c",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load data on symbol/range change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEmpty(false);
    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&assetClass=${assetClass}&range=${range}`)
      .then((r) => r.json())
      .then((data: { candles?: Candle[] }) => {
        if (cancelled) return;
        const candles = data.candles ?? [];
        if (candles.length === 0) {
          setEmpty(true);
        } else {
          seriesRef.current?.setData(candles as never);
          chartRef.current?.timeScale().fitContent();
        }
      })
      .catch(() => !cancelled && setEmpty(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [symbol, assetClass, range]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`focusring rounded-lg px-2.5 py-1 text-xs transition ${
              range === r ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-hover"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-72 w-full" />
        {(loading || empty) && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-faint">
            {loading ? "Loading chart…" : "No chart data for this symbol."}
          </div>
        )}
      </div>
    </div>
  );
}
