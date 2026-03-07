import { describe, expect, it } from "vitest";

import { createCustomViewport } from "@/lib/viewports";
import { createInitialViewerState, viewerStateReducer } from "@/lib/viewerState";

describe("viewerStateReducer", () => {
  it("adds a custom viewport", () => {
    const initialState = createInitialViewerState();
    const nextState = viewerStateReducer(initialState, {
      type: "addViewport",
      viewport: createCustomViewport({
        height: 700,
        id: "custom-test",
        label: "Custom",
        width: 500,
      }),
    });

    expect(nextState).toHaveLength(initialState.length + 1);
    expect(nextState.at(-1)?.label).toBe("Custom");
  });

  it("marks snapshot cards as stale when they are resized", () => {
    const initialState = createInitialViewerState();
    const nextState = viewerStateReducer(initialState, {
      type: "resizeViewport",
      height: 900,
      markSnapshotStale: true,
      stageHeight: 1200,
      stageWidth: 1600,
      viewportId: initialState[0].id,
      width: 450,
    });

    expect(nextState[0].source).toBe("custom");
    expect(nextState[0].isStale).toBe(true);
    expect(nextState[0].width).toBe(450);
  });

  it("refreshes a viewport and clears its stale state", () => {
    const initialState = createInitialViewerState();
    const resizedState = viewerStateReducer(initialState, {
      type: "resizeViewport",
      height: 900,
      markSnapshotStale: true,
      stageHeight: 1200,
      stageWidth: 1600,
      viewportId: initialState[0].id,
      width: 450,
    });
    const refreshedState = viewerStateReducer(resizedState, {
      type: "refreshViewport",
      viewportId: initialState[0].id,
    });

    expect(refreshedState[0].refreshVersion).toBe(1);
    expect(refreshedState[0].isStale).toBe(false);
  });

  it("moves a viewport within stage bounds", () => {
    const initialState = createInitialViewerState();
    const nextState = viewerStateReducer(initialState, {
      type: "moveViewport",
      stageHeight: 1600,
      stageWidth: 1600,
      viewportId: initialState[0].id,
      x: 180,
      y: 220,
    });

    expect(nextState[0].x).toBe(180);
    expect(nextState[0].y).toBe(220);
  });
});
