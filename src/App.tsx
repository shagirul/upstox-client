import React, { useMemo, useState } from "react";
import type { CandleBar, IntervalUnit, ApiError } from "./upstox/types";
import { UpstoxApiClient } from "./upstox/client";
import { HistoricalMarketDataService } from "./upstox/service";
import { isValidYmd } from "./upstox/utils";
import { ChartProvider } from "./component/chart/context/chartStore.tsx";
import { TradingChart } from "./component/chart/TradingChart.tsx";
import type { UTCTimestamp } from "lightweight-charts";

const DEFAULT_INSTRUMENT = "NSE_EQ|INE848E01016";

function prettyJson(x: unknown): string {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

function toCsv(candles: CandleBar[]): string {
  const header = ["timestamp", "open", "high", "low", "close", "volume"].join(
    ","
  );
  const rows = candles.map((c) =>
    [c.timestamp, c.open, c.high, c.low, c.close, c.volume].join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------
// Safe conversion helpers
// ----------------------
const isFiniteNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

// ✅ lightweight-charts is UTC-based.
// Your Upstox timestamps are IST (+05:30). We shift the epoch by +05:30
// so the chart "UTC wall clock" matches IST wall clock for intraday.
const IST_OFFSET_SECONDS = 330 * 60;

function isoIstToChartTimestamp(iso: string): UTCTimestamp | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;

  const shiftedMs = ms + IST_OFFSET_SECONDS * 1000;
  return Math.floor(shiftedMs / 1000) as UTCTimestamp;
}

function isoToIstYmd(iso: string): string {
  // Upstox candle timestamps start with YYYY-MM-DD...
  return typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "";
}

export default function App() {
  const [apiBase, setApiBase] = useState<string>(
    import.meta.env.VITE_API_BASE ?? "https://api.upstox.com"
  );
  const [token, setToken] = useState<string>(
    import.meta.env.VITE_UPSTOX_TOKEN ?? ""
  );
  const [instrumentKey, setInstrumentKey] =
    useState<string>(DEFAULT_INSTRUMENT);
  const [unit, setUnit] = useState<IntervalUnit>("days");
  const [interval, setInterval] = useState<string>("1");
  const [startDate, setStartDate] = useState<string>("2025-12-15");
  const [endDate, setEndDate] = useState<string>("2024-11-01");
  const [mode, setMode] = useState<"range" | "fromStartToNow">(
    "fromStartToNow"
  );
  const [includeHolidayCheck, setIncludeHolidayCheck] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [raw, setRaw] = useState<string>("");
  const [error, setError] = useState<string>("");

  const svc = useMemo(() => {
    const api = new UpstoxApiClient(apiBase, token || undefined);
    return new HistoricalMarketDataService(api, apiBase);
  }, [apiBase, token]);

  const summary = useMemo(() => {
    if (!candles.length) return null;
    return {
      count: candles.length,
      first: candles[0]?.timestamp,
      last: candles[candles.length - 1]?.timestamp,
    };
  }, [candles]);

  // ✅ Derive chart-ready candles from API candles (keeps CandleBar[] untouched)
  // ✅ For unit days/weeks/months -> use BusinessDay string "YYYY-MM-DD" so chart doesn't show hours
  // ✅ For minutes/hours -> use IST-shifted UTCTimestamp so 09:15 IST plots as 09:15 on chart axis
  const initialChartCandles = useMemo(() => {
    type InitialCandlesProp = React.ComponentProps<
      typeof ChartProvider
    >["initialCandles"];
    type ChartCandle = InitialCandlesProp extends Array<infer T> ? T : never;

    const isDayOrHigher =
      unit === "days" || unit === "weeks" || unit === "months";

    const out: ChartCandle[] = [];
    const seen = new Set<string>();

    for (const c of candles) {
      if (
        !c ||
        typeof c.timestamp !== "string" ||
        !isFiniteNum(c.open) ||
        !isFiniteNum(c.high) ||
        !isFiniteNum(c.low) ||
        !isFiniteNum(c.close)
      ) {
        continue;
      }

      if (isDayOrHigher) {
        const ymd = isoToIstYmd(c.timestamp);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue;

        // Dedup by date (not by timestamp) for daily+
        if (seen.has(ymd)) continue;
        seen.add(ymd);

        out.push({
          time: ymd as any, // BusinessDay string
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        } as unknown as ChartCandle);
      } else {
        const t = isoIstToChartTimestamp(c.timestamp);
        if (t == null) continue;

        const key = String(t);
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          time: t,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        } as unknown as ChartCandle);
      }
    }

    out.sort((a: any, b: any) => {
      const ta = a.time;
      const tb = b.time;
      if (typeof ta === "number" && typeof tb === "number") return ta - tb;
      return String(ta).localeCompare(String(tb));
    });

    return out;
  }, [candles, unit]);

  async function runFetch() {
    setError("");
    setRaw("");
    setCandles([]);

    if (!instrumentKey.trim()) {
      setError("Instrument key is required");
      return;
    }
    if (!interval.trim()) {
      setError("Interval is required");
      return;
    }
    if (!isValidYmd(startDate)) {
      setError("Start date must be YYYY-MM-DD");
      return;
    }
    if (mode === "range" && !isValidYmd(endDate)) {
      setError("End date must be YYYY-MM-DD");
      return;
    }

    setLoading(true);
    try {
      const opts = {
        instrumentKey: instrumentKey.trim(),
        unit,
        interval: interval.trim(),
        startDate,
        endDate: mode === "range" ? endDate : undefined,
        includeHolidayCheck,
      };

      const data =
        mode === "range"
          ? await svc.fetchHistoricalCandlesRange(opts)
          : await svc.fetchHistoricalCandlesFromStart(opts);

      setCandles(data);
      setRaw(
        prettyJson({
          opts,
          candles: data.slice(0, 5),
          note: "Raw view shows only first 5 candles to keep it light.",
        })
      );
    } catch (e: any) {
      const apiErr = e as ApiError;
      const msg = apiErr?.message
        ? `${apiErr.message}${
            apiErr.status ? ` (status ${apiErr.status})` : ""
          }\n${apiErr.body ? prettyJson(apiErr.body) : ""}`
        : e?.message ?? String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ margin: "6px 0 14px" }}>Upstox Candle Fetcher</h1>
      <div className="card">
        <hr />

        <div className="hstack">
          <label style={{ minWidth: 320, flex: 2 }}>
            Instrument key
            <input
              style={{ width: "100%" }}
              value={instrumentKey}
              onChange={(e) => setInstrumentKey(e.target.value)}
              placeholder="e.g. NSE_EQ|INE848E01016"
              autoComplete="off"
            />
            <div className="muted small">Enter the exact instrument key.</div>
          </label>
        </div>

        <div className="hstack">
          <label>
            Unit
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as IntervalUnit)}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="weeks">weeks</option>
              <option value="months">months</option>
            </select>
          </label>

          <label>
            Interval
            <input
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              placeholder="1"
              style={{ width: 120 }}
            />
          </label>

          <label>
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <option value="fromStartToNow">start → now</option>
              <option value="range">range (start + end)</option>
            </select>
          </label>

          <label>
            Start date
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ width: 150 }}
            />
          </label>

          <label style={{ opacity: mode === "range" ? 1 : 0.5 }}>
            End date
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ width: 150 }}
              disabled={mode !== "range"}
            />
          </label>

          <button onClick={runFetch} disabled={loading}>
            {loading ? "Fetching…" : "Fetch"}
          </button>

          <button
            className="secondary"
            onClick={() =>
              downloadText("candles.csv", toCsv(candles), "text/csv")
            }
            disabled={!candles.length}
            title="Download candles as CSV"
          >
            Export CSV
          </button>

          <button
            className="secondary"
            onClick={() =>
              downloadText(
                "candles.json",
                JSON.stringify(candles, null, 2),
                "application/json"
              )
            }
            disabled={!candles.length}
            title="Download candles as JSON"
          >
            Export JSON
          </button>
        </div>

        {error && (
          <>
            <hr />
            <div className="error">
              <strong>Error:</strong> <span>{error}</span>
            </div>
          </>
        )}

        {initialChartCandles.length > 0 && (
          <ChartProvider initialCandles={initialChartCandles}>
            <div style={{ minHeight: "550px" }} className="chartWrap">
              <TradingChart />
            </div>
          </ChartProvider>
        )}

        <hr />
      </div>
    </div>
  );
}
