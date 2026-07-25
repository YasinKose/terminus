import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceRecord } from "@/lib/tauri/contracts";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import { useWorkspaceStore } from "./workspaceStore";

function workspace(
  partial: Partial<WorkspaceRecord> &
    Pick<WorkspaceRecord, "id" | "projectId" | "name">,
): WorkspaceRecord {
  return {
    rootJson: null,
    activePaneId: null,
    position: 0,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("workspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
    });
  });

  it("active workspace starts immediately; inactive remain uninitialized", async () => {
    const w1 = workspace({ id: "w1", projectId: "p1", name: "A", position: 0 });
    const w2 = workspace({ id: "w2", projectId: "p1", name: "B", position: 1 });
    useWorkspaceStore.getState().hydrateFromBootstrap([w1, w2]);

    await useWorkspaceStore.getState().activateWorkspace("w1");

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w1");
    expect(useWorkspaceStore.getState().getWorkspace("w1")?.initialized).toBe(
      true,
    );
    expect(useWorkspaceStore.getState().getWorkspace("w2")?.initialized).toBe(
      false,
    );
  });

  it("first activation marks an inactive workspace initialized", async () => {
    const w1 = workspace({ id: "w1", projectId: "p1", name: "A" });
    const w2 = workspace({ id: "w2", projectId: "p1", name: "B" });
    useWorkspaceStore.getState().hydrateFromBootstrap([w1, w2]);
    await useWorkspaceStore.getState().activateWorkspace("w1");
    await useWorkspaceStore.getState().activateWorkspace("w2");

    expect(useWorkspaceStore.getState().getWorkspace("w1")?.initialized).toBe(
      true,
    );
    expect(useWorkspaceStore.getState().getWorkspace("w2")?.initialized).toBe(
      true,
    );
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2");
  });

  it("saveWorkspace persists via api and keeps initialized flag", async () => {
    const w1 = workspace({ id: "w1", projectId: "p1", name: "A" });
    const api: WorkspaceApi = {
      loadBootstrapState: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      renameProject: vi.fn(),
      ensureDefaultWorkspace: vi.fn(),
      setLastActiveWorkspace: vi.fn(),
      saveWorkspace: vi.fn(async (ws) => ({ ...ws, name: "Saved" })),
      saveTwoWorkspaces: vi.fn(
        async (a, b): Promise<[typeof a, typeof b]> => [a, b],
      ),
    };
    useWorkspaceStore.getState().setApi(api);
    useWorkspaceStore.getState().hydrateFromBootstrap([w1]);
    await useWorkspaceStore.getState().activateWorkspace("w1");

    const saved = await useWorkspaceStore.getState().saveWorkspace({
      ...w1,
      name: "Saved",
    });

    expect(saved.name).toBe("Saved");
    expect(saved.initialized).toBe(true);
    expect(api.saveWorkspace).toHaveBeenCalled();
  });
});
