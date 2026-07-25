import { create } from "zustand";
import {
  tauriSettingsApi,
  type SettingsApi,
} from "@/lib/tauri/settings";
import {
  DEFAULT_SHORTCUTS,
  findConflicts,
  isUnmodifiedTerminalKeystroke,
  parseShortcutMap,
  resetShortcuts,
  type ShortcutChord,
  type ShortcutCommandId,
  type ShortcutMap,
} from "./shortcutModel";

const SHORTCUTS_KEY = "shortcuts";
const CONFIRM_TERMINAL_CLOSE_KEY = "confirmClose.terminal";
const CONFIRM_WORKSPACE_CLOSE_KEY = "confirmClose.workspace";

export interface SettingsStoreState {
  shortcuts: ShortcutMap;
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
  resetAllShortcuts: () => Promise<void>;
}

let api: SettingsApi = tauriSettingsApi;

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  shortcuts: { ...DEFAULT_SHORTCUTS },
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
    const parsed = parseShortcutMap(settings[SHORTCUTS_KEY]);
    const confirmTerminalClose = settings[CONFIRM_TERMINAL_CLOSE_KEY];
    const confirmWorkspaceClose = settings[CONFIRM_WORKSPACE_CLOSE_KEY];
    set({
      ...(parsed ? { shortcuts: parsed } : {}),
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

  resetAllShortcuts: async () => {
    const next = resetShortcuts();
    await api.saveSetting(SHORTCUTS_KEY, next);
    set({ shortcuts: next });
  },
}));
