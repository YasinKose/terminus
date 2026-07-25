import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useProjectStore } from "@/features/projects/projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { useRecoveryStore } from "@/features/settings/recoveryStore";

const bootstrap = useProjectStore.getState().bootstrap;

describe("App", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      bootstrapped: true,
      bootstrap,
    });
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
    });
    useRecoveryStore.setState({
      status: { kind: "idle" },
      busy: false,
      forceConfirmOpen: false,
      lastMessage: null,
    });
  });

  it("renders the empty project state", () => {
    render(<App autoBootstrap={false} />);
    expect(screen.getByRole("button", { name: /open project/i })).toBeVisible();
  });

  it("surfaces an unexpected bootstrap rejection as retryable recovery", async () => {
    useProjectStore.setState({
      bootstrapped: false,
      bootstrap: vi.fn().mockRejectedValue(
        new Error("unexpected bootstrap failure"),
      ),
    });

    render(<App interceptWindowClose={false} />);

    await waitFor(() =>
      expect(
        screen.getAllByText("unexpected bootstrap failure"),
      ).not.toHaveLength(0),
    );
    expect(useRecoveryStore.getState().status.kind).toBe("recoveryRequired");
  });
});
