import type { IntervalUnit } from './types'

export const MAX_DAYS_PER_REQUEST = 28

export function isValidYmd(s: string): boolean {
  // strict YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
}

export function encodePathSegment(s: string): string {
  // instrument_key includes | which must be encoded in path
  return encodeURIComponent(s)
}

export function buildHistoricalCandleUrl(
  apiBase: string,
  instrumentKey: string,
  unit: IntervalUnit,
  interval: string,
  fromDate: string,
  toDate: string,
): string {
  const inst = encodePathSegment(instrumentKey)
  // v3 expects: /v3/historical-candle/{instrument_key}/{unit}/{interval}/{to_date}/{from_date}
  return `${apiBase}/v3/historical-candle/${inst}/${unit}/${interval}/${toDate}/${fromDate}`
}

export function buildIntradayCandleUrl(
  apiBase: string,
  instrumentKey: string,
  unit: Extract<IntervalUnit, 'minutes' | 'hours' | 'days'>,
  interval: string,
): string {
  const inst = encodePathSegment(instrumentKey)
  return `${apiBase}/v3/historical-candle/intraday/${inst}/${unit}/${interval}`
}

export function buildOhlcQuoteUrl(apiBase: string, instrumentKey: string, mappedInterval: string): string {
  const instrument = encodeURIComponent(instrumentKey)
  const interval = encodeURIComponent(mappedInterval)
  return `${apiBase}/v3/market-quote/ohlc?instrument_key=${instrument}&interval=${interval}`
}

/** Map (unit, interval) -> OHLC V3 interval string */
export function toOhlcV3Interval(unit: IntervalUnit, interval: string): string {
  if (unit === 'days') return '1d'
  if (unit === 'minutes') {
    const m = parseInt(interval, 10)
    if (!Number.isFinite(m) || m <= 0) throw new Error(`Invalid minutes interval: ${interval}`)
    return `I${m}`
  }
  if (unit === 'hours') {
    const h = parseInt(interval, 10)
    if (!Number.isFinite(h) || h <= 0) throw new Error(`Invalid hours interval: ${interval}`)
    return `I${h * 60}`
  }
  throw new Error(`OHLC V3 interval not supported for unit: ${unit}`)
}

/**
 * Epoch ms -> ISO-8601 in IST (+05:30).
 * India has no DST, so a constant offset works.
 */
export function epochMsToIstIso(epochMs: number): string {
  const offsetMin = 330
  const d = new Date(epochMs + offsetMin * 60_000)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}-${mo}-${da}T${hh}:${mm}:${ss}+05:30`
}

export function parseYmdToUtcDate(ymd: string): Date {
  if (!isValidYmd(ymd)) throw new Error(`Invalid date: ${ymd} (expected YYYY-MM-DD)`)
  return new Date(ymd + 'T00:00:00Z')
}

export function formatUtcDateToYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
}

export function isWeekendUtc(d: Date): boolean {
  const dow = d.getUTCDay() // 0=Sun..6=Sat
  return dow === 0 || dow === 6
}

/** Today in IST (as YYYY-MM-DD) */
export function todayInIstYmd(): string {
  const now = Date.now()
  // shift to IST then take UTC date parts
  const offsetMin = 330
  const d = new Date(now + offsetMin * 60_000)
  return formatUtcDateToYmd(d)
}

/** Compare ISO strings safely (Upstox candle ts strings are ISO-8601) */
export function isoCmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
