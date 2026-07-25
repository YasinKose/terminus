import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BootstrapState,
  ProjectRecord,
  WorkspaceRecord,
} from "@/lib/tauri/contracts";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import {
  setProjectStoreWorkspaceBridge,
  useProjectStore,
} from "./projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";

function project(
  partial: Partial<ProjectRecord> & Pick<ProjectRecord, "id" | "canonicalPath">,
): ProjectRecord {
  return {
    displayName: partial.displayName ?? "Demo",
    color: partial.color ?? "#fff",
    lastActiveWorkspaceId: partial.lastActiveWorkspaceId ?? null,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt ?? 1,
    ...partial,
  };
}

function workspace(
  partial: Partial<WorkspaceRecord> &
    Pick<WorkspaceRecord, "id" | "projectId" | "name">,
): WorkspaceRecord {
  return {
    rootJson: partial.rootJson ?? null,
    activePaneId: partial.activePaneId ?? null,
    position: partial.position ?? 0,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt ?? 1,
    ...partial,
  };
}

function createMockApi(seed?: {
  projects?: ProjectRecord[];
  workspaces?: WorkspaceRecord[];
}): WorkspaceApi & {
  projects: ProjectRecord[];
  workspaces: WorkspaceRecord[];
} {
  const projects = [...(seed?.projects ?? [])];
  const workspaces = [...(seed?.workspaces ?? [])];

  const api: WorkspaceApi & {
    projects: ProjectRecord[];
    workspaces: WorkspaceRecord[];
  } = {
    projects,
    workspaces,
    loadBootstrapState: vi.fn(async (): Promise<BootstrapState> => ({
      projects: [...projects],
      workspaces: [...workspaces],
      profiles: [],
      settings: {},
    })),
    addProject: vi.fn(async ({ path, displayName, color }) => {
      const canonical = path;
      const existing = projects.find((p) => p.canonicalPath === canonical);
      if (existing) return existing;
      const record = project({
        id: `p-${projects.length + 1}`,
        canonicalPath: canonical,
        displayName: displayName ?? "Demo",
        color: color ?? "#1DB954",
      });
      projects.push(record);
      return record;
    }),
    removeProject: vi.fn(async (projectId) => {
      const idx = projects.findIndex((p) => p.id === projectId);
      if (idx >= 0) projects.splice(idx, 1);
      for (let i = workspaces.length - 1; i >= 0; i--) {
        if (workspaces[i]!.projectId === projectId) workspaces.splice(i, 1);
      }
    }),
    renameProject: vi.fn(async (projectId, displayName) => {
      const idx = projects.findIndex((p) => p.id === projectId);
      if (idx < 0) throw new Error("missing");
      projects[idx] = { ...projects[idx]!, displayName };
      return projects[idx]!;
    }),
    ensureDefaultWorkspace: vi.fn(async (projectId) => {
      const existing = workspaces.find((w) => w.projectId === projectId);
      if (existing) return existing;
      const record = workspace({
        id: `w-${workspaces.length + 1}`,
        projectId,
        name: "Workspace 1",
      });
      workspaces.push(record);
      return record;
    }),
    setLastActiveWorkspace: vi.fn(async (projectId, workspaceId) => {
      const idx = projects.findIndex((p) => p.id === projectId);
      if (idx < 0) throw new Error("missing project");
      projects[idx] = {
        ...projects[idx]!,
        lastActiveWorkspaceId: workspaceId,
      };
      return projects[idx]!;
    }),
    saveWorkspace: vi.fn(async (ws) => {
      const idx = workspaces.findIndex((w) => w.id === ws.id);
      if (idx >= 0) workspaces[idx] = ws;
      else workspaces.push(ws);
      return ws;
    }),
    saveTwoWorkspaces: vi.fn(async (first, second) => {
      for (const ws of [first, second]) {
        const idx = workspaces.findIndex((w) => w.id === ws.id);
        if (idx >= 0) workspaces[idx] = ws;
        else workspaces.push(ws);
      }
      return [first, second] as [typeof first, typeof second];
    }),
    deleteWorkspace: vi.fn(async (workspaceId) => {
      const idx = workspaces.findIndex((w) => w.id === workspaceId);
      if (idx >= 0) workspaces.splice(idx, 1);
    }),
  };
  return api;
}

describe("projectStore", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      bootstrapped: false,
    });
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
    });
    setProjectStoreWorkspaceBridge(useWorkspaceStore.getState());
  });

  it("duplicate canonical project selects the existing project", async () => {
    const existing = project({
      id: "p1",
      canonicalPath: "/tmp/demo",
      displayName: "Existing",
    });
    const api = createMockApi({ projects: [existing] });
    useProjectStore.getState().setApi(api);
    useWorkspaceStore.getState().setApi(api);
    useProjectStore.getState().hydrate([existing]);

    const result = await useProjectStore
      .getState()
      .addProject({ path: "/tmp/demo" });

    expect(result.id).toBe("p1");
    expect(api.addProject).toHaveBeenCalledTimes(1);
    expect(useProjectStore.getState().projects).toHaveLength(1);
    expect(useProjectStore.getState().activeProjectId).toBe("p1");
  });

  it("selecting project selects its last workspace", async () => {
    const p = project({
      id: "p1",
      canonicalPath: "/tmp/a",
      lastActiveWorkspaceId: "w2",
    });
    const w1 = workspace({ id: "w1", projectId: "p1", name: "One", position: 0 });
    const w2 = workspace({ id: "w2", projectId: "p1", name: "Two", position: 1 });
    const api = createMockApi({ projects: [p], workspaces: [w1, w2] });
    useProjectStore.getState().setApi(api);
    useWorkspaceStore.getState().setApi(api);
    useProjectStore.getState().hydrate([p]);
    useWorkspaceStore.getState().hydrateFromBootstrap([w1, w2]);
    setProjectStoreWorkspaceBridge(useWorkspaceStore.getState());

    await useProjectStore.getState().selectProject("p1");

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2");
    expect(
      useWorkspaceStore.getState().getWorkspace("w2")?.initialized,
    ).toBe(true);
    expect(
      useWorkspaceStore.getState().getWorkspace("w1")?.initialized,
    ).toBe(false);
  });

  it("selecting project with no workspace creates Workspace 1", async () => {
    const p = project({ id: "p1", canonicalPath: "/tmp/a" });
    const api = createMockApi({ projects: [p], workspaces: [] });
    useProjectStore.getState().setApi(api);
    useWorkspaceStore.getState().setApi(api);
    useProjectStore.getState().hydrate([p]);
    setProjectStoreWorkspaceBridge(useWorkspaceStore.getState());

    await useProjectStore.getState().selectProject("p1");

    expect(api.ensureDefaultWorkspace).toHaveBeenCalledWith("p1");
    const ws = useWorkspaceStore.getState().listForProject("p1");
    expect(ws).toHaveLength(1);
    expect(ws[0]!.name).toBe("Workspace 1");
    expect(ws[0]!.initialized).toBe(true);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(ws[0]!.id);
  });

  it("removing project changes local state only after backend success", async () => {
    const p = project({ id: "p1", canonicalPath: "/tmp/a" });
    const api = createMockApi({ projects: [p] });
    let reject = true;
    api.removeProject = vi.fn(async () => {
      if (reject) throw new Error("backend failed");
    });
    useProjectStore.getState().setApi(api);
    useWorkspaceStore.getState().setApi(api);
    useProjectStore.getState().hydrate([p]);
    useProjectStore.setState({ activeProjectId: "p1" });

    await expect(
      useProjectStore.getState().removeProject("p1"),
    ).rejects.toThrow("backend failed");
    expect(useProjectStore.getState().projects).toHaveLength(1);

    reject = false;
    await useProjectStore.getState().removeProject("p1");
    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(useProjectStore.getState().activeProjectId).toBeNull();
  });
});
