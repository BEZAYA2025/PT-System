// Mini Fibonacci-levels chart for the WaveRiding "Fibonacci" tool card.
// Pure SVG. No animation.

const W = 320;
const H = 120;

const levels = [
  { label: "0.236", y: 18, dim: true },
  { label: "0.382", y: 38, dim: true },
  { label: "0.5", y: 58, dim: true },
  { label: "0.618", y: 78, gp: true },
  { label: "0.65", y: 98, gp: true },
];

export function FibLevelsViz() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Fibonacci retracement levels with Golden Pocket highlighted"
      className="h-auto w-full"
    >
      <rect
        x="0"
        y="0"
        width={W}
        height={H}
        fill="#0a0a0a"
        stroke="#1f1f1f"
        strokeWidth="0.5"
        rx="4"
      />

      {/* Highlight band for Golden Pocket */}
      <rect x="8" y="76" width={W - 16} height="24" fill="#10b981" opacity="0.06" />

      {levels.map((l) => (
        <g key={l.label}>
          <line
            x1="8"
            y1={l.y}
            x2={W - 56}
            y2={l.y}
            stroke={l.gp ? "#10b981" : "#707070"}
            strokeWidth={l.gp ? 1.4 : 1}
            strokeDasharray={l.dim ? "3 3" : undefined}
            opacity={l.dim ? 0.55 : 1}
          />
          <text
            x={W - 48}
            y={l.y + 3}
            fontSize="9"
            fontFamily="monospace"
            fill={l.gp ? "#10b981" : "#707070"}
          >
            {l.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
