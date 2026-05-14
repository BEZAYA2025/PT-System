import { IconSparkles } from "@tabler/icons-react";

interface Props {
  size?: number;
  online?: boolean;
}

export function AvenAvatar({ size = 36, online = true }: Props) {
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
        style={{ width: size, height: size }}
      >
        <IconSparkles size={size * 0.5} stroke={2} />
      </span>
    </span>
  );
}
