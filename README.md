# Upstox Candle Fetcher (React client-only)

A small React (Vite) app that replicates the *fetching* logic from your Java service:

- Historical candles (V3)
- Intraday candles (V3)
- OHLC Quotes (V3) prev/live merge
- Weekend + optional Upstox holiday adjustment
- 28-day request chunking + de-dup + sort

## Run

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Notes / gotchas

- **Dev proxy (recommended):** requests go to `/upstox/...` (same-origin) and Vite proxies to `https://api.upstox.com/...` to avoid common CORS issues in browsers.
- **Access token (optional in UI):** Upstox V3 docs show Bearer auth for historical/intraday/ohlc endpoints. If your environment works without it, leave it empty. Otherwise paste your token (it stays only in your browser unless you save it).
- **Market holidays:** the app can optionally fetch the Upstox `v2/market/holidays` list and cache it in localStorage; you can also disable holiday checks and use weekend-only logic.
