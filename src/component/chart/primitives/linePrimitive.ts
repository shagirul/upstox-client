import type {
  AutoscaleInfo,
  IChartApi,
  ISeriesApi,
  PrimitivePaneViewZOrder,
} from "lightweight-charts";
import { clamp } from "../utils";
import type { LineDrawing } from "../types";

type AttachedCtx = {
  chart: IChartApi;
  series: ISeriesApi<any>;
  requestUpdate: () => void;
};

type LineViewState = {
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  color: string;
  width: number;
};

class SegmentLinePaneRenderer {
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
      ctx.save();
      ctx.lineWidth = this.s.width;
      ctx.strokeStyle = this.s.color;
      ctx.beginPath();
      ctx.moveTo(this.s.x1!, this.s.y1!);
      ctx.lineTo(this.s.x2!, this.s.y2!);
      ctx.stroke();
      ctx.restore();
    });
  }
}

class SegmentLinePaneView {
  private s: LineViewState = {
    x1: null,
    y1: null,
    x2: null,
    y2: null,
    color: "rgba(255,255,255,0.9)",
    width: 2,
  };

  update(partial: Partial<LineViewState>) {
    Object.assign(this.s, partial);
  }
  renderer() {
    return new SegmentLinePaneRenderer(this.s);
  }
  zOrder(): PrimitivePaneViewZOrder {
    return "top";
  }
}

export class SegmentLinePrimitive {
  private ctx?: AttachedCtx;
  private view = new SegmentLinePaneView();

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

    this.view.update({
      x1: x1 ?? null,
      y1: y1 ?? null,
      x2: x2 ?? null,
      y2: y2 ?? null,
      color: this.d.color,
      width: clamp(Math.round(this.d.width), 1, 8),
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
