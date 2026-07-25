# Workspace and Terminal Stability Revision (Implemented)

Date: 2026-02-07
Status: Implemented

## Goal
Resolve workspace/terminal instability during project switching and pane close flows, especially while running full-screen TUIs (`claude`, `codex`) inside terminal panes.

## Implemented Behavior

### 1. Normalized Workspace Ownership
- Workspace data is global and normalized (`workspaces[]`) rather than embedded under each project.
- Every workspace has a required `projectId`.
- One workspace belongs to exactly one project.

### 2. Navigation Rules
- Selecting a project from sidebar:
  - activates that project,
  - opens first workspace of that project,
  - creates one automatically if none exists.
- Selecting a workspace tab:
  - activates that workspace,
  - also activates its owning project in sidebar.

### 3. Stable Rendering Model
- Main view keeps all workspace layers mounted in DOM.
- Only visibility/display is toggled for inactive workspaces.
- This prevents xterm/TUI renderer resets caused by mount/unmount cycles.

### 4. PTY Lifecycle Rules
- `Terminal.svelte` no longer closes PTY on component unmount.
- PTY close happens explicitly when user closes pane/workspace/project.
- `spawn_pty` is idempotent by terminal id to avoid duplicate spawn race on remount.

### 5. Pane Close and Split Stability
- Split children are keyed by `child.id` in Svelte recursion.
- `removeNode` no longer collapses single-child split containers to leaf nodes.
- This preserves surviving terminal component identity after closing sibling pane.

### 6. Empty Workspace Behavior
- If last terminal exits in a workspace, workspace remains and enters empty state (`root = null`).
- User can create a new terminal in-place without losing workspace tab identity.

## Files Updated
- `src/lib/types/workspace.ts`
- `src/lib/stores/migration.ts`
- `src/lib/stores/projectStore.ts`
- `src/App.svelte`
- `src/lib/components/WorkspaceTabs.svelte`
- `src/lib/components/SplitPaneContainer.svelte`
- `src/lib/components/Terminal.svelte`
- `src/lib/components/Sidebar.svelte`
- `src/lib/components/PaneContextMenu.svelte`
- `src-tauri/src/pty.rs`

## Validation
Manual scenarios validated in development flow:
1. Run TUI in workspace A -> switch to workspace B -> return to A (renderer preserved).
2. Split pane -> run TUI in one pane -> close sibling pane (surviving pane remains stable).
3. Project switch with existing/non-existing workspace coverage.
4. Terminal process exit -> workspace remains empty and recoverable.

## Known Remaining Issues (Out of Scope)
- Existing TypeScript failures in snippet and legacy Electron paths are still present and unrelated to this revision.
