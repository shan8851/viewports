import { PreviewError, isPreviewError } from "@/lib/previewErrors";
import { assertSafePreviewUrl } from "@/lib/networkSecurity";

const PREVIEW_FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export const fetchPreviewTarget = async (
  targetUrl: string,
  remainingRedirects: number = 5,
): Promise<{ finalUrl: string; response: Response }> => {
  const normalizedUrl = await assertSafePreviewUrl(targetUrl);

  try {
    const response = await fetch(normalizedUrl, {
      cache: "no-store",
      headers: PREVIEW_FETCH_HEADERS,
      redirect: "manual",
    });

    if (REDIRECT_STATUS_CODES.has(response.status)) {
      if (remainingRedirects === 0) {
        throw new PreviewError("fetch-failed", 502, "The URL redirected too many times.");
      }

      const locationHeader = response.headers.get("location");

      if (!locationHeader) {
        throw new PreviewError("fetch-failed", 502, "The URL redirected without a location.");
      }

      const redirectedUrl = new URL(locationHeader, normalizedUrl).toString();

      return fetchPreviewTarget(redirectedUrl, remainingRedirects - 1);
    }

    if (!response.ok) {
      throw new PreviewError(
        "fetch-failed",
        502,
        `The target site responded with ${response.status}.`,
      );
    }

    return { finalUrl: response.url || normalizedUrl, response };
  } catch (error) {
    if (isPreviewError(error)) {
      throw error;
    }

    throw new PreviewError("fetch-failed", 502, "The target site could not be fetched.");
  }
};
