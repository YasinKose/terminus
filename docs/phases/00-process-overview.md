# Terminus — Process overview

**Date:** 2026-07-25  
**Status:** Active process (v0.1 agent-closed; v0.2 product track open)  
**v0.1 design SoT (frozen core):** `docs/plans/2026-07-23-terminus-terminal-core-design.md`  
**v0.1 execution SoT (frozen):** `docs/plans/2026-07-23-terminus-terminal-core.md`  
**v0.2 product SoT:** `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`  
**Roadmap:** `docs/plans/2026-07-25-terminus-roadmap-v0.2-v0.3.md`

This document is the **project operating system**: how we sequence work, who
does what, and when a track is allowed to advance. Task-level steps live in the
active implementation plan for the current version.

---

## 1. North star

### v0.1 (delivered — agent track closed)

Ship a daily-driver **local** terminal workspace on macOS:

- Open a project → shell prompt quickly  
- Workspaces + splits that **never kill live sessions** on remount/move  
- Layouts in SQLite; restart restores layout with **new** shells  
- Activity indicators, profiles, shortcuts, six presets  
- Local `.app` / `.dmg` (unsigned OK for v0.1)  
- **Zero** remote / agent / Git-UI / task / snippet scope in the v0.1 tree  

**Honest status:** code + automated gates + local bundle artifacts **DONE**.
Interactive packaged smoke / M2 / recovery remain **human residual** before
claiming Final DoD 14/14 — see `docs/phases/02-v0.1-completion-evidence.md`.

### v0.2 (active product direction)

Multi-OS runtime + light project tools (Git UI, tasks, snippets) + optional
tmux bridge. See v0.2 scope design. Explicitly **not** SSH, AI, signing/updater,
or IDE pivot.

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

### v0.1 (complete except human residual)

```text
Baseline → Phase 0 … Phase 6 automated → evidence log
     → [human] packaged smoke + M2 + recovery → Final DoD claim
```

### v0.2 (next)

```text
v0.2 design (done) → v0.2 implementation plan → platform → git → snippets/tasks → tmux → harden
```

Rules:

1. **No phase skip** within a version plan. Gate red → fix.  
2. **No silent scope leak** from v0.3 parking lot into v0.2 PRs.  
3. **Commits** after each logical task.  
4. **PTY truth** still proven in real Tauri app smoke.  
5. **v0.1 core must stay green** (`pnpm verify:v01`, `pnpm audit:rust`) while v0.2 lands.

---

## 4. Phase gates

### v0.1

See `docs/phases/01-phase-checklist.md` and evidence doc. Phase 6 Task 21–22
remain human-gated for Final DoD claim.

### v0.2

Gates will live in the v0.2 implementation plan (to be written). Minimum bar:

- Automated tests for new modules  
- No free-form shell executor for Git/tasks  
- Capability review  
- Multi-OS build proof for at least two targets  
- Extended human smoke for Git/tasks/snippets/tmux  

---

## 5. Working agreements

### Scope control

| Version | Out of process if PR introduces… |
|---------|----------------------------------|
| **v0.1 tree freeze** | Any new feature outside frozen design (v0.1 is maintenance/fix only unless evidence tasks) |
| **v0.2** | SSH/remote, AI agents, Terminus daemon-as-product, plugins, signing/updater/Homebrew, editor IDE surfaces |
| **v0.3+** | Park as dated `docs/plans/` notes until designed |

### Testing pyramid

| Layer | What | When |
|-------|------|------|
| Unit | Pane tree, pure reducers, sanitizers | Every domain change |
| Cargo integration | SessionManager, SQL, command boundary, git/tmux backends | As modules land |
| Vitest/RTL | UI shells without real PTY | Feature UI |
| Tauri smoke | Real PTY, focus, close, restart | Always for terminal core |
| Perf + bundle | Platform numbers + installed app | Release tracks |

### Documentation hygiene

- Design changes require dated design doc + human approval.  
- Do not rewrite frozen v0.1 design history in place—supersede with new dated SoT.  
- Process overview updates when gates or version track change.  
- Do not revive `legacy/docs/prd.md` as execution SoT.  

### Research artifacts

- Firecrawl outputs live in `.firecrawl/` (gitignored).  
- Durable conclusions go in `docs/research/*`.  

---

## 6. Recommended execution modes

1. **Subagent-driven (same session)** — one agent per task; review between tasks.  
2. **Checkpoint session** — dedicated worktree + plan phase by phase.  

Keep `pnpm verify:v01` green on main.

---

## 7. Immediate next actions (repo as of 2026-07-25)

### Agent / product

1. Treat v0.1 agent track as **closed** (code + gates + local bundle evidence).  
2. Use **v0.2 scope design + roadmap** as product SoT for new features.  
3. Author `docs/plans/YYYY-MM-DD-terminus-v0.2-implementation.md` before large code.  
4. Start platform/multi-OS foundation first.

### Human (optional residual for v0.1 daily-driver claim)

1. Packaged DMG smoke matrix (evidence §3).  
2. Recovery drill.  
3. M2 five-run medians (evidence §4).  
4. Only then check Phase 6 Task 21–22 and claim Final DoD 14/14.

---

## 8. Future vision (v0.3+ parking)

Historical agent-native / fleet / mobile ideas live under `legacy/docs/`. SSH,
signing/updater, plugins, AI, and IDE surfaces require **dedicated designs**
before code. See roadmap §4.
