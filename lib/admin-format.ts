// Browser-safe formatters reused across admin section components.
// All inputs are defensive — null/undefined/invalid all yield "—".

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatUSDCents(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  // Backend may return fraction (0.62) or percentage (62) — read both.
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

export function relativeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const day = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (day < 1) {
    const hr = Math.max(1, Math.floor(diff / 3_600_000));
    return `${hr}h ago`;
  }
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}

// Group items by UTC calendar day. Items are bucketed into [day, items[]]
// pairs sorted newest-first; items without a parseable timestamp are
// dropped (caller is responsible for showing an "undated" tail if it
// wants one). Used by feed-style tabs (Activity, Audit-Log) so a long
// flat list becomes day-headed chunks the eye can scan.
export function bucketByDay<T>(
  items: readonly T[],
  getTs: (item: T) => string | null | undefined,
): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const ts = getTs(item);
    if (!ts) continue;
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) continue;
    const day = new Date(t).toISOString().slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(item);
    map.set(day, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
}

export function formatDayHeader(day: string): string {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (day === todayIso) return "Today";
  const yesterdayIso = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (day === yesterdayIso) return "Yesterday";
  const dt = new Date(`${day}T00:00:00Z`);
  const sameYear = dt.getUTCFullYear() === new Date().getUTCFullYear();
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Trigger a browser download of arbitrary text content. Used by the
 * audit-log + members CSV export buttons.
 */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8;",
): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
