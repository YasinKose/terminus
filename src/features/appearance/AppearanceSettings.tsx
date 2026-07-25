import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRESET_ORDER, getPreset } from "./presets";
import { useAppearanceStore } from "./appearanceStore";
import { Check, CircleDot } from "lucide-react";

export function AppearanceSettings() {
  const appearance = useAppearanceStore((s) => s.appearance);
  const setPreset = useAppearanceStore((s) => s.setPreset);
  const setPaneBorderWidth = useAppearanceStore((s) => s.setPaneBorderWidth);
  const setPaneRadius = useAppearanceStore((s) => s.setPaneRadius);
  const setActivePaneHighlight = useAppearanceStore(
    (s) => s.setActivePaneHighlight,
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pr-1 pb-4">
      <header>
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Choose a cohesive app and terminal palette, then tune pane chrome.
        </p>
      </header>

      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-medium text-foreground">Color preset</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Each preset updates both the interface and terminal ANSI colors.
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
                  <span className="block font-medium">{preset.label}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {id === "paper" ? "Light" : "Dark"}
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

      <section className="space-y-4 rounded-xl border border-border bg-surface-sunken/45 p-4">
        <div>
          <h3 className="text-xs font-medium text-foreground">Pane chrome</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Adjust boundaries without changing terminal content.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pane-border-width" className="text-xs">
              Border width
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
              Corner radius
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
                Active pane highlight
              </Label>
              <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                Show a signal rail on the focused terminal.
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
