# Terminus v0.1 Completion Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every verified gap between the approved Terminus v0.1 design and the current implementation, then produce the real macOS evidence required to declare v0.1 complete.

**Architecture:** The work is split into three independently reviewable plans. Core correctness lands first because restored selection, shell resolution, close semantics, and visible errors are foundations for every later smoke scenario; interaction completion follows; release proof runs only after both code plans are green.

**Tech Stack:** React 19, TypeScript, Zustand 5, xterm.js, Tauri v2, Rust, portable-pty, rusqlite, Vitest, Testing Library, Cargo tests, macOS `.app`/`.dmg`.

## Global Constraints

- The approved product and architecture remain `docs/plans/2026-07-23-terminus-terminal-core-design.md`.
- The existing v0.1 exclusions remain in force: no SSH, remote execution, tmux/daemon, AI agents, Git UI, tasks, snippets, editor, updater, signing, notarization, or Homebrew work.
- `legacy/` remains read-only and absent from the shipped graph.
- High-frequency PTY output continues to bypass Zustand.
- A React unmount, workspace hide, pane move, theme change, or profile selection must never close or recreate a live PTY/xterm runtime.
- Every behavior change follows test-first development and ends in a focused Conventional Commit.
- Real PTY/TUI, bundle, and performance claims require evidence from the packaged macOS application.

---

## Plan order

| Order | Plan | Independently testable outcome |
|---|---|---|
| 1 | `2026-07-25-terminus-v01-core-correctness.md` | Correct system shell, restored active selection, durable workspace selection, safe close failure handling, and visible recoverable errors |
| 2 | `2026-07-25-terminus-v01-interaction-completion.md` | Workspace reorder, project/pane/workspace context menus, per-pane profiles, profile fallback, and live OSC attention |
| 3 | `2026-07-25-terminus-v01-release-proof.md` | Automated gates, RustSec policy, real packaged-app smoke, measured M2 gates, security review, and truthful phase documents |

## Execution checkpoints

- [ ] **Checkpoint 1: Execute the core-correctness plan**

Run every task and gate in `docs/superpowers/plans/2026-07-25-terminus-v01-core-correctness.md`.

Expected: selecting or creating a workspace persists the active project/workspace; app bootstrap initializes the restored workspace; the default profile uses the captured `$SHELL`; a failed PTY close does not discard runtime state.

- [ ] **Checkpoint 2: Review the core diff**

Run:

```bash
pnpm test:run
pnpm check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: every command exits 0 before interaction work begins.

- [ ] **Checkpoint 3: Execute the interaction-completion plan**

Run every task and gate in `docs/superpowers/plans/2026-07-25-terminus-v01-interaction-completion.md`.

Expected: all planned management actions are available through keyboard-accessible context menus; workspace positions persist atomically; each pane can store and display a profile; deleted overrides fall back safely; OSC 9/777 attention reaches the terminal status indicator.

- [ ] **Checkpoint 4: Review the interaction diff**

Run:

```bash
pnpm test:run
pnpm check
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
```

Expected: every command exits 0 and the production build retains WebGL as a separate lazy chunk.

- [ ] **Checkpoint 5: Execute the release-proof plan**

Run every task and gate in `docs/superpowers/plans/2026-07-25-terminus-v01-release-proof.md` on the project owner’s M2 Mac.

Expected: a freshly built `Terminus.app` and DMG pass the full matrix; measured medians satisfy the approved limits; the dependency/security policy passes; phase documents match the evidence.

## Program definition of done

- [ ] The six verified product gaps are closed: restored selection, `$SHELL`, workspace reorder, per-pane profiles, OSC attention, and context menus.
- [ ] Workspace selection from tabs, shortcuts, the command palette, and creation paths persists through the same typed action.
- [ ] Project rename is reachable from the project context menu using the already-shipped backend command.
- [ ] Backend close failure never silently removes the frontend runtime or pane.
- [ ] User-action failures produce a bounded, non-secret error notification.
- [ ] No empty catch block remains without an explicit, reviewed fallback comment.
- [ ] Frontend, Rust, formatting, static analysis, dependency, and security gates pass under the documented policy.
- [ ] The packaged application passes the real terminal/workspace/lifecycle/recovery matrix.
- [ ] All four M2 performance gates have recorded median evidence.
- [ ] `docs/phases/01-phase-checklist.md` and Phase 6 evidence accurately reflect the completed work.

