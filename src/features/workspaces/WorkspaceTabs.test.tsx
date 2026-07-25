import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkspaceView } from "@/lib/tauri/contracts";
import {
  calculateVisibleWorkspaceIds,
  WorkspaceTabs,
} from "./WorkspaceTabs";

function workspace(id: string, position: number): WorkspaceView {
  return {
    id,
    projectId: "project-1",
    name: `Workspace ${position + 1}`,
    rootJson: null,
    activePaneId: null,
    position,
    createdAt: 1,
    updatedAt: 1,
    initialized: true,
  };
}

function rect(width: number): DOMRect {
  return {
    bottom: 32,
    height: 32,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}

describe("WorkspaceTabs overflow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves workspaces that do not fit into a selectable overflow menu", async () => {
    vi.spyOn(
      HTMLElement.prototype,
      "getBoundingClientRect",
    ).mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === "workspace-tabs-viewport") {
        return rect(400);
      }
      if (this.hasAttribute("data-workspace-measure-id")) {
        return rect(100);
      }
      if (this.hasAttribute("data-workspace-measure-control")) {
        return rect(32);
      }
      return rect(0);
    });

    const onSelectWorkspace = vi.fn();
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <WorkspaceTabs
          workspaces={[0, 1, 2, 3].map((position) =>
            workspace(`workspace-${position + 1}`, position),
          )}
          activeWorkspaceId="workspace-1"
          onSelectWorkspace={onSelectWorkspace}
          onCreateWorkspace={vi.fn()}
        />
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("workspace-overflow-trigger"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("workspace-tab-workspace-1")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-tab-workspace-2")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-tab-workspace-3")).toBeInTheDocument();
    expect(
      screen.queryByTestId("workspace-tab-workspace-4"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("workspace-overflow-trigger"));
    const menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: "Workspace 4" }),
    );

    expect(onSelectWorkspace).toHaveBeenCalledWith("workspace-4");
  });

  it("keeps the active workspace visible when it would otherwise overflow", () => {
    const visibleIds = calculateVisibleWorkspaceIds({
      availableWidth: 400,
      workspaces: [1, 2, 3, 4].map((number) => ({
        id: `workspace-${number}`,
        width: 100,
      })),
      activeWorkspaceId: "workspace-4",
      createControlWidth: 32,
      overflowControlWidth: 32,
      gap: 4,
    });

    expect(visibleIds).toEqual([
      "workspace-1",
      "workspace-2",
      "workspace-4",
    ]);
  });

  it("requests workspace close when its name is middle-clicked", () => {
    const onCloseWorkspace = vi.fn();

    render(
      <TooltipProvider>
        <WorkspaceTabs
          workspaces={[workspace("workspace-1", 0)]}
          activeWorkspaceId="workspace-1"
          onSelectWorkspace={vi.fn()}
          onCloseWorkspace={onCloseWorkspace}
        />
      </TooltipProvider>,
    );

    fireEvent(
      screen.getByTestId("workspace-tab-workspace-1"),
      new MouseEvent("auxclick", { bubbles: true, button: 1 }),
    );

    expect(onCloseWorkspace).toHaveBeenCalledWith("workspace-1");
  });

  it("requests workspace close when an overflow menu name is middle-clicked", async () => {
    vi.spyOn(
      HTMLElement.prototype,
      "getBoundingClientRect",
    ).mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === "workspace-tabs-viewport") {
        return rect(400);
      }
      if (this.hasAttribute("data-workspace-measure-id")) {
        return rect(100);
      }
      if (this.hasAttribute("data-workspace-measure-control")) {
        return rect(32);
      }
      return rect(0);
    });
    const onCloseWorkspace = vi.fn();
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <WorkspaceTabs
          workspaces={[0, 1, 2, 3].map((position) =>
            workspace(`workspace-${position + 1}`, position),
          )}
          activeWorkspaceId="workspace-1"
          onSelectWorkspace={vi.fn()}
          onCloseWorkspace={onCloseWorkspace}
          onCreateWorkspace={vi.fn()}
        />
      </TooltipProvider>,
    );

    await user.click(await screen.findByTestId("workspace-overflow-trigger"));
    const overflowedWorkspace = await screen.findByRole("menuitem", {
      name: "Workspace 4",
    });
    fireEvent(
      overflowedWorkspace,
      new MouseEvent("auxclick", { bubbles: true, button: 1 }),
    );

    expect(onCloseWorkspace).toHaveBeenCalledWith("workspace-4");
  });
});
