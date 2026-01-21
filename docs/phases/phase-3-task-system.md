# Phase 3: Task System

## Overview
Add the project management layer. Implement a lightweight, file-based Kanban board that lives inside the project directory (`.tasks/board.json`).

## Goals
1.  Read/Write tasks to JSON files using Rust's file system capabilities.
2.  Visualize tasks in a Kanban layout (Todo, In Progress, Done).
3.  Provide keyboard-first interactions.

## Tasks

### Backend (Rust)
- [ ] Implement Tauri Commands for File I/O:
    -   `read_board(project_path: String) -> BoardData`
    -   `save_board(project_path: String, data: BoardData)`
- [ ] Ensure atomic writes to prevent data corruption.
- [ ] Define Rust structs for `Task`, `Column`, `Board`.

### Kanban UI (Svelte)
- [ ] Create `Board` component overlay/modal.
- [ ] Implement Drag & Drop for tasks (using `svelte-dnd-action` or similar lightweight lib).
- [ ] Create `TaskCard` component using Bits UI (context menus, dialogs).

### Integration
- [ ] Add shortcuts: `N` for new task, `Enter` to edit.
- [ ] Show task counts (e.g., "2 Todo") in the Sidebar project list.
- [ ] Implement markdown parsing for task descriptions.

## Deliverables
*   A usable Kanban board that opens over the terminal.
*   Data persistence to `.tasks/board.json`.
*   Seamless switching between Code (Terminal) and Plan (Kanban).
