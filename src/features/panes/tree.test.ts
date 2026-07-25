import { describe, expect, it } from "vitest";
import { createTerminalLeaf, type PaneNode, type SplitContainer } from "./model";
import {
  collectTerminalIds,
  findNode,
  insertPaneAtEdge,
  movePaneBetweenWorkspaces,
  removePane,
  resizeSplit,
  setTerminalProfile,
  splitPane,
  swapPanes,
  validatePaneTree,
} from "./tree";
import type { TerminalLeaf } from "./model";

function leaf(id: string, cwd = "/tmp"): ReturnType<typeof createTerminalLeaf> {
  return createTerminalLeaf(id, { initialCwd: cwd });
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as object)) {
      freezeDeep(child);
    }
  }
  return value;
}

describe("pane tree domain", () => {
  it("splits a leaf 50/50 into a new split container", () => {
    const root = leaf("t1");
    const result = splitPane(root, "t1", "row", leaf("t2"), "s1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const split = result.value as SplitContainer;
    expect(split.type).toBe("split");
    expect(split.id).toBe("s1");
    expect(split.direction).toBe("row");
    expect(split.children.map((c) => c.id)).toEqual(["t1", "t2"]);
    expect(split.sizes).toEqual([50, 50]);
  });

  it("appends into an existing same-direction container", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("t1"), leaf("t2")],
      sizes: [50, 50],
    };
    const result = splitPane(root, "t2", "row", leaf("t3"), "s-unused");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const split = result.value as SplitContainer;
    expect(split.id).toBe("s1");
    expect(split.children.map((c) => c.id)).toEqual(["t1", "t2", "t3"]);
    expect(split.sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    expect(split.sizes.every((s) => s > 0)).toBe(true);
  });

  it("closes a sibling without changing the survivor id", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "column",
      children: [leaf("keep"), leaf("drop")],
      sizes: [40, 60],
    };
    const result = removePane(root, "drop");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.type).toBe("split");
    if (result.value?.type !== "split") return;
    expect(result.value.children).toHaveLength(1);
    expect(result.value.children[0]?.id).toBe("keep");
    expect(result.value.sizes).toEqual([100]);
  });

  it("retains a one-child split container when removing further siblings", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("only")],
      sizes: [100],
    };
    const valid = validatePaneTree(root);
    expect(valid.ok).toBe(true);
    const result = removePane(root, "only");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("swaps two terminals on center-drop", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("a"), leaf("b")],
      sizes: [30, 70],
    };
    const result = swapPanes(root, "a", "b");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.value as SplitContainer).children.map((c) => c.id)).toEqual([
      "b",
      "a",
    ]);
    expect((result.value as SplitContainer).sizes).toEqual([30, 70]);
  });

  it("inserts at an edge of a target leaf", () => {
    const root = leaf("t1");
    const result = insertPaneAtEdge(root, "t1", "right", leaf("t2"), "s1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const split = result.value as SplitContainer;
    expect(split.direction).toBe("row");
    expect(split.children.map((c) => c.id)).toEqual(["t1", "t2"]);
  });

  it("inserts above as a column split with new leaf first", () => {
    const root = leaf("t1");
    const result = insertPaneAtEdge(root, "t1", "top", leaf("t2"), "s1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const split = result.value as SplitContainer;
    expect(split.direction).toBe("column");
    expect(split.children.map((c) => c.id)).toEqual(["t2", "t1"]);
  });

  it("moves a pane between workspaces of the same project", () => {
    const source: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("stay"), leaf("move")],
      sizes: [50, 50],
    };
    const dest: PaneNode = leaf("dest-only");
    const result = movePaneBetweenWorkspaces(source, dest, "move", true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(collectTerminalIds(result.value.sourceRoot)).toEqual(["stay"]);
    expect(collectTerminalIds(result.value.destRoot).sort()).toEqual([
      "dest-only",
      "move",
    ].sort());
    expect(result.value.moved.id).toBe("move");
  });

  it("rejects cross-project moves", () => {
    const source = leaf("move");
    const dest = leaf("other");
    const result = movePaneBetweenWorkspaces(source, dest, "move", false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/project/i);
  });

  it("normalizes finite positive sizes to 100", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("a"), leaf("b"), leaf("c")],
      sizes: [1, 1, 2],
    };
    const result = resizeSplit(root, "s1", [10, 20, 30]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sizes = (result.value as SplitContainer).sizes;
    expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    expect(sizes[0]! / sizes[1]!).toBeCloseTo(10 / 20);
  });

  it("rejects non-positive or non-finite sizes", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("a"), leaf("b")],
      sizes: [50, 50],
    };
    expect(resizeSplit(root, "s1", [0, 50]).ok).toBe(false);
    expect(resizeSplit(root, "s1", [-1, 50]).ok).toBe(false);
    expect(resizeSplit(root, "s1", [Number.NaN, 50]).ok).toBe(false);
    expect(resizeSplit(root, "s1", [10]).ok).toBe(false);
  });

  it("preserves input immutability", () => {
    const root: SplitContainer = freezeDeep({
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("a"), leaf("b")],
      sizes: [50, 50],
    });
    const before = JSON.stringify(root);
    const split = splitPane(root, "a", "column", leaf("c"), "s2");
    const remove = removePane(root, "b");
    const swap = swapPanes(root, "a", "b");
    expect(split.ok).toBe(true);
    expect(remove.ok).toBe(true);
    expect(swap.ok).toBe(true);
    expect(JSON.stringify(root)).toBe(before);
  });

  it("findNode and collectTerminalIds walk the tree", () => {
    const root: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [
        leaf("t1"),
        {
          type: "split",
          id: "s2",
          direction: "column",
          children: [leaf("t2"), leaf("t3")],
          sizes: [50, 50],
        },
      ],
      sizes: [50, 50],
    };
    expect(findNode(root, "t3")?.id).toBe("t3");
    expect(findNode(root, "missing")).toBeNull();
    expect(collectTerminalIds(root).sort()).toEqual(["t1", "t2", "t3"]);
  });

  it("validatePaneTree rejects mismatched sizes and empty splits", () => {
    const badSizes: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [leaf("a"), leaf("b")],
      sizes: [100],
    };
    expect(validatePaneTree(badSizes).ok).toBe(false);

    const empty: SplitContainer = {
      type: "split",
      id: "s1",
      direction: "row",
      children: [],
      sizes: [],
    };
    expect(validatePaneTree(empty).ok).toBe(false);

    expect(validatePaneTree(null).ok).toBe(true);
  });

  it("pins and clears a terminal profile without mutating the input tree", () => {
    const root = leaf("t1");
    const pinned = setTerminalProfile(root, "t1", "profile-zsh");
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    expect((pinned.value as TerminalLeaf).profileId).toBe("profile-zsh");
    expect(root.profileId).toBeNull();

    const cleared = setTerminalProfile(pinned.value, "t1", null);
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect((cleared.value as TerminalLeaf).profileId).toBeNull();
  });
});
