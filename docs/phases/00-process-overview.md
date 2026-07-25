# Terminus v0.1 — Process overview

**Date:** 2026-07-25  
**Status:** Active process for approved Terminal Core  
**Design SoT:** `docs/plans/2026-07-23-terminus-terminal-core-design.md`  
**Execution SoT:** `docs/plans/2026-07-23-terminus-terminal-core.md`

This document is the **project operating system**: how we sequence work, who does what, and when a phase is allowed to advance. Task-level steps live only in the implementation plan.

---

## 1. North star

Ship a daily-driver **local** terminal workspace on macOS:

- Open a project → shell prompt quickly  
- Workspaces + splits that **never kill live sessions** on remount/move  
- Layouts in SQLite; restart restores layout with **new** shells  
- Activity indicators, profiles, shortcuts, six presets  
- Local `.app` / `.dmg` (unsigned OK for v0.1)  
- **Zero** remote / agent / Git-UI / task / snippet scope  

---

## 2. Roles

| Role | Responsibility |
|------|----------------|
| **Human owner** | Scope arbitration, design approvals, phase go/no-go, daily-driver smoke on real machine |
| **Implementation agent(s)** | One task or thin vertical slice at a time; TDD; follow plan file paths |
| **Reviewer agent / human** | Diff review after phase or risky tasks; security review before “done” |
| **Process lead (this doc)** | Keep gates honest; stop scope leak; keep docs in sync with design |

---

## 3. Cadence

```text
Baseline (Task 1)
    → Phase 0 scaffold
    → Phase 1 domain/DB
    → Phase 2 PTY
    → Phase 3 xterm runtime
    → Phase 4 shell + panes UX
    → Phase 5 activity/settings/recovery
    → Phase 6 harden + bundle
    → Final DoD + security
```

Rules:

1. **No phase skip.** Gate red → fix, don’t accumulate debt into the next phase.  
2. **No parallel feature tracks** that depend on unfinished PTY/runtime until Phase 3 gate is green.  
3. **Commits** after each logical task (or plan Step “Commit”).  
4. **Worktree** for implementation after baseline is clean.  
5. **PTY truth** is only proven in real Tauri app smoke.  

---

## 4. Phase gates (checklist)

Copy into PR / handoff notes. Detail and commands: implementation plan.

### Phase 0 — Clean foundation

- [ ] Old product tree archived under `legacy/` (or equivalent baseline commit)  
- [ ] Approved plans committed / present on baseline  
- [ ] React 19 + Vite + TS + Tailwind 4 + Vitest + shadcn scaffold boots (`pnpm`)  
- [ ] Tauri v2 Rust project skeleton builds (`cargo check`)  
- [ ] `legacy/` not in frontend/backend build graph  

### Phase 1 — Domain & persistence

- [ ] Pure pane-tree ops unit-tested (split/resize/swap/insert/move invariants)  
- [ ] rusqlite schema + migrations  
- [ ] Typed project/workspace commands round-trip through SQLite  
- [ ] Structured errors; no silent success on missing entities  

### Phase 2 — Rust PTY core

- [ ] Default profile = login shell (`$SHELL -l` semantics as designed)  
- [ ] SessionManager: spawn / write / resize / close / state machine  
- [ ] Ordered Channel output; stress Unicode + sustained output  
- [ ] Integration tests: no hang, no duplicate session, no silent missing-session  

### Phase 3 — Stable xterm runtime

- [ ] TerminalRuntimeRegistry owns xterm lifecycle  
- [ ] Host attach/detach without dispose  
- [ ] Wiring: Channel → xterm; input → write; resize → fit + PTY resize  
- [ ] Manual smoke: type, paste, resize, simple TUI  

### Phase 4 — Projects, workspaces, panes

- [ ] App shell (titlebar overlay, sidebar, workspace tabs)  
- [ ] N-ary split render + resize  
- [ ] DnD: edge insert, center swap, same-project workspace move  
- [ ] Confirms on close; exited pane retained + restart  
- [ ] Workspace switch does not remount surviving live terminals incorrectly  

### Phase 5 — Activity, settings, recovery

- [ ] active / quiet / unread + bell/OSC attention  
- [ ] OSC title + cwd tracking (bounded, sanitized)  
- [ ] Profiles + configurable core shortcuts + command palette  
- [ ] Six appearance presets  
- [ ] DB open/migration failure → protected recovery UI (never silent wipe)  

### Phase 6 — Hardening & daily driver

- [ ] Regression suite + smoke matrix green  
- [ ] Perf gates on M2 workstation (see design §13)  
- [ ] `pnpm tauri:build` → installable `.app`/`.dmg`  
- [ ] Bundled-app smoke (not only dev)  
- [ ] Audit/clippy/security review clean for **shipped** graph  
- [ ] Final DoD 14/14  

---

## 5. Working agreements

### Scope control

Any PR or task that introduces SSH, tmux, daemon, agents, Git UI, tasks, snippets, editor, updater, or distribution is **out of process** for v0.1. Capture as a future backlog note under `docs/plans/` with date — do not merge into core path.

### Testing pyramid

| Layer | What | When |
|-------|------|------|
| Unit | Pane tree, pure reducers, sanitizers | Every domain change |
| Cargo integration | SessionManager, SQL, command boundary | Phase 2+ |
| Vitest/RTL | UI shells without real PTY | Phase 3–5 |
| Tauri smoke | Real PTY, focus, close, restart | Phase gates 2–6 |
| Perf + bundle | M2 numbers + installed app | Phase 6 |

### Documentation hygiene

- Design changes require design doc update + human approval.  
- Plan task edits allowed when reality diverges — note “why” briefly.  
- Process overview updates when gates or cadence change.  
- Do not revive `legacy/docs/prd.md` as execution SoT.  

### Research artifacts

- Firecrawl outputs live in `.firecrawl/` (gitignored).  
- Durable conclusions go in `docs/research/*`.  

---

## 6. Recommended execution modes

After Task 1 baseline is clean:

1. **Subagent-driven (same session)** — one agent per task; review between tasks (`subagent-driven-development`).  
2. **Checkpoint session** — dedicated worktree + `executing-plans` phase by phase.  

Do not start either mode on a half-deleted dirty tree without a reviewable archival commit.

---

## 7. Immediate next actions (repo as of 2026-07-25)

1. Finish archival baseline: commit plan files + `legacy/` move + docs process pack (`CLAUDE.md`, `docs/*`).  
2. Refresh `AGENTS.md` to match React/Tauri target (done in same docs pass).  
3. Create implementation worktree.  
4. Execute Phase 0 Tasks 2–3 (scaffold).  
5. Only then Phase 1 domain.  

---

## 8. Future vision (parked)

Historical agent-native / fleet / mobile ideas live under `legacy/docs/`. They inform **post–v0.1** product thinking only after Terminal Core DoD is met. No code path for them in the current plan.
