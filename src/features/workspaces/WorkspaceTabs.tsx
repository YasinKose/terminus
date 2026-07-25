import {
  Check,
  ChevronDown,
  Plus,
  SquareSplitHorizontal,
  SquareSplitVertical,
  Terminal,
  X,
} from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/features/settings/settingsStore";
import {
  formatChordMac,
  type ShortcutMap,
} from "@/features/settings/shortcutModel";
import type { WorkspaceView } from "@/lib/tauri/contracts";
import { cn } from "@/lib/utils/cn";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";

export type WorkspaceTabsProps = {
  workspaces: WorkspaceView[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onRenameWorkspace?: (workspaceId: string, name: string) => void;
  onCreateWorkspace?: () => void;
  onCloseWorkspace?: (workspaceId: string) => void;
  onMoveWorkspace?: (workspaceId: string, direction: -1 | 1) => void;
  onNewTerminal?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  actionsDisabled?: boolean;
};

function chordLabel(shortcuts: ShortcutMap, id: keyof ShortcutMap): string {
  return formatChordMac(shortcuts[id]);
}

type WorkspaceMeasurement = {
  id: string;
  width: number;
};

function rowWidth(
  workspaceWidths: number[],
  controlWidths: number[],
  gap: number,
): number {
  const itemCount = workspaceWidths.length + controlWidths.length;
  const gapsWidth = Math.max(0, itemCount - 1) * gap;
  return (
    workspaceWidths.reduce((sum, width) => sum + width, 0) +
    controlWidths.reduce((sum, width) => sum + width, 0) +
    gapsWidth
  );
}

export function calculateVisibleWorkspaceIds({
  availableWidth,
  workspaces,
  activeWorkspaceId,
  createControlWidth,
  overflowControlWidth,
  gap,
}: {
  availableWidth: number;
  workspaces: WorkspaceMeasurement[];
  activeWorkspaceId: string | null;
  createControlWidth: number;
  overflowControlWidth: number;
  gap: number;
}): string[] {
  const createControls = createControlWidth > 0 ? [createControlWidth] : [];
  const allWidths = workspaces.map((workspace) => workspace.width);

  if (rowWidth(allWidths, createControls, gap) <= availableWidth) {
    return workspaces.map((workspace) => workspace.id);
  }

  const overflowControls = [...createControls, overflowControlWidth];
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );
  const selected: WorkspaceMeasurement[] = [];

  if (
    activeWorkspace &&
    rowWidth([activeWorkspace.width], overflowControls, gap) <= availableWidth
  ) {
    selected.push(activeWorkspace);
  }

  for (const workspace of workspaces) {
    if (workspace.id === activeWorkspace?.id) continue;
    const candidate = [...selected, workspace];
    if (
      rowWidth(
        candidate.map((item) => item.width),
        overflowControls,
        gap,
      ) > availableWidth
    ) {
      break;
    }
    selected.push(workspace);
  }

  const selectedIds = new Set(selected.map((workspace) => workspace.id));
  return workspaces
    .filter((workspace) => selectedIds.has(workspace.id))
    .map((workspace) => workspace.id);
}

export function WorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
  onCloseWorkspace,
  onMoveWorkspace,
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [visibleWorkspaceIds, setVisibleWorkspaceIds] = useState<string[]>(() =>
    workspaces.map((workspace) => workspace.id),
  );
  const showActions =
    Boolean(onNewTerminal) ||
    Boolean(onSplitHorizontal) ||
    Boolean(onSplitVertical);

  const measureOverflow = useCallback(() => {
    const viewport = viewportRef.current;
    const measurement = measurementRef.current;
    if (!viewport || !measurement) return;

    const availableWidth = viewport.getBoundingClientRect().width;
    if (availableWidth <= 0) {
      setVisibleWorkspaceIds(workspaces.map((workspace) => workspace.id));
      return;
    }

    const measuredWorkspaces = workspaces.map((workspace) => {
      const element = measurement.querySelector<HTMLElement>(
        `[data-workspace-measure-id="${CSS.escape(workspace.id)}"]`,
      );
      return {
        id: workspace.id,
        width: element?.getBoundingClientRect().width ?? 0,
      };
    });
    const createControl = measurement.querySelector<HTMLElement>(
      '[data-workspace-measure-control="create"]',
    );
    const overflowControl = measurement.querySelector<HTMLElement>(
      '[data-workspace-measure-control="overflow"]',
    );
    const measuredGap = Number.parseFloat(
      window.getComputedStyle(viewport).columnGap,
    );
    const nextVisibleIds = calculateVisibleWorkspaceIds({
      availableWidth,
      workspaces: measuredWorkspaces,
      activeWorkspaceId,
      createControlWidth: createControl?.getBoundingClientRect().width ?? 0,
      overflowControlWidth:
        overflowControl?.getBoundingClientRect().width ?? 0,
      gap: Number.isFinite(measuredGap) ? measuredGap : 4,
    });

    setVisibleWorkspaceIds((current) => {
      if (
        current.length === nextVisibleIds.length &&
        current.every((id, index) => id === nextVisibleIds[index])
      ) {
        return current;
      }
      return nextVisibleIds;
    });
  }, [activeWorkspaceId, workspaces]);

  useLayoutEffect(() => {
    measureOverflow();

    if (typeof ResizeObserver === "undefined" || !viewportRef.current) {
      return;
    }

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [measureOverflow]);

  const visibleWorkspaceIdSet = useMemo(
    () => new Set(visibleWorkspaceIds),
    [visibleWorkspaceIds],
  );
  const visibleWorkspaces = workspaces.filter((workspace) =>
    visibleWorkspaceIdSet.has(workspace.id),
  );
  const hiddenWorkspaces = workspaces.filter(
    (workspace) => !visibleWorkspaceIdSet.has(workspace.id),
  );

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
        <div
          ref={viewportRef}
          data-testid="workspace-tabs-viewport"
          className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        >
          <div
            ref={measurementRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 flex items-center gap-1 whitespace-nowrap"
          >
            {workspaces.map((ws) => {
              const active = ws.id === activeWorkspaceId;
              return (
                <div
                  key={ws.id}
                  data-workspace-measure-id={ws.id}
                  className={cn(
                    "inline-flex h-8 max-w-[13rem] shrink-0 items-center gap-0.5 rounded-lg border px-1 text-xs",
                    active ? "font-medium" : "border-transparent",
                  )}
                >
                  <span className="inline-flex h-7 max-w-[9.5rem] items-center truncate rounded-md px-2 text-left">
                    {ws.name}
                  </span>
                  {onCloseWorkspace ? (
                    <span className="inline-flex size-6 shrink-0" />
                  ) : null}
                </div>
              );
            })}
            {onCreateWorkspace ? (
              <span
                data-workspace-measure-control="create"
                className="inline-flex size-8 shrink-0"
              />
            ) : null}
            <span
              data-workspace-measure-control="overflow"
              className="inline-flex size-8 shrink-0"
            />
          </div>

          {visibleWorkspaces.map((ws) => {
            const active = ws.id === activeWorkspaceId;
            const workspaceIndex = workspaces.findIndex(
              (item) => item.id === ws.id,
            );
            return (
              <WorkspaceContextMenu
                key={ws.id}
                canMoveLeft={workspaceIndex > 0}
                canMoveRight={
                  workspaceIndex >= 0 &&
                  workspaceIndex < workspaces.length - 1
                }
                onRename={() => {
                  if (!onRenameWorkspace) return;
                  setRenameTarget({ id: ws.id, name: ws.name });
                  setRenameValue(ws.name);
                }}
                onMove={(direction) => onMoveWorkspace?.(ws.id, direction)}
                onClose={() => onCloseWorkspace?.(ws.id)}
              >
                <div
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
                    onAuxClick={(event) => {
                      if (event.button !== 1 || !onCloseWorkspace) return;
                      event.preventDefault();
                      event.stopPropagation();
                      onCloseWorkspace(ws.id);
                    }}
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
              </WorkspaceContextMenu>
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
          {hiddenWorkspaces.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 gap-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Show ${hiddenWorkspaces.length} more ${
                    hiddenWorkspaces.length === 1
                      ? "workspace"
                      : "workspaces"
                  }`}
                  data-testid="workspace-overflow-trigger"
                >
                  <span className="text-[11px] leading-none tabular-nums">
                    {hiddenWorkspaces.length}
                  </span>
                  <ChevronDown aria-hidden className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={5}
                className="min-w-52"
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  More workspaces
                </DropdownMenuLabel>
                {hiddenWorkspaces.map((workspace) => {
                  const active = workspace.id === activeWorkspaceId;
                  return (
                    <DropdownMenuItem
                      key={workspace.id}
                      data-workspace-tab-id={workspace.id}
                      className="min-w-0"
                      onSelect={() => onSelectWorkspace(workspace.id)}
                      onAuxClick={(event) => {
                        if (event.button !== 1 || !onCloseWorkspace) return;
                        event.preventDefault();
                        event.stopPropagation();
                        onCloseWorkspace(workspace.id);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {workspace.name}
                      </span>
                      {active ? (
                        <Check
                          aria-hidden
                          className="size-3.5 text-primary"
                        />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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
