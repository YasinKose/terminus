import { describe, expect, it } from "vitest";
import {
  cancelDrag,
  commitDragGuarded,
  createIdleDragState,
  hitTestDropZone,
  startDrag,
  updateDragOver,
  type DragState,
} from "./PaneDragController";
import { createTerminalLeaf, type PaneNode, type SplitContainer } from "./model";
import { collectTerminalIds, findNode } from "./tree";

function split(
  id: string,
  direction: "row" | "column",
  children: PaneNode[],
  sizes?: number[],
): SplitContainer {
  return {
    type: "split",
    id,
    direction,
    children,
    sizes: sizes ?? children.map(() => 100 / children.length),
  };
}

function dragging(
  paneId: string,
  workspaceId = "ws-a",
  projectId = "proj-1",
): DragState {
  return startDrag(createIdleDragState(), {
    paneId,
    workspaceId,
    projectId,
    pointerId: 1,
  });
}

describe("PaneDragController", () => {
  it("starts idle and cancels back to idle", () => {
    const idle = createIdleDragState();
    expect(idle.status).toBe("idle");
    const d = startDrag(idle, {
      paneId: "t1",
      workspaceId: "ws-a",
      projectId: "p1",
      pointerId: 7,
    });
    expect(d.status).toBe("dragging");
    if (d.status !== "dragging") throw new Error("expected dragging");
    expect(d.source.paneId).toBe("t1");
    expect(d.over).toBeNull();
    expect(cancelDrag(d).status).toBe("idle");
  });

  it("self-drop is a no-op", () => {
    const root = split("s1", "row", [
      createTerminalLeaf("t-a"),
      createTerminalLeaf("t-b"),
    ]);
    let state = dragging("t-a");
    state = updateDragOver(state, {
      kind: "pane",
      paneId: "t-a",
      zone: "center",
    });
    const result = commitDragGuarded(
      state,
      { projectId: "proj-1", roots: { "ws-a": root } },
      { "ws-a": "proj-1" },
    );
    expect(result).toEqual({ ok: true, kind: "noop" });
  });

  it("center drop swaps panes and keeps both session ids", () => {
    const root = split("s1", "row", [
      createTerminalLeaf("t-a"),
      createTerminalLeaf("t-b"),
    ]);
    let state = dragging("t-a");
    state = updateDragOver(state, {
      kind: "pane",
      paneId: "t-b",
      zone: "center",
    });
    const result = commitDragGuarded(
      state,
      { projectId: "proj-1", roots: { "ws-a": root } },
      { "ws-a": "proj-1" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "same-workspace") {
      throw new Error("expected same-workspace swap");
    }
    const ids = collectTerminalIds(result.root);
    expect(ids.sort()).toEqual(["t-a", "t-b"]);
    if (result.root?.type === "split") {
      expect(result.root.children[0]?.id).toBe("t-b");
      expect(result.root.children[1]?.id).toBe("t-a");
    }
  });

  it.each(["left", "right", "top", "bottom"] as const)(
    "edge zone %s inserts source at target edge and removes from source slot",
    (edge) => {
      const root = split("s1", "row", [
        createTerminalLeaf("t-a"),
        createTerminalLeaf("t-b"),
      ]);
      let state = dragging("t-a");
      state = updateDragOver(state, {
        kind: "pane",
        paneId: "t-b",
        zone: edge,
      });
      let splitCounter = 0;
      const result = commitDragGuarded(
        state,
        { projectId: "proj-1", roots: { "ws-a": root } },
        { "ws-a": "proj-1" },
        () => `split-${++splitCounter}`,
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.kind !== "same-workspace") {
        throw new Error(`expected same-workspace insert for ${edge}`);
      }
      const ids = collectTerminalIds(result.root);
      expect(ids.sort()).toEqual(["t-a", "t-b"]);
      expect(findNode(result.root, "t-a")).toBeTruthy();
      expect(findNode(result.root, "t-b")).toBeTruthy();
      expect(ids.filter((id) => id === "t-a")).toHaveLength(1);
    },
  );

  it("rejects cross-project workspace drops", () => {
    const sourceRoot = createTerminalLeaf("t-a");
    const destRoot = createTerminalLeaf("t-b");
    let state = dragging("t-a", "ws-a", "proj-1");
    state = updateDragOver(state, {
      kind: "workspace",
      workspaceId: "ws-b",
    });
    const result = commitDragGuarded(
      state,
      {
        projectId: "proj-1",
        roots: { "ws-a": sourceRoot, "ws-b": destRoot },
      },
      { "ws-a": "proj-1", "ws-b": "proj-other" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error).toMatch(/cross-project/i);
  });

  it("cross-workspace same-project move returns atomic dual roots", () => {
    const sourceRoot = split("s1", "row", [
      createTerminalLeaf("t-a"),
      createTerminalLeaf("t-keep"),
    ]);
    const destRoot = createTerminalLeaf("t-b");
    let state = dragging("t-a", "ws-a", "proj-1");
    state = updateDragOver(state, {
      kind: "workspace",
      workspaceId: "ws-b",
    });
    const result = commitDragGuarded(
      state,
      {
        projectId: "proj-1",
        roots: { "ws-a": sourceRoot, "ws-b": destRoot },
      },
      { "ws-a": "proj-1", "ws-b": "proj-1" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "cross-workspace") {
      throw new Error("expected cross-workspace");
    }
    expect(collectTerminalIds(result.sourceRoot).sort()).toEqual(["t-keep"]);
    expect(collectTerminalIds(result.destRoot).sort()).toEqual(["t-a", "t-b"]);
    expect(result.activePaneId).toBe("t-a");
  });

  it("drop on same workspace tab is no-op", () => {
    const root = createTerminalLeaf("t-a");
    let state = dragging("t-a", "ws-a");
    state = updateDragOver(state, {
      kind: "workspace",
      workspaceId: "ws-a",
    });
    const result = commitDragGuarded(
      state,
      { projectId: "proj-1", roots: { "ws-a": root } },
      { "ws-a": "proj-1" },
    );
    expect(result).toEqual({ ok: true, kind: "noop" });
  });

  it("cancel does not produce a commit mutation", () => {
    let state = dragging("t-a");
    state = updateDragOver(state, {
      kind: "pane",
      paneId: "t-b",
      zone: "center",
    });
    state = cancelDrag(state);
    const result = commitDragGuarded(
      state,
      {
        projectId: "proj-1",
        roots: {
          "ws-a": split("s1", "row", [
            createTerminalLeaf("t-a"),
            createTerminalLeaf("t-b"),
          ]),
        },
      },
      { "ws-a": "proj-1" },
    );
    expect(result).toEqual({ ok: true, kind: "noop" });
  });

  it("hitTestDropZone maps pointer to center and four edges", () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 };
    expect(hitTestDropZone(50, 50, rect)).toBe("center");
    expect(hitTestDropZone(5, 50, rect)).toBe("left");
    expect(hitTestDropZone(95, 50, rect)).toBe("right");
    expect(hitTestDropZone(50, 5, rect)).toBe("top");
    expect(hitTestDropZone(50, 95, rect)).toBe("bottom");
  });
});
