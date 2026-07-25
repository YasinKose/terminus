# CLAUDE.md — Terminus

Instructions for AI agents working in this repository.

## What Terminus is

**v0.1 (agent-closed core):** macOS-first **local** terminal workspace — project folders → workspaces → split terminal panes. Compact, keyboard-first. Not an IDE, remote orchestrator, or AI platform.

**v0.2 (active product direction):** multi-OS runtime + light Git UI + tasks + snippets + optional tmux bridge. See v0.2 scope design.

**Authoritative product docs (read these first):**

| Doc | Role |
|-----|------|
| `docs/plans/2026-07-25-terminus-v0.2-scope-design.md` | **v0.2 product SoT** (new features) |
| `docs/plans/2026-07-25-terminus-roadmap-v0.2-v0.3.md` | Version sequencing + parking lot |
| `docs/plans/2026-07-23-terminus-terminal-core-design.md` | Frozen v0.1 design (terminal core architecture) |
| `docs/plans/2026-07-23-terminus-terminal-core.md` | Frozen v0.1 implementation plan (phases 0–6) |
| `docs/phases/02-v0.1-completion-evidence.md` | v0.1 automated vs human residual |
| `docs/phases/00-process-overview.md` | Process, gates, roles |
| `docs/research/2026-07-25-peer-landscape.md` | Peer research notes (absorb / skip) |
| `docs/README.md` | Docs index and precedence |

If docs conflict: **v0.2 SoT wins for new features**; **v0.1 design wins for terminal-core invariants**.

## Explicit non-goals

### Still out of v0.2 (park → v0.3+)

- SSH / VDS / remote execution  
- AI agent orchestration, chat, or “agent IDE”  
- Custom Terminus background daemon (product)  
- Signing, notarization, updater, Homebrew distribution  
- Plugin marketplace, editor/IDE surfaces  

### In v0.2 (allowed — design first)

- Multi-OS runtime  
- Git UI (light workbench)  
- Tasks, snippets (+ optional Makefile import)  
- Optional tmux **bridge** (user’s tmux; not a Terminus daemon)

`legacy/` is a **read-only behavioral reference**. Never import from it into the app graph.

## Stack (approved)

| Layer | Choice |
|-------|--------|
| Desktop | Tauri v2 |
| Backend | Rust, `portable-pty`, SQLite via `rusqlite` |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 4 + selected shadcn/ui (restyled) |
| State | Zustand 5 (low-frequency UI only) |
| Terminal | xterm.js + FitAddon; optional WebGL with Canvas fallback |
| Package manager | **pnpm** |
| Tests | Vitest 4 + Testing Library; Cargo unit/integration |

## Architecture rules (non-negotiable)

1. **Rust owns all OS side effects** — paths, PTY spawn/write/resize/close, SQLite, dialogs. UI never shells out or opens files directly for product logic.
2. **Typed Tauri boundary** — `invoke` for commands; **ordered Channels** for high-frequency PTY output (not global events, not one-IPC-per-byte).
3. **PTY output bypasses Zustand** — stream → `TerminalRuntimeRegistry` → xterm. Stores hold metadata (title, cwd, activity, focus), not scrollback.
4. **Runtime identity ≠ React mount identity** — remount/move/hide must not dispose PTY or xterm. Dispose only on explicit user close.
5. **Domain:** `Project → Workspace → n-ary PaneNode` (`TerminalLeaf | SplitContainer`). Leaf `id` == PTY session id. Preserve leaf identity across layout ops (single-child splits allowed when needed).
6. **Restart semantics:** restore layout from SQLite; spawn **fresh** shells. No process or scrollback restore.
7. **Close semantics:** only explicit user action closes a session; every close path confirms; exited panes stay visible and restartable.
8. **Security:** profile-validated spawn only (no free-form shell executor); parameterized SQL; restrictive CSP/capabilities; OSC/title/cwd treated as untrusted; no secrets store claim for env overrides.

## Target tree (post Phase 0)

```text
.
├── CLAUDE.md / AGENTS.md
├── docs/
│   ├── README.md
│   ├── phases/          # process + phase gates
│   ├── plans/           # design + implementation plans
│   └── research/        # peer / external research
├── src/                 # React app (features/*, stores, lib/tauri)
├── src-tauri/           # Rust: commands, pty, persistence
└── legacy/              # frozen old app + old docs — do not import
```

## Working process

1. **Baseline first** — Archival move + plan files need a clean Git baseline before feature work (Task 1). Prefer an isolated git worktree for implementation.
2. **One phase at a time** — Follow `docs/plans/2026-07-23-terminus-terminal-core.md`. Do not start Phase N+1 while Phase N gate is red.
3. **TDD for behavior** — Pure domain and unit-testable logic first (failing test → implement → pass). PTY/UI lifecycle needs real Tauri smoke, not jsdom alone.
4. **Commits** — Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Atomic, reviewable. Suggested messages in the plan are hints; stage deliberately.
5. **Gates** — After each phase: automated checks listed in the plan + phase smoke. Before claiming done: `verification-before-completion` evidence.
6. **Code review** — After significant slices / Phase 6: code review + mandatory security pass.

### Phase map (summary)

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Clean foundation | Archival baseline, React/Vite/Tailwind/Vitest/shadcn scaffold, Tauri v2 Rust shell |
| 1 | Domain & persistence | Pure pane-tree ops, rusqlite models/migrations, typed project/workspace commands |
| 2 | Rust PTY core | Profiles + login env, SessionManager, Channel commands |
| 3 | xterm runtime | TerminalRuntimeRegistry, TerminalHost ↔ PTY wiring |
| 4 | Projects / workspaces / panes | App shell, n-ary splits, DnD, confirms, exit retention |
| 5 | Activity / settings / recovery | Lifecycle, OSC, profiles, shortcuts, 6 presets, DB recovery UI |
| 6 | Hardening | Regression suite, smoke matrix, perf gates, local `.app`/`.dmg`, security |

Full tasks: implementation plan Tasks 1–22. Process detail: `docs/phases/00-process-overview.md`.

### Final DoD (all must be true)

See implementation plan “Final definition of done” (14 points). Highlights: usable local shell; SQLite layouts; stable pane identity under move/split; no accidental PTY kill; confirms on close; activity/OSC; recovery never silent-delete; perf gates; **no scope leak**.

### Performance gates (M2 workstation)

- Cold interactive app ≤ 2s  
- Active-workspace prompt ≤ 1s after UI ready  
- Idle one-terminal RSS < 150 MB  
- 8 visible terminals: typing stays responsive  

## Commands (target after scaffold)

Prefer **pnpm** as in the implementation plan:

```bash
pnpm install
pnpm dev                 # Vite only
pnpm tauri:dev           # full desktop app
pnpm check               # TS / frontend checks
pnpm test:run
pnpm build
pnpm tauri:build         # local .app / .dmg
pnpm verify:v01          # full FE + Rust + static release gate
pnpm audit:rust          # cargo-audit policy gate

cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

## Coding conventions

### TypeScript / React

- 2-space indent, semicolons, `strict` TypeScript  
- Components: `PascalCase`  
- Stores: `camelCase` + clear store naming (e.g. `useProjectStore`)  
- Feature folders under `src/features/*`  
- No `as any`, `@ts-ignore`, or empty `catch`  
- Do not put high-frequency terminal bytes in React state  

### Rust

- rustfmt (4 spaces)  
- Commands return structured errors: `{ code, message, details?, recoverable }`  
- Missing sessions are never silent success  
- Parameterized SQL only  
- Least-privilege capabilities in `src-tauri/capabilities/`  

### Git

- Never commit secrets, machine paths, or `.firecrawl/` research dumps  
- Do not commit unless the user asks  

## Legacy lessons (carry / skip)

**Carry (behavior):** ID-idempotent spawn; explicit close; mounted workspace stability; stable leaf identity; empty-workspace recovery; Fit/WebGL fallback lessons.

**Skip:** Svelte stack; localStorage as app DB; event-per-chunk transport; backend scrollback snapshots; silent missing-session ops; Git/tasks/snippets/Electron/remote-agent product scope.

## Peer product posture

Closest peer stack: **Dispatcher** (Tauri + React + xterm, project sidebar, splits, activity dots). Absorb UX patterns (activity dots, project-first); **do not** copy tmux `-CC`, notes-as-product, or multi-remote scope into v0.1. Tabby → profiles/tabs/shortcuts inspiration only. Wave → skip AI-native pivot. Details: `docs/research/2026-07-25-peer-landscape.md`.

## Agent anti-patterns

- Implementing from `legacy/docs/prd.md` “agent-native fleet” vision without a dated design  
- Treating old Svelte `AGENTS.md` layout as current target  
- Closing PTYs on React unmount / workspace hide  
- Using Zustand or global events for PTY byte stream  
- Pulling v0.3 park-lot items (SSH/AI/signing/updater) into v0.2  
- Claiming v0.1 Final DoD / daily-driver without evidence §3–§4 PASS  
- Declaring a phase complete without gate evidence  

## When stuck

1. Re-read the approved design section for the feature.  
2. Check the matching Task steps in the implementation plan.  
3. Prefer pure domain tests before UI.  
4. For PTY races/lifecycle: real `tauri:dev` smoke, not speculation.  
5. Hard architecture tradeoffs: stop and ask the human; do not expand scope.  
