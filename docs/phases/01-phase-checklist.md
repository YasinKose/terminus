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
| 4 | Pure pane-tree operations | [ ] |
| 5 | rusqlite models + migrations | [ ] |
| 6 | Typed project/workspace commands | [ ] |

**Gate:** tree invariants + DB round-trip tests green.

## Phase 2 — Rust PTY core

| Task | Title | Done |
|------|-------|------|
| 7 | Profiles + macOS login env | [ ] |
| 8 | SessionManager | [ ] |
| 9 | Channel-backed PTY commands | [ ] |

**Gate:** repeated Rust PTY integration tests stable.

## Phase 3 — Stable xterm runtime

| Task | Title | Done |
|------|-------|------|
| 10 | TerminalRuntimeRegistry | [ ] |
| 11 | TerminalHost + PTY wiring | [ ] |

**Gate:** real app: type/paste/resize; remount does not kill session.

## Phase 4 — Projects, workspaces, panes

| Task | Title | Done |
|------|-------|------|
| 12 | App shell | [ ] |
| 13 | N-ary split render/resize | [ ] |
| 14 | Drag/swap/insert/workspace move | [ ] |
| 15 | Confirms / exit retention / restart | [ ] |

**Gate:** full layout UX smoke without identity loss.

## Phase 5 — Activity, settings, recovery

| Task | Title | Done |
|------|-------|------|
| 16 | Lifecycle + activity + OSC | [ ] |
| 17 | Profiles + shortcuts | [ ] |
| 18 | Six appearance presets | [ ] |
| 19 | DB recovery UI | [ ] |

**Gate:** settings/activity/recovery smoke; no silent DB reset.

## Phase 6 — Hardening

| Task | Title | Done |
|------|-------|------|
| 20 | Regression tests | [ ] |
| 21 | Tauri smoke matrix | [ ] |
| 22 | Perf + local bundle + security | [ ] |

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
