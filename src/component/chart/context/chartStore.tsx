import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { Candle, Drawing } from "../drawing/types";

type ChartState = {
  candles: Candle[];
  drawingsById: Record<string, Drawing>;
  drawingOrder: string[]; // newest first
};

type Action =
  | { type: "candles/set"; candles: Candle[] }
  | { type: "drawing/add"; drawing: Drawing }
  | { type: "drawing/upsert"; drawing: Drawing }
  | { type: "drawing/remove"; id: string }
  | { type: "drawing/clear" };

function reducer(state: ChartState, action: Action): ChartState {
  switch (action.type) {
    case "candles/set":
      return { ...state, candles: action.candles };

    case "drawing/add": {
      const d = action.drawing;
      return {
        ...state,
        drawingsById: { ...state.drawingsById, [d.id]: d },
        drawingOrder: [d.id, ...state.drawingOrder.filter((x) => x !== d.id)],
      };
    }

    case "drawing/upsert": {
      const d = action.drawing;
      const exists = Boolean(state.drawingsById[d.id]);
      return {
        ...state,
        drawingsById: { ...state.drawingsById, [d.id]: d },
        drawingOrder: exists
          ? state.drawingOrder
          : [d.id, ...state.drawingOrder.filter((x) => x !== d.id)],
      };
    }

    case "drawing/remove": {
      const { [action.id]: _, ...rest } = state.drawingsById;
      return {
        ...state,
        drawingsById: rest,
        drawingOrder: state.drawingOrder.filter((x) => x !== action.id),
      };
    }

    case "drawing/clear":
      return { ...state, drawingsById: {}, drawingOrder: [] };

    default:
      return state;
  }
}

const StateCtx = createContext<ChartState | null>(null);
const DispatchCtx = createContext<React.Dispatch<Action> | null>(null);

export function ChartProvider(props: {
  initialCandles: Candle[];
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    candles: props.initialCandles,
    drawingsById: {},
    drawingOrder: [],
  });

  useEffect(() => {
    dispatch({ type: "candles/set", candles: props.initialCandles });
  }, [props.initialCandles]);

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {props.children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useChartState() {
  const v = useContext(StateCtx);
  if (!v) throw new Error("useChartState must be used within ChartProvider");
  return v;
}

export function useChartActions() {
  const dispatch = useContext(DispatchCtx);
  if (!dispatch)
    throw new Error("useChartActions must be used within ChartProvider");

  return useMemo(
    () => ({
      setCandles(candles: Candle[]) {
        dispatch({ type: "candles/set", candles });
      },
      addDrawing(drawing: Drawing) {
        dispatch({ type: "drawing/add", drawing });
      },
      upsertDrawing(drawing: Drawing) {
        dispatch({ type: "drawing/upsert", drawing });
      },
      removeDrawing(id: string) {
        dispatch({ type: "drawing/remove", id });
      },
      clearDrawings() {
        dispatch({ type: "drawing/clear" });
      },
    }),
    [dispatch]
  );
}

// export function useDrawingsList(): Drawing[] {
//   const { drawingsById, drawingOrder } = useChartState();
//   return useMemo(
//     () => drawingOrder.map((id) => drawingsById[id]).filter(Boolean),
//     [drawingsById, drawingOrder]
//   );
// }
function isDrawing(x: Drawing | undefined): x is Drawing {
  return x !== undefined;
}

export function useDrawingsList(): Drawing[] {
  const { drawingsById, drawingOrder } = useChartState();
  return useMemo(
    () => drawingOrder.map((id) => drawingsById[id]).filter(isDrawing),
    [drawingsById, drawingOrder]
  );
}
