export type PresetId =
  | "graphite"
  | "ocean"
  | "sunset"
  | "forest"
  | "orchid"
  | "paper";

export type AppColorTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  ring: string;
};

export type AnsiPalette = {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
};

export type XtermThemeTokens = {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
} & AnsiPalette;

export type AppearancePreset = {
  id: PresetId;
  label: string;
  app: AppColorTokens;
  xterm: XtermThemeTokens;
};

export type AppearanceSettings = {
  presetId: PresetId;
  paneBorderWidth: number;
  paneRadius: number;
  activePaneHighlight: boolean;
};

export const APP_TOKEN_KEYS = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "primary",
  "primaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "border",
  "ring",
] as const satisfies ReadonlyArray<keyof AppColorTokens>;

export const ANSI_KEYS = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
] as const satisfies ReadonlyArray<keyof AnsiPalette>;

export const XTERM_THEME_KEYS = [
  "background",
  "foreground",
  "cursor",
  "cursorAccent",
  "selectionBackground",
  ...ANSI_KEYS,
] as const;

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  presetId: "graphite",
  paneBorderWidth: 1,
  paneRadius: 6,
  activePaneHighlight: true,
};

function hex(h: string): string {
  return h;
}

export const PRESETS: Record<PresetId, AppearancePreset> = {
  graphite: {
    id: "graphite",
    label: "Graphite",
    app: {
      background: hex("#121214"),
      foreground: hex("#f4f4f5"),
      card: hex("#1c1c1f"),
      cardForeground: hex("#f4f4f5"),
      primary: hex("#34d399"),
      primaryForeground: hex("#052e1a"),
      muted: hex("#27272a"),
      mutedForeground: hex("#a1a1aa"),
      accent: hex("#27272a"),
      accentForeground: hex("#f4f4f5"),
      destructive: hex("#f87171"),
      border: hex("#3f3f46"),
      ring: hex("#34d399"),
    },
    xterm: {
      background: hex("#121214"),
      foreground: hex("#e4e4e7"),
      cursor: hex("#34d399"),
      cursorAccent: hex("#121214"),
      selectionBackground: hex("#3f3f4680"),
      black: hex("#18181b"),
      red: hex("#f87171"),
      green: hex("#4ade80"),
      yellow: hex("#facc15"),
      blue: hex("#60a5fa"),
      magenta: hex("#c084fc"),
      cyan: hex("#22d3ee"),
      white: hex("#e4e4e7"),
      brightBlack: hex("#71717a"),
      brightRed: hex("#fca5a5"),
      brightGreen: hex("#86efac"),
      brightYellow: hex("#fde047"),
      brightBlue: hex("#93c5fd"),
      brightMagenta: hex("#d8b4fe"),
      brightCyan: hex("#67e8f9"),
      brightWhite: hex("#fafafa"),
    },
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
    app: {
      background: hex("#0b1220"),
      foreground: hex("#e2e8f0"),
      card: hex("#111827"),
      cardForeground: hex("#e2e8f0"),
      primary: hex("#38bdf8"),
      primaryForeground: hex("#082f49"),
      muted: hex("#1e293b"),
      mutedForeground: hex("#94a3b8"),
      accent: hex("#1e293b"),
      accentForeground: hex("#e2e8f0"),
      destructive: hex("#fb7185"),
      border: hex("#334155"),
      ring: hex("#38bdf8"),
    },
    xterm: {
      background: hex("#0b1220"),
      foreground: hex("#e2e8f0"),
      cursor: hex("#38bdf8"),
      cursorAccent: hex("#0b1220"),
      selectionBackground: hex("#1d4ed880"),
      black: hex("#0f172a"),
      red: hex("#fb7185"),
      green: hex("#34d399"),
      yellow: hex("#fbbf24"),
      blue: hex("#60a5fa"),
      magenta: hex("#a78bfa"),
      cyan: hex("#22d3ee"),
      white: hex("#e2e8f0"),
      brightBlack: hex("#64748b"),
      brightRed: hex("#fda4af"),
      brightGreen: hex("#6ee7b7"),
      brightYellow: hex("#fcd34d"),
      brightBlue: hex("#93c5fd"),
      brightMagenta: hex("#c4b5fd"),
      brightCyan: hex("#67e8f9"),
      brightWhite: hex("#f8fafc"),
    },
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    app: {
      background: hex("#1a1210"),
      foreground: hex("#fff7ed"),
      card: hex("#241816"),
      cardForeground: hex("#fff7ed"),
      primary: hex("#fb923c"),
      primaryForeground: hex("#431407"),
      muted: hex("#3b241c"),
      mutedForeground: hex("#d6b09a"),
      accent: hex("#3b241c"),
      accentForeground: hex("#fff7ed"),
      destructive: hex("#f43f5e"),
      border: hex("#5b3a2e"),
      ring: hex("#fb923c"),
    },
    xterm: {
      background: hex("#1a1210"),
      foreground: hex("#ffedd5"),
      cursor: hex("#fb923c"),
      cursorAccent: hex("#1a1210"),
      selectionBackground: hex("#9a341280"),
      black: hex("#1c1917"),
      red: hex("#f87171"),
      green: hex("#a3e635"),
      yellow: hex("#fbbf24"),
      blue: hex("#60a5fa"),
      magenta: hex("#e879f9"),
      cyan: hex("#2dd4bf"),
      white: hex("#ffedd5"),
      brightBlack: hex("#a8a29e"),
      brightRed: hex("#fca5a5"),
      brightGreen: hex("#bef264"),
      brightYellow: hex("#fde68a"),
      brightBlue: hex("#93c5fd"),
      brightMagenta: hex("#f0abfc"),
      brightCyan: hex("#5eead4"),
      brightWhite: hex("#fffbeb"),
    },
  },
  forest: {
    id: "forest",
    label: "Forest",
    app: {
      background: hex("#0f1410"),
      foreground: hex("#ecfdf5"),
      card: hex("#162019"),
      cardForeground: hex("#ecfdf5"),
      primary: hex("#4ade80"),
      primaryForeground: hex("#052e16"),
      muted: hex("#1f2a22"),
      mutedForeground: hex("#86a894"),
      accent: hex("#1f2a22"),
      accentForeground: hex("#ecfdf5"),
      destructive: hex("#f87171"),
      border: hex("#2f4034"),
      ring: hex("#4ade80"),
    },
    xterm: {
      background: hex("#0f1410"),
      foreground: hex("#d1fae5"),
      cursor: hex("#4ade80"),
      cursorAccent: hex("#0f1410"),
      selectionBackground: hex("#16653480"),
      black: hex("#14532d"),
      red: hex("#f87171"),
      green: hex("#4ade80"),
      yellow: hex("#facc15"),
      blue: hex("#38bdf8"),
      magenta: hex("#c084fc"),
      cyan: hex("#2dd4bf"),
      white: hex("#d1fae5"),
      brightBlack: hex("#6b8f76"),
      brightRed: hex("#fca5a5"),
      brightGreen: hex("#86efac"),
      brightYellow: hex("#fde047"),
      brightBlue: hex("#7dd3fc"),
      brightMagenta: hex("#d8b4fe"),
      brightCyan: hex("#5eead4"),
      brightWhite: hex("#ecfdf5"),
    },
  },
  orchid: {
    id: "orchid",
    label: "Orchid",
    app: {
      background: hex("#141018"),
      foreground: hex("#faf5ff"),
      card: hex("#1c1524"),
      cardForeground: hex("#faf5ff"),
      primary: hex("#c084fc"),
      primaryForeground: hex("#3b0764"),
      muted: hex("#2a2035"),
      mutedForeground: hex("#c4b5d4"),
      accent: hex("#2a2035"),
      accentForeground: hex("#faf5ff"),
      destructive: hex("#fb7185"),
      border: hex("#3f3150"),
      ring: hex("#c084fc"),
    },
    xterm: {
      background: hex("#141018"),
      foreground: hex("#f3e8ff"),
      cursor: hex("#c084fc"),
      cursorAccent: hex("#141018"),
      selectionBackground: hex("#6b21a880"),
      black: hex("#1e1b2e"),
      red: hex("#fb7185"),
      green: hex("#4ade80"),
      yellow: hex("#fbbf24"),
      blue: hex("#818cf8"),
      magenta: hex("#e879f9"),
      cyan: hex("#22d3ee"),
      white: hex("#f3e8ff"),
      brightBlack: hex("#8b7a9e"),
      brightRed: hex("#fda4af"),
      brightGreen: hex("#86efac"),
      brightYellow: hex("#fcd34d"),
      brightBlue: hex("#a5b4fc"),
      brightMagenta: hex("#f0abfc"),
      brightCyan: hex("#67e8f9"),
      brightWhite: hex("#faf5ff"),
    },
  },
  paper: {
    id: "paper",
    label: "Paper",
    app: {
      background: hex("#f7f4ef"),
      foreground: hex("#1c1917"),
      card: hex("#ffffff"),
      cardForeground: hex("#1c1917"),
      primary: hex("#0f766e"),
      primaryForeground: hex("#ecfdf5"),
      muted: hex("#ebe6de"),
      mutedForeground: hex("#57534e"),
      accent: hex("#ebe6de"),
      accentForeground: hex("#1c1917"),
      destructive: hex("#b91c1c"),
      border: hex("#d6d3d1"),
      ring: hex("#0f766e"),
    },
    xterm: {
      background: hex("#f7f4ef"),
      foreground: hex("#1c1917"),
      cursor: hex("#0f766e"),
      cursorAccent: hex("#f7f4ef"),
      selectionBackground: hex("#99f6e480"),
      black: hex("#1c1917"),
      red: hex("#b91c1c"),
      green: hex("#15803d"),
      yellow: hex("#a16207"),
      blue: hex("#1d4ed8"),
      magenta: hex("#7e22ce"),
      cyan: hex("#0e7490"),
      white: hex("#44403c"),
      brightBlack: hex("#78716c"),
      brightRed: hex("#dc2626"),
      brightGreen: hex("#16a34a"),
      brightYellow: hex("#ca8a04"),
      brightBlue: hex("#2563eb"),
      brightMagenta: hex("#9333ea"),
      brightCyan: hex("#0891b2"),
      brightWhite: hex("#0c0a09"),
    },
  },
};

export const PRESET_ORDER: PresetId[] = [
  "graphite",
  "ocean",
  "sunset",
  "forest",
  "orchid",
  "paper",
];

export function getPreset(id: PresetId): AppearancePreset {
  return PRESETS[id];
}

export function isPresetId(value: unknown): value is PresetId {
  return (
    typeof value === "string" &&
    (PRESET_ORDER as string[]).includes(value)
  );
}

export function parseAppearanceSettings(
  raw: unknown,
): AppearanceSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const presetId = isPresetId(o.presetId) ? o.presetId : null;
  if (!presetId) return null;
  const paneBorderWidth =
    typeof o.paneBorderWidth === "number" && Number.isFinite(o.paneBorderWidth)
      ? clamp(o.paneBorderWidth, 0, 8)
      : DEFAULT_APPEARANCE.paneBorderWidth;
  const paneRadius =
    typeof o.paneRadius === "number" && Number.isFinite(o.paneRadius)
      ? clamp(o.paneRadius, 0, 24)
      : DEFAULT_APPEARANCE.paneRadius;
  const activePaneHighlight =
    typeof o.activePaneHighlight === "boolean"
      ? o.activePaneHighlight
      : DEFAULT_APPEARANCE.activePaneHighlight;
  return { presetId, paneBorderWidth, paneRadius, activePaneHighlight };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function relativeLuminance(color: string): number {
  const rgb = parseHexRgb(color);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexRgb(color: string): [number, number, number] | null {
  const m = color
    .trim()
    .replace(/^#/, "")
    .match(/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 8) {
    h = h.slice(0, 6);
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function applyAppearanceToDocument(
  settings: AppearanceSettings,
  doc: Document = document,
): void {
  const root = doc.documentElement;
  const preset = getPreset(settings.presetId);
  root.setAttribute("data-theme", settings.presetId);
  const app = preset.app;
  for (const key of APP_TOKEN_KEYS) {
    const cssKey =
      key === "cardForeground"
        ? "--card-foreground"
        : key === "primaryForeground"
          ? "--primary-foreground"
          : key === "mutedForeground"
            ? "--muted-foreground"
            : key === "accentForeground"
              ? "--accent-foreground"
              : `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    root.style.setProperty(cssKey, app[key]);
  }
  root.style.setProperty("--background", app.background);
  root.style.setProperty("--foreground", app.foreground);
  root.style.setProperty("--card", app.card);
  root.style.setProperty("--card-foreground", app.cardForeground);
  root.style.setProperty("--primary", app.primary);
  root.style.setProperty("--primary-foreground", app.primaryForeground);
  root.style.setProperty("--muted", app.muted);
  root.style.setProperty("--muted-foreground", app.mutedForeground);
  root.style.setProperty("--accent", app.accent);
  root.style.setProperty("--accent-foreground", app.accentForeground);
  root.style.setProperty("--destructive", app.destructive);
  root.style.setProperty("--border", app.border);
  root.style.setProperty("--ring", app.ring);
  root.style.setProperty("--pane-border-width", `${settings.paneBorderWidth}px`);
  root.style.setProperty("--pane-radius", `${settings.paneRadius}px`);
  root.style.setProperty("--radius", `${Math.max(settings.paneRadius, 4)}px`);
  root.setAttribute(
    "data-active-pane-highlight",
    settings.activePaneHighlight ? "on" : "off",
  );
}

export function xtermThemeFromPreset(id: PresetId): XtermThemeTokens {
  return { ...getPreset(id).xterm };
}
