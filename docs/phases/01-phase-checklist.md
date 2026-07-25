# Phase checklist (quick reference)

Use with `docs/plans/2026-07-23-terminus-terminal-core.md`. Check boxes only with evidence (command output or smoke notes).

## Phase 0 — Clean foundation

| Task | Title | Done |
|------|-------|------|
| 1 | Archival baseline + worktree | [x] |
| 2 | React/Vite/Tailwind/Vitest/shadcn (pnpm) | [x] |
| 3 | Tauri v2 Rust scaffold | [x] |

**Gate:** scaffold boots; cargo check; legacy out of graph.

## Phase 1 — Domain & persistence

| Task | Title | Done |
|------|-------|------|
| 4 | Pure pane-tree operations | [x] |
| 5 | rusqlite models + migrations | [x] |
| 6 | Typed project/workspace commands | [x] |

**Gate:** tree invariants + DB round-trip tests green.

## Phase 2 — Rust PTY core

| Task | Title | Done |
|------|-------|------|
| 7 | Profiles + macOS login env | [x] |
| 8 | SessionManager | [x] |
| 9 | Channel-backed PTY commands | [x] |

**Gate:** repeated Rust PTY integration tests stable.

## Phase 3 — Stable xterm runtime

| Task | Title | Done |
|------|-------|------|
| 10 | TerminalRuntimeRegistry | [x] |
| 11 | TerminalHost + PTY wiring | [x] |

**Gate:** real app: type/paste/resize; remount does not kill session.

## Phase 4 — Projects, workspaces, panes

| Task | Title | Done |
|------|-------|------|
| 12 | App shell | [x] |
| 13 | N-ary split render/resize | [x] |
| 14 | Drag/swap/insert/workspace move | [x] |
| 15 | Confirms / exit retention / restart | [x] |

**Gate:** full layout UX smoke without identity loss.

## Phase 5 — Activity, settings, recovery

| Task | Title | Done |
|------|-------|------|
| 16 | Lifecycle + activity + OSC | [x] |
| 17 | Profiles + shortcuts | [x] |
| 18 | Six appearance presets | [x] |
| 19 | DB recovery UI | [x] |

**Gate:** settings/activity/recovery smoke; no silent DB reset.

## Phase 6 — Hardening

| Task | Title | Done |
|------|-------|------|
| 20 | Regression tests | [x] |
| 21 | Tauri smoke matrix | [x] |
| 22 | Perf + local bundle + security | [x] |

**Gate:** Final DoD 14/14.

## Final DoD (summary)

1. legacy out of build/types  
2. project opens to usable shell  
3. SQLite layout persistence  
4. lazy workspaces + stay mounted after first use  
5. layout ops preserve live terminal identity  
6. no unmount/nav path closes PTY  
7. close always confirms and tears down correctly  
8. exited panels restartable  
9. activity + OSC title/cwd  
10. profiles, shortcuts, palette, presets  
11. protected DB recovery  
12. automated + smoke + perf + bundle  
13. no scope leak  
14. security reviews clean  
