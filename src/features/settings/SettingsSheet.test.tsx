import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsApi } from "@/lib/tauri/settings";
import { SettingsSheet } from "./SettingsSheet";
import { useSettingsStore } from "./settingsStore";
import i18n from "@/i18n";
import { useAppearanceStore } from "@/features/appearance/appearanceStore";
import { DEFAULT_APPEARANCE } from "@/features/appearance/presets";

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
    useAppearanceStore.setState({
      appearance: {
        ...DEFAULT_APPEARANCE,
        terminal: { ...DEFAULT_APPEARANCE.terminal },
      },
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

  it("offers accessible professional terminal appearance controls", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    useAppearanceStore.getState().setApi(api);
    const user = userEvent.setup();

    render(<SettingsSheet />);

    await user.click(screen.getByRole("button", { name: /appearance/i }));

    expect(
      screen.getByRole("heading", { name: "Terminal typography" }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Terminal appearance preview"),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Terminal font" }),
    ).toHaveValue("jetbrains-mono");
    expect(
      screen.getByRole("option", { name: "JetBrains Mono" }),
    ).toBeVisible();
    expect(screen.getByRole("slider", { name: "Font size" })).toHaveValue("14");
    expect(screen.getByRole("slider", { name: "Line height" })).toHaveValue(
      "1.25",
    );
    expect(
      screen.getByRole("radiogroup", { name: "Cursor style" }),
    ).toBeVisible();
    expect(
      screen.getByRole("switch", { name: "Blinking cursor" }),
    ).toBeChecked();
  });

  it("persists live terminal font and cursor choices", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    useAppearanceStore.getState().setApi(api);
    const user = userEvent.setup();

    render(<SettingsSheet />);
    await user.click(screen.getByRole("button", { name: /appearance/i }));

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Terminal font" }),
      "system-mono",
    );
    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenLastCalledWith(
        "appearance",
        expect.objectContaining({
          terminal: expect.objectContaining({ fontFamily: "system-mono" }),
        }),
      );
    });

    fireEvent.change(screen.getByRole("slider", { name: "Font size" }), {
      target: { value: "16" },
    });
    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenLastCalledWith(
        "appearance",
        expect.objectContaining({
          terminal: expect.objectContaining({ fontSize: 16 }),
        }),
      );
    });

    fireEvent.change(screen.getByRole("slider", { name: "Line height" }), {
      target: { value: "1.4" },
    });
    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenLastCalledWith(
        "appearance",
        expect.objectContaining({
          terminal: expect.objectContaining({ lineHeight: 1.4 }),
        }),
      );
    });

    await user.click(screen.getByRole("radio", { name: "Bar" }));
    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenLastCalledWith(
        "appearance",
        expect.objectContaining({
          terminal: expect.objectContaining({ cursorStyle: "bar" }),
        }),
      );
    });

    await user.click(
      screen.getByRole("switch", { name: "Blinking cursor" }),
    );
    await waitFor(() => {
      expect(api.saveSetting).toHaveBeenLastCalledWith(
        "appearance",
        expect.objectContaining({
          terminal: expect.objectContaining({ cursorBlink: false }),
        }),
      );
    });
  });
});
