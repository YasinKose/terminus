# Terminus roadmap — v0.2 / v0.3

**Date:** 2026-07-25  
**Status:** Active product sequencing after v0.1 agent close  
**v0.2 design:** `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`  
**v0.1 evidence:** `docs/phases/02-v0.1-completion-evidence.md`

---

## 1. Version table

| Version | Focus | In | Out |
|---------|--------|----|-----|
| **v0.1** (frozen core) | Local macOS terminal workspace | Projects, workspaces, splits, PTY, SQLite, profiles, activity/OSC, palette, presets, local unsigned `.app`/`.dmg` | SSH/remote, tmux/daemon, AI, Git UI, tasks/snippets, signing/updater/Homebrew |
| **v0.2** (next) | Multi-OS + light project tools + optional tmux | Multi-OS runtime; Git UI (light); Tasks; Snippets (+ optional Makefile import); tmux bridge (opt-in) | SSH/remote, AI, Terminus daemon-as-product, plugins, signing/updater/Homebrew, editor/IDE surfaces |
| **v0.3** (later) | Remote + distribution + deeper product | SSH/remote (if designed); signing/notarization; updater; Homebrew/channels; deeper VCS hosting; optional plugins/AI only with dedicated designs | Anything not designed |

---

## 2. v0.1 close status (honest)

| Layer | Status |
|-------|--------|
| Code DoD | DONE |
| Automated gates (`verify:v01`, `audit:rust`) | DONE |
| Local `tauri:build` + artifact inspect | DONE |
| Interactive packaged smoke / M2 / recovery | **NOT RUN** (human) |
| Final DoD 14/14 daily-driver claim | **NOT claimed** |

**Process decision:** Agent product track for v0.1 is **closed**. Residual human
validation may continue in parallel. New feature work follows **v0.2 design**.

---

## 3. v0.2 workstreams (order suggestion)

1. **Platform foundation** — `src-tauri/src/platform/`, shell resolution, window chrome abstraction, CI targets.  
2. **Git UI** — Rust backend + `src/features/git/` light workbench.  
3. **Snippets** — insert via `write_pty`; optional Makefile import.  
4. **Tasks** — project-local board.  
5. **tmux bridge** — opt-in attach path; document restart/reconnect.  
6. **Hardening** — extended verify script, multi-OS smoke notes, capability review.

Exact task breakdown → future implementation plan (do not invent scope mid-flight).

---

## 4. v0.3 parking lot (do not pull into v0.2 PRs)

- SSH / remote execution / VDS-VPS  
- AI agent orchestration and chat  
- Custom Terminus background daemon  
- Code signing, notarization  
- Auto-updater  
- Homebrew / multi-channel distribution polish  
- Plugin marketplace  
- Editor / embedded browser surfaces  
- Serial, SFTP, quake mode  
- Encrypted secret store  
- Profile marketplace / icons / inheritance  
- Full JSON keybinding system / conditional chord maps  
- Local-PTY process revive + scrollback across app restart  
- Foreground process inspection / shell injection  
- Fleet / mobile / agent-native (legacy vision)

Park new ideas as **dated** notes under `docs/plans/`; do not merge into v0.2
design without approval.

---

## 5. Documentation precedence (post–v0.1)

When documents disagree for **new work**:

1. **v0.2 scope design** — `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`  
2. **This roadmap**  
3. **v0.1 design/plan** — frozen constraints and core architecture (still binding for terminal core)  
4. **`docs/phases/*`** — process + evidence  
5. **`CLAUDE.md` / `AGENTS.md`**  
6. **`docs/research/*`** — non-binding  
7. **`legacy/**`** — historical only  

v0.1 Final DoD claim remains gated by evidence §3–§4 regardless of v0.2 start.

---

## 6. Immediate next actions

### Human (optional, closes v0.1 daily-driver claim)

1. `pnpm tauri:build` (fresh) if needed  
2. DMG → copy `.app` → smoke matrix (evidence §3)  
3. Recovery drill (evidence §3 #11)  
4. M2 five-run medians (evidence §4)  
5. Only then check Phase 6 Task 21–22 and claim Final DoD  

### Agent / implementation (v0.2 start)

1. Write `docs/plans/YYYY-MM-DD-terminus-v0.2-implementation.md` (phased tasks)  
2. Scaffold `platform/` + multi-OS shell resolution  
3. Git backend spike behind typed commands  
4. Keep v0.1 core green: `pnpm verify:v01` / `pnpm audit:rust`  

---

## 7. One-line summaries

- **v0.1:** Local macOS terminal workspace core — **agent-closed**; human smoke residual.  
- **v0.2:** Multi-OS + Git UI + tasks + snippets + tmux bridge.  
- **v0.3:** Remote, distribution, and everything else with its own design.  
