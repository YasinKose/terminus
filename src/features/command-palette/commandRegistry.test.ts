import { describe, expect, it, vi } from "vitest";
import { buildCommands, filterCommands } from "./commandRegistry";

const ctx = {
  openSettings: vi.fn(),
  toggleSidebar: vi.fn(),
  toggleFocus: vi.fn(),
  openPalette: vi.fn(),
  newWorkspace: vi.fn(),
  newTerminal: vi.fn(),
  splitHorizontal: vi.fn(),
  splitVertical: vi.fn(),
  closePane: vi.fn(),
  nextWorkspace: vi.fn(),
  prevWorkspace: vi.fn(),
  selectProject: vi.fn(),
  selectWorkspace: vi.fn(),
  projects: [{ id: "p1", displayName: "Terminus" }],
  workspaces: [{ id: "w1", name: "Workspace 1", projectId: "p1" }],
  activeProjectId: "p1",
};

describe("commandRegistry", () => {
  it("includes core and navigation commands", () => {
    const cmds = buildCommands(ctx);
    expect(cmds.some((c) => c.id === "newTerminal")).toBe(true);
    expect(cmds.some((c) => c.id === "project:p1")).toBe(true);
    expect(cmds.some((c) => c.id === "workspace:w1")).toBe(true);
  });

  it("filters by label", () => {
    const cmds = buildCommands(ctx);
    const filtered = filterCommands(cmds, "sidebar");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("toggleSidebar");
  });

  it("runs command functions", async () => {
    const cmds = buildCommands(ctx);
    const settings = cmds.find((c) => c.id === "openSettings");
    await settings?.run();
    expect(ctx.openSettings).toHaveBeenCalled();
  });
});
