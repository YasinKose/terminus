import { create } from "zustand";
import type { WorkspaceRecord, WorkspaceView } from "@/lib/tauri/contracts";
import {
  tauriWorkspaceApi,
  type WorkspaceApi,
} from "@/lib/tauri/workspaces";

export interface WorkspaceStoreApi {
  hydrateFromBootstrap: (workspaces: WorkspaceRecord[]) => void;
  getWorkspace: (id: string) => WorkspaceView | null;
  listForProject: (projectId: string) => WorkspaceView[];
  upsertWorkspace: (
    workspace: WorkspaceRecord,
    opts?: { initialize?: boolean },
  ) => void;
  activateWorkspace: (workspaceId: string) => Promise<void>;
  removeProjectWorkspaces: (projectId: string) => void;
}

export interface WorkspaceStoreState extends WorkspaceStoreApi {
  workspaces: WorkspaceView[];
  activeWorkspaceId: string | null;
  setApi: (api: WorkspaceApi) => void;
  saveWorkspace: (workspace: WorkspaceRecord) => Promise<WorkspaceView>;
  saveTwoWorkspaces: (
    first: WorkspaceRecord,
    second: WorkspaceRecord,
  ) => Promise<[WorkspaceView, WorkspaceView]>;
}

let api: WorkspaceApi = tauriWorkspaceApi;

function toView(
  record: WorkspaceRecord,
  initialized: boolean,
): WorkspaceView {
  return { ...record, initialized };
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  setApi: (next) => {
    api = next;
  },

  hydrateFromBootstrap: (records) => {
    set({
      workspaces: records.map((r) => toView(r, false)),
      activeWorkspaceId: null,
    });
  },

  getWorkspace: (id) => get().workspaces.find((w) => w.id === id) ?? null,

  listForProject: (projectId) =>
    get()
      .workspaces.filter((w) => w.projectId === projectId)
      .slice()
      .sort((a, b) => a.position - b.position),

  upsertWorkspace: (workspace, opts) => {
    set((s) => {
      const existing = s.workspaces.find((w) => w.id === workspace.id);
      const initialized = opts?.initialize
        ? true
        : (existing?.initialized ?? false);
      const view = toView(workspace, initialized);
      const workspaces = existing
        ? s.workspaces.map((w) => (w.id === workspace.id ? view : w))
        : [...s.workspaces, view];
      return { workspaces };
    });
  },

  activateWorkspace: async (workspaceId) => {
    const current = get().getWorkspace(workspaceId);
    if (!current) {
      throw new Error(`workspace not found: ${workspaceId}`);
    }
    set((s) => ({
      activeWorkspaceId: workspaceId,
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, initialized: true } : w,
      ),
    }));
  },

  removeProjectWorkspaces: (projectId) => {
    set((s) => {
      const workspaces = s.workspaces.filter((w) => w.projectId !== projectId);
      const activeWorkspaceId = workspaces.some(
        (w) => w.id === s.activeWorkspaceId,
      )
        ? s.activeWorkspaceId
        : null;
      return { workspaces, activeWorkspaceId };
    });
  },

  saveWorkspace: async (workspace) => {
    const saved = await api.saveWorkspace(workspace);
    get().upsertWorkspace(saved);
    return get().getWorkspace(saved.id)!;
  },

  saveTwoWorkspaces: async (first, second) => {
    const [a, b] = await api.saveTwoWorkspaces(first, second);
    get().upsertWorkspace(a);
    get().upsertWorkspace(b);
    return [get().getWorkspace(a.id)!, get().getWorkspace(b.id)!];
  },
}));
