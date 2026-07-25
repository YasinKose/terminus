# Terminus Terminal Core Design

**Date:** 2026-07-23  
**Status:** Approved after design grill  
**Scope:** macOS-first local terminal workspace, v0.1

## 1. Product definition

Terminus v0.1 is a compact, keyboard-first desktop application for organizing local terminal sessions by project and workspace. It is not an IDE and does not orchestrate remote infrastructure or AI agents.

### Included

- Local project folders
- Project-scoped workspaces
- Split terminal panes
- Pane resize, swap, edge insertion, and same-project cross-workspace movement
- Terminal lifecycle and activity indicators
- Terminal profiles with a system-shell default and basic overrides
- Workspace and layout persistence
- Command palette and configurable core shortcuts
- Six visual presets
- Local macOS `.app`/`.dmg` daily-driver build

### Explicitly excluded from v0.1

- VDS/VPS and remote execution
- SSH
- tmux or a custom background daemon
- AI agent orchestration and chat
- Git UI
- Tasks, snippets, Makefile import, and editor surfaces
- Signing, notarization, updater, and Homebrew distribution

## 2. Technology

| Layer | Choice |
|---|---|
| Desktop shell | Tauri v2 |
| Backend | Rust |
| PTY | `portable-pty` |
| Persistence | SQLite through `rusqlite` |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 4 |
| UI primitives | Selected shadcn/ui source components, restyled for Terminus |
| State | Zustand 5 focused stores |
| Terminal renderer | xterm.js + FitAddon; optional WebGL with Canvas fallback |
| Frontend tests | Vitest 4 + Testing Library |
| Rust tests | Cargo unit/integration tests |

## 3. Architecture

```text
React application
├── App shell and macOS titlebar overlay
├── Project/workspace navigation
├── Pane layout tree
├── Terminal hosts
├── Terminal runtime registry
├── Focus/activity/shortcut stores
└── Typed Tauri client
              │ commands + ordered Channel events
              ▼
Rust application
├── Typed command boundary
├── PTY SessionManager
├── Project/workspace repository
├── Settings/profile repository
├── SQLite migrations and recovery
└── Tauri window lifecycle policy
              │
              ▼
macOS processes, PTYs, filesystem, SQLite
```

The UI never reads the filesystem, opens PTYs, or executes commands directly. Rust owns all OS side effects. High-frequency PTY output bypasses Zustand and writes directly to xterm runtimes.

## 4. Domain model

```text
Project
├── id
├── canonicalPath
├── displayName
├── color
├── lastActiveWorkspaceId
└── timestamps

Workspace
├── id
├── projectId
├── name
├── root: PaneNode | null
├── activePaneId
├── initialized
└── timestamps

PaneNode
├── TerminalLeaf
│   ├── id                # also the PTY session ID
│   ├── titleOverride?
│   ├── profileId?
│   └── initialCwd
└── SplitContainer
    ├── id
    ├── direction: row | column
    ├── children: PaneNode[]
    └── sizes: number[]
```

### Tree invariants

1. Node IDs are globally unique and stable.
2. `children.length === sizes.length`.
3. A split has at least one child.
4. Sizes are finite, positive, normalized percentages.
5. Terminal leaves belong to exactly one workspace.
6. Moving a terminal is allowed only between workspaces of the same project.
7. A single-child split may remain to protect the identity of a surviving terminal/TUI.
8. Closing the final pane leaves `root = null`; it does not delete the workspace.
9. Pure tree operations never invoke Tauri or mutate their input.

The n-ary tree is intentional. The legacy implementation proved that collapsing a surviving leaf through a changed parent hierarchy can remount full-screen TUIs. Layout normalization must not take precedence over runtime identity.

## 5. PTY lifecycle

### Session states

- `starting`
- `running`
- `exited { code }`
- `error { code, message }`
- `closing`

### Rules

1. Opening a session is idempotent by terminal ID.
2. Hiding, moving, or remounting a React host never closes the PTY.
3. Only an approved user close action closes a live PTY.
4. Process exit keeps the pane and its rendered terminal visible.
5. Restart creates a new shell in the most recently known cwd, falling back to the configured initial cwd.
6. App restart restores layout but starts new shells; the previous processes and scrollback are not restored.
7. The active workspace starts immediately. Other workspaces start lazily on first activation and remain initialized afterward.
8. There is no tmux, mux server, detached-process promise, or fake persistence claim.

### Close behavior

Every close action asks for confirmation: terminal pane, workspace, project, main window, and application quit. Aggregated closes display the number of affected terminals. Exited panels still require confirmation because the user explicitly selected confirmation for every close.

After confirmation, Rust closes the PTY gracefully, waits for a bounded period, then terminates the child/process group if needed. No confirmation is implemented in Rust; UI approval and backend teardown are separate responsibilities.

## 6. PTY data flow

```text
xterm onData
  → typed `write_pty` invoke
  → SessionManager writer

PTY reader thread
  → incremental UTF-8 decoder
  → bounded coalescing (time/size)
  → Tauri Channel<PtyEvent>
  → TerminalRuntime.write

child status monitor
  → exit/error Channel event
  → runtime status + Zustand session metadata
```

Tauri global events are not used for the output stream. Tauri recommends Channels for ordered, high-throughput delivery. Output is coalesced to avoid one IPC message per small read.

The backend does not retain a duplicate multi-megabyte scrollback string. xterm owns in-memory scrollback. If the frontend attachment is absent, output may be missed; the runtime registry prevents ordinary navigation and pane movement from detaching the renderer.

## 7. Terminal runtime registry

React layout identity and terminal runtime identity are separate.

A `TerminalRuntimeRegistry` owns one imperative runtime per terminal ID:

- xterm `Terminal`
- FitAddon
- optional WebglAddon
- stable wrapper DOM element
- typed event disposables
- current lifecycle/activity metadata
- current host attachment

`TerminalHost` components do not create or dispose xterm on every mount. They attach the runtime’s stable wrapper element to their host. If React moves a leaf to another parent or workspace, the same DOM subtree is reparented; xterm and its scrollback remain alive. A hidden parking container temporarily owns unattached runtime elements. Explicit pane deletion disposes the runtime.

This replaces the legacy snapshot/hydration workaround and is required because v0.1 deliberately does not persist or duplicate scrollback.

WebGL context loss disposes only the WebGL addon and falls back to Canvas. Fit operations are debounced and ignored for zero-sized/hidden hosts. A workspace becoming visible triggers a fit and Rust resize.

## 8. Activity and terminal metadata

Lifecycle state and attention state are separate.

- Output produces a short `active` pulse.
- Two seconds without output becomes `quiet`.
- Output in an unfocused pane sets `unread`.
- Focusing the pane clears `unread`.
- Bell and supported OSC notifications set a distinct attention indicator.
- OSC title changes update the displayed title unless the user set an override.
- OSC 7 updates the last known cwd after path validation.

No foreground-process inspection or shell injection is required for v0.1.

## 9. Profiles

The default profile launches `$SHELL -l` in the project root. macOS GUI environment differences are handled by resolving the login environment once in Rust.

A basic profile supports:

- Display name
- Executable
- Arguments
- Environment overrides
- Optional initial cwd override

There is one global default profile and an optional profile selection per terminal pane. There is no profile marketplace, icon system, startup task runner, or project-specific profile inheritance in v0.1.

## 10. Persistence and recovery

SQLite is the single source of truth for projects, workspaces, pane trees, profiles, shortcuts, appearance settings, and last active selections. Runtime PTY handles and xterm scrollback are never stored.

Writes use transactions. High-frequency resize changes are debounced and flushed at interaction end. Schema migrations are ordered, transactional, and tested against both an empty database and the preceding schema.

If the database cannot open or migrate, Terminus shows a protected recovery screen. It does not silently reset data. Recovery actions:

1. Retry opening.
2. Create a timestamped backup.
3. Reveal the database directory.
4. Reset only after explicit user confirmation.

Removing a project removes only Terminus metadata and associated workspace layouts. It never deletes or modifies the project directory.

## 11. UI and interaction

- Compact terminal-first density
- Native macOS traffic lights with titlebar overlay
- Collapsible narrow project sidebar
- Compact workspace tab strip
- Persistent 24–26 px pane header
- Title, lifecycle/activity, and profile visible in the header
- Pane actions visible on hover/focus
- Edge drop inserts; center drop swaps
- Workspace-tab drop moves a terminal within the same project
- Context menus and command palette expose equivalent keyboard-accessible actions
- Reduced-motion behavior is respected

Selected shadcn/ui components are copied into `src/components/ui` and restyled. Default shadcn visual language is not the product design.

### Appearance presets

Six complete semantic presets:

1. Graphite — neutral dark default
2. Ocean — cool blue dark
3. Sunset — warm amber dark
4. Forest — green dark
5. Orchid — purple dark
6. Paper — light

Each preset defines app, sidebar, surface, border, text, focus, destructive, and terminal ANSI colors with verified contrast. Users may adjust pane border width, radius, and active-pane highlighting. Arbitrary color editing is excluded.

### Shortcuts

Core commands are configurable:

- Command palette
- New workspace
- New terminal
- Horizontal/vertical split
- Close pane
- Focus/zen
- Workspace navigation
- Sidebar toggle

Shortcut editing detects conflicts, refuses ambiguous bindings, and supports reset to defaults. Full conditional keymaps, chord sequences, and JSON keybinding files are excluded.

## 12. Errors and security

Rust commands return a structured error:

```text
{ code, message, details?, recoverable }
```

Stable codes cover missing sessions, invalid paths, spawn failure, write failure, resize failure, database failure, migration failure, and invalid profile configuration. Missing sessions never return silent success.

Project and cwd paths are canonicalized by Rust. The frontend cannot pass a free-form command to a generic executor; it may only open a user-configured terminal profile whose executable, arguments, environment, and cwd are validated by Rust. Tauri capabilities grant only the commands and native dialogs needed by the main window.
 
All SQLite values use parameterized queries. The database and backups are owner-readable/writable only. Persisted profile environment overrides are local plaintext configuration: Terminus never logs them, never includes them in user-facing errors, and does not present them as a secure secret store.
 
PTY output and OSC payloads are untrusted input. Titles and paths have bounded lengths, control characters are rejected where inappropriate, OSC cwd values are canonicalized before reuse, and terminal strings are never rendered as HTML. External navigation is disabled, the Tauri CSP is restrictive, and no shell or broad filesystem capability is exposed.

## 13. Verification and performance

### Behavioral smoke scenarios

- Open a project and receive a shell prompt.
- Type, paste, resize, and render Unicode correctly.
- Run `top`/`vim`-class full-screen TUIs.
- Switch workspaces and return without TUI reset.
- Split around a running TUI.
- Close its sibling without remounting the survivor.
- Resize and drag panes, including a same-project cross-workspace move.
- Generate sustained output without UI input starvation.
- Exit a shell and restart it from the retained panel.
- Exercise every confirmation path.
- Restore projects/layouts after app restart with fresh shells.
- Force a migration/open failure and verify protected recovery.

### Performance gates on the project’s M2 macOS workstation

- Cold interactive application: no more than 2 seconds.
- Active-workspace shell prompt: no more than 1 second after UI readiness.
- One project/one terminal idle RSS: below 150 MB.
- Eight visible terminals: typing remains responsive without perceptible input lag.

## 14. Legacy relationship

`legacy/` is excluded from the new build and typecheck graph, but remains a read-only behavioral reference.

Carry forward:

- ID-idempotent PTY spawn
- Explicit close semantics
- Mounted workspace stability
- Stable leaf identity
- Normalized workspace ownership
- Empty-workspace recovery
- Fit/WebGL fallback lessons

Do not carry forward:

- Svelte components/stores
- localStorage as application persistence
- event-per-output-chunk transport
- duplicate backend scrollback snapshots
- silent missing-session operations
- Git/tasks/snippets/Electron/remote-agent scope
