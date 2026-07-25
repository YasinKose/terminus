# Terminus Terminal Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Use `test-driven-development` for every behavior change and `verification-before-completion` at every phase gate.

**Goal:** Build a macOS-first, local, React/Tauri terminal workspace with stable PTY sessions, project-scoped workspaces, split panes, activity tracking, SQLite persistence, compact theming, and a local daily-driver bundle.

**Architecture:** React renders projects, workspaces, and a stable n-ary pane layout. A frontend runtime registry owns xterm instances independently of React layout mounts. Rust owns PTYs, paths, process lifecycle, profiles, SQLite, recovery, and the typed Tauri boundary. PTY output streams over ordered Tauri Channels directly into xterm; Zustand stores only low-frequency UI metadata.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand 5, selected shadcn/ui components, xterm.js, Tauri v2, Rust, portable-pty, rusqlite, Vitest 4, Testing Library.

**Approved design:** `docs/plans/2026-07-23-terminus-terminal-core-design.md`

---

## Execution rules

1. Before implementation, use `using-git-worktrees` to create an isolated worktree after the archival move and these plan files have a clean Git baseline.
2. Do not import from `legacy/`. It is a behavioral reference only.
3. Do not add Git, tasks, snippets, editor, SSH, remote, tmux, daemon, agent, updater, or distribution scope.
4. Every phase ends with its listed gate. Do not start the next phase while the gate is red.
5. PTY smoke checks run in the real Tauri application. jsdom tests cannot prove terminal rendering or process lifecycle.
6. Keep commits focused. Suggested messages are part of the plan, but review staged files before each commit.

## Target structure

```text
.
├── docs/plans/
├── src/
│   ├── app/
│   ├── components/ui/
│   ├── features/
│   │   ├── appearance/
│   │   ├── command-palette/
│   │   ├── panes/
│   │   ├── profiles/
│   │   ├── projects/
│   │   ├── settings/
│   │   ├── terminal/
│   │   └── workspaces/
│   ├── lib/
│   │   ├── tauri/
│   │   └── utils/
│   ├── stores/
│   ├── styles/
│   ├── test/
│   └── main.tsx
├── src-tauri/
│   ├── capabilities/
│   ├── src/
│   │   ├── commands/
│   │   ├── persistence/
│   │   ├── pty/
│   │   ├── app_error.rs
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── tests/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── components.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

# Phase 0 — Clean foundation

## Task 1: Establish the isolated implementation baseline

**Files:**
- Existing: repository root and `legacy/`
- Keep: `AGENTS.md`, `.gitignore`, `legacy/`, approved plan files

**Step 1: Inspect the pending archival change**

Run:

```bash
git status --short
git diff --stat
```

Expected: the old implementation appears as moves/deletions plus `legacy/` additions; the approved design and plan are present.

**Step 2: Create a clean baseline**

Review all pending paths. With explicit commit authorization, commit the archival cutover separately from implementation:

```bash
git add -A
git commit -m "chore: archive legacy implementation"
```

Expected: clean working tree.

**Step 3: Create an isolated worktree**

Use the `using-git-worktrees` skill. Suggested branch:

```text
feat/react-terminal-core
```

**Step 4: Verify the worktree baseline**

Run:

```bash
git status --short
```

Expected: no output.

---

## Task 2: Scaffold React, Vite, Tailwind, Vitest, and shadcn

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `components.json`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles/index.css`
- Create: `src/test/setup.ts`
- Modify: `.gitignore`

**Step 1: Create the package manifest**

Use pnpm as the only package manager. Define scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "check": "tsc -b --pretty false",
    "test": "vitest",
    "test:run": "vitest run",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

Install runtime dependencies:

```bash
pnpm add react react-dom zustand @tauri-apps/api @xterm/xterm @xterm/addon-fit @xterm/addon-webgl lucide-react clsx tailwind-merge class-variance-authority
```

Install development dependencies:

```bash
pnpm add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @tauri-apps/cli
```

**Step 2: Configure Vite and Tailwind v4**

`vite.config.ts` must register React and `@tailwindcss/vite`. `src/styles/index.css` starts with:

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
}
```

Do not create a Tailwind v3 configuration file.

**Step 3: Configure shadcn ownership and aliases**

Create `components.json` with `rsc: false`, Tailwind CSS variables enabled, Lucide icons, and these aliases:

```json
{
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/lib/hooks"
  }
}
```

Add only the first required components:

```bash
pnpm dlx shadcn@latest add alert-dialog button context-menu dialog dropdown-menu input label select separator sheet sonner switch tooltip
```

Do not add the full registry.

**Step 4: Write the first render test**

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { App } from "./App";

it("renders the empty project state", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /open project/i })).toBeVisible();
});
```

Run:

```bash
pnpm test:run src/app/App.test.tsx
```

Expected before implementation: FAIL because `App` does not exist or lacks the button.

**Step 5: Implement the minimal shell and verify**

Create the app entry, semantic empty state, and test setup. Then run:

```bash
pnpm test:run
pnpm check
pnpm build
```

Expected: all pass.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml index.html tsconfig*.json vite.config.ts vitest.config.ts components.json src .gitignore
git commit -m "feat: scaffold React terminal application"
```

---

## Task 3: Scaffold the Tauri v2 Rust application

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/app_error.rs`

**Step 1: Define Rust dependencies**

Use the current compatible Tauri v2 versions. Required crates:

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
tauri = { version = "2", features = ["macos-private-api"] }
portable-pty = "0.9"
rusqlite = { version = "0.37", features = ["bundled"] }
uuid = { version = "1", features = ["v4", "serde"] }
parking_lot = "0.12"
```

Development dependencies:

```toml
tempfile = "3"
```

Keep `main.rs` as a thin call to `terminus_lib::run()`.

**Step 2: Configure the macOS window**

Use native decorations with overlay titlebar, native traffic lights, and a single main window. Configure Vite commands and `dist` output. Do not enable shell or broad filesystem plugins.

Set a restrictive Tauri CSP compatible with xterm, deny external navigation/new-window requests, and grant commands only to the main-window capability. Keep shell and broad filesystem capabilities absent. Add a test or configuration assertion that fails if either capability is introduced.

**Step 3: Add the structured error contract**

`app_error.rs` defines a serializable shape:

```rust
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorPayload {
    pub code: &'static str,
    pub message: String,
    pub details: Option<serde_json::Value>,
    pub recoverable: bool,
}
```

`AppError` converts into `ErrorPayload`. Do not return raw debug strings from commands.

**Step 4: Add a smoke command**

Register `health_check -> { version, platform }`. Add a frontend typed wrapper and render the result only in development diagnostics.

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri:dev
```

Expected: native window opens and the empty project state renders.

**Step 5: Commit**

```bash
git add src-tauri src/lib/tauri package.json pnpm-lock.yaml
git commit -m "feat: add Tauri Rust application shell"
```

### Phase 0 gate

Run:

```bash
pnpm test:run
pnpm check
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Smoke: `pnpm tauri:dev` opens the macOS window with native traffic lights and no console errors.

---

# Phase 1 — Domain and persistence

## Task 4: Implement pure pane-tree operations first

**Files:**
- Create: `src/features/panes/model.ts`
- Create: `src/features/panes/tree.ts`
- Create: `src/features/panes/tree.test.ts`

**Step 1: Define the tagged union**

```ts
export type PaneNode = TerminalLeaf | SplitContainer;
export type SplitDirection = "row" | "column";

export interface TerminalLeaf {
  type: "terminal";
  id: string;
  profileId: string | null;
  initialCwd: string;
  titleOverride: string | null;
}

export interface SplitContainer {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: PaneNode[];
  sizes: number[];
}
```

**Step 2: Write failing invariant tests**

Cover:

- split a leaf 50/50
- split into an existing same-direction container
- close a sibling without changing survivor ID
- retain a one-child split container
- center-drop swap
- edge-drop insertion
- same-project cross-workspace move
- reject cross-project move
- normalize finite positive sizes to 100
- preserve input immutability

Run:

```bash
pnpm test:run src/features/panes/tree.test.ts
```

Expected: FAIL because functions are absent.

**Step 3: Implement minimal pure functions**

Exports:

```ts
findNode
splitPane
removePane
swapPanes
insertPaneAtEdge
movePaneBetweenWorkspaces
resizeSplit
validatePaneTree
collectTerminalIds
```

Return explicit result unions for invalid operations; never silently return a partially modified tree.

**Step 4: Verify**

```bash
pnpm test:run src/features/panes/tree.test.ts
pnpm check
```

Expected: pass.

**Step 5: Commit**

```bash
git add src/features/panes
git commit -m "feat: add stable pane tree domain"
```

---

## Task 5: Define Rust persistence models and migrations

**Files:**
- Create: `src-tauri/src/persistence/mod.rs`
- Create: `src-tauri/src/persistence/database.rs`
- Create: `src-tauri/src/persistence/migrations.rs`
- Create: `src-tauri/src/persistence/models.rs`
- Create: `src-tauri/src/persistence/repository.rs`
- Create: `src-tauri/tests/persistence.rs`

**Step 1: Write migration tests against a temporary database**

Tests must prove:

- empty DB reaches schema version 1
- migration is idempotent
- foreign keys are enabled
- project path is unique
- deleting project cascades only DB workspaces
- malformed pane JSON is surfaced as a typed recoverable error
- failed migration rolls back

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test persistence
```

Expected: FAIL.

**Step 2: Implement schema version 1**

Tables:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  canonical_path TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL,
  last_active_workspace_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  root_json TEXT,
  active_pane_id TEXT,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executable TEXT,
  args_json TEXT NOT NULL,
  env_json TEXT NOT NULL,
  cwd_override TEXT,
  is_default INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
```

Use `PRAGMA user_version`, `foreign_keys = ON`, WAL, and a five-second busy timeout. Migrations run inside transactions.

**Step 3: Implement repository operations**

Required repository API:

```rust
load_bootstrap_state
add_project
remove_project_metadata
rename_project
save_workspace
save_two_workspaces_atomically
save_profile
save_setting
```

Canonicalize a project path before insert. Never remove filesystem content.

Use rusqlite parameters for every data value; never interpolate user-controlled strings into SQL. Create the database and timestamped backups with owner-only read/write permissions. Profile environment overrides remain local plaintext configuration: never log them, return them in error details, or label them as secure secret storage.

**Step 4: Verify**

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test persistence
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: pass.

**Step 5: Commit**

```bash
git add src-tauri/src/persistence src-tauri/tests/persistence.rs
git commit -m "feat: add SQLite workspace persistence"
```

---

## Task 6: Expose typed project/workspace commands

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/workspaces.rs`
- Create: `src/lib/tauri/contracts.ts`
- Create: `src/lib/tauri/workspaces.ts`
- Create: `src/features/projects/projectStore.ts`
- Create: `src/features/workspaces/workspaceStore.ts`
- Create: tests beside both stores

**Step 1: Write store contract tests**

Cover:

- duplicate canonical project selects the existing project
- selecting project selects its last workspace
- selecting project with no workspace creates `Workspace 1`
- removing project changes only local state after backend success
- active workspace starts immediately; inactive workspaces remain uninitialized
- first activation marks an inactive workspace initialized

**Step 2: Implement thin Rust commands**

Commands validate input, call the repository, and return complete typed entities. Do not embed UI defaults in multiple layers; define default workspace naming in one Rust helper.

**Step 3: Implement focused Zustand stores**

Use selectors. Do not create one monolithic app store. Keep persisted entities separate from runtime sessions.

**Step 4: Verify**

```bash
pnpm test:run src/features/projects src/features/workspaces
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: pass.

**Step 5: Commit**

```bash
git add src-tauri/src/commands src/lib/tauri src/features/projects src/features/workspaces
git commit -m "feat: add project and workspace state"
```

### Phase 1 gate

- Pure pane tests pass.
- Persistence tests pass from empty and version-1 databases.
- Adding the same folder twice does not duplicate it.
- Removing a project leaves a sentinel file in that folder untouched.

---

# Phase 2 — Rust PTY core

## Task 7: Implement profile resolution and macOS login environment

**Files:**
- Create: `src-tauri/src/pty/mod.rs`
- Create: `src-tauri/src/pty/profile.rs`
- Create: `src-tauri/tests/profile_resolution.rs`

**Step 1: Write failing tests**

Cover:

- empty profile resolves to `$SHELL -l`
- missing `$SHELL` falls back to `/bin/zsh`
- profile args preserve ordering
- environment overrides win over captured login environment
- cwd must exist, be a directory, and canonicalize
- invalid executable returns `profile_invalid`

**Step 2: Implement one-time login environment capture**

Capture once at app startup. Ensure `TERM=xterm-256color` and `COLORTERM=truecolor` when absent. Do not recapture per terminal.

**Step 3: Verify**

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test profile_resolution
```

Expected: pass.

**Step 4: Commit**

```bash
git add src-tauri/src/pty src-tauri/tests/profile_resolution.rs
git commit -m "feat: resolve terminal profiles"
```

---

## Task 8: Build the idempotent SessionManager

**Files:**
- Create: `src-tauri/src/pty/events.rs`
- Create: `src-tauri/src/pty/session.rs`
- Create: `src-tauri/src/pty/manager.rs`
- Create: `src-tauri/tests/pty_manager.rs`

**Step 1: Write real PTY integration tests**

Use deterministic commands rather than an interactive login prompt. Cover:

- open `/bin/cat`, write marker, receive marker
- opening same ID twice returns the existing session
- resize valid session
- missing write/resize/close returns typed `session_not_found`
- process exit reports exit code and retains terminal metadata
- close is graceful and bounded
- UTF-8 split across reads reconstructs correctly
- coalescing preserves order

Run serially if the platform requires it:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test pty_manager -- --test-threads=1
```

Expected: FAIL.

**Step 2: Implement session ownership**

`SessionManager` owns a `HashMap<SessionId, Arc<PtySession>>`. A session owns master, writer, child handle, lifecycle, sequence, attachment, and close state. Reader and child monitoring threads report through internal channels. Do not keep a backend scrollback copy.

**Step 3: Implement bounded coalescing**

Flush output when either threshold is reached:

- 16 ms elapsed
- 32 KiB buffered

Decode incrementally so multibyte UTF-8 boundaries are not corrupted. Preserve exact event ordering with a monotonically increasing sequence.

**Step 4: Implement teardown**

On approved close:

1. mark `closing`
2. close writer/master as appropriate
3. wait a bounded interval
4. kill child/process group if still alive
5. emit final state once
6. remove runtime handles only after teardown

**Step 5: Verify**

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test pty_manager -- --test-threads=1
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: pass without hanging threads.

**Step 6: Commit**

```bash
git add src-tauri/src/pty src-tauri/tests/pty_manager.rs
git commit -m "feat: add local PTY session manager"
```

---

## Task 9: Add ordered Tauri Channel commands

**Files:**
- Create: `src-tauri/src/commands/pty.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/lib/tauri/pty.ts`
- Create: `src/lib/tauri/pty.test.ts`

**Step 1: Define the event union on both sides**

Rust:

```rust
#[derive(Clone, serde::Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum PtyEvent {
    Started { session_id: String },
    Output { session_id: String, seq: u64, data: String },
    Exited { session_id: String, code: Option<i32> },
    Error { session_id: String, error: ErrorPayload },
}
```

TypeScript mirrors the tagged union exactly.

**Step 2: Implement commands**

```text
open_pty(request, onEvent)
write_pty(sessionId, data)
resize_pty(sessionId, rows, cols)
close_pty(sessionId)
restart_pty(request, onEvent)
list_pty_states()
```

`open_pty` attaches the Channel before spawning so the initial prompt is not lost. Reopening an existing ID replaces the attachment without creating a second child.

**Step 3: Test the frontend adapter**

Mock Tauri `invoke` and assert argument names, event parsing, and typed error preservation. Reject malformed event payloads at the adapter boundary.

**Step 4: Verify**

```bash
pnpm test:run src/lib/tauri/pty.test.ts
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: pass.

**Step 5: Commit**

```bash
git add src-tauri/src/commands/pty.rs src-tauri/src/lib.rs src/lib/tauri/pty*
git commit -m "feat: stream PTY events over Tauri channels"
```

### Phase 2 gate

Run the Rust PTY integration test repeatedly. No hangs, duplicate sessions, corrupted Unicode, silent missing-session success, or out-of-order output.

---

# Phase 3 — Stable xterm runtime

## Task 10: Build the TerminalRuntimeRegistry

**Files:**
- Create: `src/features/terminal/runtime/types.ts`
- Create: `src/features/terminal/runtime/TerminalRuntime.ts`
- Create: `src/features/terminal/runtime/TerminalRuntimeRegistry.ts`
- Create: `src/features/terminal/runtime/TerminalRuntimeRegistry.test.ts`
- Create: `src/features/terminal/runtime/parking.ts`

**Step 1: Write tests with a fake terminal adapter**

Prove:

- acquire same ID returns the same runtime
- opening occurs once under React StrictMode-style acquire/release/acquire
- moving between host elements reparents the same wrapper element
- detach parks the wrapper without disposing
- explicit delete disposes once
- WebGL context loss falls back without disposing xterm
- close of one runtime does not affect another

**Step 2: Implement stable DOM ownership**

The runtime creates one wrapper element and opens xterm into it exactly once. Hosts only append that wrapper. A hidden parking container owns temporarily unattached wrappers.

Do not call `Terminal.dispose()` during ordinary React cleanup. xterm documentation states disposed terminals cannot be reused.

**Step 3: Keep high-frequency output outside React**

`runtime.write(data)` calls xterm directly. Only lifecycle/activity summaries update Zustand.

**Step 4: Verify**

```bash
pnpm test:run src/features/terminal/runtime
pnpm check
```

Expected: pass.

**Step 5: Commit**

```bash
git add src/features/terminal/runtime
git commit -m "feat: preserve xterm runtimes across layout moves"
```

---

## Task 11: Implement TerminalHost and real PTY wiring

**Files:**
- Create: `src/features/terminal/TerminalHost.tsx`
- Create: `src/features/terminal/TerminalPane.tsx`
- Create: `src/features/terminal/terminalStore.ts`
- Create: `src/features/terminal/TerminalHost.test.tsx`
- Modify: `src/styles/index.css`

**Step 1: Write lifecycle tests**

With mocked registry and Tauri adapter, prove:

- mount acquires and attaches
- unmount detaches but does not close
- visibility change triggers fit only when dimensions are nonzero
- user input calls `write_pty`
- resize is debounced and sends rows/cols
- exited event retains panel and exposes Restart

**Step 2: Implement xterm setup**

Defaults:

- `scrollback: 10000`
- `cursorBlink: true`
- system monospace stack
- theme from the active preset
- FitAddon always
- WebglAddon in production when available
- Canvas fallback on failure/context loss

Register xterm title change, OSC 7, and bell handlers through disposables owned by the runtime.

**Step 3: Wire `open_pty`**

The runtime creates a Tauri Channel, handles the tagged events, and opens the session idempotently. React state must not receive output strings.

**Step 4: Smoke the real terminal**

Run:

```bash
pnpm tauri:dev
```

Exercise:

```text
printf 'hello\n'
printf 'Türkçe 😀 日本語\n'
yes "stream" | head -n 100000
top
vim
```

Expected: correct text, responsive input, correct resize, and full-screen TUI rendering.

**Step 5: Commit**

```bash
git add src/features/terminal src/styles/index.css
git commit -m "feat: render local terminal sessions"
```

### Phase 3 gate

One terminal is usable as a daily shell. Hiding and showing its host preserves xterm content and the child process. WebGL failure leaves a usable Canvas terminal.

---

# Phase 4 — Projects, workspaces, and panes

## Task 12: Build the compact app shell

**Files:**
- Create: `src/app/AppShell.tsx`
- Create: `src/app/Titlebar.tsx`
- Create: `src/features/projects/ProjectSidebar.tsx`
- Create: `src/features/workspaces/WorkspaceTabs.tsx`
- Create: component tests
- Modify: `src/app/App.tsx`

**Step 1: Write interaction tests**

Cover open folder, duplicate project selection, project switching, default workspace creation, workspace rename/reorder, sidebar collapse, and empty workspace action.

**Step 2: Implement Rust folder selection and canonicalization**

Use the official dialog plugin with least privilege. The frontend receives only the selected path, then calls `add_project` for canonicalization and persistence.

**Step 3: Implement lazy-first/mounted-after activation**

- active restored workspace initializes immediately
- inactive workspace has no terminal DOM before first activation
- after first activation it remains rendered and hidden with CSS
- hidden workspaces do not fit/resize until visible

**Step 4: Verify**

```bash
pnpm test:run src/app src/features/projects src/features/workspaces
pnpm check
pnpm tauri:dev
```

Expected: project/workspace navigation works and terminals survive switching.

**Step 5: Commit**

```bash
git add src/app src/features/projects src/features/workspaces src-tauri
git commit -m "feat: add project workspace shell"
```

---

## Task 13: Render and resize the n-ary split tree

**Files:**
- Create: `src/features/panes/PaneTree.tsx`
- Create: `src/features/panes/SplitContainer.tsx`
- Create: `src/features/panes/PaneDivider.tsx`
- Create: component tests

**Step 1: Write tests**

Prove recursive render, stable terminal keys, horizontal/vertical split, pointer resize, minimum pane size, normalized final sizes, and persisted resize on pointer-up.

**Step 2: Implement pointer-captured resize**

Use transient local visual sizes during drag. Persist one normalized update at interaction end rather than writing SQLite on every pointer event.

**Step 3: Protect terminal identity**

Never generate IDs during render. Never collapse a one-child container as cleanup. Verify a sibling close does not dispose or recreate the survivor runtime.

**Step 4: Real TUI smoke**

- Run `top` in pane A.
- Split pane A.
- Close pane B after confirmation.
- Confirm pane A’s runtime identity and TUI remain intact.

**Step 5: Commit**

```bash
git add src/features/panes
git commit -m "feat: add stable split pane layout"
```

---

## Task 14: Add pane drag, swap, insertion, and workspace movement

**Files:**
- Create: `src/features/panes/PaneDragController.ts`
- Create: `src/features/panes/DropZoneOverlay.tsx`
- Modify: `PaneTree.tsx`, `WorkspaceTabs.tsx`, stores/repository commands
- Create: drag-controller and integration tests

**Step 1: Test the drag state machine**

Cover cancel, self-drop no-op, center swap, four edge zones, source cleanup, target insertion, cross-project rejection, and cross-workspace atomic persistence.

**Step 2: Implement one drag controller**

Do not combine competing HTML5 and manual drag state as legacy did. Use one pointer-driven controller with pointer capture and explicit hit testing.

**Step 3: Reparent, do not recreate**

Moving a terminal changes tree ownership and host attachment only. Session ID, Rust PTY, xterm runtime, scrollback, and activity metadata remain unchanged.

**Step 4: Verify in Tauri**

Run a TUI, move it within the workspace, then to another workspace tab in the same project. Confirm uninterrupted process and preserved screen.

**Step 5: Commit**

```bash
git add src/features/panes src/features/workspaces src-tauri/src/persistence
git commit -m "feat: add terminal pane drag and movement"
```

---

## Task 15: Implement confirmations, exit retention, and restart

**Files:**
- Create: `src/features/terminal/CloseTerminalDialog.tsx`
- Create: `src/features/workspaces/CloseWorkspaceDialog.tsx`
- Create: `src/features/projects/CloseProjectDialog.tsx`
- Create: `src/app/CloseApplicationDialog.tsx`
- Create: `src/stores/closeRequestStore.ts`
- Create: tests for every close source
- Modify: Tauri app/window lifecycle

**Step 1: Write confirmation tests**

Every pane, workspace, project, window, and app close request must open a confirmation, including exited/empty targets. Aggregated dialogs show affected terminal counts.

**Step 2: Implement one close-request model**

Represent requests as a tagged union. UI confirmation resolves the request; domain operations execute only after approval. Avoid scattered boolean modal state.

**Step 3: Intercept macOS close and quit**

Prevent the first native exit request, send an application-close request to React, and exit only through a confirmed backend command. Guard against the confirmed exit being intercepted again.

**Step 4: Keep exited panes**

Display exit code and Restart in the pane header/body. Restart uses the last valid OSC cwd or initial cwd and reattaches the same runtime ID after resetting xterm.

**Step 5: Verify**

Exercise all confirmation sources and cancel/confirm paths. Confirm cancel never closes a PTY or mutates SQLite.

**Step 6: Commit**

```bash
git add src/app src/features src/stores src-tauri
git commit -m "feat: add explicit terminal close lifecycle"
```

### Phase 4 gate

All layout operations work around a running full-screen TUI without process or renderer reset. Every close path confirms. Exited panes stay visible and restartable.

---

# Phase 5 — Activity, settings, and recovery

## Task 16: Add lifecycle, activity, OSC, and attention state

**Files:**
- Create: `src/features/terminal/activity.ts`
- Create: `src/features/terminal/activity.test.ts`
- Create: `src/features/terminal/TerminalStatus.tsx`
- Modify: runtime and terminal store

**Step 1: Use fake timers for activity tests**

Cover active pulse, transition to quiet after two seconds, unread on background output, focus clear, bell attention, OSC attention, exit, and restart reset.

**Step 2: Implement low-frequency state projection**

Output writes directly to xterm. Throttle only the metadata projection into Zustand. Do not update React for every chunk.

**Step 3: Parse terminal metadata**

Use xterm `onTitleChange`, `onBell`, and `parser.registerOscHandler(7, ...)`. Validate OSC cwd in Rust before persisting or using it for restart.

**Step 4: Verify**

```bash
pnpm test:run src/features/terminal/activity.test.ts
pnpm check
```

Smoke with focused and background panes.

**Step 5: Commit**

```bash
git add src/features/terminal
git commit -m "feat: track terminal lifecycle and activity"
```

---

## Task 17: Add profiles and configurable core shortcuts

**Files:**
- Create: `src/features/profiles/*`
- Create: `src/features/settings/ShortcutSettings.tsx`
- Create: `src/features/settings/shortcutModel.ts`
- Create: tests
- Modify: persistence repository/commands

**Step 1: Write profile validation tests**

Cover executable, ordered args, env key/value validation, cwd override, default uniqueness, and panel override fallback.

**Step 2: Write shortcut tests**

Cover normalization, macOS display labels, exact conflict detection, reset, and refusal to steal unmodified terminal keystrokes.

**Step 3: Build settings UI from owned shadcn components**

Use Sheet/Dialog, Input, Select, Switch, AlertDialog, and Tooltip. Persist only validated values.

**Step 4: Add command palette**

Commands include project/workspace navigation, new terminal, split, close, focus/zen, sidebar toggle, and settings. It executes the same command functions as menus/shortcuts.

**Step 5: Verify and commit**

```bash
pnpm test:run src/features/profiles src/features/settings src/features/command-palette
pnpm check
```

```bash
git add src/features/profiles src/features/settings src/features/command-palette src-tauri
git commit -m "feat: add terminal profiles and shortcuts"
```

---

## Task 18: Implement six Terminus appearance presets

**Files:**
- Create: `src/features/appearance/presets.ts`
- Create: `src/features/appearance/presets.test.ts`
- Create: `src/features/appearance/AppearanceSettings.tsx`
- Modify: `src/styles/index.css`
- Modify: xterm runtime theme update

**Step 1: Define complete semantic presets**

Create Graphite, Ocean, Sunset, Forest, Orchid, and Paper. Each includes app tokens and a 16-color xterm ANSI palette. Use semantic names, not component-specific hex values.

**Step 2: Write contrast and completeness tests**

Assert every preset defines every token. Validate primary text/background and focus indicator contrast. Paper must remain readable in xterm and app chrome.

**Step 3: Apply theme without recreating terminals**

Set a root `data-theme` and update existing xterm runtime options in place. Theme switching must preserve processes and scrollback.

**Step 4: Add limited appearance controls**

- preset
- pane border width
- pane radius
- active-pane highlight

No arbitrary color editor.

**Step 5: Visual smoke all presets**

Check sidebar, tabs, pane headers, dialogs, focus rings, destructive actions, selection, ANSI colors, and unread indicators.

**Step 6: Commit**

```bash
git add src/features/appearance src/styles/index.css
git commit -m "feat: add Terminus appearance presets"
```

---

## Task 19: Add protected database recovery

**Files:**
- Create: `src-tauri/src/persistence/recovery.rs`
- Create: `src-tauri/src/commands/recovery.rs`
- Create: `src/features/settings/RecoveryScreen.tsx`
- Create: Rust and React tests
- Modify: app bootstrap

**Step 1: Write failure-path tests**

Prove that open/migration failure does not reset or overwrite the original DB. Test retry, timestamped backup, reveal directory, and explicit reset.

**Step 2: Return bootstrap outcome union**

```text
ready { state }
recoveryRequired { error, databasePath, backupAvailable }
```

The frontend renders no normal workspace UI until bootstrap is ready.

**Step 3: Require destructive confirmation for reset**

Reset is disabled until backup succeeds or the user explicitly chooses reset without backup in a second confirmation.

**Step 4: Verify**

Corrupt a copied test DB, launch the app against it, and confirm the recovery screen. Verify the original bytes remain unchanged before an approved action.

**Step 5: Commit**

```bash
git add src-tauri/src/persistence src-tauri/src/commands/recovery.rs src/features/settings/RecoveryScreen*
git commit -m "feat: protect workspace database recovery"
```

### Phase 5 gate

Profiles, shortcuts, themes, activity state, and recovery all persist and survive restart. None recreates or closes a live terminal unexpectedly.

---

# Phase 6 — Hardening and daily-driver release

## Task 20: Add focused regression tests for legacy failure modes

**Files:**
- Create: `src/features/workspaces/workspaceStability.test.tsx`
- Create: `src/features/panes/paneIdentity.test.tsx`
- Create: `src-tauri/tests/session_lifecycle.rs`

**Step 1: Encode the legacy invariants**

Tests defend:

- unmount/hide never calls close
- idempotent open under duplicate attach
- workspace switch preserves runtime ID
- sibling close preserves runtime object and DOM wrapper
- cross-workspace move preserves runtime and session ID
- last pane exit leaves empty workspace/panel state as specified
- explicit approved close is the only teardown path

**Step 2: Run repeatedly**

```bash
pnpm test:run
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
```

Expected: deterministic pass.

**Step 3: Commit**

```bash
git add src/features src-tauri/tests
git commit -m "test: lock terminal stability invariants"
```

---

## Task 21: Perform the real Tauri smoke matrix

**Files:**
- Modify only defects found by smoke testing
- Record results in the eventual PR/testing notes, not a new permanent document

**Step 1: Core terminal**

- launch to prompt
- type/paste Unicode
- sustained output
- resize repeatedly
- enter/exit alternate screen
- WebGL fallback

**Step 2: Workspace and panes**

- open two projects
- create/reorder/rename workspaces
- split both axes
- resize
- edge insert
- center swap
- same-project workspace move
- reject cross-project move
- close sibling around `top` or `vim`

**Step 3: Lifecycle**

- cancel and confirm every close source
- `exit` keeps panel
- Restart opens fresh shell in last known/fallback cwd
- app restart restores layout with fresh sessions

**Step 4: Persistence and recovery**

- settings/profile/theme/shortcuts restore
- project removal leaves files untouched
- corrupt copied DB triggers recovery
- backup and reset require explicit actions

**Step 5: Fix at source and repeat the affected scenario**

Do not suppress errors or weaken assertions.

---

## Task 22: Measure performance and build the local bundle

**Files:**
- Modify: performance hot paths only if measurements fail
- Modify: `src-tauri/tauri.conf.json` bundle metadata/icons as required

**Step 1: Measure the approved gates on the M2 workstation**

- cold interactive ≤2 seconds
- active workspace prompt ≤1 second after UI readiness
- one project/one terminal idle RSS <150 MB
- eight visible terminals retain responsive typing

Use repeatable launch conditions and record median values in PR/testing notes.

**Step 2: Diagnose before optimizing**

Likely checks:

- React rerenders caused by broad Zustand selectors
- xterm count and WebGL contexts
- hidden workspace fit loops
- output Channel message rate
- Rust lock contention
- SQLite writes during pointer movement

Do not add caches or pools without a measured cause.

**Step 3: Run final automated gates**

```bash
pnpm test:run
pnpm check
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: all pass.

Run the security gates after the functional gates:

```bash
pnpm audit --audit-level high
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo audit --deny warnings
```

If `cargo-audit` is unavailable, install the current locked release before this gate. Use the repository Grep tool across the new `src/`, `src-tauri/`, manifests, and configuration files to inspect credential patterns, `dangerouslySetInnerHTML`, `eval`, generic shell execution, SQL interpolation, and broad Tauri capabilities. Expected profile spawning is the only process-execution surface; every call site must validate executable, argument, environment, and cwd bounds. Exclude `legacy/` from findings because it is not shipped, but confirm it is absent from the build graph.

**Step 4: Build the daily-driver artifacts**

```bash
pnpm tauri:build
```

Expected: local macOS `.app` and `.dmg` artifacts. Signing/notarization warnings are acceptable for v0.1; build failures are not.

**Step 5: Install and smoke the built app**

Run the bundled application, not the dev server. Repeat project open, terminal prompt, split, workspace switch, quit confirmation, and restart restore.

**Step 6: Request code review**

Use `requesting-code-review`, then run the mandatory `security-review-2`. Fix all P0/P1/P2 findings before declaring completion.

**Step 7: Commit final hardening**

```bash
git add -A
git commit -m "feat: complete local terminal workspace"
```

---

# Final definition of done

The implementation is complete only when all statements are true:

1. `legacy/` is absent from the new build, tests, and TypeScript graph.
2. A local macOS project opens to a usable shell.
3. Workspaces and pane layouts persist in SQLite.
4. Active workspace starts immediately; other workspaces are lazy and remain mounted after first use.
5. Split, resize, swap, edge insertion, and same-project workspace movement preserve live terminal identity.
6. No UI unmount or navigation path closes a PTY.
7. Every user close path confirms; confirmed close tears down the right processes.
8. Exited panels remain visible and restartable.
9. Activity, unread, bell/OSC attention, title, and cwd tracking behave as approved.
10. Profiles, configurable core shortcuts, command palette, and six appearance presets work without recreating terminals.
11. Database failure leads to protected recovery, never silent data deletion.
12. Automated checks, real Tauri smoke scenarios, performance gates, and the bundled-app smoke all pass.
13. No remote, tmux, daemon, agent, Git, task, snippet, editor, signing, updater, or Homebrew scope leaked into v0.1.
14. Dependency audit, secret scan, static analysis, restrictive CSP/capability review, parameterized SQL review, and PTY/OSC input-boundary review pass for the shipped graph.

# Execution handoff

Plan saved at `docs/plans/2026-07-23-terminus-terminal-core.md`.

Recommended execution modes after the archival baseline is clean:

1. **Subagent-driven in this session:** use `subagent-driven-development`; one fresh implementation agent per task, with review between tasks.
2. **Dedicated execution session:** open the prepared worktree and use `executing-plans` in checkpoints by phase.

Do not begin either mode until the archival move and approved plans have a clean, reviewable Git baseline.
