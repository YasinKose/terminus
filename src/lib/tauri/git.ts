import { invoke } from "@tauri-apps/api/core";

export interface GitFileEntry {
  path: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
}

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export interface GitStashInfo {
  index: number;
  message: string;
}

export interface GitStatusSnapshot {
  isRepo: boolean;
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitFileEntry[];
  hasConflicts: boolean;
}

export interface GitDiffResult {
  path: string;
  staged: boolean;
  patch: string;
}

export interface GitApi {
  status: (projectId: string) => Promise<GitStatusSnapshot>;
  diffFile: (
    projectId: string,
    path: string,
    staged: boolean,
  ) => Promise<GitDiffResult>;
  stage: (projectId: string, paths: string[]) => Promise<void>;
  unstage: (projectId: string, paths: string[]) => Promise<void>;
  commit: (projectId: string, message: string) => Promise<string>;
  branches: (projectId: string) => Promise<GitBranchInfo[]>;
  checkout: (projectId: string, name: string) => Promise<void>;
  createBranch: (
    projectId: string,
    name: string,
    checkout: boolean,
  ) => Promise<void>;
  stashList: (projectId: string) => Promise<GitStashInfo[]>;
  stashPush: (projectId: string, message?: string) => Promise<void>;
  stashPop: (projectId: string, index: number) => Promise<void>;
}

export const tauriGitApi: GitApi = {
  status: (projectId) =>
    invoke<GitStatusSnapshot>("git_status", { input: { projectId } }),
  diffFile: (projectId, path, staged) =>
    invoke<GitDiffResult>("git_diff_file", {
      input: { projectId, path, staged },
    }),
  stage: (projectId, paths) =>
    invoke<void>("git_stage", { input: { projectId, paths } }),
  unstage: (projectId, paths) =>
    invoke<void>("git_unstage", { input: { projectId, paths } }),
  commit: (projectId, message) =>
    invoke<string>("git_commit", { input: { projectId, message } }),
  branches: (projectId) =>
    invoke<GitBranchInfo[]>("git_branches", { input: { projectId } }),
  checkout: (projectId, name) =>
    invoke<void>("git_checkout", { input: { projectId, name } }),
  createBranch: (projectId, name, checkout) =>
    invoke<void>("git_create_branch", {
      input: { projectId, name, checkout },
    }),
  stashList: (projectId) =>
    invoke<GitStashInfo[]>("git_stash_list", { input: { projectId } }),
  stashPush: (projectId, message) =>
    invoke<void>("git_stash_push", {
      input: { projectId, message: message ?? null },
    }),
  stashPop: (projectId, index) =>
    invoke<void>("git_stash_pop", { input: { projectId, index } }),
};
