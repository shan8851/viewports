import { describe, expect, it } from "vitest";

import { PreviewError } from "@/lib/previewErrors";
import { normalizeUrlInput } from "@/lib/url";

describe("normalizeUrlInput", () => {
  it("adds https when the protocol is omitted", () => {
    expect(normalizeUrlInput("example.com")).toBe("https://example.com/");
  });

  it("strips hash fragments from the final URL", () => {
    expect(normalizeUrlInput("https://example.com/demo#section")).toBe(
      "https://example.com/demo",
    );
  });

  it("rejects non-http protocols", () => {
    expect(() => normalizeUrlInput("file:///tmp/index.html")).toThrow(PreviewError);
  });
});
