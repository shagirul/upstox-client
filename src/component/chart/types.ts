import type { Time } from "lightweight-charts";

export type Candle = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Point = {
  time: Time;
  price: number;
};

export type LineDrawing = {
  id: string;
  kind: "line";
  p1: Point;
  p2: Point;
  color: string;
  width: number;
};

export type RectDrawing = {
  id: string;
  kind: "rect";
  p1: Point; // corner 1
  p2: Point; // corner 2
  fill: string;
  stroke: string;
  strokeWidth: number;
};

export type Drawing = LineDrawing | RectDrawing;
export type DrawingKind = Drawing["kind"];
