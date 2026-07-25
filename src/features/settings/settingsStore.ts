import { create } from "zustand";
import {
  tauriSettingsApi,
  type SettingsApi,
} from "@/lib/tauri/settings";
import {
  DEFAULT_NAVIGATOR_MODIFIERS,
  defaultShortcutsForPlatform,
  findConflicts,
  isValidModifierChord,
  isUnmodifiedTerminalKeystroke,
  parseModifierChord,
  parseShortcutMap,
  resetShortcuts,
  type ModifierChord,
  type ShortcutChord,
  type ShortcutCommandId,
  type ShortcutMap,
} from "./shortcutModel";
import { detectDesktopPlatform } from "@/platform/detection";

const SHORTCUTS_KEY = "shortcuts";
const NAVIGATOR_MODIFIERS_KEY = "shortcuts.navigatorModifiers";
const CONFIRM_TERMINAL_CLOSE_KEY = "confirmClose.terminal";
const CONFIRM_WORKSPACE_CLOSE_KEY = "confirmClose.workspace";

export interface SettingsStoreState {
  shortcuts: ShortcutMap;
  navigatorModifiers: ModifierChord;
  shortcutRecording: boolean;
  settingsOpen: boolean;
  settingsTab: "profiles" | "shortcuts" | "confirmations" | "appearance";
  focusMode: boolean;
  confirmTerminalClose: boolean;
  confirmWorkspaceClose: boolean;
  setApi: (api: SettingsApi) => void;
  setShortcutRecording: (recording: boolean) => void;
  hydrateFromBootstrap: (settings: Record<string, unknown>) => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: SettingsStoreState["settingsTab"]) => void;
  setFocusMode: (on: boolean) => void;
  toggleFocusMode: () => void;
  setConfirmTerminalClose: (confirm: boolean) => Promise<void>;
  setConfirmWorkspaceClose: (confirm: boolean) => Promise<void>;
  setShortcut: (
    id: ShortcutCommandId,
    chord: ShortcutChord,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  setNavigatorModifiers: (
    chord: ModifierChord,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  resetAllShortcuts: () => Promise<void>;
}

let api: SettingsApi = tauriSettingsApi;

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  shortcuts: defaultShortcutsForPlatform(detectDesktopPlatform()),
  navigatorModifiers: { ...DEFAULT_NAVIGATOR_MODIFIERS },
  shortcutRecording: false,
  settingsOpen: false,
  settingsTab: "shortcuts",
  focusMode: false,
  confirmTerminalClose: true,
  confirmWorkspaceClose: true,

  setApi: (next) => {
    api = next;
  },
  setShortcutRecording: (recording) => set({ shortcutRecording: recording }),

  hydrateFromBootstrap: (settings) => {
    const parsed = parseShortcutMap(
      settings[SHORTCUTS_KEY],
      defaultShortcutsForPlatform(detectDesktopPlatform()),
    );
    const navigatorModifiers = parseModifierChord(
      settings[NAVIGATOR_MODIFIERS_KEY],
    );
    const confirmTerminalClose = settings[CONFIRM_TERMINAL_CLOSE_KEY];
    const confirmWorkspaceClose = settings[CONFIRM_WORKSPACE_CLOSE_KEY];
    set({
      ...(parsed ? { shortcuts: parsed } : {}),
      navigatorModifiers:
        navigatorModifiers ?? { ...DEFAULT_NAVIGATOR_MODIFIERS },
      confirmTerminalClose:
        typeof confirmTerminalClose === "boolean"
          ? confirmTerminalClose
          : true,
      confirmWorkspaceClose:
        typeof confirmWorkspaceClose === "boolean"
          ? confirmWorkspaceClose
          : true,
    });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setFocusMode: (on) => set({ focusMode: on }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setConfirmTerminalClose: async (confirm) => {
    await api.saveSetting(CONFIRM_TERMINAL_CLOSE_KEY, confirm);
    set({ confirmTerminalClose: confirm });
  },
  setConfirmWorkspaceClose: async (confirm) => {
    await api.saveSetting(CONFIRM_WORKSPACE_CLOSE_KEY, confirm);
    set({ confirmWorkspaceClose: confirm });
  },

  setShortcut: async (id, chord) => {
    if (isUnmodifiedTerminalKeystroke(chord)) {
      return {
        ok: false,
        reason: "Cannot bind unmodified terminal keystrokes",
      };
    }
    const next: ShortcutMap = { ...get().shortcuts, [id]: chord };
    const conflicts = findConflicts(next);
    if (conflicts.length > 0) {
      return { ok: false, reason: "Shortcut conflicts with another command" };
    }
    await api.saveSetting(SHORTCUTS_KEY, next);
    set({ shortcuts: next });
    return { ok: true };
  },

  setNavigatorModifiers: async (chord) => {
    if (!isValidModifierChord(chord)) {
      return {
        ok: false,
        reason: "Use at least two modifier keys",
      };
    }
    await api.saveSetting(NAVIGATOR_MODIFIERS_KEY, chord);
    set({ navigatorModifiers: chord });
    return { ok: true };
  },

  resetAllShortcuts: async () => {
    const next =
      detectDesktopPlatform() === "macos"
        ? resetShortcuts()
        : defaultShortcutsForPlatform(detectDesktopPlatform());
    const navigatorModifiers = { ...DEFAULT_NAVIGATOR_MODIFIERS };
    await Promise.all([
      api.saveSetting(SHORTCUTS_KEY, next),
      api.saveSetting(NAVIGATOR_MODIFIERS_KEY, navigatorModifiers),
    ]);
    set({ shortcuts: next, navigatorModifiers });
  },
}));
