import {
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CandleBar } from "../upstox/types";

type ChartProps = {
  candles?: CandleBar[];
  height?: number;
};

function parseOffsetMinutes(iso: string): number {
  const match = iso.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!match) return 0;

  const [, sign, hours, minutes] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? -totalMinutes : totalMinutes;
}

function isoToUtcSeconds(iso: string): UTCTimestamp {
  const baseUtcMs = new Date(iso).getTime();
  const offsetMs = parseOffsetMinutes(iso) * 60 * 1000;
  return Math.floor((baseUtcMs + offsetMs) / 1000) as UTCTimestamp;
}

function toCandlestickData(candles: CandleBar[] = []): CandlestickData[] {
  return candles
    .filter((candle): candle is CandleBar & { timestamp: string } =>
      Boolean(candle && candle.timestamp)
    )
    .map((candle) => ({
      time: isoToUtcSeconds(candle.timestamp),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }))
    .sort((a, b) => Number(a.time) - Number(b.time));
}

export default function Chart({ candles = [], height = 520 }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [hoverCandle, setHoverCandle] = useState<CandleBar | null>(null);

  const data = useMemo(() => toCandlestickData(candles), [candles]);
  const candleByTime = useMemo(() => {
    const map = new Map<UTCTimestamp, CandleBar>();
    candles
      .filter((candle): candle is CandleBar & { timestamp: string } =>
        Boolean(candle && candle.timestamp)
      )
      .forEach((candle) => {
        map.set(isoToUtcSeconds(candle.timestamp), candle);
      });
    return map;
  }, [candles]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Dark theme palette (tweak if your UI uses different shades)
    const bg = "#121a24"; // matches .card background
    const text = "#e7edf5"; // matches body text color
    const grid = "rgba(255,255,255,0.08)"; // matches hr / table borders

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        textColor: text,
        background: { type: ColorType.Solid, color: bg },
      },
      grid: {
        vertLines: { color: grid, style: 0, visible: true },
        horzLines: { color: grid, style: 0, visible: true },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(229,231,235,0.25)", width: 1 },
        horzLine: { color: "rgba(229,231,235,0.25)", width: 1 },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    let cleanup: (() => void) | null = null;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        const node = containerRef.current;
        if (!node) return;
        chart.applyOptions({ width: node.clientWidth, height });
      });
      ro.observe(el);
      cleanup = () => ro.disconnect();
    } else {
      const onResize = () => {
        const node = containerRef.current;
        if (!node) return;
        chart.applyOptions({ width: node.clientWidth, height });
      };
      window.addEventListener("resize", onResize);
      cleanup = () => window.removeEventListener("resize", onResize);
    }

    return () => {
      cleanup?.();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    series.setData(data);
    if (data.length) chart.timeScale().fitContent();
  }, [data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleCrosshairMove = (param: any) => {
      const t = param?.time as UTCTimestamp | undefined;
      if (!t) {
        setHoverCandle(null);
        return;
      }

      const candle = candleByTime.get(t) ?? null;
      setHoverCandle(candle);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    return () => chart.unsubscribeCrosshairMove(handleCrosshairMove);
  }, [candleByTime]);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height,
          borderRadius: 12,
          overflow: "hidden",
        }}
      />
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          className="secondary"
          onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
          disabled={!candles.length}
        >
          Go to Real-Time
        </button>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            minWidth: 260,
          }}
        >
          {hoverCandle ? (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px" }}>
              <span className="muted">Time</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {hoverCandle.timestamp}
              </span>
              <span className="muted">Open</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{hoverCandle.open}</span>
              <span className="muted">High</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{hoverCandle.high}</span>
              <span className="muted">Low</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{hoverCandle.low}</span>
              <span className="muted">Close</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{hoverCandle.close}</span>
              <span className="muted">Volume</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{hoverCandle.volume}</span>
            </div>
          ) : (
            <span className="muted">Hover a candle to see OHLCV</span>
          )}
        </div>
      </div>
    </div>
  );
}
