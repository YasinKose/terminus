# Phase 3: Task System

## Overview
Add the project management layer. Implement a lightweight, file-based Kanban board that lives inside the project directory.

## Goals
1.  Read/Write tasks to `.tasks/board.json`.
2.  Visualize tasks in a Kanban layout (Todo, In Progress, Done).
3.  Provide keyboard-first interactions for managing tasks.

## Tasks

### Data Layer
- [ ] Create File I/O service in Main process to read/write JSON safely.
- [ ] Define Task Schema (ID, Title, Description, Status, Tags).

### Kanban UI
- [ ] Implement Modal/Overlay container for the board.
- [ ] Create `KanbanColumn` and `TaskCard` components using HeroUI.
- [ ] Implement Drag & Drop (using `dnd-kit` or similar).

### Integration
- [ ] Add shortcuts: `N` for new task, `Enter` to edit.
- [ ] Show task counts in the Sidebar badges.
- [ ] Implement Markdown rendering for Task Description.

## Deliverables
*   A usable Kanban board that opens over the terminal.
*   Data persistence to the project folder.
*   Seamless switching between Code (Terminal) and Plan (Kanban).

