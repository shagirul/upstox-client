export type IntervalUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'

export type CandleBar = {
  timestamp: string // ISO-8601 with +05:30 offset (for candles API it already arrives like this)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OhlcPair = {
  prev?: CandleBar
  live?: CandleBar
}

export type FetchMode = 'range' | 'fromStartToNow'

export type ApiError = {
  status?: number
  message: string
  body?: unknown
}
