import type { PtyApi } from "@/lib/tauri/pty";
import type { TerminalRuntimeRegistry } from "@/features/terminal/runtime";
import { TerminalHost } from "./TerminalHost";
import { useTerminalStore } from "./terminalStore";

export type TerminalPaneProps = {
  sessionId: string;
  projectId: string;
  title?: string;
  profileId?: string | null;
  initialCwd?: string | null;
  cols?: number;
  rows?: number;
  registry?: TerminalRuntimeRegistry;
  ptyApi?: PtyApi;
};

export function TerminalPane({
  sessionId,
  projectId,
  title = "Terminal",
  profileId = null,
  initialCwd = null,
  cols,
  rows,
  registry,
  ptyApi,
}: TerminalPaneProps) {
  const session = useTerminalStore((s) => s.sessions[sessionId]);
  const markStarting = useTerminalStore((s) => s.markStarting);
  const status = session?.status ?? "starting";
  const displayTitle = session?.title || title;
  const exitCode = session?.exitCode ?? null;
  const errorMessage = session?.error?.message ?? null;

  const handleRestart = () => {
    if (!ptyApi) return;
    markStarting(sessionId);
    void ptyApi.restartPty(
      {
        sessionId,
        projectId,
        profileId,
        cols: cols ?? 80,
        rows: rows ?? 24,
        initialCwd,
      },
      (event) => {
        const store = useTerminalStore.getState();
        switch (event.event) {
          case "started":
            store.markRunning(sessionId);
            break;
          case "output": {
            const runtime = registry?.get(sessionId);
            runtime?.write(event.data.data);
            break;
          }
          case "exited":
            store.markExited(sessionId, event.data.code);
            break;
          case "error":
            store.markError(sessionId, event.data.error);
            break;
        }
      },
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border border-border bg-background">
      <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-border px-2 text-xs text-muted-foreground">
        <span className="truncate font-medium text-foreground">
          {displayTitle}
        </span>
        <span className="shrink-0 tabular-nums opacity-70">{status}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <TerminalHost
          sessionId={sessionId}
          projectId={projectId}
          profileId={profileId}
          initialCwd={initialCwd}
          cols={cols}
          rows={rows}
          registry={registry}
          ptyApi={ptyApi}
        />
        {(status === "exited" || status === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {status === "exited"
                ? `Process exited${exitCode !== null ? ` with code ${exitCode}` : ""}.`
                : (errorMessage ?? "Terminal error")}
            </p>
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={handleRestart}
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
