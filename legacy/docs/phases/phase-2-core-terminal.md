# Phase 2: Core Terminal

## Overview
Implement the heart of the application: the Terminal emulator. This involves building a custom Rust backend using `portable-pty` and connecting it to the `xterm.js` frontend.

## Goals
1.  Spawn real shell processes (zsh/bash/powershell) from Rust.
2.  Stream stdout/stdin between Rust and Svelte via Tauri Events.
3.  Manage multiple terminal tabs per project.

## Tasks

### Backend (Rust)
- [ ] Add `portable-pty` and `tauri-plugin-shell` crates.
- [ ] Create a `TerminalState` struct in Rust to hold active PTY sessions (Map<SessionId, PtyPair>).
- [ ] Implement Tauri Commands:
    -   `create_terminal(cwd: String) -> SessionId`
    -   `write_to_terminal(id: SessionId, data: String)`
    -   `resize_terminal(id: SessionId, rows: u16, cols: u16)`
    -   `kill_terminal(id: SessionId)`
- [ ] Implement an async thread loop to read from PTY master and emit Tauri Events (`terminal-output`) to frontend.

### Frontend (Svelte)
- [ ] Install `xterm` and `xterm-addon-fit`.
- [ ] Create `Terminal` component wrapping `xterm.js`.
- [ ] Implement `TerminalStore` to manage tabs and active session state.
- [ ] Connect `xterm.js` `onData` to `write_to_terminal` command.
- [ ] Listen for `terminal-output` events and write to `xterm.js`.

### Project Integration
- [ ] Ensure new terminals spawn in the selected Project's root directory.
- [ ] Handle terminal resize events (sync UI size with PTY size).

## Deliverables
*   Fully functional terminal interface inside Tauri.
*   Bidirectional communication (typing works, output works).
*   Multiple tabs support.
