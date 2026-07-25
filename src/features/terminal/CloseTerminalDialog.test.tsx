import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloseTerminalDialog } from "./CloseTerminalDialog";

describe("CloseTerminalDialog", () => {
  it("reports the don't-ask-again choice when close is confirmed", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <CloseTerminalDialog
        request={{
          kind: "terminal",
          sessionId: "terminal-1",
          workspaceId: "workspace-1",
          projectId: "project-1",
          title: "Local shell",
          terminalCount: 1,
        }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: /don't ask again/i }),
    );
    await user.click(screen.getByTestId("close-terminal-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });
});
