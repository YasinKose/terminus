export {
  PRESETS,
  PRESET_ORDER,
  DEFAULT_APPEARANCE,
  getPreset,
  applyAppearanceToDocument,
  xtermThemeFromPreset,
  parseAppearanceSettings,
  type PresetId,
  type AppearanceSettings as AppearanceSettingsState,
  type AppearancePreset,
} from "./presets";
export { useAppearanceStore, subscribeTheme } from "./appearanceStore";
export { AppearanceSettings } from "./AppearanceSettings";
