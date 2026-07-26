import { describe, expect, it } from "vitest";
import * as presetModule from "./presets";
import {
  ANSI_KEYS,
  APP_TOKEN_KEYS,
  PRESETS,
  PRESET_ORDER,
  XTERM_THEME_KEYS,
  applyAppearanceToDocument,
  contrastRatio,
  getPreset,
  isPresetId,
  parseAppearanceSettings,
  xtermThemeFromPreset,
  type AppearancePreset,
} from "./presets";

function assertCompletePreset(preset: AppearancePreset): void {
  for (const key of APP_TOKEN_KEYS) {
    expect(preset.app[key], `${preset.id}.app.${key}`).toMatch(/^#[0-9a-fA-F]{6}$/);
  }
  for (const key of XTERM_THEME_KEYS) {
    const value = preset.xterm[key];
    expect(value, `${preset.id}.xterm.${key}`).toBeTruthy();
    expect(value.startsWith("#")).toBe(true);
  }
  for (const key of ANSI_KEYS) {
    expect(preset.xterm[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
  }
}

describe("appearance presets", () => {
  it("defines all six named presets in order", () => {
    expect(PRESET_ORDER).toEqual([
      "graphite",
      "ocean",
      "sunset",
      "forest",
      "orchid",
      "paper",
    ]);
    for (const id of PRESET_ORDER) {
      expect(PRESETS[id].id).toBe(id);
      expect(PRESETS[id].label.length).toBeGreaterThan(0);
    }
  });

  it("every preset defines every semantic app and xterm token", () => {
    for (const id of PRESET_ORDER) {
      assertCompletePreset(getPreset(id));
    }
  });

  it("primary text and background meet WCAG AA contrast (≥4.5)", () => {
    for (const id of PRESET_ORDER) {
      const p = getPreset(id);
      const ratio = contrastRatio(p.app.foreground, p.app.background);
      expect(ratio, `${id} fg/bg ${ratio}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("focus ring contrasts against background (≥3)", () => {
    for (const id of PRESET_ORDER) {
      const p = getPreset(id);
      const ratio = contrastRatio(p.app.ring, p.app.background);
      expect(ratio, `${id} ring/bg ${ratio}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("Paper remains readable in app chrome and xterm", () => {
    const paper = getPreset("paper");
    expect(contrastRatio(paper.app.foreground, paper.app.background)).toBeGreaterThanOrEqual(
      7,
    );
    expect(
      contrastRatio(paper.xterm.foreground, paper.xterm.background),
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrastRatio(paper.xterm.black, paper.xterm.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(paper.app.background.toLowerCase()).not.toBe("#000000");
    expect(relativeIsLight(paper.app.background)).toBe(true);
  });

  it("xtermThemeFromPreset returns a frozen-shape copy", () => {
    const theme = xtermThemeFromPreset("ocean");
    expect(theme.background).toBe(PRESETS.ocean.xterm.background);
    theme.background = "#ffffff";
    expect(PRESETS.ocean.xterm.background).not.toBe("#ffffff");
  });

  it("isPresetId and parseAppearanceSettings validate input", () => {
    expect(isPresetId("graphite")).toBe(true);
    expect(isPresetId("nope")).toBe(false);
    expect(parseAppearanceSettings(null)).toBeNull();
    expect(
      parseAppearanceSettings({
        presetId: "orchid",
        paneBorderWidth: 2,
        paneRadius: 10,
        activePaneHighlight: false,
      }),
    ).toEqual({
      presetId: "orchid",
      paneBorderWidth: 2,
      paneRadius: 10,
      activePaneHighlight: false,
      terminal: {
        fontFamily: "jetbrains-mono",
        fontSize: 14,
        lineHeight: 1.25,
        cursorStyle: "block",
        cursorBlink: true,
      },
    });
    expect(
      parseAppearanceSettings({
        presetId: "graphite",
        paneBorderWidth: 99,
        paneRadius: -1,
      })?.paneBorderWidth,
    ).toBe(8);
    expect(
      parseAppearanceSettings({
        presetId: "graphite",
        paneBorderWidth: 99,
        paneRadius: -1,
      })?.paneRadius,
    ).toBe(0);
  });

  it("hydrates professional terminal defaults for older appearance records", () => {
    expect(
      parseAppearanceSettings({
        presetId: "ocean",
        paneBorderWidth: 2,
        paneRadius: 10,
        activePaneHighlight: true,
      }),
    ).toMatchObject({
      terminal: {
        fontFamily: "jetbrains-mono",
        fontSize: 14,
        lineHeight: 1.25,
        cursorStyle: "block",
        cursorBlink: true,
      },
    });
  });

  it("validates and clamps persisted terminal presentation settings", () => {
    expect(
      parseAppearanceSettings({
        presetId: "forest",
        terminal: {
          fontFamily: "menlo",
          fontSize: 99,
          lineHeight: 0.25,
          cursorStyle: "bar",
          cursorBlink: false,
        },
      })?.terminal,
    ).toEqual({
      fontFamily: "menlo",
      fontSize: 20,
      lineHeight: 1,
      cursorStyle: "bar",
      cursorBlink: false,
    });

    expect(
      parseAppearanceSettings({
        presetId: "forest",
        terminal: {
          fontFamily: "unknown",
          cursorStyle: "beam",
        },
      })?.terminal,
    ).toEqual({
      fontFamily: "jetbrains-mono",
      fontSize: 14,
      lineHeight: 1.25,
      cursorStyle: "block",
      cursorBlink: true,
    });
  });

  it("applies terminal theme and typography as semantic document tokens", () => {
    applyAppearanceToDocument(
      {
        presetId: "ocean",
        paneBorderWidth: 1,
        paneRadius: 8,
        activePaneHighlight: true,
        terminal: {
          fontFamily: "menlo",
          fontSize: 16,
          lineHeight: 1.4,
          cursorStyle: "underline",
          cursorBlink: false,
        },
      },
      document,
    );

    const style = document.documentElement.style;
    expect(style.getPropertyValue("--terminal-background")).toBe(
      PRESETS.ocean.xterm.background,
    );
    expect(style.getPropertyValue("--terminal-foreground")).toBe(
      PRESETS.ocean.xterm.foreground,
    );
    expect(style.getPropertyValue("--terminal-font-family")).toContain("Menlo");
    expect(style.getPropertyValue("--terminal-font-size")).toBe("16px");
    expect(style.getPropertyValue("--terminal-line-height")).toBe("1.4");
  });

  it("builds complete xterm presentation options from appearance", () => {
    const buildPresentation = (
      presetModule as unknown as {
        terminalPresentationFromAppearance?: (
          appearance: ReturnType<typeof parseAppearanceSettings>,
        ) => {
          theme: { background: string };
          fontFamily: string;
          fontSize: number;
          lineHeight: number;
          cursorStyle: string;
          cursorBlink: boolean;
          minimumContrastRatio: number;
          fontWeight: number;
          fontWeightBold: number;
          customGlyphs: boolean;
          cursorInactiveStyle: string;
        };
      }
    ).terminalPresentationFromAppearance;

    expect(buildPresentation).toBeTypeOf("function");

    const appearance = parseAppearanceSettings({
      presetId: "orchid",
      terminal: {
        fontFamily: "sf-mono",
        fontSize: 17,
        lineHeight: 1.35,
        cursorStyle: "underline",
        cursorBlink: false,
      },
    });
    const presentation = buildPresentation?.(appearance);

    expect(presentation).toMatchObject({
      theme: { background: PRESETS.orchid.xterm.background },
      fontSize: 17,
      lineHeight: 1.35,
      cursorStyle: "underline",
      cursorBlink: false,
      minimumContrastRatio: 4.5,
      fontWeight: 400,
      fontWeightBold: 600,
      customGlyphs: true,
      cursorInactiveStyle: "outline",
    });
    expect(presentation?.fontFamily).toContain("SF Mono");
  });
});

function relativeIsLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}
