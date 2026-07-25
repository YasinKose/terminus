# Architecture (current Svelte snapshot)

> **Note (2026-07-18):** This file describes the **running Svelte app**.  
> Target architecture (React + git2) lives in [`docs/architecture.md`](../architecture.md).

## Runtime Architecture
```mermaid
graph TD
  UI[Svelte UI<br/>src/App.svelte + src/lib/components] --> STORES[Svelte stores<br/>project/task/snippet/ui]
  STORES --> LS[localStorage persistence<br/>v2 normalized keys]
  UI --> TAURIAPI[@tauri-apps/api/core.invoke(...)]
  TAURIAPI --> COMMANDS[Rust Tauri Commands<br/>spawn_pty/write_to_pty/resize_pty/close_pty<br/>load_board/save_board<br/>scan_makefile<br/>git shell-outs]
  COMMANDS --> PTY[portable-pty sessions]
  COMMANDS --> FILES[Filesystem I/O<br/>.tasks/board.json, Makefile]
  COMMANDS --> GITCLI[git / gh CLI processes]
```

## Boundaries
- UI state and rendering live in `src/`.
- OS/process/filesystem operations are routed through Tauri commands in `src-tauri/src/`.
- `projectStore` owns normalized project/workspace state and pane-tree mutations.
- `taskStore` persists board state to `{projectPath}/.tasks/board.json` via Rust commands.

## Notable Architectural Detail
- Workspace model is now normalized:
  - `projects[]` and `workspaces[]` are persisted separately.
  - Each workspace has a strict `projectId` ownership.
- Project/workspace navigation is synchronized in both directions:
  - selecting a project picks/creates its first workspace,
  - selecting a workspace also activates its owning project.
- Terminal rendering stability for long-running TUIs (`claude`, `codex`) is protected by:
  - keeping workspace views mounted and toggling visibility,
  - propagating `visible` through pane recursion,
  - keyed split children by `child.id`,
  - preventing single-child split collapse after pane close.
- PTY spawn is idempotent by terminal id (`spawn_pty` returns early if session already exists).
- Terminal component no longer closes PTY on Svelte unmount; PTY close is controlled by explicit pane/workspace/project lifecycle actions.
- Legacy Electron files still exist and still affect TypeScript checks.
