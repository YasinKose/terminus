# Product Requirements Document (PRD): Terminal Manager Dashboard

## 1. Executive Summary
Terminal Manager Dashboard is a developer-focused desktop application designed to streamline project management and terminal workflows. It acts as a central command center, combining a project directory, persistent terminal sessions, and a Kanban-based task management system into a single, cohesive interface. The goal is to reduce context switching and increase productivity by providing a "native-feel" workspace that persists state between sessions.

## 2. Problem Statement
Developers often juggle multiple terminal windows, project directories, and task lists (Jira, Trello, sticky notes) simultaneously. This leads to:
*   **Context Switching Fatigue:** Constantly moving between IDE, terminal, and browser-based task tools.
*   **Setup Repetition:** Manually opening tabs and navigating to directories every time a project is restarted.
*   **Disorganized Workflow:** Losing track of small todos or temporary tasks related to a specific feature.

## 3. Goals & Success Metrics
*   **Goal:** Provide a seamless, "always-on" environment for terminal-heavy workflows.
*   **Goal:** Create a 100% "native app" feel, avoiding web-like behaviors (no text selection, native menus, frameless window).
*   **Metric:** Startup time < 2 seconds.
*   **Metric:** "Project Switch" time < 500ms (switching context between projects).

## 4. Target Audience
*   Software Engineers, DevOps Professionals, and System Administrators who live in the terminal.
*   Users who prefer keyboard-centric workflows but appreciate modern GUI affordances.

## 5. Functional Requirements (MoSCoW)

### Must Have (MVP)
*   **Project Sidebar:** Add/Remove project directories. List projects with status indicators.
*   **Smart Terminal:**
    *   Auto-open terminals based on project config.
    *   Persistent sessions (restore tabs on restart).
    *   Tabbed interface & Split view support.
*   **Task Management:**
    *   Project-specific Kanban board (Todo, In Progress, Done).
    *   Data stored in `.tasks/board.json` within the project root.
    *   Quick-add tasks via keyboard shortcut.
*   **Native UI:** Frameless window, custom title bar, system theme integration.

### Should Have
*   **Focus Mode:** Toggle sidebar and UI elements for a full-screen terminal experience.
*   **Command Palette:** `Cmd/Ctrl + K` menu for quick navigation and actions.
*   **Drag & Drop:** Kanban cards and Terminal tabs.

### Could Have
*   **Cloud Sync:** Sync configs via Gist or generic cloud provider.
*   **Plugin System:** Allow extensions for new terminal widgets.

### Won't Have (v1)
*   Full IDE capabilities (Code editing is left to VS Code/Cursor).
*   Web-based version (Desktop only).

## 6. Technical Architecture
*   **Core:** Electron (Latest Stable)
*   **Frontend:** React 19 + TypeScript
*   **UI Framework:** HeroUI v2.8.7 (Tailwind CSS)
*   **State Management:** Zustand (Persist middleware for local settings)
*   **Terminal Engine:** `xterm.js` + `node-pty`
*   **Data Storage:** JSON-based local files (`.terminal-manager.json`, `.tasks/board.json`)

## 7. User Experience (UX)
*   **Layout:** Collapsible left sidebar, main terminal area, overlay modal for Kanban.
*   **Visuals:** Minimalist, flat design. "Off-white" light mode, deep gray dark mode. No web scrollbars.
*   **Interactions:** Keyboard-first. Global shortcuts for visibility and quick actions.

## 8. Risks & Assumptions
*   **Risk:** `node-pty` native compilation issues on different OSs.
    *   *Mitigation:* Use prebuilt binaries or specific `electron-rebuild` pipeline.
*   **Assumption:** Users have Node.js and Git installed on their machines.

