import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerminalStatus } from "./TerminalStatus";

describe("TerminalStatus", () => {
  it("does not show a decorative indicator for a quiet terminal", () => {
    render(
      <TerminalStatus
        title="Shell"
        status="starting"
        activity="quiet"
        unread={false}
        attention={false}
      />,
    );

    expect(document.querySelector("[data-terminal-indicator]")).toBeNull();
    expect(screen.getByTestId("terminal-status").querySelector("[aria-hidden]"))
      .toBeNull();
  });

  it("labels an active output indicator", () => {
    render(
      <TerminalStatus
        title="Shell"
        status="running"
        activity="active"
        unread={false}
        attention={false}
      />,
    );

    expect(screen.getByLabelText("Terminal is producing output")).toBeVisible();
  });
});
