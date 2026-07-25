# Repository Guidelines

## Product (v0.1)

Terminus is a **macOS-first local terminal workspace** (projects → workspaces → split panes). Not an IDE; no SSH, tmux daemon, AI agents, Git UI, tasks, or snippets in v0.1.

**Authoritative docs:** `docs/plans/2026-07-23-terminus-terminal-core-design.md` and `docs/plans/2026-07-23-terminus-terminal-core.md`. Agent deep-dive: `CLAUDE.md`. Process: `docs/phases/00-process-overview.md`.

## Project structure

| Path | Role |
|------|------|
| `src/` | React 19 + TypeScript UI (`features/`, `stores/`, `lib/tauri/`) |
| `src-tauri/` | Tauri v2 Rust: PTY, persistence, commands |
| `docs/` | Design, implementation plans, phase process, research |
| `legacy/` | Frozen previous app + old docs — **read-only**, never import |

Until Phase 0 completes, the tree may be archival-only (`legacy/` + docs). Scaffold per the implementation plan (pnpm + Tauri v2).

## Commands (target)

```bash
pnpm install
pnpm dev / pnpm tauri:dev
pnpm check / pnpm test:run / pnpm build
pnpm tauri:build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## Style

- TypeScript/React: 2-space, semicolons, `strict`; components `PascalCase`
- Rust: rustfmt, 4 spaces
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- High-frequency PTY output must not go through Zustand

## Testing & gates

- Unit: Vitest + Cargo for domain/PTY/SQL
- Lifecycle: real Tauri smoke (jsdom is not enough)
- Phase gates and final DoD: implementation plan + `docs/phases/`
- Pre-claim: automated checks + smoke evidence

## Security

- Least-privilege Tauri capabilities only
- No free-form shell executor; profile-validated spawn only
- Parameterized SQL; treat PTY/OSC data as untrusted
- Never commit secrets, machine-specific paths, or `.firecrawl/`

## Scope discipline

If a change is not in the approved design / plan, do not add it. Park future ideas as dated docs under `docs/plans/`, do not merge into v0.1 core.
