import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/app/AppShell";
import {
  setProjectStoreWorkspaceBridge,
  useProjectStore,
} from "@/features/projects/projectStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useUiStore } from "@/features/ui/uiStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type {
  ProjectRecord,
  WorkspaceRecord,
} from "@/lib/tauri/contracts";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import { useRecoveryStore } from "@/features/settings/recoveryStore";
import type { RecoveryApi } from "@/lib/tauri/recovery";

vi.mock("@/features/terminal/TerminalPane", () => ({
  TerminalPane: ({ sessionId }: { sessionId: string }) => (
    <div data-testid={`terminal-${sessionId}`}>terminal:{sessionId}</div>
  ),
}));

function project(
  id: string,
  path: string,
  lastActiveWorkspaceId: string | null = null,
): ProjectRecord {
  return {
    id,
    canonicalPath: path,
    displayName: path.split("/").pop() ?? path,
    color: "#1DB954",
    lastActiveWorkspaceId,
    createdAt: 1,
    updatedAt: 1,
  };
}

function workspace(
  id: string,
  projectId: string,
  name: string,
  position: number,
  overrides?: Partial<WorkspaceRecord>,
): WorkspaceRecord {
  return {
    id,
    projectId,
    name,
    rootJson: null,
    activePaneId: null,
    position,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function createMockApi(seed?: {
  projects?: ProjectRecord[];
  workspaces?: WorkspaceRecord[];
}): WorkspaceApi {
  let projects = seed?.projects ? [...seed.projects] : [];
  let workspaces = seed?.workspaces ? [...seed.workspaces] : [];

  return {
    loadBootstrapState: async () => ({
      projects: [...projects],
      workspaces: [...workspaces],
      profiles: [],
      settings: {},
    }),
    addProject: async (input) => {
      const existing = projects.find((p) => p.canonicalPath === input.path);
      if (existing) return existing;
      const n = projects.length + 1;
      const p = project(`p-${n}`, input.path);
      projects = [...projects, p];
      return p;
    },
    removeProject: async (projectId) => {
      projects = projects.filter((p) => p.id !== projectId);
      workspaces = workspaces.filter((w) => w.projectId !== projectId);
    },
    renameProject: async (projectId, displayName) => {
      const next = projects
        .map((p) => (p.id === projectId ? { ...p, displayName } : p))
        .find((p) => p.id === projectId)!;
      projects = projects.map((p) => (p.id === projectId ? next : p));
      return next;
    },
    ensureDefaultWorkspace: async (projectId) => {
      const found = workspaces.find((w) => w.projectId === projectId);
      if (found) return found;
      const ws = workspace("ws-1", projectId, "Workspace 1", 0);
      workspaces = [...workspaces, ws];
      return ws;
    },
    setLastActiveWorkspace: async (projectId, workspaceId) => {
      projects = projects.map((p) =>
        p.id === projectId
          ? { ...p, lastActiveWorkspaceId: workspaceId }
          : p,
      );
      return projects.find((p) => p.id === projectId)!;
    },
    saveWorkspace: async (ws) => {
      const exists = workspaces.some((w) => w.id === ws.id);
      workspaces = exists
        ? workspaces.map((w) => (w.id === ws.id ? ws : w))
        : [...workspaces, ws];
      return ws;
    },
    saveTwoWorkspaces: async (first, second) => {
      for (const ws of [first, second]) {
        const exists = workspaces.some((w) => w.id === ws.id);
        workspaces = exists
          ? workspaces.map((w) => (w.id === ws.id ? ws : w))
          : [...workspaces, ws];
      }
      return [first, second];
    },
    deleteWorkspace: async (workspaceId) => {
      workspaces = workspaces.filter((w) => w.id !== workspaceId);
    },
  };
}

function recoveryFromWorkspaceApi(api: WorkspaceApi): RecoveryApi {
  return {
    bootstrapApp: async () => ({
      status: "ready",
      state: await api.loadBootstrapState(),
    }),
    retryBootstrap: async () => ({
      status: "ready",
      state: await api.loadBootstrapState(),
    }),
    backupDatabase: async () => ({
      backupPath: "/tmp/mock.backup",
      backupAvailable: true,
    }),
    resetDatabase: async () => ({
      status: "ready",
      state: await api.loadBootstrapState(),
    }),
    revealDatabaseDir: async () => {},
    recoveryStatus: async () => ({
      error: "",
      databasePath: "/tmp/terminus.db",
      backupAvailable: false,
    }),
  };
}

function resetStores(api: WorkspaceApi) {
  useProjectStore.setState({
    projects: [],
    activeProjectId: null,
    bootstrapped: false,
  });
  useWorkspaceStore.setState({
    workspaces: [],
    activeWorkspaceId: null,
  });
  useUiStore.setState({ sidebarCollapsed: false });
  useSettingsStore.setState({ settingsOpen: false, focusMode: false });
  useRecoveryStore.setState({
    status: { kind: "idle" },
    busy: false,
    forceConfirmOpen: false,
    lastMessage: null,
  });
  useProjectStore.getState().setApi(api);
  useWorkspaceStore.getState().setApi(api);
  useRecoveryStore.getState().setApi(recoveryFromWorkspaceApi(api));
  setProjectStoreWorkspaceBridge(useWorkspaceStore.getState());
}

function renderShell(api: WorkspaceApi) {
  return render(
    <AppShell
      dialogApi={{ openDirectory: async () => null }}
      workspaceApi={api}
    />,
  );
}

describe("chrome toolbar discoverability", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "term-leaf-new",
    });
  });

  it("exposes titlebar settings and command palette buttons", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Main", 0);
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const user = userEvent.setup();
    const { container } = renderShell(api);

    expect(
      within(container).getByTestId("titlebar-settings"),
    ).toBeInTheDocument();
    expect(
      within(container).getByTestId("titlebar-command-palette"),
    ).toBeInTheDocument();

    await user.click(within(container).getByTestId("titlebar-settings"));
    expect(useSettingsStore.getState().settingsOpen).toBe(true);
  });

  it("shows the active project and workspace with terminal actions in the titlebar", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Main", 0);
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const { container } = renderShell(api);

    const titlebar = within(container).getByRole("banner");
    expect(within(titlebar).getByTestId("titlebar-context")).toHaveTextContent(
      "aMain",
    );

    const toolbar = within(titlebar).getByTestId("workspace-action-toolbar");
    expect(
      within(toolbar).getByTestId("workspace-action-new-terminal"),
    ).toBeEnabled();
    expect(
      within(toolbar).getByTestId("workspace-action-split-h"),
    ).toBeEnabled();
    expect(
      within(toolbar).getByTestId("workspace-action-split-v"),
    ).toBeEnabled();
  });

  it("creates a split when new terminal toolbar action is clicked", async () => {
    const leaf = {
      type: "terminal" as const,
      id: "t1",
      profileId: null,
      titleOverride: null,
      initialCwd: "",
    };
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Main", 0, {
      rootJson: JSON.stringify(leaf),
      activePaneId: "t1",
    });
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const user = userEvent.setup();
    const { container } = renderShell(api);

    await user.click(
      within(container).getByTestId("workspace-action-new-terminal"),
    );

    await waitFor(() => {
      const ws = useWorkspaceStore.getState().getWorkspace("w1");
      expect(ws?.rootJson).toBeTruthy();
      const root = JSON.parse(ws!.rootJson!) as { type: string };
      expect(root.type).toBe("split");
    });
  });

  it("offers titlebar actions from the compact overflow menu", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Main", 0);
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const { container } = renderShell(api);
    fireEvent.pointerDown(
      within(container).getByTestId("titlebar-overflow-menu"),
      { button: 0, ctrlKey: false },
    );

    expect(
      await screen.findByRole("menuitem", { name: "New terminal" }),
    ).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Show git panel" }),
    ).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Command palette" }),
    ).toBeVisible();
  });
});
