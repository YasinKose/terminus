import { describe, expect, it } from "vitest";
import type { BootstrapState, ProjectRecord } from "@/lib/tauri/contracts";
import { chooseRestoredProjectId } from "./selection";

const project = (id: string): ProjectRecord => ({
  id,
  canonicalPath: `/tmp/${id}`,
  displayName: id,
  color: "#112233",
  lastActiveWorkspaceId: null,
  createdAt: 1,
  updatedAt: 1,
});

const state = (
  projects: ProjectRecord[],
  activeProjectId?: unknown,
): BootstrapState => ({
  projects,
  workspaces: [],
  profiles: [],
  settings:
    activeProjectId === undefined
      ? {}
      : { "selection.activeProjectId": activeProjectId },
});

describe("chooseRestoredProjectId", () => {
  it("returns the persisted project when it still exists", () => {
    expect(chooseRestoredProjectId(state([project("p1"), project("p2")], "p2")))
      .toBe("p2");
  });

  it("falls back to the first project for a stale or non-string setting", () => {
    expect(chooseRestoredProjectId(state([project("p1")], "missing"))).toBe("p1");
    expect(chooseRestoredProjectId(state([project("p1")], 42))).toBe("p1");
  });

  it("returns null when there are no projects", () => {
    expect(chooseRestoredProjectId(state([], "p1"))).toBeNull();
  });
});
