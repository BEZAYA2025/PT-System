"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRCodeDisplay({
  value,
  size = 220,
  caption,
}: {
  value: string;
  size?: number;
  caption?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-border bg-white p-4">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0a0a0a"
        />
      </div>
      {caption && (
        <p className="text-center text-xs text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}
