# Terminus documentation

## Source-of-truth order

When documents disagree, use this precedence:

### New product work (v0.2+)

1. **`docs/plans/2026-07-25-terminus-v0.2-scope-design.md`** — v0.2 product scope  
2. **`docs/plans/2026-07-25-terminus-roadmap-v0.2-v0.3.md`** — version sequencing  
3. **v0.1 design/plan** — frozen terminal-core architecture & constraints  
4. **`docs/phases/*`** — process, gates, evidence  
5. **`CLAUDE.md` / `AGENTS.md`**  
6. **`docs/research/*`** — non-binding  
7. **`legacy/**`** — historical only  

### v0.1 core (frozen)

1. **`docs/plans/2026-07-23-terminus-terminal-core-design.md`** — v0.1 product & architecture  
2. **`docs/plans/2026-07-23-terminus-terminal-core.md`** — v0.1 implementation plan (phases 0–6)  
3. **`docs/phases/02-v0.1-completion-evidence.md`** — automated vs human residual  

## Layout

| Path | Purpose |
|------|---------|
| `docs/plans/` | Design + implementation plans (v0.1 frozen + v0.2/v0.3 roadmap) |
| `docs/phases/` | Process overview, phase gate checklist, **v0.1 completion evidence** |
| `docs/security/` | RustSec / audit policy for release gates |
| `docs/research/` | Firecrawl / peer landscape notes |
| `legacy/docs/` | Superseded PRD, old roadmap, old peer research |

## Product in one sentence (by version)

| Version | Sentence |
|---------|----------|
| **v0.1** | Local macOS terminal workspace: projects → workspaces → stable split panes; SQLite; no remote/SSH/Git UI/tasks (agent-closed; human smoke residual). |
| **v0.2** | Multi-OS runtime + Git UI (light) + tasks + snippets + optional tmux bridge. |
| **v0.3** | Remote/SSH (if designed), distribution (sign/notarize/updater/Homebrew), and later park-lot items. |

## How to start work

### Closing residual v0.1 daily-driver claim (human)

1. Read `docs/phases/02-v0.1-completion-evidence.md`.  
2. Fresh DMG copy → smoke matrix §3 → recovery → M2 §4.  
3. Only then check Phase 6 Task 21–22.

### Starting v0.2

1. Read v0.2 scope design + roadmap.  
2. Author/follow a dated v0.2 implementation plan.  
3. Keep `pnpm verify:v01` / `pnpm audit:rust` green.  
4. Do not import from `legacy/`.  

## Related entry points

- Root agent guide: `CLAUDE.md`  
- Short repo guidelines: `AGENTS.md`  
- v0.1 completion evidence: `docs/phases/02-v0.1-completion-evidence.md`  
- v0.2 scope: `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`  
- Roadmap: `docs/plans/2026-07-25-terminus-roadmap-v0.2-v0.3.md`  
- RustSec policy: `docs/security/2026-07-25-rustsec-policy.md`  
- Release gates: `pnpm verify:v01`, `pnpm audit:rust`  
