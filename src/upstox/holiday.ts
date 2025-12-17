/**
 * Holiday handling:
 * - Upstox docs show /v2/market/holidays endpoints without auth. citeturn0search5
 * - We cache per-year holiday dates in localStorage (best-effort).
 */
export type HolidayCache = {
  year: number
  dates: string[] // YYYY-MM-DD
  fetchedAt: number
}

const LS_KEY_PREFIX = 'upstox_holidays_'

function keyForYear(year: number): string {
  return `${LS_KEY_PREFIX}${year}`
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null
  try { return JSON.parse(s) as T } catch { return null }
}

export async function getHolidaySetForYear(apiBase: string, year: number): Promise<Set<string>> {
  const cached = safeJsonParse<HolidayCache>(localStorage.getItem(keyForYear(year)))
  if (cached && cached.year === year && Array.isArray(cached.dates) && cached.dates.length > 0) {
    return new Set(cached.dates)
  }

  const url = `${apiBase}/v2/market/holidays`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    // Don't hard-fail; return empty set and let weekend-only logic work.
    return new Set()
  }
  const json = await res.json().catch(() => null) as any
  const data = json?.data

  // Common patterns:
  // - data is an array of objects that include date fields
  const out = new Set<string>()
  if (Array.isArray(data)) {
    for (const item of data) {
      const d = item?.date || item?.holiday_date || item?.trading_date
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d.startsWith(String(year))) {
        out.add(d)
      }
    }
  }

  if (out.size > 0) {
    const payload: HolidayCache = { year, dates: Array.from(out), fetchedAt: Date.now() }
    localStorage.setItem(keyForYear(year), JSON.stringify(payload))
  }

  return out
}

export async function isMarketHoliday(apiBase: string, ymd: string): Promise<boolean> {
  const year = parseInt(ymd.slice(0, 4), 10)
  if (!Number.isFinite(year)) return false
  const set = await getHolidaySetForYear(apiBase, year)
  return set.has(ymd)
}
