import type {
  AutoscaleInfo,
  PrimitivePaneViewZOrder,
} from "lightweight-charts";
import type { AttachedCtx } from "../base/primitiveTypes";
import {
  anchorForLinePos,
  lerp,
  normalizeAngleForText,
  tForLineLabelPos,
} from "../base/geometry";
import { applyStroke, drawLabelPill } from "../base/renderUtils";
import { LineDrawing } from "../../drawing/types";
import { clamp } from "../../utils";

type LineViewState = {
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;

  strokeColor: string;
  strokeWidth: number;
  dash: number[];

  z: PrimitivePaneViewZOrder;

  label?: {
    x: number;
    y: number;
    text: string;
    anchor: "left" | "center" | "right";
    rotation?: number;
    raw: any; // LabelSpec
  };
};

class LinePaneRenderer {
  constructor(private readonly s: LineViewState) {}

  draw(target: any) {
    if (
      this.s.x1 === null ||
      this.s.x2 === null ||
      this.s.y1 === null ||
      this.s.y2 === null
    )
      return;

    target.useMediaCoordinateSpace((scope: any) => {
      const ctx: CanvasRenderingContext2D = scope.context;

      // line
      ctx.save();
      applyStroke(ctx, {
        color: this.s.strokeColor,
        width: this.s.strokeWidth,
        dash: this.s.dash,
      });
      ctx.beginPath();
      ctx.moveTo(this.s.x1!, this.s.y1!);
      ctx.lineTo(this.s.x2!, this.s.y2!);
      ctx.stroke();
      ctx.restore();

      // label
      if (this.s.label?.text) {
        drawLabelPill(
          ctx,
          this.s.label.x,
          this.s.label.y,
          this.s.label.raw,
          this.s.label.anchor,
          this.s.label.rotation
        );
      }
    });
  }
}

class LinePaneView {
  private s: LineViewState = {
    x1: null,
    y1: null,
    x2: null,
    y2: null,
    strokeColor: "rgba(255,255,255,0.9)",
    strokeWidth: 2,
    dash: [],
    z: "top",
  };

  update(partial: Partial<LineViewState>) {
    Object.assign(this.s, partial);
  }

  renderer() {
    return new LinePaneRenderer(this.s);
  }

  zOrder(): PrimitivePaneViewZOrder {
    return this.s.z ?? "top";
  }
}

export class LinePrimitive {
  private ctx?: AttachedCtx;
  private view = new LinePaneView();

  constructor(private d: LineDrawing) {}

  setDrawing(next: LineDrawing) {
    this.d = next;
    this.ctx?.requestUpdate();
  }

  attached(param: any) {
    this.ctx = {
      chart: param.chart,
      series: param.series,
      requestUpdate: param.requestUpdate,
    };
  }

  detached() {
    this.ctx = undefined;
  }

  updateAllViews() {
    if (!this.ctx) return;
    const { chart, series } = this.ctx;

    const x1 = chart.timeScale().timeToCoordinate(this.d.p1.time as any);
    const x2 = chart.timeScale().timeToCoordinate(this.d.p2.time as any);
    const y1 = series.priceToCoordinate(this.d.p1.price as any);
    const y2 = series.priceToCoordinate(this.d.p2.price as any);

    let labelState: LineViewState["label"] = undefined;

    const label = this.d.label;
    const labelVisible = label && label.visible !== false && !!label.text;

    if (labelVisible && x1 != null && x2 != null && y1 != null && y2 != null) {
      const t = tForLineLabelPos(label.linePos);
      let lx = lerp(x1, x2, t);
      let ly = lerp(y1, y2, t);

      // offset away from line (perpendicular)
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      // ✅ along/tangent shift (offsetPx)
      const along = label.offsetPx ?? 0;
      lx += (dx / len) * along;
      ly += (dy / len) * along;

      // ✅ perpendicular shift (offsetPy)
      const perp = label.offsetPy ?? 0;
      const nx = -dy / len;
      const ny = dx / len;
      lx += nx * perp;
      ly += ny * perp;

      const anchor = anchorForLinePos(label.linePos);

      let rotation: number | undefined = undefined;
      if (label.orientation === "along") {
        rotation = normalizeAngleForText(Math.atan2(dy, dx));
      }

      labelState = {
        x: lx,
        y: ly,
        text: label.text,
        anchor,
        rotation,
        raw: label,
      };
    }

    this.view.update({
      x1: x1 ?? null,
      y1: y1 ?? null,
      x2: x2 ?? null,
      y2: y2 ?? null,
      strokeColor: this.d.stroke.color,
      strokeWidth: clamp(Math.round(this.d.stroke.width), 1, 12),
      dash: this.d.stroke.dash ?? [],
      z: (this.d.z ?? "top") as any,
      label: labelState,
    });
  }

  paneViews() {
    return [this.view];
  }

  autoscaleInfo(): AutoscaleInfo | null {
    const minV = Math.min(this.d.p1.price, this.d.p2.price);
    const maxV = Math.max(this.d.p1.price, this.d.p2.price);
    return { priceRange: { minValue: minV, maxValue: maxV } } as any;
  }
}
