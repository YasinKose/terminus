import { create } from "zustand";
import {
  tauriSettingsApi,
  type SettingsApi,
} from "@/lib/tauri/settings";
import {
  DEFAULT_APPEARANCE,
  applyAppearanceToDocument,
  getPreset,
  parseAppearanceSettings,
  type AppearanceSettings,
  type PresetId,
  type TerminalCursorStyle,
  type TerminalFontFamilyId,
  terminalPresentationFromAppearance,
} from "./presets";
import {
  getDefaultTerminalRuntimeRegistryIfInitialized,
} from "@/features/terminal/runtime/TerminalRuntimeRegistry";
import { reportError } from "@/lib/errors";
import i18n from "@/i18n";

const APPEARANCE_KEY = "appearance";

type ThemeListener = (presetId: PresetId) => void;

const themeListeners = new Set<ThemeListener>();

export function subscribeTheme(listener: ThemeListener): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function notifyAppearance(appearance: AppearanceSettings): void {
  for (const listener of themeListeners) {
    listener(appearance.presetId);
  }
  const registry = getDefaultTerminalRuntimeRegistryIfInitialized();
  if (!registry) return;
  for (const id of registry.listIds()) {
    try {
      registry
        .get(id)
        ?.applyAppearance(terminalPresentationFromAppearance(appearance));
    } catch (error) {
      reportError(i18n.t("errors.applyTerminalTheme"), error);
    }
  }
}

export interface AppearanceStoreState {
  appearance: AppearanceSettings;
  setApi: (api: SettingsApi) => void;
  hydrateFromBootstrap: (settings: Record<string, unknown>) => void;
  setPreset: (id: PresetId) => Promise<void>;
  setPaneBorderWidth: (width: number) => Promise<void>;
  setPaneRadius: (radius: number) => Promise<void>;
  setActivePaneHighlight: (on: boolean) => Promise<void>;
  setTerminalFontFamily: (fontFamily: TerminalFontFamilyId) => Promise<void>;
  setTerminalFontSize: (fontSize: number) => Promise<void>;
  setTerminalLineHeight: (lineHeight: number) => Promise<void>;
  setTerminalCursorStyle: (cursorStyle: TerminalCursorStyle) => Promise<void>;
  setTerminalCursorBlink: (cursorBlink: boolean) => Promise<void>;
  applyToDocument: () => void;
}

let api: SettingsApi = tauriSettingsApi;

async function persist(
  next: AppearanceSettings,
  set: (partial: Partial<AppearanceStoreState>) => void,
): Promise<void> {
  await api.saveSetting(APPEARANCE_KEY, next);
  set({ appearance: next });
  applyAppearanceToDocument(next);
  notifyAppearance(next);
}

async function persistTerminal(
  patch: Partial<AppearanceSettings["terminal"]>,
  get: () => AppearanceStoreState,
  set: (partial: Partial<AppearanceStoreState>) => void,
): Promise<void> {
  const appearance = get().appearance;
  await persist(
    {
      ...appearance,
      terminal: {
        ...appearance.terminal,
        ...patch,
      },
    },
    set,
  );
}

export const useAppearanceStore = create<AppearanceStoreState>((set, get) => ({
  appearance: {
    ...DEFAULT_APPEARANCE,
    terminal: { ...DEFAULT_APPEARANCE.terminal },
  },

  setApi: (next) => {
    api = next;
  },

  hydrateFromBootstrap: (settings) => {
    const parsed = parseAppearanceSettings(settings[APPEARANCE_KEY]);
    const appearance = parsed ?? {
      ...DEFAULT_APPEARANCE,
      terminal: { ...DEFAULT_APPEARANCE.terminal },
    };
    set({ appearance });
    applyAppearanceToDocument(appearance);
    notifyAppearance(appearance);
  },

  applyToDocument: () => {
    applyAppearanceToDocument(get().appearance);
    notifyAppearance(get().appearance);
  },

  setPreset: async (id) => {
    if (!getPreset(id)) return;
    await persist({ ...get().appearance, presetId: id }, set);
  },

  setPaneBorderWidth: async (width) => {
    await persist(
      {
        ...get().appearance,
        paneBorderWidth: Math.min(8, Math.max(0, width)),
      },
      set,
    );
  },

  setPaneRadius: async (radius) => {
    await persist(
      {
        ...get().appearance,
        paneRadius: Math.min(24, Math.max(0, radius)),
      },
      set,
    );
  },

  setActivePaneHighlight: async (on) => {
    await persist(
      { ...get().appearance, activePaneHighlight: on },
      set,
    );
  },

  setTerminalFontFamily: async (fontFamily) => {
    await persistTerminal({ fontFamily }, get, set);
  },

  setTerminalFontSize: async (fontSize) => {
    await persistTerminal(
      { fontSize: Math.round(Math.min(20, Math.max(12, fontSize))) },
      get,
      set,
    );
  },

  setTerminalLineHeight: async (lineHeight) => {
    await persistTerminal(
      { lineHeight: Math.min(1.6, Math.max(1, lineHeight)) },
      get,
      set,
    );
  },

  setTerminalCursorStyle: async (cursorStyle) => {
    await persistTerminal({ cursorStyle }, get, set);
  },

  setTerminalCursorBlink: async (cursorBlink) => {
    await persistTerminal({ cursorBlink }, get, set);
  },
}));
