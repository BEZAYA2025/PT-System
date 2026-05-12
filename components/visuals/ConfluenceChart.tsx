"use client";

import { useReducedMotion } from "framer-motion";

// Hero visual for the Wave Riding Method section. A schematic chart with
// three layered elements — Fibonacci levels, an upward trendline, an
// indicator wave — converging on a single emerald glow ("CONFLUENCE").
//
// Pure SVG. Lines draw in via stroke-dashoffset CSS keyframes (defined
// inline in <style>). prefers-reduced-motion freezes them in their final
// state.

const W = 600;
const H = 300;

// Approximate intersection point in viewBox coords.
const FOCUS_X = 380;
const FOCUS_Y = 175;

export function ConfluenceChart() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Confluence: Fibonacci levels, trendline, and indicator converging at one zone"
        className="h-auto w-full"
      >
        <defs>
          <radialGradient id="confluence-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#1f1f1f"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {!reduce && (
          <style>{`
            .draw {
              stroke-dasharray: 1000;
              stroke-dashoffset: 1000;
              animation: confluence-draw 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .draw.d2 { animation-delay: 0.2s; }
            .draw.d3 { animation-delay: 0.4s; }
            .draw.d4 { animation-delay: 0.6s; }
            .draw.d5 { animation-delay: 0.8s; }
            .draw.d6 { animation-delay: 1.0s; }
            @keyframes confluence-draw {
              to { stroke-dashoffset: 0; }
            }
            .focus-pulse {
              animation: confluence-pulse 3s ease-in-out infinite;
              transform-origin: ${FOCUS_X}px ${FOCUS_Y}px;
            }
            @keyframes confluence-pulse {
              0%, 100% { opacity: 0.85; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.08); }
            }
          `}</style>
        )}

        {/* Background grid */}
        <rect width={W} height={H} fill="url(#grid)" opacity="0.5" />

        {/* Fibonacci levels — three horizontal lines */}
        <g>
          <line
            x1="20"
            y1="100"
            x2={W - 20}
            y2="100"
            stroke="#707070"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="draw"
          />
          <text
            x={W - 16}
            y="96"
            fontSize="10"
            fontFamily="monospace"
            fill="#707070"
            textAnchor="end"
          >
            0.382
          </text>

          <line
            x1="20"
            y1="175"
            x2={W - 20}
            y2="175"
            stroke="#10b981"
            strokeWidth="1.5"
            className="draw d2"
          />
          <text
            x={W - 16}
            y="171"
            fontSize="10"
            fontFamily="monospace"
            fill="#10b981"
            textAnchor="end"
          >
            0.618 GP
          </text>

          <line
            x1="20"
            y1="225"
            x2={W - 20}
            y2="225"
            stroke="#707070"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="draw d3"
          />
          <text
            x={W - 16}
            y="221"
            fontSize="10"
            fontFamily="monospace"
            fill="#707070"
            textAnchor="end"
          >
            0.5
          </text>
        </g>

        {/* Trendline (Ray) — diagonal solid + dashed continuation */}
        <line
          x1="40"
          y1="260"
          x2={FOCUS_X}
          y2={FOCUS_Y}
          stroke="#a0a0a0"
          strokeWidth="1.5"
          className="draw d4"
        />
        <line
          x1={FOCUS_X}
          y1={FOCUS_Y}
          x2={W - 40}
          y2="80"
          stroke="#a0a0a0"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.6"
          className="draw d5"
        />

        {/* Indicator mini-wave at bottom */}
        <path
          d={`M 20 270 Q 100 250, 180 268 T 340 260 T 500 268 T ${W - 20} 262`}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.2"
          opacity="0.55"
          className="draw d6"
        />

        {/* Focal glow at the confluence point */}
        <g className={reduce ? undefined : "focus-pulse"}>
          <circle
            cx={FOCUS_X}
            cy={FOCUS_Y}
            r="44"
            fill="url(#confluence-glow)"
          />
          <circle
            cx={FOCUS_X}
            cy={FOCUS_Y}
            r="3.5"
            fill="#10b981"
          />
        </g>

        <text
          x={FOCUS_X}
          y={FOCUS_Y + 70}
          fontSize="10"
          fontFamily="monospace"
          fill="#10b981"
          letterSpacing="2.5"
          textAnchor="middle"
        >
          CONFLUENCE
        </text>
      </svg>
    </div>
  );
}
