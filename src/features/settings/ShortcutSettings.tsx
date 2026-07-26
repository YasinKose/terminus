import {
  parseHotkey,
  useHotkeyRecorder,
  type Hotkey,
} from "@tanstack/react-hotkeys";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatChord,
  formatModifierChord,
  isModifierKey,
  isUnmodifiedTerminalKeystroke,
  isValidModifierChord,
  modifierChordFromKeyboardEvent,
  normalizeKey,
  SHORTCUT_COMMANDS,
  type ModifierChord,
  type ShortcutCommandId,
} from "./shortcutModel";
import { useSettingsStore } from "./settingsStore";
import { Keyboard, Layers3, RotateCcw } from "lucide-react";
import {
  detectDesktopPlatform,
} from "@/platform/detection";
import { useTranslation } from "react-i18next";

type RecordingTarget = ShortcutCommandId | "workspaceNavigator";

export function ShortcutSettings() {
  const { t } = useTranslation();
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const navigatorModifiers = useSettingsStore((s) => s.navigatorModifiers);
  const setShortcut = useSettingsStore((s) => s.setShortcut);
  const setNavigatorModifiers = useSettingsStore(
    (s) => s.setNavigatorModifiers,
  );
  const resetAllShortcuts = useSettingsStore((s) => s.resetAllShortcuts);
  const setShortcutRecording = useSettingsStore(
    (s) => s.setShortcutRecording,
  );
  const [recording, setRecording] = useState<RecordingTarget | null>(null);
  const [modifierPreview, setModifierPreview] =
    useState<ModifierChord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const modifierCandidateRef = useRef<ModifierChord | null>(null);

  const finishRecording = useCallback(() => {
    modifierCandidateRef.current = null;
    setModifierPreview(null);
    setRecording(null);
    setShortcutRecording(false);
  }, [setShortcutRecording]);

  const recorder = useHotkeyRecorder({
    ignoreInputs: false,
    onCancel: finishRecording,
    onRecord: (hotkey: Hotkey) => {
      const id = recording;
      finishRecording();
      if (!id || id === "workspaceNavigator" || !hotkey) {
        setMessage(t("settings.shortcuts.messages.empty"));
        return;
      }

      const platform = detectDesktopPlatform();
      const parsed = parseHotkey(
        hotkey,
        platform === "macos"
          ? "mac"
          : platform === "windows"
            ? "windows"
            : "linux",
      );
      const chord = {
        key: normalizeKey(parsed.key),
        meta: parsed.meta,
        ctrl: parsed.ctrl,
        alt: parsed.alt,
        shift: parsed.shift,
      };
      if (isUnmodifiedTerminalKeystroke(chord)) {
        setMessage(t("settings.shortcuts.messages.unmodified"));
        return;
      }

      void setShortcut(id, chord).then((result) => {
        if (!result.ok) {
          setMessage(result.reason);
        } else {
          setMessage(null);
        }
      });
    },
  });

  useEffect(() => {
    if (recording !== "workspaceNavigator") return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setMessage(null);
        finishRecording();
        return;
      }
      if (!isModifierKey(event.key)) {
        setMessage(t("settings.shortcuts.messages.modifiersOnly"));
        return;
      }

      const chord = modifierChordFromKeyboardEvent(event);
      modifierCandidateRef.current = chord;
      setModifierPreview(chord);
      setMessage(null);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!isModifierKey(event.key)) return;
      event.preventDefault();
      event.stopPropagation();

      const chord = modifierCandidateRef.current;
      if (!chord || !isValidModifierChord(chord)) {
        modifierCandidateRef.current = null;
        setModifierPreview(null);
        setMessage(t("settings.shortcuts.messages.twoModifiers"));
        return;
      }

      finishRecording();
      void setNavigatorModifiers(chord)
        .then((result) => {
          setMessage(result.ok ? null : result.reason);
        })
        .catch(() => {
          setMessage(t("settings.shortcuts.messages.saveFailed"));
        });
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [finishRecording, recording, setNavigatorModifiers, t]);

  useEffect(() => {
    return () => setShortcutRecording(false);
  }, [setShortcutRecording]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">
            {t("settings.shortcuts.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("settings.shortcuts.description")}
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
          {t("settings.shortcuts.resetDefaults")}
        </Button>
      </div>

      <section
        className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-primary/25 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_9%,var(--surface-raised)),var(--surface-sunken))] p-3 shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]"
        aria-labelledby="workspace-navigator-shortcut"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Layers3 aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h3
              id="workspace-navigator-shortcut"
              className="block text-xs font-semibold"
            >
              {t("settings.shortcuts.navigator.title")}
            </h3>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground text-pretty">
              {t("settings.shortcuts.navigator.description")}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("settings.shortcuts.navigator.change")}
          className={`min-h-9 min-w-24 rounded-lg border px-3 py-1.5 font-mono text-xs tabular-nums outline-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35 ${
            recording === "workspaceNavigator"
              ? "border-ring bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_15%,transparent)]"
              : "border-input bg-surface-raised text-foreground hover:border-muted-foreground/50 hover:bg-accent"
          }`}
          onClick={() => {
            if (recorder.isRecording) {
              recorder.cancelRecording();
            }
            modifierCandidateRef.current = null;
            setModifierPreview(null);
            setRecording("workspaceNavigator");
            setShortcutRecording(true);
            setMessage(null);
          }}
        >
          {recording === "workspaceNavigator"
            ? modifierPreview
              ? formatModifierChord(
                  modifierPreview,
                  detectDesktopPlatform(),
                )
              : t("settings.shortcuts.navigator.pressModifiers")
            : formatModifierChord(
                navigatorModifiers,
                detectDesktopPlatform(),
              )}
        </button>
      </section>

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
              <span className="truncate text-xs font-medium">
                {t(`commands.${cmd.id}`)}
              </span>
            </span>
            <button
              type="button"
              aria-label={t("settings.shortcuts.changeCommand", {
                command: t(`commands.${cmd.id}`),
              })}
              className={`min-w-24 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] tabular-nums outline-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35 ${
                recording === cmd.id
                  ? "border-ring bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_15%,transparent)]"
                  : "border-input bg-surface-raised text-foreground hover:border-muted-foreground/50 hover:bg-accent"
              }`}
              onClick={() => {
                if (recorder.isRecording) {
                  recorder.cancelRecording();
                }
                if (recording === "workspaceNavigator") {
                  finishRecording();
                }
                setRecording(cmd.id);
                setShortcutRecording(true);
                setMessage(null);
                recorder.startRecording();
              }}
            >
              {recording === cmd.id
                ? t("settings.shortcuts.pressKeys")
                : formatChord(shortcuts[cmd.id], detectDesktopPlatform())}
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
