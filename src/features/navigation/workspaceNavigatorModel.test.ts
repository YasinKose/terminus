import { describe, expect, it } from "vitest";
import type { ProjectRecord, WorkspaceRecord } from "@/lib/tauri/contracts";
import {
  createNavigatorSelection,
  moveNavigatorProject,
  moveNavigatorWorkspace,
} from "./workspaceNavigatorModel";

function project(
  id: string,
  lastActiveWorkspaceId: string | null,
): ProjectRecord {
  return {
    id,
    canonicalPath: `/projects/${id}`,
    displayName: id.toUpperCase(),
    color: "#2DD4BF",
    lastActiveWorkspaceId,
    createdAt: 1,
    updatedAt: 1,
  };
}

function workspace(
  id: string,
  projectId: string,
  position: number,
): WorkspaceRecord {
  return {
    id,
    projectId,
    name: id.toUpperCase(),
    rootJson: null,
    activePaneId: null,
    position,
    createdAt: 1,
    updatedAt: 1,
  };
}

const projects = [project("p1", "w2"), project("p2", "w3")];
const workspaces = [
  workspace("w2", "p1", 1),
  workspace("w1", "p1", 0),
  workspace("w3", "p2", 0),
  workspace("w4", "p2", 1),
];

describe("workspaceNavigatorModel", () => {
  it("starts from the active project and workspace", () => {
    expect(
      createNavigatorSelection(
        projects,
        workspaces,
        "p1",
        "w1",
      ),
    ).toEqual({ projectId: "p1", workspaceId: "w1" });
  });

  it("falls back to the project's last active workspace", () => {
    expect(
      createNavigatorSelection(projects, workspaces, "p1", "missing"),
    ).toEqual({ projectId: "p1", workspaceId: "w2" });
  });

  it("moves between projects and previews their last workspace", () => {
    const next = moveNavigatorProject(
      projects,
      workspaces,
      { projectId: "p1", workspaceId: "w1" },
      1,
    );
    expect(next).toEqual({ projectId: "p2", workspaceId: "w3" });
  });

  it("wraps project navigation in both directions", () => {
    expect(
      moveNavigatorProject(
        projects,
        workspaces,
        { projectId: "p1", workspaceId: "w1" },
        -1,
      ),
    ).toEqual({ projectId: "p2", workspaceId: "w3" });
  });

  it("sorts and wraps workspace navigation by position", () => {
    expect(
      moveNavigatorWorkspace(
        workspaces,
        { projectId: "p1", workspaceId: "w1" },
        -1,
      ),
    ).toEqual({ projectId: "p1", workspaceId: "w2" });
    expect(
      moveNavigatorWorkspace(
        workspaces,
        { projectId: "p1", workspaceId: "w2" },
        1,
      ),
    ).toEqual({ projectId: "p1", workspaceId: "w1" });
  });

  it("keeps a project selectable when it has no workspaces", () => {
    const emptyProject = project("p3", null);
    expect(
      moveNavigatorProject(
        [...projects, emptyProject],
        workspaces,
        { projectId: "p2", workspaceId: "w3" },
        1,
      ),
    ).toEqual({ projectId: "p3", workspaceId: null });
  });
});
