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
import { Button } from "@/components/ui/button";
import { SquareTerminal } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      <div className="flex h-full items-center justify-center bg-surface-sunken p-8">
        <div className="text-center">
          <SquareTerminal
            aria-hidden
            className="mx-auto mb-3 size-6 text-muted-foreground"
          />
          <p className="text-sm font-medium text-foreground">
            {t("workspaces.area.selectTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("workspaces.area.selectDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full min-w-0 bg-background">
      {initialized.map((ws) => {
        const visible = ws.id === activeWorkspaceId;
        const root = parseRoot(ws.rootJson);

        return (
          <div
            key={ws.id}
            className={
              visible
                ? "absolute inset-1.5 flex min-h-0 flex-col"
                : "absolute inset-1.5 hidden"
            }
            aria-hidden={!visible}
            data-workspace-id={ws.id}
            data-visible={visible ? "true" : "false"}
          >
            {!root ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-surface-raised text-primary">
                  <SquareTerminal aria-hidden className="size-5" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t("workspaces.area.startTitle")}
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                  {t("workspaces.area.startDescription")}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-4"
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
                  <SquareTerminal aria-hidden className="size-3.5" />
                  {t("commands.newTerminal")}
                </Button>
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
