import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsApi } from "@/lib/tauri/settings";
import { DEFAULT_SHORTCUTS } from "./shortcutModel";
import { useSettingsStore } from "./settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      shortcuts: { ...DEFAULT_SHORTCUTS },
      settingsOpen: false,
      settingsTab: "shortcuts",
      focusMode: false,
    });
  });

  it("hydrates shortcuts from bootstrap", () => {
    useSettingsStore.getState().hydrateFromBootstrap({
      shortcuts: {
        commandPalette: {
          key: "p",
          meta: true,
          ctrl: false,
          alt: false,
          shift: false,
        },
      },
    });
    expect(useSettingsStore.getState().shortcuts.commandPalette.key).toBe("p");
  });

  it("refuses unmodified terminal keystrokes", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (p) => p),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    const result = await useSettingsStore.getState().setShortcut("newTerminal", {
      key: "a",
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
    });
    expect(result.ok).toBe(false);
    expect(api.saveSetting).not.toHaveBeenCalled();
  });

  it("persists valid shortcut", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (p) => p),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    const result = await useSettingsStore.getState().setShortcut("openSettings", {
      key: ";",
      meta: true,
      ctrl: false,
      alt: false,
      shift: false,
    });
    expect(result.ok).toBe(true);
    expect(api.saveSetting).toHaveBeenCalled();
    expect(useSettingsStore.getState().shortcuts.openSettings.key).toBe(";");
  });
});
