import { ImageResponse } from "next/og";

// Programmatic OpenGraph image — 1200×630 PNG rendered server-side
// via @vercel/og. No static asset to maintain; the same JSX as the
// site can be tweaked here.
//
// Twitter shares pick this up too via `app/twitter-image.tsx`,
// which re-exports the same generator.

export const runtime = "edge";
export const alt = "PT System — Aven, your AI trading mentor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #050709 0%, #0a0a0a 60%, #051611 100%)",
          color: "#f5f5f5",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Ambient emerald glow behind the mark */}
        <div
          style={{
            position: "absolute",
            top: 90,
            left: "50%",
            transform: "translateX(-50%)",
            width: 420,
            height: 420,
            borderRadius: 999,
            background:
              "radial-gradient(closest-side, rgba(16,185,129,0.20), rgba(16,185,129,0.04) 60%, transparent 80%)",
            display: "flex",
          }}
        />

        {/* Brand triangle */}
        <svg
          width="140"
          height="128"
          viewBox="0 0 24 22"
          style={{ position: "relative" }}
        >
          <defs>
            <linearGradient id="og-tri" x1="0" y1="0" x2="0" y2="22">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <polygon
            points="12,2.6 21.4,18.8 2.6,18.8"
            fill="url(#og-tri)"
            stroke="url(#og-tri)"
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div
          style={{
            marginTop: 40,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1,
            display: "flex",
          }}
        >
          PT System
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            color: "#a1a1aa",
            display: "flex",
          }}
        >
          Aven · Your AI trading mentor.
        </div>

        <div
          style={{
            marginTop: 50,
            padding: "10px 22px",
            borderRadius: 999,
            border: "1px solid rgba(16,185,129,0.35)",
            background: "rgba(16,185,129,0.08)",
            color: "#34d399",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          14-day free trial
        </div>
      </div>
    ),
    { ...size },
  );
}
