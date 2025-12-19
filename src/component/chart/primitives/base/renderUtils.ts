import {
  FillStyle,
  LabelSpec,
  StrokeStyle,
  TextSize,
} from "../../drawing/style";
import { clamp } from "../../utils";

export function applyStroke(ctx: CanvasRenderingContext2D, s: StrokeStyle) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = clamp(Math.round(s.width), 1, 12);
  ctx.setLineDash(s.dash ?? []);
}

export function applyFill(ctx: CanvasRenderingContext2D, f: FillStyle) {
  ctx.fillStyle = f.color;
}

const SIZE_MAP: Record<Exclude<TextSize, "auto">, number> = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
};

export function fontPx(size: TextSize | undefined): number {
  if (!size || size === "base") return SIZE_MAP.base;
  if (size === "auto") return SIZE_MAP.base;
  return SIZE_MAP[size];
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, h / 2, w / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: LabelSpec,
  anchor: "left" | "center" | "right",
  rotationRad?: number
) {
  if (!label.text) return;

  const px = fontPx(label.size);
  const padX = label.paddingX ?? 10;
  const padY = label.paddingY ?? 6;
  const radius = label.radius ?? 10;

  ctx.save();

  if (rotationRad !== undefined) {
    ctx.translate(x, y);
    ctx.rotate(rotationRad);
    ctx.translate(-x, -y);
  }

  ctx.font = `600 ${px}px ui-sans-serif, system-ui`;
  const m = ctx.measureText(label.text);
  const textW = Math.ceil(m.width);
  const textH =
    Math.ceil(
      (m.actualBoundingBoxAscent || px) + (m.actualBoundingBoxDescent || 4)
    ) || Math.ceil(px * 1.2);

  const w = textW + padX * 2;
  const h = textH + padY * 2;

  let left = x - w / 2;
  if (anchor === "left") left = x;
  if (anchor === "right") left = x - w;

  const top = y - h / 2;

  // bg
  ctx.fillStyle = label.bg ?? "rgba(80, 180, 185, 0.95)";
  roundedRectPath(ctx, left, top, w, h, radius);
  ctx.fill();

  // text
  ctx.fillStyle = label.fg ?? "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label.text, left + padX, top + h / 2);

  ctx.restore();
}
