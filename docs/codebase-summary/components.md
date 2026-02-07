# Components

## Frontend (Svelte/TS)
- `src/App.svelte`
  - App shell and keyboard shortcuts.
  - Renders all workspace layers and toggles visibility by `activeWorkspaceId`.
  - Keeps hidden workspace terminal trees mounted to preserve TUI renderer state.
- `src/lib/components/WorkspaceTabs.svelte`
  - Displays global workspace list with project badges.
  - Selecting tab syncs both active workspace and active project.
- `src/lib/components/SplitPaneContainer.svelte`
  - Recursive split/pane renderer.
  - Per-pane toolbar controls (`H`, `V`, `Close`) and drag-drop zones.
  - Child recursion now receives `visible` flag and keys each child by `child.id`.
- `src/lib/components/Terminal.svelte`
  - xterm wrapper and PTY event listeners.
  - Handles `pty-exit-{id}` by notifying `projectStore.handleTerminalExit`.
  - Does not call `close_pty` on component unmount.
- `src/lib/stores/projectStore.ts`
  - Owns normalized `projects` + `workspaces` model.
  - Handles project/workspace navigation, pane-tree operations, migration, persistence.
  - Stability logic:
    - keep single-child split containers instead of collapsing,
    - workspace-level terminal creation for empty roots,
    - explicit PTY close on pane/workspace/project removal.
- `src/lib/stores/taskStore.ts`
  - Task board state and Rust load/save integration.
- `src/lib/stores/snippetStore.ts`
  - Snippet CRUD, favorites, scope filtering.
- `src/lib/stores/uiStore.ts`
  - UI toggles (sidebar, task board, palette, zen mode, snippet modal).
- `src/lib/utils/makefileScanner.ts`
  - Invokes backend Makefile scan and imports targets as snippets.

## Backend (Tauri/Rust)
- `src-tauri/src/lib.rs`: app bootstrap, plugin registration, command wiring.
- `src-tauri/src/pty.rs`
  - PTY lifecycle (spawn, write, resize, close), event emission.
  - `spawn_pty` is idempotent per terminal id.
- `src-tauri/src/task.rs`: board file load/save logic.
- `src-tauri/src/makefile.rs`: Makefile target parser and scan command.

## Legacy/Inactive Area
- `src/main/`, `src/renderer/`, `src/shared/`: Electron prototype path; not used by active Tauri runtime and currently produces TS check errors.
