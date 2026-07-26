import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  WorkbenchEmptyState,
  WorkbenchPanel,
  WorkbenchSectionHeader,
} from "@/components/workbench/WorkbenchPanel";
import { createTerminalLeaf, type PaneNode } from "@/features/panes/model";
import { collectTerminalIds, splitPane } from "@/features/panes/tree";
import { useTmuxStore } from "@/features/tmux/tmuxStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { reportError } from "@/lib/errors";
import type { TmuxSession } from "@/lib/tauri/tmux";
import {
  FolderOpen,
  Layers,
  Link2,
  SquareTerminal,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      reportError(t("errors.attachTmux"), t("errors.noActiveWorkspace"));
      return;
    }
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!ws) {
      reportError(t("errors.attachTmux"), t("errors.workspaceNotFound"));
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
        reportError(t("errors.attachTmux"), split.error);
        return;
      }
      await saveWorkspace({
        ...ws,
        rootJson: JSON.stringify(split.value),
        activePaneId: leaf.id,
        updatedAt: Date.now(),
      });
    } catch (error) {
      reportError(t("errors.attachTmux"), error);
    }
  };

  return (
    <WorkbenchPanel
      label="tmux"
      icon={<Layers className="size-3.5" />}
      count={sessions.length}
      loading={loading}
      onRefresh={() => void refresh()}
      onClose={onClose}
    >
      {!projectId ? (
        <WorkbenchEmptyState
          icon={<FolderOpen className="size-4" aria-hidden />}
          title={t("tmux.noProjectTitle")}
          body={t("tmux.noProjectBody")}
        />
      ) : detectInfo && !detectInfo.available ? (
        <WorkbenchEmptyState
          icon={<SquareTerminal className="size-4" aria-hidden />}
          title={t("tmux.notFoundTitle")}
          body={t("tmux.notFoundBody")}
        />
      ) : (
        <>
          <div className="border-b border-border/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("tmux.localOnly")}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {t("tmux.description")}
            </p>
            {detectInfo?.path ? (
              <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
                {detectInfo.version ?? "tmux"} · {detectInfo.path}
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section>
              <WorkbenchSectionHeader
                title={t("tmux.sessions")}
                count={sessions.length}
              />
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <p className="text-sm font-medium">
                    {t("tmux.noSessions")}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t("tmux.noSessionsHelp")}
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
                            {t("tmux.sessionMeta", {
                              windows: session.windows,
                              attached: session.attached,
                            })}
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
                          {t("tmux.attach")}
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
    </WorkbenchPanel>
  );
}
