import type {
  AutoscaleInfo,
  PrimitivePaneViewZOrder,
} from "lightweight-charts";
import type { AttachedCtx } from "../base/primitiveTypes";
import { drawLabelPill } from "../base/renderUtils";
import { TextDrawing } from "../../drawing/types";

type TextViewState = {
  x: number | null;
  y: number | null;
  z: PrimitivePaneViewZOrder;
  label?: {
    x: number;
    y: number;
    anchor: "left" | "center" | "right";
    raw: any; // LabelSpec
  };
};

class TextPaneRenderer {
  constructor(private readonly s: TextViewState) {}

  draw(target: any) {
    if (this.s.x === null || this.s.y === null) return;

    target.useMediaCoordinateSpace((scope: any) => {
      const ctx: CanvasRenderingContext2D = scope.context;
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

class TextPaneView {
  private s: TextViewState = { x: null, y: null, z: "top" };

  update(partial: Partial<TextViewState>) {
    Object.assign(this.s, partial);
  }

  renderer() {
    return new TextPaneRenderer(this.s);
  }

  zOrder(): PrimitivePaneViewZOrder {
    return this.s.z ?? "top";
  }
}

export class TextPrimitive {
  private ctx?: AttachedCtx;
  private view = new TextPaneView();

  constructor(private d: TextDrawing) {}

  setDrawing(next: TextDrawing) {
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

    const x = chart.timeScale().timeToCoordinate(this.d.p.time as any);
    const y = series.priceToCoordinate(this.d.p.price as any);

    const label = this.d.label;

    this.view.update({
      x: x ?? null,
      y: y ?? null,
      z: (this.d.z ?? "top") as any,
      label:
        label && label.visible !== false
          ? {
              x: x ?? 0,
              y: y ?? 0,
              anchor: "center",
              raw: label,
            }
          : undefined,
    });
  }

  paneViews() {
    return [this.view];
  }

  autoscaleInfo(): AutoscaleInfo | null {
    return {
      priceRange: { minValue: this.d.p.price, maxValue: this.d.p.price },
    } as any;
  }
}
