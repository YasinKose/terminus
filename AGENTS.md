# Repository Guidelines

## Project Structure & Module Organization
Terminus is a desktop app with a **Svelte + TypeScript frontend** and a **Tauri (Rust) backend**.

- `src/`: active UI code (`App.svelte`, `lib/components`, `lib/stores`, `lib/utils`, `lib/types`).
- `src-tauri/src/`: native commands (`pty.rs`, `task.rs`, `makefile.rs`) exposed through Tauri `invoke`.
- `docs/`: product docs and implementation plans (`docs/phases/*`, `docs/plans/YYYY-MM-DD-*.md`).
- `public/`, `src/assets/`: static assets.
- `src/main`, `src/renderer`, `src/shared`: legacy Electron prototype code; avoid extending unless intentionally reviving Electron.

## Build, Test, and Development Commands
- `npm install`: install JS dependencies.
- `npm run dev`: run Vite frontend only.
- `npm run tauri dev`: run full desktop app (frontend + Tauri backend).
- `npm run build`: build frontend bundle to `dist/`.
- `npm run tauri build`: create production desktop bundle.
- `npm run check`: Svelte + TypeScript checks (`svelte-check` and `tsc`).
- `make dev|build|check|clean|install`: convenience wrappers around the same flows.

## Coding Style & Naming Conventions
- TypeScript/Svelte: 2-space indentation, semicolons, `strict` typing.
- Rust (`src-tauri`): standard rustfmt style (4 spaces).
- Components use `PascalCase` (`WorkspaceTabs.svelte`); stores use `camelCase` + `Store` suffix (`projectStore.ts`).
- Keep shared types in `src/lib/types` (or `src/shared` for legacy Electron paths).
- Use `$lib/*` alias for internal imports where it improves clarity.

## Testing Guidelines
There is no dedicated unit/integration test suite yet.

- Treat `npm run check` as the required pre-PR gate.
- For backend changes, also run `cd src-tauri && cargo check`.
- Manually smoke test core flows in `npm run tauri dev` (open project, terminal spawn/write, pane split, task/snippet interactions).

## Commit & Pull Request Guidelines
Git history follows Conventional Commit style:

- Format: `feat: ...`, `fix: ...`, `chore: ...` (optionally scoped).
- Keep commits focused and atomic.
- PRs should include: concise summary, linked issue/task, testing notes (`npm run check`, manual flows), and screenshots/video for UI changes.

## Security & Configuration Tips
- Never commit secrets or machine-specific paths.
- Review Tauri capability/security changes carefully in `src-tauri/tauri.conf.json` and `src-tauri/capabilities/default.json`.
- Prefer least-privilege command exposure in Rust `invoke_handler`.
