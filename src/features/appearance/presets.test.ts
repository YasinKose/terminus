import { describe, expect, it } from "vitest";
import {
  ANSI_KEYS,
  APP_TOKEN_KEYS,
  PRESETS,
  PRESET_ORDER,
  XTERM_THEME_KEYS,
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
});

function relativeIsLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}
