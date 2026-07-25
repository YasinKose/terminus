import { collectTerminalIds, removePane } from "@/features/panes/tree";
import type { PaneNode } from "@/features/panes/model";
import { getDefaultTerminalRuntimeRegistry } from "@/features/terminal/runtime";
import { useTerminalStore } from "@/features/terminal/terminalStore";
import { useProjectStore } from "@/features/projects/projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { WorkspaceRecord, WorkspaceView } from "@/lib/tauri/contracts";
import { tauriPtyApi, type PtyApi } from "@/lib/tauri/pty";
import type { CloseRequest } from "./closeRequestStore";
import { useCloseRequestStore } from "./closeRequestStore";

export type WindowExitApi = {
  destroy: () => Promise<void>;
};

export type ExecuteCloseDeps = {
  ptyApi?: PtyApi;
  registry?: { delete: (sessionId: string) => void; disposeAll?: () => void };
  destroyWindow?: () => Promise<void>;
};

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

async function closeSession(
  sessionId: string,
  ptyApi: PtyApi,
  registry: { delete: (id: string) => void },
): Promise<void> {
  useTerminalStore.getState().markClosing(sessionId);
  try {
    await ptyApi.closePty(sessionId);
  } catch {
  }
  registry.delete(sessionId);
  useTerminalStore.getState().removeSession(sessionId);
}

export async function executeClose(
  request: CloseRequest,
  deps: ExecuteCloseDeps = {},
): Promise<void> {
  const ptyApi = deps.ptyApi ?? tauriPtyApi;
  const registry = deps.registry ?? getDefaultTerminalRuntimeRegistry();

  switch (request.kind) {
    case "terminal": {
      const ws = useWorkspaceStore.getState().getWorkspace(request.workspaceId);
      if (!ws) {
        throw new Error(`workspace not found: ${request.workspaceId}`);
      }
      await closeSession(request.sessionId, ptyApi, registry);
      const root = parseRoot(ws.rootJson);
      if (!root) {
        await useWorkspaceStore.getState().saveWorkspace({
          ...toRecord(ws, null),
          activePaneId: null,
        });
        break;
      }
      const removed = removePane(root, request.sessionId);
      if (!removed.ok) {
        throw new Error(removed.error);
      }
      const nextRoot = removed.value;
      const activePaneId =
        nextRoot && ws.activePaneId === request.sessionId
          ? collectTerminalIds(nextRoot)[0] ?? null
          : nextRoot
            ? ws.activePaneId
            : null;
      await useWorkspaceStore.getState().saveWorkspace({
        ...toRecord(ws, nextRoot),
        activePaneId,
      });
      break;
    }
    case "workspace": {
      const ws = useWorkspaceStore.getState().getWorkspace(request.workspaceId);
      if (!ws) {
        throw new Error(`workspace not found: ${request.workspaceId}`);
      }
      const ids = collectTerminalIds(parseRoot(ws.rootJson));
      for (const id of ids) {
        await closeSession(id, ptyApi, registry);
      }
      await useWorkspaceStore.getState().removeWorkspace(request.workspaceId);
      break;
    }
    case "project": {
      const workspaces = useWorkspaceStore
        .getState()
        .listForProject(request.projectId);
      for (const ws of workspaces) {
        const ids = collectTerminalIds(parseRoot(ws.rootJson));
        for (const id of ids) {
          await closeSession(id, ptyApi, registry);
        }
      }
      await useProjectStore.getState().removeProject(request.projectId);
      break;
    }
    case "application": {
      const sessions = Object.keys(useTerminalStore.getState().sessions);
      for (const id of sessions) {
        await closeSession(id, ptyApi, registry);
      }
      registry.disposeAll?.();
      useCloseRequestStore.getState().setAllowExit(true);
      if (deps.destroyWindow) {
        await deps.destroyWindow();
      }
      break;
    }
  }

  useCloseRequestStore.getState().clear();
}
