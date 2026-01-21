# Phase 2: Core Terminal

## Overview
Implement the heart of the application: the Terminal emulator. This involves integrating `xterm.js` for the UI and `node-pty` for the backend process management.

## Goals
1.  Spawn real shell processes (zsh/bash/powershell).
2.  Render terminal output with high performance.
3.  Manage multiple terminal tabs per project.

## Tasks

### Backend (Main Process)
- [ ] Integrate `node-pty` to spawn processes.
- [ ] Implement IPC channels for: `terminal.spawn`, `terminal.data`, `terminal.resize`, `terminal.kill`.
- [ ] Handle process cleanup on window close.

### Frontend (Renderer)
- [ ] Create `TerminalComponent` wrapping `xterm.js`.
- [ ] Implement `FitAddon` and `WebglAddon` for resizing and performance.
- [ ] Build Tab Bar UI (New tab, Close tab, Switch tab).
- [ ] Connect UI tabs to backend pty processes.

### Project Context
- [ ] Ensure new terminals spawn in the selected Project's root directory.
- [ ] Implement "Auto-Run" logic (read `.terminal-manager.json` and execute startup commands).

## Deliverables
*   Fully functional terminal interface.
*   Multiple tabs working independently.
*   Correct styling (Fonts, Colors) matching the app theme.

