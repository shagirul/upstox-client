// import React, { useEffect, useRef } from "react";
// import {
//   CandlestickSeries,
//   ColorType,
//   createChart,
//   type IChartApi,
//   type ISeriesApi,
// } from "lightweight-charts";
// import { useChartState, useDrawingsList } from "./context/chartStore";
// import { drawingRegistry } from "./drawing/drawingRegistry";

// export function TradingChart() {
//   const { candles } = useChartState();
//   const drawings = useDrawingsList();

//   const elRef = useRef<HTMLDivElement | null>(null);
//   const chartRef = useRef<IChartApi | null>(null);
//   const seriesRef = useRef<ISeriesApi<any> | null>(null);

//   const primitiveByIdRef = useRef<Map<string, any>>(new Map());

//   useEffect(() => {
//     if (!elRef.current) return;

//     const chart = createChart(elRef.current, {
//       layout: {
//         background: { type: ColorType.Solid, color: "#0b0f14" },
//         textColor: "#e7edf5",
//       },
//       grid: {
//         vertLines: { color: "rgba(255,255,255,0.06)" },
//         horzLines: { color: "rgba(255,255,255,0.06)" },
//       },
//       rightPriceScale: { borderVisible: false },
//       timeScale: {
//         borderVisible: false,
//         timeVisible: true,
//         secondsVisible: false,
//       },
//       crosshair: {
//         vertLine: { color: "rgba(255,255,255,0.18)" },
//         horzLine: { color: "rgba(255,255,255,0.18)" },
//       },
//     });

//     const series = chart.addSeries(CandlestickSeries, {
//       upColor: "#22ab94",
//       downColor: "#f7525f",
//       borderVisible: false,
//       wickUpColor: "#22ab94",
//       wickDownColor: "#f7525f",
//     });

//     chartRef.current = chart;
//     seriesRef.current = series;

//     series.setData(candles as any);
//     chart.timeScale().fitContent();

//     const ro = new ResizeObserver(() => {
//       if (!elRef.current) return;
//       const r = elRef.current.getBoundingClientRect();
//       chart.resize(
//         Math.max(10, Math.floor(r.width)),
//         Math.max(10, Math.floor(r.height))
//       );
//     });
//     ro.observe(elRef.current);

//     return () => {
//       ro.disconnect();
//       primitiveByIdRef.current.clear();
//       chart.remove();
//       chartRef.current = null;
//       seriesRef.current = null;
//     };
//   }, []);

//   useEffect(() => {
//     const series = seriesRef.current;
//     const chart = chartRef.current;
//     if (!series || !chart) return;

//     series.setData(candles as any);

//     const firstTime = (candles as any)?.[0]?.time;
//     const showTime = typeof firstTime === "number";

//     chart.applyOptions({
//       timeScale: {
//         timeVisible: showTime,
//         secondsVisible: false,
//       },
//     });
//   }, [candles]);

//   useEffect(() => {
//     const series = seriesRef.current;
//     if (!series) return;

//     const map = primitiveByIdRef.current;
//     const nextIds = new Set(drawings.map((d) => d.id));

//     for (const [id, prim] of map.entries()) {
//       if (!nextIds.has(id)) {
//         try {
//           series.detachPrimitive(prim);
//         } catch {}
//         map.delete(id);
//       }
//     }

//     for (const d of drawings) {
//       const existing = map.get(d.id);
//       if (!existing) {
//         const factory = drawingRegistry[d.kind];
//         const prim = factory(d) as any;
//         series.attachPrimitive(prim);
//         map.set(d.id, prim);
//       } else {
//         existing.setDrawing?.(d);
//       }
//     }
//   }, [drawings]);

//   return <div style={{ minHeight: "550px" }} ref={elRef} className="chart" />;
// }
import React, { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";

import {
  useChartState,
  useChartActions,
  useDrawingsList,
} from "./context/chartStore";
import { drawingRegistry } from "./drawing/drawingRegistry";
import { toTime } from "./drawing/toTime";

import {
  makeTargetLine,
  makeRect,
  makeText,
  makeCircle,
  pt,
  stroke,
  fill,
  label,
} from "./drawing/factories";

type AnyCandle = {
  time?: unknown;
  timestamp?: unknown;
  open: number;
  high: number;
  low: number;
  close: number;
};

function normalizeCandles(raw: AnyCandle[]) {
  return (raw ?? [])
    .map((c) => {
      const t = c.time ?? c.timestamp;
      if (t == null) return null;

      return {
        time: toTime(t),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
    })
    .filter(Boolean) as Array<{
    time: any;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
}

export function TradingChart() {
  const { candles } = useChartState() as { candles: AnyCandle[] };
  const { addDrawing } = useChartActions();
  const drawings = useDrawingsList();

  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const primitiveByIdRef = useRef<Map<string, any>>(new Map());

  // normalized candles used everywhere
  const seriesCandles = useMemo(() => normalizeCandles(candles), [candles]);

  // allow demo once PER dataset
  const demoKeyRef = useRef<string>("");
  const demoAddedRef = useRef(false);

  useEffect(() => {
    const first = candles?.[0]?.timestamp ?? candles?.[0]?.time ?? "";
    const last =
      candles?.[candles.length - 1]?.timestamp ??
      candles?.[candles.length - 1]?.time ??
      "";
    const key = `${String(first)}|${String(last)}|${candles?.length ?? 0}`;

    if (demoKeyRef.current !== key) {
      demoKeyRef.current = key;
      demoAddedRef.current = false;
    }
  }, [candles]);

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
  }, []);

  // update candle data
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    if (!seriesCandles.length) return;

    series.setData(seriesCandles as any);
    chart.timeScale().fitContent();

    const firstTime = seriesCandles[0]?.time;
    const showTime = typeof firstTime === "number"; // UTCTimestamp => intraday
    chart.applyOptions({
      timeScale: { timeVisible: showTime, secondsVisible: false },
    });
  }, [seriesCandles]);

  // ✅ DEMO that works with your 35 candles
  useEffect(() => {
    if (demoAddedRef.current) return;
    if (seriesCandles.length < 8) return;

    demoAddedRef.current = true;

    const n = seriesCandles.length;
    const iA = Math.max(0, Math.floor(n * 0.2));
    const iB = Math.min(n - 1, Math.floor(n * 0.8));
    const iC = Math.min(n - 1, Math.floor(n * 0.55));

    const cA = seriesCandles[iA];
    const cB = seriesCandles[iB];
    const cC = seriesCandles[iC];
    if (!cA?.time || !cB?.time || !cC?.time) return;

    const priceA = cA.close;
    const priceB = cB.close;

    // target line
    addDrawing(
      makeTargetLine({
        p1: pt(cA.time, priceB),
        p2: pt(cB.time, priceB),
        text: "Target",
        z: "normal",
      }) as any
    );

    // zone rect
    addDrawing(
      makeRect({
        p1: pt(cA.time, Math.min(priceA, priceB) - 0.35),
        p2: pt(cC.time, Math.min(priceA, priceB) + 0.35),
        fill: fill("rgba(0, 122, 255, 0.14)"),
        stroke: stroke({
          color: "rgba(0, 122, 255, 0.9)",
          width: 2,
          dash: [4, 4],
        }),
        label: label("Demand", { rectPos: "center", size: "sm" }),
      }) as any
    );

    // text label
    // addDrawing(
    //   makeText({
    //     p: pt(cC.time, 77 + 0.45),
    //     text: "BOS",
    //   }) as any
    // );

    // circle label
    // addDrawing(
    //   makeCircle({
    //     center: pt(cC.time, priceA),
    //     edge: pt(cC.time, priceA + 0.55),
    //     label: label("POI", { size: "xs", offsetPx: 12 }),
    //   }) as any
    // );
  }, [seriesCandles, addDrawing]);

  // sync drawings -> primitives
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const map = primitiveByIdRef.current;
    const nextIds = new Set(drawings.map((d) => d.id));

    for (const [id, prim] of map.entries()) {
      if (!nextIds.has(id)) {
        try {
          series.detachPrimitive(prim);
        } catch {}
        map.delete(id);
      }
    }

    for (const d of drawings) {
      const existing = map.get(d.id);
      if (!existing) {
        const factory = drawingRegistry[d.kind];
        const prim = factory(d as any) as any;
        series.attachPrimitive(prim);
        map.set(d.id, prim);
      } else {
        existing.setDrawing?.(d);
      }
    }
  }, [drawings]);

  return <div style={{ minHeight: "550px" }} ref={elRef} className="chart" />;
}
