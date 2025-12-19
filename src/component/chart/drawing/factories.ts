import type { Time } from "lightweight-charts";
import type {
  CircleDrawing,
  LineDrawing,
  Point,
  RectDrawing,
  TextDrawing,
} from "./types";
import type { FillStyle, LabelSpec, StrokeStyle } from "./style";
import { DEFAULT_LABEL_BG, DEFAULT_LABEL_FG } from "./style";
import { uid } from "../utils";
import { toTime } from "./toTime";

/** ----------------------------
 * Defaults
 * ---------------------------- */

export const DEFAULT_STROKE: StrokeStyle = {
  color: "rgba(255,255,255,0.9)",
  width: 2,
};

export const DEFAULT_DASHED: number[] = [6, 6];

export const DEFAULT_RECT_FILL: FillStyle = {
  color: "rgba(0, 122, 255, 0.18)",
};

export const DEFAULT_RECT_STROKE: StrokeStyle = {
  color: "rgba(0, 122, 255, 0.85)",
  width: 2,
};

export const DEFAULT_CIRCLE_FILL: FillStyle = {
  color: "rgba(0, 122, 255, 0.12)",
};

export const DEFAULT_CIRCLE_STROKE: StrokeStyle = {
  color: "rgba(0, 122, 255, 0.85)",
  width: 2,
};

/** ----------------------------
 * Small helpers
 * ---------------------------- */

// ✅ accepts number | string | BusinessDay | Time and normalizes
export function pt(time: unknown, price: number): Point {
  return { time: toTime(time), price };
}

export function stroke(partial?: Partial<StrokeStyle>): StrokeStyle {
  const s = { ...DEFAULT_STROKE, ...(partial ?? {}) };
  if (s.dash) s.dash = [...s.dash];
  return s;
}

export function fill(color: string): FillStyle {
  return { color };
}

export function label(text: string, partial?: Partial<LabelSpec>): LabelSpec {
  return {
    text,
    visible: true,
    bg: DEFAULT_LABEL_BG,
    fg: DEFAULT_LABEL_FG,
    size: "sm",
    paddingX: 10,
    paddingY: 6,
    radius: 16,
    offsetPx: 10,
    ...(partial ?? {}),
  };
}

/** ----------------------------
 * Drawing factories
 * ---------------------------- */

type CommonMeta = {
  id?: string;
  visible?: boolean;
  locked?: boolean;
  z?: "top" | "normal" | "bottom";
};

export function makeLine(
  args: CommonMeta & {
    p1: Point;
    p2: Point;
    stroke?: StrokeStyle;
    label?: LabelSpec;
  }
): LineDrawing {
  return {
    id: args.id ?? uid("line"),
    kind: "line",
    p1: args.p1,
    p2: args.p2,
    stroke: args.stroke ?? stroke(),
    label: args.label,
    visible: args.visible,
    locked: args.locked,
    z: args.z,
  };
}

export function makeDashedLine(
  args: CommonMeta & {
    p1: Point;
    p2: Point;
    stroke?: StrokeStyle;
    label?: LabelSpec;
    dash?: number[];
  }
): LineDrawing {
  const baseStroke = args.stroke ?? stroke();
  return makeLine({
    ...args,
    stroke: {
      ...baseStroke,
      dash: args.dash ?? baseStroke.dash ?? DEFAULT_DASHED,
    },
  });
}

export function makeRect(
  args: CommonMeta & {
    p1: Point;
    p2: Point;
    fill?: FillStyle;
    stroke?: StrokeStyle;
    label?: LabelSpec;
  }
): RectDrawing {
  return {
    id: args.id ?? uid("rect"),
    kind: "rect",
    p1: args.p1,
    p2: args.p2,
    fill: args.fill ?? { ...DEFAULT_RECT_FILL },
    stroke: args.stroke ?? { ...DEFAULT_RECT_STROKE },
    label: args.label,
    visible: args.visible,
    locked: args.locked,
    z: args.z,
  };
}

export function makeText(
  args: CommonMeta & {
    p: Point;
    text?: string;
    label?: LabelSpec;
  }
): TextDrawing {
  const lab =
    args.label ??
    label(args.text ?? "Label", {
      offsetPx: 0,
    });

  return {
    id: args.id ?? uid("text"),
    kind: "text",
    p: args.p,
    label: lab,
    visible: args.visible,
    locked: args.locked,
    z: args.z,
  };
}

export function makeCircle(
  args: CommonMeta & {
    center: Point;
    edge: Point;
    fill?: FillStyle;
    stroke?: StrokeStyle;
    label?: LabelSpec;
  }
): CircleDrawing {
  return {
    id: args.id ?? uid("circle"),
    kind: "circle",
    center: args.center,
    edge: args.edge,
    fill: args.fill ?? { ...DEFAULT_CIRCLE_FILL },
    stroke: args.stroke ?? { ...DEFAULT_CIRCLE_STROKE },
    label: args.label,
    visible: args.visible,
    locked: args.locked,
    z: args.z,
  };
}

export function makeTargetLine(
  args: CommonMeta & {
    p1: Point;
    p2: Point;
    text?: string;
  }
): LineDrawing {
  return makeDashedLine({
    ...args,
    stroke: stroke({
      color: "rgba(0, 214, 214, 0.75)",
      width: 2,
    }),
    label: label(args.text ?? "Target", {
      linePos: "end",
      orientation: "normal",
      size: "xs",
      bg: "rgba(80, 180, 185, 0.95)",
      fg: "#ffffff",
      offsetPx: 30,
      paddingX: 12,
      paddingY: 6,
      radius: 0,
    }),
  });
}
