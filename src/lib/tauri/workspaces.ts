import { invoke } from "@tauri-apps/api/core";
import type {
  BootstrapState,
  ProjectRecord,
  WorkspaceRecord,
} from "./contracts";

export interface WorkspaceApi {
  loadBootstrapState: () => Promise<BootstrapState>;
  addProject: (input: {
    path: string;
    displayName?: string;
    color?: string;
  }) => Promise<ProjectRecord>;
  removeProject: (projectId: string) => Promise<void>;
  renameProject: (
    projectId: string,
    displayName: string,
  ) => Promise<ProjectRecord>;
  ensureDefaultWorkspace: (projectId: string) => Promise<WorkspaceRecord>;
  setLastActiveWorkspace: (
    projectId: string,
    workspaceId: string,
  ) => Promise<ProjectRecord>;
  saveWorkspace: (workspace: WorkspaceRecord) => Promise<WorkspaceRecord>;
  saveTwoWorkspaces: (
    first: WorkspaceRecord,
    second: WorkspaceRecord,
  ) => Promise<[WorkspaceRecord, WorkspaceRecord]>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

export const tauriWorkspaceApi: WorkspaceApi = {
  loadBootstrapState: () => invoke<BootstrapState>("load_bootstrap_state"),
  addProject: (input) => invoke<ProjectRecord>("add_project", { input }),
  removeProject: (projectId) =>
    invoke<void>("remove_project", { input: { projectId } }),
  renameProject: (projectId, displayName) =>
    invoke<ProjectRecord>("rename_project", {
      input: { projectId, displayName },
    }),
  ensureDefaultWorkspace: (projectId) =>
    invoke<WorkspaceRecord>("ensure_default_workspace", {
      input: { projectId },
    }),
  setLastActiveWorkspace: (projectId, workspaceId) =>
    invoke<ProjectRecord>("set_last_active_workspace", {
      input: { projectId, workspaceId },
    }),
  saveWorkspace: (workspace) =>
    invoke<WorkspaceRecord>("save_workspace", { input: { workspace } }),
  saveTwoWorkspaces: (first, second) =>
    invoke<[WorkspaceRecord, WorkspaceRecord]>("save_two_workspaces", {
      input: { first, second },
    }),
  deleteWorkspace: (workspaceId) =>
    invoke<void>("delete_workspace", { input: { workspaceId } }),
};
