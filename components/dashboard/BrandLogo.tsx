// PT System brand mark — equilateral triangle in the canonical brand-
// green token (#10b981, the same token used by `text-emerald` on the
// landing page). Stroke-linejoin=round + matched-color stroke gives the
// premium rounded-corner feel without the apex looking acute.

export function BrandLogo({ size = 18 }: { size?: number }) {
  const width = (size * 24) / 22; // equilateral aspect ratio
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 24 22"
      fill="none"
      aria-hidden
      role="img"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="ptsys-logo-grad" x1="0" y1="0" x2="0" y2="22">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <polygon
        points="12,2.6 21.4,18.8 2.6,18.8"
        fill="url(#ptsys-logo-grad)"
        stroke="url(#ptsys-logo-grad)"
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
