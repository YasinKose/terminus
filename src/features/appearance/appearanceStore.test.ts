import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportError } from "@/lib/errors";
import {
  getDefaultTerminalRuntimeRegistry,
  resetDefaultTerminalRuntimeRegistryForTests,
} from "@/features/terminal/runtime/TerminalRuntimeRegistry";
import type { SettingsApi } from "@/lib/tauri/settings";
import { DEFAULT_APPEARANCE } from "./presets";
import { useAppearanceStore } from "./appearanceStore";

vi.mock("@/lib/errors", () => ({
  reportError: vi.fn(),
}));

describe("appearanceStore", () => {
  beforeEach(() => {
    resetDefaultTerminalRuntimeRegistryForTests();
    vi.mocked(reportError).mockClear();
  });

  it("does not report an error before the terminal registry is initialized", () => {
    useAppearanceStore.getState().hydrateFromBootstrap({});

    expect(reportError).not.toHaveBeenCalled();
  });

  it("persists terminal typography and applies it to live runtimes", async () => {
    const applyAppearance = vi.fn();
    const registry = getDefaultTerminalRuntimeRegistry(() => ({
      open: vi.fn(),
      write: vi.fn(),
      focus: vi.fn(),
      fit: vi.fn(),
      dispose: vi.fn(),
      applyAppearance,
    }));
    registry.acquire("terminal-1");
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useAppearanceStore.getState().setApi(api);
    useAppearanceStore.setState({
      appearance: {
        ...DEFAULT_APPEARANCE,
        terminal: { ...DEFAULT_APPEARANCE.terminal },
      },
    });

    const setTerminalFontSize = (
      useAppearanceStore.getState() as unknown as {
        setTerminalFontSize?: (fontSize: number) => Promise<void>;
      }
    ).setTerminalFontSize;

    expect(setTerminalFontSize).toBeTypeOf("function");
    await setTerminalFontSize?.(18);

    expect(api.saveSetting).toHaveBeenCalledWith(
      "appearance",
      expect.objectContaining({
        terminal: expect.objectContaining({ fontSize: 18 }),
      }),
    );
    expect(applyAppearance).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSize: 18,
        theme: expect.objectContaining({
          background: expect.any(String),
        }),
      }),
    );
  });
});
