// LOGIN-2: this loading.tsx fires the instant a navigation to
// /dashboard starts — Next.js shows it while the server component
// awaits its parallel backend snapshot (~4 calls, can take a few
// seconds when the VPS warms up cold caches). Without this file the
// browser sat on the previous page (or, freshly after sign-in, on
// nothing) for the full duration; with it, the chrome lands first and
// the data sections fill in once the dashboard page resolves.
//
// Skeleton mirrors the real dashboard's vertical rhythm (stats strip
// → Aven chat → daily brief → market pulse → trades grid) so the
// shift to real content feels like fade-in, not a layout jump.

export default function DashboardLoading() {
  return (
    <main
      id="main"
      className="space-y-8 sm:space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">Loading your dashboard…</p>

      {/* Stats strip — 3 cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>

      {/* Aven chat */}
      <SkeletonCard className="h-64" />

      {/* Daily brief */}
      <SkeletonCard className="h-48" />

      {/* Market pulse — 5 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>

      {/* Trades grid — two columns of cards on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    </main>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-border bg-surface/50 ${className ?? ""}`}
      aria-hidden
    />
  );
}
