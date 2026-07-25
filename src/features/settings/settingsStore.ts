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

export interface SettingsStoreState {
  shortcuts: ShortcutMap;
  settingsOpen: boolean;
  settingsTab: "profiles" | "shortcuts" | "appearance";
  focusMode: boolean;
  setApi: (api: SettingsApi) => void;
  hydrateFromBootstrap: (settings: Record<string, unknown>) => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: SettingsStoreState["settingsTab"]) => void;
  setFocusMode: (on: boolean) => void;
  toggleFocusMode: () => void;
  setShortcut: (
    id: ShortcutCommandId,
    chord: ShortcutChord,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  resetAllShortcuts: () => Promise<void>;
}

let api: SettingsApi = tauriSettingsApi;

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  shortcuts: { ...DEFAULT_SHORTCUTS },
  settingsOpen: false,
  settingsTab: "shortcuts",
  focusMode: false,

  setApi: (next) => {
    api = next;
  },

  hydrateFromBootstrap: (settings) => {
    const parsed = parseShortcutMap(settings[SHORTCUTS_KEY]);
    if (parsed) {
      set({ shortcuts: parsed });
    }
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setFocusMode: (on) => set({ focusMode: on }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

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
