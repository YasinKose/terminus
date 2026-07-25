import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloseWorkspaceDialog } from "./CloseWorkspaceDialog";

describe("CloseWorkspaceDialog", () => {
  it("reports the don't-ask-again choice when close is confirmed", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <CloseWorkspaceDialog
        request={{
          kind: "workspace",
          workspaceId: "workspace-1",
          projectId: "project-1",
          name: "Backend",
          terminalCount: 2,
        }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: /don't ask again/i }),
    );
    await user.click(screen.getByTestId("close-workspace-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });
});
