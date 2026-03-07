import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shan Viewports",
  description: "Preview any site across mobile, tablet, and desktop viewports.",
  metadataBase: new URL("https://viewports.shan8851.com"),
  openGraph: {
    title: "Shan Viewports",
    description: "Preview any site across mobile, tablet, and desktop viewports.",
    url: "https://viewports.shan8851.com",
    siteName: "Shan Viewports",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shan Viewports",
    description: "Preview any site across mobile, tablet, and desktop viewports.",
    creator: "@shan8851",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html lang="en">
      <body className={jetbrainsMono.variable}>
        {children}
      </body>
    </html>
  );
}
