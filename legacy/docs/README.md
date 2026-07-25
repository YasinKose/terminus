# Terminus Documentation

> Revised **2026-07-18** — stack lock: **Tauri v2 + React + git2**

## Start here

| Doc | What it is |
|-----|------------|
| **[prd.md](./prd.md)** | Product requirements, MoSCoW, goals, non-goals |
| **[roadmap.md](./roadmap.md)** | Phases R0–R6 (source of truth for planning status) |
| **[architecture.md](./architecture.md)** | Target system design & invariants |
| **[git-backend.md](./git-backend.md)** | libgit2 design, command surface, DTOs |
| **[frontend-standards.md](./frontend-standards.md)** | React structure, components, quality gates |
| **[migration-plan.md](./migration-plan.md)** | Svelte→React & shell-git→git2 execution plan |
| **[peer-research.md](./peer-research.md)** | OSS peers → what we absorb / refuse |

## Historical / snapshot

| Path | Notes |
|------|--------|
| [phases/](./phases/) | Original Svelte MVP phase checklists (may lag code) |
| [plans/](./plans/) | Design notes; Electron plans obsolete; git window plan superseded by slim Git |
| [codebase-summary/](./codebase-summary/) | Snapshot of **current** Svelte implementation |

## Decision log (locked)

1. Stay on **Tauri** (not Electron).  
2. Frontend: **React** (leave Svelte).  
3. Git: **git2**, shrink API/UI.  
4. Product: terminal-first workbench (projects, PTY, tasks, snippets, light Git) — not agent IDE.  

## Next

Complete R0 by treating this set as authoritative, then start **R1 cleanup** or **R2 git2** per [migration-plan.md](./migration-plan.md).
