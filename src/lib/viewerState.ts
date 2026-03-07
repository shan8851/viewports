import type { ViewportInstance } from "@/lib/types";
import {
  clampViewportDimension,
  clampViewportPosition,
  createInitialViewportInstances,
} from "@/lib/viewports";

export type ViewerAction =
  | { type: "addViewport"; viewport: ViewportInstance }
  | { type: "removeViewport"; viewportId: string }
  | {
      type: "moveViewport";
      viewportId: string;
      x: number;
      y: number;
      stageWidth: number;
      stageHeight: number;
    }
  | {
      type: "resizeViewport";
      viewportId: string;
      width: number;
      height: number;
      markSnapshotStale: boolean;
      stageWidth: number;
      stageHeight: number;
    }
  | {
      type: "resetViewportDimensions";
      viewportId: string;
      stageWidth: number;
      stageHeight: number;
    }
  | { type: "refreshViewport"; viewportId: string }
  | { type: "focusViewport"; viewportId: string }
  | { type: "resetStaleSnapshots" }
  | {
      type: "resizeAndMoveViewport";
      viewportId: string;
      width: number;
      height: number;
      x: number;
      y: number;
      markSnapshotStale: boolean;
      stageWidth: number;
      stageHeight: number;
    };

export const createInitialViewerState = (): ViewportInstance[] => createInitialViewportInstances();

const getNextZIndex = (state: ViewportInstance[]): number =>
  state.reduce((highestZIndex, viewport) => Math.max(highestZIndex, viewport.zIndex), 0) + 1;

export const viewerStateReducer = (
  state: ViewportInstance[],
  action: ViewerAction,
): ViewportInstance[] => {
  switch (action.type) {
    case "addViewport":
      return [...state, { ...action.viewport, zIndex: getNextZIndex(state) }];
    case "removeViewport":
      return state.filter((viewport) => viewport.id !== action.viewportId);
    case "moveViewport":
      return state.map((viewport) =>
        viewport.id === action.viewportId
          ? {
              ...viewport,
              ...clampViewportPosition({
                stageHeight: action.stageHeight,
                stageWidth: action.stageWidth,
                viewport,
                x: action.x,
                y: action.y,
              }),
            }
          : viewport,
      );
    case "resizeViewport":
      return state.map((viewport) =>
        viewport.id === action.viewportId
          ? (() => {
              const width = clampViewportDimension(action.width);
              const height = clampViewportDimension(action.height);

              return {
                ...viewport,
                ...clampViewportPosition({
                  stageHeight: action.stageHeight,
                  stageWidth: action.stageWidth,
                  viewport: { height, width },
                  x: viewport.x,
                  y: viewport.y,
                }),
                width,
                height,
                source: "custom",
                isStale: action.markSnapshotStale,
              };
            })()
          : viewport,
      );
    case "resetViewportDimensions":
      return state.map((viewport) =>
        viewport.id === action.viewportId
          ? {
              ...viewport,
              ...clampViewportPosition({
                stageHeight: action.stageHeight,
                stageWidth: action.stageWidth,
                viewport: {
                  height: viewport.originalHeight,
                  width: viewport.originalWidth,
                },
                x: viewport.x,
                y: viewport.y,
              }),
              width: viewport.originalWidth,
              height: viewport.originalHeight,
              isStale: false,
            }
          : viewport,
      );
    case "refreshViewport":
      return state.map((viewport) =>
        viewport.id === action.viewportId
          ? {
              ...viewport,
              refreshVersion: viewport.refreshVersion + 1,
              isStale: false,
            }
          : viewport,
      );
    case "focusViewport":
      return state.map((viewport) =>
        viewport.id === action.viewportId
          ? {
              ...viewport,
              zIndex: getNextZIndex(state),
            }
          : viewport,
      );
    case "resizeAndMoveViewport":
      return state.map((viewport) =>
        viewport.id === action.viewportId
          ? (() => {
              const width = clampViewportDimension(action.width);
              const height = clampViewportDimension(action.height);

              return {
                ...viewport,
                ...clampViewportPosition({
                  stageHeight: action.stageHeight,
                  stageWidth: action.stageWidth,
                  viewport: { height, width },
                  x: action.x,
                  y: action.y,
                }),
                width,
                height,
                source: "custom",
                isStale: action.markSnapshotStale,
              };
            })()
          : viewport,
      );
    case "resetStaleSnapshots":
      return state.map((viewport) => ({ ...viewport, isStale: false }));
    default:
      return state;
  }
};
