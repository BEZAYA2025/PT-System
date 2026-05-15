// Aven brand avatar — Round 11 identity-consolidation: the avatar is
// now the same emerald triangle as the BrandLogo (no dark background
// circle), wrapped in concentric pulse-rings + a soft halo so it reads
// as "alive". Single visual language: the PT triangle ↔ Aven mark.
//
// The eye / monogram / crystal variants from Round 10 are parked below
// — flip AVEN_VARIANT to revisit them. Default ships as "triangle".

type AvenVariant = "triangle" | "eye" | "monogram" | "crystal";

const AVEN_VARIANT: AvenVariant = "triangle";

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
  const ringSize = size + 10;
  const isTriangle = AVEN_VARIANT === "triangle";

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: ringSize, height: ringSize }}
    >
      {/* Halo + pulse rings — drawn around the bounding box. For the
          triangle variant the rings sit on transparent space (the
          triangle floats inside them); for the parked legacy variants
          they hug the dark disc as before. */}
      {online && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-emerald/30"
            style={{ animationDuration: "2.6s" }}
          />
          <span
            aria-hidden
            className="absolute inset-1 animate-ping rounded-full bg-emerald/20"
            style={{ animationDuration: "3.6s", animationDelay: "0.6s" }}
          />
          {isTriangle && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-emerald/10 blur-md"
            />
          )}
        </>
      )}

      <span
        className={[
          "relative inline-flex shrink-0 items-center justify-center",
          isTriangle
            ? ""
            : "rounded-full shadow-[0_0_28px_-6px_rgba(16,185,129,0.7),inset_0_0_12px_-2px_rgba(110,231,183,0.4)]",
        ].join(" ")}
        style={{
          width: size,
          height: size,
          animation: breath ? "avenBreath 4s ease-in-out infinite" : undefined,
        }}
      >
        {AVEN_VARIANT === "triangle" && <TriangleGlyph size={size} />}
        {AVEN_VARIANT === "eye" && <FullDiscGlyph size={size}><EyeGlyph /></FullDiscGlyph>}
        {AVEN_VARIANT === "monogram" && <FullDiscGlyph size={size}><MonogramGlyph /></FullDiscGlyph>}
        {AVEN_VARIANT === "crystal" && <FullDiscGlyph size={size}><CrystalGlyph /></FullDiscGlyph>}
      </span>

      {breath && (
        <style>{`
          @keyframes avenBreath {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
        `}</style>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Default — naked triangle, identical visual language to BrandLogo. Sized
// to fill the bounding box; rendered with stroke-linejoin=round so the
// apex never reads acute (matches the rounded-corner logo treatment).
// ---------------------------------------------------------------------------

function TriangleGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Aven"
      style={{ filter: "drop-shadow(0 0 8px rgba(16,185,129,0.55))" }}
    >
      <defs>
        <linearGradient id="aven-tri-grad" x1="0" y1="0" x2="0" y2="32">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <polygon
        points="16,4 28.5,26 3.5,26"
        fill="url(#aven-tri-grad)"
        stroke="url(#aven-tri-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Parked legacy variants — wrapped in a dark disc bg so they still read
// as a self-contained mark when re-enabled. Not rendered by default.
// ---------------------------------------------------------------------------

function FullDiscGlyph({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Aven"
    >
      <circle cx="16" cy="16" r="16" fill="#0a0a0a" />
      {children}
    </svg>
  );
}

function EyeGlyph() {
  return (
    <>
      <defs>
        <radialGradient id="aven-eye-iris" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="60%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </radialGradient>
      </defs>
      <path
        d="M3.5 16 Q16 6 28.5 16 Q16 26 3.5 16 Z"
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="5" fill="url(#aven-eye-iris)" />
      <circle cx="16" cy="16" r="1.7" fill="#0a0a0a" />
      <circle cx="14.2" cy="14.2" r="0.95" fill="rgba(255,255,255,0.55)" />
    </>
  );
}

function MonogramGlyph() {
  return (
    <>
      <defs>
        <linearGradient id="aven-mono-bg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#aven-mono-bg)" />
      <path
        d="M16 7.5 L24 24 L20.5 24 L19 21 L13 21 L11.5 24 L8 24 Z M14.2 18.5 L17.8 18.5 L16 14.5 Z"
        fill="#0a0a0a"
        fillRule="evenodd"
        opacity="0.92"
      />
    </>
  );
}

function CrystalGlyph() {
  return (
    <>
      <defs>
        <linearGradient id="aven-crystal-face" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <polygon points="16,5 25,16 16,27 7,16" fill="url(#aven-crystal-face)" />
      <polygon points="16,5 21,12 16,16 11,12" fill="rgba(255,255,255,0.14)" />
      <line x1="7" y1="16" x2="25" y2="16" stroke="rgba(167,243,208,0.55)" strokeWidth="0.5" />
      <line x1="16" y1="5" x2="16" y2="27" stroke="rgba(0,0,0,0.32)" strokeWidth="0.4" />
    </>
  );
}
