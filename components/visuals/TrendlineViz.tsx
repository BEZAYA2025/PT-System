// Mini trendline chart for the "Trendlines (Rays)" tool card.
// Three swing-point dots, a solid line through them, and a dashed
// emerald projection forward.

const W = 320;
const H = 120;

const points: Array<[number, number]> = [
  [40, 92],
  [110, 70],
  [180, 50],
];

export function TrendlineViz() {
  const last = points[points.length - 1];
  const projectionEnd: [number, number] = [W - 16, last[1] - 28];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Trendline drawn through swing points with emerald projection forward"
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

      {/* Solid line through the 3 swing points */}
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="#a0a0a0"
        strokeWidth="1.4"
      />

      {/* Dashed emerald projection forward */}
      <line
        x1={last[0]}
        y1={last[1]}
        x2={projectionEnd[0]}
        y2={projectionEnd[1]}
        stroke="#10b981"
        strokeWidth="1.4"
        strokeDasharray="4 4"
        opacity="0.85"
      />

      {/* Swing-point dots */}
      {points.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#a0a0a0" />
      ))}

      {/* Subtle endpoint dot in emerald to anchor the eye on the projection */}
      <circle
        cx={projectionEnd[0]}
        cy={projectionEnd[1]}
        r="2.5"
        fill="#10b981"
      />
    </svg>
  );
}
