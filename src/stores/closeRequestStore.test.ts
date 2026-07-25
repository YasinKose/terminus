import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetCloseRequestStoreForTests,
  useCloseRequestStore,
} from "./closeRequestStore";
import { executeClose } from "./executeClose";
import { useTerminalStore } from "@/features/terminal/terminalStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { useProjectStore } from "@/features/projects/projectStore";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import type { PtyApi } from "@/lib/tauri/pty";

function mockWorkspaceApi(): WorkspaceApi {
  return {
    loadBootstrapState: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(async () => {}),
    renameProject: vi.fn(),
    ensureDefaultWorkspace: vi.fn(),
    setLastActiveWorkspace: vi.fn(),
    saveWorkspace: vi.fn(async (ws) => ws),
    saveTwoWorkspaces: vi.fn(
      async (a, b): Promise<[typeof a, typeof b]> => [a, b],
    ),
    deleteWorkspace: vi.fn(async () => {}),
  };
}

function mockPtyApi(): PtyApi {
  return {
    openPty: vi.fn(),
    writePty: vi.fn(),
    resizePty: vi.fn(),
    closePty: vi.fn(async () => {}),
    restartPty: vi.fn(),
    listPtyStates: vi.fn(),
  };
}

describe("closeRequestStore", () => {
  beforeEach(() => {
    resetCloseRequestStoreForTests();
    useTerminalStore.setState({ sessions: {} });
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: null });
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      bootstrapped: true,
    });
  });

  it("requestClose stores tagged union; cancel clears without side effects", () => {
    const ptyApi = mockPtyApi();
    useCloseRequestStore.getState().requestClose({
      kind: "terminal",
      sessionId: "t1",
      workspaceId: "w1",
      projectId: "p1",
      title: "Terminal",
      terminalCount: 1,
    });
    expect(useCloseRequestStore.getState().request?.kind).toBe("terminal");
    useCloseRequestStore.getState().cancel();
    expect(useCloseRequestStore.getState().request).toBeNull();
    expect(ptyApi.closePty).not.toHaveBeenCalled();
  });

  it("cancel never closes PTY or mutates SQLite", async () => {
    const api = mockWorkspaceApi();
    const ptyApi = mockPtyApi();
    useWorkspaceStore.getState().setApi(api);
    useProjectStore.getState().setApi(api);

    useCloseRequestStore.getState().requestClose({
      kind: "workspace",
      workspaceId: "w1",
      projectId: "p1",
      name: "W1",
      terminalCount: 2,
    });
    useCloseRequestStore.getState().cancel();

    expect(ptyApi.closePty).not.toHaveBeenCalled();
    expect(api.deleteWorkspace).not.toHaveBeenCalled();
    expect(api.saveWorkspace).not.toHaveBeenCalled();
    expect(api.removeProject).not.toHaveBeenCalled();
  });

  it("executeClose terminal closes PTY, removes pane, saves workspace", async () => {
    const api = mockWorkspaceApi();
    const ptyApi = mockPtyApi();
    const registry = { delete: vi.fn() };
    useWorkspaceStore.getState().setApi(api);
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

    await executeClose(
      {
        kind: "terminal",
        sessionId: "t1",
        workspaceId: "w1",
        projectId: "p1",
        title: "Terminal",
        terminalCount: 1,
      },
      { ptyApi, registry },
    );

    expect(ptyApi.closePty).toHaveBeenCalledWith("t1");
    expect(registry.delete).toHaveBeenCalledWith("t1");
    expect(api.saveWorkspace).toHaveBeenCalled();
    const saved = vi.mocked(api.saveWorkspace).mock.calls[0]![0]!;
    expect(saved.rootJson).toBeNull();
    expect(useCloseRequestStore.getState().request).toBeNull();
  });

  it("executeClose workspace deletes after closing terminals", async () => {
    const api = mockWorkspaceApi();
    const ptyApi = mockPtyApi();
    const registry = { delete: vi.fn() };
    useWorkspaceStore.getState().setApi(api);
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

    await executeClose(
      {
        kind: "workspace",
        workspaceId: "w1",
        projectId: "p1",
        name: "W1",
        terminalCount: 1,
      },
      { ptyApi, registry },
    );

    expect(ptyApi.closePty).toHaveBeenCalledWith("t1");
    expect(api.deleteWorkspace).toHaveBeenCalledWith("w1");
  });

  it("executeClose application sets allowExit and destroys window", async () => {
    const ptyApi = mockPtyApi();
    const registry = { delete: vi.fn(), disposeAll: vi.fn() };
    const destroyWindow = vi.fn(async () => {});
    useTerminalStore.getState().ensureSession("t1", "p1");

    await executeClose(
      {
        kind: "application",
        terminalCount: 1,
        projectCount: 1,
        workspaceCount: 1,
      },
      { ptyApi, registry, destroyWindow },
    );

    expect(ptyApi.closePty).toHaveBeenCalledWith("t1");
    expect(useCloseRequestStore.getState().allowExit).toBe(true);
    expect(destroyWindow).toHaveBeenCalled();
  });
});
