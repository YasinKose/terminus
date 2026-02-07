import { writable } from 'svelte/store';

export type ShortcutId =
  | 'exitZen'
  | 'toggleZen'
  | 'navigateLeft'
  | 'navigateRight'
  | 'navigateUp'
  | 'navigateDown'
  | 'toggleCommandPalette'
  | 'openAppearanceSettings'
  | 'toggleSidebar'
  | 'toggleTaskBoard'
  | 'newWorkspace'
  | 'splitHorizontal'
  | 'splitVertical'
  | 'closePane'
  | 'runSnippetModal';

export interface ShortcutBinding {
  key: string;
  primary: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ShortcutDefinition {
  id: ShortcutId;
  label: string;
  description: string;
}

export type ShortcutSettings = Record<ShortcutId, ShortcutBinding>;

const SHORTCUTS_KEY = 'terminus_shortcuts_v1';
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

export const shortcutDefinitions: ShortcutDefinition[] = [
  { id: 'exitZen', label: 'Exit Zen Mode', description: 'Leaves full-screen terminal mode.' },
  { id: 'toggleZen', label: 'Toggle Zen Mode', description: 'Toggles full-screen terminal mode.' },
  { id: 'navigateLeft', label: 'Focus Left Pane', description: 'Moves focus to the pane on the left.' },
  { id: 'navigateRight', label: 'Focus Right Pane', description: 'Moves focus to the pane on the right.' },
  { id: 'navigateUp', label: 'Focus Upper Pane', description: 'Moves focus to the pane above.' },
  { id: 'navigateDown', label: 'Focus Lower Pane', description: 'Moves focus to the pane below.' },
  { id: 'toggleCommandPalette', label: 'Toggle Command Palette', description: 'Opens or closes command palette.' },
  { id: 'openAppearanceSettings', label: 'Open Appearance Settings', description: 'Opens design and shortcut settings.' },
  { id: 'toggleSidebar', label: 'Toggle Sidebar', description: 'Shows or hides project sidebar.' },
  { id: 'toggleTaskBoard', label: 'Toggle Task Board', description: 'Shows or hides kanban task board.' },
  { id: 'newWorkspace', label: 'Create Workspace', description: 'Creates a new workspace in active project.' },
  { id: 'splitHorizontal', label: 'Split Horizontally', description: 'Splits active terminal into left/right panes.' },
  { id: 'splitVertical', label: 'Split Vertically', description: 'Splits active terminal into top/bottom panes.' },
  { id: 'closePane', label: 'Close Active Pane', description: 'Closes currently active terminal pane.' },
  { id: 'runSnippetModal', label: 'Run Snippet Modal', description: 'Opens snippet run modal.' }
];

export const defaultShortcutSettings: ShortcutSettings = {
  exitZen: { key: 'escape', primary: false, shift: false, alt: false },
  toggleZen: { key: 'z', primary: true, shift: true, alt: false },
  navigateLeft: { key: 'arrowleft', primary: true, shift: false, alt: true },
  navigateRight: { key: 'arrowright', primary: true, shift: false, alt: true },
  navigateUp: { key: 'arrowup', primary: true, shift: false, alt: true },
  navigateDown: { key: 'arrowdown', primary: true, shift: false, alt: true },
  toggleCommandPalette: { key: 'k', primary: true, shift: false, alt: false },
  openAppearanceSettings: { key: ',', primary: true, shift: false, alt: false },
  toggleSidebar: { key: 'b', primary: true, shift: false, alt: false },
  toggleTaskBoard: { key: 'j', primary: true, shift: false, alt: false },
  newWorkspace: { key: 't', primary: true, shift: false, alt: false },
  splitHorizontal: { key: 'd', primary: true, shift: false, alt: false },
  splitVertical: { key: 'd', primary: true, shift: true, alt: false },
  closePane: { key: 'w', primary: true, shift: false, alt: false },
  runSnippetModal: { key: 's', primary: true, shift: true, alt: false }
};

function normalizeShortcutKey(value: string): string {
  const lower = value.toLowerCase();
  const aliases: Record<string, string> = {
    esc: 'escape',
    escape: 'escape',
    return: 'enter',
    ' ': 'space',
    spacebar: 'space',
    left: 'arrowleft',
    right: 'arrowright',
    up: 'arrowup',
    down: 'arrowdown',
    arrowleft: 'arrowleft',
    arrowright: 'arrowright',
    arrowup: 'arrowup',
    arrowdown: 'arrowdown'
  };
  return aliases[lower] ?? lower;
}

function isModifierKey(key: string): boolean {
  return key === 'shift' || key === 'control' || key === 'meta' || key === 'alt';
}

function sanitizeShortcutBinding(value: unknown, fallback: ShortcutBinding): ShortcutBinding {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<ShortcutBinding>;
  const key = typeof candidate.key === 'string' && candidate.key.trim()
    ? normalizeShortcutKey(candidate.key)
    : fallback.key;

  return {
    key,
    primary: Boolean(candidate.primary),
    shift: Boolean(candidate.shift),
    alt: Boolean(candidate.alt)
  };
}

function sanitizeShortcutSettings(value: unknown): ShortcutSettings {
  const fallback = defaultShortcutSettings;
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<Record<ShortcutId, ShortcutBinding>>;
  const result = {} as ShortcutSettings;

  for (const definition of shortcutDefinitions) {
    result[definition.id] = sanitizeShortcutBinding(candidate[definition.id], fallback[definition.id]);
  }

  return result;
}

function loadShortcutSettings(): ShortcutSettings {
  if (typeof localStorage === 'undefined') {
    return defaultShortcutSettings;
  }

  const raw = localStorage.getItem(SHORTCUTS_KEY);
  if (!raw) {
    return defaultShortcutSettings;
  }

  try {
    return sanitizeShortcutSettings(JSON.parse(raw));
  } catch (error) {
    console.error('Failed to parse shortcut settings:', error);
    return defaultShortcutSettings;
  }
}

export const shortcutSettings = writable<ShortcutSettings>(loadShortcutSettings());

shortcutSettings.subscribe(value => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(value));
});

export function updateShortcut(id: ShortcutId, binding: ShortcutBinding): void {
  shortcutSettings.update(current => ({
    ...current,
    [id]: sanitizeShortcutBinding(binding, defaultShortcutSettings[id])
  }));
}

export function resetShortcuts(): void {
  shortcutSettings.set(defaultShortcutSettings);
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): ShortcutBinding | null {
  const key = normalizeShortcutKey(event.key);

  if (!key || isModifierKey(key)) {
    return null;
  }

  return {
    key,
    primary: event.metaKey || event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey
  };
}

export function matchesShortcut(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  const key = normalizeShortcutKey(event.key);
  if (key !== binding.key) {
    return false;
  }

  const hasPrimary = event.metaKey || event.ctrlKey;
  if (hasPrimary !== binding.primary) {
    return false;
  }

  if (event.shiftKey !== binding.shift) {
    return false;
  }

  if (event.altKey !== binding.alt) {
    return false;
  }

  return true;
}

function formatKey(key: string): string {
  const labels: Record<string, string> = {
    escape: 'Esc',
    enter: 'Enter',
    space: 'Space',
    arrowleft: isMac ? '←' : 'Left',
    arrowright: isMac ? '→' : 'Right',
    arrowup: isMac ? '↑' : 'Up',
    arrowdown: isMac ? '↓' : 'Down'
  };

  if (labels[key]) {
    return labels[key];
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatShortcut(binding: ShortcutBinding): string {
  const key = formatKey(binding.key);

  if (isMac) {
    const prefix = `${binding.primary ? '⌘' : ''}${binding.alt ? '⌥' : ''}${binding.shift ? '⇧' : ''}`;
    return `${prefix}${key}`;
  }

  const parts: string[] = [];
  if (binding.primary) parts.push('Ctrl');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  parts.push(key);

  return parts.join('+');
}
