// Tiny formatting helpers shared across dashboard surfaces.

export function timeAgo(input: string | Date): string {
  let date: Date;
  try {
    date = input instanceof Date ? input : new Date(input);
  } catch {
    return "";
  }
  if (Number.isNaN(date.getTime())) return "";

  const ms = Date.now() - date.getTime();
  if (ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
