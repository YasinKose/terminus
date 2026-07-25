# Terminus documentation

## Source-of-truth order

When documents disagree, use this precedence:

1. **`docs/plans/2026-07-23-terminus-terminal-core-design.md`** — approved product & architecture (v0.1)
2. **`docs/plans/2026-07-23-terminus-terminal-core.md`** — implementation plan (phases 0–6, tasks 1–22)
3. **`docs/phases/*`** — process, gates, and operating cadence
4. **`CLAUDE.md` / `AGENTS.md`** — agent & contributor operating guides (must track 1–2)
5. **`docs/research/*`** — external / peer research (non-binding)
6. **`legacy/**`** — historical only; never overrides 1–2 for v0.1 execution

## Layout

| Path | Purpose |
|------|---------|
| `docs/plans/` | Design + detailed implementation plans |
| `docs/phases/` | Process overview and phase gate checklist |
| `docs/research/` | Firecrawl / peer landscape notes |
| `legacy/docs/` | Superseded PRD, old roadmap, old peer research |

## v0.1 product in one sentence

Local macOS terminal workspace: **projects → workspaces → stable split panes**, SQLite persistence, no remote/SSH/tmux/agent/Git UI.

## How to start work

1. Read design + process overview.  
2. Ensure archival baseline (Task 1) is a clean, reviewable commit.  
3. Open/create an implementation worktree.  
4. Execute the implementation plan **phase-by-phase** with gates.  
5. Do not import from `legacy/`.  

## Related entry points

- Root agent guide: `CLAUDE.md`  
- Short repo guidelines: `AGENTS.md`  
