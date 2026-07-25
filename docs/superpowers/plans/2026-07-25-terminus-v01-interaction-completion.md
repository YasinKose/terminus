# Terminus v0.1 Interaction Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved workspace reorder, project/workspace/pane context actions, per-pane profile selection/display, deleted-profile fallback, and live OSC attention behavior without disturbing terminal identity.

**Architecture:** Pure pane-tree and workspace-store operations own data changes; UI menus only call those typed operations. Profile selection changes persisted pane metadata but never restarts a live process. xterm converts supported OSC notification sequences into the existing low-frequency attention tracker through the runtime abstraction.

**Tech Stack:** React 19, TypeScript, Zustand 5, Radix/shadcn context menus, xterm.js parser hooks, Tauri v2, Rust/rusqlite, Vitest, Testing Library, Cargo tests.

## Global Constraints

- Workspace reorder swaps adjacent `position` values and persists both rows through the existing atomic `save_two_workspaces` command.
- Workspace-tab reorder must not reuse or interfere with the pane pointer-drag controller; v0.1 exposes deterministic Move Left/Move Right context actions.
- Context menus are keyboard reachable and call the same domain/store operations used by visible controls.
- A per-pane `profileId = null` means “follow the current global default”; a concrete ID pins that pane to the selected profile.
- Changing a pane profile never closes/restarts the current process; it applies on the next explicit Restart or new shell.
- A deleted/missing pinned profile falls back to the global default and then the synthetic system profile.
- Profile name, lifecycle/activity, and title remain visible in the 24–32 px pane header without forcing xterm recreation.
- OSC 9 and OSC 777 `notify;...` set in-app attention only; v0.1 does not add native notification permissions.
- OSC payloads are bounded, control characters are rejected, and no payload is rendered as HTML.

---

## File structure

| File | Responsibility after this plan |
|---|---|
| `src/features/workspaces/workspaceStore.ts` | Atomically reorder adjacent workspaces |
| `src/features/workspaces/WorkspaceContextMenu.tsx` | Rename, move left/right, and close workspace actions |
| `src/features/workspaces/WorkspaceTabs.tsx` | Wrap visible tabs with the workspace context menu |
| `src/features/projects/ProjectContextMenu.tsx` | Rename and remove project actions |
| `src/features/projects/ProjectSidebar.tsx` | Project rename dialog and context-menu integration |
| `src/features/panes/tree.ts` | Purely update a terminal’s pinned profile |
| `src-tauri/src/persistence/repository.rs` | Resolve a requested profile with default fallback |
| `src/features/panes/PaneContextMenu.tsx` | Split, focus, rename, profile, and close actions |
| `src/features/panes/PaneTree.tsx` | Render profile badge and apply pane context actions |
| `src/features/terminal/activity.ts` | Clear explicit attention when a pane receives focus |
| `src/features/terminal/activity.test.ts` | Lock focus/attention behavior |
| `src/features/terminal/osc.ts` | Validate supported OSC notification payloads |
| `src/features/terminal/runtime/types.ts` | Carry an attention callback through the runtime boundary |
| `src/features/terminal/createXtermAdapter.ts` | Register OSC 9 and 777 parser handlers |
| `src/features/terminal/TerminalHost.tsx` | Project live OSC notification into the activity tracker |

### Task 1: Reorder workspaces atomically

**Files:**
- Modify: `src/features/workspaces/workspaceStore.ts`
- Modify: `src/features/workspaces/workspaceStore.test.ts`

**Interfaces:**
- Produces: `reorderWorkspace(workspaceId: string, direction: -1 | 1) -> Promise<void>`
- Consumes: existing `saveTwoWorkspaces(first, second) -> Promise<[WorkspaceView, WorkspaceView]>`

- [ ] **Step 1: Write failing store tests**

Add:

```ts
it("moves a workspace left by atomically swapping adjacent positions", async () => {
  const a = workspace({ id: "a", projectId: "p1", name: "A", position: 0 });
  const b = workspace({ id: "b", projectId: "p1", name: "B", position: 1 });
  const c = workspace({ id: "c", projectId: "p1", name: "C", position: 2 });
  const api = mockWorkspaceApi();
  useWorkspaceStore.getState().setApi(api);
  useWorkspaceStore.getState().hydrateFromBootstrap([a, b, c]);

  await useWorkspaceStore.getState().reorderWorkspace("b", -1);

  expect(api.saveTwoWorkspaces).toHaveBeenCalledOnce();
  const [moved, neighbor] = vi.mocked(api.saveTwoWorkspaces).mock.calls[0]!;
  expect([moved.id, moved.position]).toEqual(["b", 0]);
  expect([neighbor.id, neighbor.position]).toEqual(["a", 1]);
  expect(
    useWorkspaceStore.getState().listForProject("p1").map((item) => item.id),
  ).toEqual(["b", "a", "c"]);
});

it("does not persist when a workspace is already at the requested edge", async () => {
  const a = workspace({ id: "a", projectId: "p1", name: "A", position: 0 });
  const api = mockWorkspaceApi();
  useWorkspaceStore.getState().setApi(api);
  useWorkspaceStore.getState().hydrateFromBootstrap([a]);

  await useWorkspaceStore.getState().reorderWorkspace("a", -1);

  expect(api.saveTwoWorkspaces).not.toHaveBeenCalled();
});
```

Define this complete mock in the test file:

```ts
function mockWorkspaceApi(): WorkspaceApi {
  return {
    loadBootstrapState: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    renameProject: vi.fn(),
    ensureDefaultWorkspace: vi.fn(),
    setLastActiveWorkspace: vi.fn(),
    saveWorkspace: vi.fn(async (workspace) => workspace),
    saveTwoWorkspaces: vi.fn(
      async (first, second): Promise<[WorkspaceRecord, WorkspaceRecord]> => [
        first,
        second,
      ],
    ),
    deleteWorkspace: vi.fn(),
  };
}
```

- [ ] **Step 2: Run the store test and verify the action is absent**

Run:

```bash
pnpm test:run src/features/workspaces/workspaceStore.test.ts
```

Expected: FAIL because `reorderWorkspace` does not exist.

- [ ] **Step 3: Implement adjacent atomic swapping**

Add the action to `WorkspaceStoreState` and implement:

```ts
reorderWorkspace: async (workspaceId, direction) => {
  const current = get().getWorkspace(workspaceId);
  if (!current) {
    throw new Error(`workspace not found: ${workspaceId}`);
  }
  const ordered = get().listForProject(current.projectId);
  const currentIndex = ordered.findIndex((item) => item.id === workspaceId);
  const neighbor = ordered[currentIndex + direction];
  if (!neighbor) return;

  const now = Date.now();
  const moved: WorkspaceRecord = {
    ...current,
    position: neighbor.position,
    updatedAt: now,
  };
  const swapped: WorkspaceRecord = {
    ...neighbor,
    position: current.position,
    updatedAt: now,
  };
  await get().saveTwoWorkspaces(moved, swapped);
},
```

Because structural assignment drops no required `WorkspaceRecord` field and excess `initialized` is allowed on variables, do not serialize `initialized` manually.

- [ ] **Step 4: Verify store ordering**

Run:

```bash
pnpm test:run src/features/workspaces/workspaceStore.test.ts
pnpm check
```

Expected: both tests and TypeScript pass.

- [ ] **Step 5: Commit atomic reorder**

```bash
git add src/features/workspaces/workspaceStore.ts src/features/workspaces/workspaceStore.test.ts
git commit -m "feat(workspaces): reorder workspace tabs atomically"
```

### Task 2: Add project and workspace context menus

**Files:**
- Create: `src/features/projects/ProjectContextMenu.tsx`
- Create: `src/features/workspaces/WorkspaceContextMenu.tsx`
- Modify: `src/features/projects/ProjectSidebar.tsx`
- Modify: `src/features/workspaces/WorkspaceTabs.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/features/workspaces/WorkspaceTabs.test.tsx`

**Interfaces:**
- Produces: `ProjectContextMenu` callbacks `onRename()` and `onClose()`
- Produces: `WorkspaceContextMenu` callbacks `onRename()`, `onMove(-1 | 1)`, and `onClose()`
- Changes: `ProjectSidebarProps` adds `onRenameProject(projectId, name)`
- Changes: `WorkspaceTabsProps` adds `onMoveWorkspace(workspaceId, direction)`

- [ ] **Step 1: Write context-menu interaction tests**

Add WorkspaceTabs tests that right-click `workspace-tab-workspace-2`, then assert:

```ts
expect(await screen.findByRole("menuitem", { name: "Move left" })).toBeEnabled();
expect(screen.getByRole("menuitem", { name: "Move right" })).toBeDisabled();
```

Click Move Left and assert:

```ts
expect(onMoveWorkspace).toHaveBeenCalledWith("workspace-2", -1);
```

Add an AppShell test that right-clicks project `p1`, chooses Rename, enters `Backend`, submits, and asserts:

```ts
expect(api.renameProject).toHaveBeenCalledWith("p1", "Backend");
```

- [ ] **Step 2: Run the focused tests and verify the menus are absent**

Run:

```bash
pnpm test:run src/features/workspaces/WorkspaceTabs.test.tsx src/app/AppShell.test.tsx
```

Expected: FAIL because context-menu items and props do not exist.

- [ ] **Step 3: Create the workspace context-menu wrapper**

Create:

```tsx
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type WorkspaceContextMenuProps = {
  children: ReactNode;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRename: () => void;
  onMove: (direction: -1 | 1) => void;
  onClose: () => void;
};

export function WorkspaceContextMenu({
  children,
  canMoveLeft,
  canMoveRight,
  onRename,
  onMove,
  onClose,
}: WorkspaceContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={onRename}>Rename…</ContextMenuItem>
        <ContextMenuItem
          disabled={!canMoveLeft}
          onSelect={() => onMove(-1)}
        >
          Move left
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canMoveRight}
          onSelect={() => onMove(1)}
        >
          Move right
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          Close workspace…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

- [ ] **Step 4: Integrate workspace menu and reorder bounds**

Add `onMoveWorkspace` to `WorkspaceTabsProps`. For each visible workspace, compute its index in the full ordered `workspaces` array and wrap the existing tab container:

```tsx
<WorkspaceContextMenu
  canMoveLeft={workspaceIndex > 0}
  canMoveRight={workspaceIndex < workspaces.length - 1}
  onRename={() => {
    setRenameTarget({ id: ws.id, name: ws.name });
    setRenameValue(ws.name);
  }}
  onMove={(direction) => onMoveWorkspace?.(ws.id, direction)}
  onClose={() => onCloseWorkspace?.(ws.id)}
>
  {/* existing tab div */}
</WorkspaceContextMenu>
```

Keep `data-workspace-tab-id` on the tab button so pane drops continue to target it.

- [ ] **Step 5: Create the project context-menu wrapper**

Create:

```tsx
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function ProjectContextMenu({
  children,
  onRename,
  onClose,
}: {
  children: ReactNode;
  onRename: () => void;
  onClose: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={onRename}>Rename project…</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          Remove project…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

- [ ] **Step 6: Add the project rename dialog**

Add `onRenameProject` to `ProjectSidebarProps`, maintain:

```ts
const [renameTarget, setRenameTarget] = useState<ProjectRecord | null>(null);
const [renameValue, setRenameValue] = useState("");
```

Wrap each project row in `ProjectContextMenu`. Reuse the owned `Dialog`, `Input`, `Label`, and `Button` components to submit the trimmed value:

```ts
const submitRename = () => {
  const name = renameValue.trim();
  if (!renameTarget || !name || name === renameTarget.displayName) return;
  onRenameProject?.(renameTarget.id, name);
  setRenameTarget(null);
};
```

The destructive item must call the existing close-request callback; it must not bypass confirmation.

- [ ] **Step 7: Wire AppShell to existing stores**

Read `renameProject` and `reorderWorkspace` from their stores. Pass:

```tsx
onRenameProject={(projectId, name) => {
  runAction("Could not rename project", () =>
    renameProject(projectId, name),
  );
}}
```

and:

```tsx
onMoveWorkspace={(workspaceId, direction) => {
  runAction("Could not reorder workspace", () =>
    reorderWorkspace(workspaceId, direction),
  );
}}
```

- [ ] **Step 8: Verify keyboard-accessible management**

Run:

```bash
pnpm test:run src/features/workspaces/WorkspaceTabs.test.tsx src/app/AppShell.test.tsx
pnpm check
```

Expected: rename, move, and destructive requests are reachable from the menus; close still renders confirmation.

- [ ] **Step 9: Commit project/workspace context actions**

```bash
git add src/features/projects src/features/workspaces src/app/AppShell.tsx src/app/AppShell.test.tsx
git commit -m "feat(ui): add project and workspace context actions"
```

### Task 3: Persist pane profile selection and fall back after deletion

**Files:**
- Modify: `src/features/panes/tree.ts`
- Modify: `src/features/panes/tree.test.ts`
- Modify: `src-tauri/src/persistence/repository.rs`
- Modify: `src-tauri/tests/persistence.rs`
- Modify: `src-tauri/src/commands/pty.rs:67-103`

**Interfaces:**
- Produces: `setTerminalProfile(root, terminalId, profileId) -> TreeResult<PaneNode>`
- Produces: `Repository::resolve_profile_or_default(profile_id: Option<&str>) -> Result<Option<ProfileRecord>, AppError>`

- [ ] **Step 1: Write pure pane-profile tests**

Add:

```ts
it("pins and clears a terminal profile without mutating the input tree", () => {
  const root = createTerminalLeaf("t1");
  const pinned = setTerminalProfile(root, "t1", "profile-zsh");
  expect(pinned.ok).toBe(true);
  if (!pinned.ok) return;
  expect((pinned.value as TerminalLeaf).profileId).toBe("profile-zsh");
  expect(root.profileId).toBeNull();

  const cleared = setTerminalProfile(pinned.value, "t1", null);
  expect(cleared.ok).toBe(true);
  if (!cleared.ok) return;
  expect((cleared.value as TerminalLeaf).profileId).toBeNull();
});
```

- [ ] **Step 2: Run the pure test and verify the function is absent**

Run:

```bash
pnpm test:run src/features/panes/tree.test.ts
```

Expected: FAIL because `setTerminalProfile` is not exported.

- [ ] **Step 3: Implement immutable profile assignment**

Add beside `renameTerminal`:

```ts
export function setTerminalProfile(
  root: PaneNode,
  terminalId: string,
  profileId: string | null,
): TreeResult<PaneNode> {
  const terminal = findNode(root, terminalId);
  if (!terminal) return err(`terminal not found: ${terminalId}`);
  if (terminal.type !== "terminal") {
    return err(`node ${terminalId} is not a terminal`);
  }
  const normalized = profileId?.trim() || null;
  return replaceNode(root, terminalId, {
    ...terminal,
    profileId: normalized,
  });
}
```

- [ ] **Step 4: Write deleted-profile fallback tests**

In the Rust persistence suite, create a default profile and a pinned profile, then assert:

```rust
assert_eq!(
    repo.resolve_profile_or_default(Some("pinned"))
        .expect("pinned")
        .expect("profile")
        .id,
    "pinned"
);
repo.delete_profile("pinned").expect("delete pinned");
assert_eq!(
    repo.resolve_profile_or_default(Some("pinned"))
        .expect("fallback")
        .expect("default")
        .id,
    "default"
);
```

Also assert an empty profile table returns `None`.

- [ ] **Step 5: Run the Rust test and verify the resolver is absent**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test persistence resolve_profile
```

Expected: FAIL because `resolve_profile_or_default` does not exist.

- [ ] **Step 6: Implement repository fallback**

Add:

```rust
pub fn resolve_profile_or_default(
    &self,
    profile_id: Option<&str>,
) -> Result<Option<ProfileRecord>, AppError> {
    if let Some(profile_id) = profile_id {
        if let Some(profile) = self.get_profile(profile_id)? {
            return Ok(Some(profile));
        }
    }
    self.get_default_profile()
}
```

Change `open_session_with_channel` to:

```rust
let mut profile = state.with_repository(app, |repo| {
    Ok(repo
        .resolve_profile_or_default(request.profile_id.as_deref())?
        .unwrap_or_else(synthetic_default_profile))
})?;
```

This fallback is only for missing persisted IDs; invalid executable/args/env/cwd still returns `PROFILE_INVALID`.

- [ ] **Step 7: Verify pane and backend profile behavior**

Run:

```bash
pnpm test:run src/features/panes/tree.test.ts src/features/profiles
cargo test --manifest-path src-tauri/Cargo.toml --test persistence
cargo test --manifest-path src-tauri/Cargo.toml --test profile_resolution
```

Expected: all tests pass.

- [ ] **Step 8: Commit profile persistence/fallback**

```bash
git add src/features/panes/tree.ts src/features/panes/tree.test.ts src-tauri/src/persistence/repository.rs src-tauri/src/commands/pty.rs src-tauri/tests/persistence.rs
git commit -m "feat(profiles): persist pane profile overrides"
```

### Task 4: Add pane context actions and profile visibility

**Files:**
- Create: `src/features/panes/PaneContextMenu.tsx`
- Create: `src/features/panes/PaneContextMenu.test.tsx`
- Modify: `src/features/panes/PaneTree.tsx`
- Modify: `src/features/panes/PaneTree.test.tsx`
- Modify: `src/features/profiles/profileModel.ts`

**Interfaces:**
- Consumes: `setTerminalProfile`, `splitPane`, `resolvePaneProfile`, profile store
- Produces: pane menu callbacks for split row/column, focus mode, rename, profile selection, and close
- Produces: `paneProfileLabel(profileId, profiles) -> string`

- [ ] **Step 1: Add profile-label tests**

Add:

```ts
it("labels pinned, global-default, and system profiles", () => {
  const profiles = [
    sample({ id: "default", name: "Zsh", isDefault: true }),
    sample({ id: "fish", name: "Fish", isDefault: false }),
  ];
  expect(paneProfileLabel("fish", profiles)).toBe("Fish");
  expect(paneProfileLabel(null, profiles)).toBe("Zsh");
  expect(paneProfileLabel(null, [])).toBe("System shell");
});
```

- [ ] **Step 2: Implement the label helper**

Add:

```ts
export function paneProfileLabel(
  profileId: string | null | undefined,
  profiles: ProfileRecord[],
): string {
  return resolvePaneProfile(profileId, profiles)?.name ?? "System shell";
}
```

- [ ] **Step 3: Write the pane-context component test**

Render the component with two profiles, open its context menu, and assert:

```ts
expect(screen.getByRole("menuitem", { name: "Split right" })).toBeVisible();
expect(screen.getByRole("menuitem", { name: "Split down" })).toBeVisible();
expect(screen.getByRole("menuitem", { name: "Rename terminal…" })).toBeVisible();
expect(screen.getByText("Global default — Zsh")).toBeVisible();
expect(screen.getByText("Fish")).toBeVisible();
```

Choose Fish and assert `onSelectProfile("fish")`; choose Global default and assert `onSelectProfile(null)`.

- [ ] **Step 4: Create the pane context menu**

Create `PaneContextMenu` using the owned primitives. Its public props are:

```ts
export type PaneContextMenuProps = {
  children: ReactNode;
  profiles: ProfileRecord[];
  selectedProfileId: string | null;
  onSplit: (direction: "row" | "column") => void;
  onToggleFocus: () => void;
  onRename: () => void;
  onSelectProfile: (profileId: string | null) => void;
  onClose: () => void;
};
```

Use `ContextMenuSub` plus `ContextMenuRadioGroup` for profiles:

```tsx
<ContextMenuSub>
  <ContextMenuSubTrigger>Profile</ContextMenuSubTrigger>
  <ContextMenuSubContent className="min-w-48">
    <ContextMenuRadioGroup value={selectedProfileId ?? ""}>
      <ContextMenuRadioItem value="" onSelect={() => onSelectProfile(null)}>
        Global default — {paneProfileLabel(null, profiles)}
      </ContextMenuRadioItem>
      {profiles.map((profile) => (
        <ContextMenuRadioItem
          key={profile.id}
          value={profile.id}
          onSelect={() => onSelectProfile(profile.id)}
        >
          {profile.name}
        </ContextMenuRadioItem>
      ))}
    </ContextMenuRadioGroup>
  </ContextMenuSubContent>
</ContextMenuSub>
```

The menu order is Split Right, Split Down, Focus Mode, separator, Rename, Profile submenu, separator, Close Terminal. The close item uses `variant="destructive"` and the existing close request.

- [ ] **Step 5: Integrate profile state and pure pane mutations**

In `PaneTree`, read:

```ts
const profiles = useProfileStore((state) => state.profiles);
const toggleFocusMode = useSettingsStore((state) => state.toggleFocusMode);
```

Add callbacks:

```ts
const handleSelectProfile = (terminalId: string, profileId: string | null) => {
  const updated = setTerminalProfile(root, terminalId, profileId);
  if (updated.ok) onTreeChange(updated.value);
};

const handleSplit = (
  terminalId: string,
  direction: "row" | "column",
) => {
  const leaf = createTerminalLeaf(crypto.randomUUID(), { initialCwd: "" });
  const updated = splitPane(
    root,
    terminalId,
    direction,
    leaf,
    crypto.randomUUID(),
  );
  if (updated.ok) onTreeChange(updated.value);
};
```

Wrap each terminal leaf’s existing root element in `PaneContextMenu`. Reuse `openRenameDialog` and the existing close-request builder so visible controls and context actions remain equivalent.

- [ ] **Step 6: Show the profile label in the pane header**

Compute:

```ts
const profileLabel = paneProfileLabel(leaf.profileId, profiles);
```

Render after `TerminalStatus`:

```tsx
<span
  data-testid={`pane-profile-${leaf.id}`}
  className="max-w-28 shrink-0 truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
  title={`Profile: ${profileLabel}`}
>
  {profileLabel}
</span>
```

Do not pass the label through terminal runtime state.

- [ ] **Step 7: Prove a profile change preserves runtime identity**

Extend `paneIdentity.test.tsx`:

```ts
const before = registry.acquire("keep");
const updated = setTerminalProfile(root, "keep", "fish");
expect(updated.ok).toBe(true);
expect(registry.acquire("keep")).toBe(before);
expect(adapters.get("keep")?.disposeCalls).toBe(0);
```

Add PaneTree assertions that choosing Fish updates `profileId`, shows `Fish`, and does not call PTY close/restart.

- [ ] **Step 8: Verify pane interactions**

Run:

```bash
pnpm test:run src/features/panes src/features/profiles
pnpm check
```

Expected: all tests pass; profile selection only changes the persisted tree.

- [ ] **Step 9: Commit pane context/profile UI**

```bash
git add src/features/panes src/features/profiles/profileModel.ts
git commit -m "feat(panes): add profile and context actions"
```

### Task 5: Wire supported OSC notifications to attention

**Files:**
- Modify: `src/features/terminal/activity.ts`
- Modify: `src/features/terminal/activity.test.ts`
- Modify: `src/features/terminal/osc.ts`
- Modify: `src/features/terminal/osc.test.ts`
- Modify: `src/features/terminal/runtime/types.ts`
- Modify: `src/features/terminal/runtime/TerminalRuntime.ts`
- Modify: `src/features/terminal/runtime/TerminalRuntimeRegistry.test.ts`
- Modify: `src/features/terminal/createXtermAdapter.ts`
- Modify: `src/features/terminal/TerminalHost.tsx`
- Modify: `src/features/terminal/TerminalHost.test.tsx`

**Interfaces:**
- Produces: `isSupportedOscNotification(code: 9 | 777, data: string) -> boolean`
- Adds: `TerminalAdapter.setOnAttention(handler)`
- Adds: `TerminalRuntimeHandle.setOnAttention(handler)`

- [ ] **Step 1: Write OSC boundary tests**

Add:

```ts
describe("OSC notifications", () => {
  it("accepts bounded OSC 9 and OSC 777 notify payloads", () => {
    expect(isSupportedOscNotification(9, "Build finished")).toBe(true);
    expect(isSupportedOscNotification(777, "notify;Build;Finished")).toBe(true);
  });

  it("rejects empty, control-character, oversized, and unsupported 777 payloads", () => {
    expect(isSupportedOscNotification(9, "")).toBe(false);
    expect(isSupportedOscNotification(9, "bad\u0000payload")).toBe(false);
    expect(isSupportedOscNotification(9, "x".repeat(513))).toBe(false);
    expect(isSupportedOscNotification(777, "other;value")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the OSC test and verify the parser is absent**

Run:

```bash
pnpm test:run src/features/terminal/osc.test.ts
```

Expected: FAIL because `isSupportedOscNotification` does not exist.

- [ ] **Step 3: Implement bounded validation**

Add:

```ts
const MAX_OSC_NOTIFICATION_LENGTH = 512;

function validNotificationText(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_OSC_NOTIFICATION_LENGTH &&
    !Array.from(value).some((char) => {
      const code = char.charCodeAt(0);
      return code < 0x20 && char !== "\t";
    })
  );
}

export function isSupportedOscNotification(
  code: 9 | 777,
  data: string,
): boolean {
  if (code === 9) return validNotificationText(data);
  const [kind, ...parts] = data.split(";");
  return kind === "notify" && validNotificationText(parts.join(";"));
}
```

- [ ] **Step 4: Make focus clear explicit attention**

Add the attention reset to `createActivityTracker`’s existing focus transition:

```ts
setFocused: (focused) => {
  if (disposed) return;
  state = {
    ...state,
    focused,
    unread: focused ? false : state.unread,
    attention: focused ? false : state.attention,
  };
  emit();
},
```

Add:

```ts
it("clears explicit attention when the pane receives focus", () => {
  const tracker = createActivityTracker();
  tracker.noteAttention();
  expect(tracker.getState().attention).toBe(true);

  tracker.setFocused(true);

  expect(tracker.getState().attention).toBe(false);
});
```

- [ ] **Step 5: Extend runtime callback types**

Add the optional adapter setter and required runtime method:

```ts
setOnAttention?: (handler: () => void) => void;
```

```ts
setOnAttention: (handler: () => void) => void;
```

Implement in `TerminalRuntime` exactly like `setOnBell`, delegating to the adapter without storing attention in the runtime.

- [ ] **Step 6: Register xterm OSC handlers**

Add `onAttentionHandler` to adapter hooks and mutable handler state. During terminal creation register:

```ts
disposables.push(
  term.parser.registerOscHandler(9, (data) => {
    if (isSupportedOscNotification(9, data)) {
      onAttentionHandler?.();
    }
    return true;
  }),
);
disposables.push(
  term.parser.registerOscHandler(777, (data) => {
    if (isSupportedOscNotification(777, data)) {
      onAttentionHandler?.();
    }
    return true;
  }),
);
```

Return:

```ts
setOnAttention(handler: () => void) {
  onAttentionHandler = handler;
},
```

- [ ] **Step 7: Connect TerminalHost to the existing tracker**

After the bell handler:

```ts
runtime.setOnAttention(() => {
  tracker.noteAttention();
});
```

Update fake runtime adapters/handles in tests to store and invoke `attentionHandler`.

- [ ] **Step 8: Write the live projection regression test**

In `TerminalHost.test.tsx`, render an unfocused terminal, invoke the fake adapter’s attention handler, advance the metadata throttle, and assert:

```ts
expect(useTerminalStore.getState().sessions.t1?.attention).toBe(true);
expect(screen.getByLabelText("Terminal needs attention")).toBeVisible();
```

Focus the pane and assert the existing focus rule clears attention.

- [ ] **Step 9: Verify OSC/runtime behavior**

Run:

```bash
pnpm test:run src/features/terminal
pnpm check
```

Expected: all terminal tests pass; OSC bytes never enter Zustand, only the boolean metadata projection does.

- [ ] **Step 10: Commit OSC attention**

```bash
git add src/features/terminal
git commit -m "feat(terminal): project OSC notifications to attention"
```

### Task 6: Run the interaction-completion phase gate

**Files:**
- Modify only defects found by the gate

**Interfaces:**
- Consumes: all outputs from Tasks 1-5
- Produces: a release-candidate interaction surface

- [ ] **Step 1: Run all automated tests**

```bash
pnpm test:run
pnpm check
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: every command exits 0.

- [ ] **Step 2: Verify context-menu accessibility in the browser test layer**

Run:

```bash
pnpm test:run src/features/projects src/features/workspaces src/features/panes
```

Expected: context menus open by context-menu keyboard/pointer events; disabled move bounds are exposed; destructive actions still route through confirmation.

- [ ] **Step 3: Verify runtime identity invariants repeatedly**

```bash
for run in 1 2 3 4 5; do
  pnpm test:run src/features/panes/paneIdentity.test.tsx src/features/workspaces/workspaceStability.test.tsx
done
```

Expected: all five runs pass with no runtime disposal during reorder, profile change, workspace switch, or context action.

- [ ] **Step 4: Commit only if gate repairs were required**

```bash
git add src src-tauri
git commit -m "fix: close interaction completion gate defects"
```

Skip this commit when the gate required no source changes.
