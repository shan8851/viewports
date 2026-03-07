import { describe, expect, it } from "vitest";

import { analyzePreviewHeaders } from "@/lib/previewAnalysis";

describe("analyzePreviewHeaders", () => {
  it("returns live mode when no embed restrictions are present", () => {
    const result = analyzePreviewHeaders({
      appOrigin: "https://viewer.example",
      finalUrl: "https://target.example/page",
      headers: new Headers(),
    });

    expect(result.mode).toBe("live");
    expect(result.reason).toBe("ok");
  });

  it("returns snapshot mode when x-frame-options denies framing", () => {
    const headers = new Headers({ "x-frame-options": "DENY" });
    const result = analyzePreviewHeaders({
      appOrigin: "https://viewer.example",
      finalUrl: "https://target.example/page",
      headers,
    });

    expect(result.mode).toBe("snapshot");
    expect(result.reason).toBe("x-frame-options");
  });

  it("returns snapshot mode when frame-ancestors excludes the app origin", () => {
    const headers = new Headers({
      "content-security-policy": "default-src 'self'; frame-ancestors https://allowed.example",
    });
    const result = analyzePreviewHeaders({
      appOrigin: "https://viewer.example",
      finalUrl: "https://target.example/page",
      headers,
    });

    expect(result.mode).toBe("snapshot");
    expect(result.reason).toBe("frame-ancestors");
  });
});
