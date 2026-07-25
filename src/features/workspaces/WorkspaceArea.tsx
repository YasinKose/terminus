import { useCallback, useEffect } from "react";
import type { WorkspaceView } from "@/lib/tauri/contracts";
import { createTerminalLeaf, type PaneNode } from "@/features/panes/model";
import { PaneTree } from "@/features/panes/PaneTree";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";

function parseRoot(rootJson: string | null): PaneNode | null {
  if (!rootJson) return null;
  try {
    return JSON.parse(rootJson) as PaneNode;
  } catch {
    return null;
  }
}

export type WorkspaceAreaProps = {
  projectId: string;
  workspaces: WorkspaceView[];
  activeWorkspaceId: string | null;
};

export function WorkspaceArea({
  projectId,
  workspaces,
  activeWorkspaceId,
}: WorkspaceAreaProps) {
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);

  const initialized = workspaces.filter((w) => w.initialized);

  useEffect(() => {
    const active = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!active || !active.initialized) return;
    if (active.rootJson) return;

    const leafId = crypto.randomUUID();
    const root = createTerminalLeaf(leafId, { initialCwd: "" });
    const next = {
      ...active,
      rootJson: JSON.stringify(root),
      activePaneId: leafId,
    };
    void saveWorkspace(next);
  }, [activeWorkspaceId, workspaces, saveWorkspace]);

  const handleTreeChange = useCallback(
    (workspace: WorkspaceView, next: PaneNode) => {
      void saveWorkspace({
        ...workspace,
        rootJson: JSON.stringify(next),
      });
    },
    [saveWorkspace],
  );

  const handleActivatePane = useCallback(
    (workspace: WorkspaceView, paneId: string) => {
      if (workspace.activePaneId === paneId) return;
      void saveWorkspace({
        ...workspace,
        activePaneId: paneId,
      });
    },
    [saveWorkspace],
  );

  if (initialized.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a workspace to start a terminal.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      {initialized.map((ws) => {
        const visible = ws.id === activeWorkspaceId;
        const root = parseRoot(ws.rootJson);

        return (
          <div
            key={ws.id}
            className={
              visible
                ? "absolute inset-0 flex min-h-0 flex-col"
                : "absolute inset-0 hidden"
            }
            aria-hidden={!visible}
            data-workspace-id={ws.id}
            data-visible={visible ? "true" : "false"}
          >
            {!root ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  This workspace has no terminal yet.
                </p>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                  onClick={() => {
                    const leafId = crypto.randomUUID();
                    const leaf = createTerminalLeaf(leafId);
                    void saveWorkspace({
                      ...ws,
                      rootJson: JSON.stringify(leaf),
                      activePaneId: leafId,
                    });
                  }}
                >
                  New terminal
                </button>
              </div>
            ) : (
              <PaneTree
                root={root}
                projectId={projectId}
                onTreeChange={(next) => handleTreeChange(ws, next)}
                onActivatePane={(paneId) => handleActivatePane(ws, paneId)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
