// Today's Brief avatar — distinct from Aven so the two surfaces don't
// blur into one identity. Sunrise-geometric: amber half-sun crossing a
// horizon, evoking morning briefing.

interface Props {
  size?: number;
}

export function BriefAvatar({ size = 36 }: Props) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full shadow-[0_0_20px_-6px_rgba(251,191,36,0.45)]"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        role="img"
        aria-label="Daily brief"
      >
        <defs>
          <linearGradient
            id="brief-bg"
            x1="0"
            y1="0"
            x2="0"
            y2="32"
          >
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <radialGradient id="brief-sun" cx="0.5" cy="0.4" r="0.5">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="url(#brief-bg)" />
        {/* Half sun rising */}
        <path
          d="M9 21 A7 7 0 0 1 23 21 Z"
          fill="url(#brief-sun)"
        />
        {/* Horizon line */}
        <line
          x1="5"
          y1="21"
          x2="27"
          y2="21"
          stroke="#fbbf24"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Three rays */}
        <line
          x1="16"
          y1="9"
          x2="16"
          y2="12"
          stroke="#fbbf24"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="9.5"
          y1="13"
          x2="11.5"
          y2="15"
          stroke="#fbbf24"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <line
          x1="22.5"
          y1="13"
          x2="20.5"
          y2="15"
          stroke="#fbbf24"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
