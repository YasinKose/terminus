export function App() {
  return (
    <main className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Terminus</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Local terminal workspace. Open a project folder to get started.
        </p>
      </div>
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Open project
      </button>
    </main>
  );
}
