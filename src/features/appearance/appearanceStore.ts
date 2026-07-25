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
  xtermThemeFromPreset,
} from "./presets";
import {
  getDefaultTerminalRuntimeRegistry,
} from "@/features/terminal/runtime/TerminalRuntimeRegistry";

const APPEARANCE_KEY = "appearance";

type ThemeListener = (presetId: PresetId) => void;

const themeListeners = new Set<ThemeListener>();

export function subscribeTheme(listener: ThemeListener): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function notifyTheme(presetId: PresetId): void {
  for (const listener of themeListeners) {
    listener(presetId);
  }
  try {
    const registry = getDefaultTerminalRuntimeRegistry();
    for (const id of registry.listIds()) {
      registry.get(id)?.applyTheme?.(xtermThemeFromPreset(presetId));
    }
  } catch {
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
  notifyTheme(next.presetId);
}

export const useAppearanceStore = create<AppearanceStoreState>((set, get) => ({
  appearance: { ...DEFAULT_APPEARANCE },

  setApi: (next) => {
    api = next;
  },

  hydrateFromBootstrap: (settings) => {
    const parsed = parseAppearanceSettings(settings[APPEARANCE_KEY]);
    const appearance = parsed ?? { ...DEFAULT_APPEARANCE };
    set({ appearance });
    applyAppearanceToDocument(appearance);
    notifyTheme(appearance.presetId);
  },

  applyToDocument: () => {
    applyAppearanceToDocument(get().appearance);
    notifyTheme(get().appearance.presetId);
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
}));
