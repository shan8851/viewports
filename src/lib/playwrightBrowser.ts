import type { Browser } from "playwright";
import { chromium } from "playwright";

let browserPromise: Promise<Browser> | null = null;

export const getSharedBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
      headless: true,
    });
  }

  return browserPromise;
};
