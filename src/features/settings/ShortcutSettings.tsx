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
import { Keyboard, RotateCcw } from "lucide-react";

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
        <div>
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Click a key chord, then press a new combination.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void resetAllShortcuts().then(() => setMessage(null));
          }}
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Reset defaults
        </Button>
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
        {SHORTCUT_COMMANDS.map((cmd) => (
          <li
            key={cmd.id}
            className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-border bg-surface-sunken/45 px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Keyboard
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <span className="truncate text-xs font-medium">{cmd.label}</span>
            </span>
            <button
              type="button"
              aria-label={`Change shortcut for ${cmd.label}`}
              className={`min-w-24 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] tabular-nums outline-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35 ${
                recording === cmd.id
                  ? "border-ring bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_15%,transparent)]"
                  : "border-input bg-surface-raised text-foreground hover:border-muted-foreground/50 hover:bg-accent"
              }`}
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
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  );
}
