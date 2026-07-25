# Terminus v0.1 Core Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shell selection, bootstrap restoration, workspace activation, close teardown, and recoverable UI errors match the approved v0.1 contract.

**Architecture:** Rust persists the active project together with the project’s active workspace and resolves the default executable from the captured login environment. A single project-store action owns workspace activation/persistence, while frontend error helpers keep failed backend operations visible and prevent false local teardown.

**Tech Stack:** Rust, rusqlite, portable-pty, Tauri commands, React 19, TypeScript, Zustand, Sonner, Vitest, Testing Library, Cargo integration tests.

## Global Constraints

- The default profile launches the captured `$SHELL -l`; `/bin/zsh -l` is only the fallback when `$SHELL` is absent or empty.
- `selection.activeProjectId` is the single SQLite settings key for the last active project.
- `ProjectRecord.lastActiveWorkspaceId` remains the active-workspace source for each project.
- Selection writes are parameterized and the active project/workspace update is transactional.
- Bootstrap restores a valid saved project; an invalid/missing saved ID falls back deterministically to the first loaded project.
- Inactive workspaces remain uninitialized until first activation; initialized workspaces remain mounted.
- A failed non-`SESSION_NOT_FOUND` PTY close must leave runtime, terminal metadata, and layout intact.
- User-facing errors must never contain profile environment values or raw PTY output.

---

## File structure

| File | Responsibility after this plan |
|---|---|
| `src-tauri/src/pty/profile.rs` | Resolve profile executable from explicit profile, test override, captured `$SHELL`, then `/bin/zsh` |
| `src-tauri/tests/profile_resolution.rs` | Prove runtime-equivalent `$SHELL` and fallback behavior |
| `src-tauri/src/persistence/repository.rs` | Atomically persist active project and workspace selection |
| `src-tauri/tests/persistence.rs` | Prove selection round-trip and transaction behavior |
| `src/features/projects/selection.ts` | Purely choose a valid project ID from bootstrap settings |
| `src/features/projects/projectStore.ts` | Hydrate and restore selection; expose the single workspace-selection action |
| `src/features/projects/projectStore.test.ts` | Test valid, stale, and empty bootstrap selections |
| `src/app/App.tsx` | Await recovery-ready hydration and report window-hook failures |
| `src/app/AppShell.tsx` | Use the centralized selection action and report user-action failures |
| `src/features/command-palette/useCommandActions.ts` | Persist selection for palette/shortcut creation and navigation |
| `src/lib/errors.ts` | Normalize Tauri/JavaScript errors and report safe UI messages |
| `src/main.tsx` | Mount the application Toaster once |
| `src/stores/executeClose.ts` | Preserve runtime/layout when backend close fails |
| `src/app/CloseHost.tsx` | Keep a failed close request retryable and show the error |
| `src/stores/closeRequestStore.test.ts` | Prove close failure and missing-session behavior |

### Task 1: Resolve the actual login shell

**Files:**
- Modify: `src-tauri/src/pty/profile.rs:64-103`
- Modify: `src-tauri/tests/profile_resolution.rs:31-62`

**Interfaces:**
- Consumes: `LoginEnvironment::get(&self, key: &str) -> Option<&str>`
- Produces: unchanged `resolve_profile(ResolveProfileInput) -> Result<ResolvedProfile, AppError>`

- [ ] **Step 1: Write the failing runtime-equivalent resolver test**

Add:

```rust
#[test]
fn empty_profile_uses_shell_from_login_environment_without_override() {
    let root = project_root();
    let mut vars = HashMap::new();
    vars.insert("SHELL".into(), "/bin/sh".into());

    let resolved = resolve_profile(ResolveProfileInput {
        profile: &empty_profile(),
        project_root: &root,
        login_env: &login_env_with(vars),
        shell_override: None,
    })
    .expect("resolve from captured SHELL");

    assert_eq!(resolved.executable, "/bin/sh");
    assert_eq!(resolved.args, vec!["-l".to_string()]);
}
```

- [ ] **Step 2: Run the focused test and verify the defect**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test profile_resolution empty_profile_uses_shell_from_login_environment_without_override
```

Expected: FAIL because the executable is `/bin/zsh`.

- [ ] **Step 3: Pass the login environment into executable resolution**

Change the resolver call and helper to:

```rust
pub fn resolve_profile(input: ResolveProfileInput<'_>) -> Result<ResolvedProfile, AppError> {
    let executable = resolve_executable(
        input.profile,
        input.login_env,
        input.shell_override.as_deref(),
    )?;
    let args = resolve_args(input.profile)?;
    let env = resolve_env(input.profile, input.login_env)?;
    let cwd = resolve_cwd(input.profile, input.project_root)?;

    Ok(ResolvedProfile {
        executable,
        args,
        env,
        cwd,
    })
}

fn resolve_executable(
    profile: &ProfileRecord,
    login_env: &LoginEnvironment,
    shell_override: Option<&str>,
) -> Result<String, AppError> {
    let candidate = profile
        .executable
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| {
            shell_override
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .or_else(|| {
            login_env
                .get("SHELL")
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .unwrap_or_else(|| "/bin/zsh".to_string());

    validate_executable(&candidate)?;
    Ok(candidate)
}
```

- [ ] **Step 4: Verify both captured-shell and fallback behavior**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test profile_resolution
cargo test --manifest-path src-tauri/Cargo.toml --test pty_manager -- --test-threads=1
```

Expected: all profile and PTY manager tests pass.

- [ ] **Step 5: Commit the shell correction**

```bash
git add src-tauri/src/pty/profile.rs src-tauri/tests/profile_resolution.rs
git commit -m "fix(pty): resolve the captured login shell"
```

### Task 2: Persist active project and workspace atomically

**Files:**
- Modify: `src-tauri/src/persistence/repository.rs:19-170`
- Modify: `src-tauri/src/persistence/repository.rs:404-418`
- Modify: `src-tauri/tests/persistence.rs`

**Interfaces:**
- Produces: `pub const ACTIVE_PROJECT_SETTING_KEY: &str = "selection.activeProjectId"`
- Produces: existing `Repository::set_last_active_workspace(&self, project_id, workspace_id)` additionally writes the settings key in the same transaction

- [ ] **Step 1: Write the failing persistence round-trip test**

Add:

```rust
#[test]
fn active_workspace_update_persists_active_project_setting() {
    let dir = TempDir::new().expect("tempdir");
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "selection-project");
    let project = repo
        .add_project(&project_path, "Selection", "#112233")
        .expect("project");
    let workspace = repo
        .ensure_default_workspace(&project.id)
        .expect("workspace");

    repo.set_last_active_workspace(&project.id, &workspace.id)
        .expect("persist selection");

    let state = repo.load_bootstrap_state().expect("bootstrap");
    assert_eq!(
        state.settings.get("selection.activeProjectId"),
        Some(&serde_json::json!(project.id))
    );
    assert_eq!(
        state.projects[0].last_active_workspace_id.as_deref(),
        Some(workspace.id.as_str())
    );
}
```

- [ ] **Step 2: Run the test and verify the missing setting**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test persistence active_workspace_update_persists_active_project_setting
```

Expected: FAIL because `selection.activeProjectId` is absent.

- [ ] **Step 3: Add the setting constant and shared SQL helper**

Add near the repository imports:

```rust
pub const ACTIVE_PROJECT_SETTING_KEY: &str = "selection.activeProjectId";
```

Add beside the other SQL helpers:

```rust
fn upsert_setting_json(
    conn: &Connection,
    key: &str,
    value_json: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO settings (key, value_json) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
        params![key, value_json],
    )
    .map_err(sql_err)?;
    Ok(())
}
```

Refactor `save_setting` to serialize once and call `upsert_setting_json`.

- [ ] **Step 4: Make selection persistence transactional**

Replace the body of `set_last_active_workspace` with a mutable connection transaction that:

```rust
let value_json = serde_json::to_string(project_id)
    .map_err(|e| AppError::Message(format!("failed to serialize active project: {e}")))?;

self.db.with_conn_mut(|conn| {
    let tx = conn
        .transaction()
        .map_err(|e| AppError::Message(format!("failed to begin selection transaction: {e}")))?;
    let workspace = load_workspace_by_id(&tx, workspace_id)?
        .ok_or_else(|| AppError::Message(format!("workspace not found: {workspace_id}")))?;
    if workspace.project_id != project_id {
        return Err(AppError::Message(
            "workspace does not belong to project".into(),
        ));
    }
    let changed = tx
        .execute(
            "UPDATE projects
             SET last_active_workspace_id = ?1, updated_at = ?2
             WHERE id = ?3",
            params![workspace_id, now_ms(), project_id],
        )
        .map_err(sql_err)?;
    if changed == 0 {
        return Err(AppError::Message(format!("project not found: {project_id}")));
    }
    upsert_setting_json(&tx, ACTIVE_PROJECT_SETTING_KEY, &value_json)?;
    tx.commit()
        .map_err(|e| AppError::Message(format!("failed to commit selection: {e}")))?;
    load_project_by_id(conn, project_id)?.ok_or_else(|| {
        AppError::Message(format!("project not found after selection update: {project_id}"))
    })
})
```

- [ ] **Step 5: Verify persistence and command-boundary suites**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test persistence
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: every test passes.

- [ ] **Step 6: Commit the atomic selection write**

```bash
git add src-tauri/src/persistence/repository.rs src-tauri/tests/persistence.rs
git commit -m "fix(persistence): save the active project selection"
```

### Task 3: Restore a valid active project and workspace at bootstrap

**Files:**
- Create: `src/features/projects/selection.ts`
- Create: `src/features/projects/selection.test.ts`
- Modify: `src/features/projects/projectStore.ts:19-133`
- Modify: `src/features/projects/projectStore.test.ts`
- Modify: `src/app/App.tsx:35-200`
- Modify: `src/features/settings/RecoveryScreen.tsx`

**Interfaces:**
- Produces: `ACTIVE_PROJECT_SETTING_KEY = "selection.activeProjectId"`
- Produces: `chooseRestoredProjectId(state: BootstrapState): string | null`
- Changes: `applyReadyState(state: BootstrapState) -> Promise<void>`

- [ ] **Step 1: Write pure selection tests**

Create:

```ts
import { describe, expect, it } from "vitest";
import type { BootstrapState, ProjectRecord } from "@/lib/tauri/contracts";
import { chooseRestoredProjectId } from "./selection";

const project = (id: string): ProjectRecord => ({
  id,
  canonicalPath: `/tmp/${id}`,
  displayName: id,
  color: "#112233",
  lastActiveWorkspaceId: null,
  createdAt: 1,
  updatedAt: 1,
});

const state = (
  projects: ProjectRecord[],
  activeProjectId?: unknown,
): BootstrapState => ({
  projects,
  workspaces: [],
  profiles: [],
  settings:
    activeProjectId === undefined
      ? {}
      : { "selection.activeProjectId": activeProjectId },
});

describe("chooseRestoredProjectId", () => {
  it("returns the persisted project when it still exists", () => {
    expect(chooseRestoredProjectId(state([project("p1"), project("p2")], "p2")))
      .toBe("p2");
  });

  it("falls back to the first project for a stale or non-string setting", () => {
    expect(chooseRestoredProjectId(state([project("p1")], "missing"))).toBe("p1");
    expect(chooseRestoredProjectId(state([project("p1")], 42))).toBe("p1");
  });

  it("returns null when there are no projects", () => {
    expect(chooseRestoredProjectId(state([], "p1"))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the pure test and verify the module is absent**

Run:

```bash
pnpm test:run src/features/projects/selection.test.ts
```

Expected: FAIL because `selection.ts` does not exist.

- [ ] **Step 3: Implement deterministic selection**

Create:

```ts
import type { BootstrapState } from "@/lib/tauri/contracts";

export const ACTIVE_PROJECT_SETTING_KEY = "selection.activeProjectId";

export function chooseRestoredProjectId(
  state: BootstrapState,
): string | null {
  const stored = state.settings[ACTIVE_PROJECT_SETTING_KEY];
  if (
    typeof stored === "string" &&
    state.projects.some((project) => project.id === stored)
  ) {
    return stored;
  }
  return state.projects[0]?.id ?? null;
}
```

- [ ] **Step 4: Write a failing store bootstrap test**

Add a test that bootstraps two projects, persists `p2`, gives `p2.lastActiveWorkspaceId = "w2"`, then asserts:

```ts
expect(useProjectStore.getState().activeProjectId).toBe("p2");
expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2");
expect(useWorkspaceStore.getState().getWorkspace("w2")?.initialized).toBe(true);
expect(useWorkspaceStore.getState().getWorkspace("w1")?.initialized).toBe(false);
```

Use the existing recovery API fixture so the test exercises `bootstrap()`, not direct store mutation.

- [ ] **Step 5: Run the store test and verify bootstrap leaves selection null**

Run:

```bash
pnpm test:run src/features/projects/projectStore.test.ts
```

Expected: the new bootstrap restoration test fails with a null active project/workspace.

- [ ] **Step 6: Share one asynchronous ready-state hydrator**

In `projectStore.ts`, introduce a private helper used by both `bootstrap` and `applyReadyState`:

```ts
const applyBootstrapState = async (
  state: BootstrapState,
  setState: (partial: Partial<ProjectStoreState>) => void,
  getState: () => ProjectStoreState,
): Promise<void> => {
  workspaceBridge().hydrateFromBootstrap(state.workspaces);
  useProfileStore.getState().hydrate(state.profiles);
  useSettingsStore.getState().hydrateFromBootstrap(state.settings);
  useAppearanceStore.getState().hydrateFromBootstrap(state.settings);

  const activeProjectId = chooseRestoredProjectId(state);
  setState({
    projects: state.projects,
    activeProjectId,
    bootstrapped: true,
  });
  if (activeProjectId) {
    await getState().selectProject(activeProjectId);
  }
};
```

Change the store interface and actions to:

```ts
applyReadyState: (state: BootstrapState) => Promise<void>;
```

Use `await applyBootstrapState(state, set, get)` in `bootstrap` and return `applyBootstrapState(state, set, get)` in `applyReadyState`.

- [ ] **Step 7: Await recovery-ready hydration**

Change the `App.tsx` callback to:

```ts
const handleRecoveryReady = async (
  state: import("@/lib/tauri/contracts").BootstrapState,
): Promise<void> => {
  await applyReadyState(state);
};
```

Update `RecoveryScreen`’s `onReady` prop to accept `void | Promise<void>` and use `await onReady(state)` in the retry, reset, and force-reset handlers before each handler returns.

- [ ] **Step 8: Verify normal and recovery bootstrap**

Run:

```bash
pnpm test:run src/features/projects src/features/settings/RecoveryScreen.test.tsx src/app/App.test.tsx
pnpm check
```

Expected: all focused tests and TypeScript checks pass.

- [ ] **Step 9: Commit bootstrap restoration**

```bash
git add src/features/projects/selection.ts src/features/projects/selection.test.ts src/features/projects/projectStore.ts src/features/projects/projectStore.test.ts src/app/App.tsx src/features/settings/RecoveryScreen.tsx src/features/settings/RecoveryScreen.test.tsx
git commit -m "fix(workspaces): restore the active project on launch"
```

### Task 4: Centralize workspace activation and persistence

**Files:**
- Modify: `src/features/projects/projectStore.ts`
- Modify: `src/features/projects/projectStore.test.ts`
- Modify: `src/app/AppShell.tsx:80-157`
- Modify: `src/features/command-palette/useCommandActions.ts:24-188`
- Modify: `src/features/command-palette/commandRegistry.test.ts`
- Modify: `src/app/AppShell.test.tsx`

**Interfaces:**
- Produces: `selectWorkspace(projectId: string, workspaceId: string) -> Promise<void>` on `ProjectStoreState`
- Consumes: `WorkspaceApi.setLastActiveWorkspace(projectId, workspaceId)`

- [ ] **Step 1: Write the failing centralized-action test**

Add:

```ts
it("selectWorkspace initializes the workspace and persists both selections", async () => {
  const p = project({ id: "p1", canonicalPath: "/tmp/p1" });
  const w = workspace({ id: "w1", projectId: "p1", name: "One" });
  const api = createMockApi({ projects: [p], workspaces: [w] });
  useProjectStore.getState().setApi(api);
  useWorkspaceStore.getState().setApi(api);
  useProjectStore.getState().hydrate([p]);
  useWorkspaceStore.getState().hydrateFromBootstrap([w]);

  await useProjectStore.getState().selectWorkspace("p1", "w1");

  expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w1");
  expect(api.setLastActiveWorkspace).toHaveBeenCalledWith("p1", "w1");
  expect(useProjectStore.getState().projects[0]?.lastActiveWorkspaceId).toBe("w1");
});
```

- [ ] **Step 2: Run the store test and verify the action is absent**

Run:

```bash
pnpm test:run src/features/projects/projectStore.test.ts
```

Expected: FAIL because `selectWorkspace` is not part of the store.

- [ ] **Step 3: Implement the single action**

Add to the interface and store:

```ts
selectWorkspace: async (projectId, workspaceId) => {
  const workspace = workspaceBridge().getWorkspace(workspaceId);
  if (!workspace || workspace.projectId !== projectId) {
    throw new Error("workspace does not belong to project");
  }
  await workspaceBridge().activateWorkspace(workspaceId);
  const updated = await api.setLastActiveWorkspace(projectId, workspaceId);
  set((state) => ({
    activeProjectId: projectId,
    projects: state.projects.map((project) =>
      project.id === updated.id ? updated : project,
    ),
  }));
},
```

Refactor `selectProject` to call `get().selectWorkspace(projectId, workspace.id)` after ensuring the workspace.

- [ ] **Step 4: Replace AppShell’s duplicated activation code**

Read `selectWorkspace` from the project store and replace both workspace selection and post-create persistence with:

```ts
await selectWorkspace(activeProjectId, workspaceId);
```

and:

```ts
const saved = await saveWorkspace(record);
await selectWorkspace(activeProjectId, saved.id);
```

Remove the empty `try/catch` blocks and the direct `setLastActiveWorkspace` state patches.

- [ ] **Step 5: Persist palette and shortcut paths**

In `useCommandActions`, use `selectWorkspace` for:

```ts
await selectWorkspace(activeProjectId, saved.id);
await selectWorkspace(activeProjectId, next.id);
await selectWorkspace(activeProjectId, prev.id);
```

Expose command-context workspace selection as:

```ts
selectWorkspace: (workspaceId: string) =>
  activeProjectId
    ? selectWorkspace(activeProjectId, workspaceId)
    : Promise.resolve(),
```

- [ ] **Step 6: Add interaction assertions**

Extend AppShell/command tests to assert `setLastActiveWorkspace` is called for:

- clicking a workspace tab;
- creating a workspace from the chrome button;
- creating a workspace through the command action;
- next/previous workspace commands.

- [ ] **Step 7: Run the focused frontend suite**

Run:

```bash
pnpm test:run src/features/projects src/features/command-palette src/app/AppShell.test.tsx
pnpm check
```

Expected: all tests pass and no activation path writes project-store state directly.

- [ ] **Step 8: Commit centralized selection**

```bash
git add src/features/projects src/app/AppShell.tsx src/app/AppShell.test.tsx src/features/command-palette
git commit -m "fix(workspaces): persist every workspace activation"
```

### Task 5: Preserve runtime state when close fails

**Files:**
- Create: `src/lib/errors.ts`
- Create: `src/lib/errors.test.ts`
- Modify: `src/stores/executeClose.ts:20-55`
- Modify: `src/app/CloseHost.tsx:24-72`
- Modify: `src/stores/closeRequestStore.test.ts`

**Interfaces:**
- Produces: `errorCode(error: unknown): string | null`
- Produces: `errorMessage(error: unknown): string`
- Produces: `reportError(title: string, error: unknown): void`

- [ ] **Step 1: Write error-normalization tests**

Create:

```ts
import { describe, expect, it, vi } from "vitest";
import { errorCode, errorMessage } from "./errors";

describe("Tauri error normalization", () => {
  it("reads structured payloads without serializing details", () => {
    const error = {
      code: "SESSION_NOT_FOUND",
      message: "session missing",
      details: { env: "must-not-render" },
      recoverable: true,
    };
    expect(errorCode(error)).toBe("SESSION_NOT_FOUND");
    expect(errorMessage(error)).toBe("session missing");
    expect(errorMessage(error)).not.toContain("must-not-render");
  });

  it("uses Error messages and a bounded generic fallback", () => {
    expect(errorMessage(new Error("backend failed"))).toBe("backend failed");
    expect(errorMessage({ unexpected: true })).toBe("Unexpected application error");
    expect(errorMessage(new Error("x".repeat(600)))).toHaveLength(240);
  });
});
```

- [ ] **Step 2: Run the test and verify the module is absent**

Run:

```bash
pnpm test:run src/lib/errors.test.ts
```

Expected: FAIL because `errors.ts` does not exist.

- [ ] **Step 3: Implement bounded normalization and reporting**

Create:

```ts
import { toast } from "sonner";

type ErrorPayloadLike = {
  code?: unknown;
  message?: unknown;
};

export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as ErrorPayloadLike).code;
  return typeof code === "string" ? code : null;
}

export function errorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" &&
          typeof (error as ErrorPayloadLike).message === "string"
        ? (error as ErrorPayloadLike).message as string
        : "Unexpected application error";
  return raw.slice(0, 240);
}

export function reportError(title: string, error: unknown): void {
  toast.error(title, { description: errorMessage(error) });
}
```

- [ ] **Step 4: Write close-failure regression tests**

Add this fixture beside the existing mock APIs:

```ts
function seedTerminalCloseFixture(): Extract<
  CloseRequest,
  { kind: "terminal" }
> {
  useWorkspaceStore.setState({
    workspaces: [
      {
        id: "w1",
        projectId: "p1",
        name: "W1",
        rootJson: JSON.stringify({
          type: "terminal",
          id: "t1",
          profileId: null,
          initialCwd: "",
          titleOverride: null,
        }),
        activePaneId: "t1",
        position: 0,
        createdAt: 1,
        updatedAt: 1,
        initialized: true,
      },
    ],
    activeWorkspaceId: "w1",
  });
  useTerminalStore.getState().ensureSession("t1", "p1");
  return {
    kind: "terminal",
    sessionId: "t1",
    workspaceId: "w1",
    projectId: "p1",
    title: "Terminal",
    terminalCount: 1,
  };
}
```

Add two tests:

```ts
it("keeps runtime and metadata when close fails", async () => {
  const ptyApi = mockPtyApi();
  vi.mocked(ptyApi.closePty).mockRejectedValue({
    code: "PTY_CLOSE_FAILED",
    message: "close failed",
    recoverable: true,
  });
  const registry = { delete: vi.fn() };
  const request = seedTerminalCloseFixture();

  await expect(
    executeClose(request, { ptyApi, registry }),
  ).rejects.toMatchObject({ code: "PTY_CLOSE_FAILED" });

  expect(registry.delete).not.toHaveBeenCalled();
  expect(useTerminalStore.getState().sessions.t1).toBeDefined();
});

it("treats an already missing backend session as completed teardown", async () => {
  const ptyApi = mockPtyApi();
  vi.mocked(ptyApi.closePty).mockRejectedValue({
    code: "SESSION_NOT_FOUND",
    message: "missing",
    recoverable: true,
  });
  const registry = { delete: vi.fn() };
  const request = seedTerminalCloseFixture();

  await executeClose(request, { ptyApi, registry });

  expect(registry.delete).toHaveBeenCalledWith("t1");
});
```

- [ ] **Step 5: Make backend close failure authoritative**

Change `closeSession` to:

```ts
async function closeSession(
  sessionId: string,
  ptyApi: PtyApi,
  registry: { delete: (id: string) => void },
): Promise<void> {
  useTerminalStore.getState().markClosing(sessionId);
  try {
    await ptyApi.closePty(sessionId);
  } catch (error) {
    if (errorCode(error) !== "SESSION_NOT_FOUND") {
      useTerminalStore.getState().markError(sessionId, {
        code: errorCode(error) ?? "PTY_CLOSE_FAILED",
        message: errorMessage(error),
        recoverable: true,
      });
      throw error;
    }
  }
  registry.delete(sessionId);
  useTerminalStore.getState().removeSession(sessionId);
}
```

- [ ] **Step 6: Keep failed confirmation retryable**

Change `CloseHost.runClose` so a failure reports the error and leaves the request in the store:

```ts
const runClose = useCallback(
  (current: NonNullable<typeof request>) => {
    void executeClose(current, { destroyWindow }).catch((error) => {
      reportError("Could not close the requested item", error);
    });
  },
  [destroyWindow],
);
```

Do not call `clear()` on failure; `executeClose` already clears only after successful completion.

- [ ] **Step 7: Verify close semantics**

Run:

```bash
pnpm test:run src/lib/errors.test.ts src/stores/closeRequestStore.test.ts src/app/CloseHost.test.tsx
pnpm check
```

Expected: all tests pass; a close failure leaves the request and runtime available for retry.

- [ ] **Step 8: Commit safe close handling**

```bash
git add src/lib/errors.ts src/lib/errors.test.ts src/stores/executeClose.ts src/stores/closeRequestStore.test.ts src/app/CloseHost.tsx src/app/CloseHost.test.tsx
git commit -m "fix(lifecycle): preserve sessions when close fails"
```

### Task 6: Surface user-action failures and eliminate empty catches

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/features/settings/RecoveryScreen.tsx`
- Modify: `src/features/terminal/TerminalHost.tsx`
- Modify: `src/features/terminal/createXtermAdapter.ts`
- Modify: `src/features/terminal/runtime/TerminalRuntime.ts`
- Modify: `src/features/panes/SplitContainer.tsx`
- Modify: `src/stores/executeClose.ts`
- Test: relevant existing component/runtime tests

**Interfaces:**
- Consumes: `reportError(title, error)` from Task 5
- Produces: one mounted `<Toaster />`; no empty catch body in shipped frontend files

- [ ] **Step 1: Mount the shared Toaster**

Update the root:

```tsx
import { Toaster } from "@/components/ui/sonner";

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
      <Toaster richColors closeButton />
    </TooltipProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Report App and AppShell I/O failures**

Wrap event-triggered promises with a local helper:

```ts
const runAction = (title: string, action: () => Promise<void>): void => {
  void action().catch((error) => reportError(title, error));
};
```

Use it for open project, select project/workspace, create/rename workspace, and settings/palette actions that call the backend. Report window close-hook installation failures as `"Could not install the window close guard"`.

- [ ] **Step 3: Document intentional best-effort fallbacks**

For cleanup/fallback catches in xterm WebGL, runtime disposal, OSC cwd validation, resize cleanup, and recovery reveal, add a concise fallback comment and never expose raw error objects. Examples:

```ts
} catch {
  // WebGL is optional; xterm continues with its canvas renderer.
}
```

```ts
} catch {
  // A stale OSC cwd is ignored; restart keeps the previous validated cwd.
}
```

For backend persistence and lifecycle operations, use `reportError` or rethrow; do not downgrade them to comments.

- [ ] **Step 4: Add a static empty-catch gate**

Run:

```bash
rg -nUP 'catch\s*\{\s*\}' src
```

Expected: no output. Catch blocks with a reviewed fallback comment are allowed.

- [ ] **Step 5: Verify frontend behavior**

Run:

```bash
pnpm test:run
pnpm check
pnpm build
```

Expected: all commands pass; the existing WebGL fallback tests remain green.

- [ ] **Step 6: Commit error visibility**

```bash
git add src
git commit -m "fix(ui): surface recoverable application errors"
```

### Task 7: Run the core-correctness phase gate

**Files:**
- Modify only defects found by the gate

**Interfaces:**
- Consumes: all outputs from Tasks 1-6
- Produces: a green base for the interaction-completion plan

- [ ] **Step 1: Run all automated gates**

```bash
pnpm test:run
pnpm check
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: every command exits 0.

- [ ] **Step 2: Run targeted repetition**

```bash
for run in 1 2 3 4 5; do
  cargo test --manifest-path src-tauri/Cargo.toml --test pty_manager -- --test-threads=1
done
```

Expected: all five runs pass without a hang.

- [ ] **Step 3: Inspect the shipped graph boundaries**

```bash
rg -n "legacy/" package.json tsconfig.json vite.config.ts vitest.config.ts src src-tauri/Cargo.toml src-tauri/tauri.conf.json
rg -n "shell:|fs:|allow-execute" src-tauri/capabilities src-tauri/tauri.conf.json
```

Expected: no build import from `legacy/`; no shell or broad filesystem capability.

- [ ] **Step 4: Commit only if gate repairs were required**

```bash
git add src src-tauri
git commit -m "fix: close core correctness gate defects"
```

Skip this commit when the gate required no source changes.
