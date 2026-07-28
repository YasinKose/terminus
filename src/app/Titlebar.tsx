import {
  CheckSquare,
  ChevronRight,
  Command,
  FileCode2,
  GitBranch,
  Layers,
  MoreHorizontal,
  PanelLeft,
  Settings,
  SquareSplitHorizontal,
  SquareSplitVertical,
  SquareTerminal,
  Terminal,
} from "lucide-react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettingsStore } from "@/features/settings/settingsStore";
import {
  formatChord,
  type ShortcutMap,
} from "@/features/settings/shortcutModel";
import { useUiStore } from "@/features/ui/uiStore";
import {
  detectDesktopPlatform,
  isAppleDesktop,
} from "@/platform/detection";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "react-i18next";

export type TitlebarProps = {
  onOpenSettings?: () => void;
  onOpenPalette?: () => void;
  projectName?: string | null;
  workspaceName?: string | null;
  onNewTerminal?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  workspaceActionsDisabled?: boolean;
};

function chordLabel(shortcuts: ShortcutMap, id: keyof ShortcutMap): string {
  return formatChord(shortcuts[id], detectDesktopPlatform());
}

export function Titlebar({
  onOpenSettings,
  onOpenPalette,
  projectName,
  workspaceName,
  onNewTerminal,
  onSplitHorizontal,
  onSplitVertical,
  workspaceActionsDisabled = false,
}: TitlebarProps) {
  const { t } = useTranslation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const sidePanel = useUiStore((s) => s.sidePanel);
  const toggleGitPanel = useUiStore((s) => s.toggleGitPanel);
  const toggleSnippetsPanel = useUiStore((s) => s.toggleSnippetsPanel);
  const toggleTasksPanel = useUiStore((s) => s.toggleTasksPanel);
  const toggleTmuxPanel = useUiStore((s) => s.toggleTmuxPanel);
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
        className={cn(
          "shrink-0",
          isAppleDesktop() ? "w-[78px]" : "w-2",
        )}
        aria-hidden
        data-tauri-drag-region
        data-traffic-light-inset
      />
      <div className="flex items-center gap-0.5 pl-1" data-no-drag>
        <ToolbarIconButton
          label={
            sidebarCollapsed
              ? t("titlebar.showSidebar")
              : t("titlebar.hideSidebar")
          }
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
        className="flex min-w-0 items-center gap-1.5 text-muted-foreground"
        data-tauri-drag-region
      >
        <SquareTerminal aria-hidden className="size-3.5 text-primary" />
        {projectName ? (
          <div
            className="flex min-w-0 items-center gap-1.5 text-xs"
            data-testid="titlebar-context"
            aria-label={t("titlebar.activeContext", {
              project: projectName,
              workspace: workspaceName ?? "",
            })}
            data-tauri-drag-region
          >
            <span
              className="max-w-40 truncate font-medium text-foreground"
              data-tauri-drag-region
            >
              {projectName}
            </span>
            {workspaceName ? (
              <>
                <ChevronRight
                  aria-hidden
                  className="size-3 shrink-0 text-muted-foreground/70"
                />
                <span
                  className="max-w-48 truncate text-muted-foreground"
                  data-tauri-drag-region
                >
                  {workspaceName}
                </span>
              </>
            ) : null}
          </div>
        ) : (
          <span className="text-[10px] font-semibold tracking-[0.16em]">
            TERMINUS
          </span>
        )}
      </div>
      <div className="flex-1" data-tauri-drag-region />
      <div className="flex items-center gap-1 pr-2" data-no-drag>
        <div className="hidden items-center gap-1 min-[800px]:flex">
          {onNewTerminal || onSplitHorizontal || onSplitVertical ? (
            <>
              <div
                className="flex items-center gap-0.5"
                role="toolbar"
                aria-label={t("workspaces.actions")}
                data-testid="workspace-action-toolbar"
              >
                {onNewTerminal ? (
                  <ToolbarIconButton
                    label={t("commands.newTerminal")}
                    shortcut={chordLabel(shortcuts, "newTerminal")}
                    onClick={onNewTerminal}
                    disabled={workspaceActionsDisabled}
                    data-testid="workspace-action-new-terminal"
                  >
                    <Terminal aria-hidden className="size-4" />
                  </ToolbarIconButton>
                ) : null}
                {onSplitHorizontal ? (
                  <ToolbarIconButton
                    label={t("commands.splitHorizontal")}
                    shortcut={chordLabel(shortcuts, "splitHorizontal")}
                    onClick={onSplitHorizontal}
                    disabled={workspaceActionsDisabled}
                    data-testid="workspace-action-split-h"
                  >
                    <SquareSplitHorizontal
                      aria-hidden
                      className="size-4"
                    />
                  </ToolbarIconButton>
                ) : null}
                {onSplitVertical ? (
                  <ToolbarIconButton
                    label={t("commands.splitVertical")}
                    shortcut={chordLabel(shortcuts, "splitVertical")}
                    onClick={onSplitVertical}
                    disabled={workspaceActionsDisabled}
                    data-testid="workspace-action-split-v"
                  >
                    <SquareSplitVertical
                      aria-hidden
                      className="size-4"
                    />
                  </ToolbarIconButton>
                ) : null}
              </div>
              <div className="mx-1 h-4 w-px bg-border/80" aria-hidden />
            </>
          ) : null}
          <ToolbarIconButton
            label={
              sidePanel === "git"
                ? t("titlebar.hideGit")
                : t("titlebar.showGit")
            }
            pressed={sidePanel === "git"}
            onClick={toggleGitPanel}
            data-testid="titlebar-git-panel"
          >
            <GitBranch aria-hidden className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={
              sidePanel === "snippets"
                ? t("titlebar.hideSnippets")
                : t("titlebar.showSnippets")
            }
            pressed={sidePanel === "snippets"}
            onClick={toggleSnippetsPanel}
            data-testid="titlebar-snippets-panel"
          >
            <FileCode2 aria-hidden className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={
              sidePanel === "tasks"
                ? t("titlebar.hideTasks")
                : t("titlebar.showTasks")
            }
            pressed={sidePanel === "tasks"}
            onClick={toggleTasksPanel}
            data-testid="titlebar-tasks-panel"
          >
            <CheckSquare aria-hidden className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={
              sidePanel === "tmux"
                ? t("titlebar.hideTmux")
                : t("titlebar.showTmux")
            }
            pressed={sidePanel === "tmux"}
            onClick={toggleTmuxPanel}
            data-testid="titlebar-tmux-panel"
          >
            <Layers aria-hidden className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={t("titlebar.commandPalette")}
            shortcut={chordLabel(shortcuts, "commandPalette")}
            onClick={() => onOpenPalette?.()}
            data-testid="titlebar-command-palette"
            disabled={!onOpenPalette}
          >
            <Command aria-hidden className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={t("titlebar.settings")}
            shortcut={chordLabel(shortcuts, "openSettings")}
            onClick={handleSettings}
            data-testid="titlebar-settings"
          >
            <Settings aria-hidden className="size-4" />
          </ToolbarIconButton>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="min-[800px]:hidden"
              aria-label={t("titlebar.moreActions")}
              data-testid="titlebar-overflow-menu"
            >
              <MoreHorizontal aria-hidden className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={5} className="w-52">
            {onNewTerminal ? (
              <DropdownMenuItem
                disabled={workspaceActionsDisabled}
                onSelect={onNewTerminal}
              >
                <Terminal aria-hidden />
                {t("commands.newTerminal")}
              </DropdownMenuItem>
            ) : null}
            {onSplitHorizontal ? (
              <DropdownMenuItem
                disabled={workspaceActionsDisabled}
                onSelect={onSplitHorizontal}
              >
                <SquareSplitHorizontal aria-hidden />
                {t("commands.splitHorizontal")}
              </DropdownMenuItem>
            ) : null}
            {onSplitVertical ? (
              <DropdownMenuItem
                disabled={workspaceActionsDisabled}
                onSelect={onSplitVertical}
              >
                <SquareSplitVertical aria-hidden />
                {t("commands.splitVertical")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggleGitPanel}>
              <GitBranch aria-hidden />
              {sidePanel === "git"
                ? t("titlebar.hideGit")
                : t("titlebar.showGit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleSnippetsPanel}>
              <FileCode2 aria-hidden />
              {sidePanel === "snippets"
                ? t("titlebar.hideSnippets")
                : t("titlebar.showSnippets")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleTasksPanel}>
              <CheckSquare aria-hidden />
              {sidePanel === "tasks"
                ? t("titlebar.hideTasks")
                : t("titlebar.showTasks")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleTmuxPanel}>
              <Layers aria-hidden />
              {sidePanel === "tmux"
                ? t("titlebar.hideTmux")
                : t("titlebar.showTmux")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!onOpenPalette}
              onSelect={() => onOpenPalette?.()}
            >
              <Command aria-hidden />
              {t("titlebar.commandPalette")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSettings}>
              <Settings aria-hidden />
              {t("titlebar.settings")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
