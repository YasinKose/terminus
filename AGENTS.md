# Repository Guidelines

## Product

**v0.1 (agent-closed core):** macOS-first local terminal workspace (projects → workspaces → split panes). Not an IDE.

**v0.2 (active):** multi-OS + Git UI (light) + tasks + snippets + optional tmux bridge.  
**v0.3+:** SSH/remote, AI, signing/updater/Homebrew, etc. — park until designed.

Repository-level product boundaries live in this file and `CLAUDE.md`.
Standalone `docs/` and archived `legacy/` trees are intentionally excluded
from version control.

## Project structure

| Path | Role |
|------|------|
| `src/` | React 19 + TypeScript UI (`features/`, `stores/`, `lib/tauri/`) |
| `src-tauri/` | Tauri v2 Rust: PTY, persistence, commands |
| `.github/` | CI/release workflows and repository-facing media |
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
- Release gate: `pnpm verify:v02` + `pnpm audit:rust`
- Do not claim cross-platform release readiness without automated gates and
  packaged human smoke evidence

## Security

- Least-privilege Tauri capabilities only
- No free-form shell executor; profile-validated spawn only
- Parameterized SQL; treat PTY/OSC data as untrusted
- Never commit secrets, machine-specific paths, or `.firecrawl/`

## Scope discipline

- Keep v0.2 focused on multi-OS local terminals, light Git, tasks, snippets,
  and the optional tmux bridge.
- SSH/remote, AI, signing/updater, distribution channels, plugins, and editor
  surfaces require explicit product design before implementation.
- Do not reintroduce tracked `docs/` or `legacy/` trees.
