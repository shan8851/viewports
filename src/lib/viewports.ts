import type { ViewportInstance, ViewportPreset } from "@/lib/types";

export const MIN_VIEWPORT_SIZE = 200;
export const MAX_VIEWPORT_SIZE = 2000;
export const VIEWPORT_STAGE_PADDING = 16;
export const VIEWPORT_STAGE_DEFAULT_WIDTH = 1320;
export const VIEWPORT_STAGE_DEFAULT_HEIGHT = 880;
export const VIEWPORT_WINDOW_GAP = 14;
export const VIEWPORT_WINDOW_PADDING = 2;
export const VIEWPORT_WINDOW_TOPBAR_HEIGHT = 30;
export const VIEWPORT_WINDOW_FOOTER_HEIGHT = 22;

export const computeViewportScale = (width: number): number => {
  const targetDisplayWidth =
    width <= 480 ? 320 : width <= 1024 ? 380 : 640;

  return Math.min(1.0, Math.max(0.25, targetDisplayWidth / width));
};

export const viewportPresets: ViewportPreset[] = [
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667, kind: "preset" },
  { id: "iphone-15-pro", label: "iPhone 15 Pro", width: 393, height: 852, kind: "preset" },
  { id: "pixel-8", label: "Pixel 8", width: 412, height: 915, kind: "preset" },
  { id: "ipad-mini", label: "iPad Mini", width: 768, height: 1024, kind: "preset" },
  { id: "ipad-pro-11", label: "iPad Pro 11", width: 834, height: 1194, kind: "preset" },
  { id: "macbook-air-13", label: "MacBook Air 13", width: 1280, height: 832, kind: "preset" },
  { id: "small-laptop", label: "Small Laptop", width: 1366, height: 768, kind: "preset" },
];

export const clampViewportDimension = (value: number): number =>
  Math.min(MAX_VIEWPORT_SIZE, Math.max(MIN_VIEWPORT_SIZE, Math.round(value)));

export const createViewportId = (prefix: string): string =>
  `${prefix}-${globalThis.crypto.randomUUID()}`;

export const getViewportWindowMetrics = ({
  width,
  height,
  includeFooter = false,
}: Pick<ViewportInstance, "width" | "height"> & { includeFooter?: boolean }): {
  scale: number;
  previewWidth: number;
  previewHeight: number;
  windowWidth: number;
  windowHeight: number;
} & { topbarHeight: number; footerHeight: number } => {
  const scale = computeViewportScale(width);
  const previewWidth = Math.max(Math.round(width * scale), 1);
  const previewHeight = Math.max(Math.round(height * scale), 1);

  return {
    footerHeight: includeFooter ? VIEWPORT_WINDOW_FOOTER_HEIGHT : 0,
    previewHeight,
    previewWidth,
    scale,
    topbarHeight: VIEWPORT_WINDOW_TOPBAR_HEIGHT,
    windowHeight:
      previewHeight +
      VIEWPORT_WINDOW_TOPBAR_HEIGHT +
      (includeFooter ? VIEWPORT_WINDOW_FOOTER_HEIGHT : 0) +
      VIEWPORT_WINDOW_PADDING * 2,
    windowWidth: previewWidth + VIEWPORT_WINDOW_PADDING * 2,
  };
};

export const clampViewportPosition = ({
  x,
  y,
  viewport,
  stageHeight,
  stageWidth,
}: {
  x: number;
  y: number;
  viewport: Pick<ViewportInstance, "width" | "height">;
  stageWidth: number;
  stageHeight: number;
}): { x: number; y: number } => {
  const { windowHeight, windowWidth } = getViewportWindowMetrics(viewport);
  const maximumX = Math.max(VIEWPORT_STAGE_PADDING, stageWidth - windowWidth - VIEWPORT_STAGE_PADDING);
  const maximumY = Math.max(
    VIEWPORT_STAGE_PADDING,
    stageHeight - windowHeight - VIEWPORT_STAGE_PADDING,
  );

  return {
    x: Math.min(Math.max(VIEWPORT_STAGE_PADDING, Math.round(x)), maximumX),
    y: Math.min(Math.max(VIEWPORT_STAGE_PADDING, Math.round(y)), maximumY),
  };
};

const doRectanglesOverlap = ({
  bottom,
  left,
  right,
  top,
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}) => ({ height, width, x, y }: { x: number; y: number; width: number; height: number }): boolean =>
  left < x + width + VIEWPORT_WINDOW_GAP &&
  right + VIEWPORT_WINDOW_GAP > x &&
  top < y + height + VIEWPORT_WINDOW_GAP &&
  bottom + VIEWPORT_WINDOW_GAP > y;

export const getPackedViewportPosition = ({
  existingViewports = [],
  stageWidth = VIEWPORT_STAGE_DEFAULT_WIDTH,
  viewport,
}: {
  existingViewports?: ViewportInstance[];
  stageWidth?: number;
  viewport: Pick<ViewportInstance, "width" | "height">;
}): { x: number; y: number } => {
  const { windowHeight, windowWidth } = getViewportWindowMetrics(viewport);
  const positionedViewportRects = existingViewports.map((existingViewport) => {
    const existingMetrics = getViewportWindowMetrics(existingViewport);

    return {
      height: existingMetrics.windowHeight,
      width: existingMetrics.windowWidth,
      x: existingViewport.x,
      y: existingViewport.y,
    };
  });
  const candidateRows = Array.from(
    new Set([
      VIEWPORT_STAGE_PADDING,
      ...positionedViewportRects.flatMap((rect) => [
        rect.y,
        rect.y + rect.height + VIEWPORT_WINDOW_GAP,
      ]),
    ]),
  ).sort((leftValue, rightValue) => leftValue - rightValue);

  const openPosition = candidateRows
    .flatMap((candidateY) => {
      const candidateXPositions = Array.from(
        new Set([
          VIEWPORT_STAGE_PADDING,
          ...positionedViewportRects.map((rect) => rect.x + rect.width + VIEWPORT_WINDOW_GAP),
        ]),
      ).sort((leftValue, rightValue) => leftValue - rightValue);

      return candidateXPositions
        .filter(
          (candidateX) =>
            candidateX + windowWidth <= stageWidth - VIEWPORT_STAGE_PADDING + VIEWPORT_WINDOW_GAP,
        )
        .map((candidateX) => ({
          overlapsExistingViewport: positionedViewportRects.some(
            doRectanglesOverlap({
              bottom: candidateY + windowHeight,
              left: candidateX,
              right: candidateX + windowWidth,
              top: candidateY,
            }),
          ),
          x: candidateX,
          y: candidateY,
        }))
        .filter((candidate) => !candidate.overlapsExistingViewport)
        .map(({ x, y }) => ({ x, y }));
    })
    .at(0);

  if (openPosition) {
    return openPosition;
  }

  const lowestY = positionedViewportRects.reduce(
    (currentMax, rect) => Math.max(currentMax, rect.y + rect.height),
    VIEWPORT_STAGE_PADDING,
  );

  return {
    x: VIEWPORT_STAGE_PADDING,
    y: lowestY + VIEWPORT_WINDOW_GAP,
  };
};

export const createViewportFromPreset = (
  preset: ViewportPreset,
  id: string = createViewportId(preset.id),
  options?: {
    existingViewports?: ViewportInstance[];
    stageWidth?: number;
    zIndex?: number;
  },
): ViewportInstance => ({
  id,
  label: preset.label,
  width: preset.width,
  height: preset.height,
  originalWidth: preset.width,
  originalHeight: preset.height,
  ...getPackedViewportPosition({
    existingViewports: options?.existingViewports,
    stageWidth: options?.stageWidth,
    viewport: preset,
  }),
  zIndex: options?.zIndex ?? 1,
  source: "preset",
  refreshVersion: 0,
  isStale: false,
});

export const createCustomViewport = ({
  id = createViewportId("custom"),
  label,
  width,
  height,
  existingViewports = [],
  stageWidth,
  zIndex = 1,
}: {
  id?: string;
  label?: string;
  width: number;
  height: number;
  existingViewports?: ViewportInstance[];
  stageWidth?: number;
  zIndex?: number;
}): ViewportInstance => {
  const clampedWidth = clampViewportDimension(width);
  const clampedHeight = clampViewportDimension(height);

  return {
    id,
    label: label?.trim() || "Custom viewport",
    width: clampedWidth,
    height: clampedHeight,
    originalWidth: clampedWidth,
    originalHeight: clampedHeight,
    ...getPackedViewportPosition({
      existingViewports,
      stageWidth,
      viewport: {
        height: clampedHeight,
        width: clampedWidth,
      },
    }),
    zIndex,
    source: "custom",
    refreshVersion: 0,
    isStale: false,
  };
};

const defaultPresetIds = ["iphone-15-pro", "ipad-mini", "macbook-air-13"];

export const createInitialViewportInstances = (): ViewportInstance[] =>
  viewportPresets
    .filter((preset) => defaultPresetIds.includes(preset.id))
    .reduce<ViewportInstance[]>(
      (accumulatedViewports, preset, index) => [
        ...accumulatedViewports,
        createViewportFromPreset(preset, `${preset.id}-default`, {
          existingViewports: accumulatedViewports,
          stageWidth: VIEWPORT_STAGE_DEFAULT_WIDTH,
          zIndex: index + 1,
        }),
      ],
      [],
    );
