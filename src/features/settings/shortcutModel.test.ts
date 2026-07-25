import { describe, expect, it } from "vitest";
import {
  chordFromKeyboardEvent,
  DEFAULT_SHORTCUTS,
  findConflicts,
  formatChordMac,
  isUnmodifiedTerminalKeystroke,
  matchCommand,
  normalizeKey,
  parseShortcutMap,
  resetShortcuts,
  type ShortcutMap,
} from "./shortcutModel";

describe("shortcutModel", () => {
  it("normalizes keys to lowercase single chars", () => {
    expect(normalizeKey("K")).toBe("k");
    expect(normalizeKey("ArrowUp")).toBe("arrowup");
    expect(normalizeKey(" ")).toBe("space");
  });

  it("builds chord from keyboard event", () => {
    expect(
      chordFromKeyboardEvent({
        key: "K",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      }),
    ).toEqual({ key: "k", meta: true, ctrl: false, alt: false, shift: false });
  });

  it("formats macOS labels", () => {
    expect(
      formatChordMac({
        key: "k",
        meta: true,
        ctrl: false,
        alt: false,
        shift: false,
      }),
    ).toBe("⌘K");
    expect(
      formatChordMac({
        key: "d",
        meta: true,
        ctrl: false,
        alt: false,
        shift: true,
      }),
    ).toBe("⇧⌘D");
  });

  it("detects exact conflicts", () => {
    const map: ShortcutMap = {
      ...DEFAULT_SHORTCUTS,
      newTerminal: { ...DEFAULT_SHORTCUTS.commandPalette },
    };
    const conflicts = findConflicts(map);
    expect(conflicts.some((c) => c.a === "commandPalette" || c.b === "commandPalette")).toBe(
      true,
    );
  });

  it("reports no conflicts for defaults", () => {
    expect(findConflicts(DEFAULT_SHORTCUTS)).toEqual([]);
  });

  it("resets to defaults", () => {
    const mutated = { ...DEFAULT_SHORTCUTS };
    mutated.closePane = {
      key: "x",
      meta: true,
      ctrl: false,
      alt: false,
      shift: false,
    };
    expect(resetShortcuts().closePane).toEqual(DEFAULT_SHORTCUTS.closePane);
  });

  it("refuses unmodified terminal keystrokes", () => {
    expect(
      isUnmodifiedTerminalKeystroke({
        key: "a",
        meta: false,
        ctrl: false,
        alt: false,
        shift: false,
      }),
    ).toBe(true);
    expect(
      isUnmodifiedTerminalKeystroke({
        key: "a",
        meta: false,
        ctrl: false,
        alt: false,
        shift: true,
      }),
    ).toBe(true);
    expect(
      isUnmodifiedTerminalKeystroke({
        key: "a",
        meta: true,
        ctrl: false,
        alt: false,
        shift: false,
      }),
    ).toBe(false);
    expect(
      isUnmodifiedTerminalKeystroke({
        key: "escape",
        meta: false,
        ctrl: false,
        alt: false,
        shift: false,
      }),
    ).toBe(false);
  });

  it("matches commands from map", () => {
    expect(
      matchCommand(DEFAULT_SHORTCUTS, {
        key: "k",
        meta: true,
        ctrl: false,
        alt: false,
        shift: false,
      }),
    ).toBe("commandPalette");
  });

  it("parses partial stored maps with defaults fill", () => {
    const parsed = parseShortcutMap({
      commandPalette: {
        key: "p",
        meta: true,
        ctrl: false,
        alt: false,
        shift: false,
      },
    });
    expect(parsed?.commandPalette.key).toBe("p");
    expect(parsed?.newTerminal).toEqual(DEFAULT_SHORTCUTS.newTerminal);
  });
});
