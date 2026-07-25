import { useEffect } from "react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import { createTerminalLeaf, type PaneNode } from "@/features/panes/model";
import { collectTerminalIds, splitPane } from "@/features/panes/tree";
import { useTmuxStore } from "@/features/tmux/tmuxStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { reportError } from "@/lib/errors";
import type { TmuxSession } from "@/lib/tauri/tmux";
import { cn } from "@/lib/utils/cn";
import {
  FolderOpen,
  Layers,
  Link2,
  RefreshCw,
  SquareTerminal,
  X,
} from "lucide-react";

export type TmuxPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

function parseRoot(rootJson: string | null): PaneNode | null {
  if (!rootJson) return null;
  try {
    return JSON.parse(rootJson) as PaneNode;
  } catch {
    return null;
  }
}

export function TmuxPanel({ projectId, open, onClose }: TmuxPanelProps) {
  const detectInfo = useTmuxStore((s) => s.detectInfo);
  const sessions = useTmuxStore((s) => s.sessions);
  const loading = useTmuxStore((s) => s.loading);
  const refresh = useTmuxStore((s) => s.refresh);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const attach = async (session: TmuxSession) => {
    if (!activeWorkspaceId) {
      reportError("Could not attach tmux session", "No active workspace");
      return;
    }
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!ws) {
      reportError("Could not attach tmux session", "Workspace not found");
      return;
    }
    try {
      let root = parseRoot(ws.rootJson);
      const leaf = createTerminalLeaf(crypto.randomUUID(), {
        initialCwd: "",
        titleOverride: `tmux: ${session.name}`,
        tmuxSession: session.name,
      });
      if (!root) {
        root = leaf;
        await saveWorkspace({
          ...ws,
          rootJson: JSON.stringify(root),
          activePaneId: leaf.id,
          updatedAt: Date.now(),
        });
        return;
      }
      const targetId = ws.activePaneId ?? collectTerminalIds(root)[0];
      if (!targetId) {
        await saveWorkspace({
          ...ws,
          rootJson: JSON.stringify(leaf),
          activePaneId: leaf.id,
          updatedAt: Date.now(),
        });
        return;
      }
      const split = splitPane(root, targetId, "row", leaf, crypto.randomUUID());
      if (!split.ok) {
        reportError("Could not attach tmux session", split.error);
        return;
      }
      await saveWorkspace({
        ...ws,
        rootJson: JSON.stringify(split.value),
        activePaneId: leaf.id,
        updatedAt: Date.now(),
      });
    } catch (error) {
      reportError("Could not attach tmux session", error);
    }
  };

  return (
    <aside
      className="flex h-full w-[min(20.5rem,100%)] shrink-0 flex-col border-l border-border/90 bg-chrome"
      aria-label="tmux"
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-2.5">
        <div className="flex min-w-0 items-center gap-2 pl-0.5">
          <Layers className="size-3.5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-foreground">tmux</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {sessions.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton
            label="Refresh"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
              aria-hidden
            />
          </ToolbarIconButton>
          <ToolbarIconButton label="Close tmux panel" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </ToolbarIconButton>
        </div>
      </header>

      {!projectId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-muted-foreground">
            <FolderOpen className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-medium">No project selected</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Open a project to attach tmux sessions into a workspace pane.
          </p>
        </div>
      ) : detectInfo && !detectInfo.available ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-muted-foreground">
            <SquareTerminal className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-medium">tmux not found</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Install tmux and ensure it is on PATH, or set TMUX_BIN.
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-border/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Local attach only
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Opt-in: opens a pane with{" "}
              <span className="font-mono text-foreground/80">tmux attach -t</span>
              . No Terminus daemon.
            </p>
            {detectInfo?.path ? (
              <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
                {detectInfo.version ?? "tmux"} · {detectInfo.path}
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section>
              <div className="sticky top-0 z-[1] flex h-8 items-center border-b border-border/60 bg-chrome/95 px-3 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Sessions
                </span>
              </div>
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <p className="text-sm font-medium">No sessions</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Start one with{" "}
                    <span className="font-mono text-foreground/80">
                      tmux new -s name
                    </span>
                    .
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50 p-1.5">
                  {sessions.map((session) => (
                    <li key={session.name}>
                      <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-raised">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs font-medium text-foreground">
                            {session.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {session.windows} win · {session.attached} attached
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => void attach(session)}
                          disabled={!activeWorkspaceId || loading}
                        >
                          <Link2 className="size-3.5" aria-hidden />
                          Attach
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </aside>
  );
}
