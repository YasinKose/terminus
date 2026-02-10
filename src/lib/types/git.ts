export interface GitCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface GitFileStatus {
  path: string;
  originalPath?: string | null;
  indexStatus: string;
  worktreeStatus: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  subject: string;
  body: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  upstream?: string | null;
  upstreamStatus?: string | null;
}

export interface GitBranchSet {
  local: GitBranch[];
  remote: string[];
}

export interface GitRemote {
  name: string;
  fetchUrl?: string | null;
  pushUrl?: string | null;
}

export interface GitStashEntry {
  reference: string;
  message: string;
  relativeDate: string;
}

export interface GitTagEntry {
  name: string;
  shortHash: string;
  createdAt: string;
}

export interface GhAuthStatus {
  authenticated: boolean;
  details: string;
}

export interface GhUser {
  login: string;
}

export interface GhPullRequest {
  number: number;
  title: string;
  state: string;
  headRefName: string;
  baseRefName: string;
  author?: GhUser | null;
  updatedAt: string;
  url: string;
}

export interface GhIssue {
  number: number;
  title: string;
  state: string;
  author?: GhUser | null;
  updatedAt: string;
  url: string;
}
