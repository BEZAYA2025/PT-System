"use client";

import { useEffect } from "react";

// Round-22c: last-resort error boundary. Catches render errors that
// escape every other segment boundary INCLUDING errors thrown by the
// root layout itself (segment-level `error.tsx` can't catch those).
// Renders its own `<html>` + `<body>` because at this point the root
// layout has failed and can't be reused.
//
// Kept intentionally bare — no theme tokens, no shared classes,
// nothing that requires a live React tree above us. Plain inline
// styling so the fallback works even when the design system's CSS
// hasn't loaded.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global:error-boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
          color: "#f3f4f6",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <main
          style={{
            maxWidth: "28rem",
            width: "100%",
            padding: "2rem",
            borderRadius: "1rem",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              margin: 0,
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(243, 244, 246, 0.7)",
              margin: 0,
              marginBottom: "1.5rem",
            }}
          >
            PT System hit an unexpected error. Try reloading the page —
            most of the time this clears on its own.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily:
                  "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
                fontSize: "0.625rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "rgba(243, 244, 246, 0.4)",
                margin: 0,
                marginBottom: "1.5rem",
              }}
            >
              ref · {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              backgroundColor: "#10b981",
              color: "#0a0a0a",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
