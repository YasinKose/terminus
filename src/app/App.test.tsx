import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useProjectStore } from "@/features/projects/projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { useRecoveryStore } from "@/features/settings/recoveryStore";
import i18n from "@/i18n";

const bootstrap = useProjectStore.getState().bootstrap;

describe("App", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
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

  it("rerenders the empty project state in Turkish", async () => {
    render(<App autoBootstrap={false} />);

    await i18n.changeLanguage("tr");

    expect(
      await screen.findByRole("button", { name: "Proje aç" }),
    ).toBeVisible();
    expect(
      screen.getByText("Yerel terminallerinizi proje, çalışma alanı ve bölmelere göre düzenleyin."),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe("tr");
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
