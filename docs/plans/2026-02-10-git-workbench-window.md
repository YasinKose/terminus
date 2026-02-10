# GitHub Workbench Window Integration (Implemented)

Date: 2026-02-10
Status: Implemented

## Goal
Add a workspace-bound Git/GitHub workbench that opens as a pane by default and can detach into a native Tauri window.

## Implemented Behavior

### 1. Workspace Git Pane Model
- Pane tree now supports `git` leaves in addition to terminal leaves.
- Workspaces track git state with:
  - `gitPaneId`
  - `gitDetached`
- One git instance per workspace is enforced across pane + detached window.

### 2. Open / Detach / Dock Flow
- Git workbench opens in active workspace as a pane.
- Detach action moves it into a native window (`git-{workspaceId}` label).
- Dock action emits `git-dock-request` to main window, closes detached window, and restores pane.
- If a detached window already exists for the workspace, open commands focus existing window.

### 3. Backend Git/GitHub Command Surface
- Added `src-tauri/src/git.rs` with commands for:
  - status, diff, log, stage/unstage, commit
  - branch, remote, fetch/pull/push
  - rebase/cherry-pick/reset/revert
  - stash and tags
  - GitHub CLI auth/PR/issue operations
- Added Tauri commands for detached window lifecycle:
  - `open_git_window`, `focus_git_window`, `close_git_window`, `dock_git_window`

### 4. UI Integration
- New `GitWorkbenchPane.svelte` with tabbed workbench sections:
  - Changes, History, Branches, Remotes, Stash, Tags, PRs, Issues, Advanced
- `SplitPaneContainer.svelte` renders git leaves.
- Workspace top actions include Git button.
- Command palette includes:
  - Open Git Workbench
  - Detach Git Workbench
- Shortcuts added:
  - Open Git Workbench (`Cmd/Ctrl+Shift+G`)
  - Detach Git Workbench (`Cmd/Ctrl+Shift+Alt+G`)

### 5. Multi-window Entry Routing
- `src/main.ts` routes by query string:
  - default -> main `App`
  - `?view=git` -> `DetachedGitView`

## Notes
- `npm run check` still fails due pre-existing legacy Electron type errors under `src/main/*` and `src/main/preload.ts`.
- `cd src-tauri && cargo check` passes.
