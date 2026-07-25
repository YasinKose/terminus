import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaneTree } from "./PaneTree";
import {
  createTerminalLeaf,
  type PaneNode,
  type SplitContainer,
} from "./model";

vi.mock("@/features/terminal/TerminalPane", () => ({
  TerminalPane: ({ sessionId }: { sessionId: string }) => (
    <div data-testid={`terminal-${sessionId}`}>terminal:{sessionId}</div>
  ),
}));

afterEach(() => {
  cleanup();
});

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

describe("PaneTree", () => {
  it("renders a single terminal leaf with stable key/id", () => {
    const root = createTerminalLeaf("t-only");
    render(
      <PaneTree root={root} projectId="p1" workspaceId="ws-1" onTreeChange={() => undefined} />,
    );
    expect(screen.getByTestId("terminal-t-only")).toBeTruthy();
    expect(screen.getByTestId("pane-leaf-t-only")).toBeTruthy();
  });

  it("renames a terminal from its pane header", async () => {
    const user = userEvent.setup();
    const onTreeChange = vi.fn();
    const root = createTerminalLeaf("terminal-1", {
      titleOverride: "Logs",
    });

    render(
      <PaneTree
        root={root}
        projectId="p1"
        workspaceId="ws-1"
        onTreeChange={onTreeChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Rename terminal: Logs" }),
    );

    const nameInput = screen.getByRole("textbox", { name: "Terminal name" });
    expect(nameInput).toHaveValue("Logs");

    await user.clear(nameInput);
    await user.type(nameInput, "Build");
    await user.click(screen.getByRole("button", { name: "Rename terminal" }));

    expect(onTreeChange).toHaveBeenCalledOnce();
    expect(onTreeChange.mock.calls[0]?.[0]).toMatchObject({
      type: "terminal",
      id: "terminal-1",
      titleOverride: "Build",
    });
  });

  it("recursively renders nested horizontal and vertical splits", () => {
    const root = split(
      "s-root",
      "row",
      [
        createTerminalLeaf("t-a"),
        split(
          "s-nested",
          "column",
          [createTerminalLeaf("t-b"), createTerminalLeaf("t-c")],
          [40, 60],
        ),
      ],
      [30, 70],
    );

    render(
      <PaneTree root={root} projectId="p1" workspaceId="ws-1" onTreeChange={() => undefined} />,
    );

    expect(screen.getByTestId("terminal-t-a")).toBeTruthy();
    expect(screen.getByTestId("terminal-t-b")).toBeTruthy();
    expect(screen.getByTestId("terminal-t-c")).toBeTruthy();
    expect(screen.getByTestId("pane-split-s-root")).toHaveAttribute(
      "data-direction",
      "row",
    );
    expect(screen.getByTestId("pane-split-s-nested")).toHaveAttribute(
      "data-direction",
      "column",
    );
  });

  it("keeps stable terminal keys when sibling is closed", () => {
    const withSibling = split("s1", "row", [
      createTerminalLeaf("t-keep"),
      createTerminalLeaf("t-gone"),
    ]);
    const onlyKeep = createTerminalLeaf("t-keep");
    const onTreeChange = vi.fn();

    const { rerender } = render(
      <PaneTree
        root={withSibling}
        projectId="p1" workspaceId="ws-1"
        onTreeChange={onTreeChange}
      />,
    );
    expect(screen.getByTestId("terminal-t-keep")).toBeTruthy();
    expect(screen.getByTestId("terminal-t-gone")).toBeTruthy();

    rerender(
      <PaneTree root={onlyKeep} projectId="p1" workspaceId="ws-1" onTreeChange={onTreeChange} />,
    );
    expect(screen.getByTestId("terminal-t-keep")).toBeTruthy();
    expect(screen.queryByTestId("terminal-t-gone")).toBeNull();
  });

  it("does not collapse a one-child split container", () => {
    const root = split("s-one", "row", [createTerminalLeaf("t-solo")], [100]);
    render(
      <PaneTree root={root} projectId="p1" workspaceId="ws-1" onTreeChange={() => undefined} />,
    );
    expect(screen.getByTestId("pane-split-s-one")).toBeTruthy();
    expect(screen.getByTestId("terminal-t-solo")).toBeTruthy();
  });

  it("resizes with pointer capture and persists normalized sizes on pointer-up", () => {
    const root = split(
      "s-resize",
      "row",
      [createTerminalLeaf("t-left"), createTerminalLeaf("t-right")],
      [50, 50],
    );
    const onTreeChange = vi.fn();

    render(
      <div style={{ width: 400, height: 200 }}>
        <PaneTree root={root} projectId="p1" workspaceId="ws-1" onTreeChange={onTreeChange} />
      </div>,
    );

    const container = screen.getByTestId("pane-split-s-resize");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 200,
        right: 400,
        bottom: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const divider = screen.getByTestId("pane-divider-s-resize-0");
    fireEvent.pointerDown(divider, {
      clientX: 200,
      clientY: 100,
      pointerId: 1,
      button: 0,
    });

    const overlay = screen.getByTestId("pane-drag-overlay-s-resize");
    fireEvent.pointerMove(overlay, {
      clientX: 120,
      clientY: 100,
      pointerId: 1,
    });
    expect(onTreeChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(overlay, {
      clientX: 120,
      clientY: 100,
      pointerId: 1,
    });

    expect(onTreeChange).toHaveBeenCalledTimes(1);
    const next = onTreeChange.mock.calls[0]![0] as SplitContainer;
    expect(next.type).toBe("split");
    expect(next.id).toBe("s-resize");
    expect(next.sizes).toHaveLength(2);
    expect(next.sizes[0]! + next.sizes[1]!).toBeCloseTo(100, 5);
    expect(next.sizes[0]).toBeCloseTo(30, 0);
    expect(next.sizes[1]).toBeCloseTo(70, 0);
  });

  it("clamps resize so no pane shrinks below minimum percentage", () => {
    const root = split(
      "s-min",
      "row",
      [createTerminalLeaf("t1"), createTerminalLeaf("t2")],
      [50, 50],
    );
    const onTreeChange = vi.fn();

    render(
      <div style={{ width: 400, height: 200 }}>
        <PaneTree root={root} projectId="p1" workspaceId="ws-1" onTreeChange={onTreeChange} />
      </div>,
    );

    const container = screen.getByTestId("pane-split-s-min");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 200,
        right: 400,
        bottom: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const divider = screen.getByTestId("pane-divider-s-min-0");
    fireEvent.pointerDown(divider, {
      clientX: 200,
      clientY: 100,
      pointerId: 1,
      button: 0,
    });
    const overlay = screen.getByTestId("pane-drag-overlay-s-min");
    fireEvent.pointerMove(overlay, {
      clientX: 0,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(overlay, {
      clientX: 0,
      clientY: 100,
      pointerId: 1,
    });

    const next = onTreeChange.mock.calls[0]![0] as SplitContainer;
    expect(next.sizes[0]).toBeGreaterThanOrEqual(20 - 0.01);
    expect(next.sizes[1]).toBeLessThanOrEqual(80 + 0.01);
  });

  it("resizes vertical column splits using clientY", () => {
    const root = split(
      "s-col",
      "column",
      [createTerminalLeaf("t-top"), createTerminalLeaf("t-bot")],
      [50, 50],
    );
    const onTreeChange = vi.fn();

    render(
      <div style={{ width: 200, height: 400 }}>
        <PaneTree root={root} projectId="p1" workspaceId="ws-1" onTreeChange={onTreeChange} />
      </div>,
    );

    const container = screen.getByTestId("pane-split-s-col");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 400,
        right: 200,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const divider = screen.getByTestId("pane-divider-s-col-0");
    fireEvent.pointerDown(divider, {
      clientX: 100,
      clientY: 200,
      pointerId: 1,
      button: 0,
    });
    const overlay = screen.getByTestId("pane-drag-overlay-s-col");
    fireEvent.pointerMove(overlay, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(overlay, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });

    const next = onTreeChange.mock.calls[0]![0] as SplitContainer;
    expect(next.direction).toBe("column");
    expect(next.sizes[0]! + next.sizes[1]!).toBeCloseTo(100, 5);
    expect(next.sizes[0]).toBeCloseTo(25, 0);
  });
});
