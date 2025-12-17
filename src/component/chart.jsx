// import { ColorType, createChart } from "lightweight-charts";
// import { useEffect, useMemo, useRef } from "react";

// function isoToUtcSeconds(iso) {
//   return Math.floor(new Date(iso).getTime() / 1000);
// }

// function toCandlestickData(candles) {
//   return (candles || [])
//     .filter((c) => c && c.timestamp)
//     .map((c) => ({
//       time: isoToUtcSeconds(c.timestamp),
//       open: c.open,
//       high: c.high,
//       low: c.low,
//       close: c.close,
//     }))
//     .sort((a, b) => a.time - b.time);
// }

// export default function Chart({ candles = [], height = 520 }) {
//   const containerRef = useRef(null);
//   const chartRef = useRef(null);
//   const seriesRef = useRef(null);

//   const data = useMemo(() => toCandlestickData(candles), [candles]);

//   // init chart once
//   useEffect(() => {
//     const el = containerRef.current;
//     if (!el) return;

//     const chart = createChart(el, {
//       width: el.clientWidth,
//       height,
//       layout: {
//         textColor: "#111",
//         background: { type: ColorType.Solid, color: "#fff" },
//       },
//       grid: {
//         vertLines: { visible: false },
//         horzLines: { visible: false },
//       },
//       rightPriceScale: { borderVisible: false },
//       timeScale: { borderVisible: false },
//     });

//     const series = chart.addCandlestickSeries({
//       upColor: "#26a69a",
//       downColor: "#ef5350",
//       borderVisible: false,
//       wickUpColor: "#26a69a",
//       wickDownColor: "#ef5350",
//     });

//     chartRef.current = chart;
//     seriesRef.current = series;

//     // resize
//     let ro = null;
//     if (typeof ResizeObserver !== "undefined") {
//       ro = new ResizeObserver(() => {
//         const node = containerRef.current;
//         if (!node) return;
//         chart.applyOptions({ width: node.clientWidth, height });
//       });
//       ro.observe(el);
//     } else {
//       const onResize = () => {
//         const node = containerRef.current;
//         if (!node) return;
//         chart.applyOptions({ width: node.clientWidth, height });
//       };
//       window.addEventListener("resize", onResize);
//       ro = { disconnect: () => window.removeEventListener("resize", onResize) };
//     }

//     return () => {
//       if (ro) ro.disconnect();
//       chart.remove();
//       chartRef.current = null;
//       seriesRef.current = null;
//     };
//   }, [height]);

//   // update data when candles change
//   useEffect(() => {
//     const series = seriesRef.current;
//     const chart = chartRef.current;
//     if (!series || !chart) return;

//     series.setData(data);
//     if (data.length) chart.timeScale().fitContent();
//   }, [data]);

//   return (
//     <div style={{ marginTop: 12 }}>
//       <div
//         ref={containerRef}
//         style={{
//           width: "100%",
//           height,
//           borderRadius: 12,
//           overflow: "hidden",
//         }}
//       />
//       <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
//         <button
//           className="secondary"
//           onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
//           disabled={!candles.length}
//         >
//           Go to Real-Time
//         </button>
//       </div>
//     </div>
//   );
// }
import { ColorType, createChart } from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";

function isoToUtcSeconds(iso) {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function toCandlestickData(candles) {
  return (candles || [])
    .filter((c) => c && c.timestamp)
    .map((c) => ({
      time: isoToUtcSeconds(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    .sort((a, b) => a.time - b.time);
}

export default function Chart({ candles = [], height = 520 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const data = useMemo(() => toCandlestickData(candles), [candles]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Dark theme palette (tweak if your UI uses different shades)
    // const bg = "#0b1220"; // deep navy
    // const panel = "#0f172a"; // slightly lighter
    // const text = "#e5e7eb"; // light gray
    // const muted = "#94a3b8"; // slate
    // const grid = "rgba(148,163,184,0.10)";
    const bg = "#121a24"; // matches .card background
    const panel = "#0e141d"; // matches input/select/textarea background
    const text = "#e7edf5"; // matches body text color
    const muted = "rgba(231,237,245,0.70)"; // softer text for axes/labels
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
        textColor: muted,
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

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const node = containerRef.current;
        if (!node) return;
        chart.applyOptions({ width: node.clientWidth, height });
      });
      ro.observe(el);
    } else {
      const onResize = () => {
        const node = containerRef.current;
        if (!node) return;
        chart.applyOptions({ width: node.clientWidth, height });
      };
      window.addEventListener("resize", onResize);
      ro = { disconnect: () => window.removeEventListener("resize", onResize) };
    }

    return () => {
      if (ro) ro.disconnect();
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

  return (
    <div style={{ marginTop: 12 }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height,
          borderRadius: 12,
          overflow: "hidden",
          background: "#0b1220",
          border: "1px solid rgba(148,163,184,0.18)",
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
      </div>
    </div>
  );
}
