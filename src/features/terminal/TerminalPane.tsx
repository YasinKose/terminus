import type { PtyApi } from "@/lib/tauri/pty";
import type { TerminalRuntimeRegistry } from "@/features/terminal/runtime";
import { TerminalHost } from "./TerminalHost";
import { TerminalStatus } from "./TerminalStatus";
import { useTerminalStore } from "./terminalStore";
import { cn } from "@/lib/utils/cn";

export type TerminalPaneProps = {
  sessionId: string;
  projectId: string;
  title?: string;
  profileId?: string | null;
  initialCwd?: string | null;
  tmuxSession?: string | null;
  cols?: number;
  rows?: number;
  focused?: boolean;
  registry?: TerminalRuntimeRegistry;
  ptyApi?: PtyApi;
  onRequestClose?: () => void;
  showChrome?: boolean;
};

export function TerminalPane({
  sessionId,
  projectId,
  title = "Terminal",
  profileId = null,
  initialCwd = null,
  tmuxSession = null,
  cols,
  rows,
  focused = false,
  registry,
  ptyApi,
  onRequestClose,
  showChrome = true,
}: TerminalPaneProps) {
  const session = useTerminalStore((s) => s.sessions[sessionId]);
  const markStarting = useTerminalStore((s) => s.markStarting);
  const resetActivity = useTerminalStore((s) => s.resetActivity);
  const status = session?.status ?? "starting";
  const displayTitle = session?.title || title;
  const exitCode = session?.exitCode ?? null;
  const errorMessage = session?.error?.message ?? null;
  const activity = session?.activity ?? "quiet";
  const unread = session?.unread ?? false;
  const attention = session?.attention ?? false;
  const restartCwd = session?.cwd ?? initialCwd;

  const handleRestart = () => {
    if (!ptyApi) return;
    markStarting(sessionId);
    resetActivity(sessionId);
    void ptyApi.restartPty(
      {
        sessionId,
        projectId,
        profileId,
        cols: cols ?? 80,
        rows: rows ?? 24,
        initialCwd: restartCwd,
        tmuxSession,
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
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-surface-sunken",
        showChrome && "border border-border",
      )}
    >
      {showChrome ? (
        <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-chrome px-2 text-xs text-muted-foreground">
          <TerminalStatus
            status={status}
            activity={activity}
            unread={unread}
            attention={attention}
            title={displayTitle}
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <span className="tabular-nums opacity-70">{status}</span>
            {onRequestClose ? (
              <button
                type="button"
                data-testid={`close-terminal-${sessionId}`}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
                aria-label="Close terminal"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestClose();
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        <TerminalHost
          sessionId={sessionId}
          projectId={projectId}
          profileId={profileId}
          initialCwd={initialCwd}
          tmuxSession={tmuxSession}
          cols={cols}
          rows={rows}
          focused={focused}
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
