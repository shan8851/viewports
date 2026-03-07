import type { PreviewReason } from "@/lib/types";

export class PreviewError extends Error {
  public readonly reason: PreviewReason;
  public readonly status: number;

  public constructor(reason: PreviewReason, status: number, message: string) {
    super(message);
    this.name = "PreviewError";
    this.reason = reason;
    this.status = status;
  }
}

export const isPreviewError = (error: unknown): error is PreviewError =>
  error instanceof PreviewError;
