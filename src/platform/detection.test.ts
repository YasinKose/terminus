import { describe, expect, it } from "vitest";
import {
  detectDesktopPlatform,
  isAppleDesktop,
} from "@/platform/detection";
import {
  defaultShortcutsForPlatform,
  formatChord,
} from "@/features/settings/shortcutModel";

describe("desktop platform presentation", () => {
  it("detects macOS, Windows, and Linux user agents", () => {
    expect(
      detectDesktopPlatform({ platform: "MacIntel", userAgent: "Mac OS X" }),
    ).toBe("macos");
    expect(
      detectDesktopPlatform({ platform: "Win32", userAgent: "Windows NT" }),
    ).toBe("windows");
    expect(
      detectDesktopPlatform({ platform: "Linux x86_64", userAgent: "Linux" }),
    ).toBe("linux");
    expect(isAppleDesktop({ platform: "MacIntel", userAgent: "" })).toBe(true);
  });

  it("uses native modifier labels for each desktop family", () => {
    const chord = {
      key: "k",
      meta: true,
      ctrl: true,
      alt: false,
      shift: true,
    };
    expect(formatChord(chord, "macos")).toBe("⌃⇧⌘K");
    expect(formatChord(chord, "windows")).toBe("Ctrl+Shift+Win+K");
    expect(formatChord(chord, "linux")).toBe("Ctrl+Shift+Super+K");
  });

  it("does not require the Windows key for non-macOS defaults", () => {
    const windows = defaultShortcutsForPlatform("windows");
    const linux = defaultShortcutsForPlatform("linux");

    expect(Object.values(windows).every((chord) => !chord.meta)).toBe(true);
    expect(Object.values(linux).every((chord) => !chord.meta)).toBe(true);
    expect(windows.commandPalette).toMatchObject({
      key: "p",
      ctrl: true,
      shift: true,
    });
  });
});
