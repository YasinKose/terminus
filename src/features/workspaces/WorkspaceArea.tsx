import { useCallback, useEffect } from "react";
import type { WorkspaceRecord, WorkspaceView } from "@/lib/tauri/contracts";
import { createTerminalLeaf, type PaneNode } from "@/features/panes/model";
import { PaneTree } from "@/features/panes/PaneTree";
import {
  commitDragGuarded,
  type DragCommitResult,
} from "@/features/panes/PaneDragController";
import { usePaneDragStore } from "@/features/panes/paneDragStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";

function parseRoot(rootJson: string | null): PaneNode | null {
  if (!rootJson) return null;
  try {
    return JSON.parse(rootJson) as PaneNode;
  } catch {
    return null;
  }
}

function toRecord(ws: WorkspaceView, root: PaneNode | null): WorkspaceRecord {
  return {
    id: ws.id,
    projectId: ws.projectId,
    name: ws.name,
    rootJson: root ? JSON.stringify(root) : null,
    activePaneId: ws.activePaneId,
    position: ws.position,
    createdAt: ws.createdAt,
    updatedAt: Date.now(),
  };
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
  const saveTwoWorkspaces = useWorkspaceStore((s) => s.saveTwoWorkspaces);
  const activateWorkspace = useWorkspaceStore((s) => s.activateWorkspace);
  const endDrag = usePaneDragStore((s) => s.endDrag);

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

  const applyCommit = useCallback(
    async (result: DragCommitResult) => {
      if (!result.ok) return;
      if (result.kind === "noop") return;

      if (result.kind === "same-workspace") {
        const ws = workspaces.find((w) => w.id === result.workspaceId);
        if (!ws) return;
        await saveWorkspace({
          ...toRecord(ws, result.root),
          activePaneId: result.activePaneId,
        });
        return;
      }

      const sourceWs = workspaces.find((w) => w.id === result.sourceWorkspaceId);
      const destWs = workspaces.find((w) => w.id === result.destWorkspaceId);
      if (!sourceWs || !destWs) return;

      await saveTwoWorkspaces(
        {
          ...toRecord(sourceWs, result.sourceRoot),
          activePaneId:
            sourceWs.activePaneId === result.activePaneId
              ? null
              : sourceWs.activePaneId,
        },
        {
          ...toRecord(destWs, result.destRoot),
          activePaneId: result.activePaneId,
        },
      );
      await activateWorkspace(result.destWorkspaceId);
    },
    [activateWorkspace, saveTwoWorkspaces, saveWorkspace, workspaces],
  );

  const handleDragCommit = useCallback(() => {
    const drag = usePaneDragStore.getState().drag;
    if (drag.status !== "dragging") return;

    const roots: Record<string, PaneNode | null> = {};
    const projectIds: Record<string, string> = {};
    for (const ws of workspaces) {
      roots[ws.id] = parseRoot(ws.rootJson);
      projectIds[ws.id] = ws.projectId;
    }

    const result = commitDragGuarded(
      drag,
      { projectId, roots },
      projectIds,
    );
    void applyCommit(result).finally(() => {
      endDrag();
    });
  }, [applyCommit, endDrag, projectId, workspaces]);

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
                workspaceId={ws.id}
                activePaneId={ws.activePaneId}
                onTreeChange={(next) => handleTreeChange(ws, next)}
                onActivatePane={(paneId) => handleActivatePane(ws, paneId)}
                onDragCommit={handleDragCommit}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
