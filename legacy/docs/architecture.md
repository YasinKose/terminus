# Architecture — Terminus (Target + Current Bridge)

> **Status:** Living — 2026-07-18  
> **Audience:** Implementers of the React + git2 revision  
> **Companion:** [prd.md](./prd.md), [git-backend.md](./git-backend.md), [frontend-standards.md](./frontend-standards.md), [migration-plan.md](./migration-plan.md)

---

## 1. Purpose

Define **system boundaries**, **module ownership**, and **invariants** so the Svelte→React and shell-git→git2 migrations do not regress PTY stability or explode scope.

---

## 2. Current vs target

| Concern | Current (v0.1.0 code) | Target (revision) |
|---------|----------------------|-------------------|
| UI framework | Svelte 5 + Bits UI | **React + standardized `ui/*`** |
| State | Svelte stores | React + focused store lib (TBD: Zustand preferred) |
| Git | `git` / `gh` process shell-outs (~35 commands, large pane) | **git2** + small Must API + composed UI |
| PTY | portable-pty + xterm | **Same contracts** (do not reinvent) |
| Tasks | Rust JSON I/O | **Same** |
| Dead code | Electron prototype trees | **Removed** |
| Docs | PRD lagging | PRD is SoT |

Current inventory snapshot: [codebase-summary/](./codebase-summary/).

---

## 3. Layered architecture

```text
┌──────────────────────────────────────────────┐
│ Presentation (React)                         │
│  features/*  ·  components/ui/*  ·  layouts  │
├──────────────────────────────────────────────┤
│ Application state                            │
│  stores · hooks · services/invoke            │
├──────────────────────────────────────────────┤
│ IPC boundary (Tauri commands + events)       │
├──────────────────────────────────────────────┤
│ Domain / adapters (Rust)                     │
│  pty · tasks · makefile · git(git2)          │
├──────────────────────────────────────────────┤
│ OS: processes, filesystem, libgit2, PTY      │
└──────────────────────────────────────────────┘
```

### Rules

1. **Presentation** does not import Node FS or spawn processes.  
2. **State** owns normalized entities (Project, Workspace, PaneNode, TaskBoard).  
3. **IPC** is the only bridge; commands are explicit, typed, least-privilege.  
4. **Rust modules** own OS side effects; keep modules small and testable later.  

---

## 4. Core domain concepts

```text
App
 └─ Project[]
     ├─ path, name, id
     └─ Workspace[]
         ├─ id, projectId, title
         └─ root PaneNode (tree)
             ├─ split { direction, ratio, children[] }
             └─ leaf { kind: terminal | git , ... }

TerminalSession (backend)
 └─ id ↔ Pane leaf id, pty pair, optional scrollback later

TaskBoard (disk)
 └─ columns → cards (project-scoped)

Snippet (global | project)
 └─ body, category, favorite

GitRepository (libgit2 handle, ephemeral per op or short-lived)
 └─ status entries, diffs, branches, stashes
```

### Invariants

* Every workspace has exactly one owning `projectId`.  
* Selecting a project always yields an active workspace (create default if missing).  
* Terminal leaf id is the PTY session id (1:1).  
* Closing a leaf closes PTY; hiding workspace does **not**.  
* Split nodes never remain with a single child after close (collapse rule).  
* Git leaf is optional; if project is not a repo, leaf shows empty state.  

---

## 5. IPC command surface (target)

### 5.1 PTY (freeze behavior)

| Command | Purpose |
|---------|---------|
| `spawn_pty` | Idempotent by id; cwd from project |
| `write_to_pty` | User input / snippet insert |
| `resize_pty` | Rows/cols |
| `close_pty` | Explicit teardown |
| `read` / events | Output streaming (existing pattern) |
| snapshot (if present) | Restore buffer if used |

**Invariants:** spawn if exists → no-op; UI unmount ≠ close.

### 5.2 Tasks

| Command | Purpose |
|---------|---------|
| `load_board` | Read `{path}/.tasks/board.json` |
| `save_board` | Write board |

### 5.3 Makefile

| Command | Purpose |
|---------|---------|
| `scan_makefile` | Parse targets for snippet import |

### 5.4 Git (target — see git-backend.md)

Minimal set, e.g.:

* `git_open_status` / `git_status`  
* `git_diff`  
* `git_stage` / `git_unstage` / `git_discard`  
* `git_commit`  
* `git_branches` / `git_checkout` / `git_branch_create`  
* `git_stash_*` (list/push/pop)  

**Cut from Must:** broad `gh_*`, window open/focus/close/dock unless reintroduced as Could.

---

## 6. Frontend architecture (React target)

### Directory sketch

```text
src/
  app/                 # shell, providers
  features/
    projects/
    workspaces/
    terminal/
    tasks/
    snippets/
    git/
    palette/
    appearance/
  components/
    ui/                # design system primitives only
    layout/            # TitleBar, Sidebar chrome
  lib/
    tauri/             # typed invoke wrappers
    stores/            # or colocated feature stores
    types/
  styles/
```

### Patterns

* **Feature folders** own UI + hooks + types for that domain.  
* **`components/ui`** has zero feature imports (dependency arrow one way).  
* **xterm** isolated in `features/terminal/TerminalView` — dispose carefully; do not tie dispose to workspace hide.  
* **Split tree** pure data in store; recursive presentational `SplitPane`.  

Details: [frontend-standards.md](./frontend-standards.md).

---

## 7. Backend architecture (Rust)

```text
src-tauri/src/
  lib.rs              # generate_handler, plugin setup
  pty.rs              # session map, spawn/write/resize/close
  task.rs             # board JSON
  makefile.rs         # scan
  git/
    mod.rs
    status.rs
    diff.rs
    index.rs          # stage/unstage
    commit.rs
    branch.rs
    stash.rs
    error.rs          # typed errors → string/serde for FE
  # legacy flat git.rs replaced over R2
```

### Error model

* Prefer typed Rust errors mapped to stable string codes or structured `{ code, message }` for FE.  
* Never panic on user git mistakes (dirty checkout, etc.).  

### Capabilities

* Main window: dialog, FS scope as needed for project paths, PTY.  
* Avoid broad shell scope once git2 lands.  
* Secondary git windows: only if product re-approves (default: **no**).  

---

## 8. Persistence strategy

| Kind | Mechanism | Notes |
|------|-----------|-------|
| UI layout / projects | localStorage v2 keys or migrate to app config dir | Version migrations required |
| Tasks | project `.tasks/board.json` | Source of truth on disk |
| Snippets | Split global (app) / project (file) — **pick in R4/R5** | Avoid dual truth |
| Git | `.git` | Never duplicate |

Migration scripts: if key shapes change, bump schema version once in store.

---

## 9. Eventing

* PTY output: existing event channel per session (keep).  
* Git: prefer **pull on focus / explicit refresh** over heavy watchers initially; optional `notify` later.  
* Cross-window: only if multi-window returns.  

---

## 10. Security considerations

* All path arguments validated (canonicalized under allowed roots where possible).  
* Discard / hard reset style ops require FE confirm + explicit command.  
* No arbitrary shell command invoke for “run this git string”.  
* Capabilities least privilege after git2 removes many shell needs.  

---

## 11. Performance constraints

* Idle RAM and startup targets from PRD.  
* Keep workspace DOM mounted but hidden (visibility) for TUI stability — may cost RAM; document tradeoff.  
* xterm WebGL optional behind setting.  
* Git status: don’t poll at 100ms; refresh on focus / after command / interval ≥ 2s if needed.  

---

## 12. Testing strategy (pragmatic)

Until a suite exists:

1. `cargo check`  
2. `npm run check`  
3. Manual smoke (see migration-plan)  

Later: Rust unit tests for git pure helpers; FE component tests for split tree reducers.

---

## 13. Anti-patterns

* Mega-components (>500 LOC UI without split)  
* Shelling out to `git` for status parsing  
* Closing PTY on React unmount of hidden workspace  
* Reintroducing Electron  
* Expanding into agent IDE without PRD change  

---

## 14. Related historical notes

* Workspace terminal stability plan: `plans/2026-02-07-workspace-terminal-stability.md`  
* Free split: `plans/2025-01-22-free-split-and-drag-drop.md`  
* Git window: `plans/2026-02-10-git-workbench-window.md` (**supersede** complexity with slim Git)  
