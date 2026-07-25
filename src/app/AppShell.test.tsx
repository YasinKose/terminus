import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { AppShell } from "@/app/AppShell";
import {
  setProjectStoreWorkspaceBridge,
  useProjectStore,
} from "@/features/projects/projectStore";
import { useUiStore } from "@/features/ui/uiStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { DialogApi } from "@/lib/tauri/dialog";
import type {
  ProjectRecord,
  WorkspaceRecord,
} from "@/lib/tauri/contracts";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";

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
      if (existing) {
        return existing;
      }
      const p = project(`p-${projects.length + 1}`, input.path);
      p.displayName = input.displayName ?? p.displayName;
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
  useProjectStore.getState().setApi(api);
  useWorkspaceStore.getState().setApi(api);
  setProjectStoreWorkspaceBridge(useWorkspaceStore.getState());
}

describe("App shell", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "term-leaf-1",
    });
  });

  it("opens a folder and shows the project shell", async () => {
    const api = createMockApi();
    resetStores(api);
    useProjectStore.getState().hydrate([]);
    const dialog: DialogApi = {
      openDirectory: vi.fn().mockResolvedValue("/Users/me/demo"),
    };
    const user = userEvent.setup();
    const { container } = render(
      <App dialogApi={dialog} autoBootstrap={false} />,
    );

    await user.click(screen.getByRole("button", { name: /open project/i }));

    await waitFor(() => {
      expect(within(container).getByText("demo")).toBeVisible();
    });
    expect(
      within(container).getByRole("tab", { name: /workspace 1/i }),
    ).toBeVisible();
    expect(dialog.openDirectory).toHaveBeenCalled();
  });

  it("selects existing project when path is a duplicate", async () => {
    const existing = project("p1", "/Users/me/demo", "ws1");
    const ws = workspace("ws1", "p1", "Workspace 1", 0);
    const api = createMockApi({ projects: [existing], workspaces: [ws] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const dialog: DialogApi = {
      openDirectory: vi.fn().mockResolvedValue("/Users/me/demo"),
    };
    const user = userEvent.setup();
    const { container } = render(
      <AppShell dialogApi={dialog} workspaceApi={api} />,
    );

    await user.click(
      within(container).getByRole("button", { name: /open project/i }),
    );

    await waitFor(() => {
      expect(useProjectStore.getState().projects).toHaveLength(1);
      expect(useProjectStore.getState().activeProjectId).toBe("p1");
    });
  });

  it("switches projects and restores last workspace", async () => {
    const p1 = project("p1", "/a", "w1");
    const p2 = project("p2", "/b", "w2");
    const w1 = workspace("w1", "p1", "Alpha", 0);
    const w2 = workspace("w2", "p2", "Beta", 0);
    const api = createMockApi({
      projects: [p1, p2],
      workspaces: [w1, w2],
    });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const user = userEvent.setup();
    const { container } = render(
      <AppShell
        dialogApi={{ openDirectory: async () => null }}
        workspaceApi={api}
      />,
    );

    expect(
      within(container).getByRole("tab", { name: "Alpha" }),
    ).toHaveAttribute("aria-selected", "true");

    await user.click(within(container).getByRole("button", { name: "b" }));

    await waitFor(() => {
      expect(useProjectStore.getState().activeProjectId).toBe("p2");
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2");
    });
    expect(
      within(container).getByRole("tab", { name: "Beta" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("creates Workspace 1 when project has no workspace", async () => {
    const p1 = project("p1", "/solo", null);
    const api = createMockApi({ projects: [p1], workspaces: [] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();

    await useProjectStore.getState().selectProject("p1");

    expect(useWorkspaceStore.getState().getWorkspace("ws-1")?.name).toBe(
      "Workspace 1",
    );
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-1");
  });

  it("collapses and expands the sidebar", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Main", 0);
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const user = userEvent.setup();
    const { container } = render(
      <AppShell
        dialogApi={{ openDirectory: async () => null }}
        workspaceApi={api}
      />,
    );

    expect(within(container).getByLabelText("Projects")).toBeVisible();
    await user.click(
      within(container).getByRole("button", { name: /hide sidebar/i }),
    );
    expect(within(container).queryByLabelText("Projects")).toBeNull();
    await user.click(
      within(container).getByRole("button", { name: /show sidebar/i }),
    );
    expect(within(container).getByLabelText("Projects")).toBeVisible();
  });

  it("renames a workspace on double-click", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Main", 0);
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    vi.spyOn(window, "prompt").mockReturnValue("Renamed");
    const user = userEvent.setup();
    const { container } = render(
      <AppShell
        dialogApi={{ openDirectory: async () => null }}
        workspaceApi={api}
      />,
    );

    await user.dblClick(
      within(container).getByRole("tab", { name: "Main" }),
    );

    await waitFor(() => {
      expect(useWorkspaceStore.getState().getWorkspace("w1")?.name).toBe(
        "Renamed",
      );
    });
  });

  it("keeps inactive initialized workspaces mounted but hidden", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "One", 0);
    const w2 = workspace("w2", "p1", "Two", 1);
    const api = createMockApi({ projects: [p1], workspaces: [w1, w2] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");
    await useWorkspaceStore.getState().activateWorkspace("w1");
    await useWorkspaceStore.getState().activateWorkspace("w2");
    useWorkspaceStore.setState({ activeWorkspaceId: "w2" });

    const { container } = render(
      <AppShell
        dialogApi={{ openDirectory: async () => null }}
        workspaceApi={api}
      />,
    );

    const nodes = container.querySelectorAll("[data-workspace-id]");
    expect(nodes.length).toBe(2);
    expect(
      container.querySelector('[data-workspace-id="w1"]'),
    ).toHaveAttribute("data-visible", "false");
    expect(
      container.querySelector('[data-workspace-id="w2"]'),
    ).toHaveAttribute("data-visible", "true");
  });

  it("seeds a default terminal leaf for empty workspace root", async () => {
    const p1 = project("p1", "/a", "w1");
    const w1 = workspace("w1", "p1", "Empty", 0);
    const api = createMockApi({ projects: [p1], workspaces: [w1] });
    resetStores(api);
    await useProjectStore.getState().bootstrap();
    await useProjectStore.getState().selectProject("p1");

    const { container } = render(
      <AppShell
        dialogApi={{ openDirectory: async () => null }}
        workspaceApi={api}
      />,
    );

    await waitFor(() => {
      const saved = useWorkspaceStore.getState().getWorkspace("w1");
      expect(saved?.rootJson).toContain("term-leaf-1");
    });
    expect(
      within(container).getByTestId("terminal-term-leaf-1"),
    ).toBeVisible();
  });
});
