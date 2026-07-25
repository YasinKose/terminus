# Dependencies

## Frontend Runtime
- `@tauri-apps/api`: frontend bridge to backend commands/events.
- `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-webgl`: terminal rendering.
- `svelte-dnd-action`: drag/drop behaviors.
- `bits-ui`, `lucide-svelte`: UI primitives/icons.
- `uuid`: IDs for projects/workspaces/panes/snippets.

## Frontend Tooling
- `svelte`, `@sveltejs/vite-plugin-svelte`, `vite`: app framework + bundling.
- `typescript`, `svelte-check`: type and Svelte diagnostics.
- `tailwindcss`, `postcss`, `autoprefixer`: styling pipeline.

## Rust / Tauri
- `tauri`, `tauri-build`: desktop runtime and build tooling.
- `tauri-plugin-dialog`, `tauri-plugin-os`, `tauri-plugin-log`: native integrations.
- `portable-pty`: PTY session management.
- `tokio`: async runtime support.
- `serde`, `serde_json`: serialization.

## Dependency Risk Notes
- Tauri crates are RC/beta channels in `Cargo.toml`; keep version alignment tight across plugins.
- `npm run check` currently fails due app-level type issues, not dependency resolution.

