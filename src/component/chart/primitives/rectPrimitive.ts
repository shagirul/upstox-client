import type {
  AutoscaleInfo,
  IChartApi,
  ISeriesApi,
  PrimitivePaneViewZOrder,
} from "lightweight-charts";
import { clamp } from "../utils";
import type { RectDrawing } from "../types";

type AttachedCtx = {
  chart: IChartApi;
  series: ISeriesApi;
  requestUpdate: () => void;
};

type RectViewState = {
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

class BoxPaneRenderer {
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
      if (this.s.fill && this.s.fill !== "transparent") {
        ctx.fillStyle = this.s.fill;
        ctx.fillRect(left, top, w, h);
      }
      if (this.s.strokeWidth > 0) {
        ctx.strokeStyle = this.s.stroke;
        ctx.lineWidth = this.s.strokeWidth;
        ctx.strokeRect(left, top, w, h);
      }
      ctx.restore();
    });
  }
}

class BoxPaneView {
  private s: RectViewState = {
    x1: null,
    y1: null,
    x2: null,
    y2: null,
    fill: "rgba(0, 122, 255, 0.18)",
    stroke: "rgba(0, 122, 255, 0.85)",
    strokeWidth: 2,
  };

  update(partial: Partial<RectViewState>) {
    Object.assign(this.s, partial);
  }
  renderer() {
    return new BoxPaneRenderer(this.s);
  }
  zOrder(): PrimitivePaneViewZOrder {
    return "top";
  }
}

export class BoxPrimitive {
  private ctx?: AttachedCtx;
  private view = new BoxPaneView();

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

    this.view.update({
      x1: x1 ?? null,
      y1: y1 ?? null,
      x2: x2 ?? null,
      y2: y2 ?? null,
      fill: this.d.fill,
      stroke: this.d.stroke,
      strokeWidth: clamp(Math.round(this.d.strokeWidth), 0, 12),
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
