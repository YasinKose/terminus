import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetParkingContainerForTests } from "./parking";
import { TerminalRuntimeRegistry } from "./TerminalRuntimeRegistry";
import type { TerminalAdapter } from "./types";

type FakeAdapter = TerminalAdapter & {
  openCalls: number;
  disposeCalls: number;
  writeLog: string[];
  webglAttached: boolean;
  parentWhenOpen: HTMLElement | null;
};

function createFakeAdapterFactory() {
  const adapters = new Map<string, FakeAdapter>();

  const factory = (sessionId: string): FakeAdapter => {
    const existing = adapters.get(sessionId);
    if (existing) {
      return existing;
    }

    const adapter: FakeAdapter = {
      openCalls: 0,
      disposeCalls: 0,
      writeLog: [],
      webglAttached: false,
      parentWhenOpen: null,
      open(parent: HTMLElement) {
        this.openCalls += 1;
        this.parentWhenOpen = parent;
      },
      write(data: string) {
        this.writeLog.push(data);
      },
      focus() {},
      fit() {},
      dispose() {
        this.disposeCalls += 1;
      },
      attachWebgl() {
        this.webglAttached = true;
        return true;
      },
      detachWebgl() {
        this.webglAttached = false;
      },
    };
    adapters.set(sessionId, adapter);
    return adapter;
  };

  return { factory, adapters };
}

describe("TerminalRuntimeRegistry", () => {
  let registry: TerminalRuntimeRegistry;
  let adapters: Map<string, FakeAdapter>;

  beforeEach(() => {
    document.body.innerHTML = "";
    resetParkingContainerForTests();
    const fake = createFakeAdapterFactory();
    adapters = fake.adapters;
    registry = new TerminalRuntimeRegistry({
      createAdapter: fake.factory,
      document,
    });
  });

  afterEach(() => {
    registry.disposeAll();
    resetParkingContainerForTests();
    document.body.innerHTML = "";
  });

  it("acquire same ID returns the same runtime", () => {
    const a = registry.acquire("t1");
    const b = registry.acquire("t1");
    expect(a).toBe(b);
    expect(a.sessionId).toBe("t1");
  });

  it("opens adapter once under StrictMode-style acquire/release/acquire", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const r1 = registry.acquire("t1");
    r1.attach(host);
    expect(adapters.get("t1")!.openCalls).toBe(1);

    registry.release("t1");
    expect(r1.lifecycle).toBe("parked");
    expect(adapters.get("t1")!.disposeCalls).toBe(0);
    expect(adapters.get("t1")!.openCalls).toBe(1);

    const r2 = registry.acquire("t1");
    expect(r2).toBe(r1);
    r2.attach(host);
    expect(adapters.get("t1")!.openCalls).toBe(1);
    expect(r2.lifecycle).toBe("attached");
  });

  it("moving between host elements reparents the same wrapper", () => {
    const hostA = document.createElement("div");
    const hostB = document.createElement("div");
    document.body.appendChild(hostA);
    document.body.appendChild(hostB);

    const r = registry.acquire("t1");
    r.attach(hostA);
    const wrapper = r.wrapper;
    expect(wrapper.parentElement).toBe(hostA);

    r.attach(hostB);
    expect(r.wrapper).toBe(wrapper);
    expect(wrapper.parentElement).toBe(hostB);
    expect(hostA.contains(wrapper)).toBe(false);
    expect(adapters.get("t1")!.openCalls).toBe(1);
  });

  it("detach parks the wrapper without disposing", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const r = registry.acquire("t1");
    r.attach(host);
    r.detach();

    expect(r.lifecycle).toBe("parked");
    expect(adapters.get("t1")!.disposeCalls).toBe(0);
    expect(r.wrapper.parentElement?.getAttribute("data-terminus-parking")).toBe(
      "true",
    );
    expect(host.contains(r.wrapper)).toBe(false);
  });

  it("explicit delete disposes once", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const r = registry.acquire("t1");
    r.attach(host);
    registry.delete("t1");

    expect(adapters.get("t1")!.disposeCalls).toBe(1);
    expect(r.lifecycle).toBe("disposed");
    expect(registry.has("t1")).toBe(false);

    registry.delete("t1");
    expect(adapters.get("t1")!.disposeCalls).toBe(1);
  });

  it("WebGL context loss falls back without disposing xterm", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const r = registry.acquire("t1");
    r.attach(host);
    expect(r.usingWebgl).toBe(true);
    expect(adapters.get("t1")!.webglAttached).toBe(true);

    r.handleWebglContextLoss();
    expect(r.usingWebgl).toBe(false);
    expect(adapters.get("t1")!.webglAttached).toBe(false);
    expect(adapters.get("t1")!.disposeCalls).toBe(0);
    expect(adapters.get("t1")!.openCalls).toBe(1);
    expect(r.lifecycle).toBe("attached");
  });

  it("WebGL attach failure falls back without dispose", () => {
    const factory = (_sessionId: string): TerminalAdapter => ({
      open: vi.fn(),
      write: vi.fn(),
      focus: vi.fn(),
      fit: vi.fn(),
      dispose: vi.fn(),
      attachWebgl: () => {
        throw new Error("webgl unavailable");
      },
      detachWebgl: vi.fn(),
    });
    const reg = new TerminalRuntimeRegistry({ createAdapter: factory, document });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = reg.acquire("w1");
    r.attach(host);
    expect(r.usingWebgl).toBe(false);
    expect(r.openCount).toBe(1);
    reg.disposeAll();
  });

  it("close of one runtime does not affect another", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const a = registry.acquire("a");
    const b = registry.acquire("b");
    a.attach(host);
    b.attach(host);

    a.write("hello-a");
    b.write("hello-b");
    registry.delete("a");

    expect(adapters.get("a")!.disposeCalls).toBe(1);
    expect(adapters.get("b")!.disposeCalls).toBe(0);
    expect(registry.has("b")).toBe(true);
    b.write("still-alive");
    expect(adapters.get("b")!.writeLog).toEqual(["hello-b", "still-alive"]);
  });

  it("write goes to adapter without requiring React state", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = registry.acquire("t1");
    r.attach(host);
    r.write("direct");
    expect(adapters.get("t1")!.writeLog).toEqual(["direct"]);
  });
});
