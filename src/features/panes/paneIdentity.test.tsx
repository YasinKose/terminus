import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectTerminalIds,
  movePaneBetweenWorkspaces,
  removePane,
  splitPane,
  swapPanes,
} from "./tree";
import type { PaneNode, TerminalLeaf } from "./model";
import { createTerminalLeaf } from "./model";
import { TerminalRuntimeRegistry } from "@/features/terminal/runtime/TerminalRuntimeRegistry";
import { resetParkingContainerForTests } from "@/features/terminal/runtime/parking";
import type { TerminalAdapter } from "@/features/terminal/runtime/types";

function leaf(id: string): TerminalLeaf {
  return createTerminalLeaf(id);
}

type FakeAdapter = TerminalAdapter & {
  disposeCalls: number;
  openCalls: number;
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

describe("pane identity invariants", () => {
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
  });

  it("sibling close preserves survivor runtime object and DOM wrapper", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const survivor = registry.acquire("keep");
    survivor.attach(host);
    const wrapperBefore = survivor.wrapper;
    registry.acquire("gone");

    const root: PaneNode = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("keep"), leaf("gone")],
      sizes: [50, 50],
    };
    const removed = removePane(root, "gone");
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;

    registry.delete("gone");
    expect(adapters.get("gone")!.disposeCalls).toBe(1);

    const still = registry.get("keep");
    expect(still).toBe(survivor);
    expect(still!.wrapper).toBe(wrapperBefore);
    expect(adapters.get("keep")!.disposeCalls).toBe(0);
    expect(collectTerminalIds(removed.value)).toEqual(["keep"]);
  });

  it("cross-workspace move preserves terminal id (session identity)", () => {
    const source: PaneNode = {
      type: "split",
      id: "s-src",
      direction: "row",
      children: [leaf("move-me"), leaf("stay")],
      sizes: [50, 50],
    };
    const dest: PaneNode = leaf("dest-leaf");

    const moved = movePaneBetweenWorkspaces(source, dest, "move-me", true);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;

    expect(moved.value.moved.id).toBe("move-me");
    expect(collectTerminalIds(moved.value.destRoot)).toContain("move-me");
    expect(collectTerminalIds(moved.value.sourceRoot)).toEqual(["stay"]);

    const runtime = registry.acquire("move-me");
    expect(runtime.sessionId).toBe("move-me");
    expect(registry.acquire("move-me")).toBe(runtime);
  });

  it("rejects cross-project pane moves", () => {
    const result = movePaneBetweenWorkspaces(
      leaf("a"),
      leaf("b"),
      "a",
      false,
    );
    expect(result.ok).toBe(false);
  });

  it("last pane removal yields null empty workspace root", () => {
    const root = leaf("only");
    const removed = removePane(root, "only");
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.value).toBeNull();
  });

  it("swap preserves both terminal ids", () => {
    const root: PaneNode = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("a"), leaf("b")],
      sizes: [40, 60],
    };
    const swapped = swapPanes(root, "a", "b");
    expect(swapped.ok).toBe(true);
    if (!swapped.ok) return;
    const ids = collectTerminalIds(swapped.value);
    expect(ids.sort()).toEqual(["a", "b"]);
  });

  it("split assigns new leaf id without mutating existing leaf ids", () => {
    const root = leaf("existing");
    const split = splitPane(
      root,
      "existing",
      "row",
      leaf("new-one"),
      "split-new",
    );
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(collectTerminalIds(split.value).sort()).toEqual([
      "existing",
      "new-one",
    ]);
  });
});
