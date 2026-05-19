import { ImageResponse } from "next/og";

// Apple-touch icon — 180×180 PNG generated server-side via @vercel/og.
// Used when iOS users add the site to their home screen, when Safari
// renders bookmarks / tab previews, and as the high-resolution PNG
// fallback for browsers that don't render the SVG favicon.
//
// Same emerald triangle as the SVG favicon, sized up with a slightly
// thicker stroke so the mark stays crisp at icon-grid resolution.

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          // iOS clips Apple-touch icons to a rounded square anyway,
          // but we draw a full circle ourselves via the SVG below so
          // browsers / surfaces that don't clip still see a round
          // mark.
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <defs>
            <linearGradient
              id="apple-icon-tri"
              x1="0"
              y1="0"
              x2="0"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="#000000" />
          <polygon
            points="16,8 23,20 9,20"
            fill="url(#apple-icon-tri)"
            stroke="url(#apple-icon-tri)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
