# Project Roadmap — Terminus

> **Status:** Revised 2026-07-18  
> **Scope:** Post-MVP product revision (React + git2 + doc/product alignment)  
> **Rule:** Phase checkboxes here are the **source of truth** for planning status. Historical `docs/phases/*` describe the **original** Svelte MVP and may lag code.

---

## 1. Overview

Terminus is a Tauri desktop **project + terminal + task + light Git** command center.

### Where we are (code reality, 2026-07)

| Area | Status in current Svelte app |
|------|------------------------------|
| Foundation (shell, sidebar, titlebar) | Done |
| Core terminal (PTY, tabs, free split, workspace stability) | Done (beyond original P2) |
| Task Kanban + `.tasks/board.json` | Done |
| Polish (palette, shortcuts, themes, zen) | Mostly done |
| Snippets + Makefile scan | Done (simplify / standardize later) |
| Git workbench (shell CLI + large UI + detach) | Done but **over-complex** — rewrite target |
| Frontend | Svelte 5 — **migration to React planned** |
| Git backend | `git` CLI shell-outs — **migration to git2 planned** |
| Legacy Electron tree | Dead; breaks clean check — **delete in R1** |

### Where we are going (locked)

1. Stay on **Tauri v2**  
2. **React** UI with standardized components  
3. **git2** for repository operations; **shrink** Git API/UI  
4. Absorb peer learnings (dispatcher/termul/maiterm) without agent-IDE scope  

---

## 2. Roadmap eras

```text
Era A — Original MVP (Svelte)     ≈ Phases 1–4 historical
Era B — Revision (docs + stack)   ← YOU ARE HERE (docs first)
Era C — Target stack product      React + git2 + slim Git + clean gates
```

---

## 3. Revision phases (Era B → C)

| Phase | Name | Focus | Est. |
|-------|------|-------|------|
| **R0** | Documentation lock | PRD, architecture, git, FE standards, migration, peer notes | Done when docs merged |
| **R1** | Cleanup & contracts | Remove Electron dead code; freeze PTY/task invoke contracts; inventory git commands to cut | 2–4 days |
| **R2** | git2 backend | New `git` module on libgit2; structured types; feature parity for Must Git only | 1–2 weeks |
| **R3** | React scaffold | Vite+React+TS+Tailwind; design system shell; dual-run or hard cut | 1 week |
| **R4** | Feature parity (core) | Projects, workspaces, terminal, splits, tasks, palette, zen | 2–3 weeks |
| **R5** | Snippets + slim Git UI | Snippets; Git pane composed of small components | 1–2 weeks |
| **R6** | Hardening | Check/CI green, smoke checklist, metrics sample, README productization | 1 week |

Parallelism allowed: **R2** can start after R1 contracts; **R3** can scaffold while R2 lands if IPC types are agreed.

---

## 4. Phase details

### R0 — Documentation lock

- [x] Scope review (code vs PRD)  
- [x] Peer research (dispatcher, termul, maiterm, …)  
- [x] **PRD revised** (`docs/prd.md`)  
- [x] **Roadmap revised** (this file)  
- [x] Architecture target doc (`docs/architecture.md`)  
- [x] Git backend design (`docs/git-backend.md`)  
- [x] Frontend standards (`docs/frontend-standards.md`)  
- [x] Migration plan (`docs/migration-plan.md`)  
- [x] Peer research synthesis (`docs/peer-research.md`)  
- [x] Docs index (`docs/README.md`)  

**Exit:** Product decisions written; no ambiguity on stack or MoSCoW core. **→ R0 complete.**

### R1 — Cleanup & contracts

- [ ] Delete or fully exclude legacy Electron (`src/main`, `src/renderer`, `src/shared`) from TS project  
- [ ] Document frozen invoke API for `pty_*`, `load_board` / `save_board`, `scan_makefile`  
- [ ] List current git/gh commands → **keep / cut / later** matrix  
- [ ] Capability audit (`capabilities/*.json`) least privilege  
- [ ] README becomes product doc (not Vite template)  

**Exit:** `npm run check` and `cargo check` green on cleaned tree; command inventory agreed.

### R2 — git2 backend

- [ ] Add `git2` dependency; module layout under `src-tauri/src/git/`  
- [ ] Implement Must operations: status, diff, stage, unstage, discard, commit, branch basic, stash basic  
- [ ] Structured serde types shared with FE  
- [ ] Remove happy-path `Command::new("git")` for covered ops  
- [ ] Graceful “not a git repo” handling  
- [ ] Optional: CLI fallback only where documented  

**Exit:** FE (even Svelte temporary) can call new git commands; old mega-surface deprecated.

### R3 — React scaffold

- [ ] Vite React + TS + Tailwind app entry  
- [ ] `src/ui` primitives (Button, Modal, Input, List, Tabs, …)  
- [ ] App shell: TitleBar, Sidebar, main content region  
- [ ] Tauri invoke wrappers typed  
- [ ] Routing: none or minimal (single-window app)  

**Exit:** Empty shell runs under `tauri dev` with React.

### R4 — Core parity

- [ ] Project store + workspace model  
- [ ] Split pane tree + DnD  
- [ ] Terminal + PTY lifecycle (parity with current stability rules)  
- [ ] Kanban + board I/O  
- [ ] Command palette + shortcuts + appearance + zen  

**Exit:** Daily driver for terminal + tasks without Svelte.

### R5 — Snippets + slim Git UI

- [ ] Snippet list/editor/insert  
- [ ] Makefile import  
- [ ] Git workbench as **composed** components (StatusList, DiffView, CommitBox, BranchSelect)  
- [ ] No detached Git window unless re-justified  

**Exit:** MoSCoW Must complete on React + git2.

### R6 — Hardening

- [ ] Smoke checklist (open project, spawn, split, task, git commit, snippet)  
- [ ] Measure startup / RSS sample → record in docs  
- [ ] CI: check + cargo check  
- [ ] Archive obsolete plans or mark Superseded  
- [ ] Tag pre-1.0 beta  

**Exit:** Internal beta criteria met.

---

## 5. Historical milestones (Era A — original Svelte MVP)

These were the original roadmap items. **Code largely completed them**; checkboxes below reflect **planning docs at the time**, not a re-audit.

| ID | Milestone | Code reality |
|----|-----------|--------------|
| M1 | Hello Tauri shell | Done |
| M2 | Terminal alive | Done |
| M3 | Project context / CWD | Done (workspaces) |
| M4 | Tasks board I/O | Done |
| M5 | Beta < 20MB | Unmeasured; gate for R6 |

Historical task lists: `docs/phases/phase-1` … `phase-4`.

---

## 6. Explicit non-goals (near-term)

* Electron rewrite  
* Agent multi-session product  
* Full GitHub client  
* Plugin marketplace  
* Cloud sync MVP  

---

## 7. Dependency graph

```text
R0 docs ──► R1 cleanup ──┬──► R2 git2 ──┐
                         │              ├──► R5 slim Git UI
                         └──► R3 React ─┴──► R4 core ──► R5 snippets ──► R6 harden
```

---

## 8. Success criteria for “revision complete”

1. PRD stack matches runtime (Tauri + React + git2)  
2. No Electron sources in typecheck graph  
3. Git happy path uses git2; command count ≤ agreed Must set  
4. Terminal stability rules preserved  
5. `npm run check` + `cargo check` green  
6. Smoke checklist passed and recorded  

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-07-18 | Era B/C revision phases R0–R6; lock React + git2 |
| earlier | Original 4-phase Svelte MVP roadmap |
