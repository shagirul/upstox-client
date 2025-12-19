import { LabelPosOnLine, LabelPosOnRect } from "../../drawing/style";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// keep text upright-ish when rotated along line
export function normalizeAngleForText(rad: number): number {
  const pi = Math.PI;
  // if pointing left, flip 180deg so label isn't upside down
  if (rad > pi / 2 || rad < -pi / 2) return rad + pi;
  return rad;
}

export function tForLineLabelPos(pos: LabelPosOnLine | undefined): number {
  switch (pos) {
    case "start":
      return 0;
    case "end":
      return 1;
    case "center":
    default:
      return 0.5;
  }
}

export function anchorForLinePos(
  pos: LabelPosOnLine | undefined
): "left" | "center" | "right" {
  switch (pos) {
    case "start":
      return "left";
    case "end":
      return "right";
    default:
      return "center";
  }
}

export function anchorPointForRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
  rectPos: LabelPosOnRect | undefined
): { x: number; y: number; anchor: "left" | "center" | "right" } {
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  switch (rectPos) {
    case "topLeft":
      return { x: left, y: top, anchor: "left" };
    case "topRight":
      return { x: right, y: top, anchor: "right" };
    case "topCenter":
      return { x: cx, y: top, anchor: "center" };

    case "bottomLeft":
      return { x: left, y: bottom, anchor: "left" };
    case "bottomRight":
      return { x: right, y: bottom, anchor: "right" };
    case "bottomCenter":
      return { x: cx, y: bottom, anchor: "center" };

    case "center":
    default:
      return { x: cx, y: cy, anchor: "center" };
  }
}
