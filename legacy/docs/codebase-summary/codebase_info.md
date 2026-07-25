# Codebase Info

Generated: 2026-02-07

## Repository Snapshot
- App type: Desktop terminal/workspace manager
- Primary frontend: Svelte 5 + TypeScript + Vite
- Native backend: Tauri 2 (Rust)
- Additional code present: legacy Electron prototype (`src/main`, `src/renderer`, `src/shared`)

## Top-Level Structure
- `src/`: active UI app (components, stores, types, utils)
- `src-tauri/src/`: Rust commands (`pty.rs`, `task.rs`, `makefile.rs`, `lib.rs`)
- `docs/`: PRD, roadmap, phased plans, and this summary set
- `public/`, `src/assets/`: static assets

## Build & Validation Commands
- `npm run dev`: Vite frontend
- `npm run tauri dev`: full desktop app
- `npm run build`: frontend production build
- `npm run tauri build`: desktop bundle
- `npm run check`: Svelte + TypeScript checks
- `cd src-tauri && cargo check`: Rust compile checks

## Current Health
- `npm run check`: failing (14 errors, 59 warnings)
- `cargo check`: passing

