import { PreviewError } from "@/lib/previewErrors";

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

export const normalizeUrlInput = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new PreviewError("invalid-url", 400, "Enter a valid public URL.");
  }

  const urlCandidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(urlCandidate);

    if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
      throw new PreviewError("invalid-url", 400, "Only http and https URLs are supported.");
    }

    parsedUrl.hash = "";

    return parsedUrl.toString();
  } catch (error) {
    if (error instanceof PreviewError) {
      throw error;
    }

    throw new PreviewError("invalid-url", 400, "Enter a valid public URL.");
  }
};
