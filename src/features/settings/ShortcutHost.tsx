import { useEffect } from "react";
import type { CommandContext } from "@/features/command-palette/commandRegistry";
import {
  chordFromKeyboardEvent,
  isUnmodifiedTerminalKeystroke,
  matchCommand,
  type ShortcutCommandId,
} from "./shortcutModel";
import { useSettingsStore } from "./settingsStore";

function isEditableTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function isTerminalInputTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  return (
    target.classList.contains("xterm-helper-textarea") ||
    target.closest(".xterm") !== null
  );
}

function runCommand(id: ShortcutCommandId, ctx: CommandContext): void {
  switch (id) {
    case "commandPalette":
      void ctx.openPalette();
      break;
    case "newWorkspace":
      void ctx.newWorkspace();
      break;
    case "newTerminal":
      void ctx.newTerminal();
      break;
    case "splitHorizontal":
      void ctx.splitHorizontal();
      break;
    case "splitVertical":
      void ctx.splitVertical();
      break;
    case "closePane":
      ctx.closePane();
      break;
    case "toggleFocus":
      ctx.toggleFocus();
      break;
    case "toggleSidebar":
      ctx.toggleSidebar();
      break;
    case "nextWorkspace":
      void ctx.nextWorkspace();
      break;
    case "prevWorkspace":
      void ctx.prevWorkspace();
      break;
    case "openSettings":
      ctx.openSettings();
      break;
  }
}

export function ShortcutHost({ context }: { context: CommandContext }) {
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isEditableTarget(target) && !isTerminalInputTarget(target)) {
        return;
      }

      const chord = chordFromKeyboardEvent(e);
      if (isUnmodifiedTerminalKeystroke(chord)) {
        return;
      }
      const id = matchCommand(shortcuts, chord);
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      runCommand(id, context);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [context, shortcuts]);

  return null;
}
