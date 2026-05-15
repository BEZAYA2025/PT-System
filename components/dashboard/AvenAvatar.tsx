// Aven brand avatar. Three SVG variants — flip AVEN_VARIANT below to
// preview "crystal" or "monogram"; "wave" is the default. Each variant
// is fully inline (zero network cost on swap). Today's Brief uses a
// distinct BriefAvatar so the two surfaces don't blur into one identity.

type AvenVariant = "wave" | "crystal" | "monogram";

const AVEN_VARIANT: AvenVariant = "wave";

interface Props {
  size?: number;
  online?: boolean;
  /** Slow scale-pulse — adds aliveness on the prominent header avatar. */
  breath?: boolean;
}

export function AvenAvatar({
  size = 36,
  online = true,
  breath = false,
}: Props) {
  const ringSize = size + 6;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: ringSize, height: ringSize }}
    >
      {online && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-emerald/30"
            style={{ animationDuration: "2.6s" }}
          />
          <span
            aria-hidden
            className="absolute inset-1 animate-ping rounded-full bg-cyan-400/20"
            style={{ animationDuration: "3.6s", animationDelay: "0.6s" }}
          />
        </>
      )}
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-full shadow-[0_0_28px_-6px_rgba(16,185,129,0.7),inset_0_0_12px_-2px_rgba(110,231,183,0.4)]"
        style={{
          width: size,
          height: size,
          animation: breath ? "avenBreath 4s ease-in-out infinite" : undefined,
        }}
      >
        <AvenSvg variant={AVEN_VARIANT} size={size} />
      </span>
      {breath && (
        <style>{`
          @keyframes avenBreath {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      )}
    </span>
  );
}

function AvenSvg({ variant, size }: { variant: AvenVariant; size: number }) {
  // Same emerald → cyan → emerald gradient across variants so the swap
  // changes only the foreground glyph, never the brand colour identity.
  const gradId = `aven-grad-${variant}`;
  const haloId = `aven-halo-${variant}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Aven"
    >
      <defs>
        <radialGradient id={gradId} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#10b981" />
        </radialGradient>
        <radialGradient id={haloId} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#${gradId})`} />
      <circle cx="16" cy="14" r="14" fill={`url(#${haloId})`} />

      {variant === "wave" && (
        // Sine wave — market rhythm meeting AI; minimal, calm.
        <path
          d="M5 17 Q9 11, 13 17 T21 17 T27 17"
          stroke="#0a0a0a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />
      )}

      {variant === "crystal" && (
        // Diamond / crystal — facetted "AI mind" mark.
        <>
          <path
            d="M16 6 L24 15 L16 26 L8 15 Z"
            fill="rgba(10,10,10,0.85)"
            stroke="#0a0a0a"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path d="M8 15 L24 15" stroke="#6ee7b7" strokeWidth="0.7" />
          <path
            d="M16 6 L16 26"
            stroke="#6ee7b7"
            strokeWidth="0.6"
            opacity="0.6"
          />
        </>
      )}

      {variant === "monogram" && (
        // Stylized "A" — apex up, crossbar — recalls the brand triangle.
        <>
          <path
            d="M16 8 L23 24 L9 24 Z"
            stroke="#0a0a0a"
            strokeWidth="1.8"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M12.5 19.5 L19.5 19.5"
            stroke="#0a0a0a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
