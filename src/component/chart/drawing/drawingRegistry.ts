import { CirclePrimitive } from "../primitives/circle/CirclePrimitive";
import { LinePrimitive } from "../primitives/line/linePrimitive";
import { RectPrimitive } from "../primitives/rect/rectPrimitive";
import { TextPrimitive } from "../primitives/text/TextPrimitive";
import type { Drawing, DrawingKind } from "./types";

export type PrimitiveInstance = {
  setDrawing?: (d: any) => void;
};

export type PrimitiveFactory = (drawing: Drawing) => PrimitiveInstance;

export const drawingRegistry = {
  line: (d: Drawing) => new LinePrimitive(d as any),
  rect: (d: Drawing) => new RectPrimitive(d as any),
  text: (d: Drawing) => new TextPrimitive(d as any),
  circle: (d: Drawing) => new CirclePrimitive(d as any),
} satisfies Record<DrawingKind, PrimitiveFactory>;
