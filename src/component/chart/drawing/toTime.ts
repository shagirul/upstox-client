import type { BusinessDay, Time, UTCTimestamp } from "lightweight-charts";

function isBusinessDayLike(v: any): v is BusinessDay {
  return (
    v &&
    typeof v === "object" &&
    typeof v.year === "number" &&
    typeof v.month === "number" &&
    typeof v.day === "number"
  );
}

export function toTime(v: unknown): Time {
  // BusinessDay already
  if (isBusinessDayLike(v)) return v;

  // number -> UTCTimestamp (seconds)
  if (typeof v === "number") {
    const sec = v > 1e12 ? Math.floor(v / 1000) : Math.floor(v); // ms -> sec
    return sec as UTCTimestamp;
  }

  if (typeof v === "string") {
    // If string contains time info -> parse as datetime -> UTCTimestamp
    // e.g. 2025-12-15T09:15:00+05:30
    if (v.includes("T") || v.includes(":")) {
      const ms = Date.parse(v);
      if (Number.isFinite(ms)) return Math.floor(ms / 1000) as UTCTimestamp;
    }

    // Otherwise accept YYYY-MM-DD -> BusinessDay
    const s = v.length >= 10 ? v.slice(0, 10) : v;
    const [y, m, d] = s.split("-").map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return { year: y, month: m, day: d };
    }
  }

  throw new Error(`Invalid Time value: ${String(v)}`);
}
