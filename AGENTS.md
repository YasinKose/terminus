# Repository Guidelines

## Product

**v0.1 (agent-closed core):** macOS-first local terminal workspace (projects → workspaces → split panes). Not an IDE.

**v0.2 (active):** multi-OS + Git UI (light) + tasks + snippets + optional tmux bridge.  
**v0.3+:** SSH/remote, AI, signing/updater/Homebrew, etc. — park until designed.

**Authoritative docs:**

- v0.2 scope: `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`
- Roadmap: `docs/plans/2026-07-25-terminus-roadmap-v0.2-v0.3.md`
- v0.1 frozen design/plan: `docs/plans/2026-07-23-terminus-terminal-core-*.md`
- Evidence: `docs/phases/02-v0.1-completion-evidence.md`
- Agent deep-dive: `CLAUDE.md` · Process: `docs/phases/00-process-overview.md`

## Project structure

| Path | Role |
|------|------|
| `src/` | React 19 + TypeScript UI (`features/`, `stores/`, `lib/tauri/`) |
| `src-tauri/` | Tauri v2 Rust: PTY, persistence, commands |
| `docs/` | Design, implementation plans, phase process, research |
| `legacy/` | Frozen previous app + old docs — **read-only**, never import |
| `scripts/` | `verify-v01.sh`, `audit-rust.sh` |

## Commands

```bash
pnpm install
pnpm dev / pnpm tauri:dev
pnpm check / pnpm test:run / pnpm build
pnpm tauri:build
pnpm verify:v01
pnpm audit:rust
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
- Release gate: `pnpm verify:v01` + `pnpm audit:rust`
- v0.1 daily-driver claim: automated + human packaged smoke/M2 (evidence doc)
- Do not claim Final DoD without evidence §3–§4 PASS

## Security

- Least-privilege Tauri capabilities only
- No free-form shell executor; profile-validated spawn only
- Parameterized SQL; treat PTY/OSC data as untrusted
- Never commit secrets, machine-specific paths, or `.firecrawl/`

## Scope discipline

- v0.2 work must match `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`
- Park non-v0.2 ideas as dated docs under `docs/plans/`; do not merge into frozen v0.1 core
