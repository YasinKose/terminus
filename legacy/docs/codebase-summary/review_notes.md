# Review Notes

Generated: 2026-02-07

## Consistency Check
- Active runtime is Tauri + Svelte and command wiring is consistent between frontend and `src-tauri/src/lib.rs`.
- Project/workspace model is now normalized and internally consistent across types, migration, store logic, and UI rendering.
- Legacy Electron directories (`src/main`, `src/renderer`, `src/shared`) remain in the repository and continue to affect TypeScript checks.

## Completeness Check
- Workspace lifecycle and terminal stability flows are now explicitly modeled:
  - global workspace tab list with strict `projectId` ownership,
  - synchronized project<->workspace activation,
  - empty-workspace state when last terminal exits,
  - TUI-safe rendering while switching/closing panes.
- No dedicated automated frontend test suite exists yet; verification still relies on `npm run check` + manual smoke testing.
- Backend unit coverage remains limited (mostly Makefile parser tests).

## Current Build/Check Findings
- `npm run check`: fails (existing issues outside this workspace refactor remain).
- `cargo check`: passes.

Top blocking TypeScript errors currently observed:
- `src/lib/components/SnippetList.svelte`: nullable snippet vs required payload type mismatch.
- `src/main/*` (legacy Electron): missing Electron/Node type context and type-only import errors.

## Recommended Follow-Up
1. Decide whether to retire or isolate legacy Electron paths from active TS checks.
2. Fix strict TS contracts in `SnippetList.svelte` and related snippet form payload handling.
3. Add focused store tests for `projectStore` tree mutation invariants:
   - split/close behavior,
   - workspace switch persistence,
   - terminal exit transitions.
4. Add a smoke-test checklist for TUI stability cases (`claude`/`codex`) after workspace switch and split-close operations.
