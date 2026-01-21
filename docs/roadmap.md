# Project Roadmap

## Overview
This roadmap outlines the development of the Terminal Manager Dashboard, leveraging **Tauri and Svelte** to build a high-performance, resource-efficient productivity tool.

## Phases

| Phase | Name | Duration (Est.) | Key Deliverables |
|-------|------|-----------------|------------------|
| **1** | **Foundation** | 1 Week | Tauri setup, Svelte + Bits UI integration, Native Window Shell. |
| **2** | **Core Terminal** | 2 Weeks | Rust `portable-pty` integration, `xterm.js` frontend, Tab system. |
| **3** | **Task System** | 1 Week | Kanban board UI, Rust File I/O for JSON persistence. |
| **4** | **Polish & Shortcuts** | 1 Week | Command palette, Global shortcuts, Theme refinements. |

## Milestones
- [ ] **M1: Hello Tauri:** App opens with frameless window, transparent background, and Sidebar rendered via Svelte.
- [ ] **M2: Terminal Alive:** Rust backend spawns a shell, pipes output to `xterm.js` on frontend.
- [ ] **M3: Project Context:** Switching sidebar project changes the terminal's Current Working Directory (CWD).
- [ ] **M4: Data Persistence:** Tasks are read/written to `.tasks/board.json` via Rust commands.
- [ ] **M5: Beta Release:** Stable build < 20MB, ready for internal testing.
