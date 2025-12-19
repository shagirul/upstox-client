import type { IChartApi, ISeriesApi } from "lightweight-charts";

export type AttachedCtx = {
  chart: IChartApi;
  series: ISeriesApi<any>;
  requestUpdate: () => void;
};
