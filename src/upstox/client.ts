import type { CandleBar, IntervalUnit, OhlcPair, ApiError } from './types'
import {
  buildHistoricalCandleUrl,
  buildIntradayCandleUrl,
  buildOhlcQuoteUrl,
  epochMsToIstIso,
  toOhlcV3Interval,
} from './utils'

type UpstoxCandlesResponse = {
  status?: string
  data?: {
    candles?: Array<Array<any>>
  }
}

function mapRowToCandle(row: Array<any>): CandleBar {
  // Upstox candles row typical:
  // [timestamp, open, high, low, close, volume, open_interest?]
  return {
    timestamp: String(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5] ?? 0),
  }
}

async function fetchJson(url: string, accessToken?: string): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (accessToken?.trim()) headers.Authorization = `Bearer ${accessToken.trim()}`
  const res = await fetch(url, { headers })
  const text = await res.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: `HTTP ${res.status} ${res.statusText}`,
      body,
    }
    throw err
  }
  return body
}

export class UpstoxApiClient {
  constructor(
    private readonly apiBase: string,
    private readonly accessToken?: string,
  ) {}

  async getHistoricalCandles(
    instrumentKey: string,
    unit: IntervalUnit,
    interval: string,
    fromDate: string,
    toDate: string,
  ): Promise<CandleBar[]> {
    const url = buildHistoricalCandleUrl(this.apiBase, instrumentKey, unit, interval, fromDate, toDate)
    const json = await fetchJson(url, this.accessToken) as UpstoxCandlesResponse
    const rows = json?.data?.candles ?? []
    const out: CandleBar[] = []
    for (const row of rows) out.push(mapRowToCandle(row))
    return out
  }

  async getIntradayCandles(
    instrumentKey: string,
    unit: Extract<IntervalUnit, 'minutes' | 'hours' | 'days'>,
    interval: string,
  ): Promise<CandleBar[]> {
    const url = buildIntradayCandleUrl(this.apiBase, instrumentKey, unit, interval)
    const json = await fetchJson(url, this.accessToken) as UpstoxCandlesResponse
    const rows = json?.data?.candles ?? []
    const out: CandleBar[] = []
    for (const row of rows) out.push(mapRowToCandle(row))
    out.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    return out
  }

  async getOhlcV3(
    instrumentKey: string,
    unit: IntervalUnit,
    interval: string,
  ): Promise<OhlcPair> {
    const mappedInterval = toOhlcV3Interval(unit, interval)
    const url = buildOhlcQuoteUrl(this.apiBase, instrumentKey, mappedInterval)
    const json = await fetchJson(url, this.accessToken) as any
    const dataNode = json?.data
    const entry = (dataNode && typeof dataNode === 'object' && instrumentKey in dataNode)
      ? dataNode[instrumentKey]
      : dataNode

    const prev = parseOhlc(entry?.prev_ohlc)
    const live = parseOhlc(entry?.live_ohlc)

    return { prev: prev ?? undefined, live: live ?? undefined }
  }
}

function parseOhlc(node: any): CandleBar | null {
  if (!node || typeof node !== 'object') return null
  const o = Number(node.open)
  const h = Number(node.high)
  const l = Number(node.low)
  const c = Number(node.close)
  const v = Number(node.volume ?? 0)
  const tsMs = Number(node.ts ?? 0)
  const ts = tsMs > 0 ? epochMsToIstIso(tsMs) : null
  if (!ts) return null
  return { timestamp: ts, open: o, high: h, low: l, close: c, volume: v }
}
