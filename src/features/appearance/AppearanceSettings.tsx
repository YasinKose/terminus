import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRESET_ORDER, getPreset } from "./presets";
import { useAppearanceStore } from "./appearanceStore";
import { Check, CircleDot, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/features/settings/settingsStore";
import type { SupportedLanguage } from "@/i18n";
import { reportError } from "@/lib/errors";
import { TerminalAppearanceSettings } from "./TerminalAppearanceSettings";

export function AppearanceSettings() {
  const { t } = useTranslation();
  const appearance = useAppearanceStore((s) => s.appearance);
  const setPreset = useAppearanceStore((s) => s.setPreset);
  const setPaneBorderWidth = useAppearanceStore((s) => s.setPaneBorderWidth);
  const setPaneRadius = useAppearanceStore((s) => s.setPaneRadius);
  const setActivePaneHighlight = useAppearanceStore(
    (s) => s.setActivePaneHighlight,
  );
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pr-1 pb-4">
      <header>
        <h2 className="text-sm font-semibold">
          {t("settings.appearance.title")}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("settings.appearance.description")}
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border bg-surface-sunken/45 p-4">
        <div className="flex items-start gap-2.5">
          <Languages
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          <div>
            <h3 className="text-xs font-medium text-foreground">
              {t("settings.appearance.language.title")}
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("settings.appearance.language.description")}
            </p>
          </div>
        </div>
        <Label htmlFor="application-language" className="sr-only">
          {t("settings.appearance.language.label")}
        </Label>
        <select
          id="application-language"
          value={language}
          className="h-9 w-full rounded-lg border border-input bg-surface-raised px-3 text-xs text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:bg-surface focus-visible:shadow-field-focus"
          onChange={(event) => {
            void setLanguage(event.target.value as SupportedLanguage).catch(
              (error) => {
                reportError(t("errors.changeLanguage"), error);
              },
            );
          }}
        >
          <option value="en">{t("common.languages.en")}</option>
          <option value="tr">{t("common.languages.tr")}</option>
        </select>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-medium text-foreground">
            {t("settings.appearance.colorPreset.title")}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("settings.appearance.colorPreset.description")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {PRESET_ORDER.map((id) => {
            const preset = getPreset(id);
            const selected = appearance.presetId === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`preset-${id}`}
                aria-pressed={selected}
                className={`relative flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35 ${
                  selected
                    ? "border-ring/70 bg-accent text-accent-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_18%,transparent)]"
                    : "border-border bg-surface-sunken/55 hover:border-muted-foreground/45 hover:bg-muted/70"
                }`}
                onClick={() => {
                  void setPreset(id);
                }}
              >
                <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                  {[preset.app.background, preset.app.card, preset.app.primary].map(
                    (color, index) => (
                      <span
                        key={color}
                        className="size-5 rounded-full border-2 border-surface-raised"
                        style={{ backgroundColor: color, zIndex: 3 - index }}
                      />
                    ),
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">
                    {t(`settings.appearance.presets.${id}`)}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {id === "paper"
                      ? t("settings.appearance.themeMode.light")
                      : t("settings.appearance.themeMode.dark")}
                  </span>
                </span>
                {selected ? (
                  <span className="absolute top-2 right-2 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden className="size-2.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <TerminalAppearanceSettings />

      <section className="space-y-4 rounded-xl border border-border bg-surface-sunken/45 p-4">
        <div>
          <h3 className="text-xs font-medium text-foreground">
            {t("settings.appearance.paneChrome.title")}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("settings.appearance.paneChrome.description")}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pane-border-width" className="text-xs">
              {t("settings.appearance.paneChrome.borderWidth")}
            </Label>
            <output
              htmlFor="pane-border-width"
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
            >
              {appearance.paneBorderWidth}px
            </output>
          </div>
          <input
            id="pane-border-width"
            name="pane-border-width"
            type="range"
            min={0}
            max={8}
            step={1}
            value={appearance.paneBorderWidth}
            className="w-full accent-[var(--primary)]"
            onChange={(e) => {
              void setPaneBorderWidth(Number(e.target.value));
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pane-radius" className="text-xs">
              {t("settings.appearance.paneChrome.cornerRadius")}
            </Label>
            <output
              htmlFor="pane-radius"
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
            >
              {appearance.paneRadius}px
            </output>
          </div>
          <input
            id="pane-radius"
            name="pane-radius"
            type="range"
            min={0}
            max={24}
            step={1}
            value={appearance.paneRadius}
            className="w-full accent-[var(--primary)]"
            onChange={(e) => {
              void setPaneRadius(Number(e.target.value));
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
          <div className="flex min-w-0 gap-2.5">
            <CircleDot
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <div>
              <Label htmlFor="active-pane-highlight" className="text-xs">
                {t("settings.appearance.paneChrome.activeHighlight")}
              </Label>
              <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                {t(
                  "settings.appearance.paneChrome.activeHighlightDescription",
                )}
              </p>
            </div>
          </div>
          <Switch
            id="active-pane-highlight"
            checked={appearance.activePaneHighlight}
            onCheckedChange={(on) => {
              void setActivePaneHighlight(on);
            }}
          />
        </div>
      </section>
    </div>
  );
}
