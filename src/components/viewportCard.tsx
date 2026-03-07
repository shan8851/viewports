"use client";

import Image from "next/image";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { useCallback, useState } from "react";
import { RefreshCcw, RotateCcw } from "lucide-react";

import type { PreviewMode, ViewportInstance } from "@/lib/types";
import { getViewportWindowMetrics } from "@/lib/viewports";

const statusCopy: Record<"idle" | "loading" | "ready" | "error", string> = {
  error: "Preview unavailable",
  idle: "Load a public URL",
  loading: "Loading preview",
  ready: "",
};

type ResizeDirection = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

const resizeHandles: Array<{
  direction: ResizeDirection;
  cursor: string;
  style: React.CSSProperties;
}> = [
  // Edges
  { direction: { top: true, right: false, bottom: false, left: false }, cursor: "n-resize", style: { top: -3, left: 12, right: 12, height: 6 } },
  { direction: { top: false, right: true, bottom: false, left: false }, cursor: "e-resize", style: { top: 12, right: -3, bottom: 12, width: 6 } },
  { direction: { top: false, right: false, bottom: true, left: false }, cursor: "s-resize", style: { bottom: -3, left: 12, right: 12, height: 6 } },
  { direction: { top: false, right: false, bottom: false, left: true }, cursor: "w-resize", style: { top: 12, left: -3, bottom: 12, width: 6 } },
  // Corners
  { direction: { top: true, right: true, bottom: false, left: false }, cursor: "ne-resize", style: { top: -3, right: -3, width: 12, height: 12 } },
  { direction: { top: true, right: false, bottom: false, left: true }, cursor: "nw-resize", style: { top: -3, left: -3, width: 12, height: 12 } },
  { direction: { top: false, right: true, bottom: true, left: false }, cursor: "se-resize", style: { bottom: -3, right: -3, width: 12, height: 12 } },
  { direction: { top: false, right: false, bottom: true, left: true }, cursor: "sw-resize", style: { bottom: -3, left: -3, width: 12, height: 12 } },
];

export const ViewportCard = ({
  viewport,
  effectiveMode,
  previewUrl,
  analysisStatus,
  onRefresh,
  onRemove,
  onResize,
  onResizeAndMove,
  onMove,
  onFocus,
  onResetDimensions,
}: {
  viewport: ViewportInstance;
  effectiveMode: PreviewMode;
  previewUrl: string;
  analysisStatus: "idle" | "loading" | "ready" | "error";
  onRefresh: (viewportId: string) => void;
  onRemove: (viewportId: string) => void;
  onResize: (viewportId: string, width: number, height: number) => void;
  onResizeAndMove: (viewportId: string, width: number, height: number, x: number, y: number) => void;
  onMove: (viewportId: string, x: number, y: number) => void;
  onFocus: (viewportId: string) => void;
  onResetDimensions: (viewportId: string) => void;
}): ReactElement => {
  const showSnapshotFooter = analysisStatus === "ready" && effectiveMode === "snapshot";
  const { footerHeight, previewHeight, previewWidth, scale, topbarHeight, windowHeight, windowWidth } =
    getViewportWindowMetrics({
      height: viewport.height,
      includeFooter: showSnapshotFooter,
      width: viewport.width,
    });

  const [isResizing, setIsResizing] = useState(false);
  const dimensionsChanged = viewport.width !== viewport.originalWidth || viewport.height !== viewport.originalHeight;

  const handleDragStart = (pointerEvent: ReactPointerEvent<HTMLDivElement>): void => {
    if ((pointerEvent.target as HTMLElement).closest("button")) {
      return;
    }

    pointerEvent.preventDefault();

    const pointerTarget = pointerEvent.currentTarget;
    const startX = pointerEvent.clientX;
    const startY = pointerEvent.clientY;
    const initialX = viewport.x;
    const initialY = viewport.y;

    onFocus(viewport.id);
    pointerTarget.setPointerCapture(pointerEvent.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      onMove(
        viewport.id,
        initialX + (moveEvent.clientX - startX),
        initialY + (moveEvent.clientY - startY),
      );
    };

    const handlePointerUp = (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleResizeStart = useCallback(
    (direction: ResizeDirection) =>
      (pointerEvent: ReactPointerEvent<HTMLDivElement>): void => {
        pointerEvent.preventDefault();
        pointerEvent.stopPropagation();

        const pointerTarget = pointerEvent.currentTarget;
        const startClientX = pointerEvent.clientX;
        const startClientY = pointerEvent.clientY;
        const startWidth = viewport.width;
        const startHeight = viewport.height;
        const startX = viewport.x;
        const startY = viewport.y;
        const displayScale = scale;

        onFocus(viewport.id);
        pointerTarget.setPointerCapture(pointerEvent.pointerId);
        setIsResizing(true);

        const handlePointerMove = (moveEvent: PointerEvent): void => {
          const deltaX = moveEvent.clientX - startClientX;
          const deltaY = moveEvent.clientY - startClientY;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newX = startX;
          let newY = startY;

          if (direction.right) {
            newWidth = startWidth + deltaX / displayScale;
          }
          if (direction.left) {
            newWidth = startWidth - deltaX / displayScale;
            newX = startX + deltaX;
          }
          if (direction.bottom) {
            newHeight = startHeight + deltaY / displayScale;
          }
          if (direction.top) {
            newHeight = startHeight - deltaY / displayScale;
            newY = startY + deltaY;
          }

          const needsMove = direction.left || direction.top;

          if (needsMove) {
            onResizeAndMove(viewport.id, newWidth, newHeight, newX, newY);
          } else {
            onResize(viewport.id, newWidth, newHeight);
          }
        };

        const handlePointerUp = (): void => {
          setIsResizing(false);
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
      },
    [viewport.id, viewport.width, viewport.height, viewport.x, viewport.y, scale, onFocus, onResize, onResizeAndMove],
  );

  const snapshotUrl = `/api/preview/snapshot?url=${encodeURIComponent(
    previewUrl,
  )}&width=${viewport.width}&height=${viewport.height}&v=${viewport.refreshVersion}`;

  return (
    <article
      className="group absolute"
      style={{
        height: `${windowHeight}px`,
        left: `${viewport.x}px`,
        top: `${viewport.y}px`,
        width: `${windowWidth}px`,
        zIndex: viewport.zIndex,
      }}
      onPointerDown={() => onFocus(viewport.id)}
    >
      {/* Resize handles */}
      {resizeHandles.map((handle, index) => (
        <div
          key={index}
          className="absolute z-10"
          style={{ ...handle.style, cursor: handle.cursor, position: "absolute" }}
          onPointerDown={handleResizeStart(handle.direction)}
        />
      ))}

      {/* Topbar */}
      <div
        className="flex cursor-grab items-center justify-between gap-2 rounded-t-lg bg-[rgba(24,24,24,0.96)] px-2.5 py-1 text-[10px] text-ink-soft shadow-[0_1px_0_rgba(255,255,255,0.06)] active:cursor-grabbing"
        style={{ height: `${topbarHeight}px` }}
        onPointerDown={handleDragStart}
      >
        {/* Left: traffic light dots */}
        <div className="flex items-center gap-1.5">
          <button
            className="h-[10px] w-[10px] rounded-full bg-[#ff5f57] opacity-60 transition-opacity hover:opacity-100"
            type="button"
            aria-label={`Remove ${viewport.label}`}
            onClick={() => onRemove(viewport.id)}
            onPointerDown={(event) => event.stopPropagation()}
          />
          <div className="h-[10px] w-[10px] rounded-full bg-[#febc2e] opacity-30" />
          <div className="h-[10px] w-[10px] rounded-full bg-[#28c840] opacity-30" />
        </div>

        {/* Center: label + dimensions */}
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate text-[10px] text-[#999]">{viewport.label}</span>
          <span className="font-mono text-[10px] text-ink-soft">
            {viewport.width} x {viewport.height}
          </span>
        </div>

        {/* Right: actions on hover */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {dimensionsChanged ? (
            <button
              className="flex h-5 w-5 items-center justify-center rounded text-ink-soft transition-colors hover:text-accent"
              type="button"
              aria-label={`Reset ${viewport.label} dimensions`}
              onClick={() => onResetDimensions(viewport.id)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-ink-soft transition-colors hover:text-accent"
            type="button"
            aria-label={`Refresh ${viewport.label}`}
            onClick={() => onRefresh(viewport.id)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <RefreshCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div
        className="overflow-hidden rounded-b-lg bg-white shadow-[0_18px_44px_rgba(0,0,0,0.4)]"
        style={{ width: `${previewWidth}px` }}
      >
        <div
          className="relative overflow-hidden bg-[#1a1a1a]"
          style={{
            height: `${previewHeight}px`,
            width: `${previewWidth}px`,
          }}
        >
          {analysisStatus === "ready" ? (
            <div
              className="origin-top-left overflow-hidden"
              style={{
                height: `${viewport.height}px`,
                transform: `scale(${scale})`,
                width: `${viewport.width}px`,
              }}
            >
              {effectiveMode === "live" ? (
                <iframe
                  key={`${previewUrl}-${viewport.refreshVersion}`}
                  className="block border-0 bg-white"
                  loading="lazy"
                  src={previewUrl}
                  style={{ pointerEvents: isResizing ? "none" : "auto" }}
                  title={`${viewport.label} live preview`}
                  width={viewport.width}
                  height={viewport.height}
                />
              ) : (
                <Image
                  alt={`${viewport.label} snapshot preview`}
                  className="block bg-white object-cover"
                  height={viewport.height}
                  src={snapshotUrl}
                  unoptimized
                  width={viewport.width}
                />
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-ink-soft">
              {statusCopy[analysisStatus]}
            </div>
          )}
        </div>

        {showSnapshotFooter ? (
          <div
            className="flex items-center px-2 text-[10px] uppercase tracking-[0.16em] text-ink-soft"
            style={{ height: `${footerHeight}px` }}
          >
            Live site not available
          </div>
        ) : null}
      </div>
    </article>
  );
};
