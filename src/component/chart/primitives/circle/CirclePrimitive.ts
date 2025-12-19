import type {
  AutoscaleInfo,
  PrimitivePaneViewZOrder,
} from "lightweight-charts";
import type { AttachedCtx } from "../base/primitiveTypes";
import { dist } from "../base/geometry";
import { applyFill, applyStroke, drawLabelPill } from "../base/renderUtils";
import { CircleDrawing } from "../../drawing/types";
import { clamp } from "../../utils";

type CircleViewState = {
  cx: number | null;
  cy: number | null;
  r: number | null;

  fill: string;
  strokeColor: string;
  strokeWidth: number;
  dash: number[];

  z: PrimitivePaneViewZOrder;

  label?: {
    x: number;
    y: number;
    anchor: "left" | "center" | "right";
    raw: any; // LabelSpec
  };
};

class CirclePaneRenderer {
  constructor(private readonly s: CircleViewState) {}

  draw(target: any) {
    if (this.s.cx == null || this.s.cy == null || this.s.r == null) return;

    target.useMediaCoordinateSpace((scope: any) => {
      const ctx: CanvasRenderingContext2D = scope.context;

      ctx.save();

      // fill
      if (this.s.fill && this.s.fill !== "transparent") {
        applyFill(ctx, { color: this.s.fill });
        ctx.beginPath();
        ctx.arc(this.s.cx!, this.s.cy!, this.s.r!, 0, Math.PI * 2);
        ctx.fill();
      }

      // stroke
      if (this.s.strokeWidth > 0) {
        applyStroke(ctx, {
          color: this.s.strokeColor,
          width: this.s.strokeWidth,
          dash: this.s.dash,
        });
        ctx.beginPath();
        ctx.arc(this.s.cx!, this.s.cy!, this.s.r!, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // label
      if (this.s.label?.raw?.text) {
        drawLabelPill(
          ctx,
          this.s.label.x,
          this.s.label.y,
          this.s.label.raw,
          this.s.label.anchor
        );
      }
    });
  }
}

class CirclePaneView {
  private s: CircleViewState = {
    cx: null,
    cy: null,
    r: null,
    fill: "rgba(0, 122, 255, 0.12)",
    strokeColor: "rgba(0, 122, 255, 0.85)",
    strokeWidth: 2,
    dash: [],
    z: "top",
  };

  update(partial: Partial<CircleViewState>) {
    Object.assign(this.s, partial);
  }

  renderer() {
    return new CirclePaneRenderer(this.s);
  }

  zOrder(): PrimitivePaneViewZOrder {
    return this.s.z ?? "top";
  }
}

export class CirclePrimitive {
  private ctx?: AttachedCtx;
  private view = new CirclePaneView();

  constructor(private d: CircleDrawing) {}

  setDrawing(next: CircleDrawing) {
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

    const cx = chart.timeScale().timeToCoordinate(this.d.center.time as any);
    const ex = chart.timeScale().timeToCoordinate(this.d.edge.time as any);
    const cy = series.priceToCoordinate(this.d.center.price as any);
    const ey = series.priceToCoordinate(this.d.edge.price as any);

    let r: number | null = null;
    if (cx != null && cy != null && ex != null && ey != null) {
      r = dist(cx, cy, ex, ey);
    }

    const label = this.d.label;
    const labelVisible = label && label.visible !== false && !!label.text;

    this.view.update({
      cx: cx ?? null,
      cy: cy ?? null,
      r: r ?? null,

      fill: this.d.fill.color,
      strokeColor: this.d.stroke.color,
      strokeWidth: clamp(Math.round(this.d.stroke.width), 0, 12),
      dash: this.d.stroke.dash ?? [],
      z: (this.d.z ?? "top") as any,

      label:
        labelVisible && cx != null && cy != null && r != null
          ? {
              x: cx + r + (label.offsetPx ?? 10),
              y: cy,
              anchor: "left",
              raw: label,
            }
          : undefined,
    });
  }

  paneViews() {
    return [this.view];
  }

  autoscaleInfo(): AutoscaleInfo | null {
    const minV = Math.min(this.d.center.price, this.d.edge.price);
    const maxV = Math.max(this.d.center.price, this.d.edge.price);
    return { priceRange: { minValue: minV, maxValue: maxV } } as any;
  }
}
