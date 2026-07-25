import { writable } from 'svelte/store';

export type AppearanceTemplateId = 'graphite' | 'ocean' | 'sunset';

export interface AppearanceTemplate {
  id: AppearanceTemplateId;
  name: string;
  description: string;
  appShellBackground: string;
  appShellBorder: string;
  titleBarBackground: string;
  titleBarBorder: string;
  titleBarText: string;
  sidebarBackground: string;
  sidebarBorder: string;
  workspaceTabsBackground: string;
  workspaceTabsBorder: string;
  surfaceBackground: string;
  surfaceBorder: string;
  uiAccent: string;
  uiAccentStrong: string;
  paneBackground: string;
  paneBorderColor: string;
  paneActiveBorderColor: string;
  toolbarBackground: string;
  toolbarBorderColor: string;
}

export interface AppearanceSettings {
  templateId: AppearanceTemplateId;
  paneBorderWidth: number;
  paneBorderRadius: number;
  highlightActivePane: boolean;
}

export interface ResolvedAppearance extends AppearanceTemplate {
  paneBorderWidth: number;
  paneBorderRadius: number;
  effectiveActiveBorderColor: string;
}

const APPEARANCE_KEY = 'terminus_appearance_v1';

export const appearanceTemplates: AppearanceTemplate[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Neutral gray terminal frame with subtle active highlight.',
    appShellBackground: '#09090b',
    appShellBorder: '#27272a',
    titleBarBackground: '#18181b',
    titleBarBorder: '#27272a',
    titleBarText: '#a1a1aa',
    sidebarBackground: '#18181b',
    sidebarBorder: '#27272a',
    workspaceTabsBackground: '#18181b',
    workspaceTabsBorder: '#27272a',
    surfaceBackground: '#111115',
    surfaceBorder: '#27272a',
    uiAccent: '#6366f1',
    uiAccentStrong: '#4f46e5',
    paneBackground: '#09090b',
    paneBorderColor: '#27272a',
    paneActiveBorderColor: '#a78bfa',
    toolbarBackground: '#111115',
    toolbarBorderColor: '#27272a'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue accents for focused terminal panes.',
    appShellBackground: '#030b14',
    appShellBorder: '#17324f',
    titleBarBackground: '#0a1524',
    titleBarBorder: '#1d4f82',
    titleBarText: '#93c5fd',
    sidebarBackground: '#071224',
    sidebarBorder: '#1d4f82',
    workspaceTabsBackground: '#0a1728',
    workspaceTabsBorder: '#1d4f82',
    surfaceBackground: '#0b1a2f',
    surfaceBorder: '#1d4f82',
    uiAccent: '#38bdf8',
    uiAccentStrong: '#0284c7',
    paneBackground: '#050b12',
    paneBorderColor: '#1e3a5f',
    paneActiveBorderColor: '#38bdf8',
    toolbarBackground: '#0a1728',
    toolbarBorderColor: '#1d4f82'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm amber frame with high contrast active pane.',
    appShellBackground: '#120d08',
    appShellBorder: '#6b3f1f',
    titleBarBackground: '#1c130b',
    titleBarBorder: '#7c4a1c',
    titleBarText: '#fdba74',
    sidebarBackground: '#1a120b',
    sidebarBorder: '#7c4a1c',
    workspaceTabsBackground: '#1f1309',
    workspaceTabsBorder: '#7c4a1c',
    surfaceBackground: '#24170d',
    surfaceBorder: '#7c4a1c',
    uiAccent: '#f59e0b',
    uiAccentStrong: '#d97706',
    paneBackground: '#120d08',
    paneBorderColor: '#5b3a1a',
    paneActiveBorderColor: '#f59e0b',
    toolbarBackground: '#1a120b',
    toolbarBorderColor: '#7c4a1c'
  }
];

export const defaultAppearanceSettings: AppearanceSettings = {
  templateId: 'graphite',
  paneBorderWidth: 1,
  paneBorderRadius: 8,
  highlightActivePane: true
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isTemplateId(value: unknown): value is AppearanceTemplateId {
  return typeof value === 'string' && appearanceTemplates.some(template => template.id === value);
}

function sanitizeAppearanceSettings(value: unknown): AppearanceSettings {
  if (!value || typeof value !== 'object') {
    return defaultAppearanceSettings;
  }

  const candidate = value as Partial<AppearanceSettings>;
  const templateId = isTemplateId(candidate.templateId) ? candidate.templateId : defaultAppearanceSettings.templateId;
  const paneBorderWidth = clamp(Number(candidate.paneBorderWidth ?? defaultAppearanceSettings.paneBorderWidth), 0, 4);
  const paneBorderRadius = clamp(Number(candidate.paneBorderRadius ?? defaultAppearanceSettings.paneBorderRadius), 0, 16);
  const highlightActivePane = typeof candidate.highlightActivePane === 'boolean'
    ? candidate.highlightActivePane
    : defaultAppearanceSettings.highlightActivePane;

  return {
    templateId,
    paneBorderWidth,
    paneBorderRadius,
    highlightActivePane
  };
}

function loadAppearanceSettings(): AppearanceSettings {
  if (typeof localStorage === 'undefined') {
    return defaultAppearanceSettings;
  }

  const raw = localStorage.getItem(APPEARANCE_KEY);
  if (!raw) {
    return defaultAppearanceSettings;
  }

  try {
    return sanitizeAppearanceSettings(JSON.parse(raw));
  } catch (error) {
    console.error('Failed to parse appearance settings:', error);
    return defaultAppearanceSettings;
  }
}

export const appearanceSettings = writable<AppearanceSettings>(loadAppearanceSettings());

appearanceSettings.subscribe(value => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(value));
});

export function resolveAppearance(settings: AppearanceSettings): ResolvedAppearance {
  const template = appearanceTemplates.find(entry => entry.id === settings.templateId) ?? appearanceTemplates[0];

  return {
    ...template,
    paneBorderWidth: settings.paneBorderWidth,
    paneBorderRadius: settings.paneBorderRadius,
    effectiveActiveBorderColor: settings.highlightActivePane
      ? template.paneActiveBorderColor
      : template.paneBorderColor
  };
}

export function buildAppearanceCssVars(resolvedAppearance: ResolvedAppearance, activeProjectColor?: string): string {
  const projectColor = activeProjectColor ?? resolvedAppearance.uiAccent;

  return `
    --app-shell-bg: ${resolvedAppearance.appShellBackground};
    --app-shell-border: ${resolvedAppearance.appShellBorder};
    --titlebar-bg: ${resolvedAppearance.titleBarBackground};
    --titlebar-border: ${resolvedAppearance.titleBarBorder};
    --titlebar-text: ${resolvedAppearance.titleBarText};
    --sidebar-bg: ${resolvedAppearance.sidebarBackground};
    --sidebar-border: ${resolvedAppearance.sidebarBorder};
    --workspace-tabs-bg: ${resolvedAppearance.workspaceTabsBackground};
    --workspace-tabs-border: ${resolvedAppearance.workspaceTabsBorder};
    --surface-bg: ${resolvedAppearance.surfaceBackground};
    --surface-border: ${resolvedAppearance.surfaceBorder};
    --ui-accent: ${resolvedAppearance.uiAccent};
    --ui-accent-strong: ${resolvedAppearance.uiAccentStrong};
    --project-accent: ${resolvedAppearance.uiAccent};
    --text-primary: color-mix(in srgb, #ffffff 88%, ${resolvedAppearance.titleBarText} 12%);
    --text-secondary: color-mix(in srgb, ${resolvedAppearance.titleBarText} 88%, #9ca3af 12%);
    --text-muted: color-mix(in srgb, ${resolvedAppearance.titleBarText} 62%, #6b7280 38%);
    --panel-bg: color-mix(in srgb, ${resolvedAppearance.surfaceBackground} 88%, #000 12%);
    --panel-bg-elevated: color-mix(in srgb, ${resolvedAppearance.surfaceBackground} 78%, #000 22%);
    --panel-border: ${resolvedAppearance.surfaceBorder};
    --panel-border-strong: color-mix(in srgb, ${resolvedAppearance.surfaceBorder} 72%, #71717a 28%);
    --overlay-bg: color-mix(in srgb, ${resolvedAppearance.appShellBackground} 78%, #000 22%);
    --interactive-hover-bg: color-mix(in srgb, ${resolvedAppearance.surfaceBackground} 70%, #000 30%);
    --terminal-toolbar-btn-bg: color-mix(in srgb, ${resolvedAppearance.toolbarBackground} 86%, #000 14%);
    --terminal-toolbar-btn-border: color-mix(in srgb, ${resolvedAppearance.toolbarBorderColor} 70%, #52525b 30%);
    --terminal-toolbar-btn-hover-border: color-mix(in srgb, ${resolvedAppearance.uiAccent} 35%, ${resolvedAppearance.toolbarBorderColor});
    --terminal-toolbar-btn-size: 24px;
    --workspace-canvas-gap: 6px;
    --workspace-tone-bg: color-mix(in srgb, ${projectColor} 10%, ${resolvedAppearance.surfaceBackground});
    --workspace-tone-bg-elevated: color-mix(in srgb, ${projectColor} 16%, ${resolvedAppearance.surfaceBackground});
    --workspace-tone-border: color-mix(in srgb, ${projectColor} 50%, ${resolvedAppearance.surfaceBorder});
    --workspace-tone-border-soft: color-mix(in srgb, ${projectColor} 28%, ${resolvedAppearance.surfaceBorder});
    --terminal-pane-bg: ${resolvedAppearance.paneBackground};
    --terminal-pane-border-color: ${resolvedAppearance.paneBorderColor};
    --terminal-pane-active-border-color: ${resolvedAppearance.effectiveActiveBorderColor};
    --terminal-pane-border-width: ${resolvedAppearance.paneBorderWidth}px;
    --terminal-pane-border-radius: ${resolvedAppearance.paneBorderRadius}px;
    --terminal-toolbar-bg: ${resolvedAppearance.toolbarBackground};
    --terminal-toolbar-border-color: ${resolvedAppearance.toolbarBorderColor};
  `;
}

export function setAppearanceTemplate(templateId: AppearanceTemplateId): void {
  appearanceSettings.update(current => ({ ...current, templateId }));
}

export function updateAppearanceSettings(patch: Partial<AppearanceSettings>): void {
  appearanceSettings.update(current => sanitizeAppearanceSettings({ ...current, ...patch }));
}

export function resetAppearanceSettings(): void {
  appearanceSettings.set(defaultAppearanceSettings);
}
