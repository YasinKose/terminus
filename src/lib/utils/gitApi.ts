import { invoke } from '@tauri-apps/api/core';
import type {
  GitFileStatus,
  GitCommit,
  GitCommandResult,
  GitBranchSet,
  GitRemote,
  GitStashEntry,
  GitTagEntry,
  GhAuthStatus,
  GhPullRequest,
  GhIssue
} from '$lib/types/git';

export async function gitStatus(projectPath: string): Promise<GitFileStatus[]> {
  return await invoke<GitFileStatus[]>('git_status', { projectPath });
}

export async function gitDiff(projectPath: string, path?: string, staged = false): Promise<string> {
  return await invoke<string>('git_diff', { projectPath, path, staged });
}

export async function gitLog(projectPath: string, limit = 100): Promise<GitCommit[]> {
  return await invoke<GitCommit[]>('git_log', { projectPath, limit });
}

export async function gitStage(projectPath: string, paths: string[]): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_stage', { projectPath, paths });
}

export async function gitStageAll(projectPath: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_stage_all', { projectPath });
}

export async function gitUnstage(projectPath: string, paths: string[]): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_unstage', { projectPath, paths });
}

export async function gitUnstageAll(projectPath: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_unstage_all', { projectPath });
}

export async function gitCommit(projectPath: string, message: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_commit', { projectPath, message });
}

export async function gitListBranches(projectPath: string): Promise<GitBranchSet> {
  return await invoke<GitBranchSet>('git_list_branches', { projectPath });
}

export async function gitCheckoutBranch(
  projectPath: string,
  name: string,
  create = false,
  fromRef?: string
): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_checkout_branch', {
    projectPath,
    name,
    create,
    fromRef
  });
}

export async function gitCreateBranch(projectPath: string, name: string, fromRef?: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_create_branch', { projectPath, name, fromRef });
}

export async function gitDeleteBranch(projectPath: string, name: string, force = false): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_delete_branch', { projectPath, name, force });
}

export async function gitRenameBranch(projectPath: string, oldName: string, newName: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_rename_branch', { projectPath, oldName, newName });
}

export async function gitListRemotes(projectPath: string): Promise<GitRemote[]> {
  return await invoke<GitRemote[]>('git_list_remotes', { projectPath });
}

export async function gitFetch(projectPath: string, remote?: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_fetch', { projectPath, remote });
}

export async function gitPull(projectPath: string, remote?: string, branch?: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_pull', { projectPath, remote, branch });
}

export async function gitPush(
  projectPath: string,
  remote?: string,
  branch?: string,
  setUpstream = false,
  force = false
): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_push', { projectPath, remote, branch, setUpstream, force });
}

export async function gitRebaseStart(projectPath: string, upstream: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_rebase_start', { projectPath, upstream });
}

export async function gitRebaseContinue(projectPath: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_rebase_continue', { projectPath });
}

export async function gitRebaseAbort(projectPath: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_rebase_abort', { projectPath });
}

export async function gitCherryPick(projectPath: string, commit: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_cherry_pick', { projectPath, commit });
}

export async function gitReset(projectPath: string, mode: 'soft' | 'mixed' | 'hard', target = 'HEAD'): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_reset', { projectPath, mode, target });
}

export async function gitRevert(projectPath: string, commit: string, noCommit = false): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_revert', { projectPath, commit, noCommit });
}

export async function gitStashSave(projectPath: string, message?: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_stash_save', { projectPath, message });
}

export async function gitStashList(projectPath: string): Promise<GitStashEntry[]> {
  return await invoke<GitStashEntry[]>('git_stash_list', { projectPath });
}

export async function gitStashApply(projectPath: string, stash: string, pop = false): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_stash_apply', { projectPath, stash, pop });
}

export async function gitStashDrop(projectPath: string, stash: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_stash_drop', { projectPath, stash });
}

export async function gitTagList(projectPath: string): Promise<GitTagEntry[]> {
  return await invoke<GitTagEntry[]>('git_tag_list', { projectPath });
}

export async function gitTagCreate(projectPath: string, name: string, target?: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_tag_create', { projectPath, name, target });
}

export async function gitTagDelete(projectPath: string, name: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('git_tag_delete', { projectPath, name });
}

export async function ghAuthStatus(projectPath: string): Promise<GhAuthStatus> {
  return await invoke<GhAuthStatus>('gh_auth_status', { projectPath });
}

export async function ghPrList(projectPath: string, limit = 30): Promise<GhPullRequest[]> {
  return await invoke<GhPullRequest[]>('gh_pr_list', { projectPath, limit });
}

export async function ghPrCreate(
  projectPath: string,
  title: string,
  body: string,
  base?: string,
  head?: string,
  draft = false
): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('gh_pr_create', { projectPath, title, body, base, head, draft });
}

export async function ghIssueList(projectPath: string, limit = 30): Promise<GhIssue[]> {
  return await invoke<GhIssue[]>('gh_issue_list', { projectPath, limit });
}

export async function ghIssueCreate(projectPath: string, title: string, body: string): Promise<GitCommandResult> {
  return await invoke<GitCommandResult>('gh_issue_create', { projectPath, title, body });
}
