import React, { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { useChartState, useDrawingsList } from "./context/chartStore";
import { drawingRegistry } from "./drawingRegistry";

export function TradingChart() {
  const { candles } = useChartState();
  const drawings = useDrawingsList();

  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi | null>(null);

  // primitives currently attached
  const primitiveByIdRef = useRef<Map<string, any>>(new Map());

  // create chart once
  useEffect(() => {
    if (!elRef.current) return;

    const chart = createChart(elRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0f14" },
        textColor: "#e7edf5",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.18)" },
        horzLine: { color: "rgba(255,255,255,0.18)" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22ab94",
      downColor: "#f7525f",
      borderVisible: false,
      wickUpColor: "#22ab94",
      wickDownColor: "#f7525f",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // initial data
    series.setData(candles as any);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (!elRef.current) return;
      const r = elRef.current.getBoundingClientRect();
      chart.resize(
        Math.max(10, Math.floor(r.width)),
        Math.max(10, Math.floor(r.height))
      );
    });
    ro.observe(elRef.current);

    return () => {
      ro.disconnect();
      primitiveByIdRef.current.clear();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update candle data when store changes
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    series.setData(candles as any);
    // optional: chart.timeScale().fitContent();
  }, [candles]);

  // sync drawings -> primitives
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const map = primitiveByIdRef.current;
    const nextIds = new Set(drawings.map((d) => d.id));

    // remove old
    for (const [id, prim] of map.entries()) {
      if (!nextIds.has(id)) {
        try {
          series.detachPrimitive(prim);
        } catch {
          // ignore
        }
        map.delete(id);
      }
    }

    // add/update
    for (const d of drawings) {
      const existing = map.get(d.id);
      if (!existing) {
        const factory = drawingRegistry[d.kind];
        const prim = factory(d) as any;
        series.attachPrimitive(prim);
        map.set(d.id, prim);
      } else {
        existing.setDrawing?.(d);
      }
    }
  }, [drawings]);

  return <div style={{ minHeight: "450px" }} ref={elRef} className="chart" />;
}
