import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriGitApi,
  type GitApi,
  type GitBranchInfo,
  type GitDiffResult,
  type GitStashInfo,
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
  stashes: GitStashInfo[];
  selectedDiff: GitDiffResult | null;
  loading: boolean;
  diffLoading: boolean;
  busy: boolean;
  commitMessage: string;
  setApi: (api: GitApi) => void;
  setCommitMessage: (message: string) => void;
  refresh: (projectId: string | null) => Promise<void>;
  openDiff: (path: string, staged: boolean) => Promise<void>;
  closeDiff: () => void;
  stage: (paths: string[]) => Promise<boolean>;
  unstage: (paths: string[]) => Promise<boolean>;
  commit: () => Promise<boolean>;
  checkout: (name: string) => Promise<boolean>;
  createBranch: (name: string, checkout: boolean) => Promise<boolean>;
  stashPush: () => Promise<boolean>;
  stashPop: (index?: number) => Promise<boolean>;
}

let api: GitApi = tauriGitApi;
let refreshSequence = 0;
let diffSequence = 0;

export const useGitStore = create<GitStoreState>((set, get) => {
  const mutate = async (
    label: string,
    operation: (projectId: string) => Promise<void>,
    after?: (projectId: string) => void,
  ): Promise<boolean> => {
    const { projectId, busy } = get();
    if (!projectId || busy) return false;
    set({ busy: true });
    try {
      await operation(projectId);
      if (get().projectId === projectId) {
        after?.(projectId);
        await get().refresh(projectId);
      }
      return true;
    } catch (error) {
      reportError(label, error);
      if (get().projectId === projectId) {
        await get().refresh(projectId);
      }
      return false;
    } finally {
      set({ busy: false });
    }
  };

  return {
    projectId: null,
    status: emptyStatus(),
    branches: [],
    stashes: [],
    selectedDiff: null,
    loading: false,
    diffLoading: false,
    busy: false,
    commitMessage: "",
    setApi: (next) => {
      api = next;
    },
    setCommitMessage: (message) => set({ commitMessage: message }),
    refresh: async (projectId) => {
      const request = ++refreshSequence;
      ++diffSequence;
      if (!projectId) {
        set({
          projectId: null,
          status: emptyStatus(),
          branches: [],
          stashes: [],
          selectedDiff: null,
          loading: false,
          diffLoading: false,
          commitMessage: "",
        });
        return;
      }
      const changedProject = get().projectId !== projectId;
      set({
        loading: true,
        projectId,
        diffLoading: false,
        ...(changedProject
          ? {
              status: emptyStatus(),
              branches: [],
              stashes: [],
              selectedDiff: null,
              commitMessage: "",
            }
          : {}),
      });
      try {
        const status = await api.status(projectId);
        const [branches, stashes] = status.isRepo
          ? await Promise.all([
              api.branches(projectId).catch(() => [] as GitBranchInfo[]),
              api.stashList(projectId).catch(() => [] as GitStashInfo[]),
            ])
          : [[], []];
        if (request !== refreshSequence || get().projectId !== projectId) {
          return;
        }
        set({ status, branches, stashes, loading: false });
      } catch (error) {
        if (request !== refreshSequence || get().projectId !== projectId) {
          return;
        }
        set({
          loading: false,
          status: emptyStatus(),
          branches: [],
          stashes: [],
        });
        reportError("Could not load git status", error);
      }
    },
    openDiff: async (path, staged) => {
      const { projectId } = get();
      if (!projectId) return;
      const request = ++diffSequence;
      set({ selectedDiff: null, diffLoading: true });
      try {
        const selectedDiff = await api.diffFile(projectId, path, staged);
        if (request !== diffSequence || get().projectId !== projectId) return;
        set({ selectedDiff, diffLoading: false });
      } catch (error) {
        if (request !== diffSequence || get().projectId !== projectId) return;
        set({ diffLoading: false });
        reportError("Could not load file diff", error);
      }
    },
    closeDiff: () => {
      ++diffSequence;
      set({ selectedDiff: null, diffLoading: false });
    },
    stage: async (paths) => {
      if (paths.length === 0) return false;
      return mutate(
        "Could not stage files",
        (projectId) => api.stage(projectId, paths),
        () => set({ selectedDiff: null }),
      );
    },
    unstage: async (paths) => {
      if (paths.length === 0) return false;
      return mutate(
        "Could not unstage files",
        (projectId) => api.unstage(projectId, paths),
        () => set({ selectedDiff: null }),
      );
    },
    commit: async () => {
      const message = get().commitMessage.trim();
      if (!message) return false;
      return mutate(
        "Could not commit",
        async (projectId) => {
          await api.commit(projectId, message);
        },
        () => set({ commitMessage: "", selectedDiff: null }),
      );
    },
    checkout: async (name) => {
      if (!name) return false;
      return mutate(
        "Could not checkout branch",
        (projectId) => api.checkout(projectId, name),
        () => set({ selectedDiff: null }),
      );
    },
    createBranch: async (name, checkout) => {
      if (!name.trim()) return false;
      return mutate("Could not create branch", (projectId) =>
        api.createBranch(projectId, name.trim(), checkout),
      );
    },
    stashPush: async () => {
      return mutate(
        "Could not stash",
        (projectId) => api.stashPush(projectId),
        () => set({ selectedDiff: null }),
      );
    },
    stashPop: async (index = 0) => {
      return mutate(
        "Could not pop stash",
        (projectId) => api.stashPop(projectId, index),
        () => set({ selectedDiff: null }),
      );
    },
  };
});
