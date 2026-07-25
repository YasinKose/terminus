import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type WorkspaceContextMenuProps = {
  children: ReactNode;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRename: () => void;
  onMove: (direction: -1 | 1) => void;
  onClose: () => void;
};

export function WorkspaceContextMenu({
  children,
  canMoveLeft,
  canMoveRight,
  onRename,
  onMove,
  onClose,
}: WorkspaceContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={onRename}>Rename…</ContextMenuItem>
        <ContextMenuItem
          disabled={!canMoveLeft}
          onSelect={() => onMove(-1)}
        >
          Move left
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canMoveRight}
          onSelect={() => onMove(1)}
        >
          Move right
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          Close workspace…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
