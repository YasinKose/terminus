import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  chordFromKeyboardEvent,
  formatChordMac,
  isUnmodifiedTerminalKeystroke,
  SHORTCUT_COMMANDS,
  type ShortcutCommandId,
} from "./shortcutModel";
import { useSettingsStore } from "./settingsStore";

export function ShortcutSettings() {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const setShortcut = useSettingsStore((s) => s.setShortcut);
  const resetAllShortcuts = useSettingsStore((s) => s.resetAllShortcuts);
  const [recording, setRecording] = useState<ShortcutCommandId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onKeyDown = async (
    e: React.KeyboardEvent,
    id: ShortcutCommandId,
  ) => {
    if (recording !== id) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setRecording(null);
      return;
    }
    if (e.key === "Meta" || e.key === "Control" || e.key === "Alt" || e.key === "Shift") {
      return;
    }
    const chord = chordFromKeyboardEvent(e);
    if (isUnmodifiedTerminalKeystroke(chord)) {
      setMessage("Cannot bind unmodified terminal keystrokes");
      setRecording(null);
      return;
    }
    const result = await setShortcut(id, chord);
    if (!result.ok) {
      setMessage(result.reason);
    } else {
      setMessage(null);
    }
    setRecording(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Shortcuts</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void resetAllShortcuts().then(() => setMessage(null));
          }}
        >
          Reset defaults
        </Button>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
        {SHORTCUT_COMMANDS.map((cmd) => (
          <li
            key={cmd.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
          >
            <span className="text-xs">{cmd.label}</span>
            <button
              type="button"
              className="min-w-24 rounded border border-input bg-muted/40 px-2 py-1 font-mono text-xs"
              onClick={() => {
                setRecording(cmd.id);
                setMessage(null);
              }}
              onKeyDown={(e) => {
                void onKeyDown(e, cmd.id);
              }}
            >
              {recording === cmd.id
                ? "Press keys…"
                : formatChordMac(shortcuts[cmd.id])}
            </button>
          </li>
        ))}
      </ul>

      {message && (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
