import { create } from "zustand";
import type { ProjectRecord, WorkspaceRecord } from "@/lib/tauri/contracts";
import {
  tauriWorkspaceApi,
  type WorkspaceApi,
} from "@/lib/tauri/workspaces";
import {
  useWorkspaceStore,
  type WorkspaceStoreApi,
} from "@/features/workspaces/workspaceStore";
import { useAppearanceStore } from "@/features/appearance/appearanceStore";
import { useProfileStore } from "@/features/profiles/profileStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useRecoveryStore } from "@/features/settings/recoveryStore";
import type { BootstrapState } from "@/lib/tauri/contracts";
import { chooseRestoredProjectId } from "@/features/projects/selection";

export const DEFAULT_PROJECT_COLOR = "#2DD4BF";

export interface ProjectStoreState {
  projects: ProjectRecord[];
  activeProjectId: string | null;
  bootstrapped: boolean;
  setApi: (api: WorkspaceApi) => void;
  hydrate: (projects: ProjectRecord[]) => void;
  bootstrap: () => Promise<void>;
  applyReadyState: (state: BootstrapState) => Promise<void>;
  addProject: (input: {
    path: string;
    displayName?: string;
    color?: string;
  }) => Promise<ProjectRecord>;
  selectProject: (projectId: string) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  renameProject: (projectId: string, displayName: string) => Promise<void>;
}

let api: WorkspaceApi = tauriWorkspaceApi;
let workspaceApiOverride: WorkspaceStoreApi | null = null;

function workspaceBridge(): WorkspaceStoreApi {
  return workspaceApiOverride ?? useWorkspaceStore.getState();
}

export function setProjectStoreWorkspaceBridge(
  bridge: WorkspaceStoreApi,
): void {
  workspaceApiOverride = bridge;
}

const applyBootstrapState = async (
  state: BootstrapState,
  setState: (partial: Partial<ProjectStoreState>) => void,
  getState: () => ProjectStoreState,
): Promise<void> => {
  workspaceBridge().hydrateFromBootstrap(state.workspaces);
  useProfileStore.getState().hydrate(state.profiles);
  useSettingsStore.getState().hydrateFromBootstrap(state.settings);
  useAppearanceStore.getState().hydrateFromBootstrap(state.settings);

  const activeProjectId = chooseRestoredProjectId(state);
  setState({
    projects: state.projects,
    activeProjectId,
    bootstrapped: false,
  });
  try {
    if (activeProjectId) {
      await getState().selectProject(activeProjectId);
    }
  } catch (error) {
    setState({
      activeProjectId: null,
      bootstrapped: false,
    });
    throw error;
  }
  setState({ bootstrapped: true });
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  bootstrapped: false,

  setApi: (next) => {
    api = next;
  },

  hydrate: (projects) => {
    set({ projects, bootstrapped: true });
  },

  bootstrap: async () => {
    const recovery = useRecoveryStore.getState();
    const state = await recovery.bootstrap();
    if (!state) {
      set({ bootstrapped: false });
      return;
    }
    try {
      await applyBootstrapState(state, set, get);
      recovery.completeHydration();
    } catch (error) {
      set({ activeProjectId: null, bootstrapped: false });
      recovery.reportHydrationFailure(error);
    }
  },

  applyReadyState: (state: BootstrapState) => {
    return applyBootstrapState(state, set, get);
  },

  addProject: async (input) => {
    const project = await api.addProject(input);
    set((s) => {
      const exists = s.projects.some((p) => p.id === project.id);
      const projects = exists
        ? s.projects.map((p) => (p.id === project.id ? project : p))
        : [...s.projects, project];
      return { projects, activeProjectId: project.id };
    });
    await get().selectProject(project.id);
    return project;
  },

  selectProject: async (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`project not found: ${projectId}`);
    }
    set({ activeProjectId: projectId });

    let workspaceId = project.lastActiveWorkspaceId;
    let workspace: WorkspaceRecord | null = workspaceId
      ? workspaceBridge().getWorkspace(workspaceId)
      : null;

    if (!workspace) {
      const workspaces = workspaceBridge().listForProject(projectId);
      if (workspaces.length > 0) {
        workspace = workspaces[0]!;
        workspaceId = workspace.id;
      }
    }

    if (!workspace) {
      workspace = await api.ensureDefaultWorkspace(projectId);
      workspaceBridge().upsertWorkspace(workspace, { initialize: true });
      workspaceId = workspace.id;
      const updated = await api.setLastActiveWorkspace(projectId, workspaceId);
      set((s) => ({
        projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      }));
      await workspaceBridge().activateWorkspace(workspace.id);
    } else {
      const updated = await api.setLastActiveWorkspace(projectId, workspace.id);
      set((s) => ({
        projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      }));
      await workspaceBridge().activateWorkspace(workspace.id);
    }
  },

  removeProject: async (projectId) => {
    await api.removeProject(projectId);
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== projectId);
      const activeProjectId =
        s.activeProjectId === projectId ? null : s.activeProjectId;
      return { projects, activeProjectId };
    });
    workspaceBridge().removeProjectWorkspaces(projectId);
  },

  renameProject: async (projectId, displayName) => {
    const updated = await api.renameProject(projectId, displayName);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },
}));
