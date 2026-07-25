import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRESET_ORDER, getPreset } from "./presets";
import { useAppearanceStore } from "./appearanceStore";

export function AppearanceSettings() {
  const appearance = useAppearanceStore((s) => s.appearance);
  const setPreset = useAppearanceStore((s) => s.setPreset);
  const setPaneBorderWidth = useAppearanceStore((s) => s.setPaneBorderWidth);
  const setPaneRadius = useAppearanceStore((s) => s.setPaneRadius);
  const setActivePaneHighlight = useAppearanceStore(
    (s) => s.setActivePaneHighlight,
  );

  return (
    <div className="flex flex-col gap-5 overflow-y-auto pb-4">
      <section className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preset</Label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_ORDER.map((id) => {
            const preset = getPreset(id);
            const selected = appearance.presetId === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`preset-${id}`}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "border-ring bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => {
                  void setPreset(id);
                }}
              >
                <span
                  className="inline-block size-5 shrink-0 rounded-full border border-border"
                  style={{
                    background: `linear-gradient(135deg, ${preset.app.background} 50%, ${preset.app.primary} 50%)`,
                  }}
                />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="pane-border-width" className="text-xs text-muted-foreground">
          Pane border width ({appearance.paneBorderWidth}px)
        </Label>
        <input
          id="pane-border-width"
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
      </section>

      <section className="space-y-2">
        <Label htmlFor="pane-radius" className="text-xs text-muted-foreground">
          Pane radius ({appearance.paneRadius}px)
        </Label>
        <input
          id="pane-radius"
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
      </section>

      <section className="flex items-center justify-between gap-3">
        <Label htmlFor="active-pane-highlight" className="text-sm">
          Active pane highlight
        </Label>
        <Switch
          id="active-pane-highlight"
          checked={appearance.activePaneHighlight}
          onCheckedChange={(on) => {
            void setActivePaneHighlight(on);
          }}
        />
      </section>
    </div>
  );
}
