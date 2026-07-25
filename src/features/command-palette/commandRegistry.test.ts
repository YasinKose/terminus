import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  setProjectStoreWorkspaceBridge,
  useProjectStore,
} from "@/features/projects/projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type {
  ProjectRecord,
  WorkspaceRecord,
} from "@/lib/tauri/contracts";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import { buildCommands, filterCommands } from "./commandRegistry";
import { useCommandActions } from "./useCommandActions";

const ctx = {
  openSettings: vi.fn(),
  toggleSidebar: vi.fn(),
  toggleFocus: vi.fn(),
  toggleGitPanel: vi.fn(),
  toggleSnippetsPanel: vi.fn(),
  toggleTasksPanel: vi.fn(),
  openPalette: vi.fn(),
  newWorkspace: vi.fn(),
  newTerminal: vi.fn(),
  splitHorizontal: vi.fn(),
  splitVertical: vi.fn(),
  closePane: vi.fn(),
  nextWorkspace: vi.fn(),
  prevWorkspace: vi.fn(),
  selectProject: vi.fn(),
  selectWorkspace: vi.fn(),
  projects: [{ id: "p1", displayName: "Terminus" }],
  workspaces: [{ id: "w1", name: "Workspace 1", projectId: "p1" }],
  activeProjectId: "p1",
};

describe("commandRegistry", () => {
  it("includes core and navigation commands", () => {
    const cmds = buildCommands(ctx);
    expect(cmds.some((c) => c.id === "newTerminal")).toBe(true);
    expect(cmds.some((c) => c.id === "project:p1")).toBe(true);
    expect(cmds.some((c) => c.id === "workspace:w1")).toBe(true);
  });

  it("filters by label", () => {
    const cmds = buildCommands(ctx);
    const filtered = filterCommands(cmds, "sidebar");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("toggleSidebar");
  });

  it("runs command functions", async () => {
    const cmds = buildCommands(ctx);
    const settings = cmds.find((c) => c.id === "openSettings");
    await settings?.run();
    expect(ctx.openSettings).toHaveBeenCalled();
  });
});

function project(): ProjectRecord {
  return {
    id: "p1",
    canonicalPath: "/tmp/p1",
    displayName: "Terminus",
    color: "#fff",
    lastActiveWorkspaceId: "w1",
    createdAt: 1,
    updatedAt: 1,
  };
}

function workspace(id: string, name: string, position: number): WorkspaceRecord {
  return {
    id,
    projectId: "p1",
    name,
    rootJson: null,
    activePaneId: null,
    position,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createWorkspaceApi(
  projectRecord: ProjectRecord,
  workspaceRecords: WorkspaceRecord[],
): WorkspaceApi {
  return {
    loadBootstrapState: vi.fn(async () => ({
      projects: [projectRecord],
      workspaces: workspaceRecords,
      profiles: [],
      settings: {},
    })),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    renameProject: vi.fn(),
    ensureDefaultWorkspace: vi.fn(),
    setLastActiveWorkspace: vi.fn(async (_projectId, workspaceId) => ({
      ...projectRecord,
      lastActiveWorkspaceId: workspaceId,
    })),
    saveWorkspace: vi.fn(async (record) => record),
    saveTwoWorkspaces: vi.fn(),
    deleteWorkspace: vi.fn(),
  };
}

describe("useCommandActions workspace persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "w-new",
    });
  });

  function setup() {
    const p1 = project();
    const w1 = workspace("w1", "One", 0);
    const w2 = workspace("w2", "Two", 1);
    const api = createWorkspaceApi(p1, [w1, w2]);
    useProjectStore.setState({
      projects: [p1],
      activeProjectId: "p1",
      bootstrapped: true,
    });
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
    });
    useProjectStore.getState().setApi(api);
    useWorkspaceStore.getState().setApi(api);
    useWorkspaceStore.getState().hydrateFromBootstrap([w1, w2]);
    setProjectStoreWorkspaceBridge(useWorkspaceStore.getState());
    return { api };
  }

  it("persists a workspace created through the command action", async () => {
    const { api } = setup();
    await useWorkspaceStore.getState().activateWorkspace("w1");
    const persistSelection = vi.spyOn(api, "setLastActiveWorkspace");
    const { result } = renderHook(() =>
      useCommandActions({ setPaletteOpen: vi.fn() }),
    );

    await act(async () => {
      await result.current.newWorkspace();
    });

    expect(persistSelection).toHaveBeenCalledWith("p1", "w-new");
  });

  it("persists next and previous workspace commands", async () => {
    const { api } = setup();
    await useWorkspaceStore.getState().activateWorkspace("w1");
    const persistSelection = vi.spyOn(api, "setLastActiveWorkspace");
    const { result } = renderHook(() =>
      useCommandActions({ setPaletteOpen: vi.fn() }),
    );

    await act(async () => {
      await result.current.nextWorkspace();
    });
    expect(persistSelection).toHaveBeenCalledWith("p1", "w2");

    await act(async () => {
      await result.current.prevWorkspace();
    });
    expect(persistSelection).toHaveBeenCalledWith("p1", "w1");
  });
});
