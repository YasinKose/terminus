import { useCallback, useRef } from "react";
import { TerminalPane } from "@/features/terminal/TerminalPane";
import { TerminalStatus } from "@/features/terminal/TerminalStatus";
import { useTerminalStore } from "@/features/terminal/terminalStore";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import { DropZoneOverlay } from "./DropZoneOverlay";
import {
  hitTestDropZone,
  type DropZone,
} from "./PaneDragController";
import type { PaneNode, TerminalLeaf } from "./model";
import { usePaneDragStore } from "./paneDragStore";
import { SplitContainerView } from "./SplitContainer";

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
  onActivate,
  onDragCommit,
}: {
  leaf: TerminalLeaf;
  projectId: string;
  workspaceId: string;
  activePaneId?: string | null;
  onActivate?: (paneId: string) => void;
  onDragCommit?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const drag = usePaneDragStore((s) => s.drag);
  const beginDrag = usePaneDragStore((s) => s.beginDrag);
  const setOver = usePaneDragStore((s) => s.setOver);
  const endDrag = usePaneDragStore((s) => s.endDrag);
  const session = useTerminalStore((s) => s.sessions[leaf.id]);
  const focused = activePaneId === leaf.id;

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

  return (
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
        <div className="flex h-6 shrink-0 items-center gap-1 border-b border-border px-1">
          <button
            type="button"
            data-testid={`pane-drag-handle-${leaf.id}`}
            className="inline-flex h-5 cursor-grab items-center rounded px-1 text-[10px] text-muted-foreground hover:bg-accent active:cursor-grabbing"
            onPointerDown={onPointerDownHandle}
            aria-label="Drag pane"
          >
            ⋮⋮
          </button>
          <TerminalStatus
            status={session?.status ?? "starting"}
            activity={session?.activity ?? "quiet"}
            unread={session?.unread ?? false}
            attention={session?.attention ?? false}
            title={session?.title || leaf.titleOverride || "Terminal"}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            data-testid={`close-pane-${leaf.id}`}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close terminal"
            onClick={(e) => {
              e.stopPropagation();
              useCloseRequestStore.getState().requestClose({
                kind: "terminal",
                sessionId: leaf.id,
                workspaceId,
                projectId,
                title:
                  session?.title || leaf.titleOverride || "Terminal",
                terminalCount: 1,
              });
            }}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <TerminalPane
            sessionId={leaf.id}
            projectId={projectId}
            profileId={leaf.profileId}
            initialCwd={leaf.initialCwd || null}
            title={leaf.titleOverride ?? "Terminal"}
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
  const renderNode = useCallback(
    (node: PaneNode): React.ReactNode => {
      if (node.type === "terminal") {
        return (
          <TerminalLeafView
            leaf={node}
            projectId={projectId}
            workspaceId={workspaceId}
            activePaneId={activePaneId}
            onActivate={onActivatePane}
            onDragCommit={onDragCommit}
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
      onActivatePane,
      onDragCommit,
      onTreeChange,
      projectId,
      root,
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
