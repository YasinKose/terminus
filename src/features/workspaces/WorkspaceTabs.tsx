import {
  Plus,
  SquareSplitHorizontal,
  SquareSplitVertical,
  Terminal,
  X,
} from "lucide-react";
import { useState } from "react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const showActions =
    Boolean(onNewTerminal) ||
    Boolean(onSplitHorizontal) ||
    Boolean(onSplitVertical);

  const submitRename = () => {
    if (!renameTarget || !onRenameWorkspace) return;
    const next = renameValue.trim();
    if (!next || next === renameTarget.name) return;
    onRenameWorkspace(renameTarget.id, next);
    setRenameTarget(null);
  };

  return (
    <>
      <div
        className="flex h-11 shrink-0 items-center gap-2 border-b border-border/90 bg-surface-sunken px-2"
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
                  "group/tab inline-flex h-8 max-w-[13rem] shrink-0 items-center gap-0.5 rounded-lg border px-1 text-xs transition-[background-color,border-color,color] duration-150",
                  active
                    ? "border-border bg-surface-raised font-medium text-accent-foreground shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]"
                    : "border-transparent text-muted-foreground hover:border-border/55 hover:bg-accent/45 hover:text-foreground",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-workspace-tab-id={ws.id}
                  data-testid={`workspace-tab-${ws.id}`}
                  className="h-7 max-w-[9.5rem] truncate rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                  onClick={() => onSelectWorkspace(ws.id)}
                  onDoubleClick={() => {
                    if (!onRenameWorkspace) return;
                    setRenameTarget({ id: ws.id, name: ws.name });
                    setRenameValue(ws.name);
                  }}
                >
                  {ws.name}
                </button>
                {onCloseWorkspace ? (
                  <button
                    type="button"
                    data-testid={`close-workspace-${ws.id}`}
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-[background-color,color,opacity] duration-150 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover/tab:opacity-75"
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
              className="size-8"
            >
              <Plus aria-hidden className="size-3.5" />
            </ToolbarIconButton>
          ) : null}
        </div>

        {showActions ? (
          <div
            className="flex shrink-0 items-center gap-1 border-l border-border/80 pl-2"
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

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>
              Choose a short name that identifies this terminal layout.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="workspace-rename">Workspace name</Label>
              <Input
                id="workspace-rename"
                name="workspace-name"
                autoComplete="off"
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !renameValue.trim() ||
                  renameValue.trim() === renameTarget?.name
                }
              >
                Rename workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
