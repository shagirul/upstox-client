import type { Time } from "lightweight-charts";
import type { FillStyle, LabelSpec, StrokeStyle } from "./style";

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

export type DrawingBase = {
  id: string;
  visible?: boolean;
  locked?: boolean;
  z?: "top" | "normal" | "bottom";
};

export type LineDrawing = DrawingBase & {
  kind: "line";
  p1: Point;
  p2: Point;
  stroke: StrokeStyle;
  label?: LabelSpec;
};

export type RectDrawing = DrawingBase & {
  kind: "rect";
  p1: Point; // corner 1
  p2: Point; // corner 2
  fill: FillStyle;
  stroke: StrokeStyle;
  label?: LabelSpec;
};

export type TextDrawing = DrawingBase & {
  kind: "text";
  p: Point;
  label: LabelSpec; // required
};

export type CircleDrawing = DrawingBase & {
  kind: "circle";
  center: Point;
  edge: Point; // defines radius
  fill: FillStyle;
  stroke: StrokeStyle;
  label?: LabelSpec;
};

export type Drawing = LineDrawing | RectDrawing | TextDrawing | CircleDrawing;
export type DrawingKind = Drawing["kind"];
