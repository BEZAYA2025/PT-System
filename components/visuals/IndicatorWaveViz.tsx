// Mini RSI-style indicator wave for the "Indicators" tool card.
// Includes a centered axis line, an oscillating wave, an emerald
// peak highlight, and a small histogram strip below.

const W = 320;
const H = 120;
const AXIS_Y = 55;

export function IndicatorWaveViz() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="RSI-style oscillator with emerald peak and histogram bars"
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

      {/* Centered axis */}
      <line
        x1="8"
        y1={AXIS_Y}
        x2={W - 8}
        y2={AXIS_Y}
        stroke="#1f1f1f"
        strokeWidth="0.8"
      />

      {/* Oscillator wave */}
      <path
        d={`M 12 ${AXIS_Y} Q 50 ${AXIS_Y - 30}, 90 ${AXIS_Y} T 170 ${AXIS_Y} T 250 ${AXIS_Y} T ${W - 12} ${AXIS_Y}`}
        fill="none"
        stroke="#a0a0a0"
        strokeWidth="1.4"
      />

      {/* Emerald-highlighted peak */}
      <circle cx="170" cy={AXIS_Y - 30} r="3.5" fill="#10b981" />
      <circle
        cx="170"
        cy={AXIS_Y - 30}
        r="9"
        fill="#10b981"
        opacity="0.18"
      />

      {/* Histogram bars below */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const x = 14 + i * 24;
        const heights = [4, 6, 9, 12, 8, 5, 7, 10, 14, 11, 7, 4];
        const h = heights[i];
        const isAccent = i === 8;
        return (
          <rect
            key={i}
            x={x}
            y={H - 14 - h}
            width="6"
            height={h}
            fill={isAccent ? "#10b981" : "#3a3a3a"}
            opacity={isAccent ? 0.85 : 0.7}
          />
        );
      })}
    </svg>
  );
}
