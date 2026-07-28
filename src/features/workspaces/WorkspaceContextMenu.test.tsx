import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";

describe("WorkspaceContextMenu", () => {
  it("describes workspace ordering vertically", async () => {
    render(
      <WorkspaceContextMenu
        canMoveLeft
        canMoveRight
        onRename={vi.fn()}
        onMove={vi.fn()}
        onClose={vi.fn()}
      >
        <button type="button">Development</button>
      </WorkspaceContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", {
      name: "Development",
    }));

    expect(
      await screen.findByRole("menuitem", { name: "Move up" }),
    ).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Move down" }),
    ).toBeVisible();
  });
});
