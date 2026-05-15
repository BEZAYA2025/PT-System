// PT System brand mark — emerald upward-pointing triangle, ~text-height.
// Inline SVG so we don't need an asset round-trip.

export function BrandLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={(size * 14) / 16}
      height={size}
      viewBox="0 0 14 16"
      fill="none"
      aria-hidden
      role="img"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="ptsys-logo-grad" x1="0" y1="0" x2="0" y2="16">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path
        d="M7 1.5 L13 14.5 L1 14.5 Z"
        fill="url(#ptsys-logo-grad)"
        stroke="#10b981"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
