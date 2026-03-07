"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import { CirclePlus, MonitorSmartphone } from "lucide-react";

import { ViewportCard } from "@/components/viewportCard";
import { footerLinks } from "@/lib/footerLinks";
import type {
  PreviewAnalysisResponse,
  PreviewErrorResponse,
  PreviewReason,
} from "@/lib/types";
import { normalizeUrlInput } from "@/lib/url";
import {
  createCustomViewport,
  createViewportFromPreset,
  getViewportWindowMetrics,
  VIEWPORT_STAGE_DEFAULT_HEIGHT,
  VIEWPORT_STAGE_DEFAULT_WIDTH,
  VIEWPORT_STAGE_PADDING,
  viewportPresets,
} from "@/lib/viewports";
import { createInitialViewerState, viewerStateReducer } from "@/lib/viewerState";

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: PreviewAnalysisResponse }
  | { status: "error"; message: string; reason: PreviewReason };

const initialCustomViewportDraft = {
  height: "844",
  label: "",
  width: "430",
};

const reasonBannerCopy: Record<PreviewReason, string> = {
  ok: "Previewing live — some sites may block iframe embedding.",
  "x-frame-options": "Site blocks framing — using snapshot mode.",
  "frame-ancestors": "Site blocks framing — using snapshot mode.",
  "invalid-url": "Enter a valid public URL.",
  "ssrf-blocked": "Private and local network URLs are blocked.",
  "fetch-failed": "Could not reach the target site.",
  "snapshot-failed": "Snapshot generation failed.",
};

const createPreviewReason = (reason?: PreviewReason): PreviewReason => reason ?? "ok";

export const SiteViewportApp = (): ReactElement => {
  const [draftUrl, setDraftUrl] = useState("");
  const [appliedUrl, setAppliedUrl] = useState("");
  const [customViewportDraft, setCustomViewportDraft] = useState(initialCustomViewportDraft);
  const [customViewportError, setCustomViewportError] = useState<string | null>(null);
  const [customViewportOpen, setCustomViewportOpen] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [stageBounds, setStageBounds] = useState({
    height: VIEWPORT_STAGE_DEFAULT_HEIGHT,
    width: VIEWPORT_STAGE_DEFAULT_WIDTH,
  });
  const [viewports, dispatch] = useReducer(viewerStateReducer, undefined, createInitialViewerState);
  const addViewportButtonRef = useRef<HTMLButtonElement | null>(null);
  const addViewportPopoverRef = useRef<HTMLDivElement | null>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const effectiveRenderMode = analysisState.status === "ready" ? analysisState.data.mode : "live";
  const includeSnapshotFooter = analysisState.status === "ready" && effectiveRenderMode === "snapshot";

  useEffect(() => {
    if (!stageViewportRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setStageBounds({
        height: Math.max(Math.round(entry.contentRect.height), VIEWPORT_STAGE_DEFAULT_HEIGHT),
        width: Math.max(Math.round(entry.contentRect.width), VIEWPORT_STAGE_DEFAULT_WIDTH),
      });
    });

    resizeObserver.observe(stageViewportRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!customViewportOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        addViewportPopoverRef.current?.contains(target) ||
        addViewportButtonRef.current?.contains(target)
      ) {
        return;
      }

      setCustomViewportOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [customViewportOpen]);

  useEffect(() => {
    if (!appliedUrl) {
      return;
    }

    const abortController = new AbortController();

    void fetch(`/api/preview/analyze?url=${encodeURIComponent(appliedUrl)}`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorPayload = (await response.json()) as PreviewErrorResponse;

          throw errorPayload;
        }

        return (await response.json()) as PreviewAnalysisResponse;
      })
      .then((response) => {
        setAnalysisState({ status: "ready", data: response });
        dispatch({ type: "resetStaleSnapshots" });
      })
      .catch((error: PreviewErrorResponse | DOMException) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAnalysisState({
          status: "error",
          message:
            "error" in error ? error.error : "The target site could not be analyzed right now.",
          reason: createPreviewReason("reason" in error ? error.reason : "fetch-failed"),
        });
      });

    return () => {
      abortController.abort();
    };
  }, [appliedUrl]);

  const stageContentWidth = viewports.reduce((maximumWidth, viewport) => {
    const { windowWidth } = getViewportWindowMetrics({
      height: viewport.height,
      includeFooter: includeSnapshotFooter,
      width: viewport.width,
    });

    return Math.max(maximumWidth, viewport.x + windowWidth + VIEWPORT_STAGE_PADDING);
  }, stageBounds.width);

  const stageContentHeight = viewports.reduce((maximumHeight, viewport) => {
    const { windowHeight } = getViewportWindowMetrics({
      height: viewport.height,
      includeFooter: includeSnapshotFooter,
      width: viewport.width,
    });

    return Math.max(maximumHeight, viewport.y + windowHeight + VIEWPORT_STAGE_PADDING);
  }, stageBounds.height);

  const interactionStageWidth = Math.max(stageBounds.width, stageContentWidth) + 320;
  const interactionStageHeight = Math.max(stageBounds.height, stageContentHeight) + 320;

  const handleUrlSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    try {
      const normalizedUrl = normalizeUrlInput(draftUrl);
      setAnalysisState({ status: "loading" });
      setAppliedUrl(normalizedUrl);
    } catch (error) {
      setAnalysisState({
        status: "error",
        message: error instanceof Error ? error.message : "Enter a valid public URL.",
        reason: "invalid-url",
      });
    }
  };

  const handleAddPresetViewport = (presetId: string): void => {
    const selectedPreset = viewportPresets.find((preset) => preset.id === presetId);

    if (!selectedPreset) {
      return;
    }

    dispatch({
      type: "addViewport",
      viewport: createViewportFromPreset(selectedPreset, undefined, {
        existingViewports: viewports,
        stageWidth: stageBounds.width,
        zIndex: viewports.length + 1,
      }),
    });
    setCustomViewportError(null);
    setCustomViewportOpen(false);
  };

  const handleAddCustomViewport = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const width = Number(customViewportDraft.width);
    const height = Number(customViewportDraft.height);

    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 200 || height < 200) {
      setCustomViewportError("Use whole-number dimensions from 200px and up.");
      return;
    }

    dispatch({
      type: "addViewport",
      viewport: createCustomViewport({
        existingViewports: viewports,
        height,
        label: customViewportDraft.label,
        stageWidth: stageBounds.width,
        width,
        zIndex: viewports.length + 1,
      }),
    });

    setCustomViewportDraft(initialCustomViewportDraft);
    setCustomViewportError(null);
    setCustomViewportOpen(false);
  };

  const effectivePreviewUrl =
    analysisState.status === "ready" ? analysisState.data.finalUrl : appliedUrl;

  const bannerReason =
    analysisState.status === "ready"
      ? analysisState.data.reason
      : analysisState.status === "error"
        ? analysisState.reason
        : "ok";
  const toolbarMessage =
    analysisState.status === "idle"
      ? "Load a public URL, then drag the windows around."
      : analysisState.status === "error"
        ? analysisState.message
        : reasonBannerCopy[bannerReason];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <MonitorSmartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-base font-semibold leading-none tracking-tight">Shan Viewports</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-ink-soft">
                Multi-viewport preview
              </p>
            </div>
          </div>

          <form className="flex w-full max-w-2xl items-center gap-2" onSubmit={handleUrlSubmit}>
            <input
              className="h-10 w-full rounded-lg border border-border bg-surface px-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-ink-soft focus:border-accent"
              placeholder="Enter a public site URL"
              type="text"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
            />
            <button
              className="h-10 cursor-pointer rounded-lg bg-foreground px-4 font-mono text-sm font-medium text-background transition-opacity hover:opacity-80"
              type="submit"
            >
              Load
            </button>
          </form>
        </div>

        <div className="relative mx-auto flex max-w-[1800px] items-center justify-between gap-2 border-t border-border px-4 py-1.5 sm:px-6">
          <div className="flex min-h-7 items-center rounded-lg border border-border bg-surface px-3 py-1 font-mono text-xs text-ink-soft">
            {toolbarMessage}
          </div>

          <div className="flex items-center gap-2">
            <button
              ref={addViewportButtonRef}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 font-mono text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
              type="button"
              onClick={() => setCustomViewportOpen((currentOpen) => !currentOpen)}
            >
              <CirclePlus className="h-3.5 w-3.5" />
              Add viewport
            </button>
          </div>
          {customViewportOpen ? (
            <section
              ref={addViewportPopoverRef}
              className="absolute right-4 top-full z-20 mt-1 w-[min(420px,100%)] rounded-lg border border-border bg-surface px-3 py-3 shadow-[0_18px_36px_rgba(0,0,0,0.4)] sm:right-6"
              >
                <div className="flex flex-wrap gap-1.5">
                {viewportPresets.map((preset) => (
                  <button
                    key={preset.id}
                    className="cursor-pointer rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
                    type="button"
                    onClick={() => handleAddPresetViewport(preset.id)}
                  >
                    {preset.label} {preset.width} x {preset.height}
                  </button>
                ))}
                </div>

                <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={handleAddCustomViewport}>
                  <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                  Label
                  <input
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-accent"
                    placeholder="Custom viewport"
                    type="text"
                    value={customViewportDraft.label}
                    onChange={(event) =>
                      setCustomViewportDraft((currentDraft) => ({
                        ...currentDraft,
                        label: event.target.value,
                      }))
                    }
                  />
                </label>
                  <label className="flex w-[102px] flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                  Width
                  <input
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-accent"
                    type="number"
                    value={customViewportDraft.width}
                    onChange={(event) =>
                      setCustomViewportDraft((currentDraft) => ({
                        ...currentDraft,
                        width: event.target.value,
                      }))
                    }
                  />
                </label>
                  <label className="flex w-[102px] flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                  Height
                  <input
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-accent"
                    type="number"
                    value={customViewportDraft.height}
                    onChange={(event) =>
                      setCustomViewportDraft((currentDraft) => ({
                        ...currentDraft,
                        height: event.target.value,
                      }))
                    }
                  />
                </label>
                  <button
                    className="h-9 cursor-pointer rounded-lg bg-foreground px-4 font-mono text-sm font-medium text-background"
                    type="submit"
                  >
                    Add custom
                  </button>
                  {customViewportError ? (
                    <p className="font-mono text-xs text-accent">{customViewportError}</p>
                  ) : null}
                  <p className="w-full font-mono text-[10px] text-ink-soft">
                    Dimensions clamped to 200 – 2000px
                  </p>
                </form>
              </section>
            ) : null}
        </div>
      </header>

      <main className="px-4 pb-16 pt-[6.5rem] sm:px-6">
        <div className="mx-auto max-w-[1800px]">
          <section
            ref={stageViewportRef}
            className="relative min-h-[calc(100vh-8rem)] overflow-auto rounded-lg border border-border bg-[rgba(17,17,17,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_22rem)]" />
            <div
              className="relative"
              style={{
                height: `${stageContentHeight}px`,
                minHeight: "100%",
                width: `${stageContentWidth}px`,
              }}
            >
              {viewports.map((viewport) => (
                <ViewportCard
                  key={viewport.id}
                  analysisStatus={analysisState.status}
                  effectiveMode={effectiveRenderMode}
                  previewUrl={effectivePreviewUrl}
                  viewport={viewport}
                  onFocus={(viewportId) => dispatch({ type: "focusViewport", viewportId })}
                  onMove={(viewportId, x, y) =>
                    dispatch({
                      type: "moveViewport",
                      stageHeight: interactionStageHeight,
                      stageWidth: interactionStageWidth,
                      viewportId,
                      x,
                      y,
                    })
                  }
                  onRefresh={(viewportId) => dispatch({ type: "refreshViewport", viewportId })}
                  onRemove={(viewportId) => dispatch({ type: "removeViewport", viewportId })}
                  onResetDimensions={(viewportId) =>
                    dispatch({
                      type: "resetViewportDimensions",
                      stageHeight: interactionStageHeight,
                      stageWidth: interactionStageWidth,
                      viewportId,
                    })
                  }
                  onResize={(viewportId, width, height) =>
                    dispatch({
                      type: "resizeViewport",
                      height,
                      markSnapshotStale: includeSnapshotFooter,
                      stageHeight: interactionStageHeight,
                      stageWidth: interactionStageWidth,
                      viewportId,
                      width,
                    })
                  }
                  onResizeAndMove={(viewportId, width, height, x, y) =>
                    dispatch({
                      type: "resizeAndMoveViewport",
                      height,
                      markSnapshotStale: includeSnapshotFooter,
                      stageHeight: interactionStageHeight,
                      stageWidth: interactionStageWidth,
                      viewportId,
                      width,
                      x,
                      y,
                    })
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-10 max-w-[1800px] items-center justify-between px-4 sm:px-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft">
            Shan Viewports
          </p>
          <nav className="flex items-center gap-3 font-mono text-xs text-ink-soft">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                className="transition-colors hover:text-accent hover:underline"
                href={link.href}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
};
