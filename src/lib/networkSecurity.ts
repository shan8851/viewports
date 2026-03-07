import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { PreviewError } from "@/lib/previewErrors";
import { normalizeUrlInput } from "@/lib/url";

const IPV4_PREFIXES = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.0\.0\./,
  /^192\.168\./,
  /^198\.(1[8-9])\./,
  /^198\.(2\d|3[0-1])\./,
];

const isPrivateIpv4 = (ipAddress: string): boolean =>
  IPV4_PREFIXES.some((pattern) => pattern.test(ipAddress)) ||
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ipAddress);

const isPrivateIpv6 = (ipAddress: string): boolean => {
  const normalizedIpAddress = ipAddress.toLowerCase();

  return (
    normalizedIpAddress === "::1" ||
    normalizedIpAddress === "::" ||
    normalizedIpAddress.startsWith("fc") ||
    normalizedIpAddress.startsWith("fd") ||
    normalizedIpAddress.startsWith("fe8") ||
    normalizedIpAddress.startsWith("fe9") ||
    normalizedIpAddress.startsWith("fea") ||
    normalizedIpAddress.startsWith("feb")
  );
};

export const isPrivateIpAddress = (ipAddress: string): boolean => {
  const ipVersion = isIP(ipAddress);

  if (ipVersion === 4) {
    return isPrivateIpv4(ipAddress);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(ipAddress);
  }

  return false;
};

const isBlockedHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname.endsWith(".localhost");

export const assertSafePreviewUrl = async (candidateUrl: string): Promise<string> => {
  const normalizedUrl = normalizeUrlInput(candidateUrl);
  const parsedUrl = new URL(normalizedUrl);

  if (isBlockedHostname(parsedUrl.hostname) || isPrivateIpAddress(parsedUrl.hostname)) {
    throw new PreviewError(
      "ssrf-blocked",
      400,
      "Private or local network addresses are not allowed.",
    );
  }

  const resolvedAddresses = await lookup(parsedUrl.hostname, { all: true, verbatim: true }).catch(
    () => [],
  );

  if (resolvedAddresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new PreviewError(
      "ssrf-blocked",
      400,
      "Private or local network addresses are not allowed.",
    );
  }

  return normalizedUrl;
};
