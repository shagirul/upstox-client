// import { createChart } from "lightweight-charts";
// import { useEffect, useRef } from "react";

// let randomFactor = 25 + Math.random() * 25;

// const samplePoint = (i) =>
//   i *
//     (0.5 +
//       Math.sin(i / 1) * 0.2 +
//       Math.sin(i / 2) * 0.4 +
//       Math.sin(i / randomFactor) * 0.8 +
//       Math.sin(i / 50) * 0.5) +
//   200 +
//   i * 2;

// function generateData(
//   numberOfCandles = 500,
//   updatesPerCandle = 5,
//   startAt = 100
// ) {
//   const createCandle = (val, time) => ({
//     time,
//     open: val,
//     high: val,
//     low: val,
//     close: val,
//   });

//   const updateCandle = (candle, val) => ({
//     time: candle.time,
//     close: val,
//     open: candle.open,
//     low: Math.min(candle.low, val),
//     high: Math.max(candle.high, val),
//   });

//   randomFactor = 25 + Math.random() * 25;
//   const date = new Date(Date.UTC(2018, 0, 1, 12, 0, 0, 0));
//   const numberOfPoints = numberOfCandles * updatesPerCandle;
//   const initialData = [];
//   const realtimeUpdates = [];
//   let lastCandle;
//   let previousValue = samplePoint(-1);

//   for (let i = 0; i < numberOfPoints; ++i) {
//     if (i % updatesPerCandle === 0) {
//       date.setUTCDate(date.getUTCDate() + 1);
//     }

//     const time = date.getTime() / 1000;
//     let value = samplePoint(i);
//     const diff = (value - previousValue) * Math.random();
//     value = previousValue + diff;
//     previousValue = value;

//     if (i % updatesPerCandle === 0) {
//       const candle = createCandle(value, time);
//       lastCandle = candle;
//       if (i >= startAt) {
//         realtimeUpdates.push(candle);
//       }
//     } else {
//       const newCandle = updateCandle(lastCandle, value);
//       lastCandle = newCandle;
//       if (i >= startAt) {
//         realtimeUpdates.push(newCandle);
//       } else if ((i + 1) % updatesPerCandle === 0) {
//         initialData.push(newCandle);
//       }
//     }
//   }

//   return { initialData, realtimeUpdates };
// }

// export default function Chart() {
//   const chartContainerRef = useRef(null);
//   const chartRef = useRef(null);
//   const seriesRef = useRef(null);

//   useEffect(() => {
//     if (!chartContainerRef.current) return;

//     const chart = createChart(chartContainerRef.current, {
//       layout: {
//         textColor: "black",
//         background: { type: "solid", color: "white" },
//       },
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
//     // const data = [
//     //   { open: 10, high: 10.63, low: 9.49, close: 9.55, time: 1642427876 },
//     //   { open: 9.55, high: 10.3, low: 9.42, close: 9.94, time: 1642514276 },
//     //   { open: 9.94, high: 10.17, low: 9.92, close: 9.78, time: 1642600676 },
//     //   { open: 9.78, high: 10.59, low: 9.18, close: 9.51, time: 1642687076 },
//     //   { open: 9.51, high: 10.46, low: 9.1, close: 10.17, time: 1642773476 },
//     //   { open: 10.17, high: 10.96, low: 10.16, close: 10.47, time: 1642859876 },
//     //   { open: 10.47, high: 11.39, low: 10.4, close: 10.81, time: 1642946276 },
//     //   { open: 10.81, high: 11.6, low: 10.3, close: 10.75, time: 1643032676 },
//     //   { open: 10.75, high: 11.6, low: 10.49, close: 10.93, time: 1643119076 },
//     //   { open: 10.93, high: 11.53, low: 10.76, close: 10.96, time: 1643205476 },
//     // ];

//     // series.setData(data);
//     const data = generateData(2500, 20, 1000);
//     series.setData(data.initialData);
//     chart.timeScale().fitContent();

//     function* getNextRealtimeUpdate(realtimeData) {
//       for (const dataPoint of realtimeData) {
//         yield dataPoint;
//       }
//       return null;
//     }

//     const streamingDataProvider = getNextRealtimeUpdate(data.realtimeUpdates);

//     const intervalID = setInterval(() => {
//       const update = streamingDataProvider.next();
//       if (update.done) {
//         clearInterval(intervalID);
//         return;
//       }
//       series.update(update.value);
//     }, 100);

//     return () => {
//       clearInterval(intervalID);
//       chart.remove();
//     };
//   }, []);

//   return (
//     <div className="w-screen h-screen  flex flex-col justify-center items-center ">
//       <div
//         style={{
//           width: "100%",
//           minWidth: "100%",
//           height: 520, // ✅ this is the key
//           borderRadius: 12,
//           overflow: "hidden",
//         }}
//         ref={chartContainerRef}
//         className="w-full flex min-h-screen h-full"
//       />
//       <button
//         onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
//         className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg"
//       >
//         Go to Real-Time
//       </button>
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

  // init chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        textColor: "#111",
        background: { type: ColorType.Solid, color: "#fff" },
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // resize
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

  // update data when candles change
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
