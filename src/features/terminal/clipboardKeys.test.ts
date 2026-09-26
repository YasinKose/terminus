import { describe, expect, it } from "vitest";
import { resolveClipboardKeyAction, type ClipboardKeyEvent } from "./clipboardKeys";

function key(
  k: string,
  mods: Partial<Omit<ClipboardKeyEvent, "key">> = {},
): ClipboardKeyEvent {
  return {
    type: "keydown",
    key: k,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...mods,
  };
}

describe("resolveClipboardKeyAction (windows / linux)", () => {
  const ctx = { platform: "windows" as const, hasSelection: false };
  const withSelection = { ...ctx, hasSelection: true };

  it("copies on Ctrl+C when text is selected", () => {
    expect(resolveClipboardKeyAction(key("c", { ctrlKey: true }), withSelection)).toBe(
      "copy",
    );
  });

  it("sends Ctrl+C to the shell as an interrupt when nothing is selected", () => {
    expect(resolveClipboardKeyAction(key("c", { ctrlKey: true }), ctx)).toBe("pass");
  });

  it("pastes on Ctrl+V", () => {
    expect(resolveClipboardKeyAction(key("v", { ctrlKey: true }), ctx)).toBe("paste");
  });

  it("copies and pastes on Ctrl+Shift+C / Ctrl+Shift+V", () => {
    expect(
      resolveClipboardKeyAction(key("C", { ctrlKey: true, shiftKey: true }), withSelection),
    ).toBe("copy");
    expect(
      resolveClipboardKeyAction(key("V", { ctrlKey: true, shiftKey: true }), ctx),
    ).toBe("paste");
  });

  it("swallows Ctrl+Shift+C without a selection instead of sending a control byte", () => {
    expect(
      resolveClipboardKeyAction(key("C", { ctrlKey: true, shiftKey: true }), ctx),
    ).toBe("ignore");
  });

  it("leaves Ctrl+Alt chords (app shortcuts such as split) alone", () => {
    expect(
      resolveClipboardKeyAction(key("v", { ctrlKey: true, altKey: true }), ctx),
    ).toBe("pass");
  });

  it("only acts on keydown", () => {
    expect(
      resolveClipboardKeyAction({ ...key("v", { ctrlKey: true }), type: "keyup" }, ctx),
    ).toBe("pass");
  });

  it("applies the same bindings on linux", () => {
    expect(
      resolveClipboardKeyAction(key("v", { ctrlKey: true }), { ...ctx, platform: "linux" }),
    ).toBe("paste");
  });
});

describe("resolveClipboardKeyAction (macos)", () => {
  const ctx = { platform: "macos" as const, hasSelection: true };

  it("keeps Ctrl+C and Ctrl+V as terminal control keys", () => {
    expect(resolveClipboardKeyAction(key("c", { ctrlKey: true }), ctx)).toBe("pass");
    expect(resolveClipboardKeyAction(key("v", { ctrlKey: true }), ctx)).toBe("pass");
  });
});
