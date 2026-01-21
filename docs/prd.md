# Product Requirements Document (PRD): Terminal Manager Dashboard

## 1. Executive Summary
Terminal Manager Dashboard is a high-performance, developer-focused desktop application designed to streamline project management and terminal workflows. Built with **Tauri and Svelte**, it acts as a lightweight central command center, combining a project directory, persistent terminal sessions, and a Kanban-based task management system. The goal is to provide a "native-feel" workspace with minimal resource footprint compared to Electron alternatives.

## 2. Problem Statement
Developers often juggle multiple terminal windows, project directories, and task lists simultaneously. This leads to:
*   **Context Switching Fatigue:** Constantly moving between IDE, terminal, and browser-based task tools.
*   **Resource Heaviness:** Existing Electron-based tools consume significant RAM/CPU.
*   **Setup Repetition:** Manually opening tabs and navigating to directories every time a project is restarted.
*   **Disorganized Workflow:** Losing track of small todos or temporary tasks related to a specific feature.

## 3. Goals & Success Metrics
*   **Goal:** Provide a seamless, "always-on" environment for terminal-heavy workflows with minimal overhead.
*   **Goal:** Create a 100% "native app" feel using Tauri's lightweight architecture and Svelte's reactivity.
*   **Metric:** Startup time < 1 second.
*   **Metric:** Application bundle size < 20MB.
*   **Metric:** Idle memory usage < 100MB.

## 4. Target Audience
*   Software Engineers, DevOps Professionals, and System Administrators who live in the terminal.
*   Users who prefer keyboard-centric workflows and value performance.

## 5. Functional Requirements (MoSCoW)

### Must Have (MVP)
*   **Project Sidebar:** Add/Remove project directories. List projects with status indicators.
*   **Smart Terminal:**
    *   Backend powered by Rust (`portable-pty`) for robust shell integration.
    *   Persistent configuration (remember tabs).
    *   Tabbed interface & Split view support.
*   **Task Management:**
    *   Project-specific Kanban board (Todo, In Progress, Done).
    *   Data stored in `.tasks/board.json` within the project root (Git-friendly).
    *   Quick-add tasks via keyboard shortcut.
*   **Native UI:** Frameless window, custom title bar, system theme integration (Dark/Light).

### Should Have
*   **Focus Mode:** Toggle sidebar and UI elements for a full-screen terminal experience.
*   **Command Palette:** `Cmd/Ctrl + K` menu for quick navigation and actions.
*   **Drag & Drop:** Kanban cards and Terminal tabs.

### Could Have
*   **Cloud Sync:** Sync configs via Gist or generic cloud provider.
*   **Plugin System:** Allow Lua or JS based extensions.

### Won't Have (v1)
*   Full IDE capabilities (Code editing is left to VS Code/Cursor).
*   Web-based version (Desktop only).

## 6. Technical Architecture
*   **Core:** Tauri v2 (Rust)
*   **Frontend:** Svelte 5 + TypeScript
*   **UI Library:** Bits UI (Headless) + Tailwind CSS
*   **State Management:** Svelte Runes / Stores
*   **Terminal Engine:**
    *   **Frontend:** `xterm.js`
    *   **Backend:** Rust `portable-pty` crate for cross-platform pseudo-terminal management.
*   **Data Storage:** Local JSON files (`.terminal-manager.json`, `.tasks/board.json`) handled by Rust file I/O.

## 7. User Experience (UX)
*   **Layout:** Collapsible left sidebar, main terminal area, overlay modal for Kanban.
*   **Visuals:** Minimalist, flat design. "Native-like" look using Bits UI primitives.
*   **Interactions:** Keyboard-first. Global shortcuts for visibility and quick actions.

## 8. Risks & Assumptions
*   **Risk:** `portable-pty` compatibility across all Linux distros.
    *   *Mitigation:* Test primarily on Ubuntu/Fedora and macOS; provide fallback configuration.
*   **Assumption:** User has a standard shell (bash/zsh/fish/powershell) installed.
