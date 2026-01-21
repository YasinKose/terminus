# Project Roadmap

## Overview
This roadmap outlines the development of the Terminal Manager Dashboard, moving from a basic Electron shell to a fully featured productivity tool.

## Phases

| Phase | Name | Duration (Est.) | Key Deliverables |
|-------|------|-----------------|------------------|
| **1** | **Foundation** | 1 Week | Electron setup, Native UI shell, Project Sidebar. |
| **2** | **Core Terminal** | 2 Weeks | `xterm.js` integration, Tab system, Pty process management. |
| **3** | **Task System** | 1 Week | Kanban board UI, File-based persistence, Drag & Drop. |
| **4** | **Polish & Shortcuts** | 1 Week | Command palette, Global shortcuts, Theme refinements. |

## Milestones
- [ ] **M1: Hello World:** Electron app opens with frameless window and sidebar.
- [ ] **M2: Terminal Alive:** Can type commands in `xterm.js` and see output.
- [ ] **M3: Project Switcher:** Clicking a sidebar project changes the terminal CWD.
- [ ] **M4: Task Persistence:** Tasks saved to JSON and loaded back correctly.
- [ ] **M5: Beta Release:** Stable build for internal testing.

