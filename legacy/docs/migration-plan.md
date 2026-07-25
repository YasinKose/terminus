# Migration Plan — Svelte → React & Git shell → git2

> **Status:** Planning document — 2026-07-18  
> **Does not authorize coding until you start a phase explicitly**  
> **Order:** R0 docs → R1 cleanup → R2 git2 and/or R3 React scaffold  

---

## 1. Objectives

1. Ship **Terminus** on **Tauri + React + git2** without losing PTY stability.  
2. **Shrink** Git surface and UI complexity.  
3. Remove **Electron** dead weight and make `npm run check` trustworthy.  
4. Keep product scope = terminal-first workbench (PRD MoSCoW).  

---

## 2. Non-negotiable invariants (carry across stacks)

Copy these into every implementation PR description:

1. `spawn_pty` is **idempotent** by terminal id.  
2. UI hide / unmount of workspace **must not** close PTY.  
3. Workspaces stay **mounted** (CSS/visibility) for TUI apps.  
4. Pane tree: no single-child split left dangling.  
5. Tasks path remains `{project}/.tasks/board.json` via Rust.  
6. No Electron code in typecheck graph.  
7. No type escapes (`any` / ts-ignore).  

Reference: `docs/plans/2026-02-07-workspace-terminal-stability.md`.

---

## 3. Strategy options

| Strategy | Description | Recommendation |
|----------|-------------|----------------|
| **A. Hard cut** | New React tree replaces Svelte entry; port features in order | **Preferred** for small surface (~16 components) |
| **B. Dual mount** | Temporary iframe/second window | Avoid |
| **C. Incremental islands** | Svelte host + React islands | High complexity — avoid |

**Chosen default: A — hard cut** after shell + one vertical slice (e.g. projects + empty main) works.

---

## 4. Workstreams

### Stream G — Git backend (can lead)

```text
Inventory git.rs commands
  → keep/cut matrix
  → implement git/ module with git2
  → FE adapter (Svelte temporary OR wait for React)
  → delete shell paths
```

### Stream F — Frontend React

```text
Scaffold Vite React
  → ui primitives
  → shell layout
  → projects/workspaces store
  → terminal + splits
  → tasks
  → palette/shortcuts/appearance
  → snippets
  → git UI
  → delete Svelte sources
```

### Stream C — Cleanup

```text
Remove Electron trees
  → fix tsconfig includes
  → README product
  → capabilities trim
```

---

## 5. Suggested calendar (indicative)

| Week | Focus |
|------|-------|
| 0 | R0 docs complete (this set) |
| 1 | R1 cleanup + git inventory + React scaffold start |
| 2–3 | R2 git2 Must API |
| 2–4 | R3–R4 React core parity (overlap OK) |
| 5 | R5 snippets + slim git UI |
| 6 | R6 hardening + beta tag |

Adjust to availability; order of **invariants** matters more than dates.

---

## 6. R1 cleanup checklist

- [ ] Remove or exclude `src/main`, `src/renderer`, `src/shared` from TS  
- [ ] Delete obsolete Electron plans or mark `Superseded`  
- [ ] Grep for broken imports  
- [ ] `npm run check` green  
- [ ] `cargo check` green  
- [ ] Document invoke list snapshot in `docs/codebase-summary/interfaces.md` update  
- [ ] Git command keep/cut table filled (section 7)  

---

## 7. Git keep / cut matrix (fill in R1)

| Command / area | Keep | Cut | Later | Notes |
|----------------|------|-----|-------|-------|
| status | ☐ | | | git2 |
| diff | ☐ | | | git2 |
| stage/unstage | ☐ | | | git2 |
| commit | ☐ | | | git2 |
| branch/checkout | ☐ | | | git2 |
| stash | ☐ | | | git2 |
| remote push/pull | | | ☐ | credentials |
| gh PR/issue | | ☐ | ☐ | not Must |
| git window dock/* | | ☐ | ☐ | single pane default |
| tags | | | ☐ | |

*(Populate from current `git.rs` during R1.)*

---

## 8. React port order (R4–R5)

Strict order reduces risk:

1. **AppShell + TitleBar + theme tokens**  
2. **Sidebar projects** (add/remove, select)  
3. **Workspace tabs** + empty pane host  
4. **Split tree pure logic** (port tests as pure TS)  
5. **TerminalView + PTY** (hardest — validate TUI)  
6. **Tasks Kanban**  
7. **Command palette + shortcuts**  
8. **Snippets**  
9. **Git workbench (slim)**  
10. **Appearance modal / zen**  
11. Delete Svelte + Bits + lucide-svelte  

---

## 9. Data migration

| Store | Action |
|-------|--------|
| localStorage project/workspace | Read v2 keys; write v3 if shape changes; one-shot migrator |
| Tasks on disk | No change |
| Snippets | Map global/project; if project snippets only in LS, export path optional |

Migrator must be **idempotent** and logged once.

---

## 10. Smoke checklist (gate for R4/R5/R6)

### Terminal core

- [ ] Open app < ~1s feel  
- [ ] Add project  
- [ ] Spawn terminal; shell prompt  
- [ ] Type + resize  
- [ ] Split H/V; DnD pane  
- [ ] Switch workspace; TUI still alive (e.g. long `top` / claude)  
- [ ] Close pane → PTY gone; other panes intact  

### Tasks

- [ ] Open board; add card; move columns; reload app → persisted  

### Snippets

- [ ] Insert snippet into active terminal  
- [ ] Makefile import (if present)  

### Git

- [ ] Non-repo project → empty state  
- [ ] Repo: status lists dirty file  
- [ ] Stage → commit → status clean  
- [ ] Create branch → checkout  

### Quality

- [ ] `npm run check`  
- [ ] `cargo check`  

---

## 11. Rollback plan

* Git: feature-flag old shell module only during R2 if needed; delete after FE switches.  
* UI: keep last Svelte tag/branch `legacy/svelte-v0.1` until React daily-driver.  
* Never leave `main` unable to build.  

---

## 12. Definition of Done (migration complete)

1. Runtime = Tauri + React + git2 for Must Git  
2. Svelte sources removed from app entry  
3. Electron trees gone  
4. Smoke checklist green  
5. PRD/roadmap phase R6 exit criteria met  
6. codebase-summary refreshed or marked historical  

---

## 13. Risks

| Risk | Mitigation |
|------|------------|
| PTY regressions | Port terminal early; manual TUI tests |
| git2 binary size | Measure R6; strip features |
| Scope creep mid-migration | MoSCoW freeze; no agent features |
| Dual persistence bugs | Single migrator; schema version |

---

## 14. Immediate next step after docs

User picks:

1. **Start R1** (cleanup) first, or  
2. **Start R2** (git2) if cleanup is trivial, or  
3. Further doc deep-dives (e.g. exact command inventory from `git.rs`)  

No code until that call.
