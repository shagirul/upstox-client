import type {
  AutoscaleInfo,
  PrimitivePaneViewZOrder,
} from "lightweight-charts";
import type { AttachedCtx } from "../base/primitiveTypes";
import { anchorPointForRect } from "../base/geometry";
import { applyFill, applyStroke, drawLabelPill } from "../base/renderUtils";
import { RectDrawing } from "../../drawing/types";
import { clamp } from "../../utils";

type RectViewState = {
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;

  fill: string;
  strokeColor: string;
  strokeWidth: number;
  dash: number[];

  z: PrimitivePaneViewZOrder;

  label?: {
    x: number;
    y: number;
    anchor: "left" | "center" | "right";
    rotation?: number;
    raw: any; // LabelSpec
  };
};

class RectPaneRenderer {
  constructor(private readonly s: RectViewState) {}

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

      const left = Math.min(this.s.x1!, this.s.x2!);
      const right = Math.max(this.s.x1!, this.s.x2!);
      const top = Math.min(this.s.y1!, this.s.y2!);
      const bottom = Math.max(this.s.y1!, this.s.y2!);
      const w = Math.max(1, right - left);
      const h = Math.max(1, bottom - top);

      ctx.save();

      // fill
      if (this.s.fill && this.s.fill !== "transparent") {
        applyFill(ctx, { color: this.s.fill });
        ctx.fillRect(left, top, w, h);
      }

      // stroke
      if (this.s.strokeWidth > 0) {
        applyStroke(ctx, {
          color: this.s.strokeColor,
          width: this.s.strokeWidth,
          dash: this.s.dash,
        });
        ctx.strokeRect(left, top, w, h);
      }

      ctx.restore();

      // label
      if (this.s.label?.raw?.text) {
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

class RectPaneView {
  private s: RectViewState = {
    x1: null,
    y1: null,
    x2: null,
    y2: null,
    fill: "rgba(0, 122, 255, 0.18)",
    strokeColor: "rgba(0, 122, 255, 0.85)",
    strokeWidth: 2,
    dash: [],
    z: "top",
  };

  update(partial: Partial<RectViewState>) {
    Object.assign(this.s, partial);
  }

  renderer() {
    return new RectPaneRenderer(this.s);
  }

  zOrder(): PrimitivePaneViewZOrder {
    return this.s.z ?? "top";
  }
}

export class RectPrimitive {
  private ctx?: AttachedCtx;
  private view = new RectPaneView();

  constructor(private d: RectDrawing) {}

  setDrawing(next: RectDrawing) {
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

    let labelState: RectViewState["label"] = undefined;
    const label = this.d.label;
    const labelVisible = label && label.visible !== false && !!label.text;

    if (labelVisible && x1 != null && x2 != null && y1 != null && y2 != null) {
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);

      const base = anchorPointForRect(left, top, right, bottom, label.rectPos);

      const off = label.offsetPx ?? 10;
      // for rect label, offset pushes downward if top positions, upward if bottom, else none
      let ly = base.y;
      if (
        label.rectPos === "topLeft" ||
        label.rectPos === "topCenter" ||
        label.rectPos === "topRight"
      ) {
        ly = base.y + off;
      } else if (
        label.rectPos === "bottomLeft" ||
        label.rectPos === "bottomCenter" ||
        label.rectPos === "bottomRight"
      ) {
        ly = base.y - off;
      }

      labelState = {
        x: base.x,
        y: ly,
        anchor: base.anchor,
        raw: label,
      };
    }

    this.view.update({
      x1: x1 ?? null,
      y1: y1 ?? null,
      x2: x2 ?? null,
      y2: y2 ?? null,

      fill: this.d.fill.color,
      strokeColor: this.d.stroke.color,
      strokeWidth: clamp(Math.round(this.d.stroke.width), 0, 12),
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
