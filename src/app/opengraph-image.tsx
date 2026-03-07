import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Shan Viewports — Multi-viewport preview tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#111111",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e4e4e4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span style={{ color: "#e4e4e4", fontSize: "64px", fontWeight: 700 }}>
            Shan Viewports
          </span>
        </div>
        <span style={{ color: "#777777", fontSize: "28px" }}>
          Preview any site across mobile, tablet, and desktop
        </span>
        <span style={{ color: "#444444", fontSize: "20px", marginTop: "16px" }}>
          viewports.shan8851.com
        </span>
      </div>
    ),
    { ...size },
  );
}
