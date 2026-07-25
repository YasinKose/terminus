import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/features/settings/settingsStore";
import type { SettingsApi } from "@/lib/tauri/settings";
import {
  resetCloseRequestStoreForTests,
  type CloseRequest,
  useCloseRequestStore,
} from "@/stores/closeRequestStore";
import { CloseHost } from "./CloseHost";

const { executeCloseMock } = vi.hoisted(() => ({
  executeCloseMock: vi.fn(async () => {}),
}));

vi.mock("@/stores/executeClose", () => ({
  executeClose: executeCloseMock,
}));

describe("CloseHost confirmation preferences", () => {
  beforeEach(() => {
    executeCloseMock.mockClear();
    resetCloseRequestStoreForTests();
    useSettingsStore.setState({
      confirmTerminalClose: true,
      confirmWorkspaceClose: true,
    });
  });

  it("closes a terminal without rendering a dialog when its confirmation is disabled", async () => {
    const request: CloseRequest = {
      kind: "terminal",
      sessionId: "terminal-1",
      workspaceId: "workspace-1",
      projectId: "project-1",
      title: "Local shell",
      terminalCount: 1,
    };
    useSettingsStore.setState({ confirmTerminalClose: false });
    useCloseRequestStore.getState().requestClose(request);

    render(<CloseHost />);

    expect(
      screen.queryByTestId("close-terminal-dialog"),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(executeCloseMock).toHaveBeenCalledWith(request, {
        destroyWindow: undefined,
      });
    });
    expect(executeCloseMock).toHaveBeenCalledTimes(1);
  });

  it("closes a workspace without rendering a dialog when its confirmation is disabled", async () => {
    const request: CloseRequest = {
      kind: "workspace",
      workspaceId: "workspace-1",
      projectId: "project-1",
      name: "Backend",
      terminalCount: 2,
    };
    useSettingsStore.setState({ confirmWorkspaceClose: false });
    useCloseRequestStore.getState().requestClose(request);

    render(<CloseHost />);

    expect(
      screen.queryByTestId("close-workspace-dialog"),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(executeCloseMock).toHaveBeenCalledWith(request, {
        destroyWindow: undefined,
      });
    });
    expect(executeCloseMock).toHaveBeenCalledTimes(1);
  });

  it("disables only terminal confirmations when the terminal dialog choice is confirmed", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    const request: CloseRequest = {
      kind: "terminal",
      sessionId: "terminal-1",
      workspaceId: "workspace-1",
      projectId: "project-1",
      title: "Local shell",
      terminalCount: 1,
    };
    useSettingsStore.getState().setApi(api);
    useCloseRequestStore.getState().requestClose(request);
    const user = userEvent.setup();

    render(<CloseHost />);

    await user.click(
      screen.getByRole("checkbox", { name: /don't ask again/i }),
    );
    await user.click(screen.getByTestId("close-terminal-confirm"));

    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenCalledWith(
        "confirmClose.terminal",
        false,
      );
    });
    expect(useSettingsStore.getState().confirmTerminalClose).toBe(false);
    expect(useSettingsStore.getState().confirmWorkspaceClose).toBe(true);
    expect(executeCloseMock).toHaveBeenCalledWith(request, {
      destroyWindow: undefined,
    });
  });

  it("disables only workspace confirmations when the workspace dialog choice is confirmed", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    const request: CloseRequest = {
      kind: "workspace",
      workspaceId: "workspace-1",
      projectId: "project-1",
      name: "Backend",
      terminalCount: 2,
    };
    useSettingsStore.getState().setApi(api);
    useCloseRequestStore.getState().requestClose(request);
    const user = userEvent.setup();

    render(<CloseHost />);

    await user.click(
      screen.getByRole("checkbox", { name: /don't ask again/i }),
    );
    await user.click(screen.getByTestId("close-workspace-confirm"));

    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenCalledWith(
        "confirmClose.workspace",
        false,
      );
    });
    expect(useSettingsStore.getState().confirmWorkspaceClose).toBe(false);
    expect(useSettingsStore.getState().confirmTerminalClose).toBe(true);
    expect(executeCloseMock).toHaveBeenCalledWith(request, {
      destroyWindow: undefined,
    });
  });
});
