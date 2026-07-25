import { Plus, SquareSplitHorizontal, SquareSplitVertical, Terminal, X } from "lucide-react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { useSettingsStore } from "@/features/settings/settingsStore";
import {
  formatChordMac,
  type ShortcutMap,
} from "@/features/settings/shortcutModel";
import type { WorkspaceView } from "@/lib/tauri/contracts";
import { cn } from "@/lib/utils/cn";

export type WorkspaceTabsProps = {
  workspaces: WorkspaceView[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onRenameWorkspace?: (workspaceId: string, name: string) => void;
  onCreateWorkspace?: () => void;
  onCloseWorkspace?: (workspaceId: string) => void;
  onNewTerminal?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  actionsDisabled?: boolean;
};

function chordLabel(shortcuts: ShortcutMap, id: keyof ShortcutMap): string {
  return formatChordMac(shortcuts[id]);
}

export function WorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
  onCloseWorkspace,
  onNewTerminal,
  onSplitHorizontal,
  onSplitVertical,
  actionsDisabled = false,
}: WorkspaceTabsProps) {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const showActions =
    Boolean(onNewTerminal) ||
    Boolean(onSplitHorizontal) ||
    Boolean(onSplitVertical);

  return (
    <div
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-background px-1"
      role="tablist"
      aria-label="Workspaces"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {workspaces.map((ws) => {
          const active = ws.id === activeWorkspaceId;
          return (
            <div
              key={ws.id}
              className={cn(
                "inline-flex h-7 max-w-[12rem] items-center gap-0.5 rounded-md px-1 text-xs",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                data-workspace-tab-id={ws.id}
                data-testid={`workspace-tab-${ws.id}`}
                className="max-w-[9rem] truncate rounded px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => onSelectWorkspace(ws.id)}
                onDoubleClick={() => {
                  if (!onRenameWorkspace) return;
                  const next = window.prompt("Rename workspace", ws.name);
                  if (next && next.trim() && next.trim() !== ws.name) {
                    onRenameWorkspace(ws.id, next.trim());
                  }
                }}
              >
                {ws.name}
              </button>
              {onCloseWorkspace ? (
                <button
                  type="button"
                  data-testid={`close-workspace-${ws.id}`}
                  className="inline-flex size-6 items-center justify-center rounded text-muted-foreground opacity-70 outline-none hover:bg-background/60 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Close ${ws.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWorkspace(ws.id);
                  }}
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
        {onCreateWorkspace ? (
          <ToolbarIconButton
            label="New workspace"
            shortcut={chordLabel(shortcuts, "newWorkspace")}
            onClick={onCreateWorkspace}
            data-testid="workspace-new-tab"
            className="size-7"
          >
            <Plus aria-hidden className="size-3.5" />
          </ToolbarIconButton>
        ) : null}
      </div>

      {showActions ? (
        <div
          className="flex shrink-0 items-center gap-0.5 border-l border-border pl-1"
          role="toolbar"
          aria-label="Workspace actions"
          data-testid="workspace-action-toolbar"
        >
          {onNewTerminal ? (
            <ToolbarIconButton
              label="New terminal"
              shortcut={chordLabel(shortcuts, "newTerminal")}
              onClick={onNewTerminal}
              disabled={actionsDisabled}
              data-testid="workspace-action-new-terminal"
            >
              <Terminal aria-hidden className="size-4" />
            </ToolbarIconButton>
          ) : null}
          {onSplitHorizontal ? (
            <ToolbarIconButton
              label="Split horizontal"
              shortcut={chordLabel(shortcuts, "splitHorizontal")}
              onClick={onSplitHorizontal}
              disabled={actionsDisabled}
              data-testid="workspace-action-split-h"
            >
              <SquareSplitHorizontal aria-hidden className="size-4" />
            </ToolbarIconButton>
          ) : null}
          {onSplitVertical ? (
            <ToolbarIconButton
              label="Split vertical"
              shortcut={chordLabel(shortcuts, "splitVertical")}
              onClick={onSplitVertical}
              disabled={actionsDisabled}
              data-testid="workspace-action-split-v"
            >
              <SquareSplitVertical aria-hidden className="size-4" />
            </ToolbarIconButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
