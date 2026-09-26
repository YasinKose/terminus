import type { DesktopPlatform } from "@/platform/detection";

export type ClipboardKeyEvent = {
  type: string;
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

/**
 * - `copy`: copy the selection, do not forward the key to the PTY
 * - `paste`: let the browser fire its native paste event (xterm handles it)
 * - `ignore`: swallow the key without forwarding it
 * - `pass`: normal xterm handling (forward to the PTY)
 */
export type ClipboardKeyAction = "copy" | "paste" | "ignore" | "pass";

/**
 * Windows Terminal style clipboard keys for non-mac platforms. On macOS the
 * Cmd based menu handles copy/paste, so Ctrl chords stay terminal control keys.
 */
export function resolveClipboardKeyAction(
  event: ClipboardKeyEvent,
  context: { platform: DesktopPlatform; hasSelection: boolean },
): ClipboardKeyAction {
  if (context.platform === "macos") return "pass";
  if (event.type !== "keydown") return "pass";
  if (!event.ctrlKey || event.altKey || event.metaKey) return "pass";

  const key = event.key.toLowerCase();
  if (key === "v") return "paste";
  if (key !== "c") return "pass";

  if (context.hasSelection) return "copy";
  return event.shiftKey ? "ignore" : "pass";
}
