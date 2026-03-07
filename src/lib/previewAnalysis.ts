import type { PreviewAnalysisResponse } from "@/lib/types";

const extractFrameAncestorsDirective = (contentSecurityPolicyHeader: string | null): string[] => {
  if (!contentSecurityPolicyHeader) {
    return [];
  }

  const frameAncestorsDirective = contentSecurityPolicyHeader
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-ancestors"));

  return frameAncestorsDirective
    ? frameAncestorsDirective.split(/\s+/).slice(1).filter(Boolean)
    : [];
};

const matchesWildcardHost = (hostname: string, sourceHost: string): boolean =>
  hostname !== sourceHost && hostname.endsWith(`.${sourceHost}`);

const frameAncestorAllowsOrigin = ({
  source,
  appOrigin,
  targetOrigin,
}: {
  source: string;
  appOrigin: string;
  targetOrigin: string;
}): boolean => {
  const appUrl = new URL(appOrigin);

  if (source === "*") {
    return true;
  }

  if (source === "'self'") {
    return appOrigin === targetOrigin;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:$/.test(source)) {
    return appUrl.protocol === source;
  }

  const sourceParts = source.includes("://")
    ? source.split("://")
    : [appUrl.protocol.slice(0, -1), source];

  const [scheme, hostnameWithPort] = sourceParts;
  const [rawHostname, port] = hostnameWithPort.split(":");
  const wildcardHost = rawHostname.startsWith("*.");
  const sourceHostname = wildcardHost ? rawHostname.slice(2) : rawHostname;
  const protocolMatches = appUrl.protocol === `${scheme}:`;
  const hostnameMatches = wildcardHost
    ? matchesWildcardHost(appUrl.hostname, sourceHostname)
    : appUrl.hostname === sourceHostname;
  const portMatches = !port || appUrl.port === port;

  return protocolMatches && hostnameMatches && portMatches;
};

export const analyzePreviewHeaders = ({
  headers,
  finalUrl,
  appOrigin,
}: {
  headers: Headers;
  finalUrl: string;
  appOrigin: string;
}): PreviewAnalysisResponse => {
  const xFrameOptionsHeader = headers.get("x-frame-options")?.toLowerCase() ?? "";
  const targetOrigin = new URL(finalUrl).origin;

  if (xFrameOptionsHeader.includes("deny")) {
    return {
      finalUrl,
      embeddable: false,
      mode: "snapshot",
      reason: "x-frame-options",
    };
  }

  if (xFrameOptionsHeader.includes("sameorigin") && appOrigin !== targetOrigin) {
    return {
      finalUrl,
      embeddable: false,
      mode: "snapshot",
      reason: "x-frame-options",
    };
  }

  const frameAncestorsSources = extractFrameAncestorsDirective(
    headers.get("content-security-policy"),
  );

  if (
    frameAncestorsSources.length > 0 &&
    !frameAncestorsSources.some((source) =>
      frameAncestorAllowsOrigin({ source, appOrigin, targetOrigin }),
    )
  ) {
    return {
      finalUrl,
      embeddable: false,
      mode: "snapshot",
      reason: "frame-ancestors",
    };
  }

  return {
    finalUrl,
    embeddable: true,
    mode: "live",
    reason: "ok",
  };
};
