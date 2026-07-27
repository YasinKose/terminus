import { TerminalSquare, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { reportError } from "@/lib/errors";
import { useAppearanceStore } from "./appearanceStore";
import {
  TERMINAL_CURSOR_STYLES,
  TERMINAL_FONT_STACKS,
  type TerminalCursorStyle,
  type TerminalFontFamilyId,
} from "./presets";

const FONT_FAMILY_ORDER: TerminalFontFamilyId[] = [
  "jetbrains-mono",
  "system-mono",
  "sf-mono",
  "menlo",
];

function CursorGlyph({ style }: { style: TerminalCursorStyle }) {
  if (style === "bar") {
    return (
      <span
        aria-hidden
        className="h-4 w-0.5 rounded-full bg-[var(--terminal-cursor)]"
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        aria-hidden
        className="h-4 w-2.5 border-b-2 border-[var(--terminal-cursor)]"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="h-4 w-2.5 rounded-[1px] bg-[var(--terminal-cursor)]"
    />
  );
}

export function TerminalAppearanceSettings() {
  const { t } = useTranslation();
  const terminal = useAppearanceStore((state) => state.appearance.terminal);
  const setTerminalFontFamily = useAppearanceStore(
    (state) => state.setTerminalFontFamily,
  );
  const setTerminalFontSize = useAppearanceStore(
    (state) => state.setTerminalFontSize,
  );
  const setTerminalLineHeight = useAppearanceStore(
    (state) => state.setTerminalLineHeight,
  );
  const setTerminalCursorStyle = useAppearanceStore(
    (state) => state.setTerminalCursorStyle,
  );
  const setTerminalCursorBlink = useAppearanceStore(
    (state) => state.setTerminalCursorBlink,
  );

  const runUpdate = (operation: Promise<void>): void => {
    void operation.catch((error) => {
      reportError(t("errors.updateTerminalAppearance"), error);
    });
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-border bg-surface-sunken/45 p-4"
      aria-labelledby="terminal-typography-title"
    >
      <div className="flex items-start gap-2.5">
        <TerminalSquare
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
        <div>
          <h3
            id="terminal-typography-title"
            className="text-xs font-medium text-foreground"
          >
            {t("settings.appearance.terminal.title")}
          </h3>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            {t("settings.appearance.terminal.description")}
          </p>
        </div>
      </div>

      <div
        role="img"
        aria-label={t("settings.appearance.terminal.preview.label")}
        className="overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--terminal-foreground)_16%,var(--terminal-background))] bg-[var(--terminal-background)] shadow-[0_1px_0_rgb(255_255_255/0.035)_inset,0_12px_28px_rgb(0_0_0/0.16)]"
      >
        <div className="flex h-7 items-center justify-between border-b border-[color-mix(in_oklab,var(--terminal-foreground)_12%,transparent)] px-3 text-[10px] text-[color-mix(in_oklab,var(--terminal-foreground)_58%,transparent)]">
          <span>{t("settings.appearance.terminal.preview.session")}</span>
          <span className="tabular-nums">
            {terminal.fontSize}px · {terminal.lineHeight.toFixed(2)}
          </span>
        </div>
        <div
          className="min-h-24 px-4 py-3"
          style={{
            color: "var(--terminal-foreground)",
            fontFamily: TERMINAL_FONT_STACKS[terminal.fontFamily],
            fontSize: `${terminal.fontSize}px`,
            lineHeight: terminal.lineHeight,
          }}
        >
          <div>
            <span className="text-[var(--terminal-cyan)]">~/terminus</span>
            <span className="text-[var(--terminal-bright-black)]"> $ </span>
            <span>pnpm dev</span>
          </div>
          <div className="text-[var(--terminal-bright-black)]">
            {t("settings.appearance.terminal.preview.output")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--terminal-green)]">✓</span>
            <span>{t("settings.appearance.terminal.preview.ready")}</span>
            <span
              className="terminus-cursor-preview inline-flex"
              data-blink={terminal.cursorBlink ? "true" : "false"}
            >
              <CursorGlyph style={terminal.cursorStyle} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="terminal-font-family" className="text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Type aria-hidden className="size-3.5 text-muted-foreground" />
              {t("settings.appearance.terminal.fontFamily.label")}
            </span>
          </Label>
          <select
            id="terminal-font-family"
            value={terminal.fontFamily}
            className="h-11 w-full rounded-lg border border-input bg-surface-raised px-3 text-xs text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:bg-surface focus-visible:shadow-field-focus"
            onChange={(event) => {
              runUpdate(
                setTerminalFontFamily(
                  event.target.value as TerminalFontFamilyId,
                ),
              );
            }}
          >
            {FONT_FAMILY_ORDER.map((fontFamily) => (
              <option key={fontFamily} value={fontFamily}>
                {t(
                  `settings.appearance.terminal.fontFamily.options.${fontFamily}`,
                )}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="terminal-font-size" className="text-xs">
              {t("settings.appearance.terminal.fontSize")}
            </Label>
            <output
              htmlFor="terminal-font-size"
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
            >
              {terminal.fontSize}px
            </output>
          </div>
          <input
            id="terminal-font-size"
            name="terminal-font-size"
            type="range"
            min={12}
            max={20}
            step={1}
            value={terminal.fontSize}
            className="h-7 w-full accent-[var(--primary)]"
            onChange={(event) => {
              runUpdate(setTerminalFontSize(Number(event.target.value)));
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="terminal-line-height" className="text-xs">
              {t("settings.appearance.terminal.lineHeight")}
            </Label>
            <output
              htmlFor="terminal-line-height"
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
            >
              {terminal.lineHeight.toFixed(2)}
            </output>
          </div>
          <input
            id="terminal-line-height"
            name="terminal-line-height"
            type="range"
            min={1}
            max={1.6}
            step={0.05}
            value={terminal.lineHeight}
            className="h-7 w-full accent-[var(--primary)]"
            onChange={(event) => {
              runUpdate(setTerminalLineHeight(Number(event.target.value)));
            }}
          />
        </div>

        <fieldset className="space-y-2">
          <legend id="terminal-cursor-style-label" className="text-xs">
            {t("settings.appearance.terminal.cursorStyle.label")}
          </legend>
          <div
            role="radiogroup"
            aria-labelledby="terminal-cursor-style-label"
            className="grid grid-cols-3 gap-1 rounded-lg border border-input bg-surface-raised p-1"
          >
            {TERMINAL_CURSOR_STYLES.map((cursorStyle) => {
              const selected = terminal.cursorStyle === cursorStyle;
              return (
                <label
                  key={cursorStyle}
                  className="relative cursor-pointer"
                >
                  <input
                    type="radio"
                    name="terminal-cursor-style"
                    value={cursorStyle}
                    checked={selected}
                    className="peer sr-only"
                    onChange={() => {
                      runUpdate(setTerminalCursorStyle(cursorStyle));
                    }}
                  />
                  <span
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 text-[11px] outline-none transition-[background-color,color,box-shadow] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/35 ${
                      selected
                        ? "bg-accent text-accent-foreground shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]"
                        : "text-muted-foreground hover:bg-accent/55 hover:text-foreground"
                    }`}
                  >
                    <CursorGlyph style={cursorStyle} />
                    {t(
                      `settings.appearance.terminal.cursorStyle.options.${cursorStyle}`,
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-4 border-t border-border/70 pt-4">
        <div>
          <Label htmlFor="terminal-cursor-blink" className="text-xs">
            {t("settings.appearance.terminal.cursorBlink.label")}
          </Label>
          <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
            {t("settings.appearance.terminal.cursorBlink.description")}
          </p>
        </div>
        <Switch
          id="terminal-cursor-blink"
          checked={terminal.cursorBlink}
          onCheckedChange={(cursorBlink) => {
            runUpdate(setTerminalCursorBlink(cursorBlink));
          }}
        />
      </div>
    </section>
  );
}
