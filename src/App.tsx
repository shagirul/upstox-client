import React, { useMemo, useState, useEffect } from "react";
import type { CandleBar, IntervalUnit, ApiError } from "./upstox/types";
import { UpstoxApiClient } from "./upstox/client";
import { HistoricalMarketDataService } from "./upstox/service";
import { isValidYmd } from "./upstox/utils";
import Chart from "./component/Chart.tsx";

const DEFAULT_INSTRUMENT = "NSE_EQ|INE848E01016";
// Default to the dev proxy (/nse → vite.config.ts). In production, fall back to
// NSE directly unless VITE_NSE_BASE is provided (so Vercel doesn't hit its own
// domain and trip CORS).
const NSE_BASE =
  import.meta.env.VITE_NSE_BASE ??
  (import.meta.env.PROD ? "https://www.nseindia.com" : "/nse");
const NSE_AUTOCOMPLETE_API = `${NSE_BASE}/api/NextApi/search/autocomplete?q=`;
const NSE_METADATA_API = `${NSE_BASE}/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&symbol=`;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { symbol: string; symbol_info: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>("");
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    const timeout = setTimeout(async () => {
      const query = searchQuery.trim();
      setSearchLoading(true);
      setSearchError("");
      try {
        const res = await fetch(
          `${NSE_AUTOCOMPLETE_API}${encodeURIComponent(query)}`
        );
        if (!res.ok) {
          throw new Error(`Search failed (status ${res.status})`);
        }
        const data = await res.json();
        setSearchResults(
          Array.isArray(data?.symbols)
            ? data.symbols.map((s: any) => ({
                symbol: s.symbol,
                symbol_info: s.symbol_info,
              }))
            : []
        );
      } catch (err: any) {
        setSearchError(err?.message ?? "Unable to search at the moment.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  async function selectSymbol(symbol: string, company: string) {
    setSearchQuery(`${symbol} — ${company}`);
    setSearchResults([]);
    setSearchError("");
    setMetaLoading(true);
    try {
      const res = await fetch(
        `${NSE_METADATA_API}${encodeURIComponent(symbol)}`
      );
      if (!res.ok) {
        throw new Error(`Metadata fetch failed (status ${res.status})`);
      }
      const data = await res.json();
      if (!data?.isin) {
        throw new Error("ISIN not found in response");
      }
      setInstrumentKey(`NSE_EQ|${data.isin}`);
    } catch (err: any) {
      setSearchError(err?.message ?? "Unable to fetch symbol metadata.");
    } finally {
      setMetaLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ margin: "6px 0 14px" }}>Upstox Candle Fetcher</h1>
      <div className="card">
        <hr />

        <div className="hstack">
          <label style={{ minWidth: 320, flex: 2 }}>
            Search by symbol or company
            <div className="searchBox">
              <input
                style={{ width: "100%" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search NSE symbols"
                autoComplete="off"
              />
              {metaLoading && <span className="pill">Loading ISIN…</span>}
            </div>
            {searchError && <span className="error small">{searchError}</span>}
            {!!searchResults.length && (
              <div className="dropdown">
                {searchResults.map((item) => (
                  <button
                    type="button"
                    key={item.symbol}
                    onClick={() => selectSymbol(item.symbol, item.symbol_info)}
                  >
                    <div className="dropdown-title">{item.symbol}</div>
                    <div className="muted">{item.symbol_info}</div>
                  </button>
                ))}
                {searchLoading && <div className="muted">Searching…</div>}
              </div>
            )}
            {!searchResults.length && searchLoading && (
              <div className="muted">Searching…</div>
            )}
          </label>
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

          {/* <label style={{ minWidth: 220 }}>
            Holiday check (v2)
            <select
              value={includeHolidayCheck ? "on" : "off"}
              onChange={(e) => setIncludeHolidayCheck(e.target.value === "on")}
            >
              <option value="on">on (weekend + Upstox holiday list)</option>
              <option value="off">off (weekend only)</option>
            </select>
          </label> */}

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
        {candles.length > 0 && (
          <div style={{ padding: "16px" }}>
            {" "}
            <Chart candles={candles} />
          </div>
        )}

        {/* {summary && (
          <>
            <hr />
            <div className="hstack">
              <span className="badge">
                Candles: <strong>{summary.count}</strong>
              </span>
              <span className="badge">
                First: <code>{summary.first}</code>
              </span>
              <span className="badge">
                Last: <code>{summary.last}</code>
              </span>
              <span className="badge">
                Unit: <strong>{unit}</strong> / Interval:{" "}
                <strong>{interval}</strong>
              </span>
            </div>
          </>
        )} */}

        {/* {candles.length > 0 && (
          <>
            <hr />
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>timestamp</th>
                    <th>open</th>
                    <th>high</th>
                    <th>low</th>
                    <th>close</th>
                    <th>volume</th>
                  </tr>
                </thead>
                <tbody>
                  {candles.map((c, i) => (
                    <tr key={c.timestamp + "_" + i}>
                      <td>{i + 1}</td>
                      <td>
                        <code>{c.timestamp}</code>
                      </td>
                      <td>{c.open}</td>
                      <td>{c.high}</td>
                      <td>{c.low}</td>
                      <td>{c.close}</td>
                      <td>{c.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )} */}

        <hr />
      </div>
    </div>
  );
}
