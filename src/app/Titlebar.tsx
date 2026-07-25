import {
  Command,
  PanelLeft,
  Settings,
} from "lucide-react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { useSettingsStore } from "@/features/settings/settingsStore";
import {
  formatChordMac,
  type ShortcutMap,
} from "@/features/settings/shortcutModel";
import { useUiStore } from "@/features/ui/uiStore";

export type TitlebarProps = {
  onOpenSettings?: () => void;
  onOpenPalette?: () => void;
};

function chordLabel(shortcuts: ShortcutMap, id: keyof ShortcutMap): string {
  return formatChordMac(shortcuts[id]);
}

export function Titlebar({ onOpenSettings, onOpenPalette }: TitlebarProps) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  const handleSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    setSettingsOpen(true);
  };

  return (
    <header
      className="flex h-10 shrink-0 items-center border-b border-border bg-card text-sm"
      data-tauri-drag-region
    >
      <div
        className="w-[78px] shrink-0"
        aria-hidden
        data-tauri-drag-region
        data-traffic-light-inset
      />
      <div className="flex items-center gap-0.5 pl-1" data-no-drag>
        <ToolbarIconButton
          label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          shortcut={chordLabel(shortcuts, "toggleSidebar")}
          pressed={!sidebarCollapsed}
          onClick={toggleSidebar}
          data-testid="titlebar-toggle-sidebar"
        >
          <PanelLeft aria-hidden className="size-4" />
        </ToolbarIconButton>
      </div>
      <div className="flex-1" data-tauri-drag-region />
      <div className="flex items-center gap-0.5 pr-2" data-no-drag>
        <ToolbarIconButton
          label="Command palette"
          shortcut={chordLabel(shortcuts, "commandPalette")}
          onClick={() => onOpenPalette?.()}
          data-testid="titlebar-command-palette"
          disabled={!onOpenPalette}
        >
          <Command aria-hidden className="size-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Settings"
          shortcut={chordLabel(shortcuts, "openSettings")}
          onClick={handleSettings}
          data-testid="titlebar-settings"
        >
          <Settings aria-hidden className="size-4" />
        </ToolbarIconButton>
      </div>
    </header>
  );
}
