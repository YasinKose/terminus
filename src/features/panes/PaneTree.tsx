import { useCallback, useId, useRef, useState } from "react";
import { GripVertical, Pencil, X } from "lucide-react";
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
import { TerminalPane } from "@/features/terminal/TerminalPane";
import { TerminalStatus } from "@/features/terminal/TerminalStatus";
import { useTerminalStore } from "@/features/terminal/terminalStore";
import { useProfileStore } from "@/features/profiles/profileStore";
import { paneProfileLabel } from "@/features/profiles/profileModel";
import { useSettingsStore } from "@/features/settings/settingsStore";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import { DropZoneOverlay } from "./DropZoneOverlay";
import {
  hitTestDropZone,
  type DropZone,
} from "./PaneDragController";
import { PaneContextMenu } from "./PaneContextMenu";
import type { PaneNode, TerminalLeaf } from "./model";
import { createTerminalLeaf } from "./model";
import { usePaneDragStore } from "./paneDragStore";
import { SplitContainerView } from "./SplitContainer";
import { renameTerminal, setTerminalProfile, splitPane } from "./tree";
import { useTranslation } from "react-i18next";

export type PaneTreeProps = {
  root: PaneNode;
  projectId: string;
  workspaceId: string;
  activePaneId?: string | null;
  onTreeChange: (next: PaneNode) => void;
  onActivatePane?: (paneId: string) => void;
  onDragCommit?: () => void;
};

function TerminalLeafView({
  leaf,
  projectId,
  workspaceId,
  activePaneId,
  profiles,
  onActivate,
  onDragCommit,
  onRename,
  onSelectProfile,
  onSplit,
  onToggleFocus,
}: {
  leaf: TerminalLeaf;
  projectId: string;
  workspaceId: string;
  activePaneId?: string | null;
  profiles: ProfileRecord[];
  onActivate?: (paneId: string) => void;
  onDragCommit?: () => void;
  onRename: (terminalId: string, title: string) => void;
  onSelectProfile: (terminalId: string, profileId: string | null) => void;
  onSplit: (terminalId: string, direction: "row" | "column") => void;
  onToggleFocus: () => void;
}) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const renameInputId = useId();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const drag = usePaneDragStore((s) => s.drag);
  const beginDrag = usePaneDragStore((s) => s.beginDrag);
  const setOver = usePaneDragStore((s) => s.setOver);
  const endDrag = usePaneDragStore((s) => s.endDrag);
  const session = useTerminalStore((s) => s.sessions[leaf.id]);
  const focused = activePaneId === leaf.id;
  const displayTitle =
    leaf.titleOverride?.trim() ||
    session?.title?.trim() ||
    t("terminal.defaultTitle");
  const profileLabel = paneProfileLabel(
    leaf.profileId,
    profiles,
    t("settings.profiles.systemShell"),
  );

  const isDragging = drag.status === "dragging";
  const isSource =
    isDragging &&
    drag.source.paneId === leaf.id &&
    drag.source.workspaceId === workspaceId;
  const activeZone: DropZone | null =
    isDragging &&
    drag.over?.kind === "pane" &&
    drag.over.paneId === leaf.id
      ? drag.over.zone
      : null;

  const onPointerDownHandle = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    beginDrag({
      paneId: leaf.id,
      workspaceId,
      projectId,
      pointerId: e.pointerId,
    });
    onActivate?.(leaf.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || drag.status !== "dragging") return;
    if (drag.source.pointerId !== e.pointerId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const paneEl = el?.closest?.("[data-pane-id]") as HTMLElement | null;
    const tabEl = el?.closest?.("[data-workspace-tab-id]") as HTMLElement | null;

    if (tabEl) {
      const wsId = tabEl.getAttribute("data-workspace-tab-id");
      if (wsId) {
        setOver({ kind: "workspace", workspaceId: wsId });
        return;
      }
    }

    if (paneEl) {
      const paneId = paneEl.getAttribute("data-pane-id");
      if (!paneId) return;
      const rect = paneEl.getBoundingClientRect();
      const zone = hitTestDropZone(e.clientX, e.clientY, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      setOver({ kind: "pane", paneId, zone });
      return;
    }

    setOver(null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging || drag.status !== "dragging") return;
    if (drag.source.pointerId !== e.pointerId) return;
    onDragCommit?.();
    endDrag();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (!isDragging || drag.status !== "dragging") return;
    if (drag.source.pointerId !== e.pointerId) return;
    endDrag();
  };

  const openRenameDialog = () => {
    setRenameValue(displayTitle);
    setRenameOpen(true);
  };

  const submitRename = () => {
    const nextTitle = renameValue.trim();
    if (!nextTitle) return;
    onRename(leaf.id, nextTitle);
    setRenameOpen(false);
  };

  const requestClose = () => {
    useCloseRequestStore.getState().requestClose({
      kind: "terminal",
      sessionId: leaf.id,
      workspaceId,
      projectId,
      title: displayTitle,
      terminalCount: 1,
    });
  };

  return (
    <>
      <PaneContextMenu
        profiles={profiles}
        selectedProfileId={leaf.profileId}
        onSplit={(direction) => onSplit(leaf.id, direction)}
        onToggleFocus={onToggleFocus}
        onRename={openRenameDialog}
        onSelectProfile={(profileId) => onSelectProfile(leaf.id, profileId)}
        onClose={requestClose}
      >
        <div
          ref={hostRef}
          data-testid={`pane-leaf-${leaf.id}`}
          data-pane-id={leaf.id}
          data-active-pane={focused ? "true" : "false"}
          className="terminus-pane relative h-full min-h-0 w-full min-w-0"
          onMouseDown={() => onActivate?.(leaf.id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div
              className={
                focused
                  ? "flex h-8 shrink-0 items-center gap-1 border-b border-border/90 bg-surface-raised px-1.5"
                  : "flex h-8 shrink-0 items-center gap-1 border-b border-border/70 bg-chrome/75 px-1.5"
              }
            >
              <button
                type="button"
                data-testid={`pane-drag-handle-${leaf.id}`}
                className="inline-flex size-6 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35 active:cursor-grabbing"
                onPointerDown={onPointerDownHandle}
                aria-label={t("panes.drag")}
              >
                <GripVertical aria-hidden className="size-3.5" />
              </button>
              <button
                type="button"
                className="group/title flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left outline-none transition-colors duration-150 hover:bg-accent/65 focus-visible:ring-2 focus-visible:ring-ring/35"
                aria-label={t("panes.renameNamed", { name: displayTitle })}
                title={t("panes.rename")}
                onClick={(event) => {
                  event.stopPropagation();
                  openRenameDialog();
                }}
              >
                <TerminalStatus
                  status={session?.status ?? "starting"}
                  activity={session?.activity ?? "quiet"}
                  unread={session?.unread ?? false}
                  attention={session?.attention ?? false}
                  title={displayTitle}
                  className="min-w-0 flex-1"
                />
                <Pencil
                  aria-hidden
                  className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/title:opacity-80 group-focus-visible/title:opacity-80"
                />
              </button>
              <span
                data-testid={`pane-profile-${leaf.id}`}
                className="max-w-28 shrink-0 truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title={t("panes.profile", { name: profileLabel })}
              >
                {profileLabel}
              </span>
              <button
                type="button"
                data-testid={`close-pane-${leaf.id}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/35"
                aria-label={t("terminal.close")}
                onClick={(e) => {
                  e.stopPropagation();
                  requestClose();
                }}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <TerminalPane
                sessionId={leaf.id}
                projectId={projectId}
                profileId={leaf.profileId}
                initialCwd={leaf.initialCwd || null}
                tmuxSession={leaf.tmuxSession}
                title={
                  leaf.titleOverride ??
                  (leaf.tmuxSession
                    ? `tmux: ${leaf.tmuxSession}`
                    : t("terminal.defaultTitle"))
                }
                focused={focused}
                showChrome={false}
              />
            </div>
          </div>
          <DropZoneOverlay
            visible={isDragging && !isSource}
            activeZone={activeZone}
          />
        </div>
      </PaneContextMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("panes.renameTitle")}</DialogTitle>
            <DialogDescription>
              {t("panes.renameDescription")}
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
              <Label htmlFor={renameInputId}>{t("panes.terminalName")}</Label>
              <Input
                id={renameInputId}
                name="terminal-name"
                autoComplete="off"
                autoFocus
                maxLength={80}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                {t("panes.rename")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PaneTree({
  root,
  projectId,
  workspaceId,
  activePaneId = null,
  onTreeChange,
  onActivatePane,
  onDragCommit,
}: PaneTreeProps) {
  const profiles = useProfileStore((state) => state.profiles);
  const toggleFocusMode = useSettingsStore((state) => state.toggleFocusMode);

  const handleRenameTerminal = useCallback(
    (terminalId: string, title: string) => {
      const renamed = renameTerminal(root, terminalId, title);
      if (renamed.ok) onTreeChange(renamed.value);
    },
    [onTreeChange, root],
  );

  const handleSelectProfile = useCallback(
    (terminalId: string, profileId: string | null) => {
      const updated = setTerminalProfile(root, terminalId, profileId);
      if (updated.ok) onTreeChange(updated.value);
    },
    [onTreeChange, root],
  );

  const handleSplit = useCallback(
    (terminalId: string, direction: "row" | "column") => {
      const leaf = createTerminalLeaf(crypto.randomUUID(), { initialCwd: "" });
      const updated = splitPane(
        root,
        terminalId,
        direction,
        leaf,
        crypto.randomUUID(),
      );
      if (updated.ok) onTreeChange(updated.value);
    },
    [onTreeChange, root],
  );

  const renderNode = useCallback(
    (node: PaneNode): React.ReactNode => {
      if (node.type === "terminal") {
        return (
          <TerminalLeafView
            leaf={node}
            projectId={projectId}
            workspaceId={workspaceId}
            activePaneId={activePaneId}
            profiles={profiles}
            onActivate={onActivatePane}
            onDragCommit={onDragCommit}
            onRename={handleRenameTerminal}
            onSelectProfile={handleSelectProfile}
            onSplit={handleSplit}
            onToggleFocus={toggleFocusMode}
          />
        );
      }

      return (
        <SplitContainerView
          node={node}
          root={root}
          onTreeChange={onTreeChange}
          renderChild={renderNode}
        />
      );
    },
    [
      activePaneId,
      handleRenameTerminal,
      handleSelectProfile,
      handleSplit,
      onActivatePane,
      onDragCommit,
      onTreeChange,
      profiles,
      projectId,
      root,
      toggleFocusMode,
      workspaceId,
    ],
  );

  return (
    <div
      data-testid="pane-tree"
      data-root-id={root.id}
      data-workspace-id={workspaceId}
      className="h-full min-h-0 w-full min-w-0"
    >
      {renderNode(root)}
    </div>
  );
}
