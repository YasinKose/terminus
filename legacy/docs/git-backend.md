# Git Backend Design — git2 (libgit2)

> **Status:** Design locked for revision — 2026-07-18  
> **Decision:** Replace shell-based `git`/`gh` orchestration with **git2** for Must-have operations  
> **Goal:** Smaller API, structured data, fewer process spawns, simpler UI  

---

## 1. Why git2

| Shell `git` (current) | git2 |
|----------------------|------|
| Parse porcelain text (brittle) | Structured objects |
| Process spawn per action | In-process libgit2 |
| Easy to add flags ad hoc → surface explosion | Explicit typed functions |
| `gh` couples product to GitHub CLI | Optional later adapter |

**Tradeoff:** Some operations (credential helpers, rare plumbing) are easier in CLI. Document **fallback** only for those.

---

## 2. Scope matrix

### 2.1 Must (R2)

| Operation | git2 approach | Notes |
|-----------|---------------|-------|
| Detect repo | `Repository::discover` / `open` | FE path = project path |
| Status | `statuses` with options | Include untracked; map to UI rows |
| Diff workdir / index | `diff_index_to_workdir`, `diff_tree_to_index` | File list + patch text or hunks |
| Stage path | `index.add_path` + write | |
| Unstage path | reset index entry from HEAD | |
| Discard workdir changes | checkout path from index/HEAD | **destructive** — confirm in UI |
| Commit | build tree from index, `commit` | Author from git config |
| Branch list | `branches` | Local first; remotes optional |
| Checkout branch | `set_head` + checkout | Fail on conflicts → error |
| Create branch | `branch` | Optional checkout |
| Stash list | stash foreach | |
| Stash push/pop | stash save / apply/pop | |

### 2.2 Should (later)

* Push / pull / fetch (needs network + credentials story)  
* Merge / rebase (high conflict UX cost)  
* Tags basic  
* Blame  

### 2.3 Cut from core (current code debt)

| Current area | Action |
|--------------|--------|
| `gh_*` PR/issue commands | **Out of Must** — Could later as optional module |
| Detached git window open/focus/close/dock | **Default out** — single pane first |
| Mega “do everything” command set (~35) | **Collapse** to ≤ ~12 Must commands |

---

## 3. Module layout

```text
src-tauri/src/git/
  mod.rs           # public commands, re-exports
  repo.rs          # open/discover helpers
  status.rs
  diff.rs
  index_ops.rs     # stage/unstage/discard
  commit.rs
  branch.rs
  stash.rs
  types.rs         # serde DTOs shared with FE
  error.rs
```

`lib.rs` registers only the slim command set.

---

## 4. DTO sketches (TypeScript-facing)

Names illustrative — finalize in R2.

```ts
// status
type GitFileStatus =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "conflicted"
  | "ignored";

interface GitStatusEntry {
  path: string;
  indexStatus: GitFileStatus | null;
  workdirStatus: GitFileStatus | null;
}

interface GitStatusSnapshot {
  repoRoot: string;
  branch: string | null;
  entries: GitStatusEntry[];
  ahead: number | null;  // optional if no upstream
  behind: number | null;
}

// diff
interface GitDiffRequest {
  projectPath: string;
  path?: string;       // single file or whole
  staged: boolean;
}

interface GitDiffResult {
  files: { path: string; patch: string }[];
}

// commit
interface GitCommitRequest {
  projectPath: string;
  message: string;
  allowEmpty?: boolean;
}

interface GitCommitResult {
  oid: string;
  summary: string;
}
```

All commands take `projectPath: string` (or `repoPath`) as first-class arg.

---

## 5. Command API (proposed)

```text
git_status(project_path) -> GitStatusSnapshot
git_diff(project_path, path?, staged) -> GitDiffResult
git_stage(project_path, paths[])
git_unstage(project_path, paths[])
git_discard(project_path, paths[])   // requires FE confirm
git_commit(project_path, message)
git_branches(project_path) -> { current, local[], remote[] }
git_checkout(project_path, name)
git_branch_create(project_path, name, checkout: bool)
git_stash_list(project_path)
git_stash_push(project_path, message?)
git_stash_apply(project_path, index)
git_stash_pop(project_path, index?)
```

Exact Rust `#[tauri::command]` names may use snake_case matching existing style.

---

## 6. Error handling

Map git2 errors to stable codes:

| Code | Meaning |
|------|---------|
| `not_a_repo` | Path has no `.git` |
| `dirty_conflict` | Checkout/merge blocked |
| `nothing_to_commit` | Empty index commit refused |
| `invalid_path` | Path escape / not in workdir |
| `git_error` | Generic with message |

FE shows toast / inline alert; never silent fail.

---

## 7. Identity & config

* Read `user.name` / `user.email` via git2 config for commits.  
* If missing → return clear error; do not invent identity.  

---

## 8. Credentials & network

**R2 does not require push/pull.** When added:

* Prefer git2 callbacks + system credential helper where possible  
* Document macOS keychain behavior  
* Never log tokens  

---

## 9. CLI fallback policy

Allowed only when:

1. Operation is not in Must table, **and**  
2. Documented in this file under “Fallback allowlist”, **and**  
3. Output is not scraped for primary UI state  

**Fallback allowlist (initial):** empty for R2. Expand deliberately.

---

## 10. UI mapping (slim workbench)

```text
GitWorkbench
├── GitHeader (branch, refresh, ahead/behind)
├── GitStatusList (staged / unstaged sections)
├── GitDiffView (selected file)
├── GitCommitBox (message + commit)
└── GitBranchMenu / GitStashMenu (lightweight)
```

No single 1400 LOC component. Each piece ≤ ~200–300 LOC preferred.

---

## 11. Testing

* Unit: status mapping helpers with fixtures (bare repo in tempdir)  
* Manual smoke: init repo, dirty file, stage, commit, branch, stash  

---

## 12. Migration from current `git.rs`

1. Inventory all `#[tauri::command]` in current git module  
2. Tag Keep (Must) / Drop / Later  
3. Implement Keep on git2 behind same or new names  
4. Point FE to new commands  
5. Delete shell implementations and `gh_*` from default build  
6. Remove detached window commands unless re-approved  

---

## 13. Dependencies

```toml
git2 = "…"  # pin in R2; enable features as needed (vendored vs system libgit2 — prefer portable default for Tauri releases)
```

Note: shipping libgit2 may affect binary size; measure against <20MB goal in R6.

---

## 14. Open questions (resolve in R2 kickoff)

1. Vendored libgit2 vs system?  
2. Hunk-level stage (partial stage) in v1 or file-level only?  
3. Submodules: ignore vs basic status?  

**Default recommendations:** vendored if it stabilizes builds; **file-level** stage first; **ignore** submodules initially.
