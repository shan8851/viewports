import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { analyzePreviewHeaders } from "@/lib/previewAnalysis";
import { isPreviewError } from "@/lib/previewErrors";
import { fetchPreviewTarget } from "@/lib/previewFetch";
import type {
  PreviewAnalysisResponse,
  PreviewErrorResponse,
  PreviewReason,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const analyzeQuerySchema = z.object({
  url: z.string().min(1),
});

const getAppOrigin = (request: NextRequest): string =>
  process.env.APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? request.nextUrl.origin;

const toAnalyzeErrorReason = (
  reason: PreviewReason,
): PreviewErrorResponse["reason"] => {
  switch (reason) {
    case "invalid-url":
    case "ssrf-blocked":
    case "fetch-failed":
      return reason;
    default:
      return "fetch-failed";
  }
};

export const GET = async (
  request: NextRequest,
): Promise<NextResponse<PreviewAnalysisResponse | PreviewErrorResponse>> => {
  const parsedQuery = analyzeQuerySchema.safeParse({
    url: request.nextUrl.searchParams.get("url"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Enter a valid public URL.",
        reason: "invalid-url",
      },
      { status: 400 },
    );
  }

  try {
    const { finalUrl, response } = await fetchPreviewTarget(parsedQuery.data.url);
    const analysis = analyzePreviewHeaders({
      appOrigin: getAppOrigin(request),
      finalUrl,
      headers: response.headers,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    if (isPreviewError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          reason: toAnalyzeErrorReason(error.reason),
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "The target site could not be analyzed right now.",
        reason: "fetch-failed",
      },
      { status: 502 },
    );
  }
};
