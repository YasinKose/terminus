import {
  Command,
  GitBranch,
  PanelLeft,
  Settings,
  SquareTerminal,
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
  const gitPanelOpen = useUiStore((s) => s.gitPanelOpen);
  const toggleGitPanel = useUiStore((s) => s.toggleGitPanel);
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
      className="flex h-11 shrink-0 items-center border-b border-border/90 bg-chrome text-sm shadow-[0_1px_0_rgb(255_255_255/0.025)_inset]"
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
      <div
        className="mx-2 h-4 w-px bg-border/80"
        aria-hidden
        data-tauri-drag-region
      />
      <div
        className="flex items-center gap-1.5 text-muted-foreground"
        data-tauri-drag-region
      >
        <SquareTerminal aria-hidden className="size-3.5 text-primary" />
        <span className="text-[10px] font-semibold tracking-[0.16em]">
          TERMINUS
        </span>
      </div>
      <div className="flex-1" data-tauri-drag-region />
      <div className="flex items-center gap-1 pr-2" data-no-drag>
        <ToolbarIconButton
          label={gitPanelOpen ? "Hide git panel" : "Show git panel"}
          pressed={gitPanelOpen}
          onClick={toggleGitPanel}
          data-testid="titlebar-git-panel"
        >
          <GitBranch aria-hidden className="size-4" />
        </ToolbarIconButton>
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
