// import type { CandleBar, IntervalUnit } from "./types";
// import { UpstoxApiClient } from "./client";
// import {
//   MAX_DAYS_PER_REQUEST,
//   addDaysUtc,
//   formatUtcDateToYmd,
//   isWeekendUtc,
//   isoCmp,
//   isValidYmd,
//   parseYmdToUtcDate,
//   todayInIstYmd,
// } from "./utils";
// import { isMarketHoliday } from "./holiday";

// export type FetchOptions = {
//   instrumentKey: string;
//   unit: IntervalUnit;
//   interval: string;
//   startDate: string;
//   endDate?: string;
//   includeHolidayCheck?: boolean;
// };

// /**
//  * Rough port of your Java DefaultHistoricalMarketDataService into TS.
//  * Assumes dates are YYYY-MM-DD, and candles are returned with ISO timestamps.
//  */
// export class HistoricalMarketDataService {
//   constructor(
//     private readonly api: UpstoxApiClient,
//     private readonly apiBase: string
//   ) {}

//   private async isHolidayOrWeekend(
//     ymd: string,
//     includeHolidayCheck: boolean
//   ): Promise<boolean> {
//     const d = parseYmdToUtcDate(ymd);
//     if (isWeekendUtc(d)) return true;
//     if (!includeHolidayCheck) return false;
//     return await isMarketHoliday(this.apiBase, ymd);
//   }

//   async fetchHistoricalCandlesRange(opts: FetchOptions): Promise<CandleBar[]> {
//     const {
//       instrumentKey,
//       unit,
//       interval,
//       startDate,
//       endDate,
//       includeHolidayCheck = true,
//     } = opts;
//     if (!isValidYmd(startDate) || !endDate || !isValidYmd(endDate)) {
//       throw new Error("Dates must be valid and in YYYY-MM-DD format");
//     }

//     let start = parseYmdToUtcDate(startDate);
//     let end = parseYmdToUtcDate(endDate);
//     if (start.getTime() > end.getTime())
//       throw new Error("Start date must be before or equal to end date");

//     // Adjust start/end for holiday/weekend (best-effort)
//     while (
//       formatUtcDateToYmd(start) <= formatUtcDateToYmd(end) &&
//       (await this.isHolidayOrWeekend(
//         formatUtcDateToYmd(start),
//         includeHolidayCheck
//       ))
//     ) {
//       start = addDaysUtc(start, 1);
//     }
//     while (
//       formatUtcDateToYmd(end) >= formatUtcDateToYmd(start) &&
//       (await this.isHolidayOrWeekend(
//         formatUtcDateToYmd(end),
//         includeHolidayCheck
//       ))
//     ) {
//       end = addDaysUtc(end, -1);
//     }
//     if (start.getTime() > end.getTime()) {
//       throw new Error(
//         `No valid trading days after holiday/weekend adjustment: start=${formatUtcDateToYmd(
//           start
//         )}, end=${formatUtcDateToYmd(end)}`
//       );
//     }

//     const all: CandleBar[] = [];
//     let segmentStart = new Date(start.getTime());

//     while (segmentStart.getTime() <= end.getTime()) {
//       let segmentEnd = addDaysUtc(segmentStart, MAX_DAYS_PER_REQUEST - 1);
//       if (segmentEnd.getTime() > end.getTime())
//         segmentEnd = new Date(end.getTime());

//       const candles = await this.api.getHistoricalCandles(
//         instrumentKey,
//         unit,
//         interval,
//         formatUtcDateToYmd(segmentStart),
//         formatUtcDateToYmd(segmentEnd)
//       );
//       all.push(...candles);

//       segmentStart = addDaysUtc(segmentEnd, 1);
//       while (
//         segmentStart.getTime() <= end.getTime() &&
//         (await this.isHolidayOrWeekend(
//           formatUtcDateToYmd(segmentStart),
//           includeHolidayCheck
//         ))
//       ) {
//         segmentStart = addDaysUtc(segmentStart, 1);
//       }
//     }

//     // Sort by timestamp
//     all.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
//     return all;
//   }

//   async fetchHistoricalCandlesFromStart(
//     opts: FetchOptions
//   ): Promise<CandleBar[]> {
//     const {
//       instrumentKey,
//       unit,
//       interval,
//       startDate,
//       includeHolidayCheck = true,
//     } = opts;
//     if (!isValidYmd(startDate))
//       throw new Error("Start date must be valid and in YYYY-MM-DD format");

//     const todayYmd = todayInIstYmd();
//     if (startDate > todayYmd)
//       throw new Error("Start date cannot be in the future");

//     const out: CandleBar[] = [];

//     // If today is holiday/weekend → fetch up to today via range (which will back off to last open day)
//     if (await this.isHolidayOrWeekend(todayYmd, includeHolidayCheck)) {
//       return await this.fetchHistoricalCandlesRange({
//         ...opts,
//         endDate: todayYmd,
//       });
//     }

//     // Step 1: historical start -> last completed trading day (yesterday-ish)
//     const lastCompleted = await this.previousTradingDay(
//       todayYmd,
//       includeHolidayCheck
//     );
//     if (lastCompleted && startDate <= lastCompleted) {
//       const hist = await this.fetchHistoricalCandlesRange({
//         ...opts,
//         endDate: lastCompleted,
//       });
//       out.push(...hist);
//     }

//     // Step 2: today's intraday (minutes/hours)
//     if (unit === "minutes" || unit === "hours") {
//       const intra = await this.api.getIntradayCandles(
//         instrumentKey,
//         unit,
//         interval
//       );
//       appendDedup(out, intra);
//     }

//     // Step 3: OHLC V3 prev + live (best-effort; some intervals may return null fields)
//     try {
//       const pair = await this.api.getOhlcV3(instrumentKey, unit, interval);
//       if (pair.prev) appendIfNewerByTs(out, pair.prev);
//       if (pair.live) appendIfNewerByTs(out, pair.live);
//     } catch {
//       // ignore OHLC failures (auth, limitations, etc.)
//     }

//     out.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
//     return out;
//   }

//   private async previousTradingDay(
//     fromExclusiveYmd: string,
//     includeHolidayCheck: boolean
//   ): Promise<string | null> {
//     let d = addDaysUtc(parseYmdToUtcDate(fromExclusiveYmd), -1);
//     let guard = 0;
//     while (guard++ < 14) {
//       const ymd = formatUtcDateToYmd(d);
//       if (!(await this.isHolidayOrWeekend(ymd, includeHolidayCheck)))
//         return ymd;
//       d = addDaysUtc(d, -1);
//     }
//     return null;
//   }
// }

// function appendDedup(base: CandleBar[], toAppend: CandleBar[]): void {
//   if (!toAppend?.length) return;
//   const seen = new Set(base.map((c) => c.timestamp));
//   for (const c of toAppend) {
//     if (c.timestamp && !seen.has(c.timestamp)) {
//       base.push(c);
//       seen.add(c.timestamp);
//     }
//   }
//   base.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
// }

// function appendIfNewerByTs(list: CandleBar[], candidate: CandleBar): void {
//   if (!candidate?.timestamp) return;
//   if (list.length === 0) {
//     list.push(candidate);
//     return;
//   }
//   const last = list[list.length - 1];
//   const lastTs = last.timestamp;
//   const candTs = candidate.timestamp;
//   if (candTs > lastTs) {
//     list.push(candidate);
//   } else if (candTs !== lastTs) {
//     const exists = list.some((c) => c.timestamp === candTs);
//     if (!exists) {
//       list.push(candidate);
//       list.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
//     }
//   }
// }
import type { CandleBar, IntervalUnit } from "./types";
import { UpstoxApiClient } from "./client";
import {
  MAX_DAYS_PER_REQUEST,
  addDaysUtc,
  formatUtcDateToYmd,
  isWeekendUtc,
  isoCmp,
  isValidYmd,
  parseYmdToUtcDate,
  todayInIstYmd,
} from "./utils";
import { isMarketHoliday } from "./holiday";

export type FetchOptions = {
  instrumentKey: string;
  unit: IntervalUnit;
  interval: string;
  startDate: string;
  endDate?: string;
  includeHolidayCheck?: boolean;
};

export class HistoricalMarketDataService {
  constructor(
    private readonly api: UpstoxApiClient,
    private readonly apiBase: string
  ) {}

  private async isHolidayOrWeekend(
    ymd: string,
    includeHolidayCheck: boolean
  ): Promise<boolean> {
    const d = parseYmdToUtcDate(ymd);
    if (isWeekendUtc(d)) return true;
    if (!includeHolidayCheck) return false;
    return await isMarketHoliday(this.apiBase, ymd);
  }

  // -----------------------------
  // NEW helpers for "today" daily
  // -----------------------------
  private istYmdFromIso(ts: string): string {
    // Upstox strings start with YYYY-MM-DD...
    return typeof ts === "string" && ts.length >= 10 ? ts.slice(0, 10) : "";
  }

  private upsertDailyByYmd(list: CandleBar[], candle: CandleBar): void {
    const ymd = this.istYmdFromIso(candle.timestamp);
    if (!ymd) return;

    // remove any candle for the same YYYY-MM-DD (even if timestamp differs)
    for (let i = list.length - 1; i >= 0; i--) {
      if (this.istYmdFromIso(list[i].timestamp) === ymd) {
        list.splice(i, 1);
      }
    }
    list.push(candle);
    list.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
  }

  private async fetchTodayDailyCandle(
    instrumentKey: string,
    interval: string,
    todayYmd: string
  ): Promise<CandleBar | null> {
    // 1) Prefer intraday v3 with unit=days (meant for current trading day)
    try {
      const intra = await this.api.getIntradayCandles(
        instrumentKey,
        "days",
        interval
      );
      if (intra?.length) {
        // pick candle that matches today's YYYY-MM-DD in IST
        const hit =
          intra.find((c) => this.istYmdFromIso(c.timestamp) === todayYmd) ??
          intra[intra.length - 1];

        if (hit && this.istYmdFromIso(hit.timestamp) === todayYmd) return hit;
      }
    } catch {
      // ignore; fallback below
    }

    // 2) Fallback: OHLC V3 live_ohlc for 1d can represent current day
    try {
      const pair = await this.api.getOhlcV3(instrumentKey, "days", interval);
      const live = pair?.live ?? null;
      if (live && this.istYmdFromIso(live.timestamp) === todayYmd) return live;
    } catch {
      // ignore
    }

    return null;
  }

  async fetchHistoricalCandlesRange(opts: FetchOptions): Promise<CandleBar[]> {
    const {
      instrumentKey,
      unit,
      interval,
      startDate,
      endDate,
      includeHolidayCheck = true,
    } = opts;

    if (!isValidYmd(startDate) || !endDate || !isValidYmd(endDate)) {
      throw new Error("Dates must be valid and in YYYY-MM-DD format");
    }

    let start = parseYmdToUtcDate(startDate);
    let end = parseYmdToUtcDate(endDate);
    if (start.getTime() > end.getTime())
      throw new Error("Start date must be before or equal to end date");

    // Adjust start/end for holiday/weekend (best-effort)
    while (
      formatUtcDateToYmd(start) <= formatUtcDateToYmd(end) &&
      (await this.isHolidayOrWeekend(
        formatUtcDateToYmd(start),
        includeHolidayCheck
      ))
    ) {
      start = addDaysUtc(start, 1);
    }
    while (
      formatUtcDateToYmd(end) >= formatUtcDateToYmd(start) &&
      (await this.isHolidayOrWeekend(
        formatUtcDateToYmd(end),
        includeHolidayCheck
      ))
    ) {
      end = addDaysUtc(end, -1);
    }
    if (start.getTime() > end.getTime()) {
      throw new Error(
        `No valid trading days after holiday/weekend adjustment: start=${formatUtcDateToYmd(
          start
        )}, end=${formatUtcDateToYmd(end)}`
      );
    }

    const all: CandleBar[] = [];
    let segmentStart = new Date(start.getTime());

    while (segmentStart.getTime() <= end.getTime()) {
      let segmentEnd = addDaysUtc(segmentStart, MAX_DAYS_PER_REQUEST - 1);
      if (segmentEnd.getTime() > end.getTime())
        segmentEnd = new Date(end.getTime());

      const candles = await this.api.getHistoricalCandles(
        instrumentKey,
        unit,
        interval,
        formatUtcDateToYmd(segmentStart),
        formatUtcDateToYmd(segmentEnd)
      );
      all.push(...candles);

      segmentStart = addDaysUtc(segmentEnd, 1);
      while (
        segmentStart.getTime() <= end.getTime() &&
        (await this.isHolidayOrWeekend(
          formatUtcDateToYmd(segmentStart),
          includeHolidayCheck
        ))
      ) {
        segmentStart = addDaysUtc(segmentStart, 1);
      }
    }

    // ✅ If user asked for DAILY range including today, stitch in today's candle
    // (only if today is a trading day and within the requested range)
    if (unit === "days") {
      const todayYmd = todayInIstYmd();
      if (
        startDate <= todayYmd &&
        endDate >= todayYmd &&
        !(await this.isHolidayOrWeekend(todayYmd, includeHolidayCheck))
      ) {
        const todayCandle = await this.fetchTodayDailyCandle(
          instrumentKey,
          interval,
          todayYmd
        );
        if (todayCandle) this.upsertDailyByYmd(all, todayCandle);
      }
    }

    all.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
    return all;
  }

  async fetchHistoricalCandlesFromStart(
    opts: FetchOptions
  ): Promise<CandleBar[]> {
    const {
      instrumentKey,
      unit,
      interval,
      startDate,
      includeHolidayCheck = true,
    } = opts;

    if (!isValidYmd(startDate))
      throw new Error("Start date must be valid and in YYYY-MM-DD format");

    const todayYmd = todayInIstYmd();
    if (startDate > todayYmd)
      throw new Error("Start date cannot be in the future");

    const out: CandleBar[] = [];

    // If today is holiday/weekend → fetch up to today via range (will back off)
    if (await this.isHolidayOrWeekend(todayYmd, includeHolidayCheck)) {
      return await this.fetchHistoricalCandlesRange({
        ...opts,
        endDate: todayYmd,
      });
    }

    // Step 1: historical start -> last completed trading day
    const lastCompleted = await this.previousTradingDay(
      todayYmd,
      includeHolidayCheck
    );
    if (lastCompleted && startDate <= lastCompleted) {
      const hist = await this.fetchHistoricalCandlesRange({
        ...opts,
        endDate: lastCompleted,
      });
      out.push(...hist);
    }

    // ✅ Step 2: for DAILY timeframe, stitch in today's daily candle
    if (unit === "days") {
      const todayCandle = await this.fetchTodayDailyCandle(
        instrumentKey,
        interval,
        todayYmd
      );
      if (todayCandle) this.upsertDailyByYmd(out, todayCandle);
    }

    // Step 3: intraday (minutes/hours)
    if (unit === "minutes" || unit === "hours") {
      const intra = await this.api.getIntradayCandles(
        instrumentKey,
        unit,
        interval
      );
      appendDedup(out, intra);
    }

    // Step 4: OHLC V3 prev + live (best-effort)
    try {
      const pair = await this.api.getOhlcV3(instrumentKey, unit, interval);
      if (pair.prev) appendIfNewerByTs(out, pair.prev);
      if (pair.live) appendIfNewerByTs(out, pair.live);
    } catch {
      // ignore
    }

    out.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
    return out;
  }

  private async previousTradingDay(
    fromExclusiveYmd: string,
    includeHolidayCheck: boolean
  ): Promise<string | null> {
    let d = addDaysUtc(parseYmdToUtcDate(fromExclusiveYmd), -1);
    let guard = 0;
    while (guard++ < 14) {
      const ymd = formatUtcDateToYmd(d);
      if (!(await this.isHolidayOrWeekend(ymd, includeHolidayCheck)))
        return ymd;
      d = addDaysUtc(d, -1);
    }
    return null;
  }
}

function appendDedup(base: CandleBar[], toAppend: CandleBar[]): void {
  if (!toAppend?.length) return;
  const seen = new Set(base.map((c) => c.timestamp));
  for (const c of toAppend) {
    if (c.timestamp && !seen.has(c.timestamp)) {
      base.push(c);
      seen.add(c.timestamp);
    }
  }
  base.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
}

function appendIfNewerByTs(list: CandleBar[], candidate: CandleBar): void {
  if (!candidate?.timestamp) return;
  if (list.length === 0) {
    list.push(candidate);
    return;
  }
  const last = list[list.length - 1];
  const lastTs = last.timestamp;
  const candTs = candidate.timestamp;
  if (candTs > lastTs) {
    list.push(candidate);
  } else if (candTs !== lastTs) {
    const exists = list.some((c) => c.timestamp === candTs);
    if (!exists) {
      list.push(candidate);
      list.sort((a, b) => isoCmp(a.timestamp, b.timestamp));
    }
  }
}
