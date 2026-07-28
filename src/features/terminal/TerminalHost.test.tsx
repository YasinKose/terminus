import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PtyApi, PtyEvent, PtyEventHandler } from "@/lib/tauri/pty";
import {
  TerminalRuntimeRegistry,
  resetParkingContainerForTests,
} from "@/features/terminal/runtime";
import type { TerminalAdapter } from "@/features/terminal/runtime";
import { TerminalHost } from "./TerminalHost";
import { TerminalPane } from "./TerminalPane";
import {
  resetTerminalStoreForTests,
  useTerminalStore,
} from "./terminalStore";

type FakeAdapter = TerminalAdapter & {
  openCalls: number;
  disposeCalls: number;
  fitCalls: number;
  writeLog: string[];
  onDataHandler: ((data: string) => void) | null;
  proposedCols: number;
  proposedRows: number;
};

function createFakeAdapterFactory() {
  const adapters = new Map<string, FakeAdapter>();

  const factory = (sessionId: string): FakeAdapter => {
    const existing = adapters.get(sessionId);
    if (existing) return existing;

    const adapter: FakeAdapter = {
      openCalls: 0,
      disposeCalls: 0,
      fitCalls: 0,
      writeLog: [],
      onDataHandler: null,
      proposedCols: 80,
      proposedRows: 24,
      open() {
        this.openCalls += 1;
      },
      write(data: string) {
        this.writeLog.push(data);
      },
      focus() {},
      fit() {
        this.fitCalls += 1;
      },
      dispose() {
        this.disposeCalls += 1;
      },
      attachWebgl() {
        return false;
      },
      detachWebgl() {},
      setOnData(handler: (data: string) => void) {
        this.onDataHandler = handler;
      },
      setOnTitleChange() {},
      setOnBell() {},
      setOnCwdChange() {},
      getProposedSize() {
        return { cols: this.proposedCols, rows: this.proposedRows };
      },
    };
    adapters.set(sessionId, adapter);
    return adapter;
  };

  return { factory, adapters };
}

function createMockPtyApi() {
  const handlers = new Map<string, PtyEventHandler>();
  const openCalls: Array<{ request: unknown }> = [];
  const writeCalls: Array<{ sessionId: string; data: string }> = [];
  const resizeCalls: Array<{
    sessionId: string;
    rows: number;
    cols: number;
  }> = [];
  const closeCalls: string[] = [];
  const restartCalls: Array<{ request: unknown }> = [];

  const api: PtyApi = {
    openPty: async (request, onEvent) => {
      openCalls.push({ request });
      handlers.set(request.sessionId, onEvent);
      return {
        sessionId: request.sessionId,
        lifecycle: "running",
        cwd: "/tmp",
        cols: request.cols,
        rows: request.rows,
        foregroundProcessTitle: null,
      };
    },
    writePty: async (sessionId, data) => {
      writeCalls.push({ sessionId, data });
    },
    resizePty: async (sessionId, rows, cols) => {
      resizeCalls.push({ sessionId, rows, cols });
    },
    closePty: async (sessionId) => {
      closeCalls.push(sessionId);
    },
    restartPty: async (request, onEvent) => {
      restartCalls.push({ request });
      handlers.set(request.sessionId, onEvent);
      return {
        sessionId: request.sessionId,
        lifecycle: "running",
        cwd: "/tmp",
        cols: request.cols,
        rows: request.rows,
        foregroundProcessTitle: null,
      };
    },
    listPtyStates: async () => [],
    validateCwd: async (path) => (path.startsWith("/") ? path : null),
  };

  return {
    api,
    openCalls,
    writeCalls,
    resizeCalls,
    closeCalls,
    restartCalls,
    emit(sessionId: string, event: PtyEvent) {
      handlers.get(sessionId)?.(event);
    },
  };
}

describe("TerminalHost lifecycle", () => {
  let registry: TerminalRuntimeRegistry;
  let adapters: Map<string, FakeAdapter>;
  let pty: ReturnType<typeof createMockPtyApi>;

  beforeEach(() => {
    document.body.innerHTML = "";
    resetParkingContainerForTests();
    resetTerminalStoreForTests();
    const fake = createFakeAdapterFactory();
    adapters = fake.adapters;
    registry = new TerminalRuntimeRegistry({
      createAdapter: fake.factory,
      document,
    });
    pty = createMockPtyApi();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    registry.disposeAll();
    resetParkingContainerForTests();
    resetTerminalStoreForTests();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("mount acquires and attaches the runtime", async () => {
    render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => {
      expect(pty.openCalls).toHaveLength(1);
    });

    const runtime = registry.get("t1");
    expect(runtime).toBeDefined();
    expect(runtime?.lifecycle).toBe("attached");
    expect(adapters.get("t1")?.openCalls).toBe(1);
    expect(pty.openCalls[0]?.request).toMatchObject({
      sessionId: "t1",
      projectId: "p1",
      cols: 80,
      rows: 24,
    });
  });

  it("unmount detaches but does not close the PTY", async () => {
    const { unmount } = render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    unmount();

    expect(pty.closeCalls).toHaveLength(0);
    expect(registry.get("t1")?.lifecycle).toBe("parked");
    expect(adapters.get("t1")?.disposeCalls).toBe(0);
  });

  it("fit only runs when host dimensions are nonzero", async () => {
    const { container } = render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    const adapter = adapters.get("t1")!;
    const fitBefore = adapter.fitCalls;

    const host = container.querySelector(
      "[data-terminus-host]",
    ) as HTMLElement;
    Object.defineProperty(host, "clientWidth", {
      configurable: true,
      get: () => 0,
    });
    Object.defineProperty(host, "clientHeight", {
      configurable: true,
      get: () => 0,
    });

    act(() => {
      fireEvent(host, new Event("resize-request"));
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(adapter.fitCalls).toBe(fitBefore);

    Object.defineProperty(host, "clientWidth", {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(host, "clientHeight", {
      configurable: true,
      get: () => 400,
    });
    adapter.proposedCols = 100;
    adapter.proposedRows = 30;

    act(() => {
      fireEvent(host, new Event("resize-request"));
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(adapter.fitCalls).toBeGreaterThan(fitBefore);
  });

  it("user input calls write_pty", async () => {
    render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    const adapter = adapters.get("t1")!;
    act(() => {
      adapter.onDataHandler?.("hello");
    });

    await waitFor(() => {
      expect(pty.writeCalls).toEqual([{ sessionId: "t1", data: "hello" }]);
    });
  });

  it("resize is debounced and sends rows/cols", async () => {
    const { container } = render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    const host = container.querySelector(
      "[data-terminus-host]",
    ) as HTMLElement;
    Object.defineProperty(host, "clientWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(host, "clientHeight", {
      configurable: true,
      get: () => 600,
    });
    const adapter = adapters.get("t1")!;
    adapter.proposedCols = 120;
    adapter.proposedRows = 40;

    act(() => {
      fireEvent(host, new Event("resize-request"));
      fireEvent(host, new Event("resize-request"));
      fireEvent(host, new Event("resize-request"));
    });

    expect(pty.resizeCalls).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(pty.resizeCalls.length).toBeGreaterThanOrEqual(1);
    });
    const last = pty.resizeCalls[pty.resizeCalls.length - 1]!;
    expect(last.sessionId).toBe("t1");
    expect(last.rows).toBe(40);
    expect(last.cols).toBe(120);
  });

  it("output is written to the runtime, never stored in Zustand", async () => {
    render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    act(() => {
      pty.emit("t1", {
        event: "output",
        data: { sessionId: "t1", seq: 1, data: "stream-chunk" },
      });
    });

    expect(adapters.get("t1")?.writeLog).toContain("stream-chunk");
    const state = useTerminalStore.getState();
    expect(JSON.stringify(state)).not.toContain("stream-chunk");
  });

  it("projects foreground agent process changes into the terminal title", async () => {
    render(
      <TerminalHost
        sessionId="t1"
        projectId="p1"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    act(() => {
      pty.emit("t1", {
        event: "foregroundProcess",
        data: { sessionId: "t1", title: "Codex" },
      });
    });
    expect(useTerminalStore.getState().sessions.t1?.title).toBe("Codex");

    act(() => {
      pty.emit("t1", {
        event: "foregroundProcess",
        data: { sessionId: "t1", title: null },
      });
    });
    expect(useTerminalStore.getState().sessions.t1?.title).toBe("Terminal");
  });

  it("exited event retains the panel and exposes Restart", async () => {
    render(
      <TerminalPane
        sessionId="t1"
        projectId="p1"
        title="shell"
        registry={registry}
        ptyApi={pty.api}
        cols={80}
        rows={24}
      />,
    );

    await waitFor(() => expect(pty.openCalls).toHaveLength(1));

    act(() => {
      pty.emit("t1", {
        event: "exited",
        data: { sessionId: "t1", code: 0 },
      });
    });

    expect(screen.getByRole("button", { name: /restart/i })).toBeTruthy();
    expect(registry.get("t1")).toBeDefined();
    expect(pty.closeCalls).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /restart/i }));

    await waitFor(() => {
      expect(pty.restartCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
