// Aven brand avatar. Four inline-SVG variants — flip AVEN_VARIANT below
// to preview each (zero-network swap). All variants live in the brand-
// green family (#10b981 ↔ #34d399 ↔ #a7f3d0) so the identity stays
// consistent with the PT logo regardless of which glyph wins.
//   - prism   (default): equilateral triangle face with depth shading,
//                        echoes the PT logo's triangle identity.
//   - eye             : geometric almond + iris — "AI vision".
//   - monogram        : custom "A" with cut-out triangle.
//   - crystal         : faceted diamond with reflective gradient.

type AvenVariant = "prism" | "eye" | "monogram" | "crystal";

const AVEN_VARIANT: AvenVariant = "prism";

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
  const ringSize = size + 8;

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
            className="absolute inset-1 animate-ping rounded-full bg-emerald/20"
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Aven"
    >
      {variant === "prism" && <PrismGlyph />}
      {variant === "eye" && <EyeGlyph />}
      {variant === "monogram" && <MonogramGlyph />}
      {variant === "crystal" && <CrystalGlyph />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant glyphs
// ---------------------------------------------------------------------------

function PrismGlyph() {
  return (
    <>
      <defs>
        <linearGradient id="aven-prism-face" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="aven-prism-shade" x1="0" y1="0" x2="32" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="#0a0a0a" />
      <polygon
        points="16,7 25,23 7,23"
        fill="url(#aven-prism-face)"
        stroke="url(#aven-prism-face)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <polygon
        points="16,7 25,23 7,23"
        fill="url(#aven-prism-shade)"
      />
      <polyline
        points="16,7 25,23"
        stroke="#a7f3d0"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.85"
      />
    </>
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
      <circle cx="16" cy="16" r="16" fill="#0a0a0a" />
      <path
        d="M3.5 16 Q16 6 28.5 16 Q16 26 3.5 16 Z"
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="5" fill="url(#aven-eye-iris)" />
      <circle cx="16" cy="16" r="1.7" fill="#0a0a0a" />
      <circle
        cx="14.2"
        cy="14.2"
        r="0.95"
        fill="rgba(255,255,255,0.55)"
      />
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
        // Outer "A" silhouette + inner triangular cut-out, evenodd punches
        // the cut-out so the gradient bg shows through.
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
      <circle cx="16" cy="16" r="16" fill="#0a0a0a" />
      <polygon
        points="16,5 25,16 16,27 7,16"
        fill="url(#aven-crystal-face)"
      />
      <polygon
        points="16,5 21,12 16,16 11,12"
        fill="rgba(255,255,255,0.14)"
      />
      <line
        x1="7"
        y1="16"
        x2="25"
        y2="16"
        stroke="rgba(167,243,208,0.55)"
        strokeWidth="0.5"
      />
      <line
        x1="16"
        y1="5"
        x2="16"
        y2="27"
        stroke="rgba(0,0,0,0.32)"
        strokeWidth="0.4"
      />
    </>
  );
}
