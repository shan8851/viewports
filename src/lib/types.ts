export type PreviewMode = "live" | "snapshot";

export type PreviewReason =
  | "ok"
  | "x-frame-options"
  | "frame-ancestors"
  | "invalid-url"
  | "ssrf-blocked"
  | "fetch-failed"
  | "snapshot-failed";

export type ViewportSource = "preset" | "custom";

export type FooterLink = {
  label: string;
  href: string;
};

export type ViewportPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  kind: ViewportSource;
};

export type ViewportInstance = {
  id: string;
  label: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  zIndex: number;
  source: ViewportSource;
  refreshVersion: number;
  isStale: boolean;
};

export type PreviewAnalysisResponse = {
  finalUrl: string;
  embeddable: boolean;
  mode: PreviewMode;
  reason: Exclude<PreviewReason, "invalid-url" | "ssrf-blocked" | "fetch-failed" | "snapshot-failed">;
};

export type PreviewErrorResponse = {
  error: string;
  reason: Extract<PreviewReason, "invalid-url" | "ssrf-blocked" | "fetch-failed" | "snapshot-failed">;
};
