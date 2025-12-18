import type { Drawing } from "./types";
import { SegmentLinePrimitive } from "./primitives/linePrimitive";
import { BoxPrimitive } from "./primitives/rectPrimitive";

export type PrimitiveInstance = {
  setDrawing?: (d: any) => void;
};

export type PrimitiveFactory = (drawing: Drawing) => PrimitiveInstance;

export const drawingRegistry: Record<Drawing["kind"], PrimitiveFactory> = {
  line: (d) => new SegmentLinePrimitive(d as any),
  rect: (d) => new BoxPrimitive(d as any),

  // Later:
  // fib: (d) => new FibPrimitive(d as any),
  // ray: (d) => new RayPrimitive(d as any),
  // text: (d) => new TextPrimitive(d as any),
};
