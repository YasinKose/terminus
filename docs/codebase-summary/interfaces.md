# Interfaces

## Tauri Commands (invoke interface)
- `spawn_pty(id: String, cwd: Option<String>) -> Result<(), String>`
  - Idempotent by `id`: no-op if session already exists.
- `write_to_pty(id: String, data: String) -> Result<(), String>`
- `resize_pty(id: String, rows: u16, cols: u16) -> Result<(), String>`
- `close_pty(id: String) -> Result<(), String>`
- `load_board(project_path: String) -> Result<Board, String>`
- `save_board(project_path: String, board: Board) -> Result<(), String>`
- `scan_makefile(directory: String) -> Result<Vec<MakefileTarget>, String>`

## Event Interface (backend -> frontend)
- `pty-output-{id}`: streamed terminal output payload (`String`)
- `pty-exit-{id}`: terminal exit signal payload (`unit`)

## Frontend Store Interfaces
- `projectStore`
  - Global stores:
    - `activeProjectId: Writable<string | null>`
    - `activeWorkspaceId: Writable<string | null>`
    - `workspaces: Readable<Workspace[]>`
  - Project/workspace lifecycle:
    - `addProject`, `removeProject`, `setActiveProject`
    - `createWorkspace`, `deleteWorkspace`, `setActiveWorkspace`, `renameWorkspace`, `reorderWorkspaces`
    - `getWorkspacesByProject`, `ensureWorkspaceTerminal`
  - Pane-tree operations:
    - `splitPane`, `closePane`, `resizePanes`, `setActiveTerminal`
    - `moveTerminal`, `swapTerminals`, `insertTerminalAtPosition`
    - `handleTerminalExit`, `getWorkspaceTerminalIds`
- `taskStore`: `init(projectPath)`, `save(projectPath)`, `updateColumns(columns)`.
- `snippetStore`: add/update/delete/toggle favorite/filter methods.

## Persistence Interfaces
- LocalStorage keys (v2 normalized):
  - `terminus_projects_v2`
  - `terminus_workspaces_v2`
  - `terminus_active_project_v2`
  - `terminus_active_workspace_v2`
- Backward-compat migration source keys:
  - `terminus_projects`
  - `terminus_active_project`
- Other app keys:
  - `terminus_snippets`
  - `terminus_makefile_scanned`
- Filesystem:
  - `{projectPath}/.tasks/board.json`
  - `{projectPath}/Makefile` (and variants)
