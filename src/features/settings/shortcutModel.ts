export type ShortcutCommandId =
  | "commandPalette"
  | "newWorkspace"
  | "newTerminal"
  | "splitHorizontal"
  | "splitVertical"
  | "closePane"
  | "toggleFocus"
  | "toggleSidebar"
  | "nextWorkspace"
  | "prevWorkspace"
  | "openSettings";

export type ShortcutChord = {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
};

export type ShortcutMap = Record<ShortcutCommandId, ShortcutChord>;

export const SHORTCUT_COMMANDS: {
  id: ShortcutCommandId;
  label: string;
}[] = [
  { id: "commandPalette", label: "Command palette" },
  { id: "newWorkspace", label: "New workspace" },
  { id: "newTerminal", label: "New terminal" },
  { id: "splitHorizontal", label: "Split horizontal" },
  { id: "splitVertical", label: "Split vertical" },
  { id: "closePane", label: "Close pane" },
  { id: "toggleFocus", label: "Toggle focus mode" },
  { id: "toggleSidebar", label: "Toggle sidebar" },
  { id: "nextWorkspace", label: "Next workspace" },
  { id: "prevWorkspace", label: "Previous workspace" },
  { id: "openSettings", label: "Open settings" },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  commandPalette: { key: "k", meta: true, ctrl: false, alt: false, shift: false },
  newWorkspace: { key: "t", meta: true, ctrl: false, alt: false, shift: true },
  newTerminal: { key: "n", meta: true, ctrl: false, alt: false, shift: false },
  splitHorizontal: { key: "d", meta: false, ctrl: true, alt: false, shift: false },
  splitVertical: { key: "d", meta: false, ctrl: true, alt: false, shift: true },
  closePane: { key: "w", meta: true, ctrl: false, alt: false, shift: false },
  toggleFocus: { key: "f", meta: true, ctrl: false, alt: false, shift: true },
  toggleSidebar: { key: "b", meta: true, ctrl: false, alt: false, shift: false },
  nextWorkspace: { key: "]", meta: true, ctrl: false, alt: false, shift: false },
  prevWorkspace: { key: "[", meta: true, ctrl: false, alt: false, shift: false },
  openSettings: { key: ",", meta: true, ctrl: false, alt: false, shift: false },
};

export function normalizeKey(key: string): string {
  if (key === " ") return "space";
  if (key.length === 1) return key.toLowerCase();
  const map: Record<string, string> = {
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    Escape: "escape",
    Enter: "enter",
    Tab: "tab",
    Backspace: "backspace",
    Delete: "delete",
  };
  return map[key] ?? key.toLowerCase();
}

export function chordFromKeyboardEvent(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): ShortcutChord {
  return {
    key: normalizeKey(e.key),
    meta: e.metaKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
  };
}

export function chordsEqual(a: ShortcutChord, b: ShortcutChord): boolean {
  return (
    a.key === b.key &&
    a.meta === b.meta &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift
  );
}

export function formatChordMac(chord: ShortcutChord): string {
  const parts: string[] = [];
  if (chord.ctrl) parts.push("⌃");
  if (chord.alt) parts.push("⌥");
  if (chord.shift) parts.push("⇧");
  if (chord.meta) parts.push("⌘");
  const keyLabel =
    chord.key.length === 1
      ? chord.key.toUpperCase()
      : chord.key === "space"
        ? "Space"
        : chord.key.charAt(0).toUpperCase() + chord.key.slice(1);
  parts.push(keyLabel);
  return parts.join("");
}

export function isUnmodifiedTerminalKeystroke(chord: ShortcutChord): boolean {
  if (chord.meta || chord.ctrl || chord.alt) return false;
  if (chord.key.length === 1) return true;
  if (chord.key === "space" || chord.key === "enter" || chord.key === "tab") {
    return true;
  }
  if (chord.key === "backspace" || chord.key === "delete") return true;
  return false;
}

export function findConflicts(
  map: ShortcutMap,
): { a: ShortcutCommandId; b: ShortcutCommandId }[] {
  const ids = Object.keys(map) as ShortcutCommandId[];
  const conflicts: { a: ShortcutCommandId; b: ShortcutCommandId }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      if (chordsEqual(map[a], map[b])) {
        conflicts.push({ a, b });
      }
    }
  }
  return conflicts;
}

export function matchCommand(
  map: ShortcutMap,
  chord: ShortcutChord,
): ShortcutCommandId | null {
  for (const id of Object.keys(map) as ShortcutCommandId[]) {
    if (chordsEqual(map[id], chord)) return id;
  }
  return null;
}

export function parseShortcutMap(value: unknown): ShortcutMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const result = { ...DEFAULT_SHORTCUTS };
  for (const cmd of SHORTCUT_COMMANDS) {
    const entry = raw[cmd.id];
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.key !== "string") continue;
    result[cmd.id] = {
      key: normalizeKey(e.key),
      meta: Boolean(e.meta),
      ctrl: Boolean(e.ctrl),
      alt: Boolean(e.alt),
      shift: Boolean(e.shift),
    };
  }
  return result;
}

export function resetShortcuts(): ShortcutMap {
  return { ...DEFAULT_SHORTCUTS };
}
