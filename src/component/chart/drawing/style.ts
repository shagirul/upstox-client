export type StrokeStyle = {
  color: string;
  width: number;
  dash?: number[]; // e.g. [6,6] ; undefined/[] = solid
};

export type FillStyle = {
  color: string; // "transparent" allowed
};

export type TextSize = "xs" | "sm" | "base" | "md" | "lg" | "xl" | "auto";

export type LabelOrientation = "normal" | "along"; // normal=not rotated, along=rotated with line
export type LabelPosOnLine = "start" | "center" | "end";

export type LabelPosOnRect =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "center"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

export type LabelSpec = {
  text: string;
  visible?: boolean;

  // line tools
  linePos?: LabelPosOnLine; // default center
  orientation?: LabelOrientation; // default normal

  // rect tools
  rectPos?: LabelPosOnRect; // default topCenter

  // style
  size?: TextSize; // default base
  bg?: string; // pill bg
  fg?: string; // text color
  paddingX?: number; // default 10
  paddingY?: number; // default 6
  radius?: number; // default 10
  offsetPy?: number; // ✅ perpendicular to line (up/down for horizontal)
  offsetPx?: number; // ✅ along the line direction (left/right for horizontal)
};

export const DEFAULT_LABEL_BG = "#ffffff00";
export const DEFAULT_LABEL_FG = "#ffffff";
