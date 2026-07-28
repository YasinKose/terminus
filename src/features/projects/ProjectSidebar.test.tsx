import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  ProjectRecord,
  WorkspaceView,
} from "@/lib/tauri/contracts";
import { ProjectSidebar } from "./ProjectSidebar";

function project(
  id: string,
  displayName: string,
  lastActiveWorkspaceId: string | null,
): ProjectRecord {
  return {
    id,
    canonicalPath: `/projects/${displayName}`,
    displayName,
    color: "#2dd4bf",
    lastActiveWorkspaceId,
    createdAt: 1,
    updatedAt: 1,
  };
}

function workspace(
  id: string,
  projectId: string,
  name: string,
  position: number,
  terminalCount = 0,
): WorkspaceView {
  const children = Array.from({ length: terminalCount }, (_, index) => ({
    type: "terminal" as const,
    id: `${id}-terminal-${index}`,
    profileId: null,
    titleOverride: null,
    initialCwd: "",
  }));
  const rootJson =
    children.length === 0
      ? null
      : children.length === 1
        ? JSON.stringify(children[0])
        : JSON.stringify({
            type: "split",
            id: `${id}-split`,
            direction: "horizontal",
            children,
            sizes: children.map(() => 100 / children.length),
          });

  return {
    id,
    projectId,
    name,
    rootJson,
    activePaneId: children[0]?.id ?? null,
    position,
    createdAt: 1,
    updatedAt: 1,
    initialized: true,
  };
}

describe("ProjectSidebar workspace tree", () => {
  it("nests ordered workspaces below their project and marks the active item", () => {
    const projects = [
      project("p1", "Terminus", "w2"),
      project("p2", "Website", "w3"),
    ];
    const workspaces = [
      workspace("w2", "p1", "Tests", 1),
      workspace("w1", "p1", "Development", 0, 2),
      workspace("w3", "p2", "Deploy", 0),
    ];

    render(
      <ProjectSidebar
        projects={projects}
        workspaces={workspaces}
        activeProjectId="p1"
        activeWorkspaceId="w1"
        collapsed={false}
        onOpenProject={vi.fn()}
        onSelectProject={vi.fn()}
        onSelectWorkspace={vi.fn()}
        onCreateWorkspace={vi.fn()}
      />,
    );

    const tree = screen.getByRole("tree", { name: "Projects" });
    const terminus = within(tree).getByTestId("project-tree-item-p1");
    const items = within(terminus).getAllByRole("treeitem");

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Development"),
      expect.stringContaining("Tests"),
    ]);
    expect(
      within(terminus).getByRole("treeitem", { name: /Development/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(terminus).getByRole("treeitem", { name: /Development/ }),
    ).toHaveAttribute("data-workspace-drop-id", "w1");
    expect(within(terminus).getByText("2")).toBeVisible();
    expect(
      within(tree).queryByRole("treeitem", { name: /Deploy/ }),
    ).not.toBeInTheDocument();
  });

  it("expands a project independently and selects one of its workspaces", async () => {
    const onSelectProject = vi.fn();
    const onSelectWorkspace = vi.fn();
    const user = userEvent.setup();

    render(
      <ProjectSidebar
        projects={[
          project("p1", "Terminus", "w1"),
          project("p2", "Website", "w2"),
        ]}
        workspaces={[
          workspace("w1", "p1", "Development", 0),
          workspace("w2", "p2", "Deploy", 0),
        ]}
        activeProjectId="p1"
        activeWorkspaceId="w1"
        collapsed={false}
        onOpenProject={vi.fn()}
        onSelectProject={onSelectProject}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Expand Website workspaces" }),
    );
    expect(onSelectProject).not.toHaveBeenCalled();

    await user.click(screen.getByRole("treeitem", { name: /Deploy/ }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("p2", "w2");
  });

  it("creates a workspace inside the requested project", async () => {
    const onCreateWorkspace = vi.fn();
    const user = userEvent.setup();

    render(
      <ProjectSidebar
        projects={[project("p1", "Terminus", "w1")]}
        workspaces={[workspace("w1", "p1", "Development", 0)]}
        activeProjectId="p1"
        activeWorkspaceId="w1"
        collapsed={false}
        onOpenProject={vi.fn()}
        onSelectProject={vi.fn()}
        onSelectWorkspace={vi.fn()}
        onCreateWorkspace={onCreateWorkspace}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "New workspace in Terminus",
      }),
    );

    expect(onCreateWorkspace).toHaveBeenCalledWith("p1");
  });

  it("resizes the project navigator within its supported width", () => {
    const onWidthChange = vi.fn();

    render(
      <ProjectSidebar
        projects={[project("p1", "Terminus", "w1")]}
        workspaces={[workspace("w1", "p1", "Development", 0)]}
        activeProjectId="p1"
        activeWorkspaceId="w1"
        collapsed={false}
        width={256}
        onWidthChange={onWidthChange}
        onOpenProject={vi.fn()}
        onSelectProject={vi.fn()}
      />,
    );

    const resizeHandle = screen.getByRole("separator", {
      name: "Resize project sidebar",
    });
    fireEvent.pointerDown(resizeHandle, { clientX: 256, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 420, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });

    expect(onWidthChange).toHaveBeenLastCalledWith(360);
  });
});
