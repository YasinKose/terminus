import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TerminalRuntimeRegistry } from "@/features/terminal/runtime/TerminalRuntimeRegistry";
import { resetParkingContainerForTests } from "@/features/terminal/runtime/parking";
import type { TerminalAdapter } from "@/features/terminal/runtime/types";
import { useWorkspaceStore } from "./workspaceStore";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import type { WorkspaceRecord } from "@/lib/tauri/contracts";

type FakeAdapter = TerminalAdapter & {
  openCalls: number;
  disposeCalls: number;
};

function createFakeAdapterFactory() {
  const adapters = new Map<string, FakeAdapter>();
  const factory = (sessionId: string): FakeAdapter => {
    const existing = adapters.get(sessionId);
    if (existing) return existing;
    const adapter: FakeAdapter = {
      openCalls: 0,
      disposeCalls: 0,
      open() {
        this.openCalls += 1;
      },
      write() {},
      focus() {},
      fit() {},
      dispose() {
        this.disposeCalls += 1;
      },
    };
    adapters.set(sessionId, adapter);
    return adapter;
  };
  return { factory, adapters };
}

function ws(
  id: string,
  projectId: string,
  rootJson: string | null,
  position = 0,
): WorkspaceRecord {
  return {
    id,
    projectId,
    name: id,
    rootJson,
    activePaneId: null,
    position,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("workspace stability invariants", () => {
  let registry: TerminalRuntimeRegistry;
  let adapters: Map<string, FakeAdapter>;
  let closePty: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = "";
    resetParkingContainerForTests();
    const fake = createFakeAdapterFactory();
    adapters = fake.adapters;
    registry = new TerminalRuntimeRegistry({
      createAdapter: fake.factory,
      document,
    });
    closePty = vi.fn().mockResolvedValue(undefined);

    const api: WorkspaceApi = {
      loadBootstrapState: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      renameProject: vi.fn(),
      ensureDefaultWorkspace: vi.fn(),
      setLastActiveWorkspace: vi.fn().mockResolvedValue(undefined),
      saveWorkspace: vi.fn(async (w) => w),
      saveTwoWorkspaces: vi.fn(
        async (a, b): Promise<[typeof a, typeof b]> => [a, b],
      ),
      deleteWorkspace: vi.fn(),
    };
    useWorkspaceStore.getState().setApi(api);
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
    });
  });

  afterEach(() => {
    registry.disposeAll();
    resetParkingContainerForTests();
    document.body.innerHTML = "";
  });

  it("unmount/hide (release) never disposes runtime or implies close", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const runtime = registry.acquire("term-a");
    runtime.attach(host);
    expect(adapters.get("term-a")!.openCalls).toBe(1);

    registry.release("term-a");
    expect(adapters.get("term-a")!.disposeCalls).toBe(0);
    expect(registry.has("term-a")).toBe(true);
    expect(runtime.lifecycle).toBe("parked");
    expect(closePty).not.toHaveBeenCalled();
  });

  it("workspace switch re-acquire preserves the same runtime id and object", async () => {
    const hostA = document.createElement("div");
    const hostB = document.createElement("div");
    document.body.appendChild(hostA);
    document.body.appendChild(hostB);

    const leaf = JSON.stringify({ type: "terminal", id: "term-a" });
    useWorkspaceStore.getState().hydrateFromBootstrap([
      ws("ws-1", "p1", leaf, 0),
      ws("ws-2", "p1", leaf, 1),
    ]);

    await useWorkspaceStore.getState().activateWorkspace("ws-1");
    const r1 = registry.acquire("term-a");
    r1.attach(hostA);

    await useWorkspaceStore.getState().activateWorkspace("ws-2");
    registry.release("term-a");
    const r2 = registry.acquire("term-a");
    r2.attach(hostB);

    expect(r2).toBe(r1);
    expect(r2.sessionId).toBe("term-a");
    expect(adapters.get("term-a")!.openCalls).toBe(1);
    expect(adapters.get("term-a")!.disposeCalls).toBe(0);
  });

  it("inactive workspaces stay initialized after first activation (lazy mount rule)", async () => {
    useWorkspaceStore.getState().hydrateFromBootstrap([
      ws("ws-1", "p1", null, 0),
      ws("ws-2", "p1", null, 1),
    ]);

    await useWorkspaceStore.getState().activateWorkspace("ws-1");
    expect(useWorkspaceStore.getState().getWorkspace("ws-1")!.initialized).toBe(
      true,
    );
    expect(useWorkspaceStore.getState().getWorkspace("ws-2")!.initialized).toBe(
      false,
    );

    await useWorkspaceStore.getState().activateWorkspace("ws-2");
    expect(useWorkspaceStore.getState().getWorkspace("ws-1")!.initialized).toBe(
      true,
    );
    expect(useWorkspaceStore.getState().getWorkspace("ws-2")!.initialized).toBe(
      true,
    );

    await useWorkspaceStore.getState().activateWorkspace("ws-1");
    expect(useWorkspaceStore.getState().getWorkspace("ws-2")!.initialized).toBe(
      true,
    );
  });
});
