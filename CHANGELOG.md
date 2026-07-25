# Changelog

## 0.2.0 — 2026-07-25

### Added

- Platform-specific Tauri window and bundle configuration for macOS, Linux,
  and Windows, plus a three-OS verification workflow.
- File-level Git diff and stash views in the source-control workbench.
- Read-only Source Lens workspace powered by CodeMirror 6, with lazy language
  highlighting, Git status/origin context, and working-tree/HEAD previews.
- Full task column/card CRUD and snippet editing with accessible confirmation
  and editing dialogs.
- Shared responsive workbench panel shell, semantic status colors, platform
  shortcut labels/defaults, and lazy-loaded v0.2 feature panels.
- Root `Makefile` with documented development, verification, audit, Rust, and
  Tauri build targets.

### Fixed

- Prevented Git checkout from discarding dirty worktree changes and restricted
  checkout to local branches.
- Prevented nested project folders from inheriting a parent Git repository and
  included untracked file contents in diffs.
- Cleared stale Git/task/snippet data, dialogs, diffs, drafts, and branch forms
  when switching projects, and prevented an older same-project refresh from
  overwriting a completed mutation.
- Blocked task-board mutations while project data is loading so a temporary
  empty board cannot overwrite persisted tasks.
- Added low-frequency and window-focus Git status refresh without touching the
  high-frequency PTY data path, while preserving an already-open or loading
  diff.
- Cleared the previous Git patch while another file loads and matched diff
  filenames literally instead of interpreting pathspec metacharacters.
- Preserved Windows/Linux defaults when hydrating partial shortcut settings.
- Ignored Unix-style captured `SHELL` values when resolving the default Windows
  terminal profile.
- Avoided a false startup error before the terminal runtime registry exists.
- Rejected unsafe Makefile target names and used the native Windows database
  reveal command.
- Rejected project-local data and Makefile symlinks that escape the project
  root.
- Required configured Git author identity instead of creating synthetic
  commits, and corrected the v0.2 Git test filter.
- Separated Git file preview, diff, and stage/unstage actions so opening source
  never triggers a mutation or an unintended second view.

### Security

- Kept Git and tmux operations on structured Rust command paths.
- Preserved the no-shell/no-broad-filesystem Tauri capability boundary.
- Restricted source previews to project-scoped UTF-8 text files under 2 MiB,
  rejected path/symlink escapes and binary content, and exposed no save path.
