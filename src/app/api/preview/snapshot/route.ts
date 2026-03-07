import { NextRequest } from "next/server";
import { z } from "zod";

import { isPreviewError, PreviewError } from "@/lib/previewErrors";
import { fetchPreviewTarget } from "@/lib/previewFetch";
import { getSharedBrowser } from "@/lib/playwrightBrowser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const snapshotQuerySchema = z.object({
  height: z.coerce.number().int().min(200).max(2000),
  url: z.string().min(1),
  v: z.string().optional(),
  width: z.coerce.number().int().min(200).max(2000),
});

export const GET = async (request: NextRequest): Promise<Response> => {
  const parsedQuery = snapshotQuerySchema.safeParse({
    height: request.nextUrl.searchParams.get("height"),
    url: request.nextUrl.searchParams.get("url"),
    v: request.nextUrl.searchParams.get("v") ?? undefined,
    width: request.nextUrl.searchParams.get("width"),
  });

  if (!parsedQuery.success) {
    return new Response("Invalid snapshot request.", { status: 400 });
  }

  try {
    const { finalUrl } = await fetchPreviewTarget(parsedQuery.data.url);
    const browser = await getSharedBrowser();
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: {
        height: parsedQuery.data.height,
        width: parsedQuery.data.width,
      },
    });
    const page = await context.newPage();

    try {
      await page.goto(finalUrl, {
        timeout: 20_000,
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      const screenshot = await page.screenshot({
        fullPage: false,
        type: "png",
      });

      return new Response(new Uint8Array(screenshot), {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "Content-Type": "image/png",
        },
      });
    } finally {
      await context.close();
    }
  } catch (error) {
    if (isPreviewError(error)) {
      return new Response(error.message, { status: error.status });
    }

    if (error instanceof Error) {
      return new Response(
        new PreviewError(
          "snapshot-failed",
          502,
          "Snapshot generation failed. Install Chromium with `npx playwright install chromium` if needed.",
        ).message,
        { status: 502 },
      );
    }

    return new Response("Snapshot generation failed.", { status: 502 });
  }
};
