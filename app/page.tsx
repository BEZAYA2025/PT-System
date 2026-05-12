export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          PT System
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Coming soon.
        </p>
      </div>
      <footer className="fixed bottom-6 left-0 right-0 flex justify-center">
        <p className="font-mono text-xs text-muted-foreground">
          Phase 1 deployed · Building
        </p>
      </footer>
    </main>
  );
}
