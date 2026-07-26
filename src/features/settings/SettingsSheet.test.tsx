import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsApi } from "@/lib/tauri/settings";
import { SettingsSheet } from "./SettingsSheet";
import { useSettingsStore } from "./settingsStore";
import i18n from "@/i18n";

describe("SettingsSheet confirmations", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    useSettingsStore.setState({
      settingsOpen: true,
      settingsTab: "shortcuts",
      shortcutRecording: false,
      confirmTerminalClose: true,
      confirmWorkspaceClose: true,
    });
  });

  it("exposes independent terminal and workspace confirmation checkboxes", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    const user = userEvent.setup();

    render(<SettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: /confirmations/i }),
    );

    const terminalConfirmation = screen.getByRole("checkbox", {
      name: /ask before closing a terminal/i,
    });
    const workspaceConfirmation = screen.getByRole("checkbox", {
      name: /ask before closing a workspace/i,
    });

    expect(terminalConfirmation).toBeChecked();
    expect(workspaceConfirmation).toBeChecked();

    await user.click(terminalConfirmation);

    expect(api.saveSetting).toHaveBeenCalledWith(
      "confirmClose.terminal",
      false,
    );
    expect(terminalConfirmation).not.toBeChecked();
    expect(workspaceConfirmation).toBeChecked();
  });

  it("offers English and Turkish in appearance settings", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    const user = userEvent.setup();

    render(<SettingsSheet />);

    await user.click(screen.getByRole("button", { name: /appearance/i }));

    expect(
      screen.getByRole("combobox", { name: /application language/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Türkçe" })).toBeInTheDocument();
  });

  it("switches the open settings UI to Turkish immediately", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    const user = userEvent.setup();

    render(<SettingsSheet />);

    await user.click(screen.getByRole("button", { name: /appearance/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /application language/i }),
      "tr",
    );

    expect(
      await screen.findByRole("heading", { name: "Ayarlar" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Görünüm" })).toBeVisible();
    expect(api.saveSetting).toHaveBeenCalledWith("ui.language", "tr");
  });
});
