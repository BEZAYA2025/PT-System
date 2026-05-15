import { IconSparkles } from "@tabler/icons-react";

interface Props {
  size?: number;
  online?: boolean;
  /** Slow scale-pulse ("breathing") — adds aliveness on the prominent
   *  AvenChat header avatar. Off by default for inline / list usage. */
  breath?: boolean;
}

export function AvenAvatar({
  size = 36,
  online = true,
  breath = false,
}: Props) {
  const sizeClass = `size-[${size}px]`;
  const ringSize = size + 4;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: ringSize, height: ringSize }}
    >
      {online && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-emerald/30"
          style={{ animationDuration: "2.5s" }}
        />
      )}
      <span
        className={`${sizeClass} relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-emerald to-emerald-hover text-background shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]`}
        style={{
          width: size,
          height: size,
          animation: breath ? "avenBreath 4s ease-in-out infinite" : undefined,
        }}
      >
        <IconSparkles size={size * 0.5} stroke={2} />
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
