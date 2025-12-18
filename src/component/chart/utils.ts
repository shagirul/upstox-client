import type { Candle } from "./types";

export function uid(prefix: string): string {
  return `${prefix}_${Math.random()
    .toString(36)
    .slice(2, 10)}_${Date.now().toString(36)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function safeNumber(v: string, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isoDay(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function makeCandles(count: number = 140): Candle[] {
  let price = 100;
  const out: Candle[] = [];
  const start = new Date(Date.UTC(2025, 0, 1));

  for (let i = 0; i < count; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const drift = Math.sin(i / 7) * 0.4;
    const noise = (Math.random() - 0.5) * 1.2;
    const delta = drift + noise;

    const open = price;
    const close = Math.max(1, open + delta);
    const high = Math.max(open, close) + Math.random() * 1.2;
    const low = Math.min(open, close) - Math.random() * 1.2;
    price = close;

    out.push({
      time: isoDay(date),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });
  }
  return out;
}
