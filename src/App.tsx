import React, { useMemo, useState } from "react";
import type { CandleBar, IntervalUnit, ApiError } from "./upstox/types";
import { UpstoxApiClient } from "./upstox/client";
import { HistoricalMarketDataService } from "./upstox/service";
import { isValidYmd } from "./upstox/utils";
import { ChartProvider } from "./component/chart/context/chartStore.tsx";
import { TradingChart } from "./component/chart/TradingChart.tsx";
import type { BusinessDay, Time, UTCTimestamp } from "lightweight-charts";

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

function isoToBusinessDay(iso: string): BusinessDay | null {
  // Expecting something like "2025-10-01T00:00:00+05:30"
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return null;
  return { year, month, day };
}

function isoToUtcTimestamp(iso: string): UTCTimestamp | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function timeKey(t: Time): string {
  if (typeof t === "number") return `u:${t}`;
  return `d:${t.year}-${String(t.month).padStart(2, "0")}-${String(
    t.day
  ).padStart(2, "0")}`;
}

function timeSortKey(t: Time): number {
  if (typeof t === "number") return t;
  // yyyymmdd for stable ordering
  return t.year * 10000 + t.month * 100 + t.day;
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
  const [startDate, setStartDate] = useState<string>("2025-10-01");
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

  // ✅ Derive chart-ready candles from API candles (keeps your CandleBar[] untouched)
  const initialChartCandles = useMemo(() => {
    // Infer the element type ChartProvider expects without importing its types
    type InitialCandlesProp = React.ComponentProps<
      typeof ChartProvider
    >["initialCandles"];
    type ChartCandle = InitialCandlesProp extends Array<infer T> ? T : never;

    const dailyish = unit === "days" || unit === "weeks" || unit === "months";

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

      const time = dailyish
        ? isoToBusinessDay(c.timestamp)
        : isoToUtcTimestamp(c.timestamp);

      if (!time) continue;

      const k = timeKey(time);
      if (seen.has(k)) continue;
      seen.add(k);

      // IMPORTANT: don't include volume here unless ChartProvider's Candle type includes it
      out.push({
        time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      } as unknown as ChartCandle);
    }

    out.sort((a: any, b: any) => timeSortKey(a.time) - timeSortKey(b.time));
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
            {/* <div className="app"> */}
            <div style={{ minHeight: "450px" }} className="chartWrap">
              <TradingChart />
            </div>
            {/* </div> */}
          </ChartProvider>
        )}

        <hr />
      </div>
    </div>
  );
}
