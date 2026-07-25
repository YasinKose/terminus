import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriGitApi,
  type GitApi,
  type GitBranchInfo,
  type GitStatusSnapshot,
} from "@/lib/tauri/git";

const emptyStatus = (): GitStatusSnapshot => ({
  isRepo: false,
  branch: null,
  upstream: null,
  ahead: 0,
  behind: 0,
  files: [],
  hasConflicts: false,
});

export interface GitStoreState {
  projectId: string | null;
  status: GitStatusSnapshot;
  branches: GitBranchInfo[];
  loading: boolean;
  commitMessage: string;
  setApi: (api: GitApi) => void;
  setCommitMessage: (message: string) => void;
  refresh: (projectId: string | null) => Promise<void>;
  stage: (paths: string[]) => Promise<void>;
  unstage: (paths: string[]) => Promise<void>;
  commit: () => Promise<void>;
  checkout: (name: string) => Promise<void>;
  createBranch: (name: string, checkout: boolean) => Promise<void>;
  stashPush: () => Promise<void>;
  stashPop: () => Promise<void>;
}

let api: GitApi = tauriGitApi;

export const useGitStore = create<GitStoreState>((set, get) => ({
  projectId: null,
  status: emptyStatus(),
  branches: [],
  loading: false,
  commitMessage: "",
  setApi: (next) => {
    api = next;
  },
  setCommitMessage: (message) => set({ commitMessage: message }),
  refresh: async (projectId) => {
    if (!projectId) {
      set({
        projectId: null,
        status: emptyStatus(),
        branches: [],
        loading: false,
      });
      return;
    }
    set({ loading: true, projectId });
    try {
      const [status, branches] = await Promise.all([
        api.status(projectId),
        api.branches(projectId).catch(() => [] as GitBranchInfo[]),
      ]);
      set({ status, branches, loading: false });
    } catch (error) {
      set({ loading: false, status: emptyStatus(), branches: [] });
      reportError("Could not load git status", error);
    }
  },
  stage: async (paths) => {
    const { projectId, refresh } = get();
    if (!projectId || paths.length === 0) return;
    try {
      await api.stage(projectId, paths);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not stage files", error);
    }
  },
  unstage: async (paths) => {
    const { projectId, refresh } = get();
    if (!projectId || paths.length === 0) return;
    try {
      await api.unstage(projectId, paths);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not unstage files", error);
    }
  },
  commit: async () => {
    const { projectId, commitMessage, refresh } = get();
    if (!projectId) return;
    try {
      await api.commit(projectId, commitMessage);
      set({ commitMessage: "" });
      await refresh(projectId);
    } catch (error) {
      reportError("Could not commit", error);
    }
  },
  checkout: async (name) => {
    const { projectId, refresh } = get();
    if (!projectId) return;
    try {
      await api.checkout(projectId, name);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not checkout branch", error);
    }
  },
  createBranch: async (name, checkout) => {
    const { projectId, refresh } = get();
    if (!projectId) return;
    try {
      await api.createBranch(projectId, name, checkout);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not create branch", error);
    }
  },
  stashPush: async () => {
    const { projectId, refresh } = get();
    if (!projectId) return;
    try {
      await api.stashPush(projectId);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not stash", error);
    }
  },
  stashPop: async () => {
    const { projectId, refresh } = get();
    if (!projectId) return;
    try {
      await api.stashPop(projectId, 0);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not pop stash", error);
    }
  },
}));
